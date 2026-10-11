import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {operation} from './operations.mjs';
import {assert} from './core.mjs';
const web=fileURLToPath(new URL('../web/',import.meta.url));
export async function serve(v,{port=0}={}){
 assert(Number.isInteger(port)&&port>=0&&port<=65535,'INVALID_INPUT','Port must be an integer from 0 to 65535.');
 const token=randomBytes(32).toString('hex');let origin;
 const server=http.createServer(async(req,res)=>{
  const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"};
  const send=(status,body,type='application/json')=>{res.writeHead(status,{...headers,'Content-Type':type});res.end(type==='application/json'?JSON.stringify(body):body);};
  try{
   if(req.headers.host!==new URL(origin).host)return send(403,{error:'HOST_REJECTED'});
   if(req.url==='/api'){
    if(req.method!=='POST'||req.headers.origin!==origin||req.headers['content-type']!=='application/json')return send(403,{error:'ORIGIN_OR_METHOD_REJECTED'});
    const supplied=Buffer.from((req.headers.authorization??'').replace(/^Bearer /,'')),expected=Buffer.from(token);
    if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))return send(401,{error:'SESSION_REQUIRED'});
    let body='',size=0;for await(const chunk of req){size+=chunk.length;if(size>10000000)return send(413,{error:'INPUT_LIMIT'});body+=chunk;}
    let input;try{input=JSON.parse(body);}catch{return send(400,{error:'INVALID_JSON'});}
    if(!input||typeof input.command!=='string')return send(400,{error:'INVALID_INPUT'});
    return send(200,await operation(v,input.command,input.args));
   }
   if(req.method!=='GET')return send(405,{error:'METHOD_REJECTED'});
   const pathname=new URL(req.url,origin).pathname;
   if(pathname!=='/'&&!/^\/assets\/[A-Za-z0-9_.-]+\.(js|css)$/.test(pathname))return send(404,{error:'NOT_FOUND'});
   const file=path.join(web,pathname==='/'?'index.html':pathname.slice(1));
   const content=await fs.readFile(file);return send(200,content,pathname.endsWith('.js')?'text/javascript':pathname.endsWith('.css')?'text/css':'text/html');
  }catch{if(!res.headersSent)send(500,{error:'LOCAL_SERVICE_FAILURE'});else res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
 origin=`http://127.0.0.1:${server.address().port}`;
 return {server,origin,url:`${origin}/#${token}`,token};
}
