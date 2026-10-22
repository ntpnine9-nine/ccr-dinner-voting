import fs from 'node:fs';
import assert from 'node:assert/strict';
import {FIXED_ALLOWANCE,lineCost,popularityWinner,optimizeMenuSet,comparePlans} from '../decision-engine.js';
import {escapeHTML,formatInviteCode,csv,extractInviteCodeFromUrl} from '../common.js';
const d=JSON.parse(fs.readFileSync(new URL('../menus.json',import.meta.url),'utf8'));
assert.equal(d.categories.length,8,'8 categories');
assert.deepEqual(d.categories.map(c=>c.key),['A','B','C','D','E','F','G','H']);
assert.ok(d.categories.every(c=>c.options.length===7),'7 options/category');
const options=d.categories.flatMap(c=>c.options);assert.equal(options.length,56);assert.equal(new Set(options.map(o=>o.id)).size,56);
for(const c of d.categories)for(const o of c.options){assert.match(o.id,new RegExp(`^${c.key}[1-7]$`));assert.ok(o.price>0&&o.qty>0)}
const maxFood=d.categories.reduce((a,c)=>a+Math.max(...c.options.map(lineCost)),0);assert.equal(maxFood,2258);assert.equal(maxFood+FIXED_ALLOWANCE,2578);
const counts=Object.fromEntries(options.map(o=>[o.id,0]));for(const c of d.categories){const hi=[...c.options].sort((a,b)=>lineCost(b)-lineCost(a)||a.id.localeCompare(b.id))[0];counts[hi.id]=12}
const pop=popularityWinner(d.categories,counts);assert.equal(pop.length,8);
const p2=optimizeMenuSet(d.categories,counts,2000),p22=optimizeMenuSet(d.categories,counts,2200);assert.ok(p2&&p2.picks.length===8&&p2.total<=2000);assert.ok(p22&&p22.picks.length===8&&p22.total<=2200);assert.ok(p22.score>=p2.score,'more budget cannot reduce maximum support');assert.ok(p22.total<=2200);
assert.equal(optimizeMenuSet(d.categories,counts,500),null,'infeasible budget returns null');
const tie=Object.fromEntries(options.map(o=>[o.id,1]));const t1=optimizeMenuSet(d.categories,tie,2000),t2=optimizeMenuSet(d.categories,tie,2000);assert.deepEqual(t1,t2,'deterministic tie');
const diffs=comparePlans(pop,p2,counts);assert.ok(Array.isArray(diffs)&&diffs.length>0);
assert.ok(diffs.reduce((n,x)=>n+x.costSaved,0)>0);assert.ok(diffs.every(x=>x.votesLost>=0));
assert.equal(formatInviteCode('ccr26abcdefghjklmnpqrstuv'),'CCR26-ABCDE-FGHJK-LMNPQ-RSTUV','auto-formats 25-char unhyphenated invite code');
assert.equal(formatInviteCode('CCR26-ABCDE-FGHJK-LMNPQ-RSTUV'),'CCR26-ABCDE-FGHJK-LMNPQ-RSTUV','preserves hyphenated invite code');
assert.equal(escapeHTML('<script>"\'&'), '&lt;script&gt;&quot;&#39;&amp;');
assert.ok(csv([['a','b"c']]).startsWith('\ufeff"a","b""c"'));
const edge=fs.readFileSync(new URL('../supabase/functions/vote/index.ts',import.meta.url),'utf8');
for(const required of ["op==='catalog'","preferences.submit","admin.preferences.results","admin.invites.revoke","CATALOG_VERSION_MISMATCH","admin.freeze","TOO_MANY_REQUESTS","hasPreferences","activeSet"])assert.ok(edge.includes(required),required);
for(const forbidden of ['SERVICE_ROLE_KEY =','sb_secret_','postgresql://']) assert.ok(!edge.includes(forbidden),'no privileged secret literal');
const ccrApp=fs.readFileSync(new URL('../supabase/functions/ccr-app/index.ts',import.meta.url),'utf8');
assert.ok(ccrApp.includes("'menus.json'")&&ccrApp.includes("'assets/venue-night-hero.jpg'"),'ccr-app allows menus.json and authentic venue assets');
const pubStatic=fs.readFileSync(new URL('../supabase/functions/publish-static/index.ts',import.meta.url),'utf8');
assert.ok(pubStatic.includes('ADMIN_UNAUTHORIZED')&&pubStatic.includes('image/jpeg')&&pubStatic.includes('assets/venue-night-hero.jpg'),'publish-static hardened and includes real venue assets');
for(const file of ['index.html','vote.html','party.html','venue.html','guide.html','admin.html','styles.css','event.css','event.js','party.js','vote.js','admin.js','docs/ASSET_INVENTORY_TH.md','supabase/migrations/20261018140000_audit_hardening.sql']) assert.ok(fs.existsSync(new URL('../'+file,import.meta.url)),file+' exists');
const party=fs.readFileSync(new URL('../party.html',import.meta.url),'utf8');
for(const value of ['gift_300','gift_500','gift_300_500','gift_none','midnight_gold','forest_champagne','retro_future','come_as_you_are','GIFT EXCHANGE']) assert.ok(party.includes(value),value);
const landing=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(landing.includes('18'));assert.ok(landing.includes('CCR After Hours'));
const venue=fs.readFileSync(new URL('../venue.html',import.meta.url),'utf8');assert.ok(venue.includes('13.6776392')&&venue.includes('Google Maps'));assert.ok(!venue.includes('13.6692272'),'must not expose owner route origin');assert.ok(!venue.includes('4.8 / 5')&&!venue.includes('19 reviews'),'must not display unverified rating claims');
const guide=fs.readFileSync(new URL('../guide.html',import.meta.url),'utf8');assert.ok(guide.includes('THE COMPLETE NIGHT GUIDE')&&guide.includes('myEventPass')&&!guide.includes('PowerPoint')&&!guide.includes('แต่จะใหม่ให้ดูเร็ว'));
const voteHtml=fs.readFileSync(new URL('../vote.html',import.meta.url),'utf8');assert.ok(voteHtml.includes('FOOD VOTE')&&voteHtml.includes('role="group"'));
const adminHtml=fs.readFileSync(new URL('../admin.html',import.meta.url),'utf8');assert.ok(adminHtml.includes('แดชบอร์ดผู้จัดงาน')&&adminHtml.includes('previewDashboard'));
for(const page of ['index.html','venue.html','party.html','vote.html','guide.html']){
  const html=fs.readFileSync(new URL('../'+page,import.meta.url),'utf8');
  assert.ok(html.includes('class="journey-bar"'),`${page} has unified 4-step journey-bar`);
}
const domContracts={
  'index.html':['days','hours','minutes','shareEvent','addCalendar','shareStatus','myEventPass','main'],
  'party.html':['partyStatus','prefToken','prefSummary','savePreferences','prefMessage','main'],
  'vote.html':['globalStatus','submitStatus','chosenCount','categoryNumber','categoryTitle','categoryDescription','categoryTabs','voteForm','prev','next','summary','foodTotal','grandTotal','budgetTag','reviewStatus','submit','token','main'],
  'venue.html':['main'],
  'guide.html':['main','guideCampaignState','myEventPass','guideSavedMenu'],
  'admin.html':['adminMain','refresh','logout','notice','previewBanner','authPanel','email','password','login','previewDashboard','dashboard','overview','state','stats','manage','open','close','freeze','inviteCount','generate','downloadCodes','copyAllCodes','codes','inviteList','votes','lastRefresh','rankings','preferences','prefCount','prefStats','attendanceResults','giftResults','themeResults','decisions','popular','budget2k','budget22','engineStatus','draft','costInfo','tradeoffs','exportCSV','exportJSON']
};
for(const [page,ids] of Object.entries(domContracts)){
  const html=fs.readFileSync(new URL('../'+page,import.meta.url),'utf8');
  assert.ok(html.includes('name="referrer" content="no-referrer"'),page+' referrer');
  assert.ok(html.includes('name="robots" content="noindex,nofollow"'),page+' robots');
  assert.ok(html.includes('viewport-fit=cover'),page+' viewport-fit=cover');
  assert.ok(html.includes('class="skip-link"'),page+' skip-link');
  for(const id of ids)assert.ok(html.includes(`id="${id}"`),`${page} must contain #${id}`);
}
const allJpegs=[
  'assets/menu-cover.jpg','assets/menu-spread.jpg',
  'assets/venue-night-hero.jpg','assets/venue-dining-wide.jpg','assets/venue-counter-sign.jpg',
  'assets/venue-seating-zone.jpg','assets/venue-table-detail.jpg','assets/venue-sign-night.jpg',
  'assets/venue-soi11-day.jpg','assets/venue-landmark-ptt.jpg','assets/venue-soi11-lane.jpg',
  'assets/venue-parking-night.jpg','assets/food-tomyum-pot.jpg','assets/food-stirfry-duo.jpg',
  'assets/food-crispy-squid.jpg','assets/food-seafood-dip.jpg','assets/food-grilled-pork.jpg',
  'assets/food-seafood-salad.jpg','assets/food-fried-strips.jpg','assets/food-garlic-pork.jpg'
];
for(const imgFile of allJpegs){
  const buf=fs.readFileSync(new URL('../'+imgFile,import.meta.url));
  assert.equal(buf[0],0xff,`${imgFile} SOI 0xff`);assert.equal(buf[1],0xd8,`${imgFile} SOI 0xd8`);
  assert.equal(buf[buf.length-2],0xff,`${imgFile} EOI 0xff`);assert.equal(buf[buf.length-1],0xd9,`${imgFile} EOI 0xd9`);
  let idx=2;
  while(idx<buf.length){
    assert.equal(buf[idx],0xff,`${imgFile} valid marker prefix at ${idx}`);
    const marker=buf[idx+1];
    if(marker===0xda)break;
    const segLen=buf.readUInt16BE(idx+2);
    idx+=2+segLen;
  }
}

