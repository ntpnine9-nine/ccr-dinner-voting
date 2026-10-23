import { renderJourneyProgress, getSavedJourneyState, PARTY_LABELS, escapeHTML, money, PARTY_STORAGE_KEY, VOTE_SAVED_KEY, VOTE_PICKS_KEY, TOKEN_STORAGE_KEY } from './common.js?v=20261022-servings1';
import {countdownAt, eventCalendar} from './event-time.js?v=20261023-live1';
const $=id=>document.getElementById(id);
let countdownTimer;
function tick(){
  const parts=countdownAt();
  for(const key of ['days','hours','minutes','seconds']){
    const el=$(key);if(!el)continue;
    const next=String(parts[key]).padStart(2,'0');
    if(el.textContent!==next){
      el.textContent=next;
      if(el.animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)
        el.animate([{transform:'translateY(5px)',opacity:.88},{transform:'translateY(0)',opacity:1}],{duration:240,easing:'ease-out'});
    }
  }
  const status=$('countdownStatus');
  const message=parts.started?'ถึงเวลาเริ่มงานแล้ว · ยินดีต้อนรับสู่ CCR After Hours 2026':'นับถอยหลังสู่ค่ำคืนของพวกเรา · เริ่ม 17:00 น. เวลาประเทศไทย';
  if(status&&status.textContent!==message)status.textContent=message;
  if(parts.started){clearTimeout(countdownTimer);return;}
  // Recalculate from the clock, never decrement a counter that can drift in a background tab.
  clearTimeout(countdownTimer);
  if(!document.hidden)countdownTimer=setTimeout(tick,1000-(Date.now()%1000)+15);
}
if($('seconds')){
  tick();
  document.addEventListener('visibilitychange',()=>{clearTimeout(countdownTimer);if(!document.hidden)tick();});
  window.addEventListener('pageshow',tick);
}

function renderGuideSavedDetails(){
  const st=getSavedJourneyState();
  const home=$('myEventPass');
  if(home&&!home.classList.contains('my-pass-card')){
    const rows=[['RSVP',PARTY_LABELS.attendance[st.party.attendance]||'ยังไม่ได้ตอบ'],['ของขวัญ',PARTY_LABELS.giftChoice[st.party.giftChoice]||'ยังไม่ได้เลือก'],['ธีมแต่งตัว',PARTY_LABELS.themeChoice[st.party.themeChoice]||'ยังไม่ได้เลือก'],['อาหาร',`เลือกครบ ${st.voteCount}/8 หมวด`]];
    home.innerHTML='<div class="pass-grid">'+rows.map(([title,value])=>`<div class="pass-item"><small>${title}</small><b>${escapeHTML(value)}</b></div>`).join('')+'</div>'+`<p class="home-pass-status"><span>RSVP: ${st.partySaved?'✓ ระบบยืนยันแล้ว':st.partyCount?'ฉบับร่าง · ยังไม่ได้ส่ง':'ยังไม่ได้ตอบ'}</span><span>อาหาร: ${st.hasSavedVote?'✓ ระบบยืนยันแล้ว':st.voteCount?'ฉบับร่าง / ใบเดิม · ตรวจแล้วส่งอีกครั้ง':'ยังไม่ได้เลือก'}</span></p>`;
  }
  renderJourneyProgress();
  const box=$('guideSavedMenu');
  if(!box)return;
  const items=st.voteSaved?.items;
  if(Array.isArray(items)&&items.length){
    box.innerHTML=`
      <section class="saved-menu-summary" aria-label="รายการอาหารที่บันทึกไว้">
        <div class="saved-menu-summary-head">
          <strong>${st.hasSavedVote?'บันทึกลงระบบกลางแล้ว':'ฉบับร่าง / ใบโหวตกติกาเดิม — กรุณาตรวจและส่งใหม่'} · รายการอาหารทั้ง ${new Set(items.map(it=>it.key)).size} หมวดที่คุณบันทึกไว้ (${escapeHTML(st.voteSaved.receipt||'LOCAL')})</strong>
          <span class="saved-menu-total">รวมต่อโต๊ะประมาณ ${money(st.voteSaved.grandTotal||0)}</span>
        </div>
        <div class="saved-menu-grid">
          ${items.map(it=>`<div class="saved-menu-row"><b>หมวด ${escapeHTML(it.key)}:</b> ${escapeHTML(it.name)} × ${Number(it.qty)} เสิร์ฟ <span class="saved-menu-price">(${money(it.lineTotal)})</span></div>`).join('')}
        </div>
      </section>`;
  }else{
    box.innerHTML='';
  }
}
renderGuideSavedDetails();
window.addEventListener('storage',()=>renderGuideSavedDetails());

$('resetAllDataBtn')?.addEventListener('click', () => {
  if (confirm('ล้างฉบับร่างและบัตรสรุปในเครื่องนี้หรือไม่? คำตอบที่ส่งเข้าระบบกลางยังคงอยู่ หากต้องการลบข้อมูลกลางให้ติดต่อผู้จัดงาน')) {
    try {
      localStorage.removeItem(PARTY_STORAGE_KEY);
      localStorage.removeItem(VOTE_SAVED_KEY);
      localStorage.removeItem(VOTE_PICKS_KEY);
      sessionStorage.removeItem('ccr_party_choices_v1');
      sessionStorage.removeItem('ccr_vote_choices_v3');
    } catch {}
    renderGuideSavedDetails();
    alert('ล้างฉบับร่างในเครื่องแล้ว คำตอบที่ส่งเข้าระบบกลางยังคงอยู่');
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
  const data={title:'CCR After Hours 2026',text:'ศุกร์ 18 ธันวาคม 2026 เวลา 17:00 น. · ครัวซอย 11 · CCR Year-End Celebration',url:eventUrl()};
  try{
    if(navigator.share){await navigator.share(data);setShareStatus('เปิดหน้าต่างแชร์แล้ว');return}
    await navigator.clipboard.writeText(data.url);setShareStatus('คัดลอกลิงก์คำเชิญแล้ว ✓');
  }catch(e){if(e?.name!=='AbortError')setShareStatus('แชร์อัตโนมัติไม่ได้ — สามารถคัดลอก URL จากเบราว์เซอร์ได้')}
});
$('addCalendar')?.addEventListener('click',()=>{
  const ics=eventCalendar(eventUrl());
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));a.download='CCR-After-Hours-2026.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);setShareStatus('สร้างไฟล์ปฏิทินแล้ว ✓ · 18 ธันวาคม 2026 เวลา 17:00 น. (ประเทศไทย)');
});
