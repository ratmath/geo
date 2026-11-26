// What this package is planned to contain, phase by phase, from the RatMath
// library roadmap. Phases 1 and 2 are built; a phase is removed from this list
// when it ships, and the list goes away when it is empty.

export const plan = Object.freeze([
  {
    "phase": 3,
    "contents": "Spherical and hyperbolic models",
    "estimate": "1,400"
  },
  {
    "phase": 4,
    "contents": "Projective and finite geometries",
    "estimate": "1,000"
  },
  {
    "phase": 5,
    "contents": "Solids, symmetry groups, friezes, wallpaper groups, tilings",
    "estimate": "1,300"
  },
  {
    "phase": 6,
    "contents": "General proofs of theorems by elimination",
    "estimate": "800"
  },
  {
    "phase": 7,
    "contents": "Pictures",
    "estimate": "1,000 in graphics"
  }
].map(Object.freeze));