// URL Fragment / Hash parsing assertions
globalThis.window = { location: { hash: '#code=CCR26-ABCDE-FGHJK-LMNPQ-RSTUV' } };
assert.equal(extractInviteCodeFromUrl(), 'CCR26-ABCDE-FGHJK-LMNPQ-RSTUV');
globalThis.window.location.hash = '#token=ccr26abcdefghjklmnpqrstuv';
assert.equal(extractInviteCodeFromUrl(), 'CCR26-ABCDE-FGHJK-LMNPQ-RSTUV');
globalThis.window.location.hash = '#CCR26-ABCDE-FGHJK-LMNPQ-RSTUV';
assert.equal(extractInviteCodeFromUrl(), 'CCR26-ABCDE-FGHJK-LMNPQ-RSTUV');
delete globalThis.window;

// 4 UI States verification in vote.js and party.js
const voteJs=fs.readFileSync(new URL('../vote.js',import.meta.url),'utf8');
const partyJs=fs.readFileSync(new URL('../party.js',import.meta.url),'utf8');
const adminJs=fs.readFileSync(new URL('../admin.js',import.meta.url),'utf8');

// State A: Cloud Confirmed
assert.ok(voteJs.includes('✓ บันทึกลงระบบกลางแล้ว · รหัสใบโหวต:'), 'vote.js State A copy');
assert.ok(partyJs.includes('✓ บันทึกลงระบบกลางแล้ว · ยืนยันข้อมูลเรียบร้อย'), 'party.js State A copy');

