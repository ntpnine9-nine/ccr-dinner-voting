const target=new Date('2026-12-18T00:00:00+07:00');
const $=id=>document.getElementById(id);
function tick(){
  const diff=Math.max(0,target-Date.now());
  const days=Math.floor(diff/86400000);
  const hours=Math.floor(diff%86400000/3600000);
  const minutes=Math.floor(diff%3600000/60000);
  if($('days'))$('days').textContent=String(days).padStart(2,'0');
  if($('hours'))$('hours').textContent=String(hours).padStart(2,'0');
  if($('minutes'))$('minutes').textContent=String(minutes).padStart(2,'0');
}
tick();setInterval(tick,30000);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
if(!reduce&&'IntersectionObserver' in window){
  const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target)}}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));
}else document.querySelectorAll('.reveal').forEach(el=>el.classList.add('is-visible'));
