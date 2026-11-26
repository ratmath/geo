// The Euclidean plane with exact coordinates: points, lines and circles,
// the ruler-and-compass constructions, triangles and their centres, and
// transformations. Every predicate (collinear, concyclic, tangent, …) is
// decided exactly, so a theorem checked on a configuration is checked, not
// observed to within rounding.
import { Rational } from "@ratmath/core";
import { num, N, refuse, ZERO, ONE, TWO, Q } from "./num.js";

const half = (a) => N.div(a, TWO);

export class Point {
  constructor(x, y) {
    this.x = num(x);
    this.y = num(y);
  }
  equals(o) {
    return N.eq(this.x, o.x) && N.eq(this.y, o.y);
  }
  plus(o) {
    return new Point(N.add(this.x, o.x), N.add(this.y, o.y));
  }
  minus(o) {
    return new Point(N.sub(this.x, o.x), N.sub(this.y, o.y));
  }
  times(k) {
    const s = num(k);
    return new Point(N.mul(this.x, s), N.mul(this.y, s));
  }
  toNumbers() {
    return [N.toNumber(this.x), N.toNumber(this.y)];
  }
  toString() {
    return `(${N.text(this.x)}, ${N.text(this.y)})`;
  }
}
/** A point from exact coordinates: point(1, "1/2"), point("sqrt(3)/2", 0), or point([x, y]). */
export function point(x, y) {
  if (x instanceof Point) return x;
  if (Array.isArray(x)) return new Point(x[0], x[1]);
  return new Point(x, y);
}
const P = point;
export const dot = (u, v) => N.add(N.mul(u.x, v.x), N.mul(u.y, v.y));
export const cross = (u, v) => N.sub(N.mul(u.x, v.y), N.mul(u.y, v.x));

/** The line a·x + b·y + c = 0. */
export class Line {
  constructor(a, b, c) {
    this.a = num(a);
    this.b = num(b);
    this.c = num(c);
    if (N.isZero(this.a) && N.isZero(this.b)) refuse("degenerate", "a line needs two different points");
  }
  /** a direction vector */
  get direction() {
    return new Point(this.b, N.neg(this.a));
  }
  /** a·x + b·y + c at a point: zero on the line, and its sign tells the side */
  at(p) {
    return N.sum(N.mul(this.a, p.x), N.mul(this.b, p.y), this.c);
  }
  contains(p) {
    return N.isZero(this.at(P(p)));
  }
  /** some point on the line */
  get origin() {
    const n2 = N.add(N.sq(this.a), N.sq(this.b));
    return new Point(N.neg(N.div(N.mul(this.a, this.c), n2)), N.neg(N.div(N.mul(this.b, this.c), n2)));
  }
  equals(o) {
    return N.isZero(N.sub(N.mul(this.a, o.b), N.mul(this.b, o.a))) && N.isZero(N.sub(N.mul(this.a, o.c), N.mul(this.c, o.a))) && N.isZero(N.sub(N.mul(this.b, o.c), N.mul(this.c, o.b)));
  }
  toString() {
    const term = (k, v) => {
      if (N.isZero(k)) return null;
      const neg = N.sign(k) < 0;
      const mag = N.abs(k);
      const t = N.text(mag);
      const body = v ? (N.eq(mag, ONE) ? v : `${/[ +\-/]/.test(t) && !/^\d+\/\d+$/.test(t) ? `(${t})` : t}·${v}`) : t;
      return [neg, body];
    };
    // print a tidy multiple: whole numbers with no common factor when the coefficients are rational, first one positive
    let k = [this.a, this.b, this.c];
    if (k.every((v) => v instanceof Rational)) {
      const g = (x, y) => (y ? g(y, x % y) : x < 0n ? -x : x);
      const L = k.reduce((l, v) => (l * v.denominator) / g(l, v.denominator), 1n);
      const ints = k.map((v) => v.numerator * (L / v.denominator));
      const d = ints.reduce((x, y) => g(x, y), 0n) || 1n;
      k = ints.map((v) => new Rational(v / d));
    }
    if (N.sign(k.find((v) => !N.isZero(v))) < 0) k = k.map(N.neg);
    const parts = [term(k[0], "x"), term(k[1], "y"), term(k[2], "")].filter(Boolean);
    return `${parts.map(([neg, body], i) => (i === 0 ? (neg ? "-" : "") : neg ? " - " : " + ") + body).join("")} = 0`;
  }
}
/** The line through two points, or from coefficients line(a, b, c). */
export function line(p, q, c) {
  if (c !== undefined) return new Line(p, q, c);
  const A = P(p);
  const B = P(q);
  if (A.equals(B)) refuse("degenerate", "a line needs two different points");
  return new Line(N.sub(A.y, B.y), N.sub(B.x, A.x), cross(A, B));
}

