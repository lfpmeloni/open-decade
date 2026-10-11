import {assert,hash,dateOK} from './core.mjs';
function flattened(result){const rows=[['Path','Value']];const visit=(v,p)=>{if(v!==null&&typeof v==='object')for(const [k,x]of Object.entries(v))visit(x,p?`${p}.${k}`:k);else rows.push([p,v===null?'null':String(v)]);};visit(JSON.parse(JSON.stringify(result)),'');assert(rows.length<=100000,'INPUT_LIMIT','Portable report exceeds 100000 rows.');return rows;}
export function pdf(result){
 const ascii=JSON.stringify(result,null,2).replace(/[^\x20-\x7e\n]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
 const lines=ascii.split('\n').flatMap(line=>line.match(/.{1,95}/g)??['']);assert(lines.length<=5000,'INPUT_LIMIT','PDF exceeds 100 pages. Use structured JSON for larger reports.');
 const pages=[];for(let i=0;i<lines.length;i+=50)pages.push(lines.slice(i,i+50));
 const objects=[null,null,'<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>'];
 for(const [i,page]of pages.entries()){
  const content='BT /F1 9 Tf 40 800 Td 13 TL '+page.map((line,index)=>`${index?'T* ':''}(${line.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}) Tj`).join('\n')+' ET';
  const stream=5+i*2;objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${stream} 0 R >>`);objects.push(`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
 }
 objects[0]='<< /Type /Catalog /Pages 2 0 R >>';objects[1]=`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${4+i*2} 0 R`).join(' ')}] >>`;
 let out='%PDF-1.4\n',offsets=[0];for(const [i,obj]of objects.entries()){offsets.push(Buffer.byteLength(out));out+=`${i+1} 0 obj\n${obj}\nendobj\n`;}
 const xref=Buffer.byteLength(out);out+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`+offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')+`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return Buffer.from(out);
}
const xml=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'');
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;}
function zip(files){
 const local=[],central=[];let offset=0;
 for(const [name,text]of Object.entries(files)){
  const data=Buffer.from(text),filename=Buffer.from(name),crc=crc32(data),header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(filename.length,26);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x21,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(filename.length,28);c.writeUInt32LE(offset,42);central.push(c,filename);local.push(header,filename,data);offset+=header.length+filename.length+data.length;
 }
 const index=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(Object.keys(files).length,8);end.writeUInt16LE(Object.keys(files).length,10);end.writeUInt32LE(index.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([...local,index,end]);
}
export function xlsx(result){
 const rows=flattened(result);for(const row of rows)for(const cell of row)assert(cell.length<=32767,'INPUT_LIMIT','Spreadsheet cell exceeds Excel text limits.');
 const ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
 return zip({'[Content_Types].xml':'<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
 '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml':`<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Report" sheetId="1" r:id="rId1"/></sheets></workbook>`,
 'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
 'xl/worksheets/sheet1.xml':`<worksheet xmlns="${ns}"><sheetData>${rows.map((row,i)=>`<row r="${i+1}">${row.map((cell,j)=>`<c r="${j?'B':'A'}${i+1}" t="inlineStr"><is><t xml:space="preserve">${xml(cell)}</t></is></c>`).join('')}</row>`).join('')}</sheetData></worksheet>`});
}
export function ics(result){
 assert(['bills-v1','reminders-v1'].includes(result.data?.metadata?.method)&&Array.isArray(result.data?.rows)&&result.data.rows.every(r=>r.recurringId||r.reminderId),'INVALID_INPUT','Calendar export requires a bills or reminders report.');
 const escape=x=>String(x).replace(/\\/g,'\\\\').replace(/[\r\n]+/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Open-decade//Local review//EN','CALSCALE:GREGORIAN'];
 for(const r of result.data.rows){assert(dateOK(r.date),'INVALID_INPUT','Calendar item date is invalid.');const stamp=result.data.asOf??result.data.from;assert(dateOK(stamp),'INVALID_INPUT','Calendar requires an explicit report date.');lines.push('BEGIN:VEVENT',`UID:${hash([r.reminderId??r.recurringId,r.date])}@open-decade.local`,`DTSTAMP:${stamp.replaceAll('-','')}T000000Z`,`DTSTART;VALUE=DATE:${r.date.replaceAll('-','')}`,`SUMMARY:${escape(r.title??r.name)}`,'TRANSP:TRANSPARENT','END:VEVENT');}
 lines.push('END:VCALENDAR');return lines.map(line=>{let out='',count=0;for(const c of line){const n=Buffer.byteLength(c);if(count+n>73){out+='\r\n ';count=1;}out+=c;count+=n;}return out;}).join('\r\n')+'\r\n';
}
export function redacted(result){
 assert(['net-worth-v1','cashflow-v1'].includes(result.data?.metadata?.method)&&result.data?.perCurrency,'INVALID_INPUT','Redacted summaries support net-worth and cashflow reports only.');
 const allowed=['assets','liabilities','netWorth','income','spending','interest','principal','transfer','investment','unknown'],perCurrency={};
 for(const [currency,bucket]of Object.entries(result.data.perCurrency)){assert(/^[A-Z]{3}$/.test(currency),'INVALID_INPUT','Unexpected currency.');perCurrency[currency]=Object.fromEntries(allowed.filter(k=>Object.hasOwn(bucket,k)).map(k=>[k,bucket[k]]));}
 return {...result,data:{asOf:result.data.asOf,from:result.data.from,to:result.data.to,perCurrency,metadata:{method:result.data.metadata?.method,softwareVersion:result.data.metadata?.softwareVersion},sharing:'Only dates, currencies, aggregate values, method and warning codes included. These may still identify a person; this is not guaranteed anonymization.'},warnings:result.warnings.map(w=>({code:w.code})),errors:[]};
}
