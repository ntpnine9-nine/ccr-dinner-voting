import {configured,getCatalog,api,money,escapeHTML,VOTE_PICKS_KEY,VOTE_SAVED_KEY,getSharedToken,getParticipantLabel,setParticipantLabel,submissionParticipant,renderJourneyProgress} from './common.js?v=20261022-servings1';
import {FIXED_ALLOWANCE} from './decision-engine.js?v=20261022-servings1';
import {CATEGORY_KEYS as keys,quotaFor,billingMultiplier,normalizeChoices,usedServings,completedCategories,setServing,ballotLines,isLegacyBallot} from './ballot-model.js?v=20261022-servings1';
import {menuMediaFor} from './menu-media.js?v=20261023-polish2';
const $=id=>document.getElementById(id);
let cats=[],step=0,selected={},savedBallot=null,isOpen=false,votingMode='invite',catalogVersion=null,submitting=false;
const scrollBehavior=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
try {
  savedBallot=JSON.parse(localStorage.getItem(VOTE_SAVED_KEY)||'null');
  selected=normalizeChoices(JSON.parse(localStorage.getItem(VOTE_PICKS_KEY)||'null')||savedBallot?.picks||{},{complete:false});
} catch {selected={};}
function saveDraft(){
  const items=ballotLines(cats,selected),foodTotal=items.reduce((n,o)=>n+o.lineTotal,0);
  savedBallot={picks:structuredClone(selected),items,foodTotal,grandTotal:foodTotal+FIXED_ALLOWANCE,cloudConfirmed:false,savedAt:null,ballotVersion:2,catalogVersion};
  persist();
}
function persist(){
  try {localStorage.setItem(VOTE_PICKS_KEY,JSON.stringify(selected));localStorage.setItem(VOTE_SAVED_KEY,JSON.stringify(savedBallot));sessionStorage.setItem('ccr_vote_choices_v3',JSON.stringify(selected));} catch {}
  renderJourneyProgress();
}
function status(message,type=''){$('globalStatus').className='system-status '+type;$('globalStatus').innerHTML='<span class="status-dot"></span><span>'+escapeHTML(message)+'</span>';}
function show(message,type='',extra=''){$('submitStatus').innerHTML=`<div class="flash-message ${type}" role="status">${escapeHTML(message)}${extra}</div>`;}
function render(focusId='',focusQty=false){
  if(cats.length!==8)return;
  const c=cats[step],quota=quotaFor(c.key),used=usedServings(selected,c.key),done=completedCategories(selected),tally=done.length;
  $('chosenCount').textContent=tally;
  if($('receiptCountInline'))$('receiptCountInline').textContent=`${tally}/8`;
  $('categoryNumber').textContent=String(step+1).padStart(2,'0');
  $('categoryTitle').textContent=`${c.icon||''} หมวด ${c.key} · ${c.label}`;
  $('categoryDescription').textContent=`เลือกรวม ${quota} เสิร์ฟ · เลือกแล้ว ${used}/${quota} · ${quota===2?'เมนูเดียว 2 เสิร์ฟ หรือ 2 เมนูอย่างละ 1 เสิร์ฟ':c.key==='H'?'เลือกข้าว 1 เมนู คิดราคา 2 เสิร์ฟ':'เลือก 1 เมนู จำนวน 1 เสิร์ฟ'}`;
  const categoryMedia=menuMediaFor(c.options[0].id);
  if($('categoryPhoto')&&categoryMedia){$('categoryPhoto').src=categoryMedia.src;$('categoryPhoto').alt='ภาพประกอบ AI: '+c.options[0].name;}
  if($('categoryPhotoTag'))$('categoryPhotoTag').textContent=`หมวด ${c.key} · ${quota} เสิร์ฟ`;
  if($('categoryPhotoTitle'))$('categoryPhotoTitle').textContent=c.label;
  if($('categoryPhotoCaption'))$('categoryPhotoCaption').textContent='ภาพประกอบสร้างด้วย AI ไม่ใช่ภาพอาหารจริงจากร้าน · ราคาอ้างอิง รอยืนยันกับร้าน';
  $('token').disabled=submitting;
  if($('helperProgressText'))$('helperProgressText').textContent=tally===8?'✓ เลือกจำนวนเสิร์ฟครบทั้ง 8 หมวดแล้ว กดบันทึกคะแนนเพื่อส่งเข้าระบบกลาง':`ครบโควตาแล้ว ${tally}/8 หมวด · ยังขาดหมวด ${keys.filter(k=>!done.includes(k)).join(', ')}`;
  $('categoryTabs').innerHTML=cats.map((cat,i)=>`<button type="button" role="tab" tabindex="${i===step?0:-1}" aria-selected="${i===step}" aria-label="หมวด ${cat.key} ${escapeHTML(cat.label)} เลือกแล้ว ${usedServings(selected,cat.key)} จาก ${quotaFor(cat.key)} เสิร์ฟ" class="category-tab ${i===step?'active':''} ${done.includes(cat.key)?'done':''}" data-tab="${i}">${cat.key}${done.includes(cat.key)?' ✓':''}</button>`).join('');
  document.querySelectorAll('[data-tab]').forEach(el=>{
    el.addEventListener('click',()=>{step=Number(el.dataset.tab);render();});
    el.addEventListener('keydown',e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();step=e.key==='Home'?0:e.key==='End'?7:(Number(el.dataset.tab)+(e.key==='ArrowRight'?1:-1)+8)%8;render();document.querySelector(`[data-tab="${step}"]`)?.focus();});
  });
  $('voteForm').innerHTML=c.options.map(o=>{
    const qty=selected[c.key]?.[o.id]||0,unavailable=o.availabilityStatus==='unavailable',disabled=unavailable||(!qty&&used>=quota),max=quota-used+qty;
    const media=menuMediaFor(o.id);
    const picture=media?`<img src="${media.src}" width="640" height="480" loading="lazy" decoding="async" alt="ภาพประกอบ AI: ${escapeHTML(o.name)}"><small class="menu-image-kind">ภาพประกอบ AI</small>`:`<span class="menu-placeholder"><span aria-hidden="true">◇</span><span>รอภาพเมนูจากร้าน</span><small>เมนูเฉพาะ · ${escapeHTML(o.id)}</small></span>`;
    return `<div class="choice ${qty?'selected':''} ${disabled?'quota-disabled':''} ${unavailable?'unavailable':''}"><label class="serving-option"><span class="menu-media">${picture}</span><span class="menu-choice-head"><input type="checkbox" name="categoryPick" value="${o.id}" ${qty?'checked':''} ${disabled||submitting?'disabled':''}><span class="choice-title">${escapeHTML(o.name)}</span></span><span class="choice-meta"><span class="menu-id">${escapeHTML(o.id)}</span><span class="choice-price">${money(o.price*(qty||1)*billingMultiplier(c.key))}<small>${money(o.price)}/เสิร์ฟ${c.key==='H'?' × 2':''}</small></span></span>${o.note?`<span class="choice-desc">${escapeHTML(o.note)}</span>`:''}<span class="choice-state">${unavailable?'งดชั่วคราว':qty?`✓ เลือกแล้ว ${qty} เสิร์ฟ`:disabled?'ครบโควตาหมวดนี้แล้ว':'แตะเพื่อเลือก'}</span></label>${qty?`<div class="serving-control"><label for="qty-${o.id}">จำนวนเสิร์ฟ</label><div class="quantity-stepper"><button type="button" data-adjust="${o.id}" data-delta="-1" ${submitting?'disabled':''} aria-label="ลดจำนวนเสิร์ฟ ${escapeHTML(o.name)}">−</button><select id="qty-${o.id}" class="text-field" ${submitting?'disabled':''} data-quantity="${o.id}" aria-label="จำนวนเสิร์ฟ ${escapeHTML(o.name)}">${Array.from({length:max},(_,i)=>`<option value="${i+1}" ${qty===i+1?'selected':''}>${i+1} เสิร์ฟ</option>`).join('')}</select><button type="button" data-adjust="${o.id}" data-delta="1" ${submitting||qty>=max?'disabled':''} aria-label="เพิ่มจำนวนเสิร์ฟ ${escapeHTML(o.name)}">＋</button></div>${c.key==='H'?'<small>เลือก 1 เมนู · คิดราคา 2 เสิร์ฟ</small>':''}</div>`:''}</div>`;
  }).join('');
  const update=(id,qty,focusQty=false)=>{if(submitting)return;try{selected=setServing(selected,c.key,id,qty);saveDraft();render(id,focusQty);}catch(e){show(e.message,'bad');}};
  document.querySelectorAll('[name=categoryPick]').forEach(el=>el.addEventListener('change',()=>update(el.value,el.checked?1:0)));
  document.querySelectorAll('[data-quantity]').forEach(el=>el.addEventListener('change',()=>update(el.dataset.quantity,Number(el.value),true)));
  document.querySelectorAll('[data-adjust]').forEach(el=>el.addEventListener('click',()=>update(el.dataset.adjust,(selected[c.key]?.[el.dataset.adjust]||0)+Number(el.dataset.delta),true)));
  document.querySelectorAll('.menu-media img').forEach(img=>img.addEventListener('error',()=>{const note=document.createElement('span');note.className='menu-placeholder';note.textContent='โหลดภาพไม่ได้ · เลือกจากชื่อเมนูได้ตามปกติ';img.parentElement.replaceChildren(note);},{once:true}));
  if(focusId)(focusQty?document.querySelector(`[data-quantity="${focusId}"]`):document.querySelector(`[name=categoryPick][value="${focusId}"]`))?.focus({preventScroll:true});
  $('prev').disabled=step===0;$('next').textContent=step===7?'ไปกล่องบันทึกคะแนน ↓':'หมวดถัดไป →';
  const items=ballotLines(cats,selected),food=items.reduce((n,o)=>n+o.lineTotal,0),total=food+FIXED_ALLOWANCE;
  $('summary').innerHTML=items.length?items.map(o=>`<div class="receipt-row"><span class="receipt-key">${o.key}</span><span class="receipt-name">${escapeHTML(o.name)}<br><span class="muted small">${o.qty} เสิร์ฟ${o.key==='H'?' (เลือกข้าว 1 เมนู)':''} × ${money(o.price)}</span></span><span class="receipt-sum">${money(o.lineTotal)}</span></div>`).join(''):'<p class="muted small">เลือกเมนูและจำนวนเสิร์ฟจากหมวด A–H</p>';
  $('foodTotal').textContent=money(food);$('grandTotal').textContent=money(total);
  $('budgetTag').textContent=total>2200?'เกินเพดาน ฿2,200 · ยังส่งความชอบได้ ผู้จัดงานจะจัดชุดตามงบ':total>2000?'อยู่ในเพดานพิจารณา ฿2,200':'✓ อยู่ในงบเป้าหมาย ฿2,000 ต่อโต๊ะ';
  const legacy=isLegacyBallot(savedBallot?.picks),confirmed=savedBallot?.cloudConfirmed&&!legacy;
  $('reviewStatus').textContent=legacy?'ใบโหวตเดิมยังอยู่ในระบบ กรุณาตรวจจำนวนเสิร์ฟตามกติกาใหม่แล้วกดบันทึกอีกครั้ง':confirmed?`✓ บันทึกลงระบบกลางแล้ว · รหัสใบโหวต: ${savedBallot.receipt} · ${new Date(savedBallot.savedAt).toLocaleString('th-TH')}`:tally===8?'เลือกครบแล้ว · ฉบับร่างในเครื่องนี้เท่านั้น ยังไม่ได้ส่งเข้าระบบกลาง':`ครบโควตาแล้ว ${tally}/8 หมวด · เลือกให้ครบก่อนบันทึก`;
  $('submit').disabled=submitting;
  $('submit').textContent=submitting?'กำลังบันทึกคะแนน…':tally<8?`ไปหมวด ${keys.find(k=>!done.includes(k))} · เลือกให้ครบโควตา →`:confirmed?'อัปเดตคะแนนเข้าระบบกลาง ↗':'บันทึกคะแนนเข้าระบบกลาง ↗';
}
$('prev').addEventListener('click',()=>{step=Math.max(0,step-1);render();});
$('next').addEventListener('click',()=>{if(step<7){step++;render();}else{$('saveVoteBox')?.scrollIntoView({behavior:scrollBehavior(),block:'center'});$('submit').focus();}});
$('quickSample')?.addEventListener('click',()=>{
  if(submitting)return;cats.forEach(c=>{const left=quotaFor(c.key)-usedServings(selected,c.key),o=c.options.find(o=>o.availabilityStatus!=='unavailable');if(left&&o)selected=setServing(selected,c.key,o.id,(selected[c.key]?.[o.id]||0)+left);});
  saveDraft();render();show('เติมจำนวนเสิร์ฟที่เหลือให้ครบแล้ว ตรวจเมนูก่อนกดบันทึกเข้าระบบกลาง');
});
function clearPicks(){if(submitting)return;selected={};savedBallot=null;step=0;try{localStorage.removeItem(VOTE_PICKS_KEY);localStorage.removeItem(VOTE_SAVED_KEY);sessionStorage.removeItem('ccr_vote_choices_v3');}catch{}renderJourneyProgress();render();show('ล้างฉบับร่างในเครื่องแล้ว คะแนนที่ส่งเข้าระบบกลางยังคงอยู่ — เลือกใหม่แล้วกดส่งเพื่ออัปเดตคะแนนเดิม');}
$('clearPicks')?.addEventListener('click',clearPicks);$('resetVoteBtn')?.addEventListener('click',clearPicks);
getSharedToken();$('token').value=getParticipantLabel();$('token').addEventListener('input',()=>setParticipantLabel($('token').value));
window.addEventListener('storage',()=>{$('token').value=getParticipantLabel();});window.addEventListener('hashchange',()=>getSharedToken());
$('submit').addEventListener('click',async()=>{
  if(submitting||cats.length!==8)return;
  const done=completedCategories(selected);
  if(done.length!==8){step=cats.findIndex(c=>!done.includes(c.key));render();$('categoryTitle').scrollIntoView({behavior:scrollBehavior(),block:'center'});show('กรุณาเลือกจำนวนเสิร์ฟให้ครบโควตาทั้ง 8 หมวด','warn');return;}
  submitting=true;render();
  try {
    normalizeChoices(selected);
    if(!configured)throw Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อระบบกลาง');
    const current=await api('status');isOpen=current.open;votingMode=current.votingMode||'invite';
    if(Number(current.catalogVersion)!==Number(catalogVersion))throw Error('แค็ตตาล็อกเปลี่ยนแล้ว กรุณารีเฟรชหน้าเว็บและตรวจจำนวนเสิร์ฟก่อนส่งอีกครั้ง');
    if(!isOpen){saveDraft();show('ขณะนี้ยังไม่เปิดรับโหวต (ระบบกลางปิดรับคะแนน) — ชุดเมนูทั้ง 8 หมวดถูกเก็บเป็นฉบับร่างในเครื่องนี้เท่านั้น ยังไม่ได้ส่งเข้าระบบกลาง','warn');return;}
    if(votingMode !== 'open' && !getSharedToken()){show('รอบนี้ใช้ลิงก์เชิญส่วนตัว กรุณาเปิดลิงก์จากผู้จัดงาน','warn');return;}
    const result=await api('submit',{...submissionParticipant($('token').value),choices:selected,catalogVersion});
    if(!result.receipt||!result.saved_at)throw Error('ยังไม่ได้รับการยืนยันการบันทึก');
    saveDraft();savedBallot={...savedBallot,receipt:result.receipt,savedAt:result.saved_at,cloudConfirmed:true};persist();
    show(`✓ บันทึกลงระบบกลางแล้ว · รหัสใบโหวต: ${result.receipt} · ${new Date(result.saved_at).toLocaleString('th-TH')}`,'good');
  }catch(e){show('ส่งเข้าระบบกลางไม่สำเร็จ — '+e.message,'bad','<br><button type="button" class="mini-btn" id="retrySubmitBtn">ลองส่งอีกครั้ง</button>');$('retrySubmitBtn')?.addEventListener('click',()=>$('submit').click());}
  finally{submitting=false;render();}
});
async function init(){
  status('กำลังโหลดเมนูและกติกาจากระบบกลาง…');
  try {const data=await getCatalog();cats=data.categories;catalogVersion=data.catalogVersion;isOpen=data.status==='open';render();renderJourneyProgress();status(data.offlineFallback?'เชื่อมต่อระบบกลางไม่ได้ · เลือกฉบับร่างได้ แต่ยังส่งคะแนนไม่ได้':isOpen?'เปิดรับคะแนน · A B C E F รวมหมวดละ 2 เสิร์ฟ · D G หมวดละ 1 · H เลือก 1 คิดราคา 2':'ปิดรับคะแนน · เลือกเป็นฉบับร่างได้');}
  catch(e){status(e.message,'bad');show('โหลดเมนูไม่สำเร็จ กรุณารีเฟรชหน้าเว็บ','bad');}
}
init();