export class Circle {
  constructor(center, radius2) {
    this.center = P(center);
    this.radius2 = num(radius2);
    if (N.sign(this.radius2) <= 0) refuse("degenerate", "a circle needs a positive radius");
  }
  get radius() {
    return N.sqrt(this.radius2);
  }
  /** the power of a point: negative inside, zero on the circle, positive outside */
  power(p) {
    return N.sub(distance2(this.center, P(p)), this.radius2);
  }
  contains(p) {
    return N.isZero(this.power(p));
  }
  equals(o) {
    return this.center.equals(o.center) && N.eq(this.radius2, o.radius2);
  }
  toString() {
    return `circle, centre ${this.center}, radius ${N.text(this.radius)}`;
  }
}
/** A circle from its centre and either a point on it or { radius } or { radius2 }. */
export function circle(center, through) {
  const c = P(center);
  if (through && typeof through === "object" && !(through instanceof Point) && !Array.isArray(through) && !(through instanceof Rational) && ("radius" in through || "radius2" in through)) {
    return new Circle(c, "radius2" in through ? num(through.radius2) : N.sq(num(through.radius)));
  }
  return new Circle(c, distance2(c, P(through)));
}

export const distance2 = (p, q) => {
  const d = P(p).minus(P(q));
  return dot(d, d);
};
export const distance = (p, q) => N.sqrt(distance2(p, q));
export const midpoint = (p, q) => P(p).plus(P(q)).times(Q(1, 2));
/** 1 for a left turn p → q → r, −1 for a right turn, 0 when collinear */
export const orientation = (p, q, r) => N.sign(cross(P(q).minus(P(p)), P(r).minus(P(p))));
export const collinear = (...ps) => ps.slice(2).every((r) => orientation(ps[0], ps[1], r) === 0);
export const parallel = (l, m) => N.isZero(N.sub(N.mul(l.a, m.b), N.mul(l.b, m.a)));
export const perpendicular = (l, m) => N.isZero(N.add(N.mul(l.a, m.a), N.mul(l.b, m.b)));
/** do three lines pass through one point (or are all parallel)? */
export function concurrent(l, m, n) {
  const det = N.sum(
    N.mul(l.a, N.sub(N.mul(m.b, n.c), N.mul(m.c, n.b))),
    N.neg(N.mul(l.b, N.sub(N.mul(m.a, n.c), N.mul(m.c, n.a)))),
    N.mul(l.c, N.sub(N.mul(m.a, n.b), N.mul(m.b, n.a))),
  );
  return N.isZero(det);
}
/** do the points lie on one circle (or one line)? */
export function concyclic(...ps) {
  const pts = ps.map(P);
  if (pts.length < 4) return true;
  if (collinear(pts[0], pts[1], pts[2])) return collinear(...pts);
  const c = circumcircle(pts[0], pts[1], pts[2]);
  return pts.slice(3).every((p) => c.contains(p));
}

// ---- constructions -------------------------------------------------------------

