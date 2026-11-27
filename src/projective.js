// The real projective plane in homogeneous coordinates.
//
// A point is a triple [x : y : z], not all zero, up to a non-zero multiple;
// the ordinary point (x, y) is [x : y : 1] and [x : y : 0] is the point at
// infinity in the direction (x, y). A line ax + by + cz = 0 is a triple too,
// and the same formulas serve both: the line through two points and the
// point on two lines are both the cross product. That is duality, and it is
// why every theorem here has a twin with points and lines swapped.
//
// Coordinates are exact (rationals, or algebraic numbers through num()), so
// incidence and the cross-ratio are decided exactly.
import { num, N, refuse, ZERO, ONE } from "./num.js";
import { Point } from "./plane.js";
import { conicProperties as conicPropertiesOf } from "./conics.js";

const cross3 = (u, v) => [N.sub(N.mul(u[1], v[2]), N.mul(u[2], v[1])), N.sub(N.mul(u[2], v[0]), N.mul(u[0], v[2])), N.sub(N.mul(u[0], v[1]), N.mul(u[1], v[0]))];
const dot3 = (u, v) => N.sum(N.mul(u[0], v[0]), N.mul(u[1], v[1]), N.mul(u[2], v[2]));
const det3 = (a, b, c) => dot3(a, cross3(b, c));
const isZero3 = (u) => u.every(N.isZero);
/** scale so the last non-zero coordinate is 1 */
function normalize(u) {
  for (let i = 2; i >= 0; i--) if (!N.isZero(u[i])) return u.map((x) => N.div(x, u[i]));
  refuse("degenerate", "[0 : 0 : 0] is not a point of the projective plane");
}
const fmt = (x) => N.text(x);

class Homogeneous {
  constructor(coords) {
    if (!Array.isArray(coords) || coords.length !== 3) refuse("bad-argument", "homogeneous coordinates are three numbers");
    this.coords = Object.freeze(normalize(coords.map(num)));
    Object.freeze(this);
  }
  equals(o) {
    return this.coords.every((x, i) => N.eq(x, o.coords[i]));
  }
  get key() {
    return this.coords.map(fmt).join(":");
  }
  toString() {
    return `[${this.coords.map(fmt).join(" : ")}]`;
  }
}

/** A point of the projective plane, [x : y : z]. */
export class PPoint extends Homogeneous {
  get atInfinity() {
    return N.isZero(this.coords[2]);
  }
  /** The ordinary point (x/z, y/z), or null at infinity. */
  toAffine() {
    return this.atInfinity ? null : new Point(this.coords[0], this.coords[1]);
  }
  /** The line with the same coordinates (duality). */
  get dual() {
    return new PLine(this.coords);
  }
  on(l) {
    return N.isZero(dot3(this.coords, l.coords));
  }
}
/** A line of the projective plane, ax + by + cz = 0, written [a : b : c]. */
export class PLine extends Homogeneous {
  get dual() {
    return new PPoint(this.coords);
  }
  contains(p) {
    return N.isZero(dot3(this.coords, p.coords));
  }
  get isAtInfinity() {
    return N.isZero(this.coords[0]) && N.isZero(this.coords[1]);
  }
}

const asPoint = (p) => {
  if (p instanceof PPoint) return p;
  if (p instanceof Point) return new PPoint([p.x, p.y, ONE]);
  if (Array.isArray(p) && p.length === 2) return new PPoint([p[0], p[1], 1]);
  if (Array.isArray(p) && p.length === 3) return new PPoint(p);
  refuse("bad-argument", "a point is [x, y], [x, y, z], a Point or a PPoint");
};
const asLine = (l) => (l instanceof PLine ? l : new PLine(l));

/** A point: ppoint(x, y) for the ordinary point, ppoint(x, y, z) in homogeneous coordinates. */
export const ppoint = (...a) => asPoint(a.length === 1 ? a[0] : a);
/** A line [a : b : c], meaning ax + by + cz = 0. */
export const pline = (...a) => asLine(a.length === 1 ? a[0] : a);
/** The line at infinity, z = 0. */
export const lineAtInfinity = () => new PLine([0, 0, 1]);

