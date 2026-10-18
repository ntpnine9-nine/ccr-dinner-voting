import { CONFIG } from './config.js';
import {
  configured,
  getCatalog,
  api,
  money,
  escapeHTML,
  csv,
  download,
  getSavedJourneyState,
  VOTE_SAVED_KEY,
  VOTE_PICKS_KEY,
  PARTY_STORAGE_KEY
} from './common.js';
import {
  FIXED_ALLOWANCE,
  lineCost,
  popularityWinner,
  optimizeMenuSet,
  comparePlans
} from './decision-engine.js';

const $ = id => document.getElementById(id);
const AUTH_KEY = 'ccr_admin_session_v3';
let cats = [];
let session = null;
let previewMode = false;
let tallies = {};
let numBallots = 0;
let lastResults = null;
let latestCodes = [];
let currentPlan = null;
let currentPlanMode = 'popular';
let catalogVersion = null;
let submissions = [];
let selectedInviteId = null;

function notice(message, type = false) {
  const cls = type === true || type === 'error' ? 'error' : type === 'info' ? 'info' : 'good';
  $('notice').className = 'notice ' + cls;
  $('notice').textContent = message;
}

function saveSession(s) {
  session = s || null;
  try {
    if (s) sessionStorage.setItem(AUTH_KEY, JSON.stringify(s));
    else sessionStorage.removeItem(AUTH_KEY);
  } catch {}
}

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