export const parallelThrough = (l, p) => new Line(l.a, l.b, N.neg(N.add(N.mul(l.a, P(p).x), N.mul(l.b, P(p).y))));
export const perpendicularThrough = (l, p) => new Line(l.b, N.neg(l.a), N.sub(N.mul(l.a, P(p).y), N.mul(l.b, P(p).x)));
export const perpendicularBisector = (p, q) => perpendicularThrough(line(p, q), midpoint(p, q));
export function foot(p, l) {
  const pt = P(p);
  const k = N.div(l.at(pt), N.add(N.sq(l.a), N.sq(l.b)));
  return new Point(N.sub(pt.x, N.mul(k, l.a)), N.sub(pt.y, N.mul(k, l.b)));
}
/** the bisector of angle AVB (the internal one; { external: true } for the other) */
export function angleBisector(a, v, b, { external = false } = {}) {
  const V = P(v);
  const u = P(a).minus(V);
  const w = P(b).minus(V);
  const lu = N.sqrt(dot(u, u));
  const lw = N.sqrt(dot(w, w));
  // u/|u| ± w/|w|, cleared of denominators
  const d = external ? u.times(lw).minus(w.times(lu)) : u.times(lw).plus(w.times(lu));
  if (N.isZero(d.x) && N.isZero(d.y)) return perpendicularThrough(line(V, V.plus(u)), V);
  return line(V, V.plus(d));
}
export function circumcircle(a, b, c) {
  const [A, B, C] = [P(a), P(b), P(c)];
  if (orientation(A, B, C) === 0) refuse("degenerate", "three points on a line have no circle through them");
  const O = meet(perpendicularBisector(A, B), perpendicularBisector(A, C));
  return new Circle(O, distance2(O, A));
}

const byXY = (p, q) => N.cmp(p.x, q.x) || N.cmp(p.y, q.y);
/**
 * Where two figures meet: a Point or null for two lines; a list of 0, 1 or
 * 2 Points (ordered by x, then y) for a line and a circle or two circles.
 */
export function meet(f, g) {
  if (f instanceof Line && g instanceof Line) {
    const det = N.sub(N.mul(f.a, g.b), N.mul(f.b, g.a));
    if (N.isZero(det)) return null;
    return new Point(N.div(N.sub(N.mul(f.b, g.c), N.mul(g.b, f.c)), det), N.div(N.sub(N.mul(g.a, f.c), N.mul(f.a, g.c)), det));
  }
  if (f instanceof Circle && g instanceof Line) return meet(g, f);
  if (f instanceof Line && g instanceof Circle) {
    const F = foot(g.center, f);
    const h2 = N.sub(g.radius2, distance2(F, g.center));
    const s = N.sign(h2);
    if (s < 0) return [];
    if (s === 0) return [F];
    const d = f.direction;
    const k = N.sqrt(N.div(h2, dot(d, d)));
    return [F.plus(d.times(k)), F.minus(d.times(k))].sort(byXY);
  }
  if (f instanceof Circle && g instanceof Circle) {
    if (f.center.equals(g.center)) return N.eq(f.radius2, g.radius2) ? refuse("degenerate", "the two circles are the same") : [];
    // subtracting the two equations leaves a line: the radical axis
    const c = N.sub(N.sub(N.sub(dot(f.center, f.center), f.radius2), dot(g.center, g.center)), N.neg(g.radius2));
    const axis = new Line(N.mul(TWO, N.sub(g.center.x, f.center.x)), N.mul(TWO, N.sub(g.center.y, f.center.y)), c);
    return meet(axis, f);
  }
  refuse("bad-figure", "meet takes lines and circles");
}
export function reflect(p, l) {
  const F = foot(p, l);
  return F.times(2).minus(P(p));
}
/** tangent lines to a circle from a point: two from outside, one on the circle, none inside */
export function tangents(c, p) {
  const pt = P(p);
  const s = N.sign(c.power(pt));
  if (s < 0) return [];
  if (s === 0) return [perpendicularThrough(line(c.center, pt), pt)];
  // the points of tangency lie on the circle with diameter from p to the centre
  const m = midpoint(pt, c.center);
  return meet(c, new Circle(m, distance2(m, pt))).map((t) => line(pt, t));
}
/** The regular n-gon with the given centre and first vertex, exactly. */
export function regularPolygon(n, { center = [0, 0], vertex = [1, 0] } = {}) {
  if (!Number.isInteger(n) || n < 3) refuse("bad-polygon", "a polygon has at least three sides");
  const C = P(center);
  const v = P(vertex).minus(C);
  const out = [];
  for (let k = 0; k < n; k++) {
    const c = N.cosPi(Q(2 * k, n));
    const s = N.sinPi(Q(2 * k, n));
    out.push(new Point(N.add(C.x, N.sub(N.mul(c, v.x), N.mul(s, v.y))), N.add(C.y, N.add(N.mul(s, v.x), N.mul(c, v.y)))));
  }
  return out;
}

