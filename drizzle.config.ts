import type { Config } from 'drizzle-kit';
import dotenvFlow from 'dotenv-flow';
dotenvFlow.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE environment variable is required.');
}

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config;
