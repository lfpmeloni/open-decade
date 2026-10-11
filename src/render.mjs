export const json=result=>JSON.stringify(result,null,2)+'\n';
export function markdown(result){return `# Open-decade ${result.command.replace(/[^a-z -]/gi,'')}\n\n${result.outcome}\n\n`+'```json\n'+json(result).replace(/`/g,'\\u0060').replace(/</g,'\\u003c')+'```\n';}
export function csv(result){
 const rows=[['path','value']];
 function walk(v,p){if(v!==null&&typeof v==='object'){for(const [k,x]of Object.entries(v))walk(x,p?`${p}.${k}`:k);}else rows.push([p,v===null?'null':String(v)]);}
 walk(JSON.parse(JSON.stringify(result)),'');
 const cell=v=>'"'+(/^[\s]*[=+\-@\t\r\n]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"';
 return rows.map(r=>r.map(cell).join(',')).join('\r\n')+'\r\n';
}