/**
 * A ruler-and-compass construction written down step by step. Each step
 * names what it makes; every point has exact coordinates.
 *   const c = construction({ A: [0, 0], B: [1, 0] });
 *   c.circle("a", "A", "B").circle("b", "B", "A").meet(["C", "D"], "a", "b").line("m", "C", "D");
 *   c.get("C")   // (1/2, -√3/2)
 */
export class Construction {
  constructor(given = {}) {
    this.objects = new Map();
    this.steps = [];
    for (const [name, xy] of Object.entries(given)) {
      this.objects.set(name, P(xy));
      this.steps.push({ step: this.steps.length + 1, tool: "given", makes: [name], text: `${name} = ${P(xy)}` });
    }
  }
  get(name) {
    if (typeof name !== "string") return name;
    return this.objects.get(name) ?? refuse("unknown", `nothing is called ${name} yet`);
  }
  _add(tool, names, values, text) {
    names.forEach((n, i) => {
      if (this.objects.has(n)) refuse("duplicate", `${n} is already used`);
      this.objects.set(n, values[i]);
    });
    this.steps.push({ step: this.steps.length + 1, tool, makes: names, text });
    return this;
  }
  /** ruler: the line through two points */
  line(name, p, q) {
    return this._add("ruler", [name], [line(this.get(p), this.get(q))], `line ${name} through ${p} and ${q}`);
  }
  /** compass: the circle with a centre through a point, or with the radius |pq| carried to the centre */
  circle(name, center, through, to) {
    const c = to === undefined ? circle(this.get(center), this.get(through)) : new Circle(this.get(center), distance2(this.get(through), this.get(to)));
    return this._add("compass", [name], [c], to === undefined ? `circle ${name}, centre ${center}, through ${through}` : `circle ${name}, centre ${center}, radius ${through}${to}`);
  }
  /** mark where two figures meet; names is one name for two lines, or up to two for the others */
  meet(names, f, g) {
    const list = [].concat(names);
    const hit = meet(this.get(f), this.get(g));
    const pts = hit === null ? [] : [].concat(hit);
    if (pts.length < list.length) refuse("no-meeting", `${f} and ${g} meet in ${pts.length} point(s), not ${list.length}`);
    return this._add("mark", list, pts.slice(0, list.length), `${list.join(", ")}: where ${f} meets ${g}`);
  }
  /** how many times each tool was used */
  get count() {
    const n = { ruler: 0, compass: 0, mark: 0 };
    for (const s of this.steps) if (s.tool in n) n[s.tool]++;
    return n;
  }
  toString() {
    return this.steps.map((s) => `${s.step}. ${s.text}`).join("\n");
  }
}
export const construction = (given) => new Construction(given);

// ---- triangles -----------------------------------------------------------------

