// Only media shipped with the site is advertised. G6 awaits a verified restaurant photograph.
const imageIds=new Set(["A1", "A2", "A3", "A4", "A5", "A6", "A7", "B1", "B2", "B3", "B4", "B5", "B6", "B7", "C1", "C2", "C3", "C4", "C5", "C6", "C7", "D1", "D2", "D3", "D4", "D5", "D6", "D7", "E1", "E2", "E3", "E4", "E5", "E6", "E7", "F1", "F2", "F3", "F4", "F5", "F6", "F7", "G1", "G2", "G3", "G4", "G5", "G7", "H1", "H2", "H3", "H4", "H5", "H6", "H7"]);
const restaurantIds=new Set(["D7", "E1", "E3", "E4", "E5", "E6", "E7", "F1", "F2", "F3", "F4", "F6", "F7", "G1", "G2", "G3", "G4", "G5", "H4", "H6", "H7"]);
export function menuMediaFor(id){
  if(!imageIds.has(id))return null;
  return {src:`./assets/menu/${id}.webp`,kind:restaurantIds.has(id)?'restaurant-menu':'ai-illustration'};
}
