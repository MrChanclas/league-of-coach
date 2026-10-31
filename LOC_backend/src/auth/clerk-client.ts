import { createClerkClient, type ClerkClient } from '@clerk/backend';

let client: ClerkClient | null = null;

/** Clerk's backend API client, for reading user data the JWT doesn't carry. */
export function getClerkClient(): ClerkClient {
  client ??= createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
  return client;
}

// Clerk names social providers "oauth_<provider>"; older accounts may carry
// the bare name.
export const DISCORD_PROVIDERS = new Set(['oauth_discord', 'discord']);
