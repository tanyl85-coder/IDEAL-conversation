import { z } from 'zod';
export const levels=['Individual Contributor','Team Leader','Strategic Leader','Visionary Leader'];
export const traits=['Inspire','Dare to Try','Empathise','Aim High','Learn & Relearn'];
export const ratings=['Small extent','Moderate extent','Large extent','Not enough opportunity to observe'];
const note=z.string().max(6000);
const reflection=z.object({rating:z.enum(['Small extent','Moderate extent','Large extent','Not enough opportunity to observe']).optional(),evidence:note.default(''),pattern:z.enum(['Build on','Possible overplay','Possible underplay']).default('Build on'),exploration:note.default(''),supervisorRating:z.enum(['Small extent','Moderate extent','Large extent','Not enough opportunity to observe']).optional(),supervisorNote:note.default('')});
export const dataSchema=z.object({level:z.number().int().min(0).max(3),mode:z.enum(['prepare','together']),context:note,selected:z.array(z.string()).max(5),reflections:z.record(reflection),actions:z.array(z.object({id:z.string(),attribute:z.string(),also:z.array(z.string()).max(4).optional(),behaviour:note,opportunity:note,success:note,support:note,date:z.string().max(10)})).max(2),discussion:z.array(z.string()).max(2).default([]),aspiration:note.default(''),question:note.default(''),scenario:z.string().default(''),changeReason:note.default(''),focusDecisions:z.record(z.object({status:z.enum(['Paused','Moved on']),reason:note,actionDisposition:z.enum(['Paused with focus','Completed with reflection','Replaced by current actions'])})).default({}),agreement:z.boolean().default(false)});
export type JourneyData=z.infer<typeof dataSchema>;
export const blankData:JourneyData={level:0,mode:'prepare',context:'',selected:[],reflections:{},actions:[],discussion:[],aspiration:'',question:'',scenario:'',changeReason:'',focusDecisions:{},agreement:false};
export const emptyReflection:JourneyData["reflections"][string]={evidence:'',pattern:'Build on' as const,exploration:'',supervisorNote:''};
export type Journey={id:string;owner_id:string;supervisor_id:string|null;owner_name:string;supervisor_name?:string;shared:number;status:string;version:number;data:JourneyData;updated:string;meta?:JourneyMeta};

export type Suggestion={id:string;attribute:string;reason:string;created:string;by:string;status:string;response?:string;responded?:string};
export type JourneyMeta={created?:string;agreedAt?:string;agreedPlan?:JourneyData;focus?:Record<string,{status:string;date:string;reason:string;by:string}>;suggestions?:Suggestion[]};
export function statusLabel(j:Journey){return j.status==='endorsed'?'Agreed':j.status==='revision'?'Update awaiting agreement':j.shared?'Shared for discussion':'Draft';}
