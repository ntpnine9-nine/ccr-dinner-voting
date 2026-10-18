import {
  api,
  configured,
  escapeHTML,
  formatInviteCode,
  PARTY_STORAGE_KEY,
  PARTY_LABELS,
  getSharedToken,
  setSharedToken,
  renderJourneyProgress
} from './common.js';

const $ = id => document.getElementById(id);
const state = { attendance: '', giftChoice: '', themeChoice: '', savedAt: null };
let isOpen = false;
let saving = false;

try {
  const fromLocal = JSON.parse(localStorage.getItem(PARTY_STORAGE_KEY) || '{}');
  const fromSession = JSON.parse(sessionStorage.getItem('ccr_party_choices_v1') || '{}');
  Object.assign(state, fromSession, fromLocal);
} catch {}

function saveLocal(markConfirmed = false) {
  if (markConfirmed) {
    state.savedAt = new Date().toISOString();
  }
  try {
    localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(state));
    sessionStorage.setItem('ccr_party_choices_v1', JSON.stringify(state));
  } catch {}
  renderJourneyProgress();
}

function render() {
  document.querySelectorAll('[data-group="attendance"] [data-value]').forEach(b => {
    const on = b.dataset.value === state.attendance;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-pressed', String(on));
  });
  document.querySelectorAll('[data-group="gift"] [data-value]').forEach(b => {
    const on = b.dataset.value === state.giftChoice;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-pressed', String(on));
  });
  document.querySelectorAll('[data-group="theme"] [data-value]').forEach(b => {
    const on = b.dataset.value === state.themeChoice;
    b.classList.toggle('selected', on);
    b.setAttribute('aria-pressed', String(on));
  });

  const count = [state.attendance, state.giftChoice, state.themeChoice].filter(Boolean).length;
  const complete = count === 3;
  const btn = $('savePreferences');
  if (btn) {
    btn.disabled = saving;
    if (saving) {
      btn.textContent = 'กำลังบันทึก…';
    } else if (!complete) {
      btn.textContent = `เลือกให้ครบ 3 หัวข้อ (${count}/3) · กดเพื่อดูหัวข้อที่ยังไม่ได้เลือก`;
    } else if (isOpen && $('prefToken')?.value.trim()) {
      btn.textContent = 'บันทึกและส่งคำตอบด้วยรหัสเชิญ ↗';
    } else {
      btn.textContent = state.savedAt ? 'อัปเดตตัวเลือกของฉัน ✓' : 'บันทึกตัวเลือกของฉัน ✓';
    }
  }

  const savedBadge = state.savedAt
    ? `<br><small style="color:#a7f3d0">✓ บันทึกไว้เรียบร้อยเมื่อ ${escapeHTML(new Date(state.savedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))} น. · ข้อมูลซิงก์ไปหน้าสรุปแล้ว</small>`
    : '<br><small>เลือกครบ 3 ข้อแล้ว กดปุ่ม “บันทึกตัวเลือกของฉัน” ด้านล่างได้เลย</small>';

  if ($('prefSummary')) {
    $('prefSummary').innerHTML = complete
      ? `<b>${escapeHTML(PARTY_LABELS.attendance[state.attendance])}</b> · ${escapeHTML(PARTY_LABELS.giftChoice[state.giftChoice])} · ${escapeHTML(PARTY_LABELS.themeChoice[state.themeChoice])}${savedBadge}`
      : `เลือกแล้ว ${count}/3 หัวข้อ — กรุณาเลือกให้ครบทั้ง 3 เรื่องก่อนบันทึก`;
  }
}

function pick(group, value) {
  if (group === 'attendance') state.attendance = value;
  if (group === 'gift') state.giftChoice = value;
  if (group === 'theme') state.themeChoice = value;
  saveLocal(false);
  render();
}

document.querySelectorAll('[data-group]').forEach(group => {
  const buttons = [...group.querySelectorAll('[data-value]')];
  buttons.forEach((btn, idx) => {
    btn.addEventListener('click', () => pick(group.dataset.group, btn.dataset.value));
    btn.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const dir = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : -1;
      const next = buttons[(idx + dir + buttons.length) % buttons.length];
      next.focus();
      pick(group.dataset.group, next.dataset.value);
    });
  });
});

if ($('prefToken')) {
  const existingToken = getSharedToken();
  if (existingToken) $('prefToken').value = existingToken;
  $('prefToken').addEventListener('input', () => {
    const formatted = formatInviteCode($('prefToken').value);
    $('prefToken').value = formatted;
    setSharedToken(formatted);
    render();
  });
}

function msg(t, bad = false, actionHtml = '') {
  if (!$('prefMessage')) return;
  $('prefMessage').innerHTML = `<div class="flash-message ${bad ? 'bad' : ''}">${escapeHTML(t)}${actionHtml}</div>`;
}

