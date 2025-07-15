import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// export const queryClient = postgres(process.env['DATABASE_URL'] || '');
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}
// export const db = drizzle(queryClient);
export const sql = postgres(process.env.DATABASE_URL || '', { max: 1 });
export const db = drizzle(sql, { schema });
