// General proofs of theorems of plane geometry, by algebra.
//
//   const T = configuration("Thales");
//   const A = T.at("A", -1, 0), B = T.at("B", 1, 0);
//   const C = T.on("C", (C) => T.onCircle(C, T.at("O", 0, 0), A));
//   const proof = T.prove(T.perpendicular(A, C, B, C));
//   proof.proved;        // true
//   proof.replay();      // multiplies the certificate out again
//
// A configuration gives every point coordinates. Some coordinates are
// numbers (a choice of axes), some are free parameters (the figure can be
// any figure of its kind), and the rest are unknowns tied to the earlier
// ones by polynomial equations: the hypotheses h₁ = 0, …, hᵣ = 0. The
// conclusion is one more polynomial g. The theorem holds in general when
//
//     d · gᵏ = c₁h₁ + … + cᵣhᵣ
//
// for polynomials cᵢ and a multiplier d that is not zero for a general
// figure. That identity is the proof: wherever the hypotheses hold and d
// is not zero, g must be zero. It can be checked by multiplying out,
// without trusting how it was found, and the factors of d are the
// degenerate cases (a triangle that is flat, two points that coincide).
//
// Two methods find the identity. Wu's method divides g by the hypotheses
// in turn, treating each as a polynomial in the coordinate it introduced;
// d is then a product of leading coefficients. The Gröbner method
// (Kapur's) adds 1 − t·g to the hypotheses and eliminates: the theorem
// holds in general exactly when a polynomial in the parameters alone
// appears, and that polynomial is d.

import { Rational } from "@ratmath/core";
import { ring, groebner, ideal, factor as factorPoly, gcd as polyGcd, lcm as polyLcm, fractions, integerPrimitive } from "@ratmath/structures";
import { refuse } from "./num.js";

// ---- expressions: polynomials in coordinates not yet gathered into a ring -----------------

/** A polynomial expression in the coordinates of a configuration. */
export class GeoExpr {
  constructor(build, text) {
    this._build = build;
    this._cache = new WeakMap();
    this.text = text;
  }
  /** the polynomial, in a ring that has all the variables */
  in(R) {
    let p = this._cache.get(R);
    if (!p) {
      p = this._build(R);
      this._cache.set(R, p);
    }
    return p;
  }
  add(o) {
    const b = expr(o);
    return new GeoExpr((R) => this.in(R).add(b.in(R)));
  }
  sub(o) {
    const b = expr(o);
    return new GeoExpr((R) => this.in(R).sub(b.in(R)));
  }
  mul(o) {
    const b = expr(o);
    return new GeoExpr((R) => this.in(R).mul(b.in(R)));
  }
  neg() {
    return new GeoExpr((R) => this.in(R).neg());
  }
  pow(n) {
    if (!Number.isInteger(n) || n < 0) refuse("bad-argument", "powers are whole numbers");
    return new GeoExpr((R) => this.in(R).pow(n));
  }
}

const isNumberLike = (x) => typeof x === "number" || typeof x === "bigint" || x instanceof Rational || (typeof x === "string" && /^\s*-?\d+(\s*\/\s*\d+|\.\d+)?\s*$/.test(x));
const constant = (c) => new GeoExpr((R) => R.from(typeof c === "string" ? c.replace(/\s/g, "") : c));
const variable = (name) => new GeoExpr((R) => R.gen(name));
const expr = (x) => {
  if (x instanceof GeoExpr) return x;
  if (isNumberLike(x)) return constant(x);
  refuse("bad-argument", `expected a coordinate expression or a number, got ${String(x)}`);
};

/** A point of a configuration: a name and two coordinate expressions. */
export class GeoPoint {
  constructor(name, x, y, kind) {
    this.name = name;
    this.x = x;
    this.y = y;
    /** "fixed", "free", "on" (one free coordinate) or "dependent" */
    this.kind = kind;
  }
  toString() {
    return this.name;
  }
}

const NAME = /^[A-Za-z][A-Za-z0-9_]*$/;
const cross = (ax, ay, bx, by) => ax.mul(by).sub(ay.mul(bx));
const dot = (ax, ay, bx, by) => ax.mul(bx).add(ay.mul(by));
const labelled = (e, label) => {
  e.label = label;
  return e;
};
const asLine = (l) => (Array.isArray(l) && l.length === 2 ? l : refuse("bad-argument", "a line is given by two of its points: [A, B]"));

// ---- pseudo-division with a record of what was done -----------------------------------------

/**
 * Pseudo-remainder of a by b as polynomials in v: m·a = q·b + r with
 * deg_v r < deg_v b and m a power of the leading coefficient of b.
 */
function pseudoDivide(a, b, v) {
  const R = a.ring;
  const db = b.degree(v);
  const lb = b.coefficients(v)[db];
  const x = R.gen(v);
  let r = a;
  let q = R.zero;
  let m = R.one;
  const used = [];
  while (!r.isZero() && r.degree(v) >= db) {
    const dr = r.degree(v);
    const lr = r.coefficients(v)[dr];
    // multiply by no more of the leading coefficient than is needed
    let [f, c] = [lb, lr];
    if (!lb.isConstant()) {
      try {
        const g = polyGcd(lb, lr);
        if (!g.isConstant()) [f, c] = [lb.div(g), lr.div(g)];
      } catch {
        // keep the plain step
      }
    }
    const shift = c.mul(x.pow(dr - db));
    r = f.mul(r).sub(shift.mul(b));
    q = f.mul(q).add(shift);
    m = f.mul(m);
    if (!f.isConstant()) used.push(f);
  }
  return { r, q, m, used };
}

