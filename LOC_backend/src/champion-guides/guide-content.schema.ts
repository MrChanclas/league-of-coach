import { z } from 'zod';

/**
 * Shape of ChampionGuide.content (a Json column). Kept as a versioned zod
 * schema, not a Prisma-level structure, so new sections (build, runas,
 * matchup table...) can be added later without a migration — every guide
 * already in the database keeps validating against whichever fields it has,
 * and new optional fields just start showing up as they're populated.
 */
export const GuideTipSchema = z.object({
  text: z.string(),
  // Set when the source recommendation carried a "!" marker — promotes the
  // tip to the golden warning variant in the UI (see handoff_loc/06-coaching.md).
  warning: z.string().optional(),
});

export const GuideContentSchema = z.object({
  role: z.string(),
  championClass: z.string(),
  difficulty: z.enum(['Fácil', 'Media', 'Difícil']),
  body: z.string(),
  tips: z.array(GuideTipSchema).min(1),
});

export type GuideContent = z.infer<typeof GuideContentSchema>;
