import {
  configured,
  getCatalog,
  api,
  money,
  escapeHTML,
  formatInviteCode,
  VOTE_PICKS_KEY,
  VOTE_SAVED_KEY,
  getSharedToken,
  setSharedToken,
  renderJourneyProgress
} from './common.js';
import { FIXED_ALLOWANCE, lineCost } from './decision-engine.js';

const $ = id => document.getElementById(id);
let cats = [];
let step = 0;
let selected = {};
let isOpen = false;
let submitting = false;
let success = false;
let savedBallot = null;
let catalogVersion = null;
const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const CATEGORY_VISUALS = {
  A: {
    img: './assets/food-tomyum-pot.jpg',
    tag: 'CATEGORY A · ซุป / ต้มยำ / แกงหม้อไฟ',
    title: 'ต้มยำหม้อไฟและเมนูแกงเสิร์ฟร้อนจากครัวซอย 11',
    caption: 'หมวดซุปและต้มยำเสิร์ฟหม้อไฟร้อน ๆ สำหรับซดคล่องคอกลางโต๊ะ (คำนวณเสิร์ฟ 2 ที่ต่อโต๊ะ)'
  },
  B: {
    img: './assets/food-seafood-dip.jpg',
    tag: 'CATEGORY B · ปลา / ซีฟู้ดจานหลัก',
    title: 'เมนูปลากะพงและซีฟู้ดจานหลักประจำโต๊ะ',
    caption: 'จานหลักกลางโต๊ะที่ทุกคนแชร์ร่วมกัน เสิร์ฟพร้อมน้ำจิ้มซีฟู้ดรสจัดจ้านของทางร้าน'
  },
  C: {
    img: './assets/food-garlic-pork.jpg',
    tag: 'CATEGORY C · หมู / ไก่ / เป็ด / เนื้อ',
    title: 'หมูทอดกระเทียมและเมนูเนื้อสัตว์จานร้อน',
    caption: 'เมนูเนื้อสัตว์จานหลักทานคู่ข้าวสวยร้อน ๆ รสชาติกลมกล่อมถูกปากทุกคนในทีม'
  },
  D: {
    img: './assets/food-crispy-squid.jpg',
    tag: 'CATEGORY D · กุ้ง / หมึก / หอย',
    title: 'หมึกกรอบคั่วพริกเกลือและเมนูอาหารทะเล',
    caption: 'เมนูอาหารทะเลผัด/ทอดทรงเครื่อง หอมกระเทียมพริกไทย เคี้ยวเพลินตลอดมื้อ'
  },
  E: {
    img: './assets/food-stirfry-duo.jpg',
    tag: 'CATEGORY E · ผัดผัก / จานผัดกลมกล่อม',
    title: 'จานผัดร้อน ๆ จากเตา เสิร์ฟคู่ตัดรสในโต๊ะ',
    caption: 'ช่วยเพิ่มความสมดุลให้มื้ออาหาร มีทั้งผัดผักกรอบ ๆ และจานผัดรสเข้มข้น'
  },
  F: {
    img: './assets/food-seafood-salad.jpg',
    tag: 'CATEGORY F · ยำ / ลาบ / รสจัดจ้าน',
    title: 'ยำทะเลรวมมิตรและเมนูรสแซ่บเรียกน้ำย่อย',
    caption: 'จานรสจัดจ้านช่วยชูรสชาติให้โต๊ะอาหารคึกคักและตัดเลี่ยนได้อย่างลงตัว'
  },
  G: {
    img: './assets/food-grilled-pork.jpg',
    tag: 'CATEGORY G · ของทอด / ย่าง / กับแกล้ม',
    title: 'หมูย่างจิ้มแจ่วและเมนูทานเล่นระหว่างพูดคุย',
    caption: 'จานย่างและของทอดหอมกรุ่น ทานง่ายระหว่างพูดคุยและร่วมกิจกรรมจับของขวัญ'
  },
  H: {
    img: './assets/food-fried-strips.jpg',
    tag: 'CATEGORY H · จานปิดท้าย / อิ่มท้อง',
    title: 'เมนูทานเล่นและจานเสริมความอิ่มประจำโต๊ะ',
    caption: 'เติมเต็มมื้อค่ำให้ครบทั้ง 8 หมวด พร้อมสำรองข้าวสวยและเครื่องดื่มพื้นฐานในงบโต๊ะ'
  }
};

