// Progressive enhancement: navigation remains fully available without JavaScript.
const header=document.querySelector('.event-nav'), nav=header?.querySelector('.event-nav-links');
if(nav){
 nav.id ||= 'participantNavigation';
 const toggle=document.createElement('button');toggle.type='button';toggle.className='fn-menu-toggle';toggle.textContent='เมนู ☰';toggle.setAttribute('aria-controls',nav.id);toggle.setAttribute('aria-expanded','false');header.classList.add('fn-enhanced');header.insertBefore(toggle,nav);
 const close=()=>{header.classList.remove('menu-open');toggle.setAttribute('aria-expanded','false');};
 toggle.addEventListener('click',()=>{const open=header.classList.toggle('menu-open');toggle.setAttribute('aria-expanded',String(open));});
 header.addEventListener('keydown',e=>{if(e.key==='Escape'){close();toggle.focus();}});
 nav.addEventListener('click',e=>{if(e.target.closest('a'))close();});
}
const photos=[...document.querySelectorAll('.gallery-bento figure')];
if(photos.length&&typeof HTMLDialogElement!=='undefined'){
 const dialog=document.createElement('dialog');dialog.className='fn-lightbox';dialog.setAttribute('aria-label','ภาพสถานที่จัดงาน');
 const close=document.createElement('button');close.type='button';close.textContent='ปิดภาพ ×';const image=document.createElement('img'),caption=document.createElement('p');dialog.append(close,image,caption);document.body.append(dialog);close.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 for(const figure of photos){const source=figure.querySelector('img');if(!source)continue;const button=document.createElement('button');button.type='button';button.setAttribute('aria-label','ขยายภาพ '+source.alt);source.before(button);button.append(source);button.addEventListener('click',()=>{image.src=source.currentSrc||source.src;image.alt=source.alt;caption.textContent=figure.querySelector('figcaption')?.textContent||source.alt;dialog.showModal();});}
}
