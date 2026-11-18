import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const host=process.env.DEMO_HOST;
if(!host || !/^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$/i.test(host))throw new Error('Set DEMO_HOST to your HTTPS hostname (no protocol/path).');
process.loadEnvFile(process.env.SOURCE_ENV || '.env.local');
const directory=path.resolve('.cloud');
fs.mkdirSync(directory,{recursive:true,mode:0o700});
for(const name of ['runtime.env','proxy.env','access.txt'])if(fs.existsSync(path.join(directory,name)))throw new Error(`${name} already exists; preserve or rotate it deliberately.`);
const keys=['TAVUS_API_KEY','TAVUS_PAL_ID','TAVUS_REPLICA_ID','JULIANA_PAL_ID','JULIANA_FACE_ID'];
const credentials=Object.fromEntries(keys.map(key=>{
 const value=process.env[key];
 if(!value || /[\r\n]/.test(value))throw new Error(`Missing or invalid ${key}`);
 return [key,value];
}));
for(const key of ['STAFF_ACCESS_TOKEN','BANK_ADMIN_TOKEN','BANK_OPERATOR_TOKEN','BANK_VIEWER_TOKEN'])credentials[key]=randomBytes(24).toString('hex');
const password=randomBytes(18).toString('hex');
const result=spawnSync('htpasswd',['-niBC','12','demo'],{input:password+'\n',encoding:'utf8'});
if(result.status!==0)throw new Error('Install Apache htpasswd (apache2-utils on Ubuntu) to generate the demo password hash.');
const hash=result.stdout.trim().split(':').slice(1).join(':');
if(!hash.startsWith('$2'))throw new Error('Password hashing failed');
fs.writeFileSync(path.join(directory,'runtime.env'),Object.entries(credentials).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{mode:0o600});
// Single quotes prevent Docker Compose interpreting dollar signs in the bcrypt hash.
fs.writeFileSync(path.join(directory,'proxy.env'),`DEMO_HOST=${host}\nDEMO_USER=demo\nDEMO_PASSWORD_HASH='${hash}'\n`,{mode:0o600});
fs.writeFileSync(path.join(directory,'access.txt'),`URL: https://${host}/platform\nDemo username: demo\nDemo password: ${password}\n\nStaff/admin tokens (do not share with demo guests):\n`+Object.entries(credentials).filter(([k])=>k.endsWith('_TOKEN')).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{mode:0o600});
console.log('Created private .cloud/runtime.env, proxy.env and access.txt. Secrets were not printed.');
