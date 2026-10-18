import crypto from 'node:crypto';
import pg from 'pg';
import { resolveDatabaseUrl, poolOptions } from '../lib/database-url.mjs';

const { Pool } = pg;
try { process.loadEnvFile(); } catch {}

let databaseUrl;
try {
  databaseUrl = resolveDatabaseUrl();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

const email = (process.env.TARGET_EMAIL || '').trim().toLowerCase();
const next = process.env.NEW_PASSWORD || '';
if (!email || next.length < 16 || next.length > 128) {
  console.error('Set TARGET_EMAIL and NEW_PASSWORD (16–128 characters) in the environment');
  process.exit(1);
}

const pool = new Pool(poolOptions(databaseUrl));

try {
  await pool.connect();
  const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  const row = userRes.rows[0];
  if (!row) {
    console.error(`Account not found for email: ${email}`);
    process.exit(1);
  }
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(next, salt, 64);
  const passwordHash = salt.toString('hex') + ':' + hash.toString('hex');

  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, row.id]);
  await pool.query('DELETE FROM sessions WHERE user_id = $1', [row.id]);
  await pool.query('INSERT INTO audit(user_id, action) VALUES($1, $2)', [row.id, 'auth.password-reset-cli']);
  console.log('Password updated successfully in PostgreSQL. Previous sessions have been invalidated.');
} finally {
  await pool.end();
}
