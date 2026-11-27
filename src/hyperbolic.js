// The hyperbolic plane, exactly, in four models at once.
//
// A point is kept on the hyperboloid t² − x² − y² = 1, t > 0, where the
// geometry is linear algebra with the form B(p, q) = p₀q₀ − p₁q₁ − p₂q₂:
//   cosh d(p, q) = B(p, q)            a line is { p : B(n, p) = 0 }
//   isometries are the matrices that keep B.
// The other models are views of the same point:
//   Poincaré disc   (x, y)/(1 + t)       angles are true, lines are arcs
//   Klein disc      (x, y)/t             lines are straight chords
//   half-plane      the disc under z → i(1 + z)/(1 − z)
// The maps between the disc, the half-plane and the hyperboloid are
// rational, so a rational point in one is rational in the others. Distances
// keep their exact cosh; angles keep their exact cosine.
import { num, N, refuse, ZERO, ONE, TWO, Q } from "./num.js";
import { Point, Line, Circle, meet as meetPlane } from "./plane.js";
import { Angle, angle, piTimes, Length } from "./angle.js";

const B = (p, q) => N.sub(N.mul(p[0], q[0]), N.add(N.mul(p[1], q[1]), N.mul(p[2], q[2])));
const cross3 = (u, v) => [N.sub(N.mul(u[1], v[2]), N.mul(u[2], v[1])), N.sub(N.mul(u[2], v[0]), N.mul(u[0], v[2])), N.sub(N.mul(u[0], v[1]), N.mul(u[1], v[0]))];
/** the vector B-orthogonal to both u and v */
const lcross = (u, v) => {
  const w = cross3(u, v);
  return [w[0], N.neg(w[1]), N.neg(w[2])];
};
const add3 = (u, v) => u.map((c, i) => N.add(c, v[i]));
const sub3 = (u, v) => u.map((c, i) => N.sub(c, v[i]));
const scale3 = (u, k) => u.map((c) => N.mul(c, k));
const isZero3 = (u) => u.every(N.isZero);
const mulM = (A, M) => A.map((r) => [0, 1, 2].map((j) => N.sum(N.mul(r[0], M[0][j]), N.mul(r[1], M[1][j]), N.mul(r[2], M[2][j]))));
const mulV = (A, v) => A.map((r) => N.sum(N.mul(r[0], v[0]), N.mul(r[1], v[1]), N.mul(r[2], v[2])));
const det3 = (M) => N.sum(...[0, 1, 2].map((i) => N.mul(M[0][i], N.sub(N.mul(M[1][(i + 1) % 3], M[2][(i + 2) % 3]), N.mul(M[1][(i + 2) % 3], M[2][(i + 1) % 3])))));
const I3 = () => [[ONE, ZERO, ZERO], [ZERO, ONE, ZERO], [ZERO, ZERO, ONE]];
const UNIT = new Circle(new Point(0, 0), ONE);

