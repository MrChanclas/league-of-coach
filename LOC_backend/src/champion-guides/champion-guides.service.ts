import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BehaviorFlagsService } from '../learning/behavior-flags.service';
import { DataDragonService } from './data-dragon.service';
import { GuideContent, GuideContentSchema } from './guide-content.schema';
import { MANUAL_GUIDES } from './data/manual-guides';

@Injectable()
export class ChampionGuidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataDragon: DataDragonService,
    private readonly behaviorFlags: BehaviorFlagsService,
  ) {}

  async getGuide(championKey: string, accountId?: string) {
    const content = await this.getOrCreateContent(championKey);
    const flags = accountId
      ? await this.behaviorFlags.getFlags(accountId, championKey)
      : [];

    return { champion: championKey, content, flags };
  }

  /**
   * Reads the cached guide, or caches the hand-authored one from
   * data/manual-guides on first request. Every champion currently in the
   * game has a manual entry; this only 404s for a champion released after
   * data/manual-guides/champions.json was last updated — add its guide
   * there once it's written.
   */
  private async getOrCreateContent(championKey: string): Promise<GuideContent> {
    const existing = await this.prisma.championGuide.findUnique({
      where: { championKey },
    });
    if (existing) return GuideContentSchema.parse(existing.content);

    const manual = MANUAL_GUIDES.find(
      (guide) => guide.championKey.toLowerCase() === championKey.toLowerCase(),
    );
    if (!manual) {
      throw new NotFoundException(
        `Todavía no escribimos la guía de ${championKey}.`,
      );
    }

    const version = await this.dataDragon.getVersion();
    await this.prisma.championGuide.create({
      data: { championKey, patchVersion: version, content: manual.content },
    });
    return manual.content;
  }
}