const scrollBehavior = () =>
  matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

try {
  const fromLocal = JSON.parse(localStorage.getItem(VOTE_PICKS_KEY) || '{}');
  const fromSession = JSON.parse(sessionStorage.getItem('ccr_vote_choices_v3') || '{}');
  const merged = { ...fromSession, ...fromLocal };
  if (merged && typeof merged === 'object' && !Array.isArray(merged)) {
    selected = merged;
  }
  const savedRaw = JSON.parse(localStorage.getItem(VOTE_SAVED_KEY) || 'null');
  if (savedRaw && savedRaw.savedAt) {
    savedBallot = savedRaw;
    if (savedRaw.picks && Object.keys(selected).length === 0) {
      selected = { ...savedRaw.picks };
    }
  }
} catch {}

function saveDraft() {
  try {
    sessionStorage.setItem('ccr_vote_choices_v3', JSON.stringify(selected));
    localStorage.setItem(VOTE_PICKS_KEY, JSON.stringify(selected));
  } catch {}
  renderJourneyProgress();
}

function saveConfirmedBallot(receiptCode = null) {
  const rows = cats
    .filter(cat => selected[cat.key])
    .map(cat => {
      const opt = cat.options.find(o => o.id === selected[cat.key]);
      return opt
        ? {
            key: cat.key,
            categoryLabel: cat.label,
            id: opt.id,
            name: opt.name,
            qty: opt.qty,
            price: opt.price,
            lineTotal: lineCost(opt)
          }
        : null;
    })
    .filter(Boolean);
  const food = rows.reduce((sum, r) => sum + r.lineTotal, 0);
  const total = food + FIXED_ALLOWANCE;
  savedBallot = {
    picks: { ...selected },
    items: rows,
    foodTotal: food,
    grandTotal: total,
    receipt: receiptCode || (savedBallot && savedBallot.receipt) || 'LOCAL-' + Date.now().toString(36).toUpperCase(),
    savedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(VOTE_SAVED_KEY, JSON.stringify(savedBallot));
    localStorage.setItem(VOTE_PICKS_KEY, JSON.stringify(selected));
    sessionStorage.setItem('ccr_vote_choices_v3', JSON.stringify(selected));
  } catch {}
  renderJourneyProgress();
  return savedBallot;
}

function status(message, type = '') {
  const s = $('globalStatus');
  if (!s) return;
  s.className = 'system-status ' + type;
  s.innerHTML = '<span class="status-dot"></span><span>' + escapeHTML(message) + '</span>';
}

function show(message, bad = false, extraHtml = '') {
  const el = $('submitStatus');
  if (!el) return;
  el.innerHTML =
    '<div class="flash-message ' +
    (bad ? 'bad' : '') +
    '" role="status">' +
    escapeHTML(message) +
    extraHtml +
    '</div>';
}