/** A point of the hyperbolic plane. */
export class HPoint {
  constructor(t, x, y) {
    this.v = [num(t), num(x), num(y)];
    if (N.sign(this.v[0]) <= 0 || !N.eq(B(this.v, this.v), ONE)) refuse("not-on-hyperboloid", "t² − x² − y² must be 1 with t > 0");
  }
  /** (t, x, y) on the hyperboloid */
  get hyperboloid() {
    return this.v;
  }
  /** the point in the Poincaré disc */
  get disc() {
    const k = N.div(ONE, N.add(ONE, this.v[0]));
    return new Point(N.mul(this.v[1], k), N.mul(this.v[2], k));
  }
  /** the point in the Klein disc */
  get klein() {
    return new Point(N.div(this.v[1], this.v[0]), N.div(this.v[2], this.v[0]));
  }
  /** the point in the upper half-plane */
  get halfPlane() {
    const { x: u, y: w } = this.disc;
    const D = N.add(N.sq(N.sub(ONE, u)), N.sq(w));
    return new Point(N.div(N.mul(Q(-2), w), D), N.div(N.sub(ONE, N.add(N.sq(u), N.sq(w))), D));
  }
  equals(o) {
    return o instanceof HPoint && this.v.every((c, i) => N.eq(c, o.v[i]));
  }
  /** the distance to another point */
  distanceTo(o) {
    return Length.ofCosh(B(this.v, hp(o).v));
  }
  toString() {
    return `${this.disc} in the disc`;
  }
}
/** The point with coordinates (x, y) in the Poincaré disc: hpoint(0, "1/2"), or hpoint([x, y]). */
export function hpoint(x, y) {
  if (x instanceof HPoint) return x;
  const [u, w] = x instanceof Point ? [x.x, x.y] : Array.isArray(x) ? x.map(num) : [num(x), num(y)];
  const s = N.add(N.sq(u), N.sq(w));
  if (N.cmp(s, ONE) >= 0) refuse("outside", "a point of the disc has x² + y² < 1; the circle itself is made of ideal points (ideal(x, y))");
  const d = N.sub(ONE, s);
  return new HPoint(N.div(N.add(ONE, s), d), N.div(N.mul(TWO, u), d), N.div(N.mul(TWO, w), d));
}
const hp = hpoint;
const xy = (x, y) => (x instanceof Point ? [x.x, x.y] : Array.isArray(x) ? x.map(num) : [num(x), num(y)]);
/** The point with coordinates (x, y) in the Klein disc. */
export function fromKlein(x, y) {
  const [u, w] = xy(x, y);
  const s = N.add(N.sq(u), N.sq(w));
  if (N.cmp(s, ONE) >= 0) refuse("outside", "a point of the Klein disc has x² + y² < 1");
  const t = N.div(ONE, N.sqrt(N.sub(ONE, s)));
  return new HPoint(t, N.mul(u, t), N.mul(w, t));
}
/** The point x + iy of the upper half-plane (y > 0). */
export function fromHalfPlane(x, y) {
  const [X, Y] = xy(x, y);
  if (N.sign(Y) <= 0) refuse("outside", "a point of the half-plane has y > 0; the real axis is made of ideal points");
  const D = N.add(N.sq(X), N.sq(N.add(Y, ONE)));
  return hpoint(N.div(N.sub(N.add(N.sq(X), N.sq(Y)), ONE), D), N.div(N.mul(Q(-2), X), D));
}
/** The point (t, x, y) of the hyperboloid t² − x² − y² = 1. */
export const fromHyperboloid = (t, x, y) => (Array.isArray(t) ? new HPoint(...t) : new HPoint(t, x, y));
/** the centre of the disc */
export const horigin = () => new HPoint(1, 0, 0);

/** An ideal point: a point of the circle at infinity, x² + y² = 1 in either disc. */
export class HIdeal {
  constructor(x, y) {
    this.x = num(x);
    this.y = num(y);
    if (!N.eq(N.add(N.sq(this.x), N.sq(this.y)), ONE)) refuse("not-ideal", "an ideal point has x² + y² = 1");
  }
  /** a null vector of the form: (1, x, y) */
  get v() {
    return [ONE, this.x, this.y];
  }
  get disc() {
    return new Point(this.x, this.y);
  }
  get klein() {
    return this.disc;
  }
  /** the real number on the boundary of the half-plane, or null for its point at infinity */
  get halfPlane() {
    if (N.eq(this.x, ONE)) return null;
    return N.div(N.mul(Q(-2), this.y), N.add(N.sq(N.sub(ONE, this.x)), N.sq(this.y)));
  }
  equals(o) {
    return o instanceof HIdeal && N.eq(this.x, o.x) && N.eq(this.y, o.y);
  }
  toString() {
    return `ideal point ${this.disc}`;
  }
}
/** The ideal point in the direction (x, y), or ideal(turns) at an angle given as a fraction of a full turn. */
export function ideal(x, y) {
  if (x instanceof HIdeal) return x;
  if (y === undefined && !Array.isArray(x) && !(x instanceof Point)) {
    const a = angle(x);
    return new HIdeal(a.cos, a.sin);
  }
  const [u, w] = xy(x, y);
  const r = N.sqrt(N.add(N.sq(u), N.sq(w)));
  if (N.isZero(r)) refuse("degenerate", "the zero vector has no direction");
  return new HIdeal(N.div(u, r), N.div(w, r));
}
const anyPoint = (p) => (p instanceof HPoint || p instanceof HIdeal ? p : hp(p));
const idealOf = (w) => new HIdeal(N.div(w[1], w[0]), N.div(w[2], w[0]));
const pointOf = (w) => {
  // a timelike vector scaled onto the hyperboloid
  const n2 = B(w, w);
  const k = N.div(ONE, N.sqrt(n2));
  return new HPoint(...scale3(w, N.sign(w[0]) < 0 ? N.neg(k) : k));
};

