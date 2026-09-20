import { env } from 'cloudflare:workers';
export function db(){if(!env.DB)throw new Error('Storage unavailable');return env.DB;}
export const now=()=>new Date().toISOString();
export function fail(message:string,status=400):never{throw Object.assign(new Error(message),{status});}
export function publicJourney(row:any){const { _meta, ...data }=JSON.parse(row.data);return {...row,data,meta:_meta||{}};}
