import React,{useState,useEffect,useRef} from 'react';
const title=k=>k.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('-',' ');
function initial(s){if('const'in s)return s.const;if(s.type==='object')return Object.fromEntries((s.required??[]).map(k=>[k,initial(s.properties[k])]));if(s.type==='array')return [];return '';}
function Field({schema:s,value,onChange,label,required=false}){
 const nullable=s.anyOf?.some(x=>x.type==='null')||Array.isArray(s.type)&&s.type.includes('null');
 if(nullable){const base=s.anyOf?.find(x=>x.type!=='null')??{...s,type:s.type.find(x=>x!=='null')};return <fieldset><legend>{label}</legend><label><input type="checkbox" checked={value===null} onChange={e=>onChange(e.target.checked?null:initial(base))}/>No cap / null value</label>{value!==null&&<Field schema={base} value={value} onChange={onChange} label={`${label} value`} required={required}/>}</fieldset>;}
 if('const'in s)return <p>{label}: {String(s.const)}</p>;
 if(s.type==='object')return <fieldset><legend>{label}</legend>{Object.entries(s.properties).map(([key,shape])=>{
  const needed=s.required?.includes(key),present=value?.[key]!==undefined;
  const change=next=>onChange({...value,[key]:next});
  return <div key={key}>{!needed&&<label><input type="checkbox" checked={present} onChange={e=>{const next={...value};if(e.target.checked)next[key]=initial(shape);else delete next[key];onChange(next);}}/>Include {title(key)}</label>}{(needed||present)&&<Field schema={shape} value={value?.[key]} onChange={change} label={`${label} / ${title(key)}`} required={needed}/>}</div>;
 })}</fieldset>;
 if(s.type==='array'){const rows=Array.isArray(value)?value:[];return <fieldset><legend>{label}</legend>{rows.map((v,i)=><div key={i}><Field schema={s.items} value={v} onChange={next=>onChange(rows.map((r,j)=>i===j?next:r))} label={`${label} ${i+1}`} required/><button type="button" onClick={()=>onChange(rows.filter((_,j)=>j!==i))}>Remove {label} {i+1}</button></div>)}<button type="button" disabled={rows.length>=(s.maxItems??500)} onClick={()=>onChange([...rows,initial(s.items)])}>Add {label} item</button></fieldset>;}
 if(s.enum||s.type==='boolean'){const options=s.enum??[true,false];return <label>{label}<select aria-label={label} required={required} value={value===undefined?'':String(value)} onChange={e=>onChange(s.type==='boolean'&&e.target.value!==''?e.target.value==='true':e.target.value)}><option value="">Choose explicitly</option>{options.map(v=><option key={String(v)} value={String(v)}>{String(v)}</option>)}</select></label>;}
 const numeric=['integer','number'].includes(s.type);
 return <label>{label}<input required={required} type={numeric?'number':s.format==='date'?'date':'text'} min={s.minimum} max={s.maximum} step={s.type==='integer'?1:'any'} maxLength={s.maxLength} value={value??''} onChange={e=>onChange(numeric&&e.target.value!==''?Number(e.target.value):e.target.value)}/></label>;
}
export default function SchemaEditor({api,mask,original,onSaved,onCancel}){
 const [catalogue,setCatalogue]=useState(null),[kind,setKind]=useState(original?.kind??'category'),[draft,setDraft]=useState(original??{}),[proposal,setProposal]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');const version=useRef(0);
 useEffect(()=>{let active=true;api('record schemas').then(r=>{if(!active)return;if(r.outcome==='failure')throw Error(r.errors.map(e=>e.message).join(' '));setCatalogue(r.data);if(!original){const selected=r.data.records.find(s=>s.properties.kind.const===kind)??r.data.records[0];setKind(selected.properties.kind.const);setDraft(initial(selected));}}).catch(e=>active&&setError(e.message));return()=>{active=false;version.current++;};},[api]);
 const schema=catalogue?.records.find(s=>s.properties.kind.const===kind);
 function change(next){version.current++;setProposal(null);setDraft(next);}
 async function preview(e){e.preventDefault();const request=++version.current;setBusy(true);setError('');setProposal(null);try{
  const record={...draft,id:crypto.randomUUID(),kind,capturedAt:new Date().toISOString(),...(original?{supersedes:original.id}:{} )};
  const r=await api('import preview',{batch:{schemaVersion:catalogue.schemaVersion,batchId:crypto.randomUUID(),records:[record]}});
  if(request!==version.current)return;if(r.outcome==='failure')setError(r.errors.map(e=>e.message+(e.details?' '+JSON.stringify(e.details):'')).join(' '));else setProposal(r.data);
 }catch(e){if(request===version.current)setError(e.message);}finally{setBusy(false);}}
 async function save(){setBusy(true);try{const r=await api('import apply',{batch:proposal.batch,confirmation:proposal.confirmation});if(r.outcome==='failure'){setError(r.errors.map(e=>e.message).join(' '));setProposal(null);}else onSaved();}catch(e){setError(e.message);}finally{setBusy(false);}}
 const properties=schema?Object.fromEntries(Object.entries(schema.properties).filter(([k])=>!['id','kind','capturedAt','supersedes'].includes(k))):{};
 return <section aria-label="Advanced record entry"><h2>{original?'Correct':'Add'} supported record</h2><p>Use recorded facts and explicit assumptions. Amounts and rates remain decimal strings. Reference IDs can be copied from confirmed records. Review all empty lists before confirming. Saving always requires preview and confirmation.</p>{error&&<p role="alert">{error}</p>}
 {mask?<p>Show values to edit supported records.</p>:<form onSubmit={preview}><fieldset disabled={busy||!catalogue}><label>Record type<select aria-label="Record type" disabled={!!original} value={kind} onChange={e=>{setKind(e.target.value);change(initial(catalogue.records.find(s=>s.properties.kind.const===e.target.value)));}}>{catalogue?.records.map(s=><option key={s.properties.kind.const}>{s.properties.kind.const}</option>)}</select></label>
 {schema&&<Field schema={{...schema,properties}} value={draft} onChange={change} label="Record"/>}<button type="submit">Preview supported record</button></fieldset></form>}
 {proposal&&<div className="review"><h3>Review supported record</h3>{mask?<p>Show values before confirming.</p>:<pre>{JSON.stringify(proposal.batch.records[0],null,2)}</pre>}<ul>{proposal.warnings.map((w,i)=><li key={i}>{w.code}</li>)}</ul><button disabled={busy||mask||proposal.warnings.some(w=>w.code==='UNRESOLVED_INPUT')} onClick={save}>Confirm supported record</button></div>}
 <button disabled={busy} onClick={onCancel}>Cancel supported record</button></section>;
}
