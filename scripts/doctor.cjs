#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const project = path.resolve(__dirname, '..');
const quiet = process.argv.includes('--prestart');
const semver = process.versions.node.split('.').map(Number);
const meetsMin = semver[0] > 22 || (semver[0] === 22 && (semver[1] > 13 || (semver[1] === 13 && semver[2] >= 0)));
if (!meetsMin) {
 console.error(`\nAZAROTH startup blocked: installed Node.js ${process.version} is not supported.`);
 console.error('Install Node.js 22.13.0 or newer (Node.js 22 LTS recommended), then run npm start.');
 process.exit(1);
}
const envPath = path.join(project, '.env');
const hasEnv = fs.existsSync(envPath);
const env = {};
if (hasEnv) {
  // Only used for diagnostics. Node.js itself loads .env for npm start.
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if(match) env[match[1]] = match[2].replace(/^("|')|("|')$/g, '');
  }
}
const port = Number(process.env.APP_PORT || (process.env.PORT && process.env.PORT !== '8080' ? process.env.PORT : (env.PORT || 3000)));
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
 console.error('Invalid PORT in environment or .env: expected 1–65535.');
 process.exit(1);
}
const storage = path.resolve(project, process.env.STORAGE_DIR || env.STORAGE_DIR || 'storage');
try {
 fs.mkdirSync(storage, {recursive:true});
 fs.accessSync(storage, fs.constants.R_OK | fs.constants.W_OK);
} catch(e) {
 console.error(`Storage error: ${storage}: ${e.message}`);
 console.error('Use a writable STORAGE_DIR or fix volume permissions.');
 process.exit(1);
}
if (!quiet) {
 console.log('AZAROTH startup doctor');
 console.log(`  Node: ${process.version} ✓`);
 console.log(`  Project path: ${project} ✓`);
 console.log(`  Storage writable: ${storage} ✓`);
 console.log(`  App port: ${port}`);
 console.log(`  Local .env: ${hasEnv?'found':'missing'}`);
}
if (!hasEnv && !process.env.INITIAL_ADMIN_EMAIL && !quiet) {
 console.warn('  CMS login setup: copy .env.example to .env; replace BOTH initial admin values with real credentials.');
}
if (hasEnv && /^(admin@)?example\.com$/.test((env.INITIAL_ADMIN_EMAIL||'').toLowerCase()) && !quiet) {
 console.warn('  Admin email uses an example address; replace before first CMS login.');
}
if(!quiet) console.log('Run `npm start` for local usage, or `docker compose up -d --build` on your configured production host.');
