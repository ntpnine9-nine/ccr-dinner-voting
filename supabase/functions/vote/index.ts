import {normalizeChoices,tallyChoices,isLegacyBallot} from './ballot-model.js';
import { normalizeParticipantLabel } from './participant-label.ts';
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
function ip(req:Request){return (req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim()}
function limited(req:Request,limit=80){
  const key=ip(req),now=Date.now();
  if(buckets.size>2000){for(const [k,v] of buckets)if(now>v.reset)buckets.delete(k);if(buckets.size>2000)buckets.clear()}
  let b=buckets.get(key);if(!b||now>b.reset)b={count:0,reset:now+60000};b.count++;buckets.set(key,b);return b.count>limit;
}
async function adminUser(req:Request){const value=req.headers.get('authorization')||'';if(!value.startsWith('Bearer '))return null;const {data,error}=await auth.auth.getUser(value.slice(7));if(error||!data.user)return null;const {data:row,error:checkError}=await admin.from('admin_users').select('user_id').eq('user_id',data.user.id).maybeSingle();return !checkError&&row?data.user:null}
function inviteCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=crypto.getRandomValues(new Uint8Array(20));let raw='';for(const b of bytes)raw+=alphabet[b%alphabet.length];return 'CCR26-'+raw.match(/.{1,5}/g)!.join('-')}
function submissionIdentity(body:Record<string,any>){
  if(body.code!=null&&typeof body.code!=='string')throw Error('INVALID_CODE');
  const raw=String(body.code||'').trim();
  if(raw){
    if(raw.length>80)throw Error('INVALID_CODE');
    const code=normalized(raw);if(!/^CCR26[A-Z2-9]{20}$/.test(code))throw Error('INVALID_CODE');
    return {open:false,value:code};
  }
  if(typeof body.deviceToken!=='string'||!/^[a-f0-9]{64}$/.test(body.deviceToken))throw Error('INVALID_DEVICE_TOKEN');
  return {open:true,value:CAMP+':open:'+body.deviceToken};
}
async function catalog(){
  const [campaign,categories,options]=await Promise.all([
    admin.from('campaigns').select('id,title,status,target_budget,consideration_budget,catalog_version,results_frozen_at').eq('id',CAMP).single(),
    admin.from('menu_categories').select('category_key,label,position,icon,description,serving_quota,billing_multiplier').eq('campaign_id',CAMP).order('position'),
    admin.from('menu_options').select('id,category_key,name,unit_price,default_qty,note,source_image,portion_check,price_status,availability_status,catalog_version').eq('campaign_id',CAMP).order('id')
  ]);
  if(campaign.error||categories.error||options.error)throw Error('CATALOG_UNAVAILABLE');
  const cats=(categories.data||[]).map((c:any)=>({key:c.category_key,servingQuota:c.serving_quota,billingMultiplier:c.billing_multiplier,label:c.label,icon:c.icon,desc:c.description,options:(options.data||[]).filter((o:any)=>o.category_key===c.category_key).map((o:any)=>({id:o.id,name:o.name,price:o.unit_price,qty:o.default_qty,note:o.note,source:o.source_image,portionCheck:o.portion_check,priceStatus:o.price_status,availabilityStatus:o.availability_status,catalogVersion:o.catalog_version}))}));
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
    const {data,error}=await admin.from('campaigns').select('status,catalog_version,results_frozen_at,voting_mode').eq('id',CAMP).single();
    return error?fail(req,'UNAVAILABLE',503):json(req,{ok:true,open:data.status==='open',votingMode:data.voting_mode,catalogVersion:data.catalog_version,resultsFrozenAt:data.results_frozen_at});
  }
  if(op==='catalog'){
    const c=await catalog();if(c.categories.length!==8||c.categories.some((x:any)=>x.options.length!==7))return fail(req,'CATALOG_INVALID',503);
    return json(req,{ok:true,catalogVersion:c.campaign.catalog_version,status:c.campaign.status,targetBudget:c.campaign.target_budget,considerationBudget:c.campaign.consideration_budget,categories:c.categories});
  }
  if(op==='preferences.submit'){
    let identity,label;try{identity=submissionIdentity(body);label=normalizeParticipantLabel(body.participantLabel)}catch(e){return fail(req,(e as Error).message)}
    const attendance=String(body.attendance||''),giftChoice=String(body.giftChoice||''),themeChoice=String(body.themeChoice||'');
    const {data,error}=await admin.rpc('ccr_submit_labeled_preferences',{
      p_campaign_id:CAMP,
      p_token_hash:await sha(identity.value),
      p_label:label,p_open:identity.open,
      p_attendance:attendance,
      p_gift_choice:giftChoice,
      p_theme_choice:themeChoice
    });
    if(error){const e=error.message;return fail(req,e.includes('VOTING_CLOSED')?'ปิดรับการตอบแบบสำรวจแล้ว':e.includes('INVITE_REQUIRED')?'กรุณากรอกรหัสเชิญ':e.includes('INVALID_INVITE')?'รหัสเชิญไม่ถูกต้องหรือถูกยกเลิก':'PREFERENCE_SAVE_REJECTED',400)}
    if(!data?.[0]?.saved_at)return fail(req,'PREFERENCE_SAVE_NOT_CONFIRMED',503);
    return json(req,{ok:true,receipt:data[0].receipt||null,saved_at:data[0].saved_at});
  }
  if(op==='submit'){
    let identity,label;try{identity=submissionIdentity(body);label=normalizeParticipantLabel(body.participantLabel)}catch(e){return fail(req,(e as Error).message)}
    let choices;try{choices=normalizeChoices(body.choices)}catch(e){return fail(req,(e as Error).message)}
    const {data:campaign,error:ce}=await admin.from('campaigns').select('catalog_version').eq('id',CAMP).single();if(ce)return fail(req,'UNAVAILABLE',503);
    if(body.catalogVersion!=null&&Number(body.catalogVersion)!==Number(campaign.catalog_version))return fail(req,'CATALOG_VERSION_MISMATCH',409);
    const {data,error}=await admin.rpc('ccr_submit_labeled_ballot',{p_campaign_id:CAMP,p_token_hash:await sha(identity.value),p_choices:choices,p_label:label,p_open:identity.open});
    if(error){const e=error.message;return fail(req,e.includes('VOTING_CLOSED')?'ปิดรับคะแนนแล้ว':e.includes('INVITE_REQUIRED')?'กรุณากรอกรหัสเชิญ':e.includes('INVALID_INVITE')?'รหัสเชิญไม่ถูกต้องหรือถูกยกเลิก':e.includes('INVALID_MENU_OPTION')?'รายการอาหารไม่ตรงกับแค็ตตาล็อกปัจจุบัน':'SAVE_REJECTED',400)}
    if(!data?.[0]?.receipt)return fail(req,'SAVE_NOT_CONFIRMED',503);
    return json(req,{ok:true,receipt:String(data[0].receipt),saved_at:data[0].saved_at});
  }
  if(!op.startsWith('admin.'))return fail(req,'UNKNOWN_OPERATION',404);
  const user=await adminUser(req);if(!user)return fail(req,'ADMIN_UNAUTHORIZED',403);
  if(op==='admin.audit.list'){
    const {data,error}=await admin.from('admin_action_logs').select('id,user_id,action,details,created_at').eq('campaign_id',CAMP).order('id',{ascending:false}).limit(100);
    return error?fail(req,'READ_FAILURE',503):json(req,{ok:true,items:data||[]});
  }
  if(op==='admin.results'){
    const [campaignRes,invRes]=await Promise.all([
      admin.from('campaigns').select('status,eligible_voters,catalog_version,results_frozen_at').eq('id',CAMP).single(),
      admin.from('invite_codes').select('id,active').eq('campaign_id',CAMP)
    ]);
    if(campaignRes.error)return fail(req,'CAMPAIGN_NOT_FOUND',404);
    if(invRes.error)return fail(req,'READ_FAILURE',503);
    const campaign=campaignRes.data;
    const allInv=invRes.data||[];
    const activeSet=new Set(allInv.filter((x:any)=>x.active).map((x:any)=>x.id));
    let rows:any[]=[];for(let from=0;from<10000;from+=500){const {data,error}=await admin.from('ballots').select('invite_id,choices').eq('campaign_id',CAMP).range(from,from+499);if(error)return fail(req,'READ_FAILURE',503);rows.push(...(data||[]));if(!data||data.length<500)break}
    const activeRows=rows.filter((r:any)=>!r.invite_id||activeSet.has(r.invite_id));
    const tallies:Record<string,number>={};for(const row of activeRows)tallyChoices(row.choices,tallies);
    const legacyCount=activeRows.filter(row=>isLegacyBallot(row.choices)).length;
    return json(req,{ok:true,count:activeRows.length,invites:allInv.length,activeInvites:activeSet.size,status:campaign.status,eligibleVoters:campaign.eligible_voters,catalogVersion:campaign.catalog_version,resultsFrozenAt:campaign.results_frozen_at,tallies,legacyCount,tallyUnit:"serving"});
  }
  if(op==='admin.preferences.results'){
    const [prefRes,invRes]=await Promise.all([
      admin.from('event_preferences').select('invite_id,attendance,gift_choice,theme_choice').eq('campaign_id',CAMP),
      admin.from('invite_codes').select('id,active').eq('campaign_id',CAMP)
    ]);
    if(prefRes.error||invRes.error)return fail(req,'READ_FAILURE',503);
    const activeSet=new Set((invRes.data||[]).filter((x:any)=>x.active).map((x:any)=>x.id));
    const rows=(prefRes.data||[]).filter((r:any)=>!r.invite_id||activeSet.has(r.invite_id));
    const attendance={yes:0,maybe:0,no:0},gift={gift_300:0,gift_500:0,gift_300_500:0,gift_none:0},theme={midnight_gold:0,forest_champagne:0,retro_future:0,come_as_you_are:0};
    for(const row of rows){
      if(row.attendance in attendance)attendance[row.attendance as keyof typeof attendance]++;
      if(row.gift_choice in gift)gift[row.gift_choice as keyof typeof gift]++;
      if(row.theme_choice in theme)theme[row.theme_choice as keyof typeof theme]++;
    }
    return json(req,{ok:true,count:rows.length,attendance,gift,theme});
  }
  if(op==='admin.invites.list'){
    const [inv,ballots,prefs]=await Promise.all([
      admin.from('invite_codes').select('id,active,created_at,revoked_at,participant_label').eq('campaign_id',CAMP).order('created_at',{ascending:false}).limit(500),
      admin.from('ballots').select('invite_id').eq('campaign_id',CAMP),
      admin.from('event_preferences').select('invite_id').eq('campaign_id',CAMP)
    ]);if(inv.error||ballots.error||prefs.error)return fail(req,'READ_FAILURE',503);
    const voted=new Set((ballots.data||[]).map((x:any)=>x.invite_id));
    const preffed=new Set((prefs.data||[]).map((x:any)=>x.invite_id));
    return json(req,{ok:true,items:(inv.data||[]).map((x:any)=>({id:x.id,participantLabel:x.participant_label,active:x.active,createdAt:x.created_at,revokedAt:x.revoked_at,hasBallot:voted.has(x.id),hasPreferences:preffed.has(x.id)}))});
  }
  if(op==='admin.submissions.list'){
    const [inv,ballots,prefs]=await Promise.all([
      admin.from('invite_codes').select('id,active,created_at,revoked_at,participant_label').eq('campaign_id',CAMP).order('created_at',{ascending:false}).limit(500),
      admin.from('ballots').select('id,invite_id,choices,created_at,updated_at').eq('campaign_id',CAMP),
      admin.from('event_preferences').select('invite_id,attendance,gift_choice,theme_choice,created_at,updated_at').eq('campaign_id',CAMP)
    ]);
    if(inv.error||ballots.error||prefs.error)return fail(req,'READ_FAILURE',503);
    const ballotMap=new Map((ballots.data||[]).map((x:any)=>[x.invite_id,x]));
    const prefMap=new Map((prefs.data||[]).map((x:any)=>[x.invite_id,x]));
    return json(req,{ok:true,items:(inv.data||[]).map((x:any)=>{
      const ballot:any=ballotMap.get(x.id)||null;
      const pref:any=prefMap.get(x.id)||null;
      return {
        inviteId:x.id,
        participantLabel:x.participant_label,
        active:x.active,
        createdAt:x.created_at,
        revokedAt:x.revoked_at,
        ballot:ballot?{id:ballot.id,legacy:isLegacyBallot(ballot.choices),choices:ballot.choices,createdAt:ballot.created_at,updatedAt:ballot.updated_at}:null,
        preferences:pref?{attendance:pref.attendance,giftChoice:pref.gift_choice,themeChoice:pref.theme_choice,createdAt:pref.created_at,updatedAt:pref.updated_at}:null
      };
    })});
  }
  const mutations=new Set(['admin.eligible_voters','admin.status','admin.freeze','admin.ballot.save','admin.ballot.delete','admin.preferences.save','admin.preferences.delete','admin.submission.delete','admin.invites','admin.invites.revoke']);
  if(mutations.has(op)){
    let payload=body;
    let issued:{id:string,code:string,token_hash:string}[]=[];
    if(op==='admin.invites'){
      const count=Number(body.count);if(!Number.isInteger(count)||count<1||count>200)return fail(req,'INVALID_COUNT');
      for(let i=0;i<count;i++){const code=inviteCode();issued.push({id:crypto.randomUUID(),code,token_hash:await sha(normalized(code))})}
      payload={items:issued.map(({id,token_hash})=>({id,token_hash}))};
    }
    const {data,error}=await admin.rpc('ccr_admin_mutate',{p_campaign_id:CAMP,p_user_id:user.id,p_op:op,p_payload:payload});
    if(error){
      const message=error.message;
      const known=message.match(/RESULTS_FROZEN|CLOSE_CAMPAIGN_FIRST|INVITE_NOT_FOUND|BALLOT_NOT_FOUND|PREFERENCES_NOT_FOUND|INVALID_[A-Z_]+|SELECT_EIGHT_CATEGORIES|ADMIN_UNAUTHORIZED/);
      return fail(req,known?.[0]||'ADMIN_UPDATE_FAILED',known?(message.includes('FROZEN')?409:400):503);
    }
    if(!data?.ok)return fail(req,'UPDATE_NOT_CONFIRMED',503);
    return json(req,op==='admin.invites'?{...data,items:issued.map(({id,code})=>({id,code}))}:data);
  }
  return fail(req,'UNKNOWN_ADMIN_OPERATION',404);
}catch(error){console.error('vote edge error',error);return fail(req,'SERVER_ERROR',500)}});