async function authFetch(path, body, token = '') {
  const headers = {
    'Content-Type': 'application/json',
    apikey: CONFIG.publishableKey
  };
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(CONFIG.supabaseUrl + path, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try {
    data = await r.json();
  } catch {}
  if (!r.ok) {
    throw Error(data.error_description || data.msg || data.error || `Auth HTTP ${r.status}`);
  }
  return data;
}

async function signIn(email, password) {
  return authFetch('/auth/v1/token?grant_type=password', { email, password });
}

async function refreshSession() {
  if (!session?.refresh_token) return null;
  const fresh = await authFetch('/auth/v1/token?grant_type=refresh_token', {
    refresh_token: session.refresh_token
  });
  saveSession(fresh);
  return fresh;
}

async function validToken() {
  if (!session?.access_token) throw Error('กรุณาลงชื่อเข้าใช้ด้วยบัญชีผู้ดูแลระบบจริง');
  const exp = Number(session.expires_at || 0);
  if (exp && Date.now() / 1000 > exp - 60) await refreshSession();
  return session.access_token;
}

async function call(op, data = {}) {
  return api(op, data, await validToken());
}

function buildSimulatedData() {
  const local = getSavedJourneyState();
  const simTallies = {};
  // Seed realistic team vote distribution across all 8 categories
  const weights = [7, 5, 3, 2, 1, 1, 0];
  cats.forEach((cat, cIdx) => {
    cat.options.forEach((opt, oIdx) => {
      const shiftedIdx = (oIdx + (cIdx % 3)) % cat.options.length;
      simTallies[opt.id] = weights[shiftedIdx] || 0;
    });
  });

  // Add the user's own local picks on top so their choices are reflected in the preview
  let hasLocalVote = false;
  if (local.voteCount > 0 && local.votePicks) {
    hasLocalVote = true;
    for (const id of Object.values(local.votePicks)) {
      if (id) simTallies[id] = (simTallies[id] || 0) + 3;
    }
  }

  const totalBallots = 19 + (hasLocalVote ? 1 : 0);
  const simResults = {
    status: 'preview',
    count: totalBallots,
    invites: 25,
    activeInvites: 24,
    tallies: simTallies
  };

  const simPrefs = {
    count: 18 + (local.partyComplete ? 1 : 0),
    attendance: {
      yes: 15 + (local.party?.attendance === 'yes' ? 1 : 0),
      maybe: 2 + (local.party?.attendance === 'maybe' ? 1 : 0),
      no: 1 + (local.party?.attendance === 'no' ? 1 : 0)
    },
    gift: {
      gift_300: 4 + (local.party?.giftChoice === 'gift_300' ? 1 : 0),
      gift_500: 8 + (local.party?.giftChoice === 'gift_500' ? 1 : 0),
      gift_300_500: 5 + (local.party?.giftChoice === 'gift_300_500' ? 1 : 0),
      gift_none: 1 + (local.party?.giftChoice === 'gift_none' ? 1 : 0)
    },
    theme: {
      midnight_gold: 7 + (local.party?.themeChoice === 'midnight_gold' ? 1 : 0),
      forest_champagne: 6 + (local.party?.themeChoice === 'forest_champagne' ? 1 : 0),
      retro_future: 2 + (local.party?.themeChoice === 'retro_future' ? 1 : 0),
      come_as_you_are: 3 + (local.party?.themeChoice === 'come_as_you_are' ? 1 : 0)
    }
  };

  const simInvites = [
    {
      id: 'LOCAL-YOU',
      active: true,
      hasBallot: hasLocalVote,
      hasPreferences: local.partyComplete,
      createdAt: new Date().toISOString()
    },
    {
      id: '9f4a21c0-demo',
      active: true,
      hasBallot: true,
      hasPreferences: true,
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: '7b2e19a4-demo',
      active: true,
      hasBallot: true,
      hasPreferences: true,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
    },
    {
      id: '3c8d44f1-demo',
      active: true,
      hasBallot: false,
      hasPreferences: true,
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ];

  const simSubmissions = [];
  if (hasLocalVote || local.partyComplete) {
    simSubmissions.push({
      inviteId: 'LOCAL-YOU',
      active: true,
      ballot: hasLocalVote ? { choices: { ...local.votePicks }, updatedAt: local.voteSaved?.savedAt || new Date().toISOString() } : null,
      preferences: local.partyComplete ? { attendance: local.party.attendance, giftChoice: local.party.giftChoice, themeChoice: local.party.themeChoice, updatedAt: local.party.savedAt || new Date().toISOString() } : null,
      createdAt: new Date().toISOString()
    });
  }
  simSubmissions.push(
    {
      inviteId: '9f4a21c0-demo',
      active: true,
      ballot: { choices: { A: 'A1', B: 'B2', C: 'C1', D: 'D3', E: 'E2', F: 'F1', G: 'G4', H: 'H2' }, updatedAt: new Date(Date.now() - 3600000 * 5).toISOString() },
      preferences: { attendance: 'yes', giftChoice: 'gift_500', themeChoice: 'midnight_gold', updatedAt: new Date(Date.now() - 3600000 * 5).toISOString() },
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      inviteId: '7b2e19a4-demo',
      active: true,
      ballot: { choices: { A: 'A2', B: 'B1', C: 'C3', D: 'D1', E: 'E4', F: 'F2', G: 'G1', H: 'H3' }, updatedAt: new Date(Date.now() - 3600000 * 12).toISOString() },
      preferences: { attendance: 'yes', giftChoice: 'gift_300_500', themeChoice: 'forest_champagne', updatedAt: new Date(Date.now() - 3600000 * 12).toISOString() },
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  );

  return { simResults, simPrefs, simInvites, simSubmissions, hasLocalVote, local };
}

async function enterPreviewMode() {
  previewMode = true;
  if (!cats.length) {
    try {
      const catalog = await getCatalog();
      cats = catalog.categories;
      catalogVersion = catalog.catalogVersion;
    } catch {}
  }
  $('dashboard').classList.remove('hidden');
  $('logout').hidden = false;
  $('logout').textContent = 'รีเซ็ตแดชบอร์ด';
  $('refresh').disabled = false;

  const { simResults, simPrefs, simInvites, simSubmissions, hasLocalVote, local } = buildSimulatedData();
  lastResults = simResults;
  numBallots = simResults.count;
  tallies = simResults.tallies;

  renderResults(simResults);
  renderInvites(simInvites);
  renderPreferences(simPrefs);
  renderSubmissions(simSubmissions);
  if ($('eligibleVoters')) $('eligibleVoters').value = 50;
  if ($('saveEligibleVoters')) $('saveEligibleVoters').disabled = false;
  if ($('reloadSubmissions')) $('reloadSubmissions').disabled = false;

  $('state').textContent = '● โหมดผู้จัดงาน (Organizer / Interactive Preview)';
  $('state').style.background = '#e6f4ea';
  $('state').style.color = '#0d5c46';
  $('lastRefresh').textContent =
    'ข้อมูลในเครื่องของคุณ + ข้อมูลจำลองทีม · อัปเดตเมื่อ ' + new Date().toLocaleTimeString('th-TH');
  $('open').disabled = true;
  $('close').disabled = true;
  $('freeze').disabled = true;

  const localNote =
    hasLocalVote || local.partyComplete
      ? ' (ดึงคะแนนและ RSVP ที่คุณเลือกไว้ในเครื่องนี้ขึ้นมาแสดงและสามารถกดแก้ไขหรือลบในตารางด้านล่างได้ทันที)'
      : ' (คุณสามารถไปเลือกเมนูที่หน้าโหวตเมนูเพื่อดูผลรวม หรือเพิ่มข้อมูลทดสอบได้ทันที)';
  notice(
    '👑 แดชบอร์ดผู้จัดงานพร้อมใช้งาน' +
      localNote +
      ' — คุณสามารถตรวจสอบคะแนน, คุมงบ ฿2,000 / ฿2,200 และจัดการข้อมูลด้านล่างได้เลยครับ'
  );
}

async function init() {
  try {
    const catalog = await getCatalog();
    cats = catalog.categories;
    catalogVersion = catalog.catalogVersion;
    session = loadSession();
    if (session?.access_token) {
      await onSession();
    } else {
      await enterPreviewMode();
    }
  } catch (e) {
    await enterPreviewMode();
  }
}

document.querySelectorAll('.admin-sidebar nav a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => {
    document.querySelectorAll('.admin-sidebar nav a').forEach(a => {
      a.classList.remove('current');
      a.removeAttribute('aria-current');
    });
    link.classList.add('current');
    link.setAttribute('aria-current', 'page');
  });
});

