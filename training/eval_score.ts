// Eval scorer: reads /tmp/eval_polished.json (produced by generating each
// dataset/eval_profiles.json case through the model) and reports the scorecard:
// model-polish rate, guard-fallback breakdown, dashes, cliches, opener uniqueness.
// Run:  npx tsx training/eval_score.ts
import { readFileSync } from "node:fs";
import { checkFacts, claimsCurrentlyEmployed, inventedTech } from "../src/ai/factGuard";
import { stripDashes } from "../src/ai/humanize";
const CL=["delve","leverage","robust","seamless","synergy","passionate about","proven track record","furthermore","moreover","in conclusion","fast-paced","excited to","tapestry","i am writing to express"];
const cases=JSON.parse(readFileSync("/tmp/eval_polished.json","utf8"));
let tripped=0,num=0,status=0,tech=0,dashes=0,cliches=0; const openers=new Set<string>();
for(const c of cases){
  const pol=stripDashes(c.polished);
  const n=checkFacts(c.skeleton,pol), s=claimsCurrentlyEmployed(pol,{isCurrent:c.topIsCurrent}), t=inventedTech(pol,c.allowedText);
  const ok=n.ok&&!s&&t.length===0; if(!ok)tripped++; if(!n.ok)num++; if(s)status++; if(t.length)tech++;
  const body=ok?pol:stripDashes(c.skeleton);
  dashes+=(body.match(/[—–]/g)||[]).length; cliches+=CL.filter(x=>body.toLowerCase().includes(x)).length;
  openers.add((body.split("\n").filter(l=>l.trim())[1]||"").slice(0,45));
}
const N=cases.length;
console.log(`model-polish ${N-tripped}/${N} | fallbacks ${tripped} [num ${num}, status ${status}, tech ${tech}] | dashes ${dashes} | cliches ${cliches} | openers ${openers.size}/${N} distinct`);
