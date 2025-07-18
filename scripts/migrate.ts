import { migrate } from 'drizzle-orm/postgres-js/migrator';
import config from '../drizzle.config';
import { db, sql } from '../lib/db';
import dotenvFlow from 'dotenv-flow';
dotenvFlow.config();

const runMigrate = async () => {
  console.log('⏳ Running migrations...');

  const start = Date.now();
  await migrate(db, { migrationsFolder: config.out });
  await sql.end();
  const end = Date.now();

  console.log(`✅ Migrations completed in ${end - start}ms`);

  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
