export const CATEGORY_KEYS = ['A','B','C','D','E','F','G','H'];
export const SERVING_QUOTAS = {A:2,B:2,C:2,D:1,E:2,F:2,G:1,H:1};
export const quotaFor = key => SERVING_QUOTAS[key];
export const billingMultiplier = key => key === 'H' ? 2 : 1;
export const isLegacyBallot = raw => Boolean(raw && Object.values(raw).some(v => typeof v === 'string'));
export function normalizeChoices(raw, {complete = true} = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(k => !CATEGORY_KEYS.includes(k))) throw Error('INVALID_CHOICES');
  const out = {};
  for (const key of CATEGORY_KEYS) {
    let value = raw[key];
    if (typeof value === 'string') value = {[value]:quotaFor(key)};
    if (value === undefined && !complete) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`หมวด ${key}: ต้องเลือกรวม ${quotaFor(key)} เสิร์ฟ`);
    const entries = Object.entries(value).sort(([a],[b]) => a.localeCompare(b));
    if (entries.some(([id,qty]) => !new RegExp(`^${key}[1-7]$`).test(id) || !Number.isInteger(qty) || qty < 1 || qty > quotaFor(key))) throw Error(`หมวด ${key}: จำนวนเสิร์ฟหรือเมนูไม่ถูกต้อง`);
    const sum = entries.reduce((n,[,qty]) => n + qty, 0);
    if (sum > quotaFor(key) || (complete && sum !== quotaFor(key))) throw Error(`หมวด ${key}: ต้องเลือกรวม ${quotaFor(key)} เสิร์ฟ (ตอนนี้ ${sum})`);
    if (entries.length) out[key] = Object.fromEntries(entries);
  }
  return out;
}
export const usedServings = (choices,key) => Object.values(choices[key] || {}).reduce((n,q) => n + q,0);
export const completedCategories = choices => CATEGORY_KEYS.filter(k => usedServings(choices,k) === quotaFor(k));
export function setServing(choices,key,id,qty) {
  const next = structuredClone(choices);
  next[key] = {...next[key]};
  if (qty === 0) delete next[key][id]; else next[key][id] = qty;
  return normalizeChoices(next,{complete:false});
}
export function ballotLines(categories,choices) {
  const normalized = normalizeChoices(choices,{complete:false});
  return categories.flatMap(c => Object.entries(normalized[c.key] || {}).map(([id,selectedQty]) => {
    const option = c.options.find(o => o.id === id);
    if (!option) throw Error('INVALID_MENU_OPTION');
    const qty = selectedQty * billingMultiplier(c.key);
    return {...option,key:c.key,category:c.key,categoryLabel:c.label,selectedQty,qty,lineTotal:Number(option.price)*qty};
  }));
}
export function tallyChoices(raw,tallies = {}) {
  const choices = normalizeChoices(raw);
  for (const value of Object.values(choices)) for (const [id,qty] of Object.entries(value)) tallies[id] = (tallies[id] || 0) + qty;
  return tallies;
}
export function choiceSummary(raw,key) {
  const choices = normalizeChoices(raw,{complete:false});
  return Object.entries(choices[key] || {}).map(([id,qty]) => `${id} × ${qty}`).join(' + ');
}
