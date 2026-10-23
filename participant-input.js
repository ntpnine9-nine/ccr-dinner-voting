import {normalizeParticipantLabel, setParticipantLabel} from './common.js?v=20261022-servings1';

// The backend counts NFC Unicode code points, not UTF-16 code units. Keep
// composition intact (Thai keyboards / emoji), and validate before any request.
export function bindParticipantInput(input) {
  if (!input) return;
  input.removeAttribute('maxlength');
  const help = document.createElement('small');
  help.id = input.id + 'Limit';
  help.className = 'participant-limit';
  input.after(help);
  input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), help.id].filter(Boolean).join(' '));
  const validate = () => {
    const length = [...input.value.normalize('NFC').trim()].length;
    let error = '';
    try { normalizeParticipantLabel(input.value); } catch (e) { error = e.message; }
    input.setCustomValidity(error);
    input.setAttribute('aria-invalid', String(Boolean(error)));
    help.textContent = error || `${length}/80 ตัวอักษร · ไม่บังคับ · ชื่อนี้ไม่ใช่รหัสเข้าสู่ระบบ`;
    help.classList.toggle('invalid', Boolean(error));
    setParticipantLabel(input.value);
  };
  input.addEventListener('input', e => { if (!e.isComposing) validate(); });
  input.addEventListener('compositionend', validate);
  input.addEventListener('change', validate);
  validate();
}
