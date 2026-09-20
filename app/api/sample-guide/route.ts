import {supervisorGuide} from '@/lib/supervisor-guide';
import {scenarios} from '@/lib/scenarios';
export function GET(request:Request){const params=new URL(request.url).searchParams;const s=scenarios.find(x=>x.id===params.get('scenario'));const level=Math.min(3,Math.max(0,Number(params.get('level'))||0));return Response.json({guide:supervisorGuide({level,selected:s?.links.map(x=>x[0])||['excellence','care'],scenario:s?.id,reflections:{}})},{headers:{'Cache-Control':'no-store'}});}
