import { z } from 'zod';
import { STRIKE_SEVERITIES } from '../moderation/moderation.constants';

export const AdminLoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});
export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;

export const ResolveReportSchema = z
  .object({
    decision: z.enum(['dismiss', ...STRIKE_SEVERITIES]),
    reason: z.string().trim().max(500).optional(),
  })
  .refine(
    (input) => input.decision === 'dismiss' || (input.reason?.length ?? 0) >= 3,
    {
      message: 'Escribe el motivo del strike: el usuario lo verá.',
      path: ['reason'],
    },
  );
export type ResolveReportInput = z.infer<typeof ResolveReportSchema>;

export const ListReportsQuerySchema = z.object({
  status: z.enum(['pending', 'resolved']).default('pending'),
});

export const ListDuosQuerySchema = z.object({
  status: z.enum(['active', 'ended']).default('active'),
});

export const ListUsersQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
});