function render(restoreFocusId = '') {
  if (cats.length !== 8) return;
  const c = cats[step];
  const tally = keys.filter(k => selected[k]).length;

  $('chosenCount').textContent = String(tally);
  if ($('receiptCountInline')) $('receiptCountInline').textContent = `${tally}/8`;
  $('categoryNumber').textContent = String(step + 1).padStart(2, '0');
  $('categoryTitle').textContent = `${c.icon || ''} หมวด ${c.key} · ${c.label}`;
  $('categoryDescription').textContent = c.desc || '';

  const vis = CATEGORY_VISUALS[c.key] || CATEGORY_VISUALS.A;
  if ($('categoryPhoto')) {
    $('categoryPhoto').src = vis.img;
    $('categoryPhoto').alt = vis.title;
  }
  if ($('categoryPhotoTag')) $('categoryPhotoTag').textContent = vis.tag;
  if ($('categoryPhotoTitle')) $('categoryPhotoTitle').textContent = vis.title;
  if ($('categoryPhotoCaption')) $('categoryPhotoCaption').textContent = vis.caption;

  if ($('helperProgressText')) {
    if (tally === 8) {
      $('helperProgressText').innerHTML =
        '<b style="color:#0d5c46">✓ เลือกครบทั้ง 8 หมวดแล้ว!</b> กดปุ่ม <b>“บันทึกคะแนนของฉัน”</b> ทางขวา (หรือด้านล่าง) เพื่อยืนยันชุดเมนูได้ทันที';
    } else {
      const missingKeys = keys.filter(k => !selected[k]);
      $('helperProgressText').innerHTML = `เลือกแล้ว <b>${tally}/8 หมวด</b> · ยังขาดหมวด <b>${missingKeys.join(', ')}</b>`;
    }
  }

  $('categoryTabs').innerHTML = cats
    .map(
      (cat, i) =>
        `<button type="button" role="tab" tabindex="${i === step ? '0' : '-1'}" aria-selected="${
          i === step
        }" aria-label="หมวด ${cat.key} ${escapeHTML(cat.label)}${
          selected[cat.key] ? ' เลือกแล้ว' : ''
        }" class="category-tab ${i === step ? 'active' : ''} ${
          selected[cat.key] ? 'done' : ''
        }" data-tab="${i}">${cat.key}${selected[cat.key] ? ' ✓' : ''}</button>`
    )
    .join('');

  const tabBtns = [...document.querySelectorAll('[data-tab]')];
  tabBtns.forEach((el, idx) => {
    el.addEventListener('click', () => {
      step = Number(el.dataset.tab);
      render();
      document.querySelector('.category-heading')?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    });
    el.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      if (e.key === 'Home') step = 0;
      else if (e.key === 'End') step = cats.length - 1;
      else step = (idx + (e.key === 'ArrowRight' ? 1 : -1) + cats.length) % cats.length;
      render();
      document.querySelector(`[data-tab="${step}"]`)?.focus();
    });
  });

  $('voteForm').innerHTML = c.options
    .map(o => {
      const unavail = o.availabilityStatus === 'unavailable';
      const picked = selected[c.key] === o.id;
      return `<label class="choice ${picked ? 'selected' : ''} ${
        unavail ? 'unavailable' : ''
      }"><input type="radio" name="categoryPick" value="${escapeHTML(o.id)}" ${
        picked ? 'checked' : ''
      } ${unavail ? 'disabled' : ''} aria-label="${escapeHTML(
        o.name
      )}"><span class="choice-details"><span class="choice-title">${escapeHTML(
        o.name
      )}</span><span class="choice-desc">${escapeHTML(o.note || 'อาหารจานกลาง')} · ${Number(
        o.qty
      )} ${o.portionCheck ? 'ชุด / ตรวจขนาด' : 'รายการเสิร์ฟ'}${
        o.portionCheck ? ' · ตรวจปริมาณกับร้าน' : ''
      }</span><span class="data-badges"><small>ราคาอ้างอิงครัวซอย 11</small>${
        unavail ? '<small class="danger-badge">งดชั่วคราว</small>' : ''
      }</span></span><span class="choice-price">${money(lineCost(o))}<small>${money(
        o.price
      )}/ที่</small></span></label>`;
    })
    .join('');

  document.querySelectorAll('input[name=categoryPick]').forEach(el =>
    el.addEventListener('change', () => {
      selected[c.key] = el.value;
      success = false;
      saveDraft();
      render(el.value);
    })
  );

  if (restoreFocusId) {
    const targetInput = [...document.querySelectorAll('input[name=categoryPick]')].find(
      i => i.value === restoreFocusId
    );
    targetInput?.focus({ preventScroll: true });
  }

  $('prev').disabled = step === 0;
  $('next').textContent = step === 7 ? 'ไปกล่องบันทึกคะแนน ↓' : 'หมวดถัดไป →';

  const rows = cats
    .filter(cat => selected[cat.key])
    .map(cat => ({ cat, opt: cat.options.find(o => o.id === selected[cat.key]) }))
    .filter(r => r.opt);
  const food = rows.reduce((sum, r) => sum + lineCost(r.opt), 0);
  const total = food + FIXED_ALLOWANCE;

  $('summary').innerHTML = rows.length
    ? rows
        .map(
          r =>
            `<div class="receipt-row"><span class="receipt-key">${
              r.cat.key
            }</span><span class="receipt-name">${escapeHTML(r.opt.name)}<br><span class="muted small">${
              r.opt.qty
            } ที่ · หมวด ${r.cat.key}</span></span><span class="receipt-sum">${money(
              lineCost(r.opt)
            )}</span></div>`
        )
        .join('')
    : '<p class="muted small">ยังไม่มีเมนูที่เลือก เริ่มคลิกเลือกจากหมวด A หรือกดปุ่ม “ลองเลือกชุดแนะนำครบ 8 หมวด” ได้เลย</p>';

  $('foodTotal').textContent = money(food);
  $('grandTotal').textContent = money(total);

  const badge = $('budgetTag');
  badge.textContent =
    total > 2200
      ? 'เกินเพดานพิจารณา ฿2,200 · ผลโหวตใช้จัดอันดับความนิยม'
      : total > 2000
      ? 'อยู่ในกรอบเพดาน ฿2,200 (เกินงบหลัก ฿2,000 เล็กน้อย)'
      : '✓ อยู่ในงบเป้าหมายหลัก ฿2,000 ต่อโต๊ะ';
  badge.style.background = total > 2200 ? '#fff0ee' : total > 2000 ? '#fff4df' : '#edf6ed';
  badge.style.color = total > 2200 ? '#9d3636' : total > 2000 ? '#87601f' : '#347050';

  const hasSaved = Boolean(savedBallot && savedBallot.savedAt);
  if (success || hasSaved) {
    const timeStr = savedBallot?.savedAt
      ? new Date(savedBallot.savedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : '';
    $('reviewStatus').innerHTML =
      tally === 8
        ? `✓ บันทึกชุดเมนูครบ 8 หมวดเรียบร้อยแล้ว${timeStr ? ` (เมื่อ ${escapeHTML(timeStr)} น.)` : ''} · เปลี่ยนเมนูแล้วกดบันทึกซ้ำได้ตลอด`
        : `เลือกแล้ว ${tally} จาก 8 หมวด · เลือกให้ครบ 8 หมวดเพื่ออัปเดตการบันทึก`;
  } else {
    $('reviewStatus').textContent =
      tally === 8
        ? '✓ เลือกครบทั้ง 8 หมวดแล้ว! กดปุ่ม “บันทึกคะแนนของฉัน” ด้านล่างได้เลย'
        : `เลือกแล้ว ${tally} จาก 8 หมวด · คลิกเลือกให้ครบทุกหมวดก่อนบันทึก`;
  }

  // Keep #submit clickable whenever not actively submitting so users never hit a dead disabled button
  $('submit').disabled = submitting;
  if (submitting) {
    $('submit').textContent = 'กำลังบันทึกคะแนน…';
  } else if (tally < 8) {
    const missingKey = keys.find(k => !selected[k]) || 'A';
    $('submit').textContent = `เลือกให้ครบ 8 หมวด (${tally}/8) · ไปหมวด ${missingKey} →`;
  } else if (isOpen && $('token')?.value.trim()) {
    $('submit').textContent = 'บันทึกและส่งคะแนนด้วยรหัสเชิญ ↗';
  } else {
    $('submit').textContent = hasSaved ? 'อัปเดตการบันทึกชุดเมนูของฉัน ✓' : 'บันทึกคะแนนของฉัน ✓';
  }
}

