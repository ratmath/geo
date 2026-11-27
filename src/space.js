// Three-dimensional space with exact coordinates: vectors (dot and cross
// products, lengths, angles, projections), lines and planes (through points,
// equations, distances, intersections). Coordinates may be rationals or
// algebraic numbers; lengths are exact square roots.
import { Rational } from "@ratmath/core";
import { num, N, refuse, ZERO, ONE, TWO } from "./num.js";
import { Angle } from "./angle.js";

export class Vector {
  constructor(x, y, z) {
    this.x = num(x);
    this.y = num(y);
    this.z = num(z);
    Object.freeze(this);
  }
  toArray() {
    return [this.x, this.y, this.z];
  }
  add(o) {
    o = vector(o);
    return new Vector(N.add(this.x, o.x), N.add(this.y, o.y), N.add(this.z, o.z));
  }
  sub(o) {
    o = vector(o);
    return new Vector(N.sub(this.x, o.x), N.sub(this.y, o.y), N.sub(this.z, o.z));
  }
  scale(k) {
    const s = num(k);
    return new Vector(N.mul(this.x, s), N.mul(this.y, s), N.mul(this.z, s));
  }
  neg() {
    return this.scale(-1);
  }
  /** u·v */
  dot(o) {
    o = vector(o);
    return N.sum(N.mul(this.x, o.x), N.mul(this.y, o.y), N.mul(this.z, o.z));
  }
  /** u × v */
  cross(o) {
    o = vector(o);
    return new Vector(N.sub(N.mul(this.y, o.z), N.mul(this.z, o.y)), N.sub(N.mul(this.z, o.x), N.mul(this.x, o.z)), N.sub(N.mul(this.x, o.y), N.mul(this.y, o.x)));
  }
  /** |v|², exact */
  get norm2() {
    return this.dot(this);
  }
  /** |v|, an exact square root */
  get norm() {
    return N.sqrt(this.norm2);
  }
  get isZero() {
    return N.isZero(this.x) && N.isZero(this.y) && N.isZero(this.z);
  }
  /** v/|v| */
  unit() {
    if (this.isZero) refuse("degenerate", "the zero vector has no direction");
    return this.scale(N.div(ONE, this.norm));
  }
  /** the angle between two vectors, from cos θ = u·v/(|u||v|) */
  angle(o) {
    o = vector(o);
    if (this.isZero || o.isZero) refuse("degenerate", "the zero vector makes no angle");
    return Angle.ofCos(N.div(this.dot(o), N.sqrt(N.mul(this.norm2, o.norm2))));
  }
  /** the vector projection onto o: (u·o/o·o)·o */
  projectOnto(o) {
    o = vector(o);
    if (o.isZero) refuse("degenerate", "cannot project onto the zero vector");
    return o.scale(N.div(this.dot(o), o.norm2));
  }
  /** the scalar projection (component) along o: u·o/|o| */
  componentAlong(o) {
    o = vector(o);
    if (o.isZero) refuse("degenerate", "cannot project onto the zero vector");
    return N.div(this.dot(o), o.norm);
  }
  isParallel(o) {
    return this.cross(o).isZero;
  }
  isOrthogonal(o) {
    return N.isZero(this.dot(o));
  }
  equals(o) {
    o = vector(o);
    return N.eq(this.x, o.x) && N.eq(this.y, o.y) && N.eq(this.z, o.z);
  }
  toString() {
    return `(${N.text(this.x)}, ${N.text(this.y)}, ${N.text(this.z)})`;
  }
}
/** A vector or point in space: vector(1, 2, -2), vector([1, 2, -2]), vector("1/2", "sqrt(2)", 0). */
export function vector(x, y, z) {
  if (x instanceof Vector) return x;
  if (Array.isArray(x)) {
    if (x.length !== 3) refuse("bad-argument", "a vector in space has three coordinates");
    return new Vector(x[0], x[1], x[2]);
  }
  if (x && typeof x === "object" && "x" in x && "y" in x && "z" in x) return new Vector(x.x, x.y, x.z);
  return new Vector(x, y, z);
}
/** The scalar triple product u·(v × w): the signed volume of the parallelepiped. */
export const tripleProduct = (u, v, w) => vector(u).dot(vector(v).cross(w));

/** The line p + t·d in space. */
export class Line3 {
  constructor(point, direction) {
    this.point = vector(point);
    this.direction = vector(direction);
    if (this.direction.isZero) refuse("degenerate", "a line needs a nonzero direction");
    Object.freeze(this);
  }
  at(t) {
    return this.point.add(this.direction.scale(t));
  }
  contains(p) {
    return vector(p).sub(this.point).isParallel(this.direction);
  }
  /** the distance from a point, |(p − a) × d|/|d| */
  distance(p) {
    return N.sqrt(N.div(vector(p).sub(this.point).cross(this.direction).norm2, this.direction.norm2));
  }
  toString() {
    return `${this.point} + t·${this.direction}`;
  }
}
/** The line through two points. */
export function line3(p, q) {
  const a = vector(p);
  return new Line3(a, vector(q).sub(a));
}

