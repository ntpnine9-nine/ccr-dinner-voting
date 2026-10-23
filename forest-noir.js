// Native details gives mobile navigation a stable first paint and a no-JS fallback.
const menu = document.querySelector('.fn-mobile-navigation');
if (menu) {
  const toggle = menu.querySelector('summary');
  const sync = () => toggle.setAttribute('aria-expanded', String(menu.open));
  sync(); menu.addEventListener('toggle', sync);
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') { menu.open = false; sync(); toggle.focus(); }
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.open = false; sync(); } });
}
const photos = [...document.querySelectorAll('.gallery-bento figure')];
if (photos.length && typeof HTMLDialogElement !== 'undefined') {
  const dialog = document.createElement('dialog');
  dialog.className = 'fn-lightbox'; dialog.setAttribute('aria-label', 'ภาพสถานที่จัดงาน');
  const toolbar = document.createElement('div'); toolbar.className = 'fn-lightbox-tools';
  const makeButton = text => { const b = document.createElement('button'); b.type = 'button'; b.textContent = text; return b; };
  const previous = makeButton('← ภาพก่อนหน้า'), next = makeButton('ภาพถัดไป →'), close = makeButton('ปิดภาพ ×');
  const count = document.createElement('span'); count.setAttribute('aria-live', 'polite');
  toolbar.append(previous, count, next, close);
  const image = document.createElement('img'), caption = document.createElement('p');
  image.alt = ''; image.hidden = true; caption.id = 'venuePhotoCaption';
  dialog.setAttribute('aria-describedby', caption.id);
  dialog.append(toolbar, image, caption); document.body.append(dialog);
  const entries = [];
  let current = 0, opener = null, previousOverflow = '';
  const render = () => {
    const entry = entries[current]; image.src = entry.source.currentSrc || entry.source.src;
    image.alt = entry.source.alt; image.hidden = false;
    caption.textContent = entry.figure.querySelector('figcaption')?.textContent || entry.source.alt;
    count.textContent = `${current + 1} / ${entries.length}`;
  };
  for (const figure of photos) {
    const source = figure.querySelector('img'); if (!source) continue;
    const trigger = makeButton(''); trigger.setAttribute('aria-label', 'ขยายภาพ ' + source.alt);
    source.before(trigger); trigger.append(source);
    const index = entries.length; entries.push({figure, source, trigger});
    trigger.addEventListener('click', () => {
      current = index; opener = trigger; render();
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden'; dialog.showModal(); close.focus();
    });
  }
  const move = direction => { current = (current + direction + entries.length) % entries.length; render(); };
  previous.addEventListener('click', () => move(-1)); next.addEventListener('click', () => move(1));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(e.key === 'ArrowRight' ? 1 : -1); }
  });
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow;
    opener?.focus({preventScroll: true});
  });
}
