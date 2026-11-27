// Classical theorems proved in general: each is stated in coordinates
// with free parameters and handed to the prover (prove.js), which returns
// a certificate that can be multiplied out again.
//
//   proofs.eulerLine().proved          // true, for every triangle
//   proofs.simson().explain()          // the identity and the degenerate cases
//   provable                           // [{ id, name, statement }]
import { configuration } from "./prove.js";
import { refuse } from "./num.js";

/** A general triangle with A at the origin and B on the x-axis: no loss of generality. */
const triangle = (T) => [T.at("A", 0, 0), T.at("B", "b", 0), T.at("C", "c", "d")];

const LIST = [
  {
    id: "thales",
    name: "Thales' theorem",
    statement: "an angle inscribed in a semicircle is a right angle",
    build(T) {
      const O = T.at("O", 0, 0);
      const r = T.parameter("r");
      const A = T.at("A", r, 0);
      const B = T.at("B", r.neg(), 0);
      const C = T.on("C", (P) => T.onCircle(P, O, A));
      return T.rightAngle(A, C, B);
    },
  },
  {
    id: "pythagoras",
    name: "Pythagoras' theorem",
    statement: "if the angle at C is a right angle then |AC|² + |BC|² = |AB|²",
    build(T) {
      const A = T.at("A", 0, 0);
      const B = T.at("B", "b", 0);
      const C = T.on("C", (P) => T.rightAngle(A, P, B));
      return T.equal(T.distance2(A, C).add(T.distance2(B, C)), T.distance2(A, B), "|AC|² + |BC|² = |AB|²");
    },
  },
  {
    id: "isosceles",
    name: "Base angles of an isosceles triangle",
    statement: "if |CA| = |CB| then the angles at A and B are equal",
    build(T) {
      const A = T.at("A", 0, 0);
      const B = T.at("B", "b", 0);
      const C = T.on("C", (P) => T.equidistant(P, A, B), { free: "y" });
      return T.equalAngle(C, A, B, A, B, C);
    },
  },
  {
    id: "midline",
    name: "Midline theorem",
    statement: "the segment joining the midpoints of two sides is parallel to the third side and half as long",
    build(T) {
      const [A, B, C] = triangle(T);
      const M = T.midpoint("M", A, B);
      const N = T.midpoint("N", A, C);
      return [T.parallel(M, N, B, C), T.equal(T.distance2(M, N).mul(4), T.distance2(B, C), "|BC| = 2|MN|")];
    },
  },
  {
    id: "medians",
    name: "The medians meet",
    statement: "the three medians pass through one point, which divides each in the ratio 2 : 1",
    build(T) {
      const [A, B, C] = triangle(T);
      const D = T.midpoint("D", B, C);
      const E = T.midpoint("E", C, A);
      const F = T.midpoint("F", A, B);
      const G = T.intersection("G", [A, D], [B, E]);
      return [T.collinear(C, F, G), T.equal(T.distance2(A, G), T.distance2(G, D).mul(4), "|AG| = 2|GD|")];
    },
  },
  {
    id: "altitudes",
    name: "The altitudes meet",
    statement: "the three altitudes of a triangle pass through one point",
    build(T) {
      const [A, B, C] = triangle(T);
      const D = T.foot("D", A, [B, C]);
      const E = T.foot("E", B, [C, A]);
      const H = T.intersection("H", [A, D], [B, E]);
      return T.perpendicular(C, H, A, B);
    },
  },
  {
    id: "bisectors",
    name: "The perpendicular bisectors meet",
    statement: "the point equidistant from A and B and from A and C is equidistant from B and C",
    build(T) {
      const [A, B, C] = triangle(T);
      const O = T.where("O", (P) => [T.perpendicular(P, T.midpoint("F", A, B), A, B), T.perpendicular(P, T.midpoint("E", A, C), A, C)], "O is on the perpendicular bisectors of AB and AC");
      return T.equidistant(O, B, C);
    },
  },
  {
    id: "eulerLine",
    name: "Euler line",
    statement: "the circumcentre O, centroid G and orthocentre H are collinear, with |GH| = 2|OG|",
    build(T) {
      const [A, B, C] = triangle(T);
      const O = T.circumcenter("O", A, B, C);
      const G = T.centroid("G", A, B, C);
      const H = T.orthocenter("H", A, B, C);
      return [T.collinear(O, G, H), T.equal(T.distance2(G, H), T.distance2(O, G).mul(4), "|GH| = 2|OG|")];
    },
  },
  {
    id: "ninePointCircle",
    name: "Nine-point circle",
    statement: "the midpoints of the sides, the feet of the altitudes and the midpoints from the vertices to the orthocentre lie on one circle",
    build(T) {
      const [A, B, C] = triangle(T);
      const D = T.midpoint("D", B, C);
      const E = T.midpoint("E", C, A);
      const F = T.midpoint("F", A, B);
      const P = T.foot("P", A, [B, C]);
      const Q = T.foot("Q", B, [C, A]);
      const R = T.foot("R", C, [A, B]);
      const H = T.orthocenter("H", A, B, C);
      const U = T.midpoint("U", A, H);
      const V = T.midpoint("V", B, H);
      const W = T.midpoint("W", C, H);
      return [P, Q, R, U, V, W].map((X) => T.concyclic(D, E, F, X));
    },
  },
  {
    id: "orthocentreReflection",
    name: "Reflections of the orthocentre",
    statement: "the reflection of the orthocentre in a side lies on the circumcircle",
    build(T) {
      const [A, B, C] = triangle(T);
      const H = T.orthocenter("H", A, B, C);
      const K = T.reflection("K", H, [B, C]);
      return T.concyclic(A, B, C, K);
    },
  },
  {
    id: "tritangent",
    name: "The angle bisectors meet",
    statement: "a point on the bisectors at A and B is on a bisector at C, and is equidistant from the three sides",
    build(T) {
      const [A, B, C] = triangle(T);
      const I = T.tritangentCenter("I", A, B, C);
      const D = T.foot("D", I, [B, C]);
      const E = T.foot("E", I, [C, A]);
      const F = T.foot("F", I, [A, B]);
      return [T.equalAngle(B, C, I, I, C, A), T.equalLength(I, D, I, E), T.equalLength(I, E, I, F)];
    },
  },
  {
    id: "varignon",
    name: "Varignon's theorem",
    statement: "the midpoints of the sides of any quadrilateral form a parallelogram",
    build(T) {
      const A = T.at("A", 0, 0);
      const B = T.at("B", "b", 0);
      const C = T.free("C");
      const D = T.free("D");
      const P = T.midpoint("P", A, B);
      const Q = T.midpoint("Q", B, C);
      const R = T.midpoint("R", C, D);
      const S = T.midpoint("S", D, A);
      return [T.parallel(P, Q, S, R), T.parallel(Q, R, P, S)];
    },
  },
  {
    id: "parallelogram",
    name: "Diagonals of a parallelogram",
    statement: "the diagonals of a parallelogram bisect each other",
    build(T) {
      const [A, B, C] = triangle(T);
      const D = T.where("D", (P) => [T.parallel(A, B, C, P), T.parallel(B, C, A, P)], "D makes ABCD a parallelogram");
      const M = T.intersection("M", [A, C], [B, D]);
      return [T.equidistant(M, A, C), T.equidistant(M, B, D)];
    },
  },
  {
    id: "inscribedAngle",
    name: "Inscribed angle theorem",
    statement: "angles standing on the same chord of a circle are equal",
    build(T) {
      const [A, B, C] = triangle(T);
      const D = T.onCircumcircle("D", A, B, C);
      return T.equalAngle(A, C, B, A, D, B);
    },
  },
  {
    id: "chords",
    name: "Intersecting chords",
    statement: "if chords AB and CD of a circle meet at P then PA·PB = PC·PD",
    build(T) {
      const O = T.at("O", 0, 0);
      const A = T.at("A", "r", 0);
      const P = T.free("P");
      const C = T.on("C", (X) => T.onCircle(X, O, A));
      const B = T.otherIntersection("B", A, P, O);
      const D = T.otherIntersection("D", C, P, O);
      return T.equal(T.dot(P, A, P, B), T.dot(P, C, P, D), "PA·PB = PC·PD");
    },
  },
  {
    id: "simson",
    name: "Simson line",
    statement: "the feet of the perpendiculars from a point of the circumcircle to the three sides are collinear",
    build(T) {
      const [A, B, C] = triangle(T);
      const P = T.onCircumcircle("P", A, B, C);
      const X = T.foot("X", P, [B, C]);
      const Y = T.foot("Y", P, [C, A]);
      const Z = T.foot("Z", P, [A, B]);
      return T.collinear(X, Y, Z);
    },
  },
  {
    id: "butterfly",
    name: "Butterfly theorem",
    statement: "if M is the midpoint of a chord PQ and chords AB, CD pass through M, then AD and BC cut PQ at points X and Y with M the midpoint of XY",
    build(T) {
      const M = T.at("M", 0, 0);
      const O = T.at("O", 0, "o");
      const P = T.at("P", "p", 0);
      const A = T.on("A", (X) => T.onCircle(X, O, P));
      const C = T.on("C", (X) => T.onCircle(X, O, P));
      const B = T.otherIntersection("B", A, M, O);
      const D = T.otherIntersection("D", C, M, O);
      const X = T.intersection("X", [A, D], [M, P]);
      const Y = T.intersection("Y", [B, C], [M, P]);
      return T.equal(X.x.add(Y.x), 0, "M is the midpoint of XY");
    },
  },
  {
    id: "pappus",
    name: "Pappus' theorem",
    statement: "for A, B, C on one line and D, E, F on another, the points AE∩BD, AF∩CD and BF∩CE are collinear",
    build(T) {
      const A = T.at("A", 0, 0);
      const B = T.at("B", "b", 0);
      const C = T.at("C", "c", 0);
      const D = T.at("D", "d", "e");
      const E = T.at("E", "f", "g");
      const F = T.onLine("F", D, E);
      const X = T.intersection("X", [A, E], [B, D]);
      const Y = T.intersection("Y", [A, F], [C, D]);
      const Z = T.intersection("Z", [B, F], [C, E]);
      return T.collinear(X, Y, Z);
    },
  },
  {
    id: "desargues",
    name: "Desargues' theorem",
    statement: "if the lines joining corresponding vertices of two triangles pass through one point, the three pairs of corresponding sides meet in collinear points",
    build(T) {
      const O = T.at("O", 0, 0);
      const A = T.at("A", "a", 0);
      const B = T.at("B", "b", "c");
      const C = T.at("C", "d", "e");
      const A2 = T.at("A2", "k", 0);
      const B2 = T.onLine("B2", O, B);
      const C2 = T.onLine("C2", O, C);
      const X = T.intersection("X", [A, B], [A2, B2]);
      const Y = T.intersection("Y", [B, C], [B2, C2]);
      const Z = T.intersection("Z", [A, C], [A2, C2]);
      return T.collinear(X, Y, Z);
    },
  },
  {
    id: "gaussLine",
    name: "Newton–Gauss line",
    statement: "the midpoints of the three diagonals of a complete quadrilateral are collinear",
    build(T) {
      const A = T.at("A", 0, 0);
      const B = T.at("B", "b", 0);
      const C = T.free("C");
      const D = T.free("D");
      const E = T.intersection("E", [A, B], [C, D]);
      const F = T.intersection("F", [A, D], [B, C]);
      const L = T.midpoint("L", A, C);
      const M = T.midpoint("M", B, D);
      const N = T.midpoint("N", E, F);
      return T.collinear(L, M, N);
    },
  },
  {
    id: "napoleon",
    name: "Napoleon's theorem",
    statement: "the centres of the equilateral triangles built outwards on the sides of any triangle form an equilateral triangle",
    build(T) {
      const [A, B, C] = triangle(T);
      const s = T.unknown("s", (v) => v.pow(2).sub(3));
      // the centre of the equilateral triangle on PQ: the midpoint moved by (s/6) of PQ turned a quarter turn
      const centre = (name, P, Q) => T.where(name, (N) => [N.x.mul(6).sub(P.x.add(Q.x).mul(3)).sub(s.mul(Q.y.sub(P.y))), N.y.mul(6).sub(P.y.add(Q.y).mul(3)).add(s.mul(Q.x.sub(P.x)))], `${name} is the centre of the equilateral triangle on ${P}${Q}`);
      const L = centre("L", A, B);
      const M = centre("M", B, C);
      const N = centre("N", C, A);
      return [T.equalLength(L, M, M, N), T.equalLength(M, N, N, L)];
    },
  },
];

