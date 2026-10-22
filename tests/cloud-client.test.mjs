import assert from 'node:assert/strict';
import {getDeviceToken, DEVICE_STORAGE_KEY, setSharedToken, getSharedToken, api} from '../common.js';

const values = new Map();
globalThis.localStorage = {
  getItem: k => values.get(k) ?? null,
  setItem: (k, v) => values.set(k, v),
  removeItem: k => values.delete(k)
};
const first = getDeviceToken();
assert.match(first, /^[a-f0-9]{64}$/);
assert.equal(getDeviceToken(), first, 'both forms and retries keep one participant');
values.set(DEVICE_STORAGE_KEY, 'corrupt');
assert.notEqual(getDeviceToken(), first, 'invalid saved identity is replaced');
setSharedToken('CCR26-ABCDE-FGHJK-LMNPQ-RSTUV');
assert.equal(getSharedToken(), 'CCR26-ABCDE-FGHJK-LMNPQ-RSTUV');
setSharedToken('');
assert.equal(getSharedToken(), '', 'clearing optional invite must persist across pages');
globalThis.localStorage = {getItem() {throw Error('blocked');}};
assert.throws(getDeviceToken, /เบราว์เซอร์/, 'never send a token that cannot be retained');

const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => ({ok: false, status: 503, text: async () => JSON.stringify({ok: false, error: 'SAVE_NOT_CONFIRMED'})});
  await assert.rejects(api('submit', {choices: {}}), /SAVE_NOT_CONFIRMED/);
  globalThis.fetch = async () => ({ok: true, status: 200, text: async () => JSON.stringify({ok: false, error: 'VOTING_CLOSED'})});
  await assert.rejects(api('submit'), /VOTING_CLOSED/);
  globalThis.fetch = async () => ({ok: true, status: 200, text: async () => '<html>offline</html>'});
  await assert.rejects(api('submit'), /HTTP 200/);
  globalThis.fetch = async (url, options) => {
    assert.equal(options.headers.Authorization, undefined, 'public vote needs no admin secret');
    const body = JSON.parse(options.body);
    assert.equal(body.deviceToken, first);
    return {ok: true, status: 200, text: async () => JSON.stringify({ok: true, receipt: 'receipt', saved_at: '2026-10-22T00:00:00Z'})};
  };
  assert.equal((await api('submit', {deviceToken: first})).receipt, 'receipt');
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.localStorage;
}
console.log('PASS · persistent public identity · storage failures · truthful cloud responses');
