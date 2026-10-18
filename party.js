import {api,configured,escapeHTML} from './common.js';
const $=id=>document.getElementById(id);
const state={attendance:'',giftChoice:'',themeChoice:''};
let isOpen=false,saving=false;
const storageKey='ccr_party_choices_v2';
const maps={attendance:{yes:'ไปแน่นอน',maybe:'ยังไม่แน่ใจ',no:'ไม่สะดวก'},giftChoice:{gift_300:'จับของขวัญ ฿300',gift_500:'จับของขวัญ ฿500',gift_300_500:'จับของขวัญ ฿300–500',gift_none:'ปีนี้ไม่จับของขวัญ'},themeChoice:{midnight_gold:'Midnight & Gold',forest_champagne:'Forest & Champagne',retro_future:'Retro Future',come_as_you_are:'Come As You Are'}};
try{Object.assign(state,JSON.parse(localStorage.getItem(storageKey)||'{}'))}catch{}
function saveLocal(){
  try{localStorage.setItem(storageKey,JSON.stringify(state));localStorage.setItem(storageKey+'_saved_at',new Date().toISOString())}catch{}
  const el=$('partyDraftStatus');if(el)el.textContent='ร่างล่าสุดถูกเก็บบนอุปกรณ์นี้แล้ว · '+new Date().toLocaleTimeString('th-TH');
}
function render(){
  document.querySelectorAll('[data-group="attendance"] [data-value]').forEach(b=>{const on=b.dataset.value===state.attendance;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
  document.querySelectorAll('[data-group="gift"] [data-value]').forEach(b=>{const on=b.dataset.value===state.giftChoice;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
  document.querySelectorAll('[data-group="theme"] [data-value]').forEach(b=>{const on=b.dataset.value===state.themeChoice;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
  const complete=!!(state.attendance&&state.giftChoice&&state.themeChoice);
  $('savePreferences').disabled=!complete||saving;
  $('savePreferences').textContent=saving?'กำลังบันทึก…':(isOpen&&configured?'บันทึกคำตอบจริง ↗':'บันทึกร่างบนอุปกรณ์นี้ ✓');
  $('prefSummary').innerHTML=complete?`<b>${escapeHTML(maps.attendance[state.attendance])}</b> · ${escapeHTML(maps.giftChoice[state.giftChoice])} · ${escapeHTML(maps.themeChoice[state.themeChoice])}`:'เลือกให้ครบทั้ง 3 เรื่องก่อนบันทึก';
}
function pick(group,value){
  if(group==='attendance')state.attendance=value;
  if(group==='gift')state.giftChoice=value;
  if(group==='theme')state.themeChoice=value;
  saveLocal();render();
}
document.querySelectorAll('[data-group]').forEach(group=>group.querySelectorAll('[data-value]').forEach(btn=>btn.addEventListener('click',()=>pick(group.dataset.group,btn.dataset.value))));
$('prefToken').addEventListener('input',()=>{$('prefToken').value=$('prefToken').value.toUpperCase().replace(/[^A-Z0-9-]/g,'')});
function msg(t,bad=false){$('prefMessage').innerHTML=`<div class="flash-message ${bad?'bad':''}">${escapeHTML(t)}</div>`}
$('savePreferences').addEventListener('click',async()=>{
  if(!state.attendance||!state.giftChoice||!state.themeChoice)return msg('กรุณาเลือกให้ครบทั้ง 3 เรื่อง',true);
  if(!configured||!isOpen){saveLocal();return msg('บันทึกร่างบนอุปกรณ์นี้แล้ว ✓ เมื่อผู้จัดงานเปิดรับคำตอบจริง ให้กลับมาหน้านี้แล้วใส่รหัสเชิญเพื่อส่งเข้าสู่ฐานข้อมูลกลาง');}
  const code=$('prefToken').value.trim();
  if(!/^CCR26(?:-[A-Z2-9]{5}){4}$/.test(code))return msg('รูปแบบรหัสเชิญไม่ถูกต้อง ตรวจรหัสจากผู้จัดงานอีกครั้ง',true);
  saving=true;render();msg('กำลังบันทึกคำตอบเข้าสู่ฐานข้อมูลกลาง…');
  try{
    const r=await api('preferences.submit',{code,attendance:state.attendance,giftChoice:state.giftChoice,themeChoice:state.themeChoice});
    $('prefToken').value='';saveLocal();msg('บันทึกคำตอบจริงเรียบร้อย ✓ '+new Date(r.saved_at).toLocaleString('th-TH')+' · ใช้รหัสเดิมเพื่อแก้ไขได้ก่อนปิดโหวต');
  }catch(e){msg('ยังบันทึกคำตอบจริงไม่ได้: '+e.message,true)}
  finally{saving=false;render()}
});
async function init(){
  render();
  const savedAt=localStorage.getItem(storageKey+'_saved_at');if(savedAt&&$('partyDraftStatus'))$('partyDraftStatus').textContent='พบร่างบนอุปกรณ์นี้ · บันทึกล่าสุด '+new Date(savedAt).toLocaleString('th-TH');
  const box=$('partyStatus');
  if(!configured){box.className='system-status error';box.innerHTML='<span class="status-dot"></span><span>เชื่อมฐานข้อมูลกลางไม่พร้อม แต่ยังเลือกร่างและเก็บไว้บนอุปกรณ์นี้ได้</span>';return}
  try{const r=await api('status');isOpen=!!r.open;box.className='system-status '+(isOpen?'':'closed');box.innerHTML=`<span class="status-dot"></span><span>${isOpen?'เปิดรับคำตอบจริงแล้ว · ใส่รหัสเชิญเพื่อบันทึก':'ยังปิดรับคำตอบจริง · เลือกและบันทึกร่างบนอุปกรณ์นี้ได้ก่อน'}</span>`;render()}
  catch(e){box.className='system-status error';box.innerHTML='<span class="status-dot"></span><span>เชื่อมต่อระบบกลางไม่ได้ แต่ร่างในเครื่องยังใช้งานได้</span>'}
}
init();
