import { createClient } from 'npm:@supabase/supabase-js@2';
const url=Deno.env.get('SUPABASE_URL')!;
const secret=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
const publishable=Deno.env.get('SUPABASE_ANON_KEY')||JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default;
if(!url||!secret||!publishable)throw Error('Supabase environment missing');
const admin=createClient(url,secret,{auth:{persistSession:false}});
const auth=createClient(url,publishable,{auth:{persistSession:false}});
const CAMP='ccr-2026';
const ALLOWED_ORIGINS=new Set(['https://ntpnine9-nine.github.io','https://vjvptuecwewmqhkedybs.supabase.co','https://raw.githack.com','https://rawcdn.githack.com','http://localhost:8000','http://127.0.0.1:8000']);
const buckets=new Map<string,{count:number,reset:number}>();
function cors(req:Request){const origin=req.headers.get('origin')||'';return {'Access-Control-Allow-Origin':ALLOWED_ORIGINS.has(origin)?origin:'https://ntpnine9-nine.github.io','Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};}
function json(req:Request,data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors(req),'Content-Type':'application/json;charset=utf-8'}})}
const fail=(req:Request,error:string,status=400)=>json(req,{ok:false,error},status);
function normalized(s:string){return s.toUpperCase().replace(/[^A-Z0-9]/g,'')}
async function sha(s:string){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('')}
function ip(req:Request){return (req.headers.get('x-forwarded-for')||req.headers.get('cf-connecting-ip')||'unknown').split(',')[0].trim()}
function limited(req:Request,limit=80){const key=ip(req),now=Date.now();let b=buckets.get(key);if(!b||now>b.reset)b={count:0,reset:now+60000};b.count++;buckets.set(key,b);return b.count>limit}
async function adminUser(req:Request){const value=req.headers.get('authorization')||'';if(!value.startsWith('Bearer '))return null;const {data,error}=await auth.auth.getUser(value.slice(7));if(error||!data.user)return null;const {data:row,error:checkError}=await admin.from('admin_users').select('user_id').eq('user_id',data.user.id).maybeSingle();return !checkError&&row?data.user:null}
async function logAdmin(userId:string,action:string,details:Record<string,unknown>={}){await admin.from('admin_action_logs').insert({campaign_id:CAMP,user_id:userId,action,details})}
function inviteCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=crypto.getRandomValues(new Uint8Array(20));let raw='';for(const b of bytes)raw+=alphabet[b%alphabet.length];return 'CCR26-'+raw.match(/.{1,5}/g)!.join('-')}
async function catalog(){
  const [campaign,categories,options]=await Promise.all([
    admin.from('campaigns').select('id,title,status,target_budget,consideration_budget,catalog_version,results_frozen_at').eq('id',CAMP).single(),
    admin.from('menu_categories').select('category_key,label,position,icon,description').eq('campaign_id',CAMP).order('position'),
    admin.from('menu_options').select('id,category_key,name,unit_price,default_qty,note,source_image,portion_check,price_status,availability_status,catalog_version').eq('campaign_id',CAMP).order('id')
  ]);
  if(campaign.error||categories.error||options.error)throw Error('CATALOG_UNAVAILABLE');
  const cats=(categories.data||[]).map((c:any)=>({key:c.category_key,label:c.label,icon:c.icon,desc:c.description,options:(options.data||[]).filter((o:any)=>o.category_key===c.category_key).map((o:any)=>({id:o.id,name:o.name,price:o.unit_price,qty:o.default_qty,note:o.note,source:o.source_image,portionCheck:o.portion_check,priceStatus:o.price_status,availabilityStatus:o.availability_status,catalogVersion:o.catalog_version}))}));
  return {campaign:campaign.data,categories:cats};
}
Deno.serve(async(req:Request)=>{try{
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});
  if(req.method!=='POST')return fail(req,'METHOD_NOT_ALLOWED',405);
  if(limited(req))return fail(req,'TOO_MANY_REQUESTS',429);
  if(Number(req.headers.get('content-length')||0)>8192)return fail(req,'REQUEST_TOO_LARGE',413);
  let body:Record<string,any>;try{body=await req.json()}catch{return fail(req,'INVALID_JSON')}
  if(!body||typeof body!=='object'||JSON.stringify(body).length>8192||body.campaign!==CAMP)return fail(req,'INVALID_REQUEST');
  const op=String(body.op||'');
  if(op==='status'){
    const {data,error}=await admin.from('campaigns').select('status,catalog_version,results_frozen_at').eq('id',CAMP).single();
    return error?fail(req,'UNAVAILABLE',503):json(req,{ok:true,open:data.status==='open',catalogVersion:data.catalog_version,resultsFrozenAt:data.results_frozen_at});
  }
  if(op==='catalog'){
    const c=await catalog();if(c.categories.length!==8||c.categories.some((x:any)=>x.options.length!==7))return fail(req,'CATALOG_INVALID',503);
    return json(req,{ok:true,catalogVersion:c.campaign.catalog_version,status:c.campaign.status,targetBudget:c.campaign.target_budget,considerationBudget:c.campaign.consideration_budget,categories:c.categories});
  }
  if(op==='submit'){
    if(typeof body.code!=='string'||body.code.length>80)return fail(req,'INVALID_CODE');
    const code=normalized(body.code);if(!/^CCR26[A-Z2-9]{20}$/.test(code))return fail(req,'INVALID_CODE');
    if(!body.choices||typeof body.choices!=='object'||Array.isArray(body.choices))return fail(req,'INVALID_CHOICES');
    const keys=Object.keys(body.choices),expected=['A','B','C','D','E','F','G','H'];
    if(keys.length!==8||!expected.every(k=>typeof body.choices[k]==='string'&&new RegExp('^'+k+'[1-7]$').test(body.choices[k])))return fail(req,'SELECT_EIGHT_CATEGORIES');
    const {data:campaign,error:ce}=await admin.from('campaigns').select('catalog_version').eq('id',CAMP).single();if(ce)return fail(req,'UNAVAILABLE',503);
    if(body.catalogVersion!=null&&Number(body.catalogVersion)!==Number(campaign.catalog_version))return fail(req,'CATALOG_VERSION_MISMATCH',409);
    const {data,error}=await admin.rpc('submit_ballot',{p_campaign_id:CAMP,p_token_hash:await sha(code),p_choices:body.choices});
    if(error){const e=error.message;return fail(req,e.includes('VOTING_CLOSED')?'ปิดรับคะแนนแล้ว':e.includes('INVALID_INVITE')?'รหัสเชิญไม่ถูกต้องหรือถูกยกเลิก':e.includes('INVALID_MENU_OPTION')?'รายการอาหารไม่ตรงกับแค็ตตาล็อกปัจจุบัน':'SAVE_REJECTED',400)}
    if(!data?.[0]?.receipt)return fail(req,'SAVE_NOT_CONFIRMED',503);
    return json(req,{ok:true,receipt:String(data[0].receipt).slice(0,8),saved_at:data[0].saved_at});
  }
  if(!op.startsWith('admin.'))return fail(req,'UNKNOWN_OPERATION',404);
  const user=await adminUser(req);if(!user)return fail(req,'ADMIN_UNAUTHORIZED',403);
  if(op==='admin.results'){
    const {data:campaign,error:ce}=await admin.from('campaigns').select('status,eligible_voters,catalog_version,results_frozen_at').eq('id',CAMP).single();if(ce)return fail(req,'CAMPAIGN_NOT_FOUND',404);
    let rows:any[]=[];for(let from=0;from<10000;from+=500){const {data,error}=await admin.from('ballots').select('choices').eq('campaign_id',CAMP).range(from,from+499);if(error)return fail(req,'READ_FAILURE',503);rows.push(...(data||[]));if(!data||data.length<500)break}
    const tallies:Record<string,number>={};for(const row of rows)for(const id of Object.values(row.choices||{})){if(typeof id==='string')tallies[id]=(tallies[id]||0)+1}
    const [allInvites,activeInvites]=await Promise.all([
      admin.from('invite_codes').select('*',{count:'exact',head:true}).eq('campaign_id',CAMP),
      admin.from('invite_codes').select('*',{count:'exact',head:true}).eq('campaign_id',CAMP).eq('active',true)
    ]);
    if(allInvites.error||activeInvites.error)return fail(req,'READ_FAILURE',503);
    return json(req,{ok:true,count:rows.length,invites:allInvites.count||0,activeInvites:activeInvites.count||0,status:campaign.status,eligibleVoters:campaign.eligible_voters,catalogVersion:campaign.catalog_version,resultsFrozenAt:campaign.results_frozen_at,tallies});
  }
  if(op==='admin.invites.list'){
    const [inv,ballots]=await Promise.all([
      admin.from('invite_codes').select('id,active,created_at,revoked_at').eq('campaign_id',CAMP).order('created_at',{ascending:false}).limit(500),
      admin.from('ballots').select('invite_id').eq('campaign_id',CAMP)
    ]);if(inv.error||ballots.error)return fail(req,'READ_FAILURE',503);
    const voted=new Set((ballots.data||[]).map((x:any)=>x.invite_id));
    return json(req,{ok:true,items:(inv.data||[]).map((x:any)=>({id:x.id,active:x.active,createdAt:x.created_at,revokedAt:x.revoked_at,hasBallot:voted.has(x.id)}))});
  }
  if(op==='admin.invites'){
    const count=Number(body.count);if(!Number.isInteger(count)||count<1||count>200)return fail(req,'INVALID_COUNT');
    const items=[] as {id:string,code:string,token_hash:string}[];for(let i=0;i<count;i++){const code=inviteCode();items.push({id:crypto.randomUUID(),code,token_hash:await sha(normalized(code))})}
    const {error}=await admin.from('invite_codes').insert(items.map(x=>({id:x.id,campaign_id:CAMP,token_hash:x.token_hash})));if(error)return fail(req,'CREATE_INVITES_ERROR',503);
    await logAdmin(user.id,'invite.generate',{count});return json(req,{ok:true,items:items.map(({id,code})=>({id,code}))});
  }
  if(op==='admin.invites.revoke'){
    const inviteId=String(body.inviteId||'');if(!/^[0-9a-f-]{36}$/i.test(inviteId))return fail(req,'INVALID_INVITE_ID');
    const {data,error}=await admin.from('invite_codes').update({active:false,revoked_at:new Date().toISOString()}).eq('campaign_id',CAMP).eq('id',inviteId).select('id').maybeSingle();if(error||!data)return fail(req,'INVITE_NOT_FOUND',404);
    await logAdmin(user.id,'invite.revoke',{inviteId});return json(req,{ok:true});
  }
  if(op==='admin.status'){
    if(body.status!=='open'&&body.status!=='closed')return fail(req,'INVALID_STATUS');
    const {data:current,error:re}=await admin.from('campaigns').select('results_frozen_at').eq('id',CAMP).single();if(re)return fail(req,'READ_FAILURE',503);
    if(body.status==='open'&&current.results_frozen_at)return fail(req,'RESULTS_FROZEN',409);
    const {error}=await admin.from('campaigns').update({status:body.status,updated_at:new Date().toISOString()}).eq('id',CAMP);if(error)return fail(req,'UPDATE_FAILED',503);
    await logAdmin(user.id,'campaign.status',{status:body.status});return json(req,{ok:true,status:body.status});
  }
  if(op==='admin.freeze'){
    const {data:campaign,error:ce}=await admin.from('campaigns').select('status,results_frozen_at').eq('id',CAMP).single();if(ce)return fail(req,'READ_FAILURE',503);
    if(campaign.status!=='closed')return fail(req,'CLOSE_CAMPAIGN_FIRST',409);
    if(campaign.results_frozen_at)return json(req,{ok:true,resultsFrozenAt:campaign.results_frozen_at});
    const now=new Date().toISOString();const {error}=await admin.from('campaigns').update({results_frozen_at:now,updated_at:now}).eq('id',CAMP);if(error)return fail(req,'FREEZE_FAILED',503);
    await logAdmin(user.id,'results.freeze',{at:now});return json(req,{ok:true,resultsFrozenAt:now});
  }
  return fail(req,'UNKNOWN_ADMIN_OPERATION',404);
}catch(error){console.error('vote edge error',error);return fail(req,'SERVER_ERROR',500)}});