import fs from 'node:fs';
import assert from 'node:assert/strict';
import {FIXED_ALLOWANCE,lineCost,popularityWinner,optimizeMenuSet,comparePlans} from '../decision-engine.js';
const d=JSON.parse(fs.readFileSync(new URL('../menus.json',import.meta.url),'utf8'));
assert.equal(d.categories.length,8,'8 categories');
assert.deepEqual(d.categories.map(c=>c.key),['A','B','C','D','E','F','G','H']);
assert.ok(d.categories.every(c=>c.options.length===7),'7 options/category');
const options=d.categories.flatMap(c=>c.options);assert.equal(options.length,56);assert.equal(new Set(options.map(o=>o.id)).size,56);
for(const c of d.categories)for(const o of c.options){assert.match(o.id,new RegExp(`^${c.key}[1-7]$`));assert.ok(o.price>0&&o.qty>0)}
const maxFood=d.categories.reduce((a,c)=>a+Math.max(...c.options.map(lineCost)),0);assert.equal(maxFood,1836);assert.equal(maxFood+FIXED_ALLOWANCE,2156);
const counts=Object.fromEntries(options.map(o=>[o.id,0]));for(const c of d.categories){const hi=[...c.options].sort((a,b)=>lineCost(b)-lineCost(a)||a.id.localeCompare(b.id))[0];counts[hi.id]=12}
const pop=popularityWinner(d.categories,counts);assert.equal(pop.length,8);
const p2=optimizeMenuSet(d.categories,counts,2000),p22=optimizeMenuSet(d.categories,counts,2200);assert.ok(p2&&p2.picks.length===8&&p2.total<=2000);assert.ok(p22&&p22.picks.length===8&&p22.total<=2200);assert.equal(p22.score,96);assert.equal(p22.total,2156);
const tie=Object.fromEntries(options.map(o=>[o.id,1]));const t1=optimizeMenuSet(d.categories,tie,2000),t2=optimizeMenuSet(d.categories,tie,2000);assert.deepEqual(t1,t2,'deterministic tie');
assert.ok(Array.isArray(comparePlans(pop,p2,counts)));
const edge=fs.readFileSync(new URL('../supabase/functions/vote/index.ts',import.meta.url),'utf8');
for(const required of ["op==='catalog'","admin.invites.revoke","CATALOG_VERSION_MISMATCH","admin.freeze","TOO_MANY_REQUESTS"])assert.ok(edge.includes(required),required);
for(const forbidden of ['SERVICE_ROLE_KEY =','sb_secret_','postgresql://']) assert.ok(!edge.includes(forbidden),'no privileged secret literal');
console.log('PASS · Release 1 static/data/decision-engine checks');
