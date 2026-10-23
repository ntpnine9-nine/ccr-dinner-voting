// Illustrative images only. Restaurant-specific recipes await owner-supplied photographs.
// Never advertise media not present in the repository. Add ids only with verified assets.
const imageIds=new Set(["A1","A2","A3","A4","A5","A6","A7","B1"]);
export function menuMediaFor(id){
  return imageIds.has(id)?{src:`./assets/menu/${id}.webp`,kind:'ai-illustration'}:null;
}
