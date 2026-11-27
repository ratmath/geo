// Spherical geometry on the unit sphere, with exact coordinates.
//
// A point is a unit vector whose coordinates are exact real algebraic
// numbers; a "line" is a great circle, kept as a vector normal to its plane.
// The distance between two points is the angle between them, and its cosine
// is their dot product, exactly. A triangle's angles have exact cosines too,
// so its angle excess (which is its area) is an exact multiple of π whenever
// it is one at all, and enclosed otherwise.
import { num, N, refuse, ZERO, ONE, TWO, Q } from "./num.js";
import { Point } from "./plane.js";
import { Angle, angle, piTimes } from "./angle.js";

const dot3 = (u, v) => N.sum(N.mul(u[0], v[0]), N.mul(u[1], v[1]), N.mul(u[2], v[2]));
const cross3 = (u, v) => [N.sub(N.mul(u[1], v[2]), N.mul(u[2], v[1])), N.sub(N.mul(u[2], v[0]), N.mul(u[0], v[2])), N.sub(N.mul(u[0], v[1]), N.mul(u[1], v[0]))];
const scale3 = (u, k) => u.map((c) => N.mul(c, k));
const isZero3 = (u) => u.every(N.isZero);
const unit3 = (u) => {
  const n2 = dot3(u, u);
  if (N.isZero(n2)) refuse("degenerate", "the zero vector has no direction");
  return N.eq(n2, ONE) ? u : scale3(u, N.div(ONE, N.sqrt(n2)));
};
const det3 = (a, b, c) => dot3(a, cross3(b, c));
const mulM = (A, B) => A.map((r) => [0, 1, 2].map((j) => N.sum(N.mul(r[0], B[0][j]), N.mul(r[1], B[1][j]), N.mul(r[2], B[2][j]))));
const mulV = (A, v) => A.map((r) => dot3(r, v));
const I3 = () => [[ONE, ZERO, ZERO], [ZERO, ONE, ZERO], [ZERO, ZERO, ONE]];

/** A point of the unit sphere. */
export class SPoint {
  constructor(x, y, z) {
    this.v = [num(x), num(y), num(z)];
    if (!N.eq(dot3(this.v, this.v), ONE)) refuse("not-on-sphere", "x² + y² + z² must be 1; spoint(x, y, z) scales a vector onto the sphere");
  }
  get x() {
    return this.v[0];
  }
  get y() {
    return this.v[1];
  }
  get z() {
    return this.v[2];
  }
  get antipode() {
    return new SPoint(...this.v.map(N.neg));
  }
  equals(o) {
    return this.v.every((c, i) => N.eq(c, o.v[i]));
  }
  isAntipodeOf(o) {
    return this.v.every((c, i) => N.eq(c, N.neg(o.v[i])));
  }
  /** the cosine of the distance to another point */
  dot(o) {
    return dot3(this.v, sp(o).v);
  }
  /** the distance to another point: an angle between 0 and π */
  distanceTo(o) {
    return Angle.ofCos(this.dot(o));
  }
  /** latitude (−π/2 to π/2) and longitude (−π to π] */
  get latLon() {
    const [x, y, z] = this.v;
    const r = N.sqrt(N.add(N.sq(x), N.sq(y)));
    const lat = new Angle(r, z);
    const lon = N.isZero(r) ? Angle.ZERO : new Angle(N.div(x, r), N.div(y, r));
    return { lat, lon };
  }
  /** stereographic projection from the north pole (0, 0, 1) onto the plane z = 0 */
  get stereographic() {
    const [x, y, z] = this.v;
    if (N.eq(z, ONE)) refuse("north-pole", "the north pole projects to infinity");
    const k = N.div(ONE, N.sub(ONE, z));
    return new Point(N.mul(x, k), N.mul(y, k));
  }
  toNumbers() {
    return this.v.map(N.toNumber);
  }
  toString() {
    return `(${this.v.map((c) => N.text(c)).join(", ")})`;
  }
}
/** A point of the sphere: spoint(x, y, z) in the direction of any non-zero vector, or spoint([x, y, z]). */
export function spoint(x, y, z) {
  if (x instanceof SPoint) return x;
  const v = (Array.isArray(x) ? x : [x, y, z]).map(num);
  return new SPoint(...unit3(v));
}
const sp = spoint;
/** The point at a latitude and longitude, each a fraction of a full turn: latLon("1/8", "1/4") is 45° north, 90° east. */
export function latLon(lat, lon) {
  const [a, b] = [angle(lat), angle(lon)];
  return new SPoint(N.mul(a.cos, b.cos), N.mul(a.cos, b.sin), a.sin);
}
/** The point that projects stereographically (from the north pole) to a point of the plane. Rational points give rational points. */
export function fromStereographic(p) {
  const [X, Y] = Array.isArray(p) ? p.map(num) : [p.x, p.y];
  const s = N.add(N.sq(X), N.sq(Y));
  const d = N.add(s, ONE);
  return new SPoint(N.div(N.mul(TWO, X), d), N.div(N.mul(TWO, Y), d), N.div(N.sub(s, ONE), d));
}
export const northPole = () => new SPoint(0, 0, 1);