// ---- the configuration -----------------------------------------------------------------------

/**
 * A figure described in coordinates: points fixed, free, or tied to
 * earlier ones by conditions. Predicates such as collinear(A, B, C) give
 * the polynomial that vanishes when the property holds; they serve as
 * conditions when a point is introduced and as conclusions to prove.
 */
export class Configuration {
  constructor(name = "") {
    this.name = name;
    this.points = new Map();
    /** free coordinates, in order of introduction */
    this.parameters = [];
    /** unknown coordinates, in order of introduction */
    this.unknowns = [];
    /** the hypotheses: { label, expr, step } */
    this.hypotheses = [];
    /** how the unknowns were introduced: { vars, hyps (indices), what } */
    this.steps = [];
    this._names = new Set();
  }

  _name(name) {
    if (typeof name !== "string" || !NAME.test(name)) refuse("bad-name", `a name is a letter followed by letters, digits or _ ; got ${JSON.stringify(name)}`);
    return name;
  }
  _newVariable(name, list) {
    if (this._names.has(name)) refuse("bad-name", `the name ${name} is already used`);
    this._names.add(name);
    list.push(name);
    return variable(name);
  }
  _coordinate(c, fallback) {
    if (c === undefined || c === null) return this._newVariable(fallback, this.parameters);
    if (c instanceof GeoExpr) return c;
    if (isNumberLike(c)) return constant(c);
    if (typeof c === "string" && NAME.test(c)) return this._names.has(c) ? variable(c) : this._newVariable(c, this.parameters);
    refuse("bad-argument", `a coordinate is a number, the name of a parameter, or an expression; got ${String(c)}`);
  }
  _register(p) {
    if (this.points.has(p.name)) refuse("bad-name", `there is already a point ${p.name}`);
    this.points.set(p.name, p);
    return p;
  }
  _step(vars, conditions, what) {
    const list = conditions.flat();
    if (list.length !== vars.length) refuse("bad-condition", `${what} needs ${vars.length} condition${vars.length === 1 ? "" : "s"} (one for each unknown coordinate), got ${list.length}`);
    const hyps = list.map((c, i) => {
      const e = expr(c);
      this.hypotheses.push({ label: c.label ? `${what}: ${c.label}` : `${what}${list.length > 1 ? ` (${i + 1})` : ""}`, expr: e, step: this.steps.length });
      return this.hypotheses.length - 1;
    });
    this.steps.push({ vars, hyps, what });
  }

  // -- parameters and points --

  /** A free number: a parameter of the figure. */
  parameter(name) {
    return this._newVariable(this._name(name), this.parameters);
  }
  /** An unknown number tied down by one condition, for example s with s² = 3: unknown("s", (s) => s.pow(2).sub(3)). */
  unknown(name, condition) {
    const v = this._newVariable(this._name(name), this.unknowns);
    this._step([name], [condition(v)], `${name} is defined`);
    return v;
  }
  /** A free point: both coordinates are parameters (named x<name>, y<name>). */
  free(name) {
    this._name(name);
    return this._register(new GeoPoint(name, this._newVariable(`x${name}`, this.parameters), this._newVariable(`y${name}`, this.parameters), "free"));
  }
  /**
   * A point with given coordinates. Each is a number, an expression, or
   * the name of a parameter (made on first use): at("B", "b", 0).
   */
  at(name, x, y) {
    this._name(name);
    const X = this._coordinate(x, `x${name}`);
    const Y = this._coordinate(y, `y${name}`);
    return this._register(new GeoPoint(name, X, Y, isNumberLike(x) && isNumberLike(y) ? "fixed" : "free"));
  }
  /**
   * A point with one degree of freedom: one coordinate is a parameter and
   * the other is tied down by the condition. on("D", (D) => T.onCircle(D, O, A)).
   * { free: "y" } makes y the free coordinate.
   */
  on(name, condition, { free = "x" } = {}) {
    this._name(name);
    const [fx, fy] = [`x${name}`, `y${name}`];
    const X = this._newVariable(fx, free === "x" ? this.parameters : this.unknowns);
    const Y = this._newVariable(fy, free === "x" ? this.unknowns : this.parameters);
    const p = this._register(new GeoPoint(name, X, Y, "on"));
    this._step([free === "x" ? fy : fx], [condition(p)], `${name}`);
    return p;
  }
  /**
   * A point determined by two conditions: where("O", (O) => [T.equidistant(O, A, B), T.equidistant(O, B, C)]).
   * A condition that is a pair of polynomials (isMidpoint) counts as two.
   */
  where(name, conditions, what = name) {
    this._name(name);
    const [fx, fy] = [`x${name}`, `y${name}`];
    const p = this._register(new GeoPoint(name, this._newVariable(fx, this.unknowns), this._newVariable(fy, this.unknowns), "dependent"));
    const cs = conditions(p);
    this._step([fx, fy], Array.isArray(cs) ? cs : [cs], what);
    return p;
  }

  // -- constructions (each is `where` with the right conditions) --

