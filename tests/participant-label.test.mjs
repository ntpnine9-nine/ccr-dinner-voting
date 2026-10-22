import assert from 'node:assert/strict';
import {normalizeParticipantLabel, submissionParticipant, getParticipantLabel, getDeviceToken, setSharedToken, DEVICE_STORAGE_KEY, csv, escapeHTML} from '../common.js';
import {normalizeParticipantLabel as serverLabel} from '../supabase/functions/vote/participant-label.ts';

const values=new Map();
globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
for(const label of ['นาย','abc xyz','123','🌙✨','คนไม่เปิดเผยชื่อ','<>"&','=1+1','ก'.repeat(80),'🌙'.repeat(80),'']){
  assert.equal(normalizeParticipantLabel(label),label);
  assert.equal(serverLabel(label),label,'client/server label rules agree');
  const participant=submissionParticipant(label);
  assert.equal(participant.participantLabel,label);
  assert.equal(getParticipantLabel(),label);
  assert.match(participant.deviceToken,/^[a-f0-9]{64}$/);
}
assert.equal(normalizeParticipantLabel('  นาย  '),'นาย');
assert.equal(normalizeParticipantLabel('e\u0301'),'é');
assert.equal(serverLabel(undefined),null,'old clients preserve a label');
for(const invalid of ['x'.repeat(81),'🌙'.repeat(81),'a\u0000b','a\nb','a\u0085b',12,null]){
  assert.throws(()=>normalizeParticipantLabel(invalid));
  assert.throws(()=>serverLabel(invalid));
}
const first=submissionParticipant('ชื่อเดียวกัน');
assert.equal(submissionParticipant('เปลี่ยนชื่อ').deviceToken,first.deviceToken,'renaming does not create another vote');
values.delete(DEVICE_STORAGE_KEY);
const second=submissionParticipant('ชื่อเดียวกัน');
assert.notEqual(first.deviceToken,second.deviceToken,'same labels never merge independent participants');
setSharedToken('CCR26-ABCDE-FGHJK-LMNPQ-RSTUV');
const legacy=submissionParticipant('นามแฝงใหม่');
assert.equal(legacy.code,'CCR26-ABCDE-FGHJK-LMNPQ-RSTUV','original invitation capability retained');
assert.equal(legacy.deviceToken,undefined);
assert.equal(escapeHTML('<script>'), '&lt;script&gt;');
assert.ok(csv([['=1+1',' +cmd','@SUM(1)', '-1+1']]).includes('"\'=1+1"'),'free labels cannot become spreadsheet formulas');
delete globalThis.localStorage;
console.log('PASS · arbitrary Unicode aliases · anonymous · duplicate/renamed aliases · legacy capability · safe rendering/export');
