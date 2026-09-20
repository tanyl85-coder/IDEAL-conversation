import {levelQuestions,scenarios} from './scenarios';
import {coaching} from './coaching';
export function supervisorGuide(data:any){const s=scenarios.find(s=>s.id===data.scenario&&s.level===data.level);return {
 scope:levelQuestions[data.level],
 stages:[
 {title:'Prepare with curiosity',questions:['What have you directly observed, and what are you assuming?','When has this officer handled something similar well?','What might your own expectations, decisions or support be contributing?']},
 {title:'Listen before interpreting',questions:['Ask: what would make this conversation useful for you?','Invite one incident: what happened, what did you do, and what followed?','Reflect back what you heard and ask what you may have missed.']},
 {title:'Explore strengths and causes',questions:['What strength helped here? When does it need more room or a different balance?','Is the barrier skill, confidence, habit, opportunity, workload or the way work is organised?','Offer an observation: I noticed X; the effect seemed to be Y. How did you experience it?']},
 {title:'Agree a small experiment',questions:['What is one behaviour worth testing in real work?','What will you personally do to support it or remove an obstacle?','Who can give useful feedback, and when will you revisit what happened?']},
 {title:'Follow through',questions:['Ask what was tried before judging the outcome.','Distinguish lack of opportunity from lack of progress.','Recognise useful learning, adjust the experiment and check whether you delivered your promised support.']}
 ],
 attributes:(data.discussion?.length?data.discussion:data.selected.slice(0,2)).map((id:string)=>({id,question:data.reflections[id]?.pattern==='Possible overplay'?coaching[id]?.over:data.reflections[id]?.pattern==='Possible underplay'?coaching[id]?.under:'When has this strength helped the officer succeed, and where could they apply it next?'})),
 scenario:s?{title:s.title,assumption:s.barrier,support:s.support,review:s.review}:null
};}
