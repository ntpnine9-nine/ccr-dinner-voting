import {configured,getCatalog,api,money,escapeHTML} from './common.js';
import {FIXED_ALLOWANCE,lineCost} from './decision-engine.js';
const $=id=>document.getElementById(id);
let cats=[],step=0,selected={},isOpen=false,submitting=false,success=false,catalogVersion=null;
const keys=['A','B','C','D','E','F','G','H'];
const storageKey='ccr_vote_choices_v4';
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))selected=saved;}catch{}
function save(){
  try{localStorage.setItem(storageKey,JSON.stringify(selected));localStorage.setItem(storageKey+'_saved_at',new Date().toISOString())}catch{}
  const el=$('draftState');if(el)el.textContent='ร่างถูกเก็บบนอุปกรณ์นี้แล้ว · '+new Date().toLocaleTimeString('th-TH');
}
function status(message,type=''){const s=$('globalStatus');s.className='system-status '+type;s.innerHTML='<span class="status-dot"></span><span>'+escapeHTML(message)+'</span>';}
function show(message,bad=false){$('submitStatus').innerHTML='<div class="flash-message '+(bad?'bad':'')+'" role="status">'+escapeHTML(message)+'</div>';}
function render(){
  if(cats.length!==8)return;
  const c=cats[step],tally=keys.filter(k=>selected[k]).length;
  $('chosenCount').textContent=String(tally);$('categoryNumber').textContent=String(step+1).padStart(2,'0');$('categoryTitle').textContent=`${c.icon||''} หมวด ${c.key} · ${c.label}`;$('categoryDescription').textContent=c.desc||'';
  $('categoryTabs').innerHTML=cats.map((cat,i)=>`<button type="button" role="tab" aria-selected="${i===step}" aria-label="หมวด ${cat.key} ${escapeHTML(cat.label)}${selected[cat.key]?' เลือกแล้ว':''}" class="category-tab ${i===step?'active':''} ${selected[cat.key]?'done':''}" data-tab="${i}">${cat.key}</button>`).join('');
  document.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>{step=Number(el.dataset.tab);render();document.querySelector('.category-heading').scrollIntoView({behavior:'smooth',block:'center'})}));
  $('voteForm').innerHTML=c.options.map(o=>`<label class="choice ${selected[c.key]===o.id?'selected':''}"><input type="radio" name="categoryPick" value="${escapeHTML(o.id)}" ${selected[c.key]===o.id?'checked':''} aria-label="${escapeHTML(o.name)}"><span class="choice-details"><span class="choice-title">${escapeHTML(o.name)}</span><span class="choice-desc">${escapeHTML(o.note||'อาหารจานกลาง')} · ${Number(o.qty)} ${o.portionCheck?'ชุด / ตรวจขนาด':'รายการเสิร์ฟ'}${o.portionCheck?' · ตรวจปริมาณกับร้าน':''}</span><span class="data-badges"><small>ราคาอ้างอิง</small>${o.availabilityStatus==='unavailable'?'<small class="danger-badge">งดชั่วคราว</small>':''}</span></span><span class="choice-price">${money(lineCost(o))}<small>${money(o.price)}/รายการ</small></span></label>`).join('');
  document.querySelectorAll('input[name=categoryPick]').forEach(el=>el.addEventListener('change',()=>{selected[c.key]=el.value;save();render()}));
  $('prev').disabled=step===0;$('next').textContent=step===7?'ไปส่วนบันทึก ↓':'หมวดถัดไป →';
  const rows=cats.filter(cat=>selected[cat.key]).map(cat=>({cat,opt:cat.options.find(o=>o.id===selected[cat.key])})).filter(r=>r.opt);
  const food=rows.reduce((sum,r)=>sum+lineCost(r.opt),0),total=food+FIXED_ALLOWANCE;
  $('summary').innerHTML=rows.length?rows.map(r=>`<div class="receipt-row"><span class="receipt-key">${r.cat.key}</span><span class="receipt-name">${escapeHTML(r.opt.name)}<br><span class="muted small">${r.opt.qty} รายการเสิร์ฟ</span></span><span class="receipt-sum">${money(lineCost(r.opt))}</span></div>`).join(''):'<p class="muted small">ยังไม่มีเมนูที่เลือก เริ่มจากหมวด A ได้เลย</p>';
  $('foodTotal').textContent=money(food);$('grandTotal').textContent=money(total);
  const badge=$('budgetTag');badge.textContent=total>2200?'เกินเพดานพิจารณา ฿2,200 · ผลโหวตไม่ใช่อนุมัติงบ':total>2000?'เกินงบหลัก · ต้องให้ผู้จัดงานอนุมัติ':'อยู่ในงบจำลองหลัก · ราคาจริงยังต้องยืนยัน';badge.style.background=total>2200?'#fff0ee':total>2000?'#fff4df':'#edf6ed';badge.style.color=total>2200?'#9d3636':total>2000?'#87601f':'#347050';
  $('reviewStatus').textContent=success?'บันทึกคะแนนจริงเรียบร้อยแล้ว · ใช้รหัสเดิมแก้ไขได้ก่อนปิดโหวต':tally===8?(isOpen?'เลือกครบแล้ว · ใส่รหัสเชิญแล้วส่งคะแนนจริงได้':'เลือกครบแล้ว · กดบันทึกร่างบนอุปกรณ์นี้ได้'):`เลือกแล้ว ${tally} จาก 8 หมวด`;
  $('submit').disabled=tally!==8||submitting;
  $('submit').textContent=submitting?'กำลังบันทึก…':(isOpen&&configured?'ส่งคะแนนจริง ↗':'บันทึกร่างบนอุปกรณ์นี้ ✓');
}
$('prev').addEventListener('click',()=>{step=Math.max(0,step-1);render()});
$('next').addEventListener('click',()=>{if(step<7){step++;render();document.querySelector('.category-heading').scrollIntoView({behavior:'smooth',block:'center'})}else{$('submit').scrollIntoView({behavior:'smooth',block:'center'})}});
$('token').addEventListener('input',()=>{$('token').value=$('token').value.toUpperCase().replace(/[^A-Z0-9-]/g,'')});
$('submit').addEventListener('click',async()=>{
  if(submitting)return;if(keys.some(k=>!selected[k]))return show('กรุณาเลือกเมนูให้ครบ 8 หมวด',true);
  if(!configured||!isOpen){save();return show('บันทึกร่างบนอุปกรณ์นี้แล้ว ✓ เมื่อผู้จัดงานเปิดรับคะแนนจริง ให้กลับมาหน้านี้ ใส่รหัสเชิญ แล้วกดส่งคะแนนจริง');}
  const code=$('token').value.trim();if(!/^CCR26(?:-[A-Z2-9]{5}){4}$/.test(code))return show('รูปแบบรหัสเชิญไม่ถูกต้อง ตรวจรหัสเชิญส่วนตัวจากผู้จัดงานอีกครั้ง',true);
  submitting=true;render();show('กำลังส่งคะแนนเข้าสู่ฐานข้อมูลกลาง…');
  try{const r=await api('submit',{code,catalogVersion,choices:Object.fromEntries(keys.map(k=>[k,selected[k]]))});success=true;$('token').value='';save();show('บันทึกคะแนนจริงสำเร็จ ✓ รหัสใบโหวต: '+r.receipt+' · '+new Date(r.saved_at).toLocaleString('th-TH')+' · ใช้รหัสเดิมแก้ไขได้ก่อนปิดโหวต');}
  catch(e){show('ยังยืนยันการบันทึกไม่ได้: '+e.message,true)}finally{submitting=false;render()}
});
async function init(){
  const savedAt=localStorage.getItem(storageKey+'_saved_at');if(savedAt&&$('draftState'))$('draftState').textContent='พบร่างบนอุปกรณ์นี้ · บันทึกล่าสุด '+new Date(savedAt).toLocaleString('th-TH');
  try{const catalog=await getCatalog();cats=catalog.categories;catalogVersion=catalog.catalogVersion;for(const [k,id] of Object.entries(selected))if(!cats.find(c=>c.key===k)?.options.some(o=>o.id===id))delete selected[k];render();if(!configured){status('เชื่อมฐานข้อมูลกลางไม่พร้อม · ยังเลือกและบันทึกร่างบนอุปกรณ์นี้ได้','error');return}const r=await api('status');isOpen=!!r.open;status(isOpen?'เปิดรับคะแนนจริงแล้ว · เลือกครบ 8 หมวดและใส่รหัสเชิญเพื่อส่งคะแนน':'ยังปิดรับคะแนนจริง · เลือกและบันทึกร่างบนอุปกรณ์นี้ได้ก่อน',isOpen?'':'closed');render();}
  catch(e){status('โหลดข้อมูลเมนูจากระบบกลางไม่ได้: '+e.message,'error');isOpen=false;render()}
}
init();
