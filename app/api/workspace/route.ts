import { getChatGPTUser } from '@/app/chatgpt-auth';
import { db,now,fail,publicJourney } from '@/lib/server';
import { dataSchema,blankData } from '@/lib/model';
import { supervisorGuide } from '@/lib/supervisor-guide';
import framework from '@/lib/framework.json';
const json=(body:unknown,init:ResponseInit={})=>Response.json(body,{...init,headers:{'Cache-Control':'private, no-store',...init.headers}});
const ids=new Set(framework.attributes.map(a=>a.id));
async function identity(){const u=await getChatGPTUser();if(!u)fail('Please sign in to continue.',401);return u;}
async function membership(userId:string){return await db().prepare('SELECT * FROM members WHERE user_id=?').bind(userId).first<any>();}
function errorResponse(e:any){console.error('Workspace request failed',e.message);return json({error:e.status?e.message:'We could not reach your saved records. Your input is still here; please try again.'},{status:e.status||503});}
export async function GET(request:Request){try{const u=await identity(),m=await membership(u.userId);if(!m)return json({user:u,member:null});
 const prep=new URL(request.url).searchParams.get('prepare');if(prep){const j=await db().prepare('SELECT * FROM journeys WHERE id=? AND workspace_id=? AND supervisor_id=? AND shared=1').bind(prep,m.workspace_id,u.userId).first<any>();if(!j)fail('Only the assigned supervisor can access preparation guidance.',403);return json({guide:supervisorGuide(JSON.parse(j.data))});}
 const workspace=await db().prepare('SELECT id,name FROM workspaces WHERE id=?').bind(m.workspace_id).first();
 const people=(await db().prepare('SELECT user_id,name,role FROM members WHERE workspace_id=?').bind(m.workspace_id).all()).results;
 const rows=(await db().prepare(`SELECT j.*,o.name owner_name,s.name supervisor_name FROM journeys j JOIN members o ON o.user_id=j.owner_id LEFT JOIN members s ON s.user_id=j.supervisor_id WHERE j.workspace_id=? AND (j.owner_id=? OR (j.supervisor_id=? AND j.shared=1)) ORDER BY j.updated DESC`).bind(m.workspace_id,u.userId,u.userId).all()).results;
 const jid=new URL(request.url).searchParams.get('history');let history:any[]=[];
 if(jid){if(!rows.some((r:any)=>r.id===jid))fail('This conversation is private.',403);history=(await db().prepare('SELECT id,actor_name,kind,snapshot,created FROM events WHERE journey_id=? ORDER BY created DESC').bind(jid).all()).results;}
 let insights=null;
 if(m.role==='admin'){
 const all=(await db().prepare('SELECT owner_id,data,status FROM journeys WHERE workspace_id=? AND shared=1').bind(m.workspace_id).all<any>()).results;
 const cohort=new Set(all.map(r=>r.owner_id));const counts:Record<string,Set<string>>={};
 for(const r of all){for(const id of JSON.parse(r.data).selected||[]){(counts[id]??=new Set()).add(r.owner_id);}}
 insights=cohort.size<5?{suppressed:true,minimum:5}:{suppressed:false,people:cohort.size,themes:Object.entries(counts).filter(([,v])=>v.size>=5).map(([id,v])=>({id,count:v.size})).sort((a,b)=>b.count-a.count)};
 }
 return json({user:u,member:m,workspace,people,journeys:rows.map(publicJourney),history,insights});
 }catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)fail('Request origin does not match.',403);
 const u=await identity();const bodyText=await request.text();if(bodyText.length>120000)fail('This record is too large. Shorten the notes.');let b:any;try{b=JSON.parse(bodyText)}catch{fail('Invalid request.');}
 let m=await membership(u.userId);const t=now();
 if(b.action==='createWorkspace'){
 if(m)fail('You already belong to a workspace.');const name=String(b.name||'').trim();if(name.length<2||name.length>100)fail('Enter a workspace name between 2 and 100 characters.');const id=crypto.randomUUID();
 await db().batch([db().prepare('INSERT INTO workspaces (id,name,created) VALUES (?,?,?)').bind(id,name,t),db().prepare('INSERT INTO members (user_id,workspace_id,name,email,role) VALUES (?,?,?,?,?)').bind(u.userId,id,u.displayName,u.email,'admin')]);return json({ok:true});}
 if(b.action==='join'){
 if(m)fail('You already belong to a workspace.');const invite=await db().prepare('SELECT * FROM invites WHERE token=? AND used_by IS NULL AND expires>?').bind(String(b.code||'').trim(),t).first<any>();if(!invite)fail('This invitation is invalid, used or expired. Ask your workspace administrator for a new code.');
 const out=await db().batch([db().prepare(`UPDATE invites SET used_by=? WHERE token=? AND used_by IS NULL AND expires>?`).bind(u.userId,invite.token,t),db().prepare(`INSERT INTO members (user_id,workspace_id,name,email,role) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM invites WHERE token=? AND used_by=?)`).bind(u.userId,invite.workspace_id,u.displayName,u.email,invite.role,invite.token,u.userId)]);if(!out[1].meta.changes)fail('This invitation has already been used.');return json({ok:true});}
 if(!m)fail('Create or join your workspace first.',403);
 if(b.action==='invite'){if(m.role!=='admin')fail('Only HR administrators can create invitations.',403);if(!['officer','supervisor','admin'].includes(b.role))fail('Choose a valid role.');const token=crypto.randomUUID();await db().prepare('INSERT INTO invites (token,workspace_id,role,expires) VALUES (?,?,?,?)').bind(token,m.workspace_id,b.role,new Date(Date.now()+7*86400000).toISOString()).run();return json({code:token});}
 if(b.action==='createJourney'){const id=crypto.randomUUID();await db().prepare('INSERT INTO journeys (id,workspace_id,owner_id,data,updated) VALUES (?,?,?,?,?)').bind(id,m.workspace_id,u.userId,JSON.stringify({...blankData,_meta:{created:t}}),t).run();return json({id});}
 const row=await db().prepare('SELECT * FROM journeys WHERE id=? AND workspace_id=?').bind(String(b.id||''),m.workspace_id).first<any>();if(!row)fail('Conversation not found.',404);
 const owner=row.owner_id===u.userId,supervisor=row.supervisor_id===u.userId&&row.shared===1;if(!owner&&!supervisor)fail('This conversation is private.',403);
 if(b.version!==row.version)fail('This conversation changed in another session. Reload saved records before trying again; copy any unsaved notes first.',409);
 let data=dataSchema.parse(JSON.parse(row.data)),meta=JSON.parse(row.data)._meta||{},shared=row.shared,supervisorId=row.supervisor_id,status=row.status,kind='',snapshot='';
 if(status==='endorsed'&&!meta.agreedPlan){meta.agreedPlan=structuredClone(data);meta.agreedAt=row.updated;}
 if(b.action==='save'||b.action==='share'){
 const previous=structuredClone(data);if(status==='endorsed'&&!meta.agreedPlan){meta.agreedPlan=previous;meta.agreedAt=row.updated;}
 const parsed=dataSchema.safeParse(b.data);if(!parsed.success)fail('Check the form values. Notes must be under 6,000 characters and there can be at most two actions.');const next=parsed.data;
 if(next.selected.some(id=>!ids.has(id))||new Set(next.selected).size!==next.selected.length)fail('Choose valid, distinct IDEAL attributes.');
 if(row.shared&&next.level!==data.level)fail('The leadership level is fixed after sharing. Start a new conversation for a different scope.');
 if(Object.keys(next.reflections).some(id=>!ids.has(id)))fail('Unknown reflection attribute.');
 if(next.discussion.some(id=>!next.selected.includes(id))||new Set(next.discussion).size!==next.discussion.length)fail('Choose up to two current focus attributes for this conversation.');
 if(next.actions.some(a=>!next.selected.includes(a.attribute)||(a.also||[]).some(id=>!next.selected.includes(id))))fail('Link each growth action to a selected attribute.');
 if(!owner){
 for(const key of ['level','mode','context','selected','discussion','aspiration','scenario','focusDecisions','changeReason'])if(JSON.stringify(next[key as keyof typeof next])!==JSON.stringify(data[key as keyof typeof data]))fail('Only the officer can change their context and focus.',403);
 for(const id of ids){const prev=data.reflections[id]||{},r=next.reflections[id]||{};for(const k of ['rating','evidence','pattern','exploration'])if(((prev as any)[k]||'')!==((r as any)[k]||''))fail('Keep the officer’s reflection unchanged.',403);}
 if(next.agreement!==data.agreement)fail('Only the officer can confirm their agreement.',403);
 }else{
 for(const id of ids){const prev=data.reflections[id]||{},r=next.reflections[id]||{};for(const k of ['supervisorRating','supervisorNote'])if(((prev as any)[k]||'')!==((r as any)[k]||''))fail('Only the assigned supervisor can record their observations.',403);}
 }
 if(!owner&&(JSON.stringify(next.actions)!==JSON.stringify(data.actions)||next.question!==data.question))next.agreement=false;
 if(owner){supervisorId=b.supervisorId||null;if(supervisorId){if(supervisorId===u.userId)fail('Choose a different person as supervisor.');const s=await db().prepare('SELECT user_id FROM members WHERE user_id=? AND workspace_id=? AND role IN (?,?)').bind(supervisorId,m.workspace_id,'supervisor','admin').first();if(!s)fail('Choose a supervisor in your workspace.');}if(row.supervisor_id!==supervisorId){shared=0;for(const r of Object.values(next.reflections)){delete r.supervisorRating;r.supervisorNote='';}next.agreement=false;}}
 const removed=data.selected.filter(id=>!next.selected.includes(id)),added=next.selected.filter(id=>!data.selected.includes(id));
 if((removed.length||added.length)&&row.shared&&!next.changeReason.trim())fail('Briefly explain why your focus is changing.');
 for(const id of removed)if(!next.focusDecisions[id]?.reason.trim())fail('Choose Paused or Moved on and record a reason for each removed focus.');
 const changes:string[]=[];meta.focus??={};
 for(const id of removed){const decision=next.focusDecisions[id];meta.focus[id]={status:decision.status,date:t,reason:decision.reason,by:u.displayName};changes.push(framework.attributes.find(a=>a.id===id)?.name+': '+decision.status+' — '+decision.reason+'; actions: '+decision.actionDisposition);}
 for(const id of added){const resumed=!!meta.focus[id];meta.focus[id]={status:'Proposed',date:t,reason:next.changeReason||'Initial development focus',by:u.displayName};changes.push(framework.attributes.find(a=>a.id===id)?.name+(resumed?': proposed reactivation':': proposed focus'));}
 const material=JSON.stringify([next.context,next.aspiration,next.question,next.selected,next.actions,next.focusDecisions])!==JSON.stringify([data.context,data.aspiration,data.question,data.selected,data.actions,data.focusDecisions]);
 if(changes.length){kind='Focus updated';snapshot=JSON.stringify({data:next,previous: data,review:changes.join('\n')});}
 else if(material){kind=meta.agreedPlan?'Revision proposed':'Development plan updated';snapshot=JSON.stringify({data:next,previous:data,review:next.changeReason||'Context or practice actions updated.'});}
 data=next;
 if(b.action==='share'){if(!owner)fail('Only the officer can share this conversation.',403);if(!supervisorId)fail('Choose your supervisor before sharing.');if(data.selected.length<3)fail('Choose 3–5 attributes before sharing.');shared=1;kind='Shared for conversation';}
 status=meta.agreedPlan?(material||row.supervisor_id!==supervisorId?'revision':row.status):shared?'shared':'draft';
 }else if(b.action==='endorse'){
 if(!supervisor)fail('Only the assigned supervisor can endorse the plan.',403);if(status==='endorsed')fail('This plan is already endorsed.');if(!data.agreement)fail('The officer needs to confirm the current plan first.');if(data.selected.length<3||data.selected.length>5)fail('Agree on 3–5 attributes.');

 if(!data.actions.length||data.actions.some((a:any)=>!a.behaviour.trim()||!a.opportunity.trim()||!a.success.trim()||!a.support.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(a.date)))fail('Complete the behaviour, work opportunity, success signal, support and review date for each action.');status='endorsed';kind='Conversation and plan agreed';meta.agreedAt=t;meta.agreedPlan=structuredClone(data);meta.focus??={};for(const id of data.selected){if(meta.focus[id]?.status!=='Active')meta.focus[id]={...(meta.focus[id]||{}),status:'Active',date:t,by:u.displayName,reason:meta.focus[id]?.reason||'Agreed development focus'};}for(const x of meta.suggestions||[])if(data.selected.includes(x.attribute)&&x.status!=='Not agreed—revisit')x.status='Included in agreed focus';
 }else if(b.action==='review'){
 const note=String(b.note||'').trim();if(!note||note.length>6000)fail('Describe what happened, what changed and what to try next.');kind='Progress review';snapshot=JSON.stringify({data,review:note});
 }else if(b.action==='suggest'){
 if(!supervisor)fail('Only the assigned supervisor can suggest an attribute.',403);if(!ids.has(b.attribute))fail('Choose a valid attribute.');const reason=String(b.reason||'').trim();if(!reason||reason.length>6000)fail('Explain your observation and why this focus could help.');meta.suggestions??=[];if(meta.suggestions.length>=30)fail('Review existing suggestions before adding more.');meta.suggestions.push({id:crypto.randomUUID(),attribute:b.attribute,reason,created:t,by:u.displayName,status:'Proposed'});kind='Supervisor suggested a focus';snapshot=JSON.stringify({data,review:framework.attributes.find(a=>a.id===b.attribute)?.name+': '+reason});
 }else if(b.action==='respondSuggestion'){
 if(!owner)fail('Only the officer can respond to a suggestion.',403);const x=meta.suggestions?.find((x:any)=>x.id===b.suggestionId);if(!x)fail('Suggestion not found.');if(!['Add to our discussion','Discuss before deciding','Suggest a different focus','Not agreed—revisit'].includes(b.response))fail('Choose a response.');x.status=b.response;x.response=String(b.note||'').slice(0,6000);x.responded=t;kind='Officer responded to suggestion';snapshot=JSON.stringify({data,review:x.status+(x.response?': '+x.response:'')});
 }else fail('Unknown action.');
 const eventId=crypto.randomUUID();
 const statements=[db().prepare('UPDATE journeys SET data=?,shared=?,supervisor_id=?,status=?,version=version+1,updated=? WHERE id=? AND version=?').bind(JSON.stringify({...data,_meta:meta}),shared,supervisorId,status,t,row.id,row.version)];
 if(kind)statements.push(db().prepare('INSERT INTO events (id,journey_id,actor_id,actor_name,kind,snapshot,created) SELECT ?,?,?,?,?,?,? WHERE changes()=1 AND EXISTS (SELECT 1 FROM journeys WHERE id=? AND version=? AND updated=?)').bind(eventId,row.id,u.userId,u.displayName,kind,snapshot||JSON.stringify({data}),t,row.id,row.version+1,t));
 const results=await db().batch(statements);if(!results[0].meta.changes)fail('This conversation changed. Reload saved records before trying again.',409);
 return json({ok:true});
 }catch(e){return errorResponse(e);}}