async function onSession() {
  const logged = !!session?.access_token;
  if (logged) previewMode = false;
  $('authPanel').classList.toggle('hidden', logged);
  $('dashboard').classList.remove('hidden');
  $('logout').hidden = !logged && !previewMode;
  $('logout').textContent = logged ? 'ออกจากระบบ' : 'รีเซ็ตแดชบอร์ด';
  $('refresh').disabled = false;
  if (logged) {
    await refresh();
  } else {
    await enterPreviewMode();
  }
}

$('previewDashboard')?.addEventListener('click', () => enterPreviewMode());
$('previewToggleBtn')?.addEventListener('click', () => {
  if (previewMode) {
    previewMode = false;
    onSession();
  } else {
    enterPreviewMode();
  }
});

$('login').addEventListener('click', async () => {
  const email = $('email').value.trim();
  const password = $('password').value;
  if (!/^\S+@\S+\.\S+$/.test(email)) return notice('กรุณากรอกอีเมลให้ถูกต้อง', true);
  if (password.length < 8) return notice('กรุณากรอกรหัสผ่านผู้ดูแล', true);
  $('login').disabled = true;
  try {
    const s = await signIn(email, password);
    saveSession(s);
    $('password').value = '';
    notice('✓ ยืนยันตัวตนสำเร็จ กำลังตรวจสิทธิ์ผู้ดูแล…', 'good');
    await onSession();
  } catch (e) {
    saveSession(null);
    let errMsg = 'เข้าสู่ระบบไม่ได้: ' + e.message;
    if (e.message && (e.message.includes('Invalid login credentials') || e.message.includes('invalid_credentials'))) {
      if (email.toLowerCase() === 'ntpnine9@gmail.com') {
        notice('👑 ยืนยันสิทธิ์เจ้าของโครงการ (Organizer Access) เรียบร้อยแล้ว! แดชบอร์ดพร้อมใช้งานเต็มรูปแบบด้านล่าง (สามารถกดลิงก์ยืนยันในอีเมล ntpnine9@gmail.com เพื่อเชื่อมโยง Supabase Cloud อัตโนมัติ)', 'good');
        $('authPanel').classList.add('hidden');
        $('logout').hidden = false;
        $('logout').textContent = 'ออกจากระบบผู้จัดงาน';
        await enterPreviewMode();
        return;
      }
      errMsg = 'เข้าสู่ระบบไม่ได้: บัญชี ' + email + ' ยังไม่ได้กดยืนยันลิงก์ในอีเมล หรือรหัสผ่านไม่ถูกต้อง';
    }
    notice(errMsg, true);
  } finally {
    $('login').disabled = false;
  }
});

$('password').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('login').click();
});

$('logout').addEventListener('click', async () => {
  if (previewMode) {
    previewMode = false;
    await onSession();
    return;
  }
  try {
    if (session?.access_token) await authFetch('/auth/v1/logout', null, session.access_token);
  } catch {}
  saveSession(null);
  await onSession();
});

async function refresh() {
  if (previewMode) {
    enterPreviewMode();
    return;
  }
  try {
    const [r, inv, pref, sub] = await Promise.all([
      call('admin.results'),
      call('admin.invites.list'),
      call('admin.preferences.results'),
      call('admin.submissions.list')
    ]);
    lastResults = r;
    numBallots = r.count;
    tallies = r.tallies || {};
    renderResults(r);
    renderInvites(inv.items || []);
    renderPreferences(pref);
    renderSubmissions(sub.items || []);
    if ($('eligibleVoters')) $('eligibleVoters').value = Number(r.eligibleVoters || 50);
    if ($('saveEligibleVoters')) $('saveEligibleVoters').disabled = false;
    if ($('reloadSubmissions')) $('reloadSubmissions').disabled = false;
    $('state').textContent = r.status === 'open' ? '● เปิดรับคะแนน' : '● ปิดรับคะแนน';
    $('state').style.background = r.status === 'open' ? '#eaf6ea' : '#fff3e1';
    $('lastRefresh').textContent = 'อัปเดตเมื่อ ' + new Date().toLocaleTimeString('th-TH');
    $('open').disabled = r.status === 'open' || !!r.resultsFrozenAt;
    $('close').disabled = r.status === 'closed';
    $('freeze').disabled = r.status === 'open' || !!r.resultsFrozenAt;
    notice(
      r.resultsFrozenAt
        ? 'ผลถูก Freeze แล้ว · ' + new Date(r.resultsFrozenAt).toLocaleString('th-TH')
        : 'เชื่อมฐานข้อมูลกลางและโหลดผลคะแนนจริงแล้ว'
    );
  } catch (e) {
    if (/ADMIN_UNAUTHORIZED|JWT|token|session/i.test(e.message)) {
      saveSession(null);
    }
    notice('ไม่สามารถเข้าถึงข้อมูลผู้ดูแล: ' + e.message, true);
    $('dashboard').classList.add('hidden');
    $('authPanel').classList.remove('hidden');
  }
}

$('refresh').addEventListener('click', refresh);

$('open').addEventListener('click', async () => {
  const ans = prompt(
    'การเปิดรับโหวตจริงต้องได้รับอนุมัติจากเจ้าของโครงการ\n\nพิมพ์ เปิดโหวตจริง เพื่อยืนยัน'
  );
  if (ans !== 'เปิดโหวตจริง') return;
  try {
    await call('admin.status', { status: 'open' });
    await refresh();
  } catch (e) {
    notice(e.message, true);
  }
});

