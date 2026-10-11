import React,{useState,useEffect,useRef} from 'react';

// Only builds records. Validation, reconciliation and persistence belong to the domain.
export default function RecordForm({kind,original,mask,api,onSaved,onCancel}){
 const [fields,setFields]=useState(()=>({...{date:new Date().toISOString().slice(0,10),currency:'',name:'',ownership:'',coverage:'unresolved',value:'',amount:'',classification:'unknown',target:'',targetDate:'',accountId:'',entityId:''},...original,source:'Manual entry'}));
 const [accounts,setAccounts]=useState([]),[schema,setSchema]=useState(null),[more,setMore]=useState(false),[proposal,setProposal]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const revision=useRef(0);
 useEffect(()=>{let active=true;api('records',{kind:'account',limit:500}).then(r=>{if(!active)return;if(r.outcome==='failure'){setError(r.errors.map(e=>e.message).join(' '));return;}setAccounts(r.data.records);setSchema(r.data.schemaVersion);setMore(r.data.total>500);}).catch(e=>active&&setError(e.message));return()=>{active=false;revision.current++;};},[api]);
 function change(key,value){revision.current++;setProposal(null);setFields(f=>({...f,[key]:value}));}
 function input(key,label,type='text'){return <label>{label}<input required type={type} value={fields[key]??''} onChange={e=>change(key,e.target.value)}/></label>;}
 async function preview(e){e.preventDefault();const version=++revision.current;setProposal(null);setError('');setBusy(true);
  try{
   const keys={account:['name','ownership','coverage'],observation:['entityId','value'],transaction:['accountId','amount','classification'],goal:['name','target','targetDate']}[kind];
   const r={...original,id:crypto.randomUUID(),kind,date:fields.date,currency:fields.currency.toUpperCase(),capturedAt:new Date().toISOString(),provenance:{source:fields.source,quality:'user-reported',uncertainties:[...(original?.provenance.uncertainties??[])]},...(original?{supersedes:original.id}:{}),...(!original&&kind==='goal'?{entityIds:[]}:{})};
   for(const key of keys)r[key]=fields[key];
   const response=await api('import preview',{batch:{schemaVersion:schema,batchId:crypto.randomUUID(),records:[r]}});
   if(version!==revision.current)return;
   if(response.outcome==='failure')setError(response.errors.map(e=>e.message).join(' '));else setProposal(response.data);
  }catch(e){if(version===revision.current)setError(e.message);}finally{setBusy(false);}
 }
 async function save(){setBusy(true);setError('');try{const response=await api('import apply',{batch:proposal.batch,confirmation:proposal.confirmation});if(response.outcome==='failure'){setError(response.errors.map(e=>e.message).join(' '));setProposal(null);}else onSaved();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section aria-label="Record entry"><h2>{original?'Correct':'Add'} {kind==='observation'?'balance':kind}</h2><p>Enter decimal amounts with a dot, without thousands separators. A balance is a dated snapshot, not proof of complete transaction history.</p>
 {error&&<p role="alert">{error}</p>}
 {mask?<p>Show values to enter and review records.</p>:<form onSubmit={preview}><fieldset disabled={busy||schema===null}>
 {input('date','Record date','date')}{input('currency','Record currency')}{input('source','Source description')}
 {(kind==='account'||kind==='goal')&&input('name','Record name')}
 {kind==='account'&&<>{input('ownership','Ownership fraction (0 to 1)')}<label>Balance coverage<select value={fields.coverage} onChange={e=>change('coverage',e.target.value)}><option value="unresolved">Unresolved</option><option value="aggregate">Account total (aggregate)</option><option value="holdings">Individual holdings</option></select></label></>}
 {['transaction','observation'].includes(kind)&&<><label>Account<select aria-label="Account" required value={fields[kind==='transaction'?'accountId':'entityId']} onChange={e=>change(kind==='transaction'?'accountId':'entityId',e.target.value)}><option value="">Choose confirmed account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name} · {a.currency} · {a.id}</option>)}</select></label>{more&&<p>First 500 accounts shown. Use Import review for other accounts.</p>}</>}
 {kind==='observation'&&input('value','Balance value')}
 {kind==='transaction'&&<>{input('amount','Signed amount (negative for money out)')}<label>Classification<select aria-label="Classification" value={fields.classification} onChange={e=>change('classification',e.target.value)}>{[...new Set(['unknown','income','spending',...(original?[original.classification]:[])])].map(c=><option key={c}>{c}</option>)}</select></label><p>Transfers, investments and debt payments need linked records in Import review.</p></>}
 {kind==='goal'&&<>{input('target','Target amount')}{input('targetDate','Target date','date')}<p>{original?'Existing asset assignments are preserved.':'New goals start unfunded.'} Manage asset assignments in Import review.</p></>}
 {original&&<p>Correction of {original.id}. Other fields are preserved; the original remains in history. Existing uncertainties must be resolved in Import review.</p>}
 <button type="submit">Preview record</button></fieldset></form>}
 {proposal&&<div className="review"><h3>Review proposed record</h3><p>Nothing is saved yet.</p>{mask?<p>Show values to review.</p>:<><dl>{Object.entries(proposal.batch.records[0]).filter(([k])=>!['provenance','capturedAt'].includes(k)).map(([k,v])=><React.Fragment key={k}><dt>{k}</dt><dd>{typeof v==='object'?JSON.stringify(v):v}</dd></React.Fragment>)}</dl><p>Source: {proposal.batch.records[0].provenance.source}</p><ul>{proposal.warnings.map((w,i)=><li key={i}>{w.code}</li>)}</ul></>}<button disabled={busy||mask||proposal.warnings.some(w=>w.code==='UNRESOLVED_INPUT')} onClick={save}>Confirm record</button></div>}
 <button disabled={busy} onClick={onCancel}>Cancel entry</button></section>;
}