/** A line (geodesic): the points p with B(n, p) = 0, for a vector n with B(n, n) < 0. */
export class HLine {
  constructor(n) {
    this.n = n.map(num);
    this.norm2 = N.neg(B(this.n, this.n));
    if (N.sign(this.norm2) <= 0) refuse("degenerate", "a line needs two different points, not both ideal and equal");
  }
  contains(p) {
    return N.isZero(B(this.n, anyPoint(p).v));
  }
  /** −1, 0 or 1: which side of the line a point is on */
  side(p) {
    return N.sign(B(this.n, anyPoint(p).v));
  }
  equals(o) {
    return isZero3(cross3(this.n, o.n));
  }
  /** the line in the Klein disc: a straight chord, as a line of the plane */
  get klein() {
    return new Line(N.neg(this.n[1]), N.neg(this.n[2]), this.n[0]);
  }
  /** the two ideal points at the ends of the line */
  get ends() {
    return (this._ends ??= meetPlane(this.klein, UNIT).map((p) => new HIdeal(p.x, p.y)));
  }
  /** the line in the Poincaré disc: a circle that crosses the unit circle at right angles, or a diameter (a Line) */
  get disc() {
    const [a, b, c] = this.n;
    if (N.isZero(a)) return new Line(b, c, ZERO);
    const center = new Point(N.div(b, a), N.div(c, a));
    return new Circle(center, N.sub(N.add(N.sq(center.x), N.sq(center.y)), ONE));
  }
  /** the line in the half-plane: a half-circle centred on the real axis, or a vertical line */
  get halfPlane() {
    const [e, f] = this.ends.map((p) => p.halfPlane);
    if (e === null || f === null) return new Line(ONE, ZERO, N.neg(e ?? f));
    const c = N.div(N.add(e, f), TWO);
    return new Circle(new Point(c, ZERO), N.sq(N.div(N.sub(e, f), TWO)));
  }
  /** the distance from a point to the line */
  distanceTo(p) {
    return Length.ofSinh(N.div(B(this.n, hp(p).v), N.sqrt(this.norm2)));
  }
  /** the foot of the perpendicular from a point */
  foot(p) {
    const v = hp(p).v;
    return pointOf(add3(v, scale3(this.n, N.div(B(v, this.n), this.norm2))));
  }
  /** the line through p that crosses this one at right angles */
  perpendicularThrough(p) {
    return new HLine(lcross(anyPoint(p).v, this.n));
  }
  /**
   * How two lines lie: "intersecting" (with the point and the angle),
   * "asymptotic" (they share an ideal point and come arbitrarily close) or
   * "ultraparallel" (with their one common perpendicular and the distance
   * between them).
   */
  relation(o) {
    if (this.equals(o)) return { kind: "equal" };
    const b = B(this.n, o.n);
    const prod = N.mul(this.norm2, o.norm2);
    const s = N.cmp(N.sq(b), prod);
    const w = lcross(this.n, o.n);
    if (s < 0) return { kind: "intersecting", point: pointOf(w), angle: Angle.ofCos(N.div(N.abs(b), N.sqrt(prod))) };
    if (s === 0) return { kind: "asymptotic", ideal: idealOf(w) };
    return { kind: "ultraparallel", commonPerpendicular: new HLine(w), distance: Length.ofCosh(N.div(N.abs(b), N.sqrt(prod))) };
  }
  meets(o) {
    return this.relation(o).kind === "intersecting";
  }
  isPerpendicularTo(o) {
    return N.isZero(B(this.n, o.n));
  }
  /** the reflection in this line */
  get reflection() {
    const n = this.n;
    const J = [ONE, Q(-1), Q(-1)];
    // x → x + 2·B(x, n)/norm2 · n
    const k = N.div(TWO, this.norm2);
    return new HIsometry(I3().map((r, i) => r.map((c, j) => N.add(c, N.mul(k, N.mul(n[i], N.mul(J[j], n[j])))))));
  }
  /**
   * The lines through p that never meet this one. There are infinitely
   * many: the two limiting parallels (which share an end with this line)
   * and every line between them. `angle` is the angle of parallelism Π(d),
   * with cos Π = tanh d for the distance d from p to the line.
   */
  parallelsThrough(p) {
    const P = hp(p);
    if (this.contains(P)) refuse("on-line", "the point is on the line");
    const limiting = this.ends.map((e) => hline(P, e));
    const perp = this.perpendicularThrough(P);
    const d = this.distanceTo(P);
    return { count: Infinity, limiting, ultraparallel: perp.perpendicularThrough(P), distance: d, angle: Angle.ofCos(d.tanh) };
  }
  toString() {
    const [e, f] = this.ends;
    return `line from ${e.disc} to ${f.disc}`;
  }
}
/** The line through two points; either may be ideal. */
export function hline(a, b) {
  const [p, q] = [anyPoint(a), anyPoint(b)];
  if (p.equals(q)) refuse("degenerate", "a line needs two different points");
  return new HLine(lcross(p.v, q.v));
}
/** the midpoint of two points */
export function hmidpoint(a, b) {
  return pointOf(add3(hp(a).v, hp(b).v));
}
/** the line of points equally far from two points */
export function hbisector(a, b) {
  const [p, q] = [hp(a), hp(b)];
  if (p.equals(q)) refuse("degenerate", "the two points are the same");
  return new HLine(sub3(p.v, q.v));
}