export class Triangle {
  constructor(a, b, c) {
    this.A = P(a);
    this.B = P(b);
    this.C = P(c);
    if (orientation(this.A, this.B, this.C) === 0) refuse("degenerate", "the three vertices are on one line");
  }
  get vertices() {
    return [this.A, this.B, this.C];
  }
  /** side lengths a = |BC|, b = |CA|, c = |AB| */
  get sides() {
    return { a: distance(this.B, this.C), b: distance(this.C, this.A), c: distance(this.A, this.B) };
  }
  get sides2() {
    return { a: distance2(this.B, this.C), b: distance2(this.C, this.A), c: distance2(this.A, this.B) };
  }
  get area() {
    return N.abs(half(cross(this.B.minus(this.A), this.C.minus(this.A))));
  }
  get perimeter() {
    const s = this.sides;
    return N.sum(s.a, s.b, s.c);
  }
  /** cosines of the angles at A, B and C, exactly */
  get cosines() {
    const at = (v, p, q) => N.div(dot(p.minus(v), q.minus(v)), N.mul(distance(v, p), distance(v, q)));
    return { A: at(this.A, this.B, this.C), B: at(this.B, this.C, this.A), C: at(this.C, this.A, this.B) };
  }
  /** the angles in degrees, as numbers (for reading; the exact data are the cosines) */
  get degrees() {
    const c = this.cosines;
    const deg = (x) => (Math.acos(Math.max(-1, Math.min(1, N.toNumber(x)))) * 180) / Math.PI;
    return { A: deg(c.A), B: deg(c.B), C: deg(c.C) };
  }
  classify() {
    const { a, b, c } = this.sides2;
    const sorted = [a, b, c].sort(N.cmp);
    const s = N.sign(N.sub(N.add(sorted[0], sorted[1]), sorted[2]));
    const equal = [N.eq(a, b), N.eq(b, c), N.eq(a, c)].filter(Boolean).length;
    return { angles: s > 0 ? "acute" : s === 0 ? "right" : "obtuse", sides: equal === 3 ? "equilateral" : equal === 1 ? "isosceles" : "scalene" };
  }
  /** the point with barycentric weights (u : v : w) at A, B, C */
  barycentric(u, v, w) {
    const t = N.sum(u, v, w);
    return new Point(
      N.div(N.sum(N.mul(u, this.A.x), N.mul(v, this.B.x), N.mul(w, this.C.x)), t),
      N.div(N.sum(N.mul(u, this.A.y), N.mul(v, this.B.y), N.mul(w, this.C.y)), t),
    );
  }
  get centroid() {
    return this.barycentric(ONE, ONE, ONE);
  }
  get circumcenter() {
    return this.circumcircle.center;
  }
  get orthocenter() {
    return meet(this.altitudes.A, this.altitudes.B);
  }
  get incenter() {
    const { a, b, c } = this.sides;
    return this.barycentric(a, b, c);
  }
  get excenters() {
    const { a, b, c } = this.sides;
    return { A: this.barycentric(N.neg(a), b, c), B: this.barycentric(a, N.neg(b), c), C: this.barycentric(a, b, N.neg(c)) };
  }
  get ninePointCenter() {
    return midpoint(this.circumcenter, this.orthocenter);
  }
  /** the symmedian (Lemoine) point, weights a² : b² : c² */
  get symmedian() {
    const { a, b, c } = this.sides2;
    return this.barycentric(a, b, c);
  }
  get circumcircle() {
    return circumcircle(this.A, this.B, this.C);
  }
  get inradius() {
    return N.div(N.mul(TWO, this.area), this.perimeter);
  }
  get circumradius() {
    return this.circumcircle.radius;
  }
  get incircle() {
    return new Circle(this.incenter, N.sq(this.inradius));
  }
  get excircles() {
    const e = this.excenters;
    const r = (p, l) => distance2(p, foot(p, l));
    return { A: new Circle(e.A, r(e.A, line(this.B, this.C))), B: new Circle(e.B, r(e.B, line(this.C, this.A))), C: new Circle(e.C, r(e.C, line(this.A, this.B))) };
  }
  get ninePointCircle() {
    return circumcircle(midpoint(this.A, this.B), midpoint(this.B, this.C), midpoint(this.C, this.A));
  }
  get medians() {
    return { A: line(this.A, midpoint(this.B, this.C)), B: line(this.B, midpoint(this.C, this.A)), C: line(this.C, midpoint(this.A, this.B)) };
  }
  get altitudes() {
    return { A: perpendicularThrough(line(this.B, this.C), this.A), B: perpendicularThrough(line(this.C, this.A), this.B), C: perpendicularThrough(line(this.A, this.B), this.C) };
  }
  get feet() {
    return { A: foot(this.A, line(this.B, this.C)), B: foot(this.B, line(this.C, this.A)), C: foot(this.C, line(this.A, this.B)) };
  }
  get bisectors() {
    return { A: angleBisector(this.B, this.A, this.C), B: angleBisector(this.C, this.B, this.A), C: angleBisector(this.A, this.C, this.B) };
  }
  /** the line through the circumcentre, centroid and orthocentre (null for an equilateral triangle) */
  get eulerLine() {
    const O = this.circumcenter;
    const H = this.orthocenter;
    return O.equals(H) ? null : line(O, H);
  }
  toString() {
    return `triangle ${this.A} ${this.B} ${this.C}`;
  }
}
export const triangle = (a, b, c) => new Triangle(a, b, c);