  midpoint(name, A, B) {
    return this.where(name, (M) => this.isMidpoint(M, A, B), `${name} is the midpoint of ${A}${B}`);
  }
  /** Where the lines [A, B] and [C, D] meet. */
  intersection(name, l1, l2) {
    const [[A, B], [C, D]] = [asLine(l1), asLine(l2)];
    return this.where(name, (P) => [this.collinear(A, B, P), this.collinear(C, D, P)], `${name} is where ${A}${B} meets ${C}${D}`);
  }
  /** The foot of the perpendicular from P to the line [A, B]. */
  foot(name, P, l) {
    const [A, B] = asLine(l);
    return this.where(name, (F) => [this.collinear(A, B, F), this.perpendicular(P, F, A, B)], `${name} is the foot of the perpendicular from ${P} to ${A}${B}`);
  }
  /** The mirror image of P in the line [A, B]. */
  reflection(name, P, l) {
    const [A, B] = asLine(l);
    return this.where(name, (Q) => [this.perpendicular(P, Q, A, B), labelled(cross(B.x.sub(A.x), B.y.sub(A.y), P.x.add(Q.x).sub(A.x.mul(2)), P.y.add(Q.y).sub(A.y.mul(2))), `the midpoint of ${P}${name} is on ${A}${B}`)], `${name} is the reflection of ${P} in ${A}${B}`);
  }
  circumcenter(name, A, B, C) {
    return this.where(name, (O) => [this.equidistant(O, A, B), this.equidistant(O, A, C)], `${name} is the circumcentre of ${A}${B}${C}`);
  }
  orthocenter(name, A, B, C) {
    return this.where(name, (H) => [this.perpendicular(A, H, B, C), this.perpendicular(B, H, A, C)], `${name} is the orthocentre of ${A}${B}${C}`);
  }
  centroid(name, A, B, C) {
    return this.where(name, (G) => [labelled(G.x.mul(3).sub(A.x).sub(B.x).sub(C.x), "x"), labelled(G.y.mul(3).sub(A.y).sub(B.y).sub(C.y), "y")], `${name} is the centroid of ${A}${B}${C}`);
  }
  /** The point D with ABCD a parallelogram: D = A + C − B. */
  parallelogram(name, A, B, C) {
    return this.where(name, (D) => [labelled(D.x.sub(A.x).sub(C.x).add(B.x), "x"), labelled(D.y.sub(A.y).sub(C.y).add(B.y), "y")], `${A}${B}${C}${name} is a parallelogram`);
  }
  /**
   * The second point where the line from A through Q meets the circle with
   * centre O through A. (Asking only for "a point on the line and on the
   * circle" would allow A itself.)
   */
  otherIntersection(name, A, Q, O) {
    return this.where(name, (B) => [this.collinear(A, Q, B), labelled(dot(A.x.add(B.x).sub(O.x.mul(2)), A.y.add(B.y).sub(O.y.mul(2)), Q.x.sub(A.x), Q.y.sub(A.y)), `the midpoint of ${A}${name} is the foot of the perpendicular from ${O}`)], `${name} is where ${A}${Q} meets the circle about ${O} through ${A} again`);
  }
  /** A point on the line [A, B]. */
  onLine(name, A, B, options) {
    return this.on(name, (P) => this.collinear(A, B, P), options);
  }
  /** A point on the circle through A, B and C. */
  onCircumcircle(name, A, B, C, options) {
    return this.on(name, (P) => this.concyclic(A, B, C, P), options);
  }
  /** A centre of a circle touching the three side lines of ABC: the incentre or an excentre (algebra cannot tell them apart). */
  tritangentCenter(name, A, B, C) {
    return this.where(name, (I) => [this.equalAngle(B, A, I, I, A, C), this.equalAngle(A, B, I, I, B, C)], `${name} is on the bisectors at ${A} and ${B} of ${A}${B}${C}`);
  }

  // -- quantities --

  /** The squared distance |AB|². */
  distance2(A, B) {
    return A.x.sub(B.x).pow(2).add(A.y.sub(B.y).pow(2));
  }
  /** Twice the signed area of the triangle ABC. */
  area2(A, B, C) {
    return cross(B.x.sub(A.x), B.y.sub(A.y), C.x.sub(A.x), C.y.sub(A.y));
  }
  /** The dot product of AB and CD. */
  dot(A, B, C, D) {
    return dot(B.x.sub(A.x), B.y.sub(A.y), D.x.sub(C.x), D.y.sub(C.y));
  }
  /** The cross product of AB and CD. */
  cross(A, B, C, D) {
    return cross(B.x.sub(A.x), B.y.sub(A.y), D.x.sub(C.x), D.y.sub(C.y));
  }
  /** A number as an expression. */
  number(c) {
    return constant(c);
  }

  // -- predicates: polynomials that vanish exactly when the property holds --

