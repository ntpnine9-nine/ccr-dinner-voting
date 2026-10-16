const OWNER='ntpnine9-nine';
const REPO='ccr-dinner-voting';
const BRANCH='main';
const allowed=new Set(['index.html','admin.html','styles.css','config.js','common.js','decision-engine.js','vote.js','admin.js']);
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8'};
function assetPath(pathname:string){
  let p=pathname||'/';
  const tag='/ccr-app';
  const i=p.lastIndexOf(tag);
  if(i>=0)p=p.slice(i+tag.length);
  p=p.replace(/^\/+|\/+$/g,'');
  if(!p)p='index.html';
  if(p==='admin')p='admin.html';
  return p;
}
Deno.serve(async(req:Request)=>{
  if(req.method!=='GET'&&req.method!=='HEAD')return new Response('Method Not Allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const u=new URL(req.url);
  const p=assetPath(u.pathname);
  if(!allowed.has(p))return new Response('Not Found',{status:404,headers:{'cache-control':'no-store'}});
  const raw='https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/'+p;
  const upstream=await fetch(raw,{headers:{'User-Agent':'CCR-Dinner-Voting-Edge/1.0'}});
  if(!upstream.ok)return new Response('Application asset unavailable',{status:502,headers:{'cache-control':'no-store'}});
  const ext=p.split('.').pop()||'html';
  const contentType=types[ext as keyof typeof types]||'text/plain; charset=utf-8';
  const headers=new Headers();
  headers.set('content-type',contentType);
  headers.set('cache-control',p.endsWith('.html')?'no-store':'public, max-age=60, s-maxage=60');
  headers.set('x-content-type-options','nosniff');
  headers.set('referrer-policy','strict-origin-when-cross-origin');
  headers.set('permissions-policy','camera=(), microphone=(), geolocation=()');
  headers.set('content-security-policy',"default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://esm.sh https://vjvptuecwewmqhkedybs.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; script-src 'self' https://esm.sh; connect-src 'self' https://vjvptuecwewmqhkedybs.supabase.co https://esm.sh; img-src 'self' data:; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  if(req.method==='HEAD')return new Response(null,{status:200,headers});
  const body=await upstream.text();
  return new Response(body,{status:200,headers});
});