/** A circle: the points at a given distance from a centre. */
export class HCircle {
  constructor(center, coshRadius) {
    this.center = hp(center);
    this.radius = Length.ofCosh(coshRadius);
  }
  contains(p) {
    return N.eq(B(this.center.v, hp(p).v), this.radius.cosh);
  }
  /** 2π·sinh r: longer than the plane's 2πr */
  get circumference() {
    return piTimes(N.mul(TWO, this.radius.sinh));
  }
  /** 2π(cosh r − 1) */
  get area() {
    return piTimes(N.mul(TWO, N.sub(this.radius.cosh, ONE)));
  }
  /** the same circle in the Poincaré disc: a Euclidean circle, with another centre */
  get disc() {
    const [c0, c1, c2] = this.center.v;
    const k = this.radius.cosh;
    const s = N.add(c0, k);
    const center = new Point(N.div(c1, s), N.div(c2, s));
    return new Circle(center, N.sub(N.add(N.sq(center.x), N.sq(center.y)), N.div(N.sub(c0, k), s)));
  }
  toString() {
    return `circle about ${this.center} of radius ${this.radius.text}`;
  }
}
/** The circle with a centre through a point, or hcircle(centre, { cosh }) or { exp } for the radius. */
export function hcircle(center, through) {
  const c = hp(center);
  if (through !== null && typeof through === "object" && !(through instanceof HPoint) && !(through instanceof Point) && !Array.isArray(through)) {
    if ("cosh" in through) return new HCircle(c, through.cosh);
    if ("exp" in through) return new HCircle(c, Length.ofExp(through.exp).cosh);
    if (through instanceof Length) return new HCircle(c, through.cosh);
    refuse("bad-circle", "give a point on the circle, or the radius as { cosh } or { exp }");
  }
  return new HCircle(c, B(c.v, hp(through).v));
}
/** The horocycle about an ideal point through p: in the Poincaré disc, the circle through p that touches the unit circle there. */
export function horocycle(at, p) {
  const e = ideal(at);
  const k = B(e.v, hp(p).v);
  const s = N.add(ONE, k);
  return { ideal: e, through: hp(p), disc: new Circle(new Point(N.div(e.x, s), N.div(e.y, s)), N.sq(N.div(k, s))) };
}

