import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'azaroth startup checks '));
const appDir = path.join(temp, 'Azaroth Website #1 é');
fs.mkdirSync(appDir);
for(const name of ['server.js','package.json','.env.example']) fs.copyFileSync(path.join(root,name),path.join(appDir,name));
for(const name of ['public','scripts']) fs.cpSync(path.join(root,name),path.join(appDir,name),{recursive:true});
const id=Math.floor(Math.random()*15000);
const pass='secure-startup-check-keyphrase-0123456789';
const email='admin@startup-test.example';
async function waitFor(url,proc,label) {
 let output='';
 proc.stdout?.on('data',x=>output+=x.toString());
 proc.stderr?.on('data',x=>output+=x.toString());
 for(let i=0;i<70;i++) {
  if(proc.exitCode!==null) throw Error(`${label} exited (${proc.exitCode}): ${output}`);
  try { const r=await fetch(url+'/api/health'); if(r.status===200) return output; }catch{}
  await new Promise(r=>setTimeout(r,100));
 }
 throw Error(`${label} never began listening. Logs: ${output}`);
}
async function stop(proc) {
 if(!proc || proc.exitCode!==null)return;
 if(process.platform!=='win32' && proc.spawnargs.includes('start')){try{process.kill(-proc.pid,'SIGTERM')}catch{proc.kill('SIGTERM')}}else proc.kill('SIGTERM');
 await Promise.race([new Promise(resolve=>proc.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,2000))]);
 if(proc.exitCode===null)proc.kill('SIGKILL');
}
let processOne,processTwo,processThree;
try {
  const portOne=44000+id,storageOne=path.join(temp,'storage direct');
  const endpointOne=`http://127.0.0.1:${portOne}`;
  processOne=spawn(process.execPath,[path.join(appDir,'server.js')],{cwd:appDir,env:{...process.env,PORT:String(portOne),PUBLIC_URL:endpointOne,STORAGE_DIR:storageOne,INITIAL_ADMIN_EMAIL:email,INITIAL_ADMIN_PASSWORD:pass,NODE_ENV:'test'},stdio:['ignore','pipe','pipe']});
  await waitFor(endpointOne,processOne,'direct server.js startup');
  let r=await fetch(endpointOne+'/');
  if(r.status!==200||!(await r.text()).includes('Innovative Software'))throw Error('Direct start homepage did not respond');
  console.log('✓ node server.js starts with spaces, # and Unicode in project folder');
  r=await fetch(endpointOne+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
  if(r.status!==200)throw Error('Direct start administrator login failed');
  console.log('✓ Admin login works after direct startup');
  await stop(processOne);
  const portTwo=portOne+1;
  const endpointTwo=`http://127.0.0.1:${portTwo}`;
  fs.writeFileSync(path.join(appDir,'.env'),`PORT=${portTwo}\nPUBLIC_URL=${endpointTwo}\nSTORAGE_DIR=${path.join(temp,'storage from env')}\nINITIAL_ADMIN_EMAIL=${email}\nINITIAL_ADMIN_PASSWORD=${pass}\n`);
  const npmCommand=process.platform==='win32'?'npm.cmd':'npm';
  const npmEnv={...process.env,NODE_ENV:'test'};for(const key of ['PORT','STORAGE_DIR','PUBLIC_URL','INITIAL_ADMIN_EMAIL','INITIAL_ADMIN_PASSWORD'])delete npmEnv[key];
  processTwo=spawn(npmCommand,['start'],{cwd:appDir,env:npmEnv,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
  await waitFor(endpointTwo,processTwo,'npm start with .env');
  r=await fetch(endpointTwo+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
  if(r.status!==200)throw Error('Auto-loaded .env or CMS login failed');
  console.log('✓ npm start auto-loads .env, opens the correct port and bootstraps CMS');
  await stop(processTwo);
  const portThree=portTwo+1;
  const endpointThree=`http://127.0.0.1:${portThree}`;
  processThree=spawn(process.execPath,[path.join(appDir,'server.js')],{
    cwd:appDir,env:{...process.env,PORT:String(portThree),PUBLIC_URL:'https://company.example.test',STORAGE_DIR:path.join(temp,'production storage'),INITIAL_ADMIN_EMAIL:email,INITIAL_ADMIN_PASSWORD:pass,NODE_ENV:'production'},stdio:['ignore','pipe','pipe']});
  await waitFor(endpointThree,processThree,'production-mode startup');
  r=await fetch(endpointThree+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
  if(r.status!==200 || !r.headers.get('set-cookie')?.includes('Secure'))throw Error('Production session or login startup failed');
  console.log('✓ production-mode server starts and protects CMS sessions with Secure cookies');
  await stop(processThree);
  console.log('STARTUP REGRESSION TESTS PASSED');
}finally{
 await stop(processOne);
 await stop(processTwo);
 await stop(processThree);
 fs.rmSync(temp,{recursive:true,force:true});
}