/** A great circle: the points p with n·p = 0. */
export class GreatCircle {
  constructor(n) {
    this.n = n.map(num);
    if (isZero3(this.n)) refuse("degenerate", "a great circle needs two points that are neither equal nor opposite");
  }
  contains(p) {
    return N.isZero(dot3(this.n, sp(p).v));
  }
  /** n·p: zero on the circle, and its sign tells the hemisphere */
  side(p) {
    return N.sign(dot3(this.n, sp(p).v));
  }
  /** the two poles: the points a quarter turn from every point of the circle */
  get poles() {
    const u = unit3(this.n);
    return [new SPoint(...u), new SPoint(...u.map(N.neg))];
  }
  equals(o) {
    return isZero3(cross3(this.n, o.n));
  }
  /** the two points where another great circle crosses this one: always two, opposite each other */
  meet(o) {
    const w = cross3(this.n, o.n);
    if (isZero3(w)) refuse("same-circle", "the two great circles are the same");
    const u = unit3(w);
    return [new SPoint(...u), new SPoint(...u.map(N.neg))];
  }
  /** the angle between the two circles where they cross (between 0 and π/2) */
  angleWith(o) {
    const c = N.div(N.abs(dot3(this.n, o.n)), N.sqrt(N.mul(dot3(this.n, this.n), dot3(o.n, o.n))));
    return Angle.ofCos(c);
  }
  isPerpendicularTo(o) {
    return N.isZero(dot3(this.n, o.n));
  }
  /** the great circle through p that crosses this one at right angles */
  perpendicularThrough(p) {
    const w = cross3(this.n, sp(p).v);
    if (isZero3(w)) refuse("pole", "the point is a pole of the circle: every great circle through it is perpendicular");
    return new GreatCircle(w);
  }
  /** the distance from a point to the circle (between 0 and π/2) */
  distanceTo(p) {
    const s = N.div(N.abs(dot3(this.n, sp(p).v)), N.sqrt(dot3(this.n, this.n)));
    return new Angle(N.sqrt(N.sub(ONE, N.sq(s))), s);
  }
  /** reflection in the plane of the circle */
  get reflection() {
    const n = this.n;
    const k = N.div(TWO, dot3(n, n));
    return new SIsometry(I3().map((r, i) => r.map((c, j) => N.sub(c, N.mul(k, N.mul(n[i], n[j]))))));
  }
  /**
   * Lines through p that never meet this one. There are none: any two great
   * circles cross. The result is the empty list, with the crossing points of
   * a sample line as the witness.
   */
  parallelsThrough(p) {
    const P = sp(p);
    // some great circle through P other than this one
    const e = [[ONE, ZERO, ZERO], [ZERO, ONE, ZERO], [ZERO, ZERO, ONE]].map((b) => cross3(P.v, b)).find((w) => !isZero3(w) && !isZero3(cross3(w, this.n)));
    const sample = new GreatCircle(e);
    const out = [];
    out.count = 0;
    out.reason = "any two great circles meet in two opposite points";
    out.witness = { line: sample, meets: sample.meet(this) };
    return out;
  }
  toString() {
    return `great circle ⟂ (${this.n.map((c) => N.text(c)).join(", ")})`;
  }
}
/** The great circle through two points (refused when they are equal or opposite), or with a given pole. */
export function greatCircle(a, b) {
  if (b === undefined) return new GreatCircle(sp(a).v);
  return new GreatCircle(cross3(sp(a).v, sp(b).v));
}
/** the equator z = 0 */
export const equator = () => new GreatCircle([ZERO, ZERO, ONE]);