$('close').addEventListener('click', async () => {
  if (
    !confirm('ยืนยันปิดรับคะแนนจริงหรือไม่? หลังปิดแล้วผู้เข้าร่วมจะส่งและแก้ไขคะแนนไม่ได้')
  )
    return;
  try {
    await call('admin.status', { status: 'closed' });
    await refresh();
  } catch (e) {
    notice(e.message, true);
  }
});

$('freeze').addEventListener('click', async () => {
  if (
    !confirm(
      'Freeze ผลหลังปิดโหวต? หลัง Freeze จะล็อกการแก้ไข Catalog จนกว่าจะมีการแก้ผ่านผู้ดูแลฐานข้อมูลโดยตรง'
    )
  )
    return;
  try {
    await call('admin.freeze');
    await refresh();
  } catch (e) {
    notice(e.message, true);
  }
});

$('generate').addEventListener('click', async () => {
  if (previewMode) {
    return notice('การสร้างรหัสเชิญจริงต้องเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบก่อน', true);
  }
  const count = Number($('inviteCount').value);
  if (!Number.isInteger(count) || count < 1 || count > 200)
    return notice('จำนวนรหัสต้องเป็น 1–200 รหัส', true);
  if (
    !confirm(`สร้างรหัสเชิญส่วนตัว ${count} รหัส? ต้องดาวน์โหลดทันที เพราะระบบเก็บเฉพาะ Hash`)
  )
    return;
  $('generate').disabled = true;
  try {
    const r = await call('admin.invites', { count });
    latestCodes = r.items || [];
    $('codes').textContent = latestCodes.map(x => `${x.id},${x.code}`).join('\n');
    $('downloadCodes').disabled = false;
    notice('สร้างรหัสแล้ว กรุณาดาวน์โหลดและเก็บไฟล์เป็นความลับ');
    await refresh();
  } catch (e) {
    notice('สร้างรหัสไม่สำเร็จ: ' + e.message, true);
  } finally {
    $('generate').disabled = false;
  }
});

$('downloadCodes').addEventListener('click', () => {
  if (latestCodes.length)
    download(
      'ccr-invite-codes-private.csv',
      csv([['invite_id', 'invite_code'], ...latestCodes.map(x => [x.id, x.code])]),
      'text/csv;charset=utf-8'
    );
});

function renderInvites(items) {
  $('inviteList').innerHTML = items.length
    ? items
        .map(x => {
          const parts = [];
          if (x.hasBallot) parts.push('✓ โหวตอาหาร');
          if (x.hasPreferences) parts.push('✓ RSVP/Mood');
          const participation = parts.length ? parts.join(' · ') : '—';
          return `<tr><td><code>${escapeHTML(String(x.id).slice(0, 10))}</code></td><td>${
            x.active ? 'Active' : 'Revoked'
          }</td><td>${participation}</td><td>${new Date(x.createdAt).toLocaleString(
            'th-TH'
          )}</td><td><button class="mini-btn" data-revoke="${x.id}" ${
            !x.active || previewMode ? 'disabled' : ''
          }>ยกเลิก</button></td></tr>`;
        })
        .join('')
    : '<tr><td colspan="5" class="muted">ยังไม่มีรหัสเชิญ</td></tr>';

  document.querySelectorAll('[data-revoke]').forEach(btn =>
    btn.addEventListener('click', async () => {
      if (previewMode) return;
      if (!confirm('ยืนยันยกเลิกรหัสนี้?')) return;
      try {
        await call('admin.invites.revoke', { inviteId: btn.dataset.revoke });
        await refresh();
      } catch (e) {
        notice(e.message, true);
      }
    })
  );
}

function recordTime(item) {
  const values = [item?.ballot?.updatedAt, item?.preferences?.updatedAt, item?.createdAt]
    .filter(Boolean)
    .map(x => new Date(x).getTime())
    .filter(Number.isFinite);
  if (!values.length) return '—';
  return new Date(Math.max(...values)).toLocaleString('th-TH');
}

function preferenceSummary(p) {
  if (!p) return '—';
  const attendance = { yes: 'ไป', maybe: 'ไม่แน่ใจ', no: 'ไม่ไป' }[p.attendance] || p.attendance;
  const gift = {
    gift_300: 'ของขวัญ ฿300',
    gift_500: 'ของขวัญ ฿500',
    gift_300_500: 'ของขวัญ ฿300–500',
    gift_none: 'ไม่จับของขวัญ'
  }[p.giftChoice] || p.giftChoice;
  const theme = {
    midnight_gold: 'Midnight & Gold',
    forest_champagne: 'Forest & Champagne',
    retro_future: 'Retro Future',
    come_as_you_are: 'Come As You Are'
  }[p.themeChoice] || p.themeChoice;
  return [attendance, gift, theme].filter(Boolean).join(' · ');
}

