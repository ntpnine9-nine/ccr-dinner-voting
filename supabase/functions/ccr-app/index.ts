const OWNER='ntpnine9-nine';
const REPO='ccr-dinner-voting';
const BRANCH='main';
const allowed=new Set([
  'index.html','vote.html','party.html','venue.html','guide.html','admin.html',
  'styles.css','event.css','config.js','common.js','decision-engine.js','ballot-model.js','vote.js','admin.js','event.js','party.js','menus.json',
  'assets/menu-cover.jpg','assets/menu-spread.jpg',
  'assets/venue-night-hero.jpg','assets/venue-dining-wide.jpg','assets/venue-counter-sign.jpg','assets/venue-seating-zone.jpg','assets/venue-table-detail.jpg',
  'assets/venue-sign-night.jpg','assets/venue-soi11-day.jpg','assets/venue-landmark-ptt.jpg','assets/venue-soi11-lane.jpg','assets/venue-parking-night.jpg',
  'assets/food-tomyum-pot.jpg','assets/food-stirfry-duo.jpg','assets/food-crispy-squid.jpg','assets/food-seafood-dip.jpg','assets/food-grilled-pork.jpg',
  'assets/food-seafood-salad.jpg','assets/food-fried-strips.jpg','assets/food-garlic-pork.jpg'
]);
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