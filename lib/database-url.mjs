// Single source of truth for database configuration.
// Every entry point (server.js, backup, migrations, admin scripts) resolves the
// connection string here so the application always follows the .env settings.
try { process.loadEnvFile(); } catch {}

/**
 * Resolve the PostgreSQL connection string for the current environment.
 * - NODE_ENV=test  -> TEST_DATABASE_URL (never the production database)
 * - otherwise      -> DATABASE_URL, then DATABASE_URL_UNPOOLED as a fallback
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function resolveDatabaseUrl(env = process.env) {
  const isTest = env.NODE_ENV === 'test';
  const primaryVar = isTest ? 'TEST_DATABASE_URL' : 'DATABASE_URL';
  const secondaryVar = 'DATABASE_URL_UNPOOLED';
  const primary = env[primaryVar];
  if (primary) return primary;
  if (isTest) {
    throw Error('TEST_DATABASE_URL environment variable is required for the test environment; tests never use DATABASE_URL.');
  }
  const secondary = env[secondaryVar];
  if (secondary) {
    console.warn(`[PostgreSQL] ${secondaryVar} is deprecated; please set ${primaryVar} in .env`);
    return secondary;
  }
  throw Error(`${primaryVar} environment variable is required. Copy .env.example to .env and configure it.`);
}

/** True when the connection string requires TLS. */
export function requiresTls(databaseUrl) {
  return databaseUrl.includes('sslmode=require') || databaseUrl.includes('sslmode=verify-full');
}

/**
 * Build `pg` Pool options for the resolved connection string.
 * Pool sizing/timeouts stay configurable through .env.
 */
export function poolOptions(databaseUrl, env = process.env) {
  const int = (value, fallback) => {
    const n = parseInt(value || '', 10);
    return Number.isInteger(n) && n > 0 ? n : fallback;
  };
  return {
    connectionString: databaseUrl,
    ssl: requiresTls(databaseUrl) ? { rejectUnauthorized: false } : false,
    max: int(env.DATABASE_POOL_SIZE, env.NODE_ENV === 'test' ? 5 : 20),
    idleTimeoutMillis: int(env.DATABASE_IDLE_TIMEOUT, 30000),
    connectionTimeoutMillis: int(env.DATABASE_CONNECT_TIMEOUT, 10000)
  };
}
