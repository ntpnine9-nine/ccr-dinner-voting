const target=new Date('2026-12-18T18:00:00+07:00');
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

function eventUrl(){return new URL('./',location.href).href}
function setShareStatus(message){const el=$('shareStatus');if(el)el.textContent=message}
$('shareEvent')?.addEventListener('click',async()=>{
  const data={title:'CCR After Hours 2026',text:'ศุกร์ 18 ธันวาคม 2026 · ครัวซอย 11 · CCR Year-End Celebration',url:eventUrl()};
  try{
    if(navigator.share){await navigator.share(data);setShareStatus('เปิดหน้าต่างแชร์แล้ว');return}
    await navigator.clipboard.writeText(data.url);setShareStatus('คัดลอกลิงก์คำเชิญแล้ว ✓');
  }catch(e){if(e?.name!=='AbortError')setShareStatus('แชร์อัตโนมัติไม่ได้ — สามารถคัดลอก URL จากเบราว์เซอร์ได้')}
});
$('addCalendar')?.addEventListener('click',()=>{
  const esc=s=>String(s).replaceAll('\\','\\\\').replaceAll(';','\\;').replaceAll(',','\\,').replaceAll('\n','\\n');
  const ics=[
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CCR After Hours//TH',
    'CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT',
    'UID:ccr-after-hours-2026@ccr-dinner-voting',
    'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
    'DTSTART;VALUE=DATE:20261218','DTEND;VALUE=DATE:20261219',
    'SUMMARY:'+esc('CCR After Hours 2026'),
    'LOCATION:'+esc('ครัวซอย 11, เฉลิมพระเกียรติ ร.9 ซอย 11, หนองบอน, ประเวศ, กรุงเทพฯ 10250'),
    'DESCRIPTION:'+esc('CCR Year-End Celebration · เวลาเริ่มงานรอยืนยัน Final Schedule · '+eventUrl()),
    'URL:'+eventUrl(),'END:VEVENT','END:VCALENDAR'
  ].join('\r\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar;charset=utf-8'}));a.download='CCR-After-Hours-2026.ics';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);setShareStatus('สร้างไฟล์ปฏิทินแบบ All-day แล้ว ✓ · เวลาเริ่มงานยังรอยืนยัน');
});
