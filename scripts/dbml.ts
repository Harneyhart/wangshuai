import * as schema from '../lib/db/schema';
import { pgGenerate } from 'drizzle-dbml-generator'; // Using Postgres for this example
const out = './lib/db/schema.dbml';
const relational = true;

pgGenerate({ schema, out, relational });
