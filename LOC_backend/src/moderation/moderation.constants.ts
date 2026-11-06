export const STRIKE_SEVERITIES = ['leve', 'moderado', 'grave'] as const;
export type StrikeSeverity = (typeof STRIKE_SEVERITIES)[number];

export const STRIKE_POINTS: Record<StrikeSeverity, number> = {
  leve: 1,
  moderado: 2,
  grave: 3,
};

// With this many points in force the user is kept out of Social.
export const SOCIAL_BAN_POINTS = 3;

export const STRIKE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
