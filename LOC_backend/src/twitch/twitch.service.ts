import { Injectable, Logger } from '@nestjs/common';

// The channel the in-app "en vivo" banner announces.
const TWITCH_CHANNEL = 'captain_chala';
const TWITCH_CHANNEL_URL = `https://www.twitch.tv/${TWITCH_CHANNEL}`;

// Every open dashboard asks for the live status, so the answer is shared for
// a minute per instance: at most one Helix call per minute each, far under
// Twitch's 800 requests/minute app limit.
const LIVE_CACHE_MS = 60 * 1000;
// Renew the app token a bit before Twitch says it expires.
const TOKEN_EXPIRY_MARGIN_MS = 60 * 1000;

export type TwitchLiveStatus =
  | { live: false; channelUrl: string }
  | {
      live: true;
      channelUrl: string;
      streamId: string;
      title: string;
      gameName: string;
      viewerCount: number;
      startedAt: string;
    };

type HelixStream = {
  id: string;
  title: string;
  game_name: string;
  viewer_count: number;
  started_at: string;
};

const OFFLINE: TwitchLiveStatus = {
  live: false,
  channelUrl: TWITCH_CHANNEL_URL,
};

/**
 * Whether the channel is live, from Twitch's Helix API with an app access
 * token (client credentials). Without TWITCH_CLIENT_ID/SECRET it always
 * answers offline, so local setups and tests need nothing.
 */
@Injectable()
export class TwitchService {
  private readonly logger = new Logger(TwitchService.name);
  private cached: { status: TwitchLiveStatus; fetchedAt: number } | null = null;
  private inFlight: Promise<TwitchLiveStatus> | null = null;
  private token: { value: string; expiresAt: number } | null = null;

  async getLiveStatus(): Promise<TwitchLiveStatus> {
    if (this.cached && Date.now() - this.cached.fetchedAt < LIVE_CACHE_MS) {
      return this.cached.status;
    }
    // Concurrent requests after the cache expires share one Helix call.
    this.inFlight ??= this.refresh().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  private async refresh(): Promise<TwitchLiveStatus> {
    const clientId = process.env.TWITCH_CLIENT_ID?.trim();
    const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) return OFFLINE;

    let status: TwitchLiveStatus;
    try {
      status = await this.fetchStream(clientId, clientSecret);
    } catch (error) {
      // Keep the last known answer through a Twitch hiccup instead of
      // flickering the banner off.
      this.logger.warn(
        `No se pudo consultar Twitch: ${(error as Error).message}`,
      );
      status = this.cached?.status ?? OFFLINE;
    }
    this.cached = { status, fetchedAt: Date.now() };
    return status;
  }

  private async fetchStream(
    clientId: string,
    clientSecret: string,
    retried = false,
  ): Promise<TwitchLiveStatus> {
    const token = await this.getAppToken(clientId, clientSecret);
    const response = await fetch(
      `https://api.twitch.tv/helix/streams?user_login=${TWITCH_CHANNEL}`,
      { headers: { 'Client-Id': clientId, Authorization: `Bearer ${token}` } },
    );

    // Twitch can revoke an app token before it expires: get a new one once.
    if (response.status === 401 && !retried) {
      this.token = null;
      return this.fetchStream(clientId, clientSecret, true);
    }
    if (!response.ok) throw new Error(`Helix respondió ${response.status}`);

    const { data } = (await response.json()) as { data: HelixStream[] };
    const stream = data[0];
    if (!stream) return OFFLINE;
    return {
      live: true,
      channelUrl: TWITCH_CHANNEL_URL,
      streamId: stream.id,
      title: stream.title,
      gameName: stream.game_name,
      viewerCount: stream.viewer_count,
      startedAt: stream.started_at,
    };
  }

  private async getAppToken(clientId: string, clientSecret: string) {
    if (this.token && Date.now() < this.token.expiresAt)
      return this.token.value;

    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });
    if (!response.ok) {
      throw new Error(`el token de Twitch respondió ${response.status}`);
    }
    const { access_token, expires_in } = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.token = {
      value: access_token,
      expiresAt: Date.now() + expires_in * 1000 - TOKEN_EXPIRY_MARGIN_MS,
    };
    return access_token;
  }
}
