import type { GuideContent } from '../../guide-content.schema';
import champions from './champions.json';

export type ManualGuideEntry = {
  championKey: string;
  content: GuideContent;
};

// One entry per champion (Data Dragon key -> content), covering the full
// roster so the LLM generator (champion-guide-generator.service.ts) only
// runs for champions released after this file was last updated. A handful
// of these double as the few-shot examples in that generator's prompt — add
// a new object to champions.json when a champion is added to the game.
export const MANUAL_GUIDES: ManualGuideEntry[] =
  champions as ManualGuideEntry[];
