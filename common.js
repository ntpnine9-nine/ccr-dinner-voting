import { CONFIG } from './config.js';
export const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CONFIG.supabaseUrl) && CONFIG.publishableKey.length>30 && !CONFIG.publishableKey.includes('YOUR_');
export const money = v => '฿'+Number(v).toLocaleString('en-US');
export const escapeHTML = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const PARTY_STORAGE_KEY = 'ccr_party_preferences_2026_v1';
export const VOTE_PICKS_KEY = 'ccr_dinner_2026_picks_v1';
export const VOTE_SAVED_KEY = 'ccr_dinner_2026_saved_ballot_v1';
export const TOKEN_STORAGE_KEY = 'ccr_invite_token_2026_v1';
export const DEVICE_STORAGE_KEY = 'ccr_device_token_2026_v1';
export const PARTICIPANT_LABEL_KEY = 'ccr_participant_label_2026_v1';

export function normalizeParticipantLabel(raw){
  if(typeof raw!=='string') throw Error('กรุณาใช้ข้อความสำหรับชื่อหรือรหัสที่ตั้งเอง');
  const label=raw.normalize('NFC').trim();
  if([...label].length>80 || /[\u0000-\u001f\u007f-\u009f]/u.test(label))
    throw Error('ชื่อหรือรหัสที่ตั้งเองต้องยาวไม่เกิน 80 ตัวอักษร และไม่มีอักขระควบคุม');
  return label;
}
export function getParticipantLabel(){
  try{return localStorage.getItem(PARTICIPANT_LABEL_KEY)||'';}catch{return '';}
}
export function setParticipantLabel(raw){
  try{localStorage.setItem(PARTICIPANT_LABEL_KEY,String(raw));}catch{}
}
export function submissionParticipant(raw=getParticipantLabel()){
  const participantLabel=normalizeParticipantLabel(raw);
  const previous=getSharedToken();
  // Existing invitation links remain capabilities; a display label never becomes one.
  const code=/^CCR26(?:-[A-Z2-9]{5}){4}$/.test(previous)?previous:'';
  setParticipantLabel(participantLabel);
  return {participantLabel,code,deviceToken:code?undefined:getDeviceToken()};
}

// A random capability, not a fingerprint. Retrying or using the other form updates
// the same participant. Refuse to submit if it cannot be kept for the next page.
export function getDeviceToken(){
  try {
    let token = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!/^[a-f0-9]{64}$/.test(token || '')) {
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      token = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem(DEVICE_STORAGE_KEY, token);
    }
    if (localStorage.getItem(DEVICE_STORAGE_KEY) !== token) throw Error('storage unavailable');
    return token;
  } catch {
    throw Error('กรุณาอนุญาตให้เว็บไซต์เก็บข้อมูลในเบราว์เซอร์ เพื่อป้องกันการส่งคะแนนซ้ำ');
  }
}

const GIFT_MAP = {
  gift_300: 'จับของขวัญ ฿300',
  gift_500: 'จับของขวัญ ฿500',
  gift_300_500: 'ช่วงงบ ฿300–500',
  gift_none: 'ปีนี้ไม่จับของขวัญ'
};
const THEME_MAP = {
  midnight_gold: 'Midnight & Gold',
  forest_champagne: 'Forest & Champagne',
  retro_future: 'Retro Future',
  come_as_you_are: 'Come As You Are'
};

export const PARTY_LABELS = {
  attendance: { yes: 'ไปแน่นอน', maybe: 'ยังไม่แน่ใจ', no: 'ไม่สะดวก' },
  gift: GIFT_MAP,
  giftChoice: GIFT_MAP,
  theme: THEME_MAP,
  themeChoice: THEME_MAP
};

