import { createClient } from 'npm:@supabase/supabase-js@2';
const url=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
const publishable=Deno.env.get('SUPABASE_ANON_KEY')||JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default;
if(!url||!secret||!publishable)throw Error('Supabase environment missing');
const db=createClient(url,secret,{auth:{persistSession:false}});
const auth=createClient(url,publishable,{auth:{persistSession:false}});
const BUCKET='ccr-public';
const OWNER='ntpnine9-nine';
const REPO='ccr-dinner-voting';
const files=[
  ['index.html','text/html; charset=utf-8'],
  ['vote.html','text/html; charset=utf-8'],
  ['party.html','text/html; charset=utf-8'],
  ['venue.html','text/html; charset=utf-8'],
  ['guide.html','text/html; charset=utf-8'],
  ['admin.html','text/html; charset=utf-8'],
  ['styles.css','text/css; charset=utf-8'],
  ['event.css','text/css; charset=utf-8'],
  ['config.js','text/javascript; charset=utf-8'],
  ['common.js','text/javascript; charset=utf-8'],
  ['decision-engine.js','text/javascript; charset=utf-8'],
  ['vote.js','text/javascript; charset=utf-8'],
  ['admin.js','text/javascript; charset=utf-8'],
  ['event.js','text/javascript; charset=utf-8'],
  ['party.js','text/javascript; charset=utf-8'],
  ['menus.json','application/json; charset=utf-8'],
  ['assets/menu-cover.jpg','image/jpeg'],
  ['assets/menu-spread.jpg','image/jpeg'],
  ['assets/venue-night-hero.jpg','image/jpeg'],
  ['assets/venue-dining-wide.jpg','image/jpeg'],
  ['assets/venue-counter-sign.jpg','image/jpeg'],
  ['assets/venue-seating-zone.jpg','image/jpeg'],
  ['assets/venue-table-detail.jpg','image/jpeg'],
  ['assets/venue-sign-night.jpg','image/jpeg'],
  ['assets/venue-soi11-day.jpg','image/jpeg'],
  ['assets/venue-landmark-ptt.jpg','image/jpeg'],
  ['assets/venue-soi11-lane.jpg','image/jpeg'],
  ['assets/venue-parking-night.jpg','image/jpeg'],
  ['assets/food-tomyum-pot.jpg','image/jpeg'],
  ['assets/food-stirfry-duo.jpg','image/jpeg'],
  ['assets/food-crispy-squid.jpg','image/jpeg'],
  ['assets/food-seafood-dip.jpg','image/jpeg'],
  ['assets/food-grilled-pork.jpg','image/jpeg'],
  ['assets/food-seafood-salad.jpg','image/jpeg'],
  ['assets/food-fried-strips.jpg','image/jpeg'],
  ['assets/food-garlic-pork.jpg','image/jpeg'],
  ['.nojekyll','text/plain; charset=utf-8']
] as const;
async function adminUser(req:Request){
  const value=req.headers.get('authorization')||'';
  if(!value.startsWith('Bearer '))return null;
  const {data,error}=await auth.auth.getUser(value.slice(7));
  if(error||!data.user)return null;
  const {data:row,error:checkError}=await db.from('admin_users').select('user_id').eq('user_id',data.user.id).maybeSingle();
  return !checkError&&row?data.user:null;
}
async function currentSha(){
  const r=await fetch('https://api.github.com/repos/'+OWNER+'/'+REPO+'/commits/main',{headers:{'User-Agent':'CCR-Publisher/1.0','Accept':'application/vnd.github+json'}});
  if(!r.ok)throw Error('GITHUB_COMMIT_UNAVAILABLE');
  const j=await r.json();return String(j.sha||'');
}
async function existingSha(){
  const {data,error}=await db.storage.from(BUCKET).download('deploy.json');
  if(error||!data)return '';
  try{return String(JSON.parse(await data.text()).sha||'')}catch{return ''}
}
Deno.serve(async(req:Request)=>{
  if(req.method!=='POST')return new Response(JSON.stringify({ok:false,error:'METHOD_NOT_ALLOWED'}),{status:405,headers:{'content-type':'application/json'}});
  const user=await adminUser(req);
  if(!user)return new Response(JSON.stringify({ok:false,error:'ADMIN_UNAUTHORIZED'}),{status:403,headers:{'content-type':'application/json','cache-control':'no-store'}});
  try{
    const sha=await currentSha();
    if(!sha)return new Response(JSON.stringify({ok:false,error:'NO_SHA'}),{status:503,headers:{'content-type':'application/json'}});
    const {data:bucket}=await db.storage.getBucket(BUCKET);
    if(!bucket){const {error}=await db.storage.createBucket(BUCKET,{public:true,fileSizeLimit:2097152,allowedMimeTypes:['text/html','text/css','text/javascript','text/plain','application/json','image/jpeg']});if(error)throw error;}
    if(await existingSha()===sha)return new Response(JSON.stringify({ok:true,sha,changed:false}),{headers:{'content-type':'application/json','cache-control':'no-store'}});
    for(const [path,contentType] of files){
      const raw='https://raw.githubusercontent.com/'+OWNER+'/'+REPO+'/'+sha+'/'+path;
      const r=await fetch(raw,{headers:{'User-Agent':'CCR-Publisher/1.0'}});
      if(!r.ok)throw Error('FETCH_FAILED:'+path+':'+r.status);
      const body=await r.arrayBuffer();
      const {error}=await db.storage.from(BUCKET).upload(path,body,{contentType,cacheControl:path.endsWith('.html')?'60':'300',upsert:true});
      if(error)throw error;
    }
    const manifest=new TextEncoder().encode(JSON.stringify({sha,published_at:new Date().toISOString(),source:OWNER+'/'+REPO}));
    const {error}=await db.storage.from(BUCKET).upload('deploy.json',manifest,{contentType:'application/json',cacheControl:'60',upsert:true});
    if(error)throw error;
    return new Response(JSON.stringify({ok:true,sha,changed:true,files:files.length}),{headers:{'content-type':'application/json','cache-control':'no-store'}});
  }catch(e){console.error('publish-static',e);return new Response(JSON.stringify({ok:false,error:'PUBLISH_FAILED'}),{status:500,headers:{'content-type':'application/json','cache-control':'no-store'}})}
});