  collinear(A, B, C) {
    return labelled(this.area2(A, B, C), `${A}, ${B}, ${C} are collinear`);
  }
  /** AB ∥ CD */
  parallel(A, B, C, D) {
    return labelled(this.cross(A, B, C, D), `${A}${B} ∥ ${C}${D}`);
  }
  /** AB ⊥ CD */
  perpendicular(A, B, C, D) {
    return labelled(this.dot(A, B, C, D), `${A}${B} ⊥ ${C}${D}`);
  }
  /** |PA| = |PB| */
  equidistant(P, A, B) {
    return labelled(this.distance2(P, A).sub(this.distance2(P, B)), `|${P}${A}| = |${P}${B}|`);
  }
  /** |AB| = |CD| */
  equalLength(A, B, C, D) {
    return labelled(this.distance2(A, B).sub(this.distance2(C, D)), `|${A}${B}| = |${C}${D}|`);
  }
  /** P is on the circle with centre O through A. */
  onCircle(P, O, A) {
    return labelled(this.distance2(O, P).sub(this.distance2(O, A)), `${P} is on the circle about ${O} through ${A}`);
  }
  /** M is the midpoint of AB: two polynomials. */
  isMidpoint(M, A, B) {
    return [labelled(M.x.mul(2).sub(A.x).sub(B.x), "x"), labelled(M.y.mul(2).sub(A.y).sub(B.y), "y")];
  }
  /** A, B, C, D lie on one circle (or one line). */
  concyclic(A, B, C, D) {
    const row = (P) => [P.x.pow(2).add(P.y.pow(2)), P.x, P.y];
    const [a, b, c] = [A, B, C].map((P) => row(P).map((e, i) => e.sub(row(D)[i])));
    const det = a[0].mul(cross(b[1], b[2], c[1], c[2])).sub(a[1].mul(cross(b[0], b[2], c[0], c[2]))).add(a[2].mul(cross(b[0], b[1], c[0], c[1])));
    return labelled(det, `${A}, ${B}, ${C}, ${D} are concyclic`);
  }
  /** The three lines [A, B], [C, D], [E, F] pass through one point (or are parallel). */
  concurrent(l1, l2, l3) {
    const co = ([P, Q]) => [P.y.sub(Q.y), Q.x.sub(P.x), cross(P.x, P.y, Q.x, Q.y)];
    const [a, b, c] = [l1, l2, l3].map((l) => co(asLine(l)));
    const det = a[0].mul(cross(b[1], b[2], c[1], c[2])).sub(a[1].mul(cross(b[0], b[2], c[0], c[2]))).add(a[2].mul(cross(b[0], b[1], c[0], c[1])));
    return labelled(det, `${l1.join("")}, ${l2.join("")}, ${l3.join("")} are concurrent`);
  }
  /** The angle ABC is a right angle. */
  rightAngle(A, B, C) {
    return labelled(this.dot(B, A, B, C), `∠${A}${B}${C} is a right angle`);
  }
  /**
   * The angle from line BA to line BC equals the angle from line ED to
   * line EF, as angles between lines (so up to a half turn): equal tangents.
   */
  equalAngle(A, B, C, D, E, F) {
    const [c1, d1] = [this.cross(B, A, B, C), this.dot(B, A, B, C)];
    const [c2, d2] = [this.cross(E, D, E, F), this.dot(E, D, E, F)];
    return labelled(c1.mul(d2).sub(c2.mul(d1)), `∠${A}${B}${C} = ∠${D}${E}${F}`);
  }
  /** The line [A, B] touches the circle with centre O through P. */
  tangent(l, O, P) {
    const [A, B] = asLine(l);
    // distance from O to AB squared times |AB|² equals |OP|²·|AB|²
    return labelled(this.area2(A, B, O).pow(2).sub(this.distance2(O, P).mul(this.distance2(A, B))), `${A}${B} touches the circle about ${O} through ${P}`);
  }
  /** Two expressions are equal. */
  equal(a, b, label) {
    return labelled(expr(a).sub(expr(b)), label ?? "the two sides are equal");
  }

  // -- proving --

  /** The ring holding every coordinate: unknowns first, then parameters. */
  _ring(extra = []) {
    const vars = [...extra, ...this.unknowns, ...this.parameters];
    if (!vars.length) refuse("bad-figure", "the figure has no free or unknown coordinates: there is nothing general to prove");
    return ring(vars);
  }

  /**
   * Prove that a polynomial (or each of a list) vanishes in general.
   * method: "wu", "groebner", or "auto" (Wu first, then Gröbner). The Gröbner
   * method stops after timeLimit milliseconds. Returns a Proof; for a list,
   * a Proof whose `parts` are the separate proofs.
   */
  prove(conclusion, { method = "auto", label = null, instance = true, maxPairs = 20000, timeLimit = 20000 } = {}) {
    if (Array.isArray(conclusion)) {
      const parts = conclusion.flat().map((c) => this.prove(c, { method, instance, maxPairs, timeLimit }));
      return new Proof(this, { parts, label: label ?? parts.map((p) => p.statement).join("; ") });
    }
    const g = expr(conclusion);
    const statement = label ?? conclusion.label ?? "the conclusion";
    if (!["auto", "wu", "groebner"].includes(method)) refuse("bad-argument", `unknown method "${method}": use "wu", "groebner" or "auto"`);
    const t0 = Date.now();
    let found = null;
    let trial = null;
    const tried = [];
    if (method !== "groebner") {
      found = wu(this, g);
      tried.push("wu");
    }
    if (!found && method === "auto") {
      // before the costlier method, try one figure: if the conclusion fails there, no proof exists
      trial = this.instance(g);
      if (trial.parameters && trial.holdsAt < trial.solutions) found = { method: null, none: true };
    }
    if (!found && method !== "wu") {
      found = kapur(this, g, maxPairs, timeLimit);
      tried.push("groebner");
    }
    const proof = new Proof(this, { g, statement, found, tried, ms: Date.now() - t0 });
    if (!proof.proved && instance) proof.instance = trial ?? this.instance(g);
    return proof;
  }