// State B: Campaign Closed
assert.ok(voteJs.includes('ขณะนี้ยังไม่เปิดรับโหวต (ระบบกลางปิดรับคะแนน) — ชุดเมนูทั้ง 8 หมวดถูกเก็บเป็นฉบับร่างในเครื่องนี้เท่านั้น ยังไม่ได้ส่งเข้าระบบกลาง'), 'vote.js State B copy');
assert.ok(partyJs.includes('ขณะนี้ยังไม่เปิดรับคำตอบ (ระบบกลางปิดรับคะแนน) — ตัวเลือกทั้ง 3 ข้อถูกเก็บเป็นฉบับร่างในเครื่องนี้เท่านั้น ยังไม่ได้ส่งเข้าระบบกลาง'), 'party.js State B copy');

// In restricted rounds only a personal link authorizes submission; free-text labels never do.
for(const source of [voteJs,partyJs]) {
  assert.ok(source.includes("votingMode !== 'open' && !getSharedToken()"));
  assert.ok(source.includes('รอบนี้ใช้ลิงก์เชิญส่วนตัว'));
  assert.ok(source.includes('...submissionParticipant('));
  assert.ok(!source.includes('formatInviteCode'));
}

// State D: Server/Network Error with Retry
assert.ok(voteJs.includes('ส่งเข้าระบบกลางไม่สำเร็จ')&&voteJs.includes('retrySubmitBtn'), 'vote.js State D copy & retry');
assert.ok(partyJs.includes('ส่งเข้าระบบกลางไม่สำเร็จ')&&partyJs.includes('retryPartyBtn'), 'party.js State D copy & retry');

// Admin Preview Banner and Honest Error Mappings
assert.ok(adminJs.includes('โหมดตัวอย่าง — ข้อมูลไม่ถูกบันทึกขึ้นระบบกลาง เข้าสู่ระบบผู้ดูแลระบบด้านล่างเพื่อจัดการข้อมูลจริงบน Supabase'), 'admin.js preview banner copy');
assert.ok(adminJs.includes('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้สร้างบัญชีผู้ดูแลในระบบ'), 'admin.js invalid_credentials mapping');
assert.ok(adminJs.includes('บัญชีนี้ยังไม่ได้รับการยืนยันอีเมล (Confirm email) ใน Supabase Dashboard'), 'admin.js email_not_confirmed mapping');
assert.ok(adminJs.includes('เข้าสู่ระบบสำเร็จแต่บัญชีนี้ไม่มีสิทธิ์ผู้ดูแล (UUID ยังไม่ถูกเพิ่มในตาราง public.admin_users)'), 'admin.js ADMIN_UNAUTHORIZED mapping');

console.log('PASS · Release 1 + Authentic Visuals + 4-Step Journey + Local Ballot Save + Admin Preview checks');
