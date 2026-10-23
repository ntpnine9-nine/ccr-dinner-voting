import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildReport,zipStore} from '../reporting.js';
const categories=JSON.parse(fs.readFileSync(new URL('../menus.json',import.meta.url))).categories;
const source=fs.readFileSync(new URL('../admin-summary.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/\nload\(\);\s*$/,'\nglobalThis.done=load();');
async function run(session,read){
 const elements=Object.fromEntries(['summaryStatus','summaryContent','export','reload'].map(id=>[id,{textContent:'',innerHTML:'',hidden:false,disabled:false,addEventListener(){}}]));
 let calls=0;
 const context=vm.createContext({document:{getElementById:id=>elements[id]},sessionStorage:{getItem:()=>JSON.stringify(session),setItem(){}},api:async(...args)=>{calls++;return read(...args);},getCatalog:async()=>({catalogVersion:2,categories}),CONFIG:{},buildReport,zipStore,download(){throw Error('Export should require a user click');},esc:s=>String(s).replaceAll('<','&lt;'),Date,JSON,Promise,console});
 vm.runInContext(source,context);await context.done;return {elements,calls};
}
const noSession=await run(null,()=>{throw Error('Should not request admin data');});
assert.equal(noSession.calls,0);assert.equal(noSession.elements.export.disabled,true);assert.equal(noSession.elements.summaryContent.hidden,true);
const forbidden=await run({access_token:'test-only'},()=>{throw Error('ADMIN_UNAUTHORIZED');});
assert.equal(forbidden.elements.summaryContent.hidden,true);assert.equal(forbidden.elements.export.disabled,true);assert.match(forbidden.elements.summaryStatus.textContent,/ADMIN_UNAUTHORIZED/);
const empty=await run({access_token:'test-only'},op=>op==='admin.results'?{catalogVersion:2,count:0,tallies:{},eligibleVoters:50,status:'open'}:op==='admin.preferences.results'?{count:0,attendance:{yes:0,maybe:0,no:0},gift:{gift_300:0},theme:{midnight_gold:0}}:{items:[]});
assert.equal(empty.elements.summaryContent.hidden,false);assert.equal(empty.elements.export.disabled,false);assert.equal((empty.elements.summaryContent.innerHTML.match(/ยังไม่มีคะแนนในหมวดนี้/g)||[]).length,8);assert.match(empty.elements.summaryContent.innerHTML,/ยังไม่มีการวัด/);
const partial=await run({access_token:'test-only'},op=>{if(op==='admin.preferences.results')throw Error('READ_FAILURE');return {count:0,items:[]};});
assert.equal(partial.elements.export.disabled,true);assert.equal(partial.elements.summaryContent.hidden,true);
console.log('PASS · summary requires session · server denial respected · empty real results · partial failure hides data and blocks export');