// ---- transformations -----------------------------------------------------------

/** The affine map p ↦ M·p + t with M = [[a, b], [c, d]]. */
export class Transform {
  constructor(matrix, vector = [0, 0]) {
    this.m = matrix.map((row) => row.map(num));
    this.t = P(vector);
  }
  get determinant() {
    return N.sub(N.mul(this.m[0][0], this.m[1][1]), N.mul(this.m[0][1], this.m[1][0]));
  }
  apply(f) {
    if (Array.isArray(f) && f.length && (f[0] instanceof Point || Array.isArray(f[0]))) return f.map((p) => this.apply(P(p)));
    if (f instanceof Triangle) return new Triangle(...f.vertices.map((p) => this.apply(p)));
    if (f instanceof Line) {
      const o = f.origin;
      return line(this.apply(o), this.apply(o.plus(f.direction)));
    }
    if (f instanceof Circle) {
      if (!this.isSimilarity()) refuse("not-a-circle", "only a similarity sends circles to circles");
      return new Circle(this.apply(f.center), N.mul(f.radius2, N.abs(this.determinant)));
    }
    const p = P(f);
    const [[a, b], [c, d]] = this.m;
    return new Point(N.sum(N.mul(a, p.x), N.mul(b, p.y), this.t.x), N.sum(N.mul(c, p.x), N.mul(d, p.y), this.t.y));
  }
  /** this after other: (this ∘ other)(p) = this(other(p)) */
  compose(other) {
    const [[a, b], [c, d]] = this.m;
    const [[e, f], [g, h]] = other.m;
    const m = [[N.add(N.mul(a, e), N.mul(b, g)), N.add(N.mul(a, f), N.mul(b, h))], [N.add(N.mul(c, e), N.mul(d, g)), N.add(N.mul(c, f), N.mul(d, h))]];
    return new Transform(m, this.apply(other.t));
  }
  inverse() {
    const det = this.determinant;
    if (N.isZero(det)) refuse("singular", "this map flattens the plane and has no inverse");
    const [[a, b], [c, d]] = this.m;
    const m = [[N.div(d, det), N.neg(N.div(b, det))], [N.neg(N.div(c, det)), N.div(a, det)]];
    const inv = new Transform(m);
    return new Transform(m, inv.apply(this.t).times(-1));
  }
  equals(o) {
    return this.m.every((row, i) => row.every((v, j) => N.eq(v, o.m[i][j]))) && this.t.equals(o.t);
  }
  /** MᵀM = k·I: angles are kept */
  isSimilarity() {
    const [[a, b], [c, d]] = this.m;
    return N.isZero(N.add(N.mul(a, b), N.mul(c, d))) && N.eq(N.add(N.sq(a), N.sq(c)), N.add(N.sq(b), N.sq(d))) && !N.isZero(this.determinant);
  }
  isIsometry() {
    const [[a, , ], [c]] = this.m;
    return this.isSimilarity() && N.eq(N.add(N.sq(a), N.sq(c)), ONE);
  }
  /** the points left where they are: null (none), a Point, a Line, or "plane" */
  fixed() {
    const [[a, b], [c, d]] = this.m;
    // (M − I)p = −t
    const [e, f, g, h] = [N.sub(a, ONE), b, c, N.sub(d, ONE)];
    const det = N.sub(N.mul(e, h), N.mul(f, g));
    const r = this.t.times(-1);
    if (!N.isZero(det)) return new Point(N.div(N.sub(N.mul(r.x, h), N.mul(f, r.y)), det), N.div(N.sub(N.mul(e, r.y), N.mul(g, r.x)), det));
    const zero = [e, f, g, h].every(N.isZero);
    if (zero) return N.isZero(r.x) && N.isZero(r.y) ? "plane" : null;
    const row = N.isZero(e) && N.isZero(f) ? [g, h, r.y] : [e, f, r.x];
    const other = N.isZero(e) && N.isZero(f) ? [e, f, r.x] : [g, h, r.y];
    // consistent only when the second equation is the same multiple of the first
    const consistent = N.isZero(N.sub(N.mul(row[0], other[2]), N.mul(other[0], row[2]))) && N.isZero(N.sub(N.mul(row[1], other[2]), N.mul(other[1], row[2])));
    return consistent ? new Line(row[0], row[1], N.neg(row[2])) : null;
  }
  /**
   * What kind of map this is. Isometries are one of: identity, translation,
   * rotation (with centre and the angle's cosine and sine), reflection
   * (with its axis) or glide reflection (axis and the vector of the glide).
   */
  classify() {
    const det = this.determinant;
    if (N.isZero(det)) return { kind: "singular" };
    const [[a, , ], [c]] = this.m;
    if (!this.isSimilarity()) return { kind: "affine", determinant: det, preservesOrientation: N.sign(det) > 0, areaFactor: N.abs(det) };
    const k = N.sqrt(N.add(N.sq(a), N.sq(c)));
    const direct = N.sign(det) > 0;
    if (!N.eq(k, ONE)) {
      const fixed = this.fixed();
      return { kind: direct ? (N.isZero(c) ? "dilation" : "spiral similarity") : "dilative reflection", ratio: k, center: fixed, cos: N.div(a, k), sin: N.div(c, k) };
    }
    if (direct) {
      if (N.eq(a, ONE)) return N.isZero(this.t.x) && N.isZero(this.t.y) ? { kind: "identity" } : { kind: "translation", vector: this.t };
      return { kind: "rotation", center: this.fixed(), cos: a, sin: c, degrees: (Math.atan2(N.toNumber(c), N.toNumber(a)) * 180) / Math.PI };
    }
    const axis = this.fixed();
    if (axis instanceof Line) return { kind: "reflection", axis };
    // a glide: the part of t along the axis direction; the axis passes through t/2 with that direction
    const dir = N.eq(a, Q(-1)) ? new Point(0, 1) : new Point(N.add(a, ONE), c);
    const along = dir.times(N.div(dot(this.t, dir), dot(dir, dir)));
    const through = this.t.minus(along).times(Q(1, 2));
    return { kind: "glide reflection", axis: line(through, through.plus(dir)), vector: along };
  }
  toString() {
    const [[a, b], [c, d]] = this.m;
    return `[[${N.text(a)}, ${N.text(b)}], [${N.text(c)}, ${N.text(d)}]] then + ${this.t}`;
  }
}
export const identity = () => new Transform([[1, 0], [0, 1]]);
export const translation = (v) => new Transform([[1, 0], [0, 1]], P(v));
/**
 * Rotation about a centre. The angle is a fraction of a full turn
 * (rotation(c, "1/6") is 60°), which keeps the matrix exact, or
 * { cos, sin } given exactly.
 */
