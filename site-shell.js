const page = document.body.dataset.page || 'home';
const pageMap = {
  home: {label:'หน้าแรก', href:'./index.html'},
  participate: {label:'ร่วมเลือก', href:'./party.html'},
  food: {label:'โหวตอาหาร', href:'./vote.html'},
  venue: {label:'สถานที่', href:'./venue.html'},
  guide: {label:'ข้อมูลวันงาน', href:'./guide.html'}
};
const order = ['home','participate','food','venue','guide'];
const labels = order.map(key => ({key, ...pageMap[key]}));
const currentIndex = Math.max(0, order.indexOf(page));
const previous = currentIndex > 0 ? pageMap[order[currentIndex-1]] : null;
const next = currentIndex < order.length-1 ? pageMap[order[currentIndex+1]] : null;

function navLink(item, compact=false){
  const active = item.key === page;
  return `<a href="${item.href}" class="ccr-nav-link${active?' is-active':''}" ${active?'aria-current="page"':''}>${compact?item.label.replace('ข้อมูลวันงาน','ข้อมูล'):item.label}</a>`;
}

const header = document.getElementById('siteHeader');
if(header){
  header.innerHTML = `
  <header class="ccr-header">
    <div class="ccr-nav-wrap">
      <a class="ccr-brand" href="./index.html" aria-label="CCR After Hours 2026 หน้าแรก">
        <span class="ccr-brand-mark">C</span>
        <span class="ccr-brand-copy"><b>CCR After Hours</b><small>18 DEC 2026 · KRUASOI 11</small></span>
      </a>
      <nav class="ccr-desktop-nav" aria-label="เมนูหลัก">${labels.map(x=>navLink(x)).join('')}</nav>
      <div class="ccr-nav-actions">
        <a class="ccr-nav-cta" href="./party.html">เริ่มเลือก <span>↗</span></a>
        <button class="ccr-menu-button" id="ccrMenuButton" type="button" aria-expanded="false" aria-controls="ccrMenuPanel" aria-label="เปิดเมนู">☰</button>
      </div>
    </div>
    <div id="ccrMenuPanel" class="ccr-menu-panel" hidden>${labels.map(x=>navLink(x)).join('')}</div>
  </header>`;
}

const footer = document.getElementById('siteFooter');
if(footer){
  footer.innerHTML = `
  <footer class="ccr-footer">
    <div><b>CCR AFTER HOURS 2026</b><span>ONE TEAM · ONE TABLE · ONE NIGHT</span></div>
    <div class="ccr-footer-links">${labels.map(x=>`<a href="${x.href}">${x.label}</a>`).join('')}</div>
  </footer>`;
}

const dock = document.getElementById('mobileDock');
if(dock){
  const dockItems = labels.filter(x=>['home','participate','food','venue'].includes(x.key));
  dock.innerHTML = `<nav class="ccr-mobile-dock" aria-label="เมนูมือถือ">${dockItems.map(x=>navLink(x,true)).join('')}</nav>`;
}

const flow = document.getElementById('pageFlow');
if(flow && page !== 'home'){
  flow.innerHTML = `
    <section class="ccr-flow-band" aria-label="นำทางตามลำดับงาน">
      <div class="ccr-flow-copy"><span>YOU ARE HERE</span><strong>${pageMap[page]?.label || ''}</strong></div>
      <div class="ccr-flow-actions">
        ${previous?`<a class="ccr-flow-prev" href="${previous.href}">← ${previous.label}</a>`:''}
        ${next?`<a class="ccr-flow-next" href="${next.href}">${next.label} →</a>`:'<a class="ccr-flow-next" href="./index.html">กลับหน้าแรก →</a>'}
      </div>
    </section>`;
}

const btn = document.getElementById('ccrMenuButton');
const panel = document.getElementById('ccrMenuPanel');
btn?.addEventListener('click',()=>{
  const open = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!open));
  panel.hidden = open;
  document.body.classList.toggle('menu-open', !open);
});
panel?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
  btn?.setAttribute('aria-expanded','false');
  panel.hidden = true;
  document.body.classList.remove('menu-open');
}));

const revealEls = document.querySelectorAll('[data-reveal]');
if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  const io = new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('is-visible'); io.unobserve(entry.target);}
  }),{threshold:.1});
  revealEls.forEach(el=>io.observe(el));
}else revealEls.forEach(el=>el.classList.add('is-visible'));
