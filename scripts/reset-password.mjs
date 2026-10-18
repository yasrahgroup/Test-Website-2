import crypto from 'node:crypto';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const root=path.resolve(import.meta.dirname,'..');
const dbFile=process.env.DB_PATH||path.join(process.env.STORAGE_DIR||path.join(root,'storage'),'website.sqlite');
const email=(process.env.TARGET_EMAIL||'').trim().toLowerCase();
const next=process.env.NEW_PASSWORD||'';
if(!email||next.length<16||next.length>128){console.error('Set TARGET_EMAIL and NEW_PASSWORD (16–128 characters) in the environment');process.exit(1)}
const db=new DatabaseSync(dbFile);
const row=db.prepare('SELECT id FROM users WHERE email=?').get(email);
if(!row){console.error('Account not found');process.exit(1)}
const salt=crypto.randomBytes(16),hash=crypto.scryptSync(next,salt,64);
db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(salt.toString('hex')+':'+hash.toString('hex'),row.id);
db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.id);
db.prepare('INSERT INTO audit(user_id,action) VALUES(?,?)').run(row.id,'auth.password-reset-cli');
console.log('Password updated. Previous sessions have been invalidated.');db.close();
