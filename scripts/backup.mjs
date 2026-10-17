import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const root=path.resolve(import.meta.dirname,'..');
const storage=process.env.STORAGE_DIR||path.join(root,'storage');
const src=process.env.DB_PATH||path.join(storage,'website.sqlite');
const destination=process.argv[2]||path.join(root,'backups',new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(destination,{recursive:true,mode:0o700});
const db=new DatabaseSync(src);
try{const target=path.join(destination,'website.sqlite');if(fs.existsSync(target))throw Error('Destination backup already exists');db.exec("VACUUM INTO '"+target.replaceAll("'","''")+"'");if(fs.existsSync(path.join(storage,'media')))fs.cpSync(path.join(storage,'media'),path.join(destination,'media'),{recursive:true});if(fs.existsSync(path.join(storage,'private')))fs.cpSync(path.join(storage,'private'),path.join(destination,'private'),{recursive:true});console.log('Backup completed:',destination);}finally{db.close();}