/** A circle on the sphere: the points at a given distance from a centre. */
export class SCircle {
  constructor(center, cosRadius) {
    this.center = sp(center);
    this.cosRadius = num(cosRadius);
    if (N.cmp(N.abs(this.cosRadius), ONE) > 0) refuse("bad-circle", "the cosine of the radius lies between −1 and 1");
  }
  get radius() {
    return Angle.ofCos(this.cosRadius);
  }
  contains(p) {
    return N.eq(this.center.dot(p), this.cosRadius);
  }
  /** 2π·sin r: shorter than the plane's 2πr */
  get circumference() {
    return piTimes(N.mul(TWO, this.radius.sin));
  }
  /** 2π(1 − cos r): the area of the cap */
  get area() {
    return piTimes(N.mul(TWO, N.sub(ONE, this.cosRadius)));
  }
  get isGreat() {
    return N.isZero(this.cosRadius);
  }
  toString() {
    return `circle about ${this.center} of radius ${this.radius.text}`;
  }
}
/** The circle with a centre through a point, or scircle(centre, { radius }) with the radius as a fraction of a full turn, or { cos }. */
export function scircle(center, through) {
  const c = sp(center);
  if (through instanceof SPoint || Array.isArray(through)) return new SCircle(c, c.dot(through));
  if (through && "radius" in through) return new SCircle(c, angle(through.radius).cos);
  if (through && "cos" in through) return new SCircle(c, through.cos);
  refuse("bad-circle", "give a point on the circle, { radius } as a fraction of a turn, or { cos }");
}

