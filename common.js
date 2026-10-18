import { CONFIG } from './config.js';
export const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CONFIG.supabaseUrl) && CONFIG.publishableKey.length>30 && !CONFIG.publishableKey.includes('YOUR_');
export const money = v => '฿'+Number(v).toLocaleString('en-US');
export const escapeHTML = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const PARTY_STORAGE_KEY = 'ccr_party_preferences_2026_v1';
export const VOTE_PICKS_KEY = 'ccr_dinner_2026_picks_v1';
export const VOTE_SAVED_KEY = 'ccr_dinner_2026_saved_ballot_v1';
export const TOKEN_STORAGE_KEY = 'ccr_invite_token_2026_v1';

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

export function getSharedToken(){
  try{return formatInviteCode(localStorage.getItem(TOKEN_STORAGE_KEY)||'');}catch{return '';}
}
export function setSharedToken(raw){
  const formatted=formatInviteCode(raw);
  try{if(formatted)localStorage.setItem(TOKEN_STORAGE_KEY,formatted);}catch{}
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
    savedAt: rawParty.savedAt || null
  };
  const partyCount=[party.attendance,party.giftChoice,party.themeChoice].filter(Boolean).length;
  const partyDone=partyCount===3;

  if(savedBallot?.picks && Object.keys(picks).length===0){
    picks={...savedBallot.picks};
  }
  const pickKeys=['A','B','C','D','E','F','G','H'].filter(k=>Boolean(picks[k]));
  const voteCount=pickKeys.length;
  const voteDone=voteCount===8;
  const hasSavedVote=Boolean(savedBallot?.savedAt);

  return {
    party,
    partyCount,
    partyDone,
    partyComplete: partyDone,
    partySaved: Boolean(party.savedAt),
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
    ? '✓ บันทึกครบ 3 ข้อแล้ว'
    : st.partyDone
    ? 'เลือกครบ 3/3 ข้อแล้ว'
    : `เลือกแล้ว ${st.partyCount}/3 ข้อ`;
  document.querySelectorAll('[data-step-status="party"], [data-journey-badge="party"]').forEach(el=>{
    el.textContent=partyText;
  });
  document.querySelectorAll('[data-journey-step="2"]').forEach(el=>{
    el.classList.toggle('done', st.partyDone || st.partySaved);
  });

  const voteText = st.hasSavedVote
    ? `✓ บันทึกครบ 8 หมวด (${money(st.savedBallot.grandTotal||0)})`
    : st.voteDone
    ? 'เลือกครบ 8/8 หมวดแล้ว'
    : `เลือกแล้ว ${st.voteCount}/8 หมวด`;
  document.querySelectorAll('[data-step-status="vote"], [data-journey-badge="vote"]').forEach(el=>{
    el.textContent=voteText;
  });
  document.querySelectorAll('[data-journey-step="3"]').forEach(el=>{
    el.classList.toggle('done', st.voteDone || st.hasSavedVote);
  });

  const attLabel = PARTY_LABELS.attendance[st.party.attendance] || 'ยังไม่ได้เลือก';
  const giftLabel = PARTY_LABELS.giftChoice[st.party.giftChoice] || 'ยังไม่ได้เลือก';
  const themeLabel = PARTY_LABELS.themeChoice[st.party.themeChoice] || 'ยังไม่ได้เลือก';
  const voteLabel = st.hasSavedVote
    ? `✓ บันทึกครบ 8 หมวดแล้ว (${money(st.savedBallot.grandTotal||0)}/โต๊ะ)`
    : st.voteDone
    ? 'เลือกครบ 8/8 หมวด (รอคลิกบันทึก)'
    : st.voteCount > 0
    ? `เลือกไว้ ${st.voteCount}/8 หมวด`
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
export const csv = rows=>'\ufeff'+rows.map(row=>row.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
export function download(name,content,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