/** The line through two distinct points. */
export function join(p, q) {
  const c = cross3(asPoint(p).coords, asPoint(q).coords);
  if (isZero3(c)) refuse("degenerate", "the two points are the same, so they do not fix a line");
  return new PLine(c);
}
/** The point where two distinct lines meet (at infinity when they are parallel). */
export function meetLines(l, m) {
  const c = cross3(asLine(l).coords, asLine(m).coords);
  if (isZero3(c)) refuse("degenerate", "the two lines are the same");
  return new PPoint(c);
}
export const collinearP = (p, q, r) => N.isZero(det3(asPoint(p).coords, asPoint(q).coords, asPoint(r).coords));
export const concurrentP = (l, m, n) => N.isZero(det3(asLine(l).coords, asLine(m).coords, asLine(n).coords));

/**
 * The cross-ratio (A, B; C, D) of four collinear points, exactly:
 *   [A C][B D] / ([A D][B C])
 * where [P Q] is a 2 × 2 determinant of coordinates taken in a pair that does
 * not vanish on the line. For ordinary points on a line it is the familiar
 * (AC · BD) / (AD · BC) with signed lengths. Infinity (as the string
 * "infinity") when A = D or B = C. Four concurrent lines work the same way.
 */
export function crossRatio(a, b, c, d) {
  const lines = [a, b, c, d].every((x) => x instanceof PLine);
  const P = [a, b, c, d].map((x) => (lines ? x : asPoint(x)).coords);
  const span = cross3(P[0], P[1]);
  if (isZero3(span)) refuse("degenerate", "the first two points must differ");
  for (const x of P.slice(2)) if (!N.isZero(dot3(span, x))) refuse("not-collinear", lines ? "the four lines are not concurrent" : "the four points are not collinear");
  // pick a coordinate pair (i, j) on which the line's points are not all identified
  const pairs = [[0, 1], [0, 2], [1, 2]];
  const br = (u, v, [i, j]) => N.sub(N.mul(u[i], v[j]), N.mul(u[j], v[i]));
  const ij = pairs.find((pr) => !N.isZero(br(P[0], P[1], pr)));
  const num1 = N.mul(br(P[0], P[2], ij), br(P[1], P[3], ij));
  const den = N.mul(br(P[0], P[3], ij), br(P[1], P[2], ij));
  if (N.isZero(den)) return "infinity";
  return N.div(num1, den);
}
/** The harmonic conjugate of C with respect to A and B: the D with (A, B; C, D) = −1. */
export function harmonicConjugate(a, b, c) {
  const [A, B, C] = [a, b, c].map(asPoint);
  if (!collinearP(A, B, C)) refuse("not-collinear", "the three points must be collinear");
  // write C = A + t·B (in representatives), then D = A − t·B
  const u = A.coords;
  const v = B.coords;
  const w = C.coords;
  const pairs = [[0, 1], [0, 2], [1, 2]];
  const br = (x, y, [i, j]) => N.sub(N.mul(x[i], y[j]), N.mul(x[j], y[i]));
  const ij = pairs.find((pr) => !N.isZero(br(u, v, pr)));
  // C = s·A + t·B: solve on the pair ij
  const s = N.div(br(w, v, ij), br(u, v, ij));
  const t = N.div(br(u, w, ij), br(u, v, ij));
  if (N.isZero(s) || N.isZero(t)) refuse("degenerate", "C must differ from A and B");
  return new PPoint(u.map((x, k) => N.sub(N.mul(s, x), N.mul(t, v[k]))));
}

// ---- projective maps --------------------------------------------------------------

const mat3mul = (A, B) => A.map((row) => [0, 1, 2].map((j) => N.sum(N.mul(row[0], B[0][j]), N.mul(row[1], B[1][j]), N.mul(row[2], B[2][j]))));
const mat3vec = (A, v) => A.map((row) => dot3(row, v));
const transpose = (A) => [0, 1, 2].map((i) => [0, 1, 2].map((j) => A[j][i]));
function adjugate(A) {
  // columns of the inverse times det: cross products of rows
  const c = [cross3(A[1], A[2]), cross3(A[2], A[0]), cross3(A[0], A[1])];
  return transpose(c);
}
const det3m = (A) => det3(A[0], A[1], A[2]);

/**
 * A projective map of the plane, x ↦ M·x for an invertible 3 × 3 matrix M,
 * defined up to a non-zero multiple. It sends lines to lines (a line ℓ goes to
 * (M⁻¹)ᵀ ℓ), and keeps the cross-ratio.
 */