/** The theorems that are proved in general: [{ id, name, statement }]. */
export const provable = Object.freeze(LIST.map(({ id, name, statement }) => Object.freeze({ id, name, statement })));

const run = (entry, options) => {
  const T = configuration(entry.name);
  const proof = T.prove(entry.build(T), options);
  proof.statement = entry.statement;
  return proof;
};

/**
 * General proofs of classical theorems. proofs.eulerLine(options) builds
 * the figure with free parameters and returns the Proof; options are those
 * of Configuration.prove ({ method: "wu" | "groebner" | "auto" }).
 */
export const proofs = Object.freeze({
  ...Object.fromEntries(LIST.map((entry) => [entry.id, (options) => run(entry, options)])),
  /** Prove one by id, or all of them: [{ id, name, statement, proof }]. */
  all: (options) => LIST.map((entry) => ({ id: entry.id, name: entry.name, statement: entry.statement, proof: run(entry, options) })),
  /** The configuration of a theorem, with its conclusion, for inspection: { configuration, conclusion }. */
  setup: (id) => {
    const entry = LIST.find((e) => e.id === id) ?? refuse("unknown-theorem", `no theorem "${id}": see provable for the list`);
    const T = configuration(entry.name);
    return { configuration: T, conclusion: entry.build(T) };
  },
});