/** A triangle; any of its vertices may be ideal (the angle there is 0 and the two sides to it are infinite). */
export class HTriangle {
  constructor(A, Bp, C) {
    [this.A, this.B, this.C] = [anyPoint(A), anyPoint(Bp), anyPoint(C)];
    if (N.isZero(B(this.A.v, lcross(this.B.v, this.C.v)))) refuse("degenerate", "the three points lie on one line");
  }
  get vertices() {
    return [this.A, this.B, this.C];
  }
  get idealVertices() {
    return this.vertices.filter((p) => p instanceof HIdeal).length;
  }
  /** the sides as lengths (a is opposite A); null for a side that runs to an ideal vertex */
  get sides() {
    const d = (p, q) => (p instanceof HIdeal || q instanceof HIdeal ? null : p.distanceTo(q));
    return (this._sides ??= { a: d(this.B, this.C), b: d(this.C, this.A), c: d(this.A, this.B) });
  }
  get angles() {
    if (this._angles) return this._angles;
    const at = (P, Q1, R) => {
      if (P instanceof HIdeal) return Angle.ZERO;
      // tangent vectors at P towards Q1 and R; the form is negative on them
      const u = sub3(Q1.v, scale3(P.v, B(P.v, Q1.v)));
      const w = sub3(R.v, scale3(P.v, B(P.v, R.v)));
      return Angle.ofCos(N.div(N.neg(B(u, w)), N.sqrt(N.mul(B(u, u), B(w, w)))));
    };
    return (this._angles = { A: at(this.A, this.B, this.C), B: at(this.B, this.C, this.A), C: at(this.C, this.A, this.B) });
  }
  get angleSum() {
    const { A, B: b, C } = this.angles;
    return A.add(b).add(C);
  }
  /** π − (A + B + C): always positive, and at most π */
  get defect() {
    return (this._defect ??= Angle.PI.sub(this.angleSum));
  }
  /** Gauss: the area is the defect, so no triangle has area more than π */
  get area() {
    return this.defect;
  }
  get lines() {
    return { a: hline(this.B, this.C), b: hline(this.C, this.A), c: hline(this.A, this.B) };
  }
  /**
   * The laws of hyperbolic trigonometry on this triangle (all vertices
   * finite), each an exact equality: the law of cosines
   * cosh a = cosh b cosh c − sinh b sinh c cos A, the second law
   * cos A = −cos B cos C + sin B sin C cosh a (which has no Euclidean
   * counterpart: the angles determine the sides), and the law of sines.
   */
  checks() {
    if (this.idealVertices) refuse("ideal", "the laws need finite sides");
    const { a, b, c } = this.sides;
    const { A, B: Bn, C } = this.angles;
    const cosines = [[a, b, c, A], [b, c, a, Bn], [c, a, b, C]].every(([x, y, z, X]) => N.eq(x.cosh, N.sub(N.mul(y.cosh, z.cosh), N.mul(N.mul(y.sinh, z.sinh), X.cos))));
    const second = [[A, Bn, C, a], [Bn, C, A, b], [C, A, Bn, c]].every(([X, Y, Z, x]) => N.eq(X.cos, N.add(N.neg(N.mul(Y.cos, Z.cos)), N.mul(N.mul(Y.sin, Z.sin), x.cosh))));
    const sines = N.eq(N.mul(A.sin, b.sinh), N.mul(Bn.sin, a.sinh)) && N.eq(N.mul(Bn.sin, c.sinh), N.mul(C.sin, b.sinh));
    return { lawOfCosines: cosines, secondLawOfCosines: second, lawOfSines: sines, all: cosines && second && sines };
  }
  toString() {
    return `hyperbolic triangle ${this.vertices.join(", ")}`;
  }
}
export const htriangle = (a, b, c) => new HTriangle(a, b, c);