/** The plane n·x = d. */
export class Plane {
  constructor(normal, d) {
    this.normal = vector(normal);
    this.d = num(d);
    if (this.normal.isZero) refuse("degenerate", "a plane needs a nonzero normal");
    Object.freeze(this);
  }
  /** [a, b, c, d] of a·x + b·y + c·z = d, scaled to whole numbers with no common factor when rational, the first nonzero a, b or c positive */
  get coefficients() {
    let k = [...this.normal.toArray(), this.d];
    if (k.every((v) => v instanceof Rational)) {
      const g = (x, y) => (y ? g(y, x % y) : x < 0n ? -x : x);
      const L = k.reduce((l, v) => (l * v.denominator) / g(l, v.denominator), 1n);
      const ints = k.map((v) => v.numerator * (L / v.denominator));
      const div = ints.reduce((x, y) => g(x, y), 0n) || 1n;
      k = ints.map((v) => new Rational(v / div));
    }
    if (N.sign(k.slice(0, 3).find((v) => !N.isZero(v))) < 0) k = k.map(N.neg);
    return k;
  }
  /** "5x + 3y + 4z = 13" */
  get equation() {
    const [a, b, c, d] = this.coefficients;
    const parts = [];
    for (const [k, v] of [[a, "x"], [b, "y"], [c, "z"]]) {
      if (N.isZero(k)) continue;
      const neg = N.sign(k) < 0;
      const m = N.abs(k);
      const t = N.text(m);
      const body = N.eq(m, ONE) ? v : `${/[ +\-/]/.test(t) ? `(${t})` : t}${v}`;
      parts.push(parts.length ? `${neg ? " - " : " + "}${body}` : `${neg ? "-" : ""}${body}`);
    }
    return `${parts.join("")} = ${N.text(d)}`;
  }
  /** n·p − d: zero on the plane; its sign tells the side */
  at(p) {
    return N.sub(this.normal.dot(p), this.d);
  }
  contains(p) {
    return N.isZero(this.at(p));
  }
  /** the distance from a point, |n·p − d|/|n| */
  distance(p) {
    return N.div(N.abs(this.at(p)), this.normal.norm);
  }
  /** the nearest point of the plane to p */
  foot(p) {
    return vector(p).sub(this.normal.scale(N.div(this.at(p), this.normal.norm2)));
  }
  isParallel(o) {
    return this.normal.isParallel(o instanceof Plane ? o.normal : vector(o));
  }
  /** the angle between two planes (between their normals, at most a right angle) */
  angle(o) {
    const c = N.div(N.abs(this.normal.dot(o.normal)), N.sqrt(N.mul(this.normal.norm2, o.normal.norm2)));
    return Angle.ofCos(c);
  }
  /**
   * Where a line meets the plane (a point), or a plane meets it (a Line3).
   * null when parallel and apart; the line itself, or this plane, when contained or equal.
   */
  meet(o) {
    if (o instanceof Line3) {
      const nd = this.normal.dot(o.direction);
      if (N.isZero(nd)) return this.contains(o.point) ? o : null;
      return o.at(N.div(N.neg(this.at(o.point)), nd));
    }
    if (o instanceof Plane) {
      const dir = this.normal.cross(o.normal);
      if (dir.isZero) return this.contains(o.foot(vector(0, 0, 0))) ? this : null;
      // the point of the line nearest the origin: a combination of the two normals
      const n1 = this.normal, n2 = o.normal;
      const a = n1.norm2, b = n1.dot(n2), c = n2.norm2;
      const det = N.sub(N.mul(a, c), N.sq(b));
      const s = N.div(N.sub(N.mul(this.d, c), N.mul(o.d, b)), det);
      const t = N.div(N.sub(N.mul(o.d, a), N.mul(this.d, b)), det);
      return new Line3(n1.scale(s).add(n2.scale(t)), dir);
    }
    refuse("bad-argument", "a plane meets a Line3 or another Plane");
  }
  equals(o) {
    return this.isParallel(o) && this.contains(o.foot(vector(0, 0, 0)));
  }
  toString() {
    return this.equation;
  }
}
/**
 * A plane: through three points plane(p, q, r), or through a point with a
 * normal plane(p, { normal }), or from a·x + b·y + c·z = d as plane([a, b, c], d)
 * given { coefficients: [a, b, c, d] }.
 */
export function plane(p, q, r) {
  if (p && typeof p === "object" && !Array.isArray(p) && !(p instanceof Vector) && "coefficients" in p) {
    const [a, b, c, d] = p.coefficients;
    return new Plane([a, b, c], d);
  }
  const A = vector(p);
  if (q && typeof q === "object" && !Array.isArray(q) && !(q instanceof Vector) && "normal" in q) {
    const n = vector(q.normal);
    return new Plane(n, n.dot(A));
  }
  const n = vector(q).sub(A).cross(vector(r).sub(A));
  if (n.isZero) refuse("degenerate", "the three points are on one line, so they do not fix a plane");
  return new Plane(n, n.dot(A));
}
