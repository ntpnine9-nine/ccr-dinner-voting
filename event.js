import { renderJourneyProgress, getSavedJourneyState, escapeHTML, money, PARTY_STORAGE_KEY, VOTE_SAVED_KEY, VOTE_PICKS_KEY, TOKEN_STORAGE_KEY } from './common.js';
const target=new Date('2026-12-18T18:00:00+07:00');
const $=id=>document.getElementById(id);
function tick(){
  const diff=Math.max(0,target-Date.now());
  const days=Math.floor(diff/86400000);
  const hours=Math.floor(diff%86400000/3600000);
  const minutes=Math.floor(diff%3600000/60000);
  if($('days'))$('days').textContent=String(days).padStart(2,'0');
  if($('hours'))$('hours').textContent=String(hours).padStart(2,'0');
  if($('minutes'))$('minutes').textContent=String(minutes).padStart(2,'0');
}
tick();setInterval(tick,30000);

function renderGuideSavedDetails(){
  renderJourneyProgress();
  const box=$('guideSavedMenu');
  if(!box)return;
  const st=getSavedJourneyState();
  const items=st.voteSaved?.items;
  if(Array.isArray(items)&&items.length){
    box.innerHTML=`
      <div style="margin-top:16px;padding:16px 18px;border-radius:16px;background:#ffffff;border:1px solid rgba(15,43,38,.12)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
          <strong style="color:#0f2b26">รายการอาหารทั้ง ${items.length} หมวดที่คุณบันทึกไว้ (${escapeHTML(st.voteSaved.receipt||'LOCAL')})</strong>
          <span style="font-weight:700;color:#0d5c46">รวมต่อโต๊ะประมาณ ${money(st.voteSaved.grandTotal||0)}</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px">
          ${items.map(it=>`<div style="padding:8px 10px;border-radius:10px;background:#f8f5ef;font-size:.86rem"><b style="color:#0d5c46">หมวด ${escapeHTML(it.key)}:</b> ${escapeHTML(it.name)} <span style="color:#666">(${money(it.lineTotal)})</span></div>`).join('')}
        </div>
      </div>`;
  }else{
    box.innerHTML='';
  }
}
renderGuideSavedDetails();
window.addEventListener('storage',()=>renderGuideSavedDetails());

$('resetAllDataBtn')?.addEventListener('click', () => {
  if (confirm('คุณต้องการล้างข้อมูลที่บันทึกไว้ในเบราว์เซอร์นี้ทั้งหมด (RSVP, ของขวัญ, โทนสี, คะแนนโหวตเมนูอาหาร) ใช่หรือไม่?')) {
    try {
      localStorage.removeItem(PARTY_STORAGE_KEY);
      localStorage.removeItem(VOTE_SAVED_KEY);
      localStorage.removeItem(VOTE_PICKS_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem('ccr_party_choices_v1');
      sessionStorage.removeItem('ccr_vote_choices_v3');
    } catch {}
    renderGuideSavedDetails();
    alert('🗑️ ล้างข้อมูลที่บันทึกไว้ในเครื่องนี้เรียบร้อยแล้ว');
  }
});

const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduce&&'IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'));

function eventUrl(){return new URL('./',location.href).href}
function setShareStatus(message){const el=$('shareStatus');if(el)el.textContent=message}
$('shareEvent')?.addEventListener('click',async()=>{
  const data={title:'CCR After Hours 2026',text:'ศุกร์ 18 ธันวาคม 2026 · ครัวซอย 11 · CCR Year-End Celebration',url:eventUrl()};
  try{
    if(navigator.share){await navigator.share(data);setShareStatus('เปิดหน้าต่างแชร์แล้ว');return}
    await navigator.clipboard.writeText(data.url);setShareStatus('คัดลอกลิงก์คำเชิญแล้ว ✓');
  }catch(e){if(e?.name!=='AbortError')setShareStatus('แชร์อัตโนมัติไม่ได้ — สามารถคัดลอก URL จากเบราว์เซอร์ได้')}
});
$('addCalendar')?.addEventListener('click',()=>{
  const esc=s=>String(s).replaceAll('\\','\\\\').replaceAll(';','\\;').replaceAll(',','\\,').replaceAll('\n','\\n');
  const ics=[
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CCR After Hours//TH',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
    'UID:ccr-after-hours-2026@ccr-dinner-voting',
    'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
    'DTSTART;VALUE=DATE:20261218','DTEND;VALUE=DATE:20261219',
    'SUMMARY:'+esc('CCR After Hours 2026'),
    'LOCATION:'+esc('ครัวซอย 11, เฉลิมพระเกียรติ ร.9 ซอย 11, หนองบอน, ประเวศ, กรุงเทพฯ 10250'),
    'DESCRIPTION:'+esc('CCR Year-End Celebration · เวลาเริ่มงานรอยืนยัน Final Schedule · '+eventUrl()),
    'URL:'+eventUrl(),'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));a.download='CCR-After-Hours-2026.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);setShareStatus('สร้างไฟล์ปฏิทินแบบ All-day แล้ว ✓ · เวลาเริ่มงานยังรอยืนยัน');
});
