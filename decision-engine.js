export const RICE_ALLOWANCE = 200;
export const CONTINGENCY_ALLOWANCE = 120;
export const FIXED_ALLOWANCE = RICE_ALLOWANCE + CONTINGENCY_ALLOWANCE;
export function lineCost(option){ return Number(option.price) * Number(option.qty); }
export function totalCost(options){ return options.reduce((sum,o)=>sum+lineCost(o),0) + FIXED_ALLOWANCE; }
export function rankCategory(category,tallies={}){return [...category.options].sort((a,b)=>(Number(tallies[b.id]||0)-Number(tallies[a.id]||0))||(lineCost(a)-lineCost(b))||String(a.id).localeCompare(String(b.id)));}
export function popularityWinner(categories,tallies={}){return categories.map(c=>rankCategory(c,tallies)[0]);}
export function optimizeMenuSet(categories,tallies={},budget=2000){
  let states=new Map([[0,{score:0,picks:[]}]]);
  for(const category of categories){const next=new Map();for(const [foodCost,state] of states){for(const option of category.options){const candidateFood=foodCost+lineCost(option);if(candidateFood+FIXED_ALLOWANCE>budget)continue;const candidate={score:state.score+Number(tallies[option.id]||0),picks:[...state.picks,option]};const old=next.get(candidateFood);if(!old||candidate.score>old.score||(candidate.score===old.score&&candidate.picks.map(x=>x.id).join('|')<old.picks.map(x=>x.id).join('|')))next.set(candidateFood,candidate);}}states=next;}
  let best=null;for(const [foodCost,state] of states){const candidate={...state,foodCost,total:foodCost+FIXED_ALLOWANCE};if(!best||candidate.score>best.score||(candidate.score===best.score&&candidate.total<best.total)||(candidate.score===best.score&&candidate.total===best.total&&candidate.picks.map(x=>x.id).join('|')<best.picks.map(x=>x.id).join('|')))best=candidate;}return best;
}
export function comparePlans(popular,optimized,tallies={}){if(!popular||!optimized)return[];return popular.map((p,i)=>{const o=optimized.picks[i];if(!o||p.id===o.id)return null;return{category:p.id[0],from:p,to:o,costSaved:lineCost(p)-lineCost(o),votesLost:Number(tallies[p.id]||0)-Number(tallies[o.id]||0)};}).filter(Boolean);}
