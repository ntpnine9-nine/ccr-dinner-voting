import {
  api,
  configured,
  escapeHTML,
  formatInviteCode,
  PARTY_STORAGE_KEY,
  PARTY_LABELS,
  getSharedToken,
  getDeviceToken,
  setSharedToken,
  renderJourneyProgress
} from './common.js?v=20261022-cloud1';

const $ = id => document.getElementById(id);
const state = { attendance: '', giftChoice: '', themeChoice: '', savedAt: null };
let isOpen = false;
let votingMode = 'invite';
let saving = false;

try {
  const fromLocal = JSON.parse(localStorage.getItem(PARTY_STORAGE_KEY) || '{}');
  const fromSession = JSON.parse(sessionStorage.getItem('ccr_party_choices_v1') || '{}');
  Object.assign(state, fromSession, fromLocal);
} catch {}

function saveLocal(markConfirmed = false, savedAt = null) {
  if (markConfirmed) {
    state.savedAt = savedAt || new Date().toISOString();
    state.cloudConfirmed = true;
  } else {
    state.savedAt = null;
    state.cloudConfirmed = false;
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

  const savedBadge = (state.cloudConfirmed && state.savedAt)
    ? `<br><small style="color:#a7f3d0">✓ บันทึกลงระบบกลางแล้วเมื่อ ${escapeHTML(new Date(state.savedAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }))} น. · ข้อมูลซิงก์ไปหน้าสรุปแล้ว</small>`
    : (complete
      ? '<br><small>ฉบับร่างในเครื่องนี้เท่านั้น ยังไม่ได้ส่งเข้าระบบกลาง — กดปุ่มบันทึกเพื่อส่งเข้าระบบกลาง</small>'
      : '<br><small>เลือกครบ 3 ข้อแล้วกดปุ่ม “บันทึกตัวเลือกของฉัน” เพื่อส่งเข้าระบบกลาง</small>');

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
  window.addEventListener('hashchange', () => {
    const fromHash = getSharedToken();
    if (fromHash && $('prefToken').value !== fromHash) {
      $('prefToken').value = fromHash;
      render();
    }
  });
}

function msg(t, type = 'normal', actionHtml = '') {
  if (!$('prefMessage')) return;
  let cls = 'flash-message';
  if (type === true || type === 'bad' || type === 'error') cls += ' bad';
  else if (type === 'warn' || type === 'amber') cls += ' warn';
  else if (type === 'good' || type === 'success') cls += ' good';
  $('prefMessage').innerHTML = `<div class="${cls}">${escapeHTML(t)}${actionHtml}</div>`;
}

$('savePreferences')?.addEventListener('click', async () => {
  if (!state.attendance) {
    document.getElementById('blockAttendance')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return msg('กรุณาเลือกข้อ 01: สถานะการมาร่วมงาน (RSVP) ก่อนบันทึก', 'bad');
  }
  if (!state.giftChoice) {
    document.getElementById('blockGift')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return msg('กรุณาเลือกข้อ 02: รูปแบบการจับของขวัญ ก่อนบันทึก', 'bad');
  }
  if (!state.themeChoice) {
    document.getElementById('blockTheme')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return msg('กรุณาเลือกข้อ 03: โทนสีการแต่งกาย (Visual Mood) ก่อนบันทึก', 'bad');
  }

  // Save as local draft so user work is never lost
  saveLocal(false);
  render();

  const rawCode = $('prefToken') ? $('prefToken').value.trim() : '';
  const code = formatInviteCode(rawCode);
  if ($('prefToken') && rawCode) {
    $('prefToken').value = code;
    setSharedToken(code);
  }

  // Refresh admission at submission time: a page may have been open for hours.
  try {
    const admission = await api('status');
    isOpen = !!admission.open;
    votingMode = admission.votingMode || 'invite';
  } catch (e) {
    return msg('ตรวจสถานะระบบกลางไม่สำเร็จ: ' + e.message + ' — ยังไม่ได้ส่งข้อมูล กรุณาลองใหม่', 'bad');
  }

  // State B: Campaign Closed
  if (!isOpen) {
    return msg(
      'ขณะนี้ยังไม่เปิดรับคำตอบ (ระบบกลางปิดรับคะแนน) — ตัวเลือกทั้ง 3 ข้อถูกเก็บเป็นฉบับร่างในเครื่องนี้เท่านั้น ยังไม่ได้ส่งเข้าระบบกลาง',
      'warn'
    );
  }

  // State C: Missing or Invalid Code
  if ((code && !/^CCR26(?:-[A-Z2-9]{5}){4}$/.test(code)) || (!code && votingMode !== 'open')) {
    return msg(
      'กรุณากรอกรหัสเชิญส่วนตัว (รูปแบบ CCR26-XXXXX-XXXXX-XXXXX-XXXXX) เพื่อส่งคำตอบเข้าระบบกลาง — ตัวเลือกทั้ง 3 ข้อถูกเก็บเป็นฉบับร่างในเครื่องนี้เท่านั้น ยังไม่ได้ส่งเข้าระบบกลาง',
      'warn'
    );
  }

  if (!configured) {
    return msg(
      'ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูลกลาง — ตัวเลือกทั้ง 3 ข้อถูกเก็บเป็นฉบับร่างในเครื่องนี้เท่านั้น ยังไม่ได้ส่งเข้าระบบกลาง',
      'bad'
    );
  }

  saving = true;
  render();
  msg('กำลังบันทึกตัวเลือกของคุณเข้าระบบกลาง…', 'normal');

  const nextActionHtml = ' <div style="margin-top:10px"><a class="event-btn event-btn-light" style="padding:8px 14px;font-size:.86rem" href="./vote.html">ไปขั้นที่ 3: โหวตเมนูอาหาร 8 หมวด ↗</a> <a class="event-btn event-btn-ghost" style="padding:8px 14px;font-size:.86rem" href="./guide.html">ดูหน้าสรุปของฉัน ↗</a></div>';

  try {
    const r = await api('preferences.submit', {
      code,
      deviceToken: code ? undefined : getDeviceToken(),
      attendance: state.attendance,
      giftChoice: state.giftChoice,
      themeChoice: state.themeChoice
    });
    if (!r.saved_at) throw Error('ระบบยังไม่ยืนยันการบันทึก กรุณาลองส่งใหม่');
    state.receipt = r.receipt || null;
    saveLocal(true, r.saved_at);
    const timeStr = r.saved_at ? new Date(r.saved_at).toLocaleString('th-TH') : '';
    msg(
      `✓ บันทึกลงระบบกลางแล้ว · ยืนยันข้อมูลเรียบร้อย${timeStr ? ` (${timeStr})` : ''}${r.receipt ? ` · ใบรับ: ${r.receipt}` : ''}`,
      'good',
      nextActionHtml
    );
  } catch (e) {
    // State D: Network/Server Error
    const retryBtn = '<div style="margin-top:10px"><button type="button" class="event-btn event-btn-light" id="retryPartyBtn" style="padding:8px 16px;font-size:.85rem">ลองส่งใหม่อีกครั้ง ↻</button></div>';
    msg(
      `ส่งเข้าระบบกลางไม่สำเร็จ (${escapeHTML(e.message || 'NETWORK_ERROR')}) — ตัวเลือกถูกเก็บเป็นฉบับร่างในเครื่องนี้แล้ว`,
      'bad',
      retryBtn
    );
    setTimeout(() => {
      $('retryPartyBtn')?.addEventListener('click', () => {
        $('savePreferences')?.click();
      });
    }, 50);
  } finally {
    saving = false;
    render();
  }
});

$('resetPreferences')?.addEventListener('click', () => {
  state.attendance = '';
  state.giftChoice = '';
  state.themeChoice = '';
  state.savedAt = null;
  state.cloudConfirmed = false;
  try {
    localStorage.removeItem(PARTY_STORAGE_KEY);
    sessionStorage.removeItem('ccr_party_choices_v1');
  } catch {}
  render();
  renderJourneyProgress();
  msg('ล้างฉบับร่างในเครื่องแล้ว คำตอบในระบบกลางยังคงอยู่ — เลือกใหม่แล้วกดส่งเพื่ออัปเดตคำตอบเดิม');
});

async function init() {
  renderJourneyProgress();
  render();
  const box = $('partyStatus');
  if (!configured) {
    isOpen = false;
    box.className = 'system-status error';
    box.innerHTML = '<span class="status-dot"></span><span>โหมดบันทึกในเครื่องพร้อมใช้งาน (ยังไม่ได้เชื่อมฐานข้อมูลกลาง)</span>';
    return;
  }
  try {
    const r = await api('status');
    isOpen = !!r.open;
    votingMode = r.votingMode || 'invite';
    box.className = 'system-status ' + (isOpen ? '' : 'closed');
    box.innerHTML = `<span class="status-dot"></span><span>${
      isOpen
        ? 'เปิดรับคำตอบออนไลน์แล้ว · เลือกครบ 3 ข้อแล้วกดบันทึกได้เลย'
        : 'ขณะนี้ระบบกลางยังไม่เปิดรับคำตอบ — คุณสามารถเลือกและบันทึกเป็นฉบับร่างในเครื่องนี้ได้'
    }</span>`;
    render();
  } catch (e) {
    isOpen = false;
    box.className = 'system-status closed';
    box.innerHTML = '<span class="status-dot"></span><span>ขณะนี้ระบบกลางยังไม่เปิดรับคำตอบ — คุณสามารถเลือกและบันทึกเป็นฉบับร่างในเครื่องนี้ได้</span>';
    render();
  }
}

init();