  /**
   * Try the statement on one figure: give the parameters random whole
   * values and count the solutions of the hypotheses at which the
   * conclusion holds. { parameters, solutions, holdsAt } (solutions are
   * counted with multiplicity, over the complex numbers).
   */
  instance(conclusion, { seed = 7, tries = 5 } = {}) {
    const g = expr(conclusion);
    let s = seed;
    const next = () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return 2 + (s >> 8) % 23;
    };
    if (!this.unknowns.length) {
      const R = this._ring();
      const values = Object.fromEntries(this.parameters.map((p) => [p, next()]));
      const zero = g.in(R).subs(values).isZero();
      return { parameters: values, solutions: 1, holdsAt: zero ? 1 : 0 };
    }
    for (let k = 0; k < tries; k += 1) {
      const R = this._ring();
      const S = ring(this.unknowns);
      const values = Object.fromEntries(this.parameters.map((p) => [p, next()]));
      const special = (e) => e.in(R).subs(values).into(S);
      const I = ideal(S, this.hypotheses.map((h) => special(h.expr)));
      if (I.isWhole || !I.isZeroDimensional) continue;
      const bad = I.saturate(special(g));
      const total = I.degree;
      const fails = bad.isWhole ? 0 : bad.degree;
      return { parameters: values, solutions: total, holdsAt: total - fails };
    }
    return { parameters: null, solutions: 0, holdsAt: 0 };
  }

  /** The hypotheses as text, one per line. */
  describe() {
    const R = this._ring();
    const lines = [];
    for (const p of this.points.values()) lines.push(`${p.name} = (${p.x.in(R)}, ${p.y.in(R)})${p.kind === "fixed" ? "" : p.kind === "free" ? "   free" : p.kind === "on" ? "   one free coordinate" : "   determined"}`);
    for (const h of this.hypotheses) lines.push(`${h.label}:  ${h.expr.in(R)} = 0`);
    return lines.join("\n");
  }
}

/** Start a configuration: points, conditions, and then prove(conclusion). */
export const configuration = (name) => new Configuration(name);

// ---- Wu's method ---------------------------------------------------------------------------

/**
 * Put the hypotheses in triangular form, one polynomial for each unknown
 * with that unknown as its main variable, keeping each as a combination of
 * the original hypotheses.
 */
function triangular(T, R) {
  const H = T.hypotheses.map((h) => h.expr.in(R));
  const unit = (j) => H.map((_, i) => (i === j ? R.one : R.zero));
  const out = [];
  for (const step of T.steps) {
    if (step.vars.length === 1) {
      const [v] = step.vars;
      const j = step.hyps[0];
      if (H[j].degree(v) < 1) return { failed: `the condition for ${v} does not involve it` };
      out.push({ v, p: H[j], combo: unit(j) });
      continue;
    }
    const [v1, v2] = step.vars;
    let a = { p: H[step.hyps[0]], combo: unit(step.hyps[0]) };
    let b = { p: H[step.hyps[1]], combo: unit(step.hyps[1]) };
    const pick = (lo, hi, w1, w2) => {
      // lo has no w2: it is the polynomial for w1, hi the one for w2
      if (lo.p.degree(w1) < 1 || hi.p.degree(w2) < 1) return false;
      out.push({ v: w1, p: lo.p, combo: lo.combo }, { v: w2, p: hi.p, combo: hi.combo });
      return true;
    };
    const d = (x, v) => x.p.degree(v);
    if (d(a, v2) === 0 && d(b, v2) === 0) {
      // both free of v2: perhaps they pin down v1 and v2 the other way round
      return { failed: `the conditions on ${step.what} do not involve ${v2}` };
    }
    if (d(a, v2) === 0) {
      if (!pick(a, b, v1, v2)) return { failed: `the conditions on ${step.what} do not determine it` };
      continue;
    }
    if (d(b, v2) === 0) {
      if (!pick(b, a, v1, v2)) return { failed: `the conditions on ${step.what} do not determine it` };
      continue;
    }
    // both involve v2: eliminate it by repeated pseudo-division
    if (d(a, v2) < d(b, v2)) [a, b] = [b, a];
    let done = false;
    for (let guard = 0; guard < 12; guard += 1) {
      const { r, q, m } = pseudoDivide(a.p, b.p, v2);
      if (r.isZero()) return { failed: `the conditions on ${step.what} share a factor` };
      const rc = { p: r, combo: a.combo.map((c, i) => m.mul(c).sub(q.mul(b.combo[i]))) };
      if (r.degree(v2) === 0) {
        if (!pick(rc, b, v1, v2)) return { failed: `the conditions on ${step.what} do not determine it` };
        done = true;
        break;
      }
      [a, b] = [b, rc];
    }
    if (!done) return { failed: `could not put the conditions on ${step.what} in triangular form` };
  }
  return { chain: out, H };
}

