import { z } from 'zod';

export const ResolveMeSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
});

export type ResolveMeDto = z.infer<typeof ResolveMeSchema>;