/** A spherical triangle: three points not on one great circle, joined by the shorter arcs. */
export class STriangle {
  constructor(A, B, C) {
    [this.A, this.B, this.C] = [sp(A), sp(B), sp(C)];
    this.det = det3(this.A.v, this.B.v, this.C.v);
    if (N.isZero(this.det)) refuse("degenerate", "the three points lie on one great circle");
  }
  get vertices() {
    return [this.A, this.B, this.C];
  }
  /** the sides as angles: a is opposite A */
  get sides() {
    return (this._sides ??= { a: this.B.distanceTo(this.C), b: this.C.distanceTo(this.A), c: this.A.distanceTo(this.B) });
  }
  /** the angles at the vertices */
  get angles() {
    if (this._angles) return this._angles;
    const at = (P, Q1, R) => {
      const u = cross3(P.v, Q1.v);
      const w = cross3(P.v, R.v);
      return Angle.ofCos(N.div(dot3(u, w), N.sqrt(N.mul(dot3(u, u), dot3(w, w)))));
    };
    return (this._angles = { A: at(this.A, this.B, this.C), B: at(this.B, this.C, this.A), C: at(this.C, this.A, this.B) });
  }
  get angleSum() {
    const { A, B, C } = this.angles;
    return A.add(B).add(C);
  }
  /** A + B + C − π: always positive */
  get excess() {
    return (this._excess ??= this.angleSum.sub(Angle.PI));
  }
  /** Girard: on the unit sphere the area is the excess */
  get area() {
    return this.excess;
  }
  /** the share of the whole sphere (area 4π) that the triangle covers, when that is rational */
  get fractionOfSphere() {
    const t = this.excess.turns;
    return t === null ? null : t.divide(TWO);
  }
  get perimeter() {
    const { a, b, c } = this.sides;
    return a.add(b).add(c);
  }
  /** the polar triangle: its sides are π minus this one's angles, and its angles π minus this one's sides */
  get polar() {
    const s = N.sign(this.det);
    const pole = (P, Q1) => {
      const u = unit3(cross3(P.v, Q1.v));
      return new SPoint(...(s > 0 ? u : u.map(N.neg)));
    };
    return new STriangle(pole(this.B, this.C), pole(this.C, this.A), pole(this.A, this.B));
  }
  get sidesAsCircles() {
    return { a: greatCircle(this.B, this.C), b: greatCircle(this.C, this.A), c: greatCircle(this.A, this.B) };
  }
  classify() {
    const { A, B, C } = this.angles;
    const { a, b, c } = this.sides;
    const right = [A, B, C].filter((x) => x.isRight).length;
    const equal = Number(a.equals(b)) + Number(b.equals(c)) + Number(c.equals(a));
    return { rightAngles: right, sides: equal === 3 ? "equilateral" : equal === 1 ? "isosceles" : "scalene" };
  }
  /**
   * The laws of spherical trigonometry on this triangle, each an exact
   * equality: the two laws of cosines, the law of sines, the polar
   * triangle, and the excess against the formula
   * tan(E/2) = |A·(B×C)| / (1 + A·B + B·C + C·A).
   */
  checks() {
    const { a, b, c } = this.sides;
    const { A, B, C } = this.angles;
    const cosines = [[a, b, c, A], [b, c, a, B], [c, a, b, C]].every(([x, y, z, X]) => N.eq(x.cos, N.add(N.mul(y.cos, z.cos), N.mul(N.mul(y.sin, z.sin), X.cos))));
    const second = [[A, B, C, a], [B, C, A, b], [C, A, B, c]].every(([X, Y, Z, x]) => N.eq(X.cos, N.add(N.neg(N.mul(Y.cos, Z.cos)), N.mul(N.mul(Y.sin, Z.sin), x.cos))));
    const sines = N.eq(N.mul(A.sin, b.sin), N.mul(B.sin, a.sin)) && N.eq(N.mul(B.sin, c.sin), N.mul(C.sin, b.sin));
    const p = this.polar;
    const polar = [[p.sides.a, A], [p.sides.b, B], [p.sides.c, C]].every(([s, X]) => N.eq(s.cos, N.neg(X.cos)));
    // tan(E/2) = t gives cos E = (1 − t²)/(1 + t²) and sin E = 2t/(1 + t²)
    const den = N.sum(ONE, this.A.dot(this.B), this.B.dot(this.C), this.C.dot(this.A));
    const E = this.excess;
    const excess = N.isZero(den) ? N.eq(E.cos, Q(-1)) : (() => {
      const t = N.div(N.abs(this.det), den);
      const d = N.add(ONE, N.sq(t));
      return N.eq(E.cos, N.div(N.sub(ONE, N.sq(t)), d)) && N.eq(E.sin, N.div(N.mul(TWO, t), d));
    })();
    return { lawOfCosines: cosines, secondLawOfCosines: second, lawOfSines: sines, polar, excess, all: cosines && second && sines && polar && excess };
  }
  toString() {
    return `spherical triangle ${this.A} ${this.B} ${this.C}`;
  }
}
export const striangle = (a, b, c) => new STriangle(a, b, c);
/** The area of a lune between two great half-circles meeting at the given angle: twice the angle. */
export const lune = (a) => {
  const x = angle(a);
  return x.add(x);
};

