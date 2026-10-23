const OWNER='ntpnine9-nine';
const REPO='ccr-dinner-voting';
const BRANCH='main';
const allowed=new Set([
  'experience.js','participant-input.js','menu-media.js','assets/menu/B2.webp','assets/menu/B3.webp','assets/menu/B4.webp','assets/menu/B5.webp','assets/menu/B6.webp','assets/menu/B7.webp','assets/menu/C1.webp','assets/menu/C2.webp','assets/menu/C3.webp','assets/menu/C4.webp','assets/menu/C5.webp','assets/menu/C6.webp','assets/menu/C7.webp','assets/menu/D1.webp','assets/menu/D2.webp','assets/menu/D3.webp','assets/menu/D4.webp','assets/menu/D5.webp','assets/menu/D6.webp','assets/menu/D7.webp','assets/menu/E1.webp','assets/menu/E2.webp','assets/menu/E3.webp','assets/menu/E4.webp','assets/menu/E5.webp','assets/menu/E6.webp','assets/menu/E7.webp','assets/menu/F1.webp','assets/menu/F2.webp','assets/menu/F3.webp','assets/menu/F4.webp','assets/menu/F5.webp','assets/menu/F6.webp','assets/menu/F7.webp','assets/menu/G1.webp','assets/menu/G2.webp','assets/menu/G3.webp','assets/menu/G4.webp','assets/menu/G5.webp','assets/menu/G7.webp','assets/menu/H1.webp','assets/menu/H2.webp','assets/menu/H3.webp','assets/menu/H4.webp','assets/menu/H5.webp','assets/menu/H6.webp','assets/menu/H7.webp','assets/menu/A4.webp','assets/menu/A3.webp','assets/menu/A6.webp','assets/menu/B1.webp','assets/menu/A1.webp','assets/menu/A2.webp','assets/menu/A7.webp','assets/menu/A5.webp','assets/fonts/dm-sans-latin-wght-normal.woff2','assets/fonts/noto-sans-thai-thai-wght-normal.woff2','assets/fonts/cormorant-garamond-latin-wght-normal.woff2','assets/fonts/noto-sans-thai-latin-wght-normal.woff2',
  'index.html','vote.html','party.html','venue.html','guide.html','admin.html',
  'admin-summary.html','admin-summary.js','reporting.js','forest-noir.css','forest-noir.js','event-time.js',
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