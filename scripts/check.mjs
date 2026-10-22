import fs from 'node:fs';
import assert from 'node:assert/strict';
const d=JSON.parse(fs.readFileSync(new URL('../menus.json',import.meta.url),'utf8'));
assert.equal(d.categories.length,8);
assert.deepEqual(d.categories.map(c=>c.key),['A','B','C','D','E','F','G','H']);
assert.ok(d.categories.every(c=>c.options.length===7));
const options=d.categories.flatMap(c=>c.options);
assert.equal(options.length,56);
assert.equal(new Set(options.map(o=>o.id)).size,56);
for(const c of d.categories){for(const o of c.options){assert.match(o.id,new RegExp(`^${c.key}[1-7]$`));assert.ok(o.price>0&&o.qty>0);}}
const maxFood=d.categories.reduce((a,c)=>a+Math.max(...c.options.map(o=>o.price*o.qty)),0);
assert.equal(maxFood,2258);
assert.equal(maxFood+320,2578);
console.log(`PASS · 8 categories · 56 options · max total 2578 THB`);
