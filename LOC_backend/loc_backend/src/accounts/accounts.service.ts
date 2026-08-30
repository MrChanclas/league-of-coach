import { BadRequestException, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';

const AccountSchema = z.object({
  summoner: z.string().min(2).max(80),
  tag: z.string().min(2).max(20),
  server: z.string().min(2).max(30),
  division: z.string().min(1).max(30).optional(),
  tier: z.string().min(1).max(30).optional(),
  lp: z.number().int().min(0).max(5000).optional(),
  userId: z.string().min(1),
});

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: z.infer<typeof AccountSchema>) {
    return this.detectAndSave(input);
  }

  async search(input: z.infer<typeof AccountSchema>) {
    const payload = AccountSchema.parse(input);
    const resolved = await this.populateFromRiot(payload);

    const existing = await this.prisma.lolAccount.findFirst({
      where: {
        userId: resolved.userId,
        summoner: resolved.summoner,
        tag: resolved.tag,
        server: resolved.server,
      },
    });

    if (existing) {
      return {
        found: true,
        created: false,
        account: existing,
        message: 'La cuenta ya estaba asociada a este usuario.',
      };
    }

    const account = await this.prisma.lolAccount.create({
      data: {
        summoner: resolved.summoner,
        tag: resolved.tag,
        server: resolved.server,
        division: resolved.division ?? 'Unranked',
        tier: resolved.tier ?? 'Unranked',
        lp: resolved.lp ?? 0,
        userId: resolved.userId,
      },
    });

    return {
      found: true,
      created: true,
      account,
      message: 'Cuenta detectada y vinculada correctamente.',
    };
  }

  private async detectAndSave(input: z.infer<typeof AccountSchema>) {
    return this.search(input);
  }

  async listByUser(userId: string) {
    return this.prisma.lolAccount.findMany({
      where: { userId },
      include: {
        learnings: true,
        goals: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.lolAccount.findUnique({
      where: { id },
      include: {
        learnings: true,
        goals: true,
      },
    });
  }

  private async populateFromRiot(input: z.infer<typeof AccountSchema>) {
    const apiKey = process.env.RIOT_API_KEY?.trim();

    if (!apiKey || this.isPlaceholderValue(apiKey)) {
      throw new BadRequestException(
        'Falta una RIOT_API_KEY válida en el entorno. Copia tu API key real de Riot Developer y reemplaza el valor placeholder.',
      );
    }

    const accountEndpoint = `${this.getAccountHost(input.server)}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      input.summoner,
    )}/${encodeURIComponent(input.tag)}`;

    const accountResponse = await fetch(accountEndpoint, {
      headers: {
        'X-Riot-Token': apiKey,
      },
    });

    if (!accountResponse.ok) {
      const payload = await accountResponse.text();
      throw new BadRequestException({
        message: 'No se pudo resolver la cuenta de Riot.',
        riot: payload,
      });
    }

    const riotAccount = (await accountResponse.json()) as {
      puuid?: string;
      gameName?: string;
      tagLine?: string;
    };

    const puuid = riotAccount.puuid;
    const platformHost = this.getPlatformHost(input.server);

    const summonerResponse = await fetch(`${platformHost}/lol/summoner/v1/summoners/by-puuid/${encodeURIComponent(puuid ?? '')}`, {
      headers: {
        'X-Riot-Token': apiKey,
      },
    });

    if (!summonerResponse.ok) {
      throw new BadRequestException('No se pudo obtener la información del invocador en Riot.');
    }

    const summoner = (await summonerResponse.json()) as {
      id?: string;
      puuid?: string;
    };

    const leagueResponse = await fetch(`${platformHost}/lol/league/v4/entries/by-summoner/${encodeURIComponent(summoner.id ?? '')}`, {
      headers: {
        'X-Riot-Token': apiKey,
      },
    });

    const fallback = {
      division: input.division ?? 'Unranked',
      tier: input.tier ?? 'Unranked',
      lp: input.lp ?? 0,
    };

    if (!leagueResponse.ok) {
      return {
        ...input,
        summoner: riotAccount.gameName ?? input.summoner,
        tag: riotAccount.tagLine ?? input.tag,
        ...fallback,
      };
    }

    const entries = (await leagueResponse.json()) as Array<{ queueType?: string; tier?: string; rank?: string; leaguePoints?: number }>;
    const rankedEntry = entries.find((entry) => entry.queueType === 'RANKED_SOLO_5x5') ?? entries[0];

    return {
      ...input,
      summoner: riotAccount.gameName ?? input.summoner,
      tag: riotAccount.tagLine ?? input.tag,
      division: rankedEntry?.rank ?? fallback.division,
      tier: rankedEntry?.tier ?? fallback.tier,
      lp: rankedEntry?.leaguePoints ?? fallback.lp,
    };
  }

  private isPlaceholderValue(value: string) {
    const normalized = value.trim().toLowerCase();
    return (
      normalized.length === 0 ||
      normalized.includes('tu_riot') ||
      normalized.includes('your_riot') ||
      normalized.includes('placeholder') ||
      normalized.includes('example') ||
      normalized.includes('demo')
    );
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
      LAS: 'https://la1.api.riotgames.com',
      LATAM: 'https://la1.api.riotgames.com',
      NA: 'https://na1.api.riotgames.com',
      OCE: 'https://oc1.api.riotgames.com',
      PH: 'https://ph2.api.riotgames.com',
      SG: 'https://sg2.api.riotgames.com',
      TH: 'https://th2.api.riotgames.com',
      TR: 'https://tr1.api.riotgames.com',
      TW: 'https://tw2.api.riotgames.com',
      VN: 'https://vn2.api.riotgames.com',
      RU: 'https://ru.api.riotgames.com',
    };

    return map[normalized] ?? 'https://euw1.api.riotgames.com';
  }

  private getAccountHost(server: string) {
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
      PH: 'https://sea.api.riotgames.com',
      SG: 'https://sea.api.riotgames.com',
      TH: 'https://sea.api.riotgames.com',
      TR: 'https://europe.api.riotgames.com',
      TW: 'https://sea.api.riotgames.com',
      VN: 'https://sea.api.riotgames.com',
      RU: 'https://europe.api.riotgames.com',
    };

    return map[normalized] ?? 'https://europe.api.riotgames.com';
  }
}