export function rotation(center, turn) {
  const C = P(center);
  let c;
  let s;
  if (turn && typeof turn === "object" && "cos" in turn) {
    c = num(turn.cos);
    s = num(turn.sin);
    if (!N.eq(N.add(N.sq(c), N.sq(s)), ONE)) refuse("bad-angle", "cos² + sin² must be 1");
  } else {
    const q = num(turn);
    if (!(q instanceof Rational)) refuse("bad-angle", "give the angle as a fraction of a full turn, or as { cos, sin }");
    c = N.cosPi(q.multiply(TWO));
    s = N.sinPi(q.multiply(TWO));
  }
  const r = new Transform([[c, N.neg(s)], [s, c]]);
  return new Transform(r.m, C.minus(r.apply(C)));
}
export function reflection(l) {
  const n2 = N.add(N.sq(l.a), N.sq(l.b));
  const [a, b, c] = [l.a, l.b, l.c];
  const m = [[N.div(N.sub(N.sq(b), N.sq(a)), n2), N.neg(N.div(N.mul(TWO, N.mul(a, b)), n2))], [N.neg(N.div(N.mul(TWO, N.mul(a, b)), n2)), N.div(N.sub(N.sq(a), N.sq(b)), n2)]];
  return new Transform(m, [N.neg(N.div(N.mul(TWO, N.mul(a, c)), n2)), N.neg(N.div(N.mul(TWO, N.mul(b, c)), n2))]);
}
/** reflection in a line followed by a translation along it by the given vector's component along the line */
export function glide(l, vector) {
  const d = l.direction;
  const v = P(vector);
  const along = d.times(N.div(dot(v, d), dot(d, d)));
  return translation(along).compose(reflection(l));
}
export function dilation(center, ratio) {
  const C = P(center);
  const k = num(ratio);
  return new Transform([[k, 0], [0, k]], C.times(N.sub(ONE, k)));
}
export const affine = (matrix, vector) => new Transform(matrix, vector);