$('prev').addEventListener('click', () => {
  step = Math.max(0, step - 1);
  render();
});

$('next').addEventListener('click', () => {
  if (step < 7) {
    step++;
    render();
    document.querySelector('.category-heading')?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
  } else {
    $('saveVoteBox')?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    $('submit')?.focus();
  }
});

$('quickSample')?.addEventListener('click', () => {
  if (!cats.length) return;
  cats.forEach(cat => {
    if (!selected[cat.key]) {
      const avail = cat.options.filter(o => o.availabilityStatus !== 'unavailable');
      if (avail.length) selected[cat.key] = avail[0].id;
    }
  });
  // If already all selected, pick first available of each category
  if (keys.every(k => selected[k])) {
    cats.forEach(cat => {
      const avail = cat.options.filter(o => o.availabilityStatus !== 'unavailable');
      if (avail.length && !selected[cat.key]) selected[cat.key] = avail[0].id;
    });
  }
  saveDraft();
  render();
  show('✓ เลือกชุดเมนูแนะนำครบทั้ง 8 หมวดให้แล้ว! คุณสามารถคลิกเปลี่ยนรายหมวด หรือกดปุ่ม “บันทึกคะแนนของฉัน” ได้เลย');
});

function handleClearAllPicks() {
  selected = {};
  success = false;
  try {
    localStorage.removeItem(VOTE_SAVED_KEY);
    localStorage.removeItem(VOTE_PICKS_KEY);
    sessionStorage.removeItem('ccr_vote_choices_v3');
  } catch {}
  savedBallot = null;
  step = 0;
  renderJourneyProgress();
  render();
  show('🗑️ ล้างคะแนนโหวตทั้งหมดของคุณแล้ว คุณสามารถเลือกเมนูใหม่ตั้งแต่หมวด A–H ได้เลยครับ');
}