function wu(T, g) {
  const R = T._ring();
  const tri = triangular(T, R);
  if (tri.failed) return null;
  const { chain, H } = tri;
  const G = g.in(R);
  let r = G;
  let m = R.one;
  let cof = H.map(() => R.zero);
  const factors = [];
  for (let k = chain.length - 1; k >= 0; k -= 1) {
    const { v, p, combo } = chain[k];
    if (r.isZero()) break;
    if (r.degree(v) < p.degree(v)) continue;
    const step = pseudoDivide(r, p, v);
    // step.m·r = step.q·p + step.r, and p = Σ combo·H
    cof = cof.map((c, i) => step.m.mul(c).add(step.q.mul(combo[i])));
    m = step.m.mul(m);
    r = step.r;
    for (const f of step.used) factors.push(f);
    if (r.length > 40000) return null;
  }
  if (!r.isZero()) return null;
  return { method: "wu", identity: { ring: R, multiplier: m, power: 1, cofactors: cof, hypotheses: H, conclusion: G }, factors };
}

// ---- the Gröbner method ---------------------------------------------------------------------

function kapur(T, g, maxPairs, timeLimit) {
  const tName = ["t", "t_", "t__", "tt_"].find((n) => !T._names.has(n));
  const R = T._ring();
  const H = T.hypotheses.map((h) => h.expr.in(R));
  const G = g.in(R);
  const trivial = (multiplier) => ({ method: "groebner", identity: { ring: R, multiplier, power: 1, cofactors: H.map(() => R.zero), hypotheses: H, conclusion: G }, factors: [] });
  if (G.isZero()) return trivial(R.one);
  // coefficients in the field Q(parameters); unknowns and t are the variables
  const P = T.parameters.length ? ring(T.parameters) : null;
  const F = P ? fractions(P) : null;
  const S = ring([tName, ...T.unknowns], F ? { field: F } : {});
  const isParam = R.vars.map((v) => T.parameters.includes(v));
  const lift = (p) => {
    if (!P) return p.into(S);
    const groups = new Map();
    for (const { coefficient, exponents } of p.terms()) {
      const eu = {};
      const ep = {};
      exponents.forEach((e, i) => {
        if (e) (isParam[i] ? ep : eu)[R.vars[i]] = e;
      });
      const key = JSON.stringify(eu);
      if (!groups.has(key)) groups.set(key, { eu, terms: [] });
      groups.get(key).terms.push([coefficient, ep]);
    }
    return S.fromTerms([...groups.values()].map(({ eu, terms }) => [F.from(P.fromTerms(terms)), eu]));
  };
  const t = S.gen(tName);
  const gens = [...H.map(lift), S.one.sub(t.mul(lift(G)))];
  let B;
  let ex;
  try {
    B = groebner(gens, { maxPairs, timeLimit });
    if (!B.isTrivial) return { method: "groebner", none: true };
    ex = B.express(S.one);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
    return { method: "groebner", gaveUp: e.message };
  }
  // 1 = Σ aᵢ hᵢ + b (1 − t g) with coefficients in Q(parameters): clear denominators, giving d on the left
  const RT = ring([tName, ...R.vars]);
  let d = P ? P.one : null;
  const as = ex.cofactors.slice(0, H.length);
  if (P) {
    const dens = [];
    for (const a of as) for (const { coefficient } of a.terms()) if (!coefficient.den.isConstant()) dens.push(coefficient.den);
    if (dens.length) d = polyLcm([...dens, P.one]);
  }
  const cleared = as.map((a) => {
    if (!P) return a.into(RT);
    const terms = [];
    for (const { coefficient, exponents } of a.terms()) {
      const mono = Object.fromEntries(S.vars.map((v, i) => [v, exponents[i]]).filter(([, e]) => e));
      const num = coefficient.num.mul(d.div(coefficient.den));
      for (const term of num.terms()) {
        const e = { ...mono };
        term.exponents.forEach((k, i) => {
          if (k) e[P.vars[i]] = k;
        });
        terms.push([term.coefficient, e]);
      }
    }
    return RT.fromTerms(terms);
  });
  const multiplier = P ? d.into(R) : R.one;
  // put t = 1/g and clear the powers of g
  const parts = cleared.map((a) => a.coefficients(tName).map((c) => c.into(R)));
  const power = Math.max(0, ...parts.map((cs) => cs.length - 1));
  const powers = [R.one];
  for (let k = 1; k <= power; k += 1) powers.push(powers[k - 1].mul(G));
  const cofactors = parts.map((cs) => cs.reduce((sum, c, j) => sum.add(c.mul(powers[power - j])), R.zero));
  return { method: "groebner", identity: { ring: R, multiplier, power, cofactors, hypotheses: H, conclusion: G }, factors: [multiplier], stats: B.stats };
}

// ---- proofs ---------------------------------------------------------------------------------

const termCount = (ps) => ps.reduce((s, p) => s + p.length, 0);

/** Divide the identity through by the numerical content of the multiplier, so that d has coprime whole coefficients. */
function tidy(id) {
  if (id.multiplier.isZero()) return id;
  const { content } = integerPrimitive(id.multiplier);
  if (content.equals(1)) return id;
  const k = content.reciprocal();
  return { ...id, multiplier: id.multiplier.scale(k), cofactors: id.cofactors.map((c) => c.scale(k)) };
}

