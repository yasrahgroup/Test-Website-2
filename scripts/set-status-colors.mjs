import pg from 'pg';
import { resolveDatabaseUrl, poolOptions } from '../lib/database-url.mjs';
const { Pool } = pg;
try { process.loadEnvFile(); } catch {}

const pool = new Pool(poolOptions(resolveDatabaseUrl()));

const colors = {
  'under-development': '#F59E0B',
  'beta-release': '#7C3AED',
  'production-ready': '#2563EB',
  'commercial-launch': '#0D9488',
  'live': '#16A34A',
  'Under Development': '#F59E0B',
  'Beta Release': '#7C3AED',
  'Production Ready': '#2563EB',
  'Commercial Launch': '#0D9488',
  'Live': '#16A34A'
};

const jsonVal = JSON.stringify(colors);
await pool.query(`INSERT INTO settings (key, value) VALUES ('productStatusColors', $1) ON CONFLICT (key) DO UPDATE SET value = $1`, [jsonVal]);
console.log('Updated productStatusColors in PostgreSQL:', jsonVal);

const res = await pool.query(`SELECT key, value FROM settings WHERE key = 'productStatusColors'`);
console.log('Verified from DB:', res.rows[0]);

await pool.end();
