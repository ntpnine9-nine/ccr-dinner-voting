import {quotaFor,billingMultiplier} from './ballot-model.js?v=20261022-servings1';
export const RICE_ALLOWANCE = 200;
export const CONTINGENCY_ALLOWANCE = 120;
export const FIXED_ALLOWANCE = RICE_ALLOWANCE + CONTINGENCY_ALLOWANCE;
export function lineCost(option){return option.items ? option.items.reduce((n,o)=>n+lineCost(o),0) : Number(option.price)*Number(option.qty);}
export function totalCost(options){return options.reduce((sum,o)=>sum+lineCost(o),0)+FIXED_ALLOWANCE;}
export function rankCategory(category,tallies={}){return [...category.options].sort((a,b)=>Number(tallies[b.id]||0)-Number(tallies[a.id]||0)||lineCost(a)-lineCost(b)||a.id.localeCompare(b.id));}
export function categoryPlans(category,tallies={}){
  const options=category.options.filter(o=>o.availabilityStatus!=='unavailable');
  const make = allocations => {
    const items=allocations.map(([option,selectedQty])=>({...option,category:category.key,selectedQty,qty:selectedQty*billingMultiplier(category.key)}));
    return {id:category.key+':'+items.map(o=>o.id+'x'+o.selectedQty).join('+'),category:category.key,items,name:items.map(o=>`${o.name} × ${o.qty} เสิร์ฟ`).join(' + '),qty:items.reduce((n,o)=>n+o.qty,0),score:items.reduce((n,o)=>n+Number(tallies[o.id]||0)*o.selectedQty,0)};
  };
  const plans=options.map(o=>make([[o,quotaFor(category.key)]]));
  if(quotaFor(category.key)===2) for(let i=0;i<options.length;i++) for(let j=i+1;j<options.length;j++) plans.push(make([[options[i],1],[options[j],1]]));
  return plans.sort((a,b)=>b.score-a.score||lineCost(a)-lineCost(b)||a.id.localeCompare(b.id));
}
export function popularityWinner(categories,tallies={}){return categories.map(c=>categoryPlans(c,tallies)[0]).filter(Boolean);}
export function optimizeMenuSet(categories,tallies={},budget=2000){
  let states=new Map([[0,{score:0,picks:[]}]]);
  const signature = p => p.map(x=>x.id).join('|');
  for(const category of categories){
    const next=new Map(), plans=categoryPlans(category,tallies);
    for(const [foodCost,state] of states) for(const plan of plans){
      const candidateFood=foodCost+lineCost(plan);if(candidateFood+FIXED_ALLOWANCE>budget)continue;
      const candidate={score:state.score+plan.score,picks:[...state.picks,plan]},old=next.get(candidateFood);
      if(!old||candidate.score>old.score||(candidate.score===old.score&&signature(candidate.picks)<signature(old.picks)))next.set(candidateFood,candidate);
    }
    states=next;
  }
  let best=null;
  for(const [foodCost,state] of states){const candidate={...state,foodCost,total:foodCost+FIXED_ALLOWANCE};if(!best||candidate.score>best.score||(candidate.score===best.score&&(candidate.total<best.total||(candidate.total===best.total&&signature(candidate.picks)<signature(best.picks)))))best=candidate;}
  return best;
}
export function comparePlans(popular,optimized){if(!popular||!optimized)return[];return popular.map((p,i)=>{const o=optimized.picks[i];if(!o||p.id===o.id)return null;return {category:p.category,from:p,to:o,costSaved:lineCost(p)-lineCost(o),votesLost:p.score-o.score};}).filter(Boolean);}