$('clearPicks')?.addEventListener('click', handleClearAllPicks);
$('resetVoteBtn')?.addEventListener('click', handleClearAllPicks);

if ($('token')) {
  const existingToken = getSharedToken();
  if (existingToken) $('token').value = existingToken;
  $('token').addEventListener('input', () => {
    const formatted = formatInviteCode($('token').value);
    $('token').value = formatted;
    setSharedToken(formatted);
    render();
  });
}

$('submit').addEventListener('click', async () => {
  if (submitting) return;

  const missingIdx = cats.findIndex(c => !selected[c.key]);
  if (missingIdx !== -1) {
    step = missingIdx;
    render();
    document.querySelector('.category-heading')?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    return show(
      `ยังเลือกไม่ครบ 8 หมวด — ขาดหมวด ${cats[missingIdx].key} (${cats[missingIdx].label}) ระบบเปิดหมวดนี้ให้คุณเลือกต่อแล้ว`,
      true
    );
  }

  const rawCode = $('token') ? $('token').value.trim() : '';
  const code = formatInviteCode(rawCode);
  if ($('token') && rawCode) {
    $('token').value = code;
    setSharedToken(code);
  }

  // Always save confirmed ballot locally so user never loses their work
  const localReceipt = saveConfirmedBallot();
  success = true;
  render();

  const nextStepButtons =
    '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn btn-dark" style="padding:8px 14px;font-size:.84rem;text-decoration:none" href="./guide.html">ไปขั้นที่ 4: ดูบัตรสรุปของฉัน & คู่มือวันงาน ↗</a></div>';

  if (!code || !isOpen || !configured) {
    const msgText = !isOpen
      ? `✓ บันทึกชุดเมนูทั้ง 8 หมวดของคุณไว้เรียบร้อยแล้ว! (รหัสใบสรุป: ${localReceipt.receipt} · รวม ${money(
          localReceipt.grandTotal
        )}/โต๊ะ) ข้อมูลแสดงในหน้าสรุปคู่มือวันงานทันที · เมื่อผู้จัดเปิดรับคะแนนออนไลน์ สามารถใส่รหัสเชิญเพื่อส่งเข้าระบบกลางได้`
      : `✓ บันทึกชุดเมนูทั้ง 8 หมวดไว้ในเครื่องเรียบร้อยแล้ว! (รวม ${money(
          localReceipt.grandTotal
        )}/โต๊ะ) หากมีรหัสเชิญ CCR26-... สามารถกรอกแล้วกดบันทึกซ้ำเพื่อส่งเข้าระบบกลางได้ทันที`;
    return show(msgText, false, nextStepButtons);
  }

  if (!/^CCR26(?:-[A-Z2-9]{5}){4}$/.test(code)) {
    return show(
      `✓ บันทึกชุดเมนูทั้ง 8 หมวดไว้ในเครื่องแล้ว (${money(
        localReceipt.grandTotal
      )}/โต๊ะ) · แต่รูปแบบรหัสเชิญไม่ถูกต้อง (ตัวอย่าง CCR26-XXXXX-XXXXX-XXXXX-XXXXX) กรุณาตรวจสอบรหัสเชิญหากต้องการส่งเข้าระบบกลาง`,
      true,
      nextStepButtons
    );
  }

  submitting = true;
  render();
  show('กำลังส่งคะแนนเข้าสู่ฐานข้อมูลกลาง…');
  try {
    const r = await api('submit', {
      code,
      catalogVersion,
      choices: Object.fromEntries(keys.map(k => [k, selected[k]]))
    });
    saveConfirmedBallot(r.receipt);
    success = true;
    show(
      '✓ บันทึกเข้าระบบกลางและในเครื่องสำเร็จ! รหัสใบโหวต: ' +
        r.receipt +
        ' · ' +
        new Date(r.saved_at).toLocaleString('th-TH') +
        ' · แก้ไขได้ด้วยรหัสเดิมก่อนปิดโหวต',
      false,
      nextStepButtons
    );
  } catch (e) {
    show(
      `✓ บันทึกชุดเมนูไว้ในเครื่องแล้ว (${localReceipt.receipt}) · แต่ส่งเข้าระบบกลางไม่สำเร็จ: ` + e.message,
      true,
      nextStepButtons
    );
  } finally {
    submitting = false;
    render();
  }
});