/** An isometry of the hyperbolic plane: a 3 × 3 matrix that keeps the form B and the upper sheet. */
export class HIsometry {
  constructor(matrix) {
    this.matrix = matrix.map((r) => r.map(num));
    const M = this.matrix;
    const J = [ONE, Q(-1), Q(-1)];
    const ok = [0, 1, 2].every((i) => [0, 1, 2].every((j) => N.eq(B([M[0][i], M[1][i], M[2][i]], [M[0][j], M[1][j], M[2][j]]), i === j ? J[i] : ZERO)));
    if (!ok || N.sign(M[0][0]) <= 0) refuse("not-isometry", "the matrix does not keep t² − x² − y² and the upper sheet");
  }
  apply(x) {
    if (x instanceof HPoint) return new HPoint(...mulV(this.matrix, x.v));
    if (x instanceof HIdeal) return idealOf(mulV(this.matrix, x.v));
    if (x instanceof HLine) return new HLine(mulV(this.matrix, x.n));
    if (x instanceof HTriangle) return new HTriangle(...x.vertices.map((p) => this.apply(p)));
    if (x instanceof HCircle) return new HCircle(this.apply(x.center), x.radius.cosh);
    return this.apply(hp(x));
  }
  /** this one first, then the other */
  then(o) {
    return new HIsometry(mulM(o.matrix, this.matrix));
  }
  get inverse() {
    const M = this.matrix;
    const J = [ONE, Q(-1), Q(-1)];
    return new HIsometry([0, 1, 2].map((i) => [0, 1, 2].map((j) => N.mul(N.mul(J[i], J[j]), M[j][i]))));
  }
  equals(o) {
    return this.matrix.every((r, i) => r.every((c, j) => N.eq(c, o.matrix[i][j])));
  }
  get preservesOrientation() {
    return N.sign(det3(this.matrix)) > 0;
  }
  /**
   * What the isometry is. Keeping orientation: the identity, a rotation
   * about a point (elliptic), a parabolic map fixing one ideal point, or a
   * translation along an axis (hyperbolic). Reversing it: a reflection or a
   * glide reflection.
   */
  classify() {
    const M = this.matrix;
    const tr = N.sum(M[0][0], M[1][1], M[2][2]);
    const direct = this.preservesOrientation;
    // the vectors with M v = ±v
    const S = M.map((r, i) => r.map((c, j) => N.sub(c, i === j ? (direct ? ONE : Q(-1)) : ZERO)));
    const pairs = [[0, 1], [0, 2], [1, 2]].map(([i, j]) => cross3(S[i], S[j]));
    const v = pairs.find((w) => !isZero3(w));
    if (direct) {
      if (!v) return { kind: "identity" };
      const s = N.sign(B(v, v));
      if (s > 0) {
        const center = pointOf(v);
        // the sine from one tangent vector: M x = cos·x⊥ + sin·(x⊥ × c) + B(x, c)c
        const e = [[ONE, ZERO, ZERO], [ZERO, ONE, ZERO], [ZERO, ZERO, ONE]].map((x) => sub3(x, scale3(center.v, B(x, center.v)))).find((x) => !isZero3(x));
        const w = lcross(e, center.v);
        const img = mulV(M, e);
        return { kind: "rotation", center, angle: new Angle(N.div(N.sub(tr, ONE), TWO), N.div(B(img, w), B(w, w))) };
      }
      if (s === 0) return { kind: "parabolic", ideal: idealOf(v) };
      return { kind: "translation", axis: new HLine(v), length: Length.ofCosh(N.div(N.sub(tr, ONE), TWO)) };
    }
    const axis = new HLine(v);
    if (N.eq(tr, ONE)) return { kind: "reflection", line: axis };
    return { kind: "glide reflection", axis, length: Length.ofCosh(N.div(N.add(tr, ONE), TWO)) };
  }
  /**
   * The same map of the Poincaré disc as a Möbius map
   * z → (a·z + b)/(c·z + d), each coefficient an exact complex number
   * [re, im]. An orientation-reversing isometry is such a map applied to
   * the conjugate of z, and `conjugate` says so.
   */
  toMobius() {
    const direct = this.preservesOrientation;
    const cx = {
      mul: ([a, b], [c, d]) => [N.sub(N.mul(a, c), N.mul(b, d)), N.add(N.mul(a, d), N.mul(b, c))],
      div([a, b], [c, d]) {
        const n = N.add(N.sq(c), N.sq(d));
        return [N.div(N.add(N.mul(a, c), N.mul(b, d)), n), N.div(N.sub(N.mul(b, c), N.mul(a, d)), n)];
      },
      add: ([a, b], [c, d]) => [N.add(a, c), N.add(b, d)],
      conj: ([a, b]) => [a, N.neg(b)],
    };
    const at = (x, y) => {
      const p = this.apply(hpoint(x, y)).disc;
      return [p.x, p.y];
    };
    // f(z) = u·(z + α)/(1 + ᾱz) with |u| = 1, on z or on its conjugate
    const f0 = at(0, 0);
    const z1 = [Q(1, 2), ZERO];
    const f1 = at(Q(1, 2), 0);
    // f0 = u·α and f1 = u(z1 + α)/(1 + ᾱ z1): with z1 real, u = (f1 − f0)/(z1·(1 − conj(f0)·f1))
    const u = cx.div(cx.add(f1, [N.neg(f0[0]), N.neg(f0[1])]), cx.mul(z1, cx.add([ONE, ZERO], cx.mul([Q(-1), ZERO], cx.mul(cx.conj(f0), f1)))));
    const alpha = cx.div(f0, u);
    return { a: u, b: f0, c: cx.conj(alpha), d: [ONE, ZERO], conjugate: !direct };
  }
  toString() {
    const k = this.classify();
    return k.kind === "rotation" ? `rotation by ${k.angle.text} about ${k.center}` : k.kind === "translation" || k.kind === "glide reflection" ? `${k.kind} by ${k.length.text} along the ${k.axis}` : k.kind;
  }
}
/** the reflection in a line */
export const hreflection = (l) => l.reflection;
/** The rotation about a point by a fraction of a full turn (counter-clockwise in the disc), or by { cos, sin }. */
export function hrotation(center, turns) {
  const c = hp(center).v;
  const a = angle(turns);
  // x → cos·x⊥ + sin·(x⊥ × c) + B(x, c)·c, column by column
  const cols = I3().map((e) => {
    const k = B(e, c);
    const perp = sub3(e, scale3(c, k));
    return add3(add3(scale3(perp, a.cos), scale3(lcross(perp, c), a.sin)), scale3(c, k));
  });
  return new HIsometry([0, 1, 2].map((i) => [0, 1, 2].map((j) => cols[j][i])));
}
/** the half turn about a point */
export function hhalfTurn(center) {
  const c = hp(center).v;
  const J = [ONE, Q(-1), Q(-1)];
  return new HIsometry(I3().map((r, i) => r.map((e, j) => N.sub(N.mul(TWO, N.mul(c[i], N.mul(J[j], c[j]))), e))));
}
/** The translation along the line through a and b that takes a to b. */
export function htranslation(a, b) {
  const [p, q] = [hp(a), hp(b)];
  if (p.equals(q)) return new HIsometry(I3());
  return hhalfTurn(p).then(hhalfTurn(hmidpoint(p, q)));
}

