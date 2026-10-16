const OWNER='ntpnine9-nine';
const REPO='ccr-dinner-voting';
const BRANCH='main';
const allowed=new Set([
  'index.html','vote.html','party.html','venue.html','guide.html','admin.html',
  'styles.css','event.css','config.js','common.js','decision-engine.js','vote.js','admin.js','event.js','party.js',
  'assets/menu-cover.jpg','assets/menu-spread.jpg'
]);
const types:Record<string,string>={
  '.html':'text/html; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8',
  '.jpg':'image/jpeg',
  '.jpeg':'image/jpeg'
};
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
function contentType(path:string){
  const ext=path.includes('.')?'.'+path.split('.').pop()!.toLowerCase():'';
  return types[ext]||'application/octet-stream';
}
Deno.serve(async(req:Request)=>{
  if(req.method!=='GET'&&req.method!=='HEAD')return new Response('Method Not Allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const p=assetPath(new URL(req.url).pathname);
  if(!allowed.has(p))return new Response('Not Found',{status:404,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
  try{
    const upstream='https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/'+p;
    const r=await fetch(upstream,{headers:{'User-Agent':'CCR-After-Hours/1.0','Accept':'*/*'}});
    if(!r.ok)return new Response('Upstream unavailable',{status:502,headers:{'cache-control':'no-store'}});
    const headers={
      'content-type':contentType(p),
      'cache-control':p.endsWith('.html')?'public, max-age=60, s-maxage=60':'public, max-age=300, s-maxage=300',
      'x-content-type-options':'nosniff',
      'referrer-policy':'no-referrer',
      'x-ccr-source':'github-main'
    };
    if(req.method==='HEAD')return new Response(null,{status:200,headers});
    return new Response(r.body,{status:200,headers});
  }catch(e){
    console.error('ccr-app proxy failure',e);
    return new Response('Gateway unavailable',{status:503,headers:{'cache-control':'no-store'}});
  }
});