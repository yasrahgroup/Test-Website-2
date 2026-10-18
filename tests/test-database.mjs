import crypto from 'node:crypto';
import pg from 'pg';

try { process.loadEnvFile(); } catch {}

function databaseIdentity(connectionString) {
  const url = new URL(connectionString);
  return `${url.hostname.toLowerCase()}:${url.port || '5432'}${url.pathname}`;
}

// Pooled endpoints (for example Neon's "-pooler" host) reject the `options`
// startup parameter that schema isolation needs, so scope against the direct
// endpoint whenever the URL clearly points at a pooled proxy.
function directEndpoint(url) {
  const direct = new URL(url);
  if (direct.hostname.includes('-pooler')) direct.hostname = direct.hostname.replace(/-pooler/g, '');
  return direct;
}

function scopedUrl(testUrl, schema) {
  const direct = directEndpoint(testUrl);
  direct.searchParams.set('options', `-c search_path=${schema}`);
  return direct.toString();
}

async function canScopeWithSchema(testUrl, schema) {
  const probe = new pg.Pool({ connectionString: scopedUrl(testUrl, schema), connectionTimeoutMillis: 10000 });
  try {
    await probe.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await probe.end();
  }
}

async function createScratchDatabase(testUrl) {
  const name = `cms_test_${process.pid}_${crypto.randomBytes(5).toString('hex')}`;
  const adminPool = new pg.Pool({ connectionString: testUrl, connectionTimeoutMillis: 10000 });
  try {
    await adminPool.query(`CREATE DATABASE ${name}`);
  } catch (error) {
    await adminPool.end();
    throw Error(`Could not create an isolated test database (${error.code || error.name}). Verify TEST_DATABASE_URL permissions.`);
  }
  await adminPool.end();
  const scratch = new URL(directEndpoint(testUrl).toString());
  scratch.pathname = `/${name}`;
  scratch.searchParams.delete('options');
  return { connectionString: scratch.toString(), name };
}

export async function createTestDatabaseScope() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database; test suites will not use DATABASE_URL.');
  }
  try {
    const testIdentity = databaseIdentity(testUrl);
    for (const productionUrl of [process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED].filter(Boolean)) {
      if (testUrl === productionUrl || testIdentity === databaseIdentity(productionUrl)) {
        throw Error('TEST_DATABASE_URL must point to a different database from DATABASE_URL.');
      }
    }
  } catch (error) {
    if (error.message.includes('TEST_DATABASE_URL')) throw error;
    throw Error('TEST_DATABASE_URL must be a PostgreSQL URL for a dedicated test database.');
  }

  const schema = `cms_test_${process.pid}_${crypto.randomBytes(6).toString('hex')}`;
  const adminPool = new pg.Pool({ connectionString: testUrl, connectionTimeoutMillis: 10000 });
  let scratchDatabase = null;
  let connectionString;
  try {
    await adminPool.query(`CREATE SCHEMA "${schema}"`);
    if (await canScopeWithSchema(testUrl, schema)) {
      connectionString = scopedUrl(testUrl, schema);
    } else {
      // Pooled-only endpoint: isolate with a throwaway database instead of `options`.
      await adminPool.query(`DROP SCHEMA "${schema}" CASCADE`);
      const scratch = await createScratchDatabase(testUrl);
      scratchDatabase = scratch.name;
      connectionString = scratch.connectionString;
    }
    await adminPool.end();
  } catch (error) {
    try { await adminPool.end(); } catch {}
    if (error.message.includes('Could not create an isolated test database')) throw error;
    throw Error(`Could not create an isolated test scope (${error.code || error.name}). Verify TEST_DATABASE_URL permissions.`);
  }

  const closeUrl = scratchDatabase
    ? directEndpoint(testUrl).toString()
    : testUrl;
  return {
    connectionString,
    async close() {
      const cleanup = new pg.Pool({ connectionString: closeUrl, connectionTimeoutMillis: 10000 });
      try {
        if (scratchDatabase) await cleanup.query(`DROP DATABASE ${scratchDatabase} WITH (FORCE)`);
        else await cleanup.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally {
        await cleanup.end();
      }
    }
  };
}
