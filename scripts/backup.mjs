import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { resolveDatabaseUrl, poolOptions } from '../lib/database-url.mjs';

const { Pool } = pg;
try { process.loadEnvFile(); } catch {}

const root = path.resolve(import.meta.dirname, '..');
const storage = process.env.STORAGE_DIR || path.join(root, 'storage');
const destination = process.argv[2] || path.join(root, 'backups', new Date().toISOString().replace(/[:.]/g, '-'));
fs.mkdirSync(destination, { recursive: true, mode: 0o700 });

let databaseUrl;
try {
  databaseUrl = resolveDatabaseUrl();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const pool = new Pool(poolOptions(databaseUrl));

try {
  const tables = ['settings', 'users', 'sessions', 'entries', 'layouts', 'media', 'inquiries', 'applications', 'audit'];
  const dump = {};
  for (const table of tables) {
    const res = await pool.query(`SELECT * FROM ${table}`);
    dump[table] = res.rows;
  }
  const target = path.join(destination, 'database-backup.json');
  fs.writeFileSync(target, JSON.stringify(dump, null, 2), 'utf8');

  const destMedia = path.join(destination, 'media');
  const destPrivate = path.join(destination, 'private');
  fs.mkdirSync(destMedia, { recursive: true });
  fs.mkdirSync(destPrivate, { recursive: true });
  if (fs.existsSync(path.join(storage, 'media'))) {
    fs.cpSync(path.join(storage, 'media'), destMedia, { recursive: true });
  }
  if (fs.existsSync(path.join(storage, 'private'))) {
    fs.cpSync(path.join(storage, 'private'), destPrivate, { recursive: true });
  }
  console.log('PostgreSQL backup completed successfully at:', destination);
} finally {
  await pool.end();
}
