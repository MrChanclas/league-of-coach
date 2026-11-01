import { z } from 'zod';

// The email and clerkId come from Clerk, never from the client.
export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;
