import { z } from 'zod';

export const CreateUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  clerkId: z.string().min(1).max(120),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;
