import {api,configured,escapeHTML} from './common.js';
const $=id=>document.getElementById(id);
const DRAFT_KEY='ccr_party_draft_v2';
const state={attendance:'',giftChoice:'',themeChoice:''};let isOpen=false,saving=false,draftSavedAt='';
const maps={attendance:{yes:'ไปแน่นอน',maybe:'ยังไม่แน่ใจ',no:'ไม่สะดวก'},giftChoice:{gift_300:'จับของขวัญ ฿300',gift_500:'จับของขวัญ ฿500',gift_300_500:'จับของขวัญ ฿300–500',gift_none:'ปีนี้ไม่จับของขวัญ'},themeChoice:{midnight_gold:'Midnight & Gold',forest_champagne:'Forest & Champagne',retro_future:'Retro Future',come_as_you_are:'Come As You Are'}};

function readLocal(){
  try{
    const local=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
    if(local&&local.state){Object.assign(state,local.state);draftSavedAt=local.savedAt||'';return}
    Object.assign(state,JSON.parse(sessionStorage.getItem('ccr_party_choices_v1')||'{}'));
  }catch{}
}
function persistDraft(manual=false){
  try{
    draftSavedAt=new Date().toISOString();
    localStorage.setItem(DRAFT_KEY,JSON.stringify({state,savedAt:draftSavedAt}));
    renderDraft(manual?'บันทึกแบบร่างแล้ว ✓':'บันทึกแบบร่างอัตโนมัติแล้ว');
  }catch{renderDraft('เบราว์เซอร์ไม่อนุญาตให้เก็บแบบร่าง','warn')}
}
function renderDraft(custom='',tone=''){
  const el=$('partyDraftStatus');if(!el)return;
  const count=[state.attendance,state.giftChoice,state.themeChoice].filter(Boolean).length;
  if(custom){el.textContent=custom;el.className='pref-summary '+(tone||'saved');return}
  if(!count){el.textContent='ยังไม่มีแบบร่าง · เลือกตัวเลือกแล้วระบบจะจำให้';el.className='pref-summary';return}
  const when=draftSavedAt?new Date(draftSavedAt).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'}):'เมื่อสักครู่';
  el.textContent=`แบบร่าง ${count}/3 เรื่อง · ล่าสุด ${when}`;el.className='pref-summary saved';
}
function render(){
  document.querySelectorAll('[data-group="attendance"] [data-value]').forEach(b=>{const on=b.dataset.value===state.attendance;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
  document.querySelectorAll('[data-group="gift"] [data-value]').forEach(b=>{const on=b.dataset.value===state.giftChoice;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
  document.querySelectorAll('[data-group="theme"] [data-value]').forEach(b=>{const on=b.dataset.value===state.themeChoice;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',String(on))});
  const complete=state.attendance&&state.giftChoice&&state.themeChoice;
  $('savePreferences').disabled=!configured||!isOpen||!complete||saving;
  $('savePreferences').textContent=saving?'กำลังบันทึก…':isOpen?'ส่งคำตอบเข้าสู่ระบบ ↗':'ยังไม่เปิดรับคำตอบจริง';
  $('savePartyDraft').disabled=!state.attendance&&!state.giftChoice&&!state.themeChoice;
  $('prefSummary').innerHTML=complete?`<b>${escapeHTML(maps.attendance[state.attendance])}</b> · ${escapeHTML(maps.giftChoice[state.giftChoice])} · ${escapeHTML(maps.themeChoice[state.themeChoice])}`:'เลือกให้ครบทั้ง 3 เรื่องก่อนส่งจริง';
  renderDraft();
}
function pick(group,value){
  if(group==='attendance')state.attendance=value;
  if(group==='gift')state.giftChoice=value;
  if(group==='theme')state.themeChoice=value;
  persistDraft(false);render();
}
document.querySelectorAll('[data-group]').forEach(group=>group.querySelectorAll('[data-value]').forEach(btn=>btn.addEventListener('click',()=>pick(group.dataset.group,btn.dataset.value))));
$('savePartyDraft').addEventListener('click',()=>persistDraft(true));
$('prefToken').addEventListener('input',()=>{$('prefToken').value=$('prefToken').value.toUpperCase().replace(/[^A-Z0-9-]/g,'')});
function msg(t,bad=false){$('prefMessage').innerHTML=`<div class="flash-message ${bad?'bad':''}">${escapeHTML(t)}</div>`}
$('savePreferences').addEventListener('click',async()=>{
  const code=$('prefToken').value.trim();
  if(!isOpen)return msg('ยังไม่เปิดรับคำตอบจริง แต่แบบร่างบนอุปกรณ์นี้ยังถูกเก็บไว้',true);
  if(!/^CCR26(?:-[A-Z2-9]{5}){4}$/.test(code))return msg('รูปแบบรหัสเชิญไม่ถูกต้อง ตรวจรหัสจากผู้จัดงานอีกครั้ง',true);
  if(!state.attendance||!state.giftChoice||!state.themeChoice)return msg('กรุณาเลือกให้ครบทั้ง 3 เรื่อง',true);
  saving=true;render();msg('กำลังบันทึกตัวเลือกของคุณ…');
  try{
    const r=await api('preferences.submit',{code,attendance:state.attendance,giftChoice:state.giftChoice,themeChoice:state.themeChoice});
    $('prefToken').value='';persistDraft(false);msg('บันทึกเรียบร้อย ✓ '+new Date(r.saved_at).toLocaleString('th-TH')+' · ใช้รหัสเดิมเพื่อแก้ไขได้ก่อนปิดโหวต');
  }catch(e){msg('ยังบันทึกไม่ได้: '+e.message,true)}
  finally{saving=false;render()}
});
async function init(){
  readLocal();render();
  const box=$('partyStatus');
  if(!configured){box.className='system-status error';box.innerHTML='<span class="status-dot"></span><span>ยังไม่ได้เชื่อมฐานข้อมูลกลาง · แบบร่างบนอุปกรณ์ยังใช้ได้</span>';return}
  try{
    const r=await api('status');isOpen=!!r.open;
    box.className='system-status '+(isOpen?'good':'closed');
    box.innerHTML=`<span class="status-dot"></span><span>${isOpen?'เปิดรับคำตอบจริงแล้ว':'ยังไม่เปิดรับคำตอบจริง · เลือกและบันทึกแบบร่างบนอุปกรณ์นี้ได้'}</span>`;
    render();
  }catch(e){box.className='system-status error';box.innerHTML='<span class="status-dot"></span><span>เชื่อมต่อระบบกลางไม่ได้ · แบบร่างยังใช้ได้: '+escapeHTML(e.message)+'</span>'}
}
init();
