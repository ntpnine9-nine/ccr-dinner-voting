// Owner-confirmed event time. Always parse an explicit offset, never device-local time.
export const EVENT_START_ISO = '2026-12-18T17:00:00+07:00';
export const EVENT_START_MS = Date.parse(EVENT_START_ISO);
export const EVENT_TIME_LABEL = 'ศุกร์ 18 ธันวาคม 2026 · 17:00 น. (เวลาประเทศไทย)';

export function countdownAt(now = Date.now()) {
  const remaining = Math.max(0, Math.ceil((EVENT_START_MS - now) / 1000));
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor(remaining % 86400 / 3600),
    minutes: Math.floor(remaining % 3600 / 60),
    seconds: remaining % 60,
    started: now >= EVENT_START_MS
  };
}

export function eventCalendar(url, now = new Date()) {
  const escape = value => String(value).replaceAll('\\', '\\\\').replaceAll(';', '\\;').replaceAll(',', '\\,').replaceAll('\n', '\\n');
  // Timed UTC DTSTART is portable; omit DTEND because the owner has not set an end time.
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CCR After Hours//TH',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    'UID:ccr-after-hours-2026@ccr-dinner-voting',
    'DTSTAMP:' + now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''),
    'DTSTART:20261218T100000Z',
    'SUMMARY:CCR After Hours 2026',
    'LOCATION:' + escape('ครัวซอย 11, เฉลิมพระเกียรติ ร.9 ซอย 11, หนองบอน, ประเวศ, กรุงเทพฯ 10250'),
    'DESCRIPTION:' + escape(EVENT_TIME_LABEL + ' · เวลาเลิกงานรอแจ้ง · ' + url),
    'URL:' + url, 'END:VEVENT', 'END:VCALENDAR'
  ];
  // RFC 5545 folds content lines by UTF-8 octets, keeping Thai code points intact.
  const encoder = new TextEncoder();
  return lines.map(line => {
    let out = '', part = '', size = 0;
    for (const char of line) {
      const width = encoder.encode(char).length;
      if (size + width > 75) { out += part + '\r\n'; part = ' '; size = 1; }
      part += char; size += width;
    }
    return out + part;
  }).join('\r\n') + '\r\n';
}
