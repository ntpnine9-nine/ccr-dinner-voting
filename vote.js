import {configured,getCatalog,api,money,escapeHTML,formatInviteCode} from './common.js';
import {FIXED_ALLOWANCE,lineCost} from './decision-engine.js';
const $=id=>document.getElementById(id);
let cats=[],step=0,selected={},isOpen=false,submitting=false,success=false,catalogVersion=null;
const keys=['A','B','C','D','E','F','G','H'];
const scrollBehavior=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
try{const saved=JSON.parse(sessionStorage.getItem('ccr_vote_choices_v3')||'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))selected=saved;}catch{}
function save(){try{sessionStorage.setItem('ccr_vote_choices_v3',JSON.stringify(selected))}catch{}}
function status(message,type=''){const s=$('globalStatus');s.className='system-status '+type;s.innerHTML='<span class="status-dot"></span><span>'+escapeHTML(message)+'</span>';}
function show(message,bad=false){$('submitStatus').innerHTML='<div class="flash-message '+(bad?'bad':'')+'" role="status">'+escapeHTML(message)+'</div>';}
function render(restoreFocusId=''){
  if(cats.length!==8)return;
  const c=cats[step],tally=keys.filter(k=>selected[k]).length;
  $('chosenCount').textContent=String(tally);
  $('categoryNumber').textContent=String(step+1).padStart(2,'0');
  $('categoryTitle').textContent=`${c.icon||''} หมวด ${c.key} · ${c.label}`;
  $('categoryDescription').textContent=c.desc||'';
  $('categoryTabs').innerHTML=cats.map((cat,i)=>`<button type="button" role="tab" tabindex="${i===step?'0':'-1'}" aria-selected="${i===step}" aria-label="หมวด ${cat.key} ${escapeHTML(cat.label)}${selected[cat.key]?' เลือกแล้ว':''}" class="category-tab ${i===step?'active':''} ${selected[cat.key]?'done':''}" data-tab="${i}">${cat.key}</button>`).join('');
  const tabBtns=[...document.querySelectorAll('[data-tab]')];
  tabBtns.forEach((el,idx)=>{
    el.addEventListener('click',()=>{step=Number(el.dataset.tab);render();document.querySelector('.category-heading').scrollIntoView({behavior:scrollBehavior(),block:'center'})});
    el.addEventListener('keydown',e=>{
      if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
      e.preventDefault();
      if(e.key==='Home')step=0;
      else if(e.key==='End')step=cats.length-1;
      else step=(idx+(e.key==='ArrowRight'?1:-1)+cats.length)%cats.length;
      render();
      document.querySelector(`[data-tab="${step}"]`)?.focus();
    });
  });
  $('voteForm').innerHTML=c.options.map(o=>{
    const unavail=o.availabilityStatus==='unavailable';
    const picked=selected[c.key]===o.id;
    return `<label class="choice ${picked?'selected':''} ${unavail?'unavailable':''}"><input type="radio" name="categoryPick" value="${escapeHTML(o.id)}" ${picked?'checked':''} ${unavail?'disabled':''} aria-label="${escapeHTML(o.name)}"><span class="choice-details"><span class="choice-title">${escapeHTML(o.name)}</span><span class="choice-desc">${escapeHTML(o.note||'อาหารจานกลาง')} · ${Number(o.qty)} ${o.portionCheck?'ชุด / ตรวจขนาด':'รายการเสิร์ฟ'} ${o.portionCheck?' · ตรวจปริมาณกับร้าน':''}</span><span class="data-badges"><small>ราคาอ้างอิง</small>${unavail?'<small class="danger-badge">งดชั่วคราว</small>':''}</span></span><span class="choice-price">${money(lineCost(o))}<small>${money(o.price)}/รายการ</small></span></label>`;
  }).join('');
  document.querySelectorAll('input[name=categoryPick]').forEach(el=>el.addEventListener('change',()=>{selected[c.key]=el.value;save();render(el.value)}));
  if(restoreFocusId){
    const targetInput=[...document.querySelectorAll('input[name=categoryPick]')].find(i=>i.value===restoreFocusId);
    targetInput?.focus({preventScroll:true});
  }
  $('prev').disabled=step===0;
  $('next').textContent=step===7?'ไปกรอกรหัสเพื่อส่งคะแนน ↓':'หมวดถัดไป →';
  const rows=cats.filter(cat=>selected[cat.key]).map(cat=>({cat,opt:cat.options.find(o=>o.id===selected[cat.key])})).filter(r=>r.opt);
  const food=rows.reduce((sum,r)=>sum+lineCost(r.opt),0),total=food+FIXED_ALLOWANCE;
  $('summary').innerHTML=rows.length?rows.map(r=>`<div class="receipt-row"><span class="receipt-key">${r.cat.key}</span><span class="receipt-name">${escapeHTML(r.opt.name)}<br><span class="muted small">${r.opt.qty} รายการเสิร์ฟ</span></span><span class="receipt-sum">${money(lineCost(r.opt))}</span></div>`).join(''):'<p class="muted small">ยังไม่มีเมนูที่เลือก เริ่มเลือกจากหมวด A ได้เลย</p>';
  $('foodTotal').textContent=money(food);
  $('grandTotal').textContent=money(total);
  const badge=$('budgetTag');
  badge.textContent=total>2200?'เกินเพดานพิจารณา ฿2,200 · ผลโหวตไม่ใช่อนุมัติงบ':total>2000?'เกินงบหลัก · ต้องให้ผู้จัดงานอนุมัติ':'อยู่ในงบจำลองหลัก · ราคาจริงยังต้องยืนยัน';
  badge.style.background=total>2200?'#fff0ee':total>2000?'#fff4df':'#edf6ed';
  badge.style.color=total>2200?'#9d3636':total>2000?'#87601f':'#347050';
  $('reviewStatus').textContent=success?'ส่งคะแนนเรียบร้อยแล้ว คุณแก้ไขได้ด้วยรหัสเดิมก่อนปิดโหวต':tally===8?(isOpen?'เลือกครบแล้ว ตรวจรายการด้านบนและกรอกรหัสส่วนตัวเพื่อส่งคะแนน':'เลือกครบทั้ง 8 หมวดแล้ว (จำไว้ในเบราว์เซอร์ชั่วคราว) · ขณะนี้ระบบยังปิดรับคะแนนจริง'):`เลือกแล้ว ${tally} จาก 8 หมวด · ต้องครบทุกหมวดก่อนส่ง`+(isOpen?'':' (ขณะนี้ระบบยังปิดรับคะแนนจริง)');
  $('submit').disabled=!configured||!isOpen||tally!==8||submitting;
  $('submit').textContent=submitting?'กำลังบันทึกคะแนน…':(!isOpen?'รอผู้จัดงานเปิดรับคะแนน':'บันทึกคะแนนของฉัน ↗');
}
$('prev').addEventListener('click',()=>{step=Math.max(0,step-1);render()});
$('next').addEventListener('click',()=>{if(step<7){step++;render();document.querySelector('.category-heading').scrollIntoView({behavior:scrollBehavior(),block:'center'})}else{$('token').focus();$('token').scrollIntoView({behavior:scrollBehavior(),block:'center'})}});
$('token').addEventListener('input',()=>{$('token').value=formatInviteCode($('token').value)});
$('submit').addEventListener('click',async()=>{
  if(submitting)return;
  const code=formatInviteCode($('token').value.trim());
  $('token').value=code;
  if(!/^CCR26(?:-[A-Z2-9]{5}){4}$/.test(code))return show('รูปแบบรหัสไม่ถูกต้อง ตรวจรหัสเชิญส่วนตัวจากผู้จัดงานอีกครั้ง',true);
  if(keys.some(k=>!selected[k]))return show('กรุณาเลือกเมนูให้ครบ 8 หมวด',true);
  if(!isOpen)return show('ระบบยังปิดรับคะแนน',true);
  submitting=true;render();show('กำลังส่งคะแนนเข้าสู่ฐานข้อมูลกลาง…');
  try{
    const r=await api('submit',{code,catalogVersion,choices:Object.fromEntries(keys.map(k=>[k,selected[k]]))});
    success=true;$('token').value='';
    show('บันทึกสำเร็จ ✓ รหัสใบโหวต: '+r.receipt+' · '+new Date(r.saved_at).toLocaleString('th-TH')+' · แก้ไขได้ด้วยรหัสเดิมก่อนปิดโหวต');
    save();
  }catch(e){show('ยังยืนยันการบันทึกไม่ได้: '+e.message+' · โปรดตรวจเครือข่ายและลองใหม่',true)}
  finally{submitting=false;render()}
});
async function init(){
  try{
    const catalog=await getCatalog();
    cats=catalog.categories;catalogVersion=catalog.catalogVersion;
    for(const [k,id] of Object.entries(selected))if(!cats.find(c=>c.key===k)?.options.some(o=>o.id===id))delete selected[k];
    render();
    if(catalog.offlineFallback){isOpen=false;status('แสดงเมนูตัวอย่าง (เชื่อมต่อฐานข้อมูลกลางไม่ได้ชั่วคราว — ยังส่งคะแนนไม่ได้)','closed');render();return}
    if(!configured){status('ยังไม่ได้เชื่อมต่อฐานข้อมูลกลาง — ห้ามส่งคะแนน','error');return}
    const r=await api('status');isOpen=!!r.open;
    status(isOpen?'เปิดรับคะแนน · ส่งคะแนนได้จากทุกอุปกรณ์':'ระบบพร้อมใช้งานแต่ยังปิดรับคะแนน',''+(isOpen?'':'closed'));
    render();
  }catch(e){status('เชื่อมต่อระบบไม่ได้: '+e.message,'error');isOpen=false;render()}
}
init();
