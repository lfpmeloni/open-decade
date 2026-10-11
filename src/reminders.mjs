import {assert,dateOK,warning} from './core.mjs';
export function reminders(s,o,warnings){
 const through=o.to??o.asOf;assert(dateOK(through)&&through>=o.asOf,'INVALID_INPUT','Reminder window must end on or after --as-of.');
 const rows=s.active.filter(r=>r.kind==='reminder'&&r.enabled&&!r.completed&&r.dueDate<=through).map(r=>({reminderId:r.id,title:r.title,date:r.dueDate,topic:r.topic,documentIds:r.documentIds,status:r.dueDate<o.asOf?'past-due':r.dueDate===o.asOf?'due':'upcoming'}));
 if(!rows.length)warnings.push(warning('NO_ENABLED_REMINDERS'));
 return {asOf:o.asOf,through,rows,delivery:'Local view only; no external notifications or background scheduling.'};
}