/**
 * The outcome of prove. When `proved`, `identity` holds the certificate
 *   multiplier · conclusion^power = Σ cofactors[i] · hypotheses[i]
 * and replay() multiplies it out again. `conditions` lists the factors of
 * the multiplier: the theorem is proved for every figure at which none of
 * them is zero.
 */
export class Proof {
  constructor(T, { g, statement, found, tried, ms, parts, label }) {
    this.configuration = T;
    this.theorem = T.name;
    if (parts) {
      this.parts = parts;
      this.statement = label;
      this.proved = parts.every((p) => p.proved);
      this.method = [...new Set(parts.map((p) => p.method).filter(Boolean))].join(", ") || null;
      this.ms = parts.reduce((s, p) => s + p.ms, 0);
      return;
    }
    this.statement = statement;
    this.tried = tried;
    this.ms = ms;
    this.identity = found?.identity ? tidy(found.identity) : null;
    this.method = this.identity ? found.method : null;
    this.gaveUp = found?.gaveUp ?? null;
    this._factors = found?.factors ?? [];
    this._g = g;
    this.proved = false;
    if (this.identity) {
      // nothing is believed until it has been multiplied out
      this.proved = this.replay();
      if (!this.proved) this.identity = null;
    }
    this.instance = null;
  }

  /** Multiply the certificate out and compare both sides. */
  replay() {
    if (this.parts) return this.parts.every((p) => p.replay());
    const id = this.identity;
    if (!id) return false;
    if (id.multiplier.isZero()) return false;
    const left = id.multiplier.mul(id.conclusion.pow(id.power));
    const right = id.cofactors.reduce((s, c, i) => s.add(c.mul(id.hypotheses[i])), id.ring.zero);
    return left.equals(right);
  }

  /**
   * The degenerate cases: the irreducible factors of the multiplier, each
   * with a geometric reading when it is one of the standard ones. The
   * proof covers every figure at which none of them vanishes.
   */
  get conditions() {
    if (this.parts) {
      const seen = new Map();
      for (const p of this.parts) for (const c of p.conditions) seen.set(c.text, c);
      const all = [...seen.values()];
      // a condition already implied by "these three points are not collinear" need not be listed again
      const strong = all.filter((c) => c.meaning?.endsWith("are not collinear"));
      return all.filter((c) => !strong.some((o) => o !== c && c.polynomial.degree() < o.polynomial.degree() && o.polynomial.isDivisibleBy(c.polynomial)));
    }
    if (this._conditions) return this._conditions;
    if (!this.identity) return [];
    const T = this.configuration;
    const R = this.identity.ring;
    const norm = (p) => String(p.monic());
    const known = new Map();
    const pts = [...T.points.values()];
    const add = (e, meaning) => {
      const p = e.in(R);
      if (!p.isConstant() && !known.has(norm(p))) known.set(norm(p), { p, meaning });
    };
    for (let i = 0; i < pts.length; i += 1) {
      for (let j = i + 1; j < pts.length; j += 1) {
        add(T.distance2(pts[i], pts[j]), `${pts[i]} ≠ ${pts[j]}`);
        add(pts[i].x.sub(pts[j].x), `${pts[i]}${pts[j]} is not vertical`);
        add(pts[i].y.sub(pts[j].y), `${pts[i]}${pts[j]} is not horizontal`);
        for (let k = j + 1; k < pts.length; k += 1) add(T.area2(pts[i], pts[j], pts[k]), `${pts[i]}, ${pts[j]}, ${pts[k]} are not collinear`);
      }
    }
    for (const v of R.vars) add(variable(v), null);
    if (pts.length <= 10) {
      for (let i = 0; i < pts.length; i += 1) {
        for (let j = i + 1; j < pts.length; j += 1) {
          for (let k = i; k < pts.length; k += 1) {
            for (let l = k + 1; l < pts.length; l += 1) {
              if (k === i && l <= j) continue;
              add(T.cross(pts[i], pts[j], pts[k], pts[l]), `${pts[i]}${pts[j]} is not parallel to ${pts[k]}${pts[l]}`);
              add(T.dot(pts[i], pts[j], pts[k], pts[l]), `${pts[i]}${pts[j]} is not perpendicular to ${pts[k]}${pts[l]}`);
            }
          }
        }
      }
    }
    const out = new Map();
    const shown = (f) => {
      try {
        const q = integerPrimitive(f).primitive;
        return q.leadingCoefficient().sign() < 0 ? q.neg() : q;
      } catch {
        return f;
      }
    };
    const put = (f, meaning) => {
      const key = norm(f);
      const q = shown(f);
      if (!out.has(key)) out.set(key, { polynomial: q, text: `${q} ≠ 0`, meaning: meaning ?? known.get(key)?.meaning ?? null });
    };
    const seen = new Set();
    for (const raw of this._factors) {
      if (raw.isConstant() || seen.has(norm(raw))) continue;
      seen.add(norm(raw));
      let rest = raw;
      // take out the factors that have a geometric reading
      for (const { p, meaning } of known.values()) {
        if (rest.isConstant()) break;
        if (p.degree() > rest.degree()) continue;
        let hit = false;
        while (!rest.isConstant() && rest.isDivisibleBy(p)) {
          rest = rest.div(p);
          hit = true;
        }
        if (hit) put(p, meaning);
      }
      if (rest.isConstant()) continue;
      let pieces = [rest];
      if (rest.length <= 24 && rest.degree() <= 6) {
        try {
          pieces = factorPoly(rest).factors.map((f) => f.factor);
        } catch {
          pieces = [rest];
        }
      }
      for (const f of pieces) if (!f.isConstant()) put(f, null);
    }
    const triples = [];
    for (let i = 0; i < pts.length; i += 1) for (let j = i + 1; j < pts.length; j += 1) for (let k = j + 1; k < pts.length; k += 1) triples.push([pts[i], pts[j], pts[k]]);
    // a condition that only reflects the choice of axes ("AC is not horizontal") is restated as
    // the stronger, plainer "A, B, C are not collinear" when it is a factor of that
    for (const [key, cond] of [...out]) {
      if (cond.meaning && !/is not (vertical|horizontal)$/.test(cond.meaning)) continue;
      for (const [a, b, c] of triples) {
        const area = T.area2(a, b, c).in(R);
        if (area.isConstant() || area.degree() < cond.polynomial.degree() || !area.isDivisibleBy(cond.polynomial)) continue;
        out.delete(key);
        const q = shown(area);
        if (!out.has(norm(area))) out.set(norm(area), { polynomial: q, text: `${q} ≠ 0`, meaning: `${a}, ${b}, ${c} are not collinear` });
        break;
      }
    }
    // several conditions that together say "these three points are not collinear" are stated as that
    const merged = [];
    const usedUp = new Set();
    for (const [a, b, c] of triples) {
      let q = T.area2(a, b, c).in(R);
      if (q.isConstant() || out.has(norm(q))) continue;
      const used = [];
      for (const [key, cond] of out) {
        let hit = false;
        while (!q.isConstant() && cond.polynomial.degree() <= q.degree() && q.isDivisibleBy(cond.polynomial)) {
          q = q.div(cond.polynomial);
          hit = true;
        }
        if (hit) used.push(key);
      }
      if (q.isConstant() && used.length >= 2 && used.some((key) => !usedUp.has(key))) {
        for (const key of used) usedUp.add(key);
        const poly = shown(T.area2(a, b, c).in(R));
        merged.push({ polynomial: poly, text: `${poly} ≠ 0`, meaning: `${a}, ${b}, ${c} are not collinear` });
      }
    }
    this._conditions = [...merged, ...[...out].filter(([key]) => !usedUp.has(key)).map(([, cond]) => cond)];
    return this._conditions;
  }

