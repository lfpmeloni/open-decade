#!/usr/bin/env node
import {parseArgs} from 'node:util';
import {vaultPath} from '../src/vault.mjs';
import {serve} from '../src/server.mjs';
try{
 const {values:v}=parseArgs({options:{vault:{type:'string'},port:{type:'string'}}});
 const {url,server}=await serve(await vaultPath(v.vault),{port:Number(v.port??0)});
 process.stdout.write(`Open this private local session in your browser:\n${url}\nKeep this session URL private. Stop with Ctrl+C.\n`);
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
}catch{process.stderr.write('Unable to launch local application. Check vault path, port and installation.\n');process.exitCode=1;}
