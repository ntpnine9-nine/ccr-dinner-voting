import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import {CONFIG} from './config.js';
import {configured,getCatalog,api,money,escapeHTML,csv,download} from './common.js';
import {FIXED_ALLOWANCE,lineCost,popularityWinner,optimizeMenuSet,comparePlans} from './decision-engine.js';
const $=id=>document.getElementById(id);const db=configured?createClient(CONFIG.supabaseUrl,CONFIG.publishableKey):null;
let cats=[],session=null,tallies={},numBallots=0,lastResults=null,latestCodes=[],currentPlan=null,catalogVersion=null;
function notice(message,bad=false){$('notice').className='notice '+(bad?'error':'good');$('notice').textContent=message}
async function call(op,data={}){if(!session?.access_token)throw Error('กรุณาลงชื่อเข้าใช้ผู้ดูแล');return api(op,data,session.access_token)}
async function init(){
  if(!configured){notice('ยังไม่ตั้งค่า Supabase URL และ Publishable Key',true);return}
  try{
    const catalog=await getCatalog();cats=catalog.categories;catalogVersion=catalog.catalogVersion;
    const {data:{session:s},error}=await db.auth.getSession();if(error)throw error;session=s;await onSession();
    db.auth.onAuthStateChange((_event,s)=>{session=s;setTimeout(onSession,0)});
  }catch(e){notice('ระบบ Admin ไม่พร้อม: '+e.message,true)}
}
async function onSession(){
  const logged=!!session;$('authPanel').classList.toggle('hidden',logged);$('dashboard').classList.toggle('hidden',!logged);$('logout').hidden=!logged;$('refresh').disabled=!logged;
  if(logged){await refresh()}else{notice('กรุณาลงชื่อเข้าใช้ด้วยบัญชีผู้ดูแลที่ได้รับอนุญาต')}
}
$('login').addEventListener('click',async()=>{
  const email=$('email').value.trim(),password=$('password').value;
  if(!/^\S+@\S+\.\S+$/.test(email))return notice('กรุณากรอกอีเมลให้ถูกต้อง',true);
  if(password.length<8)return notice('กรุณากรอกรหัสผ่านผู้ดูแล',true);
  $('login').disabled=true;
  try{const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;notice('ยืนยันตัวตนสำเร็จ กำลังตรวจสิทธิ์ผู้ดูแล…')}
  catch(e){notice('เข้าสู่ระบบไม่ได้: '+e.message,true)}finally{$('login').disabled=false;$('password').value=''}
});
$('password').addEventListener('keydown',e=>{if(e.key==='Enter')$('login').click()});
$('logout').addEventListener('click',async()=>{if(db)await db.auth.signOut();session=null;onSession()});
async function refresh(){
  try{
    const [r,inv]=await Promise.all([call('admin.results'),call('admin.invites.list')]);lastResults=r;numBallots=r.count;tallies=r.tallies||{};renderResults(r);renderInvites(inv.items||[]);
    $('state').textContent=r.status==='open'?'● เปิดรับคะแนน':'● ปิดรับคะแนน';$('state').style.background=r.status==='open'?'#eaf6ea':'#fff3e1';$('lastRefresh').textContent='อัปเดตเมื่อ '+new Date().toLocaleTimeString('th-TH');
    $('freeze').disabled=r.status==='open'||!!r.resultsFrozenAt;
    notice(r.resultsFrozenAt?'ผลถูก Freeze แล้ว · '+new Date(r.resultsFrozenAt).toLocaleString('th-TH'):'เชื่อมฐานข้อมูลกลางและโหลดผลคะแนนจริงแล้ว');
  }catch(e){notice('ไม่สามารถเข้าถึงข้อมูลผู้ดูแล: '+e.message,true);$('dashboard').classList.add('hidden');$('authPanel').classList.remove('hidden')}
}
$('refresh').addEventListener('click',refresh);
$('open').addEventListener('click',async()=>{const ans=prompt('การเปิดรับโหวตจริงต้องได้รับอนุมัติจากเจ้าของโครงการ\n\nพิมพ์ เปิดโหวตจริง เพื่อยืนยัน');if(ans!=='เปิดโหวตจริง')return;try{await call('admin.status',{status:'open'});await refresh()}catch(e){notice(e.message,true)}});
$('close').addEventListener('click',async()=>{if(!confirm('ยืนยันปิดรับคะแนนจริงหรือไม่? หลังปิดแล้วผู้เข้าร่วมจะส่งและแก้ไขคะแนนไม่ได้'))return;try{await call('admin.status',{status:'closed'});await refresh()}catch(e){notice(e.message,true)}});
$('freeze').addEventListener('click',async()=>{if(!confirm('Freeze ผลหลังปิดโหวต? หลัง Freeze จะล็อกการแก้ไข Catalog จนกว่าจะมีการแก้ผ่านผู้ดูแลฐานข้อมูลโดยตรง'))return;try{await call('admin.freeze');await refresh()}catch(e){notice(e.message,true)}});
$('generate').addEventListener('click',async()=>{const count=Number($('inviteCount').value);if(!Number.isInteger(count)||count<1||count>200)return notice('จำนวนรหัสต้องเป็น 1–200 รหัส',true);if(!confirm(`สร้างรหัสเชิญส่วนตัว ${count} รหัส? ต้องดาวน์โหลดทันที เพราะระบบเก็บเฉพาะ Hash`))return;$('generate').disabled=true;try{const r=await call('admin.invites',{count});latestCodes=r.items||[];$('codes').textContent=latestCodes.map(x=>`${x.id},${x.code}`).join('\n');$('downloadCodes').disabled=false;notice('สร้างรหัสแล้ว กรุณาดาวน์โหลดและเก็บไฟล์เป็นความลับ');await refresh()}catch(e){notice('สร้างรหัสไม่สำเร็จ: '+e.message,true)}finally{$('generate').disabled=false}});
$('downloadCodes').addEventListener('click',()=>{if(latestCodes.length)download('ccr-invite-codes-private.csv',csv([['invite_id','invite_code'],...latestCodes.map(x=>[x.id,x.code])]),'text/csv;charset=utf-8')});
function renderInvites(items){
  $('inviteList').innerHTML=items.length?items.map(x=>`<tr><td><code>${escapeHTML(String(x.id).slice(0,8))}</code></td><td>${x.active?'Active':'Revoked'}</td><td>${x.hasBallot?'✓ โหวตแล้ว':'—'}</td><td>${new Date(x.createdAt).toLocaleString('th-TH')}</td><td><button class="mini-btn" data-revoke="${x.id}" ${!x.active?'disabled':''}>ยกเลิก</button></td></tr>`).join(''):'<tr><td colspan="5" class="muted">ยังไม่มีรหัสเชิญ</td></tr>';
  document.querySelectorAll('[data-revoke]').forEach(btn=>btn.addEventListener('click',async()=>{if(!confirm('ยืนยันยกเลิกรหัสนี้?'))return;try{await call('admin.invites.revoke',{inviteId:btn.dataset.revoke});await refresh()}catch(e){notice(e.message,true)}}));
}
function renderResults(r){
  $('stats').innerHTML=[['ผู้ส่งคะแนนแล้ว',r.count,'จำนวนใบโหวตที่บันทึก'],['รหัสเชิญทั้งหมด',r.invites,'รหัสที่ออกทั้งหมด'],['รหัสที่ยังใช้งาน',r.activeInvites,'ยังไม่ถูกยกเลิก'],['อัตราการมีส่วนร่วม',r.invites?Math.round(r.count/r.invites*100)+'%':'—','คิดจากรหัสที่ออก']].map(a=>`<div class="metric-card"><span class="metric-label">${a[0]}</span><strong class="metric-number">${a[1]}</strong><span class="metric-desc">${a[2]}</span></div>`).join('');
  $('rankings').innerHTML=cats.map(cat=>{const rows=[...cat.options].map(o=>({...o,v:tallies[o.id]||0})).sort((a,b)=>b.v-a.v||lineCost(a)-lineCost(b)||a.id.localeCompare(b.id));return `<article class="ranking-panel"><h3>${escapeHTML(cat.icon||'')} หมวด ${cat.key} · ${escapeHTML(cat.label)}</h3>${rows.map((o,i)=>`<div class="rank"><div class="rank-head"><span class="rank-title">${i===0&&numBallots?'★ ':''}${escapeHTML(o.name)} <span class="muted">${money(lineCost(o))}</span></span><span class="rank-val">${o.v}</span></div><div class="meter"><div style="width:${numBallots?Math.round(o.v/numBallots*100):0}%"></div></div></div>`).join('')}</article>`}).join('');
  if(!numBallots){$('engineStatus').textContent='ยังไม่มีคะแนนจริง ระบบจะไม่ประกาศผู้ชนะจากคะแนนศูนย์';currentPlan=null;$('draft').innerHTML='<tr><td colspan="4" class="muted">รอการโหวตจริง</td></tr>';$('costInfo').innerHTML='';$('tradeoffs').innerHTML=''}
  else if(!currentPlan){showPopular()}
}
function planFromPicks(picks,reason){const food=picks.reduce((s,o)=>s+lineCost(o),0);return{picks,food,total:food+FIXED_ALLOWANCE,score:picks.reduce((s,o)=>s+(tallies[o.id]||0),0),reason}}
function showPopular(){if(!numBallots)return notice('ยังไม่มีคะแนนจากพนักงาน จึงไม่สามารถสรุปผู้ชนะได้',true);currentPlan=planFromPicks(popularityWinner(cats,tallies),'Popularity Winner — เมนูคะแนนสูงสุดแต่ละหมวด');renderPlan(currentPlan)}
$('popular').addEventListener('click',showPopular);
function showOptimized(budget){if(!numBallots)return notice('รอผลโหวตจริงก่อนคำนวณชุดชนะ',true);const best=optimizeMenuSet(cats,tallies,budget);if(!best)return notice('ไม่พบชุดเมนูที่ผ่านเพดานนี้ กรุณาตรวจจำนวนเสิร์ฟและงบประมาณ',true);currentPlan={...best,reason:budget===2000?'Standard Budget Optimized':'Premium Budget Optimized — ต้องได้รับอนุมัติ'};renderPlan(currentPlan)}
$('budget2k').addEventListener('click',()=>showOptimized(2000));$('budget22').addEventListener('click',()=>showOptimized(2200));
function renderPlan(plan){
  $('draft').innerHTML=plan.picks.map((o,i)=>`<tr><td>${cats[i].key}</td><td>${escapeHTML(o.name)}</td><td class="right">${o.qty}</td><td class="right">${money(lineCost(o))}</td></tr>`).join('');
  $('engineStatus').textContent=`${plan.reason} · คะแนนสนับสนุน ${plan.score}/${numBallots*8} คะแนน`;
  const cls=plan.total>2200?'bad':plan.total>2000?'warn':'';$('costInfo').innerHTML=`<div class="summary-alert ${cls}"><strong>ค่าอาหาร ${money(plan.food)} + ข้าวสวยสำรอง ฿200 + สำรองอื่น ฿120 = ${money(plan.total)}</strong><p class="small" style="margin:6px 0 0">${plan.total>2200?'เกินเพดาน ฿2,200 · ต้องปรับแผน':plan.total>2000?'เกินงบหลัก ฿2,000 · ต้องได้รับอนุมัติ':'อยู่ภายในงบหลักตามราคาอ้างอิง'} · ยังต้องยืนยันปริมาณและราคาปัจจุบันกับร้าน</p></div>`;
  const pop=popularityWinner(cats,tallies),changes=comparePlans(pop,{picks:plan.picks},tallies);$('tradeoffs').innerHTML=changes.length?'<h4>Trade-offs เทียบ Popularity Winner</h4>'+changes.map(x=>`<p class="small"><strong>${x.category}</strong> ${escapeHTML(x.from.name)} → ${escapeHTML(x.to.name)} · ประหยัด ${money(x.costSaved)} · เสียคะแนน ${x.votesLost}</p>`).join(''):'<p class="muted small">ชุดนี้ตรงกับ Popularity Winner ทุกหมวด</p>';
}
$('exportCSV').addEventListener('click',()=>{if(!currentPlan)return notice('ยังไม่มีชุดอาหารที่จะส่งออก',true);download('ccr-dinner-order-DRAFT.csv',csv([['category','menu','unit_price_thb','quantity','line_total_thb'],...currentPlan.picks.map((o,i)=>[cats[i].key,o.name,o.price,o.qty,lineCost(o)]),['','FOOD TOTAL','','',currentPlan.food],['','RICE RESERVE','','',200],['','OTHER RESERVE','','',120],['','ESTIMATED TOTAL','','',currentPlan.total],['','STATUS','','','DRAFT NOT AUTHORIZED FOR ORDERING']]),'text/csv;charset=utf-8')});
$('exportJSON').addEventListener('click',()=>{if(!lastResults)return notice('ยังไม่มีข้อมูลคะแนนที่จะส่งออก',true);download('ccr-vote-aggregate.json',JSON.stringify({exported_at:new Date().toISOString(),campaign:CONFIG.campaignId,catalog_version:catalogVersion,results:lastResults},null,2),'application/json')});
init();
