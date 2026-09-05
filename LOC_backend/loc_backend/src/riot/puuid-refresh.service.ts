import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RiotApiService } from './riot-api.service';

type RefreshableAccount = {
  id: string;
  server: string;
  summoner: string;
  tag: string;
};

@Injectable()
export class PuuidRefreshService {
  private readonly logger = new Logger(PuuidRefreshService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riotApi: RiotApiService,
  ) {}

  /** Re-resolves an account's puuid by Riot ID and persists it, so the caller can retry with a puuid valid under the current API key. */
  async refresh(account: RefreshableAccount): Promise<string> {
    const fresh = await this.riotApi.getAccountByRiotId(
      account.server,
      account.summoner,
      account.tag,
    );

    await this.prisma.lolAccount.update({
      where: { id: account.id },
      data: { puuid: fresh.puuid },
    });

    this.logger.log(
      `Puuid refrescado para ${account.summoner}#${account.tag} (cuenta ${account.id}).`,
    );

    return fresh.puuid;
  }
}