export class Projectivity {
  constructor(matrix) {
    if (!Array.isArray(matrix) || matrix.length !== 3 || matrix.some((r) => !Array.isArray(r) || r.length !== 3)) refuse("bad-argument", "a projective map is a 3 × 3 matrix");
    const M = matrix.map((r) => r.map(num));
    if (N.isZero(det3m(M))) refuse("singular", "the matrix is singular, so it is not a projective map");
    // scale so the last non-zero entry (row-major) is 1, for a canonical form
    const flat = M.flat();
    let s = null;
    for (let i = 8; i >= 0; i--) if (!N.isZero(flat[i])) {
      s = flat[i];
      break;
    }
    this.matrix = Object.freeze(M.map((r) => Object.freeze(r.map((x) => N.div(x, s)))));
    Object.freeze(this);
  }
  apply(x) {
    if (x instanceof PLine) return new PLine(mat3vec(transpose(adjugate(this.matrix)), x.coords));
    return new PPoint(mat3vec(this.matrix, asPoint(x).coords));
  }
  /** this after other */
  compose(other) {
    return new Projectivity(mat3mul(this.matrix, other.matrix));
  }
  inverse() {
    return new Projectivity(adjugate(this.matrix));
  }
  equals(o) {
    return this.matrix.every((r, i) => r.every((x, j) => N.eq(x, o.matrix[i][j])));
  }
  /** Affine when it keeps the line at infinity. */
  get isAffine() {
    return N.isZero(this.matrix[2][0]) && N.isZero(this.matrix[2][1]);
  }
  toString() {
    return `projective map [${this.matrix.map((r) => r.map(fmt).join(" ")).join("; ")}]`;
  }
}
export const projectivity = (m) => new Projectivity(m);

const inGeneralPosition = (ps) => {
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) for (let k = j + 1; k < 4; k++) if (N.isZero(det3(ps[i], ps[j], ps[k]))) return false;
  return true;
};
/** The map sending [1:0:0], [0:1:0], [0:0:1], [1:1:1] to the four given points. */
function fromFrame(ps) {
  // columns: λᵢ·pᵢ with λ solving [p1 p2 p3] λ = p4
  const C = transpose([ps[0], ps[1], ps[2]]);
  const adj = adjugate(C);
  const d = det3m(C);
  const lam = mat3vec(adj, ps[3]).map((x) => N.div(x, d));
  return transpose([0, 1, 2].map((i) => ps[i].map((x) => N.mul(lam[i], x))));
}
/**
 * The one projective map sending four points to four points, no three of
 * either set collinear (the fundamental theorem of projective geometry).
 */
export function projectivityFrom(from, to) {
  if (from.length !== 4 || to.length !== 4) refuse("bad-argument", "give four points and their four images");
  const A = from.map((p) => asPoint(p).coords);
  const B = to.map((p) => asPoint(p).coords);
  if (!inGeneralPosition(A) || !inGeneralPosition(B)) refuse("degenerate", "no three of the four points may be collinear");
  const FA = fromFrame(A);
  const FB = fromFrame(B);
  return new Projectivity(mat3mul(FB, adjugate(FA)));
}

// ---- conics ---------------------------------------------------------------------------

/**
 * A conic xᵀ C x = 0 for a symmetric 3 × 3 matrix C, or from the six
 * coefficients of a x² + b xy + c y² + d x + e y + f = 0.
 */
