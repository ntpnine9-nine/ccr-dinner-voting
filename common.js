import { CONFIG } from './config.js';
export const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CONFIG.supabaseUrl) && CONFIG.publishableKey.length>30 && !CONFIG.publishableKey.includes('YOUR_');
export const money = v => '฿'+Number(v).toLocaleString('en-US');
export const escapeHTML = s => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function formatInviteCode(raw){
  const upper=String(raw||'').toUpperCase();
  const alnum=upper.replace(/[^A-Z0-9]/g,'');
  if(!upper.includes('-')&&/^CCR26[A-Z2-9]{20}$/.test(alnum)){
    return `CCR26-${alnum.slice(5,10)}-${alnum.slice(10,15)}-${alnum.slice(15,20)}-${alnum.slice(20,25)}`;
  }
  return upper.replace(/[^A-Z0-9-]/g,'');
}
export async function api(op,payload={},bearer=''){
  if(!configured) throw Error('ยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูลกลาง');
  const headers={'Content-Type':'application/json','apikey':CONFIG.publishableKey};
  if(bearer) headers.Authorization='Bearer '+bearer;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(`${CONFIG.supabaseUrl}/functions/v1/vote`,{method:'POST',headers,signal:controller.signal,body:JSON.stringify({op,campaign:CONFIG.campaignId,...payload})});
    const raw=await response.text(); let data; try{data=JSON.parse(raw)}catch{throw Error(`ระบบตอบกลับไม่ถูกต้อง (HTTP ${response.status})`)}
    if(!response.ok||!data.ok) throw Error(data.error||`Server HTTP ${response.status}`);
    return data;
  }catch(error){if(error?.name==='AbortError') throw Error('การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่');throw error;}
  finally{clearTimeout(timeout);}
}
export async function getCatalog(){
  try{
    const data=await api('catalog');
    if(!Array.isArray(data.categories)||data.categories.length!==8||data.categories.some(c=>!Array.isArray(c.options)||c.options.length!==7)) throw Error('ข้อมูลเมนูจากระบบกลางไม่ครบ 8 หมวด × 7 ตัวเลือก');
    return data;
  }catch(err){
    const res=await fetch(new URL('./menus.json',import.meta.url));
    if(!res.ok) throw err;
    const local=await res.json();
    if(!Array.isArray(local.categories)||local.categories.length!==8) throw err;
    return {ok:true,status:'closed',catalogVersion:1,categories:local.categories,offlineFallback:true,fallbackError:err?.message||''};
  }
}
export const csv = rows=>'\ufeff'+rows.map(row=>row.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\r\n');
export function download(name,content,type){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