$('savePreferences')?.addEventListener('click', async () => {
  if (!state.attendance) {
    document.getElementById('blockAttendance')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return msg('กรุณาเลือกข้อ 01: สถานะการมาร่วมงาน (RSVP) ก่อนบันทึก', true);
  }
  if (!state.giftChoice) {
    document.getElementById('blockGift')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return msg('กรุณาเลือกข้อ 02: รูปแบบการจับของขวัญ ก่อนบันทึก', true);
  }
  if (!state.themeChoice) {
    document.getElementById('blockTheme')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return msg('กรุณาเลือกข้อ 03: โทนสีการแต่งกาย (Visual Mood) ก่อนบันทึก', true);
  }

  const rawCode = $('prefToken') ? $('prefToken').value.trim() : '';
  const code = formatInviteCode(rawCode);
  if ($('prefToken') && rawCode) {
    $('prefToken').value = code;
    setSharedToken(code);
  }

  // Always persist confirmed choices locally so the user never loses their selection
  saveLocal(true);
  render();

  const nextActionHtml = ' <div style="margin-top:10px"><a class="event-btn event-btn-light" style="padding:8px 14px;font-size:.86rem" href="./vote.html">ไปขั้นที่ 3: โหวตเมนูอาหาร 8 หมวด ↗</a> <a class="event-btn event-btn-ghost" style="padding:8px 14px;font-size:.86rem" href="./guide.html">ดูหน้าสรุปของฉัน ↗</a></div>';

  // If no invite code entered or campaign is currently closed, confirm local save immediately
  if (!code || !isOpen || !configured) {
    const note = !isOpen
      ? '✓ บันทึกตัวเลือกทั้ง 3 ข้อไว้ในเครื่องเรียบร้อยแล้ว! (ขณะนี้ระบบกลางยังไม่เปิดรับคำตอบจริง ข้อมูลของคุณแสดงในหน้าสรุปคู่มือวันงานทันที)'
      : '✓ บันทึกตัวเลือกทั้ง 3 ข้อไว้ในเครื่องเรียบร้อยแล้ว! (หากต้องการส่งเข้าระบบกลาง สามารถกรอกรหัสเชิญ CCR26-... แล้วกดบันทึกซ้ำได้)';
    return msg(note, false, nextActionHtml);
  }

  if (!/^CCR26(?:-[A-Z2-9]{5}){4}$/.test(code)) {
    return msg('✓ บันทึกไว้ในเครื่องแล้ว · แต่รูปแบบรหัสเชิญไม่ถูกต้อง (ตัวอย่าง CCR26-XXXXX-XXXXX-XXXXX-XXXXX) กรุณาตรวจสอบรหัสเชิญหากต้องการส่งเข้าระบบกลาง', true, nextActionHtml);
  }

  saving = true;
  render();
  msg('กำลังบันทึกตัวเลือกของคุณเข้าระบบกลาง…');
  try {
    const r = await api('preferences.submit', {
      code,
      attendance: state.attendance,
      giftChoice: state.giftChoice,
      themeChoice: state.themeChoice
    });
    saveLocal(true);
    msg(
      '✓ บันทึกเข้าระบบกลางและในเครื่องเรียบร้อย (' +
        new Date(r.saved_at).toLocaleString('th-TH') +
        ') · ใช้รหัสเดิมเพื่อแก้ไขได้ก่อนปิดโหวต',
      false,
      nextActionHtml
    );
  } catch (e) {
    msg('✓ บันทึกไว้ในเครื่องแล้ว · แต่ส่งเข้าระบบกลางไม่สำเร็จ: ' + e.message, true, nextActionHtml);
  } finally {
    saving = false;
    render();
  }
});

async function init() {
  renderJourneyProgress();
  render();
  const box = $('partyStatus');
  if (!configured) {
    box.className = 'system-status error';
    box.innerHTML = '<span class="status-dot"></span><span>โหมดบันทึกในเครื่องพร้อมใช้งาน (ยังไม่ได้เชื่อมฐานข้อมูลกลาง)</span>';
    return;
  }
  try {
    const r = await api('status');
    isOpen = !!r.open;
    box.className = 'system-status ' + (isOpen ? '' : 'closed');
    box.innerHTML = `<span class="status-dot"></span><span>${
      isOpen
        ? 'เปิดรับคำตอบออนไลน์แล้ว · เลือกครบ 3 ข้อแล้วกดบันทึกได้เลย'
        : 'คุณสามารถเลือกและกด “บันทึกตัวเลือกของฉัน” เพื่อเก็บคำตอบไว้ในเครื่องได้ทันที (ระบบส่งออนไลน์รอผู้จัดเปิดรอบโหวต)'
    }</span>`;
    render();
  } catch (e) {
    box.className = 'system-status closed';
    box.innerHTML = '<span class="status-dot"></span><span>คุณสามารถเลือกและกดบันทึกคำตอบไว้ในเครื่องได้ทันที</span>';
  }
}

init();
