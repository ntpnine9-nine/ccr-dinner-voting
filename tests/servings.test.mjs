import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeChoices,setServing,usedServings,completedCategories,ballotLines,tallyChoices,isLegacyBallot,quotaFor,billingMultiplier,choiceSummary} from '../ballot-model.js';
import {categoryPlans,optimizeMenuSet,lineCost,FIXED_ALLOWANCE} from '../decision-engine.js';
const cats=JSON.parse(fs.readFileSync(new URL('../menus.json',import.meta.url))).categories;
const ballot=Object.fromEntries(cats.map(c=>[c.key,{[c.key+'1']:quotaFor(c.key)}]));
ballot.A={A1:1,A2:1};
assert.deepEqual(normalizeChoices(ballot),ballot);
assert.equal(completedCategories(ballot).length,8);
let partial=setServing({},'A','A1',1);
assert.equal(usedServings(partial,'A'),1);
assert.equal(completedCategories(partial).length,0);
partial=setServing(partial,'A','A2',1);
assert.equal(completedCategories(partial).length,1);
assert.throws(()=>setServing(partial,'A','A1',2));
partial=setServing(partial,'A','A2',0);
assert.deepEqual(setServing(partial,'A','A1',2).A,{A1:2});
for(const [key,value] of [['A',{A1:3}],['A',{A1:1}],['A',{A1:1,A2:2}],['A',{B1:2}],['A',{A1:1.5}],['A',{A1:-2}],['A',{A1:'2'}],['D',{D1:2}],['G',{G1:2}],['H',{H1:2}],['H',{H1:1,H2:1}]]) assert.throws(()=>normalizeChoices({...ballot,[key]:value}),JSON.stringify(value));
assert.throws(()=>normalizeChoices({...ballot,Z:{Z1:1}}));
assert.throws(()=>normalizeChoices({}));
const legacy=Object.fromEntries(cats.map(c=>[c.key,c.key+'1'])),original=structuredClone(legacy);
assert.ok(isLegacyBallot(legacy));assert.ok(!isLegacyBallot(ballot));
assert.equal(normalizeChoices(legacy).F.F1,2);
assert.deepEqual(legacy,original,'historical source never mutated');
const lines=ballotLines(cats,ballot),rice=lines.find(o=>o.key==='H');
assert.equal(rice.selectedQty,1);assert.equal(rice.qty,2);assert.equal(rice.lineTotal,120);
assert.equal(lines.reduce((n,o)=>n+o.qty,0),14,'14 billed servings across categories');
assert.equal(lines.reduce((n,o)=>n+o.selectedQty,0),13);
assert.equal(lines.reduce((n,o)=>n+o.lineTotal,0)+FIXED_ALLOWANCE,1718);
assert.equal(choiceSummary(ballot,'A'),'A1 × 1 + A2 × 1');
const tallies=tallyChoices(ballot);
assert.equal(tallies.A1,1);assert.equal(tallies.A2,1);assert.equal(tallies.F1,2);assert.equal(tallies.H1,1,'rice support is one selection, despite two billed servings');
for(const c of cats){
 const plans=categoryPlans(c,tallies);assert.equal(plans.length,quotaFor(c.key)===2?28:7);
 for(const p of plans){assert.equal(p.items.reduce((n,o)=>n+o.selectedQty,0),quotaFor(c.key));assert.equal(p.items.reduce((n,o)=>n+o.qty,0),quotaFor(c.key)*billingMultiplier(c.key));assert.ok(Number.isFinite(lineCost(p)));}
}
// Exhaustive independent enumeration checks DP optimum and tie-by-price, including split-menu plans.
const small=cats.map(c=>({...c,options:c.options.slice(0,2)}));
const support=Object.fromEntries(small.flatMap((c,i)=>c.options.map((o,j)=>[o.id,(i*3+j*7)%11])));
const enumerate=(i,cost,score,budget,best)=>{
 if(i===small.length){if(cost+FIXED_ALLOWANCE<=budget&&(!best||score>best.score||(score===best.score&&cost<best.cost)))return {cost,score};return best;}
 for(const plan of categoryPlans(small[i],support))best=enumerate(i+1,cost+lineCost(plan),score+plan.score,budget,best);
 return best;
};
for(const budget of [1600,1700,1800,2000,2200]){
 const expected=enumerate(0,0,0,budget,null),actual=optimizeMenuSet(small,support,budget);
 assert.equal(actual?.score,expected?.score);assert.equal(actual?.foodCost,expected?.cost);
 if(actual)assert.ok(actual.picks.every((p,i)=>p.items.reduce((n,o)=>n+o.selectedQty,0)===quotaFor(cats[i].key)));
}
const blocked=cats.map(c=>({...c,options:c.options.map(o=>({...o,availabilityStatus:c.key==='A'?'unavailable':o.availabilityStatus}))}));
assert.equal(optimizeMenuSet(blocked,tallies,2200),null,'unavailable entire category is infeasible');
console.log('PASS · serving quotas · mixed menus · rice billing · historical preservation · exhaustive budget optimizer');
