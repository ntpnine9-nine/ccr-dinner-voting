const OWNER='ntpnine9-nine';
const REPO='ccr-dinner-voting';
const BRANCH='main';
const allowed=new Set(['index.html','admin.html','styles.css','config.js','common.js','decision-engine.js','vote.js','admin.js']);
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8'};
Deno.serve(async(req:Request)=>{
  if(req.method!=='GET'&&req.method!=='HEAD')return new Response('Method Not Allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const u=new URL(req.url);
  const marker='/functions/v1/ccr-app';
  let p=u.pathname.startsWith(marker)?u.pathname.slice(marker.length):u.pathname;
  p=p.replace(/^\/+|\/+$/g,'');
  if(!p)p='index.html';
  if(p==='admin')p='admin.html';
  if(!allowed.has(p))return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});
  const raw='https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/'+p;
  const upstream=await fetch(raw,{headers:{'User-Agent':'CCR-Dinner-Voting-Edge/1.0'}});
  if(!upstream.ok)return new Response('Application asset unavailable',{status:502,headers:{'Cache-Control':'no-store'}});
  const ext=p.split('.').pop()||'html';
  const headers=new Headers({
    'Content-Type':types[ext as keyof typeof types]||'text/plain; charset=utf-8',
    'Cache-Control':p.endsWith('.html')?'no-store':'public, max-age=60, s-maxage=60',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'strict-origin-when-cross-origin',
    'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy':"default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://esm.sh https://vjvptuecwewmqhkedybs.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; script-src 'self' https://esm.sh; connect-src 'self' https://vjvptuecwewmqhkedybs.supabase.co https://esm.sh; img-src 'self' data:; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"
  });
  if(req.method==='HEAD')return new Response(null,{status:200,headers});
  return new Response(await upstream.arrayBuffer(),{status:200,headers});
});