export class Conic {
  constructor(matrix) {
    const M = matrix.map((r) => r.map(num));
    for (let i = 0; i < 3; i++) for (let j = 0; j < i; j++) if (!N.eq(M[i][j], M[j][i])) refuse("bad-argument", "a conic's matrix is symmetric");
    if (M.flat().every(N.isZero)) refuse("degenerate", "the zero matrix is not a conic");
    this.matrix = Object.freeze(M.map((r) => Object.freeze(r)));
    Object.freeze(this);
  }
  static fromCoefficients([a, b, c, d, e, f]) {
    const h = (x) => N.div(num(x), num(2));
    return new Conic([[num(a), h(b), h(d)], [h(b), num(c), h(e)], [h(d), h(e), num(f)]]);
  }
  /** [a, b, c, d, e, f] for a x² + b xy + c y² + d x + e y + f */
  get coefficients() {
    const M = this.matrix;
    const two = (x) => N.add(x, x);
    return [M[0][0], two(M[0][1]), M[1][1], two(M[0][2]), two(M[1][2]), M[2][2]];
  }
  value(p) {
    const x = asPoint(p).coords;
    return dot3(x, mat3vec(this.matrix, x));
  }
  contains(p) {
    return N.isZero(this.value(p));
  }
  get determinant() {
    return det3m(this.matrix);
  }
  get degenerate() {
    return N.isZero(this.determinant);
  }
  /** The polar line of a point: Cp. On the conic it is the tangent there. */
  polar(p) {
    return new PLine(mat3vec(this.matrix, asPoint(p).coords));
  }
  /** The pole of a line: C⁻¹ℓ (for a non-degenerate conic). */
  pole(l) {
    if (this.degenerate) refuse("degenerate", "a degenerate conic has no poles");
    return new PPoint(mat3vec(adjugate(this.matrix), asLine(l).coords));
  }
  tangentAt(p) {
    if (!this.contains(p)) refuse("not-on-conic", "the point is not on the conic");
    return this.polar(p);
  }
  /** The image under a projective map: (M⁻¹)ᵀ C M⁻¹. */
  transform(T) {
    const Mi = adjugate(T.matrix);
    return new Conic(mat3mul(transpose(Mi), mat3mul(this.matrix, Mi)));
  }
  /**
   * The affine type, from the determinant and the 2 × 2 block ac − b²/4:
   * ellipse (with "no real points" when empty), parabola, hyperbola, or the
   * degenerate kinds (two lines, a double line, a single point).
   */
  classify() {
    const M = this.matrix;
    const D = this.determinant;
    const d2 = N.sub(N.mul(M[0][0], M[1][1]), N.sq(M[0][1]));
    if (N.isZero(D)) {
      if (N.sign(d2) > 0) return "a single point";
      if (N.sign(d2) < 0) return "two crossing lines";
      // parallel lines, a double line, or empty
      const rank1 = [0, 1, 2].every((i) => [0, 1, 2].every((j) => N.isZero(N.sub(N.mul(M[i][i], M[j][j]), N.sq(M[i][j])))));
      return rank1 ? "a double line" : "two parallel lines (perhaps imaginary)";
    }
    if (N.sign(d2) < 0) return "hyperbola";
    if (N.isZero(d2)) return "parabola";
    // ellipse: real when a·det < 0
    return N.sign(N.mul(M[0][0], D)) < 0 ? (N.eq(M[0][0], M[1][1]) && N.isZero(M[0][1]) ? "circle" : "ellipse") : "ellipse with no real points";
  }
  /** Centre, axes, vertices, foci, eccentricity, directrices, asymptotes: see conicProperties. */
  properties() {
    return conicPropertiesOf(this.coefficients);
  }
  toString() {
    const names = ["x²", "xy", "y²", "x", "y", ""];
    const parts = this.coefficients.map((c, i) => [c, names[i]]).filter(([c]) => !N.isZero(c));
    return parts.map(([c, n], i) => {
      const neg = N.sign(c) < 0;
      const mag = N.abs(c);
      const coef = n && N.eq(mag, ONE) ? "" : fmt(mag);
      return `${i ? (neg ? " − " : " + ") : neg ? "−" : ""}${coef}${n}`;
    }).join("") + " = 0";
  }
}
/** The conic through five points, no four collinear (unique). */
export function conicThrough(points) {
  if (points.length !== 5) refuse("bad-argument", "a conic is fixed by five points");
  const rows = points.map((p) => {
    const [x, y, z] = asPoint(p).coords;
    return [N.mul(x, x), N.mul(x, y), N.mul(y, y), N.mul(x, z), N.mul(y, z), N.mul(z, z)];
  });
  const k = kernel(rows, 6);
  if (k.length !== 1) refuse("degenerate", "the five points do not fix one conic (four of them are collinear)");
  return Conic.fromCoefficients(k[0]);
}
/** a basis of the null space of a matrix (rows), exact Gaussian elimination */
function kernel(rows, n) {
  const A = rows.map((r) => [...r]);
  const pivots = [];
  let r = 0;
  for (let c = 0; c < n && r < A.length; c++) {
    const p = A.findIndex((row, i) => i >= r && !N.isZero(row[c]));
    if (p < 0) continue;
    [A[r], A[p]] = [A[p], A[r]];
    const pv = A[r][c];
    A[r] = A[r].map((x) => N.div(x, pv));
    for (let i = 0; i < A.length; i++) if (i !== r && !N.isZero(A[i][c])) {
      const f = A[i][c];
      A[i] = A[i].map((x, j) => N.sub(x, N.mul(f, A[r][j])));
    }
    pivots.push(c);
    r++;
  }
  const free = [...Array(n).keys()].filter((c) => !pivots.includes(c));
  return free.map((f) => {
    const v = Array(n).fill(ZERO);
    v[f] = ONE;
    pivots.forEach((c, i) => (v[c] = N.neg(A[i][f])));
    return v;
  });
}

