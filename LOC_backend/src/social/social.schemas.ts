import { z } from 'zod';
import { DIVISION_ORDER, TIER_ORDER } from '../common/rank-order';
import { ROLE_KEYS } from '../common/role-performance';

export const DUO_QUEUES = ['solo', 'flex'] as const;
export const AVAILABILITY_SLOTS = [
  'manana',
  'tarde',
  'noche',
  'madrugada',
] as const;

export const DUO_NOTE_MAX = 200;
export const DUO_REQUEST_MESSAGE_MAX = 300;
export const DUO_MESSAGE_MAX = 1000;
export const DUO_REPORT_REASON_MAX = 500;

// Duo goals stop at Master: from Grandmaster on, Riot doesn't allow duo.
const DUO_GOAL_TIERS = TIER_ORDER.slice(0, TIER_ORDER.indexOf('MASTER') + 1);

const roles = z.array(z.enum(ROLE_KEYS)).min(1).max(ROLE_KEYS.length);

export const UpsertDuoProfileSchema = z.object({
  accountId: z.string().min(1),
  queue: z.enum(DUO_QUEUES),
  roles,
  lookingFor: roles,
  availability: z
    .array(z.enum(AVAILABILITY_SLOTS))
    .max(AVAILABILITY_SLOTS.length),
  note: z.string().trim().max(DUO_NOTE_MAX).optional(),
  active: z.boolean(),
});
export type UpsertDuoProfileInput = z.infer<typeof UpsertDuoProfileSchema>;

export const CreateDuoRequestSchema = z.object({
  toUserId: z.string().min(1),
  message: z.string().trim().max(DUO_REQUEST_MESSAGE_MAX).optional(),
});
export type CreateDuoRequestInput = z.infer<typeof CreateDuoRequestSchema>;

export const SetDuoGoalSchema = z.object({
  targetTier: z.enum(DUO_GOAL_TIERS as [string, ...string[]]),
  targetDivision: z.enum(DIVISION_ORDER).optional(),
  deadline: z.coerce.date().optional(),
});
export type SetDuoGoalInput = z.infer<typeof SetDuoGoalSchema>;

export const SendDuoMessageSchema = z.object({
  body: z.string().trim().min(1).max(DUO_MESSAGE_MAX),
});
export type SendDuoMessageInput = z.infer<typeof SendDuoMessageSchema>;

export const ListDuoMessagesSchema = z.object({
  after: z.coerce.date().optional(),
});
export type ListDuoMessagesInput = z.infer<typeof ListDuoMessagesSchema>;

export const ReportDuoSchema = z.object({
  reason: z.string().trim().min(1).max(DUO_REPORT_REASON_MAX),
});
export type ReportDuoInput = z.infer<typeof ReportDuoSchema>;