// ---- regular tilings -----------------------------------------------------------------------

const SOLIDS = { "3,3": "tetrahedron", "4,3": "cube", "3,4": "octahedron", "5,3": "dodecahedron", "3,5": "icosahedron" };

/**
 * The regular tiling {p, q}: regular p-gons, q at each vertex. It lives on
 * the sphere when (p − 2)(q − 2) < 4, in the Euclidean plane when it is 4
 * and in the hyperbolic plane when it is more. In the first and last cases
 * the size of the tile is forced, and it is given exactly.
 */
export function schlafli(p, q) {
  if (!Number.isInteger(p) || !Number.isInteger(q) || p < 3 || q < 3) refuse("bad-tiling", "p and q are whole numbers, 3 or more");
  const k = (p - 2) * (q - 2);
  const geometry = k < 4 ? "spherical" : k === 4 ? "euclidean" : "hyperbolic";
  // angle sum of the p-gon is p·2π/q; the flat sum is (p − 2)π
  const excessTurns = Q(p, q).subtract(Q(p - 2, 2)); // (sum − flat) as a fraction of a full turn
  const out = { p, q, symbol: `{${p}, ${q}}`, geometry, interiorAngle: Angle.ofTurns(Q(1, q)) };
  if (geometry === "euclidean") return out;
  const [cp, sp, cq, sq] = [N.cosPi(Q(1, p)), N.sinPi(Q(1, p)), N.cosPi(Q(1, q)), N.sinPi(Q(1, q))];
  if (geometry === "spherical") {
    const faces = (4 * q) / (4 - k);
    return { ...out, solid: SOLIDS[`${p},${q}`], faces, vertices: (faces * p) / q, edges: (faces * p) / 2, tileArea: Angle.ofTurns(excessTurns), edge: (() => {
      const h = Angle.ofCos(N.div(cp, sq)); // half the edge
      return h.add(h);
    })(), circumradius: Angle.ofCos(N.div(N.mul(cp, cq), N.mul(sp, sq))), inradius: Angle.ofCos(N.div(cq, sp)) };
  }
  const edge = Length.ofCosh(N.div(cp, sq)).double();
  const circumradius = Length.ofCosh(N.div(N.mul(cp, cq), N.mul(sp, sq)));
  const inradius = Length.ofCosh(N.div(cq, sp));
  return { ...out, tileArea: Angle.ofTurns(excessTurns.negate()), edge, circumradius, inradius };
}