  /** How large the certificate is: { multiplierTerms, cofactorTerms, power }. */
  get size() {
    if (this.parts) return this.parts.map((p) => p.size);
    if (!this.identity) return null;
    return { multiplierTerms: this.identity.multiplier.length, cofactorTerms: termCount(this.identity.cofactors), power: this.identity.power };
  }

  /** The proof written out: the figure, the hypotheses, the identity, the degenerate cases. */
  explain({ cofactors = true, limit = 400 } = {}) {
    const T = this.configuration;
    const lines = [];
    if (this.theorem) lines.push(this.theorem);
    lines.push("Figure and hypotheses:");
    for (const l of T.describe().split("\n")) lines.push(`  ${l}`);
    const one = (p) => {
      lines.push(`To prove: ${p.statement}${p._g ? `,  that is  g = ${p._g.in(T._ring())} = 0` : ""}`);
      if (!p.proved) {
        lines.push(p.gaveUp ? `  Not decided: ${p.gaveUp}` : "  Not proved: no identity exists, so the statement does not hold for a general figure.");
        if (p.instance?.parameters) lines.push(`  On the figure with ${Object.entries(p.instance.parameters).map(([k, v]) => `${k} = ${v}`).join(", ")} the hypotheses have ${p.instance.solutions} solution${p.instance.solutions === 1 ? "" : "s"}, and the conclusion holds at ${p.instance.holdsAt} of them.`);
        return;
      }
      const id = p.identity;
      const short = (q) => {
        const s = String(q);
        return s.length > limit ? `${s.slice(0, limit)} … (${q.length} terms)` : s;
      };
      lines.push(`  Proved by ${p.method === "wu" ? "Wu's method (successive pseudo-division)" : "a Gröbner basis (eliminating down to the parameters)"}, and checked by multiplying out:`);
      lines.push(`    d · g${id.power === 1 ? "" : `^${id.power}`} = ${id.hypotheses.map((_, i) => `c${i + 1}·h${i + 1}`).join(" + ") || "0"}`);
      lines.push(`    d = ${short(id.multiplier)}`);
      if (cofactors) id.cofactors.forEach((c, i) => lines.push(`    c${i + 1} = ${short(c)}`));
      const cs = p.conditions;
      if (cs.length) {
        lines.push("  So the conclusion holds for every figure satisfying the hypotheses with");
        for (const c of cs) lines.push(`    ${c.meaning ? `${c.meaning}   (${c.text})` : c.text}`);
      } else lines.push("  So the conclusion holds for every figure satisfying the hypotheses, with no exceptions.");
    };
    for (const p of this.parts ?? [this]) one(p);
    return lines.join("\n");
  }

  toString() {
    const what = this.theorem ? `${this.theorem}: ` : "";
    if (this.proved) return `${what}proved (${this.method})`;
    return `${what}not proved`;
  }
}