export function formatInviteCode(raw){
  const upper=String(raw||'').toUpperCase();
  const alnum=upper.replace(/[^A-Z0-9]/g,'');
  if(!upper.includes('-')&&/^CCR26[A-Z2-9]{20}$/.test(alnum)){
    return `CCR26-${alnum.slice(5,10)}-${alnum.slice(10,15)}-${alnum.slice(15,20)}-${alnum.slice(20,25)}`;
  }
  return upper.replace(/[^A-Z0-9-]/g,'');
}

export function extractInviteCodeFromUrl(){
  if (typeof window === 'undefined' || !window.location.hash) return '';
  try {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash.includes('=') ? hash : `code=${hash}`);
    const raw = params.get('code') || params.get('token') || (hash.toUpperCase().startsWith('CCR26') ? hash : '');
    return formatInviteCode(raw || '');
  } catch {
    return '';
  }
}

export function getSharedToken(){
  const fromUrl = extractInviteCodeFromUrl();
  if (fromUrl) {
    setSharedToken(fromUrl);
    return fromUrl;
  }
  try{return formatInviteCode(localStorage.getItem(TOKEN_STORAGE_KEY)||'');}catch{return '';}
}
export function setSharedToken(raw){
  const formatted=formatInviteCode(raw);
  try{if(formatted)localStorage.setItem(TOKEN_STORAGE_KEY,formatted);else localStorage.removeItem(TOKEN_STORAGE_KEY);}catch{}
  return formatted;
}

export function getSavedJourneyState(){
  let rawParty={}, picks={}, savedBallot=null;
  try{rawParty=JSON.parse(localStorage.getItem(PARTY_STORAGE_KEY)||'{}')||{};}catch{}
  try{picks=JSON.parse(localStorage.getItem(VOTE_PICKS_KEY)||'{}')||{};}catch{}
  try{savedBallot=JSON.parse(localStorage.getItem(VOTE_SAVED_KEY)||'null');}catch{}

  const party = {
    attendance: rawParty.attendance || '',
    giftChoice: rawParty.giftChoice || rawParty.gift || '',
    themeChoice: rawParty.themeChoice || rawParty.theme || '',
    savedAt: rawParty.savedAt || null,
    cloudConfirmed: Boolean(rawParty.cloudConfirmed)
  };
  const partyCount=[party.attendance,party.giftChoice,party.themeChoice].filter(Boolean).length;
  const partyDone=partyCount===3;

  if(savedBallot?.picks && Object.keys(picks).length===0){
    picks={...savedBallot.picks};
  }
  const pickKeys=['A','B','C','D','E','F','G','H'].filter(k=>Boolean(picks[k]));
  const voteCount=pickKeys.length;
  const voteDone=voteCount===8;
  const hasSavedVote=Boolean(savedBallot?.savedAt && savedBallot?.cloudConfirmed);

  return {
    party,
    partyCount,
    partyDone,
    partyComplete: partyDone,
    partySaved: party.cloudConfirmed,
    picks,
    votePicks: picks,
    voteCount,
    voteDone,
    hasSavedVote,
    voteSaved: savedBallot,
    savedBallot
  };
}