// ---- the classical theorems, checked on exact figures --------------------------------------

/**
 * Desargues: triangles ABC and A′B′C′ are in perspective from a point (AA′,
 * BB′, CC′ concurrent) exactly when they are in perspective from a line (the
 * meets of corresponding sides are collinear). Returns both facts and the
 * centre and axis.
 */
export function desargues([a, b, c], [a2, b2, c2]) {
  const [A, B, C, A2, B2, C2] = [a, b, c, a2, b2, c2].map(asPoint);
  const l1 = join(A, A2);
  const l2 = join(B, B2);
  const l3 = join(C, C2);
  const fromPoint = concurrentP(l1, l2, l3);
  const X = meetLines(join(A, B), join(A2, B2));
  const Y = meetLines(join(B, C), join(B2, C2));
  const Z = meetLines(join(C, A), join(C2, A2));
  const fromLine = collinearP(X, Y, Z);
  return Object.freeze({ fromPoint, fromLine, holds: fromPoint === fromLine, center: fromPoint ? meetLines(l1, l2) : null, axis: fromLine ? join(X, Y) : null, meets: [X, Y, Z] });
}
/**
 * Pappus: with A, B, C on one line and a, b, c on another, the points
 * Ab ∩ aB, Ac ∩ aC, Bc ∩ bC are collinear.
 */
export function pappus([A, B, C], [a, b, c]) {
  const P = [A, B, C, a, b, c].map(asPoint);
  if (!collinearP(P[0], P[1], P[2]) || !collinearP(P[3], P[4], P[5])) refuse("not-collinear", "each triple must lie on a line");
  const x = (p, q, r, s) => meetLines(join(p, q), join(r, s));
  const X = x(P[0], P[4], P[3], P[1]);
  const Y = x(P[0], P[5], P[3], P[2]);
  const Z = x(P[1], P[5], P[4], P[2]);
  return Object.freeze({ holds: collinearP(X, Y, Z), points: [X, Y, Z], line: join(X, Y) });
}
/**
 * Pascal: for six points on a conic, the meets of opposite sides of the
 * hexagon ABCDEF (AB·DE, BC·EF, CD·FA) are collinear.
 */
export function pascal(points, conic = null) {
  const P = points.map(asPoint);
  if (P.length !== 6) refuse("bad-argument", "Pascal's theorem is about six points");
  const C = conic ?? conicThrough(P.slice(0, 5));
  if (!P.every((p) => C.contains(p))) refuse("not-on-conic", "the six points are not on one conic");
  const x = (i, j, k, l) => meetLines(join(P[i], P[j]), join(P[k], P[l]));
  const X = x(0, 1, 3, 4);
  const Y = x(1, 2, 4, 5);
  const Z = x(2, 3, 5, 0);
  return Object.freeze({ holds: collinearP(X, Y, Z), points: [X, Y, Z], line: join(X, Y), conic: C });
}
/** Brianchon, the dual of Pascal: the diagonals of a hexagon whose sides touch a conic meet in a point. */
export function brianchon(conic, points) {
  // tangent lines at six points of the conic form a circumscribed hexagon
  const T = points.map((p) => conic.tangentAt(asPoint(p)));
  const V = T.map((t, i) => meetLines(t, T[(i + 1) % 6]));
  const d = [join(V[0], V[3]), join(V[1], V[4]), join(V[2], V[5])];
  return Object.freeze({ holds: concurrentP(...d), vertices: V, center: concurrentP(...d) ? meetLines(d[0], d[1]) : null });
}