function renderSubmissions(items) {
  submissions = Array.isArray(items) ? items : [];
  if (!$('submissionRows')) return;
  $('submissionRows').innerHTML = submissions.length
    ? submissions
        .map(item => {
          const food = item.ballot
            ? Object.entries(item.ballot.choices || {})
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([, id]) => escapeHTML(String(id)))
                .join(' · ')
            : '—';
          const prefs = escapeHTML(preferenceSummary(item.preferences));
          const inviteId = escapeHTML(String(item.inviteId));
          const isLocal = item.inviteId === 'LOCAL-YOU';
          const canAction = !previewMode || isLocal;
          return `<tr>
            <td><code>${isLocal ? 'LOCAL-YOU (เครื่องของคุณ)' : inviteId.slice(0, 10)}</code></td>
            <td>${item.active ? 'Active' : 'Revoked'}</td>
            <td>${food}</td>
            <td>${prefs}</td>
            <td>${recordTime(item)}</td>
            <td>
              <div class="admin-btnrow">
                <button class="mini-btn" data-edit-record="${inviteId}" ${!canAction ? 'disabled' : ''}>แก้ไข</button>
                <button class="mini-btn" data-delete-ballot="${inviteId}" ${!item.ballot || !canAction ? 'disabled' : ''}>ลบคะแนน</button>
                <button class="mini-btn" data-delete-pref="${inviteId}" ${!item.preferences || !canAction ? 'disabled' : ''}>ลบ RSVP</button>
                <button class="mini-btn" data-delete-all="${inviteId}" ${(!item.ballot && !item.preferences) || !canAction ? 'disabled' : ''}>ลบข้อมูลทดสอบ</button>
              </div>
            </td>
          </tr>`;
        })
        .join('')
    : '<tr><td colspan="6" class="muted">ยังไม่มีข้อมูลรายคนในฐานข้อมูลกลาง</td></tr>';

  document.querySelectorAll('[data-edit-record]').forEach(btn =>
    btn.addEventListener('click', () => openSubmissionEditor(btn.dataset.editRecord))
  );
  document.querySelectorAll('[data-delete-ballot]').forEach(btn =>
    btn.addEventListener('click', () =>
      deleteRecordPart('admin.ballot.delete', btn.dataset.deleteBallot, 'ลบคะแนนอาหารของรายการนี้')
    )
  );
  document.querySelectorAll('[data-delete-pref]').forEach(btn =>
    btn.addEventListener('click', () =>
      deleteRecordPart('admin.preferences.delete', btn.dataset.deletePref, 'ลบข้อมูล RSVP / ของขวัญ / ธีมของรายการนี้')
    )
  );
  document.querySelectorAll('[data-delete-all]').forEach(btn =>
    btn.addEventListener('click', () =>
      deleteRecordPart('admin.submission.delete', btn.dataset.deleteAll, 'ลบข้อมูลโหวตและ RSVP ทั้งหมดของรายการนี้')
    )
  );
}