export function renderJourneyProgress(){
  if(typeof document==='undefined')return;
  const st=getSavedJourneyState();

  const partyText = st.partySaved
    ? '✓ บันทึกลงระบบกลางแล้ว'
    : st.partyDone
    ? 'ฉบับร่างในเครื่อง (3/3 ข้อ) — ยังไม่ได้ส่งเข้าระบบกลาง'
    : `เลือกแล้ว ${st.partyCount}/3 ข้อ`;
  document.querySelectorAll('[data-step-status="party"], [data-journey-badge="party"]').forEach(el=>{
    el.textContent=partyText;
  });
  document.querySelectorAll('[data-journey-step="2"]').forEach(el=>{
    el.classList.toggle('done', st.partySaved);
  });

  const voteText = st.hasSavedVote
    ? `✓ บันทึกลงระบบกลางแล้ว (${money(st.savedBallot.grandTotal||0)})`
    : st.voteDone
    ? `ฉบับร่างในเครื่องนี้เท่านั้น ยังไม่ได้ส่งเข้าระบบกลาง`
    : `เลือกแล้ว ${st.voteCount}/8 หมวด`;
  document.querySelectorAll('[data-step-status="vote"], [data-journey-badge="vote"]').forEach(el=>{
    el.textContent=voteText;
  });
  document.querySelectorAll('[data-journey-step="3"]').forEach(el=>{
    el.classList.toggle('done', st.hasSavedVote);
  });

  const attLabel = PARTY_LABELS.attendance[st.party.attendance] || 'ยังไม่ได้เลือก';
  const giftLabel = PARTY_LABELS.giftChoice[st.party.giftChoice] || 'ยังไม่ได้เลือก';
  const themeLabel = PARTY_LABELS.themeChoice[st.party.themeChoice] || 'ยังไม่ได้เลือก';
  const voteLabel = st.hasSavedVote
    ? `✓ บันทึกลงระบบกลางแล้ว (${money(st.savedBallot.grandTotal||0)}/โต๊ะ)`
    : st.voteDone
    ? `ฉบับร่างในเครื่องนี้เท่านั้น ยังไม่ได้ส่งเข้าระบบกลาง (${money(st.savedBallot?.grandTotal||0)}/โต๊ะ)`
    : st.voteCount > 0
    ? `เลือกไว้ ${st.voteCount}/8 หมวด (ฉบับร่าง)`
    : 'ยังไม่ได้เลือกเมนู';

  const setPass = (key, text, isDone) => {
    document.querySelectorAll(`[data-pass="${key}"]`).forEach(el => {
      el.textContent = text;
      el.classList.toggle('empty', !isDone);
    });
  };
  setPass('attendance', attLabel, Boolean(st.party.attendance));
  setPass('gift', giftLabel, Boolean(st.party.giftChoice));
  setPass('theme', themeLabel, Boolean(st.party.themeChoice));
  setPass('vote', voteLabel, st.voteCount > 0 || st.hasSavedVote);
}

export async function api(op,payload={},bearer=''){
  if(!configured) throw Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูลกลาง');
  const headers={'Content-Type':'application/json','apikey':CONFIG.publishableKey};
  if(bearer) headers.Authorization='Bearer '+bearer;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(`${CONFIG.supabaseUrl}/functions/v1/vote`,{method:'POST',headers,signal:controller.signal,body:JSON.stringify({op,campaign:CONFIG.campaignId,...payload})});
    const raw=await response.text(); let data; try{data=JSON.parse(raw)}catch{throw Error(`ระบบตอบกลับไม่ถูกต้อง (HTTP ${response.status})`)}
    if(!response.ok||!data.ok) throw Error(data.error||`Server HTTP ${response.status}`);
    return data;
  }catch(error){if(error?.name==='AbortError') throw Error('การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่');throw error;}
  finally{clearTimeout(timeout);}
}
export async function getCatalog(){
  try{
    const data=await api('catalog');
    if(!Array.isArray(data.categories)||data.categories.length!==8||data.categories.some(c=>!Array.isArray(c.options)||c.options.length!==7)) throw Error('ข้อมูลเมนูจากระบบกลางไม่ครบ 8 หมวด × 7 ตัวเลือก');
    return data;
  }catch(err){
    const res=await fetch(new URL('./menus.json',import.meta.url));
    if(!res.ok) throw err;
    const local=await res.json();
    if(!Array.isArray(local.categories)||local.categories.length!==8) throw err;
    return {ok:true,status:'closed',catalogVersion:1,categories:local.categories,offlineFallback:true,fallbackError:err?.message||''};
  }
}
export const csv = rows=>'\ufeff'+rows.map(row=>row.map(x=>{
  const value=typeof x==='string'&&/^[\s]*[=+@-]/u.test(x)?"'"+x:String(x??'');
  return '"'+value.replaceAll('"','""')+'"';
}).join(',')).join('\r\n');
export function download(name,content,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