/**
 * Inversion in a circle: p ↦ the point on the ray from the centre through
 * p with |Op|·|Op′| = r². Lines and circles go to lines and circles.
 */
export function inversion(c) {
  const O = c.center;
  const pt = (p) => {
    const d = P(p).minus(O);
    const d2 = dot(d, d);
    if (N.isZero(d2)) refuse("centre", "the centre of inversion has no image");
    return O.plus(d.times(N.div(c.radius2, d2)));
  };
  const three = (f) => {
    // three points of the figure that are not the centre
    if (f instanceof Line) {
      const o = f.origin;
      return [0, 1, 2, 3].map((k) => o.plus(f.direction.times(k))).filter((p) => !p.equals(O)).slice(0, 3);
    }
    const r = f.radius;
    const cand = [[r, ZERO], [N.neg(r), ZERO], [ZERO, r], [ZERO, N.neg(r)]].map(([x, y]) => f.center.plus(new Point(x, y)));
    return cand.filter((p) => !p.equals(O)).slice(0, 3);
  };
  return {
    circle: c,
    apply(f) {
      if (f instanceof Line && f.contains(O)) return f;
      if (f instanceof Line || f instanceof Circle) {
        const [a, b, d] = three(f).map(pt);
        return orientation(a, b, d) === 0 ? line(a, b) : circumcircle(a, b, d);
      }
      return pt(f);
    },
  };
}