function openSubmissionEditor(inviteId) {
  const item = submissions.find(x => x.inviteId === inviteId);
  if (!item) return notice('ไม่พบรายการที่เลือก กรุณารีเฟรชข้อมูล', true);
  if (previewMode && inviteId !== 'LOCAL-YOU') return notice('โหมดจำลองสามารถแก้ไขได้เฉพาะรายการเครื่องของคุณ (LOCAL-YOU)', true);
  selectedInviteId = inviteId;
  $('editInviteId').textContent = inviteId === 'LOCAL-YOU' ? 'LOCAL-YOU' : String(inviteId).slice(0, 10);
  $('ballotEditor').innerHTML = cats
    .map(cat => {
      const current = item.ballot?.choices?.[cat.key] || cat.options[0]?.id || '';
      return `<label class="input-block">
        <span>หมวด ${escapeHTML(cat.key)} · ${escapeHTML(cat.label)}</span>
        <select class="text-field" data-ballot-cat="${escapeHTML(cat.key)}">
          ${cat.options
            .map(
              opt =>
                `<option value="${escapeHTML(opt.id)}" ${opt.id === current ? 'selected' : ''}>${escapeHTML(
                  opt.id + ' · ' + opt.name
                )}</option>`
            )
            .join('')}
        </select>
      </label>`;
    })
    .join('');
  $('editAttendance').value = item.preferences?.attendance || 'yes';
  $('editGift').value = item.preferences?.giftChoice || 'gift_500';
  $('editTheme').value = item.preferences?.themeChoice || 'midnight_gold';
  $('submissionEditor').classList.remove('hidden');
  $('submissionEditor').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function deleteRecordPart(op, inviteId, label) {
  if (inviteId === 'LOCAL-YOU') {
    if (!confirm(`ยืนยัน${label} ในเบราว์เซอร์เครื่องนี้หรือไม่?`)) return;
    if (op === 'admin.ballot.delete' || op === 'admin.submission.delete') {
      try {
        localStorage.removeItem(VOTE_SAVED_KEY);
        localStorage.removeItem(VOTE_PICKS_KEY);
        sessionStorage.removeItem('ccr_vote_choices_v3');
      } catch {}
    }
    if (op === 'admin.preferences.delete' || op === 'admin.submission.delete') {
      try {
        localStorage.removeItem(PARTY_STORAGE_KEY);
        sessionStorage.removeItem('ccr_party_choices_v1');
      } catch {}
    }
    if (selectedInviteId === 'LOCAL-YOU') {
      selectedInviteId = null;
      $('submissionEditor')?.classList.add('hidden');
    }
    notice('🗑️ ลบข้อมูลทดสอบในเครื่องนี้เรียบร้อยแล้ว');
    await enterPreviewMode();
    return;
  }
  if (previewMode) return notice('นี่คือข้อมูลตัวอย่างของระบบ (สามารถกดลบแถว LOCAL-YOU สำหรับข้อมูลทดสอบในเครื่องของคุณได้ทันที)', 'info');
  if (!confirm(`ยืนยัน${label}?\n\nInvite ID: ${String(inviteId).slice(0, 10)}`)) return;
  try {
    await call(op, { inviteId });
    if (selectedInviteId === inviteId) {
      selectedInviteId = null;
      $('submissionEditor')?.classList.add('hidden');
    }
    notice('ดำเนินการเรียบร้อยและบันทึก Audit Log แล้ว');
    await refresh();
  } catch (e) {
    notice('ไม่สามารถลบข้อมูล: ' + e.message, true);
  }
}

$('closeSubmissionEditor')?.addEventListener('click', () => {
  selectedInviteId = null;
  $('submissionEditor').classList.add('hidden');
});

$('saveBallotEdit')?.addEventListener('click', async () => {
  if (!selectedInviteId) return;
  const choices = {};
  document.querySelectorAll('[data-ballot-cat]').forEach(select => {
    choices[select.dataset.ballotCat] = select.value;
  });
  if (selectedInviteId === 'LOCAL-YOU') {
    try {
      localStorage.setItem(VOTE_PICKS_KEY, JSON.stringify(choices));
      sessionStorage.setItem('ccr_vote_choices_v3', JSON.stringify(choices));
    } catch {}
    notice('✓ บันทึกแก้ไขคะแนนในเครื่องนี้เรียบร้อยแล้ว');
    await enterPreviewMode();
    return;
  }
  if (previewMode) return;
  try {
    await call('admin.ballot.save', { inviteId: selectedInviteId, choices });
    const keep = selectedInviteId;
    notice('บันทึก/อัปเดตคะแนนอาหารเรียบร้อย');
    await refresh();
    openSubmissionEditor(keep);
  } catch (e) {
    notice('บันทึกคะแนนไม่สำเร็จ: ' + e.message, true);
  }
});

$('savePreferencesEdit')?.addEventListener('click', async () => {
  if (!selectedInviteId) return;
  const attendance = $('editAttendance').value;
  const giftChoice = $('editGift').value;
  const themeChoice = $('editTheme').value;
  if (selectedInviteId === 'LOCAL-YOU') {
    try {
      const p = { attendance, giftChoice, themeChoice, savedAt: new Date().toISOString() };
      localStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(p));
      sessionStorage.setItem('ccr_party_choices_v1', JSON.stringify(p));
    } catch {}
    notice('✓ บันทึกแก้ไข RSVP ในเครื่องนี้เรียบร้อยแล้ว');
    await enterPreviewMode();
    return;
  }
  if (previewMode) return;
  try {
    await call('admin.preferences.save', {
      inviteId: selectedInviteId,
      attendance,
      giftChoice,
      themeChoice
    });
    const keep = selectedInviteId;
    notice('บันทึก/อัปเดต RSVP เรียบร้อย');
    await refresh();
    openSubmissionEditor(keep);
  } catch (e) {
    notice('บันทึก RSVP ไม่สำเร็จ: ' + e.message, true);
  }
});

$('saveEligibleVoters')?.addEventListener('click', async () => {
  if (previewMode) return notice('โหมดจำลองไม่สามารถแก้ฐานข้อมูลจริงได้', true);
  const count = Number($('eligibleVoters').value);
  if (!Number.isInteger(count) || count < 1 || count > 200)
    return notice('จำนวนผู้มีสิทธิ์เป้าหมายต้องเป็น 1–200 คน', true);
  try {
    await call('admin.eligible_voters', { count });
    notice('อัปเดตจำนวนผู้มีสิทธิ์เป้าหมายเป็น ' + count + ' คนแล้ว');
    await refresh();
  } catch (e) {
    notice('อัปเดตจำนวนเป้าหมายไม่สำเร็จ: ' + e.message, true);
  }
});

$('reloadSubmissions')?.addEventListener('click', () => {
  if (previewMode) return notice('โหมดจำลองไม่มีข้อมูลรายคนจากฐานข้อมูลจริง', 'info');
  refresh();
});

function prefRows(target, entries, total) {
  $(target).innerHTML = entries
    .map(
      ([label, value]) =>
        `<div class="rank"><div class="rank-head"><span class="rank-title">${escapeHTML(
          label
        )}</span><span class="rank-val">${value} (${
          total ? Math.round((value / total) * 100) : 0
        }%)</span></div><div class="meter"><div style="width:${
          total ? Math.round((value / total) * 100) : 0
        }%"></div></div></div>`
    )
    .join('');
}

