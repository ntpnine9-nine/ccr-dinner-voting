import {CONFIG} from './config.js';
import {api,getCatalog,escapeHTML as esc,download} from './common.js?v=20261022-servings1';
import {buildReport,zipStore} from './reporting.js?v=20261023-v2';
const $=id=>document.getElementById(id), KEY='ccr_admin_session_v3';
let report=null, busy=false;
async function refreshAuth(s){
 const response=await fetch(CONFIG.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:CONFIG.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token})});
 const fresh=await response.json();if(!response.ok||!fresh.access_token)throw Error('เซสชันหมดอายุ กรุณากลับไปเข้าสู่ระบบที่แดชบอร์ด');
 fresh.expires_at=Math.floor(Date.now()/1000)+Number(fresh.expires_in||3600);sessionStorage.setItem(KEY,JSON.stringify(fresh));return fresh;
}
async function load(){
 if(busy)return;busy=true;report=null;$('export').disabled=true;$('reload').disabled=true;$('summaryContent').hidden=true;$('summaryStatus').textContent='กำลังโหลดผลจากฐานข้อมูลกลาง…';
 try {
 let session;try{session=JSON.parse(sessionStorage.getItem(KEY)||'null');}catch{}
 if(!session?.access_token)throw Error('กรุณาเข้าสู่ระบบแอดมินที่หน้าแดชบอร์ดก่อน แล้วกลับมาเปิดหน้าสรุปนี้ในแท็บเดิม');
 if(session.expires_at&&Date.now()/1000>session.expires_at-60)session=await refreshAuth(session);
 // Every data request still passes the server's JWT and admin membership checks.
 const read=()=>Promise.all([getCatalog(),api('admin.results',{},session.access_token),api('admin.preferences.results',{},session.access_token),api('admin.submissions.list',{},session.access_token)]);
 let data;try{data=await read();}catch(error){if(!session.refresh_token)throw error;session=await refreshAuth(session);data=await read();}
 const [catalog,results,prefs,sub]=data;if(catalog.catalogVersion!==results.catalogVersion)throw Error('แค็ตตาล็อกและผลคะแนนเป็นคนละเวอร์ชัน กรุณาลองใหม่');if(catalog.offlineFallback)throw Error('ตรวจแค็ตตาล็อกกลางไม่สำเร็จ กรุณาลองใหม่');
 report=buildReport(catalog.categories,results,prefs,sub.items||[]);
 render(report);$('summaryContent').hidden=false;$('export').disabled=!report.complete;
 $('summaryStatus').textContent=`${results.status==='open'?'เปิดรับคำตอบ':'ปิดรับคำตอบ'} · อ่านข้อมูลเมื่อ ${new Date(report.readAt).toLocaleString('th-TH')} · ${report.complete?'โหลดทุกส่วนแล้ว':'ข้อมูลรายคนอาจไม่ครบหรือเปลี่ยนระหว่างอ่าน กรุณารีเฟรชก่อนดาวน์โหลด'} · ผลอาจเปลี่ยนได้ระหว่างที่ยังเปิดรับคำตอบ`;
 }catch(e){$('summaryStatus').textContent=e.message||'โหลดไม่สำเร็จ กรุณาลองใหม่';}
 finally{busy=false;$('reload').disabled=false;}
}
function render(r){
 const kpis=[['ผู้มีคำตอบอย่างน้อยหนึ่งส่วน',r.complete?r.observed:'อย่างน้อย '+r.observed],['ส่งโหวตอาหารแล้ว',r.foodCount],['ตอบ RSVP / ของขวัญ / ธีม',r.preferenceCount],['ผู้เข้าชมหน้าเว็บ','ยังไม่มีการวัด']];
 $('summaryContent').innerHTML=`<section class="summary-kpis" aria-label="จำนวนการมีส่วนร่วม">${kpis.map(([label,value])=>`<article><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`).join('')}</section><p class="muted small">จำนวนผู้ตอบนับตามรหัสในระบบ ไม่ใช่การยืนยันจำนวนบุคคลจริง · เป้าหมาย ${esc(r.eligible)} คน · คะแนนอาหารเป็นหน่วยการเลือก</p><section aria-labelledby="foodHeading"><div class="summary-section-head"><h2 id="foodHeading">เมนูที่ทีมเลือก</h2><p>สองรายการแรก · เพิ่มรายการที่สามเมื่อคะแนนเสมออันดับสอง</p></div><div class="summary-food-grid">${r.food.map(c=>`<article class="summary-category"><header><span>${esc(c.key)}</span><h3>${esc(c.label)}</h3></header>${c.shortlist.items.length?'<ol>'+c.shortlist.items.map(e=>`<li><span><small>อันดับ ${e.rank}</small>${esc(e.name)}</span><strong>${e.support}<small>หน่วยโหวต</small></strong></li>`).join('')+'</ol>':'<p class="muted">ยังไม่มีคะแนนในหมวดนี้</p>'}${c.shortlist.overflow?`<p class="tie-note">มีอีก ${c.shortlist.overflow} เมนูคะแนนเสมอกัน · ดูผลครบในแดชบอร์ดหรือ CSV</p>`:''}</article>`).join('')}</div></section><section class="summary-polls" aria-label="ผลโหวตอื่นทั้งหมด">${r.polls.map(p=>`<article class="summary-category"><h2>${esc(p.title)}</h2>${p.entries.map(e=>`<div class="poll-result"><div><span>${esc(e.label)}</span><strong>${e.count}</strong></div><meter min="0" max="${Math.max(1,r.preferenceCount)}" value="${e.count}" aria-label="${esc(e.label)} ${e.count} จาก ${r.preferenceCount} คำตอบ"></meter></div>`).join('')}</article>`).join('')}</section><p class="summary-footnote">สรุปคะแนนเพื่อช่วยตัดสินใจ ไม่ใช่ใบสั่งอาหาร · งบเป้าหมาย ฿2,000 / ฿2,200 และเงินสำรอง ฿320 ยังคงเดิม · <a href="./admin.html#decisions">ไปคำนวณชุดเมนูและงบโต๊ะ ↗</a></p>`;
}
$('reload').addEventListener('click',load);
$('export').addEventListener('click',()=>{if(report?.complete)download('ccr-all-results.zip',zipStore(report.files),'application/zip');});
load();
