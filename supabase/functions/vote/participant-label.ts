// Undefined preserves labels for old clients; an explicit empty string clears it.
export function normalizeParticipantLabel(raw: unknown): string | null {
  if (raw === undefined) return null;
  if (typeof raw !== 'string') throw Error('INVALID_PARTICIPANT_LABEL');
  const label = raw.normalize('NFC').trim();
  if ([...label].length > 80 || /[\u0000-\u001f\u007f-\u009f]/u.test(label)) {
    throw Error('INVALID_PARTICIPANT_LABEL');
  }
  return label;
}