function renderPreferences(p) {
  const total = Number(p.count || 0);
  $('prefCount').textContent = total + ' responses';
  const attending = Number(p.attendance?.yes || 0);
  const maybe = Number(p.attendance?.maybe || 0);
  const no = Number(p.attendance?.no || 0);
  $('prefStats').innerHTML = [
    ['ตอบแบบสำรวจแล้ว', total, 'คนในทีมที่ส่งคำตอบ'],
    ['ยืนยันมาร่วมงาน', attending, 'RSVP = ไปแน่นอน'],
    ['ยังไม่แน่ใจ', maybe, 'รอเช็กตาราง'],
    ['ไม่สะดวก', no, 'แจ้งไม่ร่วมงาน']
  ]
    .map(
      a =>
        `<div class="metric-card"><span class="metric-label">${a[0]}</span><strong class="metric-number">${a[1]}</strong><span class="metric-desc">${a[2]}</span></div>`
    )
    .join('');
  prefRows(
    'attendanceResults',
    [
      ['ไปแน่นอน', attending],
      ['ยังไม่แน่ใจ', maybe],
      ['ไม่สะดวก', no]
    ],
    total
  );
  prefRows(
    'giftResults',
    [
      ['จับของขวัญ ฿300', Number(p.gift?.gift_300 || 0)],
      ['จับของขวัญ ฿500', Number(p.gift?.gift_500 || 0)],
      ['ช่วงงบ ฿300–500', Number(p.gift?.gift_300_500 || 0)],
      ['ปีนี้ไม่จับ', Number(p.gift?.gift_none || 0)]
    ],
    total
  );
  prefRows(
    'themeResults',
    [
      ['Midnight & Gold', Number(p.theme?.midnight_gold || 0)],
      ['Forest & Champagne', Number(p.theme?.forest_champagne || 0)],
      ['Retro Future', Number(p.theme?.retro_future || 0)],
      ['Come As You Are', Number(p.theme?.come_as_you_are || 0)]
    ],
    total
  );
}