async function init() {
  renderJourneyProgress();
  try {
    const catalog = await getCatalog();
    cats = catalog.categories;
    catalogVersion = catalog.catalogVersion;
    for (const [k, id] of Object.entries(selected)) {
      if (!cats.find(c => c.key === k)?.options.some(o => o.id === id)) {
        delete selected[k];
      }
    }
    render();
    if (catalog.offlineFallback) {
      isOpen = false;
      status(
        'พร้อมให้เลือกเมนูทั้ง 8 หมวดและกดบันทึกเก็บไว้ในเครื่องได้ทันที (โหมดออฟไลน์)',
        'closed'
      );
      render();
      return;
    }
    if (!configured) {
      status('พร้อมให้เลือกเมนูทั้ง 8 หมวดและกดบันทึกไว้ในเครื่องได้ทันที', 'closed');
      return;
    }
    const r = await api('status');
    isOpen = !!r.open;
    status(
      isOpen
        ? 'เปิดรับคะแนนออนไลน์ · เลือกครบ 8 หมวดแล้วกดบันทึกได้ทันที'
        : 'คุณสามารถเลือกเมนูครบ 8 หมวดแล้วกด “บันทึกคะแนนของฉัน” เพื่อเก็บชุดเมนูไว้ในเครื่องและดูในหน้าสรุปได้ทันที (ระบบส่งออนไลน์รอผู้จัดเปิดรอบโหวต)',
      isOpen ? '' : 'closed'
    );
    render();
  } catch (e) {
    status(
      'คุณสามารถเลือกเมนูครบ 8 หมวดแล้วกด “บันทึกคะแนนของฉัน” เพื่อเก็บไว้ในเครื่องได้ทันที',
      'closed'
    );
    isOpen = false;
    render();
  }
}

init();
