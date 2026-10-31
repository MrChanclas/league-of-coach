import { Logger } from '@nestjs/common';
import { TwitchService } from './twitch.service';

const tokenResponse = () =>
  new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }));
const streamsResponse = (data: unknown[]) =>
  new Response(JSON.stringify({ data }));
const liveStream = {
  id: 'stream-1',
  title: 'Subiendo a Diamante',
  game_name: 'League of Legends',
  viewer_count: 42,
  started_at: '2026-10-31T20:00:00Z',
};

describe('TwitchService', () => {
  const fetchMock = jest.fn<Promise<Response>, Parameters<typeof fetch>>();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
    process.env.TWITCH_CLIENT_ID = 'client';
    process.env.TWITCH_CLIENT_SECRET = 'secret';
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.TWITCH_CLIENT_ID;
    delete process.env.TWITCH_CLIENT_SECRET;
    jest.restoreAllMocks();
  });

  it('answers offline without calling Twitch when it has no credentials', async () => {
    delete process.env.TWITCH_CLIENT_ID;
    const status = await new TwitchService().getLiveStatus();
    expect(status.live).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('maps a live stream and reuses the answer within the cache window', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(streamsResponse([liveStream]));
    const service = new TwitchService();

    const status = await service.getLiveStatus();
    expect(status).toMatchObject({
      live: true,
      streamId: 'stream-1',
      title: 'Subiendo a Diamante',
      viewerCount: 42,
    });
    await service.getLiveStatus();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('answers offline when the channel has no stream', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(streamsResponse([]));
    expect((await new TwitchService().getLiveStatus()).live).toBe(false);
  });

  it('gets a new token once when Twitch rejects the current one', async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(streamsResponse([liveStream]));
    expect((await new TwitchService().getLiveStatus()).live).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('keeps the last known status when Twitch fails', async () => {
    jest.useFakeTimers({ now: Date.now() });
    try {
      fetchMock
        .mockResolvedValueOnce(tokenResponse())
        .mockResolvedValueOnce(streamsResponse([liveStream]))
        .mockResolvedValueOnce(new Response('', { status: 503 }));
      const service = new TwitchService();
      await service.getLiveStatus();

      jest.advanceTimersByTime(61 * 1000);
      expect((await service.getLiveStatus()).live).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});