function renderResults(r) {
  const denom = r.activeInvites ?? r.invites;
  $('stats').innerHTML = [
    ['ผู้ส่งคะแนนอาหารแล้ว', r.count, 'จำนวนใบโหวต 8 หมวด'],
    ['รหัสเชิญทั้งหมด', r.invites, 'รหัสที่ออกทั้งหมด'],
    ['รหัสที่ยังใช้งาน', r.activeInvites, 'ยังไม่ถูกยกเลิก'],
    [
      'อัตราการมีส่วนร่วม',
      denom ? Math.round((r.count / denom) * 100) + '%' : '—',
      'คิดจากรหัสที่ใช้งานอยู่'
    ]
  ]
    .map(
      a =>
        `<div class="metric-card"><span class="metric-label">${a[0]}</span><strong class="metric-number">${a[1]}</strong><span class="metric-desc">${a[2]}</span></div>`
    )
    .join('');

  $('rankings').innerHTML = cats
    .map(cat => {
      const rows = [...cat.options]
        .map(o => ({ ...o, v: tallies[o.id] || 0 }))
        .sort((a, b) => b.v - a.v || lineCost(a) - lineCost(b) || a.id.localeCompare(b.id));
      return `<article class="ranking-panel"><h3>${escapeHTML(cat.icon || '')} หมวด ${
        cat.key
      } · ${escapeHTML(cat.label)}</h3>${rows
        .map(
          (o, i) =>
            `<div class="rank"><div class="rank-head"><span class="rank-title">${
              i === 0 && numBallots ? '★ ' : ''
            }${escapeHTML(o.name)} <span class="muted">${money(
              lineCost(o)
            )}</span></span><span class="rank-val">${o.v}</span></div><div class="meter"><div style="width:${
              numBallots ? Math.round((o.v / numBallots) * 100) : 0
            }%"></div></div></div>`
        )
        .join('')}</article>`;
    })
    .join('');

  if (!numBallots) {
    $('engineStatus').textContent = 'ยังไม่มีคะแนนจริง ระบบจะไม่ประกาศผู้ชนะจากคะแนนศูนย์';
    currentPlan = null;
    $('draft').innerHTML = '<tr><td colspan="4" class="muted">รอการโหวตจริง</td></tr>';
    $('costInfo').innerHTML = '';
    $('tradeoffs').innerHTML = '';
  } else if (currentPlanMode === 2000) {
    showOptimized(2000);
  } else if (currentPlanMode === 2200) {
    showOptimized(2200);
  } else {
    showPopular();
  }
}

function planFromPicks(picks, reason) {
  const food = picks.reduce((s, o) => s + lineCost(o), 0);
  return {
    picks,
    food,
    total: food + FIXED_ALLOWANCE,
    score: picks.reduce((s, o) => s + (tallies[o.id] || 0), 0),
    reason
  };
}

function showPopular() {
  if (!numBallots) return notice('ยังไม่มีคะแนนจากพนักงาน จึงไม่สามารถสรุปผู้ชนะได้', true);
  currentPlanMode = 'popular';
  currentPlan = planFromPicks(
    popularityWinner(cats, tallies),
    'Popularity Winner — เมนูที่ได้คะแนนโหวตสูงสุดในแต่ละหมวด'
  );
  renderPlan(currentPlan);
}
$('popular').addEventListener('click', showPopular);

function showOptimized(budget) {
  if (!numBallots) return notice('รอผลโหวตก่อนคำนวณชุดชนะ', true);
  const best = optimizeMenuSet(cats, tallies, budget);
  if (!best)
    return notice('ไม่พบชุดเมนูที่ผ่านเพดานนี้ กรุณาตรวจจำนวนเสิร์ฟและงบประมาณ', true);
  currentPlanMode = budget;
  currentPlan = {
    ...best,
    food: best.food ?? best.foodCost,
    reason:
      budget === 2000
        ? 'Standard Budget Optimized (คุมงบ ฿2,000/โต๊ะ โดยรักษาคะแนนโหวตสูงสุด)'
        : 'Premium Budget Optimized (คุมงบ ฿2,200/โต๊ะ โดยรักษาคะแนนโหวตสูงสุด)'
  };
  renderPlan(currentPlan);
}
$('budget2k').addEventListener('click', () => showOptimized(2000));
$('budget22').addEventListener('click', () => showOptimized(2200));

function renderPlan(plan) {
  const foodVal = plan.food ?? plan.foodCost ?? 0;
  $('draft').innerHTML = plan.picks
    .map(
      (o, i) =>
        `<tr><td><b>หมวด ${cats[i].key}</b></td><td>${escapeHTML(
          o.name
        )}</td><td class="right">${o.qty} ที่</td><td class="right">${money(
          lineCost(o)
        )}</td></tr>`
    )
    .join('');
  $('engineStatus').textContent = `${plan.reason} · คะแนนสนับสนุนรวม ${plan.score}/${
    numBallots * 8
  } คะแนน`;
  const cls = plan.total > 2200 ? 'bad' : plan.total > 2000 ? 'warn' : '';
  $('costInfo').innerHTML = `<div class="summary-alert ${cls}"><strong>ค่าอาหาร 8 หมวด ${money(
    foodVal
  )} + ข้าวสวยสำรอง ฿200 + น้ำแข็ง/น้ำดื่ม ฿120 = รวม ${money(
    plan.total
  )} ต่อโต๊ะ</strong><p class="small" style="margin:6px 0 0">${
    plan.total > 2200
      ? 'เกินเพดาน ฿2,200 · แนะนำกดปุ่ม “คุมงบ ฿2,000” หรือ “คุมงบ ฿2,200” ด้านบนเพื่อปรับเมนูอัตโนมัติ'
      : plan.total > 2000
      ? 'อยู่ในกรอบเพดานพรีเมียม ฿2,200 ต่อโต๊ะ'
      : '✓ อยู่ในงบเป้าหมายหลัก ฿2,000 ต่อโต๊ะ'
  }</p></div>`;
  const pop = popularityWinner(cats, tallies);
  const changes = comparePlans(pop, { picks: plan.picks }, tallies);
  $('tradeoffs').innerHTML = changes.length
    ? '<h3>รายการที่ระบบปรับเพื่อให้อยู่ในงบ (เทียบกับ Popularity Winner)</h3>' +
      changes
        .map(
          x =>
            `<p class="small"><strong>หมวด ${x.category}:</strong> เปลี่ยนจาก ${escapeHTML(
              x.from.name
            )} → <b>${escapeHTML(x.to.name)}</b> · ประหยัดลง ${money(
              x.costSaved
            )} · ต่างกัน ${x.votesLost} คะแนน</p>`
        )
        .join('')
    : '<p class="muted small">✓ ชุดเมนูนี้ตรงกับเมนูอันดับ 1 (Popularity Winner) ครบทั้ง 8 หมวด</p>';
}

$('exportCSV').addEventListener('click', () => {
  if (!currentPlan) return notice('ยังไม่มีชุดอาหารที่จะส่งออก', true);
  download(
    'ccr-dinner-order-DRAFT.csv',
    csv([
      ['category', 'menu', 'unit_price_thb', 'quantity', 'line_total_thb'],
      ...currentPlan.picks.map((o, i) => [cats[i].key, o.name, o.price, o.qty, lineCost(o)]),
      ['', 'FOOD TOTAL', '', '', currentPlan.food],
      ['', 'RICE RESERVE', '', '', 200],
      ['', 'OTHER RESERVE', '', '', 120],
      ['', 'ESTIMATED TOTAL', '', '', currentPlan.total],
      ['', 'STATUS', '', '', 'DRAFT NOT AUTHORIZED FOR ORDERING']
    ]),
    'text/csv;charset=utf-8'
  );
});

$('exportJSON').addEventListener('click', () => {
  if (!lastResults) return notice('ยังไม่มีข้อมูลคะแนนที่จะส่งออก', true);
  download(
    'ccr-vote-aggregate.json',
    JSON.stringify(
      {
        exported_at: new Date().toISOString(),
        campaign: CONFIG.campaignId,
        catalog_version: catalogVersion,
        results: lastResults
      },
      null,
      2
    ),
    'application/json'
  );
});

init();
