const OWNER='ntpnine9-nine';
const REPO='ccr-dinner-voting';
const BRANCH='main';
const allowed=new Set(['index.html','admin.html','styles.css','config.js','common.js','decision-engine.js','vote.js','admin.js']);
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
Deno.serve((req:Request)=>{
  if(req.method!=='GET'&&req.method!=='HEAD')return new Response('Method Not Allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  const p=assetPath(new URL(req.url).pathname);
  if(!allowed.has(p))return new Response('Not Found',{status:404,headers:{'cache-control':'no-store'}});
  const target='https://raw.githack.com/'+OWNER+'/'+REPO+'/'+BRANCH+'/'+p;
  return Response.redirect(target,302);
});