/** An isometry of the sphere: an orthogonal 3 × 3 matrix. */
export class SIsometry {
  constructor(matrix) {
    this.matrix = matrix.map((r) => r.map(num));
    const M = this.matrix;
    const T = [0, 1, 2].map((i) => [0, 1, 2].map((j) => M[j][i]));
    const P = mulM(T, M);
    if (!P.every((r, i) => r.every((c, j) => N.eq(c, i === j ? ONE : ZERO)))) refuse("not-isometry", "the matrix is not orthogonal");
  }
  apply(x) {
    if (x instanceof SPoint) return new SPoint(...mulV(this.matrix, x.v));
    if (x instanceof GreatCircle) return new GreatCircle(mulV(this.matrix, x.n));
    if (x instanceof STriangle) return new STriangle(...x.vertices.map((p) => this.apply(p)));
    if (x instanceof SCircle) return new SCircle(this.apply(x.center), x.cosRadius);
    return this.apply(sp(x));
  }
  /** this one first, then the other */
  then(o) {
    return new SIsometry(mulM(o.matrix, this.matrix));
  }
  get inverse() {
    const M = this.matrix;
    return new SIsometry([0, 1, 2].map((i) => [0, 1, 2].map((j) => M[j][i])));
  }
  get determinant() {
    return det3(...this.matrix);
  }
  equals(o) {
    return this.matrix.every((r, i) => r.every((c, j) => N.eq(c, o.matrix[i][j])));
  }
  /**
   * What the isometry is: the identity, a rotation (Euler: every
   * orientation-keeping isometry of the sphere is one) with its axis and
   * angle, a reflection in a great circle, or a rotary reflection.
   */
  classify() {
    const M = this.matrix;
    const direct = N.sign(this.determinant) > 0;
    const R = direct ? M : M.map((r) => r.map(N.neg));
    // R is a rotation: its axis and angle
    const tr = N.sum(R[0][0], R[1][1], R[2][2]);
    const c = N.div(N.sub(tr, ONE), TWO);
    const w = [N.sub(R[2][1], R[1][2]), N.sub(R[0][2], R[2][0]), N.sub(R[1][0], R[0][1])];
    let axis = null;
    let ang;
    if (!isZero3(w)) {
      axis = new SPoint(...unit3(w));
      ang = Angle.ofCos(c);
    } else if (N.eq(c, ONE)) ang = Angle.ZERO;
    else {
      // a half turn: R + I has the axis as every non-zero column
      const S = R.map((r, i) => r.map((x, j) => N.add(x, i === j ? ONE : ZERO)));
      const col = [0, 1, 2].map((j) => [S[0][j], S[1][j], S[2][j]]).find((v) => !isZero3(v));
      axis = new SPoint(...unit3(col));
      ang = Angle.PI;
    }
    if (direct) return ang.isZero ? { kind: "identity" } : { kind: "rotation", axis, angle: ang };
    // M = −R: a rotation by (angle + π) about the same axis, then the reflection in the plane across the axis
    if (N.eq(c, Q(-1))) return { kind: "reflection", mirror: new GreatCircle(axis.v) };
    const turn = ang.isZero ? Angle.PI : ang.sub(Angle.PI);
    return { kind: "rotary reflection", axis: axis ?? null, angle: turn.approx < 0 ? turn.neg() : turn, antipodal: ang.isZero };
  }
  toString() {
    const k = this.classify();
    return k.kind === "rotation" ? `rotation by ${k.angle.text} about ${k.axis}` : k.kind;
  }
}
/**
 * The rotation about an axis (a point of the sphere, or any vector) by a
 * fraction of a full turn, counter-clockwise seen from outside along the
 * axis. { cos, sin } gives the angle by its exact cosine and sine.
 */
export function srotation(axis, turns) {
  const u = sp(axis).v;
  const a = angle(turns);
  const [c, s] = [a.cos, a.sin];
  const k = N.sub(ONE, c);
  const K = [[ZERO, N.neg(u[2]), u[1]], [u[2], ZERO, N.neg(u[0])], [N.neg(u[1]), u[0], ZERO]];
  return new SIsometry(I3().map((r, i) => r.map((e, j) => N.sum(N.mul(c, e), N.mul(s, K[i][j]), N.mul(k, N.mul(u[i], u[j]))))));
}
/** the map p → −p */
export const antipodalMap = () => new SIsometry(I3().map((r) => r.map(N.neg)));
