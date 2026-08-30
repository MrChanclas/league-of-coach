import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(name: string, email: string, password: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new UnauthorizedException('El correo ya está registrado');
    }

    const passwordHash = await hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        clerkId: `internal-${Date.now()}`,
        role: 'user',
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: this.generateToken(user.id, user.email, user.role),
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isValidPassword = await compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      token: this.generateToken(user.id, user.email, user.role),
    };
  }

  getRiotAuthorizationUrl(userId: string) {
    const clientId = process.env.RIOT_CLIENT_ID ?? 'riot-client-id';
    const redirectUri = process.env.RIOT_REDIRECT_URI ?? 'http://localhost:5173/';
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state: userId,
      scope: 'openid offline_access',
    });

    return `https://auth.riotgames.com/oauth2/authorize?${params.toString()}`;
  }

  async handleRiotCallback(code: string, state: string) {
    if (!code || !state) {
      throw new BadRequestException('Falta el código o el estado de Riot.');
    }

    const clientId = process.env.RIOT_CLIENT_ID?.trim();
    const clientSecret = process.env.RIOT_CLIENT_SECRET?.trim();
    const redirectUri = process.env.RIOT_REDIRECT_URI?.trim() || 'http://localhost:5173/';

    if (!clientId || !clientSecret || this.isPlaceholderValue(clientId) || this.isPlaceholderValue(clientSecret)) {
      return {
        ok: true,
        pending: true,
        message: 'Riot OAuth está preparado, pero faltan credenciales válidas del cliente en el entorno.',
        userId: state,
      };
    }

    const tokenResponse = await fetch('https://auth.riotgames.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const payload = await tokenResponse.text();
      throw new BadRequestException({ message: 'No se pudo intercambiar el código de Riot.', payload });
    }

    const tokenPayload = await tokenResponse.json();
    const accessToken = tokenPayload.access_token;

    const accountRegion = this.getDefaultRiotServer();
    const accountHost = this.getRegionalHost(accountRegion);

    const accountResponse = await fetch(`${accountHost}/riot/account/v1/accounts/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!accountResponse.ok) {
      throw new BadRequestException('No se pudo obtener la cuenta de Riot desde el token de OAuth.');
    }

    const riotAccount = (await accountResponse.json()) as {
      gameName?: string;
      tagLine?: string;
      puuid?: string;
    };

    const matchedUserId = state;
    const existingAccount = await this.prisma.lolAccount.findFirst({
      where: {
        userId: matchedUserId,
        summoner: riotAccount.gameName ?? '',
        tag: riotAccount.tagLine ?? '',
      },
    });

    if (existingAccount) {
      return {
        ok: true,
        pending: false,
        userId: matchedUserId,
        account: existingAccount,
        message: 'La cuenta de Riot ya estaba asociada a este usuario.',
      };
    }

    const platformHost = this.getPlatformHost(accountRegion);

    const summonerResponse = await fetch(`${platformHost}/lol/summoner/v1/summoners/by-puuid/${encodeURIComponent(riotAccount.puuid ?? '')}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!summonerResponse.ok) {
      throw new BadRequestException('No se pudieron obtener los datos del invocador desde Riot.');
    }

    const summoner = (await summonerResponse.json()) as { id?: string };
    const leagueResponse = await fetch(`${platformHost}/lol/league/v4/entries/by-summoner/${encodeURIComponent(summoner.id ?? '')}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    let division = 'Unranked';
    let tier = 'Unranked';
    let lp = 0;

    if (leagueResponse.ok) {
      const entries = (await leagueResponse.json()) as Array<{ queueType?: string; tier?: string; rank?: string; leaguePoints?: number }>;
      const rankedEntry = entries.find((entry) => entry.queueType === 'RANKED_SOLO_5x5') ?? entries[0];
      division = rankedEntry?.rank ?? 'Unranked';
      tier = rankedEntry?.tier ?? 'Unranked';
      lp = rankedEntry?.leaguePoints ?? 0;
    }

    const account = await this.prisma.lolAccount.create({
      data: {
        summoner: riotAccount.gameName ?? 'Invocador',
        tag: riotAccount.tagLine ?? 'NA1',
        server: accountRegion,
        division,
        tier,
        lp,
        userId: matchedUserId,
      },
    });

    return {
      ok: true,
      pending: false,
      userId: matchedUserId,
      account,
      token: tokenPayload,
      message: 'Cuenta de Riot vinculada correctamente.',
    };
  }

  private getDefaultRiotServer() {
    return (process.env.RIOT_DEFAULT_SERVER ?? 'LAS').trim().toUpperCase() || 'LAS';
  }

  private getRegionalHost(server: string) {
    const normalized = server.trim().toUpperCase();
    const map: Record<string, string> = {
      BR: 'https://americas.api.riotgames.com',
      EUN: 'https://europe.api.riotgames.com',
      EUW: 'https://europe.api.riotgames.com',
      JP: 'https://asia.api.riotgames.com',
      KR: 'https://asia.api.riotgames.com',
      LA1: 'https://americas.api.riotgames.com',
      LA2: 'https://americas.api.riotgames.com',
      LAS: 'https://americas.api.riotgames.com',
      LATAM: 'https://americas.api.riotgames.com',
      NA: 'https://americas.api.riotgames.com',
      OCE: 'https://sea.api.riotgames.com',
      OC: 'https://sea.api.riotgames.com',
      PH: 'https://sea.api.riotgames.com',
      SG: 'https://sea.api.riotgames.com',
      TH: 'https://sea.api.riotgames.com',
      TR: 'https://europe.api.riotgames.com',
      TW: 'https://sea.api.riotgames.com',
      VN: 'https://sea.api.riotgames.com',
      RU: 'https://europe.api.riotgames.com',
      SEA: 'https://sea.api.riotgames.com',
    };

    return map[normalized] ?? 'https://americas.api.riotgames.com';
  }

  private getPlatformHost(server: string) {
    const normalized = server.trim().toUpperCase();
    const map: Record<string, string> = {
      BR: 'https://br1.api.riotgames.com',
      EUN: 'https://eun1.api.riotgames.com',
      EUW: 'https://euw1.api.riotgames.com',
      JP: 'https://jp1.api.riotgames.com',
      KR: 'https://kr.api.riotgames.com',
      LA1: 'https://la1.api.riotgames.com',
      LA2: 'https://la2.api.riotgames.com',
      LAS: 'https://las.api.riotgames.com',
      LATAM: 'https://la1.api.riotgames.com',
      NA: 'https://na1.api.riotgames.com',
      OCE: 'https://oc1.api.riotgames.com',
      OC: 'https://oc1.api.riotgames.com',
      PH: 'https://ph2.api.riotgames.com',
      SG: 'https://sg2.api.riotgames.com',
      TH: 'https://th2.api.riotgames.com',
      TR: 'https://tr1.api.riotgames.com',
      TW: 'https://tw2.api.riotgames.com',
      VN: 'https://vn2.api.riotgames.com',
      RU: 'https://ru.api.riotgames.com',
      SEA: 'https://sea.api.riotgames.com',
    };

    return map[normalized] ?? 'https://las.api.riotgames.com';
  }

  private isPlaceholderValue(value: string) {
    const normalized = value.trim().toLowerCase();
    return (
      normalized.length === 0 ||
      normalized.includes('tu_riot') ||
      normalized.includes('your_riot') ||
      normalized.includes('placeholder') ||
      normalized.includes('example') ||
      normalized.includes('demo') ||
      normalized.includes('riot-client-id')
    );
  }

  private generateToken(userId: string, email: string, role: string) {
    return sign({ sub: userId, email, role }, process.env.JWT_SECRET ?? 'leagueofcoach-secret', {
      expiresIn: '7d',
    });
  }
}