const fB = (p, q) => p[0] * q[0] - p[1] * q[1] - p[2] * q[2];
const fReflect = (n, x) => {
  const k = (2 * fB(x, n)) / -fB(n, n);
  return [x[0] + k * n[0], x[1] + k * n[1], x[2] + k * n[2]];
};
const fLine = (p, q) => [p[1] * q[2] - p[2] * q[1], -(p[2] * q[0] - p[0] * q[2]), -(p[0] * q[1] - p[1] * q[0])];

/**
 * The hyperbolic tiling {p, q} around the centre of the disc.
 *   tile        the central p-gon, its vertices exact
 *   check()     its interior angle is 2π/q and its edge is schlafli's, exactly
 *   patch(n)    the tiles within n steps of the central one, in floats,
 *               with the number of tiles at each step
 */
export function hyperbolicTiling(p, q) {
  const info = schlafli(p, q);
  if (info.geometry !== "hyperbolic") refuse("not-hyperbolic", `{${p}, ${q}} is ${info.geometry}: a hyperbolic tiling needs (p − 2)(q − 2) > 4`);
  const R = info.circumradius;
  const rho = N.div(R.sinh, N.add(ONE, R.cosh)); // the radius in the Poincaré disc
  let exact = null;
  const vertices = () => (exact ??= Array.from({ length: p }, (_, k) => hpoint(N.mul(rho, N.cosPi(Q(2 * k, p))), N.mul(rho, N.sinPi(Q(2 * k, p))))));
  return {
    ...info,
    discRadius: rho,
    get tile() {
      return vertices();
    },
    check() {
      const v = vertices();
      const u = sub3(v[1].v, scale3(v[0].v, B(v[0].v, v[1].v)));
      const w = sub3(v[p - 1].v, scale3(v[0].v, B(v[0].v, v[p - 1].v)));
      const corner = Angle.ofCos(N.div(N.neg(B(u, w)), N.sqrt(N.mul(B(u, u), B(w, w)))));
      return { angle: corner.equals(info.interiorAngle), edge: v[0].distanceTo(v[1]).equals(info.edge) };
    },
    patch(layers = 2, { maxTiles = 5000 } = {}) {
      const r = N.toNumber(rho);
      const d = 1 - r * r;
      const first = Array.from({ length: p }, (_, k) => {
        const [x, y] = [r * Math.cos((2 * Math.PI * k) / p), r * Math.sin((2 * Math.PI * k) / p)];
        return [(1 + r * r) / d, (2 * x) / d, (2 * y) / d];
      });
      const centre = (poly) => {
        const s = poly.reduce((a, v) => [a[0] + v[0], a[1] + v[1], a[2] + v[2]], [0, 0, 0]);
        const n = Math.sqrt(s[0] * s[0] - s[1] * s[1] - s[2] * s[2]);
        return [s[1] / (n + s[0]), s[2] / (n + s[0])];
      };
      const key = (poly) => centre(poly).map((c) => Math.round(c * 1e7)).join(",");
      const seen = new Set([key(first)]);
      const tiles = [{ layer: 0, v: first }];
      const counts = [1];
      let frontier = [first];
      let complete = true;
      for (let layer = 1; layer <= layers && complete; layer++) {
        const next = [];
        for (const poly of frontier) {
          for (let i = 0; i < p; i++) {
            const n = fLine(poly[i], poly[(i + 1) % p]);
            const image = poly.map((v) => fReflect(n, v));
            const k = key(image);
            if (seen.has(k)) continue;
            if (tiles.length >= maxTiles) {
              complete = false;
              break;
            }
            seen.add(k);
            next.push(image);
            tiles.push({ layer, v: image });
          }
          if (!complete) break;
        }
        counts.push(next.length);
        frontier = next;
      }
      return {
        kind: "float",
        complete,
        counts,
        tiles: tiles.map((t) => ({ layer: t.layer, points: t.v.map((v) => [v[1] / (1 + v[0]), v[2] / (1 + v[0])]) })),
      };
    },
  };
}
