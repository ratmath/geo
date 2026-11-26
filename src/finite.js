// Finite geometries: planes with finitely many points, built from the finite
// fields of @ratmath/algebraic, and incidence structures in general.
//
//   projectivePlane(q)   PG(2, q): q² + q + 1 points and as many lines, q + 1 on each
//   affinePlane(q)       AG(2, q): q² points, q² + q lines in q + 1 parallel classes
//   fano()               PG(2, 2), the smallest projective plane
//   incidence(points, lines)   any incidence structure, with the axioms checked
//
// Everything is finite and checked by brute force, so every answer is exact.
import { galoisField, PermGroup, isProbablePrime } from "@ratmath/algebraic";
import { refuse } from "./num.js";

/** q = p^k with p prime, or null */
function primePower(q) {
  if (!Number.isInteger(q) || q < 2) return null;
  for (let p = 2; p <= q; p++) {
    if (q % p) continue;
    let k = 0;
    let m = q;
    while (m % p === 0) {
      m /= p;
      k++;
    }
    return m === 1 && isProbablePrime(BigInt(p)) ? { p, k } : null;
  }
  return null;
}

/** GF(q) with elements numbered 0 … q − 1 and its operations as tables (q is small). */
function fieldTables(q) {
  const pk = primePower(q);
  if (!pk) refuse("bad-argument", `${q} is not a prime power, so there is no field with ${q} elements (and no plane from one)`);
  if (q > 64) refuse("too-large", "finite planes here go up to q = 64");
  const F = galoisField(BigInt(pk.p), pk.k);
  const els = F.elements();
  const key = (a) => (Array.isArray(a) ? a.join(",") : String(a));
  const index = new Map(els.map((a, i) => [key(a), i]));
  const id = (a) => index.get(key(a));
  const add = els.map((a) => els.map((b) => id(F.add(a, b))));
  const mul = els.map((a) => els.map((b) => id(F.mul(a, b))));
  const zero = id(F.zero);
  const one = id(F.one);
  const inv = els.map((a, i) => (i === zero ? null : mul[i].indexOf(one)));
  const neg = els.map((_, i) => add[i].indexOf(zero));
  const names = els.map((a) => (pk.k === 1 ? String(a) : F.format(a)));
  // Frobenius x ↦ x^p, for the semilinear maps
  const frob = els.map((a) => id(F.pow(a, pk.p)));
  return { q, p: pk.p, k: pk.k, add, mul, zero, one, inv, neg, names, frob, field: F };
}

/**
 * An incidence structure: points 0 … v − 1 and lines given as lists of
 * points. The checks are by brute force.
 */
export class Incidence {
  constructor(lines, { points = null, name = "incidence structure", labels = null } = {}) {
    const v = points ?? Math.max(-1, ...lines.flat()) + 1;
    this.v = v;
    this.lines = Object.freeze(lines.map((l) => Object.freeze([...new Set(l)].sort((a, b) => a - b))));
    this.name = name;
    this.labels = labels ? Object.freeze(labels) : null;
    this._on = Array.from({ length: v }, () => []);
    this.lines.forEach((l, j) => l.forEach((p) => this._on[p].push(j)));
    if (new.target === Incidence) Object.freeze(this);
  }
  get b() {
    return this.lines.length;
  }
  /** The lines through point p (their numbers). */
  linesThrough(p) {
    return this._on[p];
  }
  /** The line through two points, or null when there is none (or several: then an array). */
  lineThrough(p, q) {
    const ls = this._on[p].filter((j) => this.lines[j].includes(q));
    return ls.length === 1 ? ls[0] : ls.length ? ls : null;
  }
  /** The common points of two lines. */
  meet(i, j) {
    return this.lines[i].filter((p) => this.lines[j].includes(p));
  }
  /** Lines through p that share no point with line ℓ (the parallels through p). */
  parallels(p, l) {
    return this._on[p].filter((j) => j !== l && !this.lines[j].some((x) => this.lines[l].includes(x)));
  }
  /** The incidence matrix: rows are lines, columns points, entries 0 and 1. */
  get matrix() {
    return this.lines.map((l) => Array.from({ length: this.v }, (_, p) => (l.includes(p) ? 1 : 0)));
  }
  /** The axioms of a projective plane, checked one by one. */
  projectiveAxioms() {
    const two = pairsAll(this.v, (p, q) => {
      const n = this._on[p].filter((j) => this.lines[j].includes(q)).length;
      return n === 1;
    });
    const meet = pairsAll(this.b, (i, j) => this.meet(i, j).length === 1);
    const quad = this.hasQuadrangle();
    return Object.freeze({ twoPointsOneLine: two, twoLinesOnePoint: meet, fourPointsNoThreeCollinear: quad, holds: two && meet && quad });
  }
  isProjectivePlane() {
    return this.projectiveAxioms().holds;
  }
  /** The axioms of an affine plane: one line through two points, Playfair's parallel axiom, three non-collinear points. */
  affineAxioms() {
    const two = pairsAll(this.v, (p, q) => this._on[p].filter((j) => this.lines[j].includes(q)).length === 1);
    let playfair = true;
    for (let l = 0; l < this.b && playfair; l++) for (let p = 0; p < this.v && playfair; p++) if (!this.lines[l].includes(p) && this.parallels(p, l).length !== 1) playfair = false;
    const tri = this.lines.length > 0 && this.v > this.lines[0].length;
    return Object.freeze({ twoPointsOneLine: two, playfair, threeNonCollinear: tri, holds: two && playfair && tri });
  }
  isAffinePlane() {
    return this.affineAxioms().holds;
  }
  hasQuadrangle() {
    const col = (a, b, c) => this._on[a].some((j) => this.lines[j].includes(b) && this.lines[j].includes(c));
    const v = this.v;
    for (let a = 0; a < v; a++) for (let b = a + 1; b < v; b++) for (let c = b + 1; c < v; c++) {
      if (col(a, b, c)) continue;
      for (let d = c + 1; d < v; d++) if (!col(a, b, d) && !col(a, c, d) && !col(b, c, d)) return true;
    }
    return false;
  }
  /** The order n of a projective plane (n + 1 points on each line), or of an affine plane (n points on each line). */
  get order() {
    const sizes = new Set(this.lines.map((l) => l.length));
    if (sizes.size !== 1) return null;
    const k = [...sizes][0];
    if (this.v === k * k - k + 1) return k - 1;
    if (this.v === k * k) return k;
    return null;
  }
  /** As a block design: the parameters 2-(v, k, λ) when it is one (λ = 1 for a plane). */
  designParameters() {
    const sizes = new Set(this.lines.map((l) => l.length));
    const k = sizes.size === 1 ? [...sizes][0] : null;
    const lam = new Set();
    for (let p = 0; p < this.v; p++) for (let q = p + 1; q < this.v; q++) lam.add(this._on[p].filter((j) => this.lines[j].includes(q)).length);
    const r = new Set(this._on.map((x) => x.length));
    return Object.freeze({ v: this.v, b: this.b, k, r: r.size === 1 ? [...r][0] : null, lambda: lam.size === 1 ? [...lam][0] : null });
  }
  /** The dual structure: lines become points and points lines. */
  dual() {
    return new Incidence(this._on.map((ls) => [...ls]), { points: this.b, name: `dual of ${this.name}` });
  }
  /**
   * The collineations (permutations of the points sending lines to lines), as
   * an algebraic PermGroup, found by backtracking. Only for small structures.
   */
  collineations({ maxOrder = 200000 } = {}) {
    if (this.v > 31) refuse("too-large", "searching for collineations is for structures of at most 31 points");
    const lineKey = (l) => l.join(",");
    const lineSet = new Set(this.lines.map(lineKey));
    // base: a frame of points that fixes a collineation (four points in general position for a plane)
    const perms = [];
    const v = this.v;
    const img = new Array(v).fill(-1);
    const used = new Array(v).fill(false);
    // order points so each new point lies on a line through two earlier ones when possible
    const order = [...Array(v).keys()];
    const check = () => this.lines.every((l) => {
      const mapped = l.map((p) => img[p]);
      if (mapped.some((x) => x < 0)) return true;
      return lineSet.has(lineKey([...mapped].sort((a, b) => a - b)));
    });
    const partialOk = (p) => this._on[p].every((j) => {
      const l = this.lines[j];
      const known = l.filter((x) => img[x] >= 0);
      if (known.length < 2) return true;
      // the images of known points must lie on one line
      const ims = known.map((x) => img[x]);
      return this._on[ims[0]].some((m) => ims.every((y) => this.lines[m].includes(y)));
    });
    const rec = (i) => {
      if (perms.length > maxOrder) refuse("too-large", "too many collineations");
      if (i === v) {
        if (check()) perms.push([...img]);
        return;
      }
      const p = order[i];
      for (let x = 0; x < v; x++) {
        if (used[x]) continue;
        img[p] = x;
        used[x] = true;
        if (partialOk(p)) rec(i + 1);
        used[x] = false;
        img[p] = -1;
      }
    };
    rec(0);
    return Object.freeze({ order: perms.length, group: perms.length > 1 ? new PermGroup(smallGenerators(perms), v, { maxOrder: Math.max(maxOrder, perms.length) }) : null, elements: perms });
  }
  toString() {
    return `${this.name}: ${this.v} points, ${this.b} lines`;
  }
}
const pairsAll = (n, f) => {
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (!f(i, j)) return false;
  return true;
};
/** a few elements that generate the same group as all of them (greedy) */
function smallGenerators(perms) {
  const n = perms[0].length;
  const gens = [];
  let size = 1;
  for (const p of perms) {
    if (p.every((x, i) => x === i)) continue;
    const G = new PermGroup([...gens, p], n, { maxOrder: perms.length + 1 });
    if (G.order > size) {
      gens.push(p);
      size = G.order;
    }
    if (size === perms.length) break;
  }
  return gens;
}
export const incidence = (lines, options) => new Incidence(lines, options);

/** Points of PG(2, q) as normalised triples (last non-zero coordinate 1) of field indices. */
function projectivePoints(T) {
  const { q, zero, one } = T;
  const pts = [];
  for (let x = 0; x < q; x++) for (let y = 0; y < q; y++) pts.push([x, y, one]);
  for (let x = 0; x < q; x++) pts.push([x, one, zero]);
  pts.push([one, zero, zero]);
  return pts;
}
function normalizeT(T, v) {
  for (let i = 2; i >= 0; i--) if (v[i] !== T.zero) {
    const s = T.inv[v[i]];
    return v.map((x) => T.mul[x][s]);
  }
  return null;
}

/** A finite projective plane PG(2, q) with its coordinates. */
export class FiniteProjectivePlane extends Incidence {
  constructor(q) {
    const T = fieldTables(q);
    const pts = projectivePoints(T);
    const key = (v) => v.join(",");
    const index = new Map(pts.map((p, i) => [key(p), i]));
    // lines have the same coordinates as points (duality); point x on line l when l·x = 0
    const dotT = (a, b) => T.add[T.add[T.mul[a[0]][b[0]]][T.mul[a[1]][b[1]]]][T.mul[a[2]][b[2]]];
    const lines = pts.map((l) => pts.map((x, i) => (dotT(l, x) === T.zero ? i : -1)).filter((i) => i >= 0));
    const labels = pts.map((p) => `[${p.map((x) => T.names[x]).join(":")}]`);
    super(lines, { points: pts.length, name: q === 2 ? "the Fano plane PG(2, 2)" : `PG(2, ${q})`, labels });
    this.q = q;
    this.field = T;
    this.coordinates = Object.freeze(pts.map((p) => Object.freeze(p)));
    this._index = index;
    Object.freeze(this);
  }
  /** The point with these coordinates (field elements by number). */
  pointAt(v) {
    const n = normalizeT(this.field, v);
    if (!n) refuse("degenerate", "[0 : 0 : 0] is not a point");
    return this._index.get(n.join(","));
  }
  /**
   * The group of collineations as matrices: PGL(3, q), with the field's
   * automorphisms added for q = p^k, k > 1 (PΓL(3, q)), acting on the
   * points. Its order is k·q³(q³ − 1)(q² − 1), found here by closing the
   * generators (and so a check of that formula).
   */
  collineationGroup({ maxOrder = 200000 } = {}) {
    const T = this.field;
    const { q, zero, one } = T;
    const act = (M) => this.coordinates.map((v) => this.pointAt(M.map((row) => T.add[T.add[T.mul[row[0]][v[0]]][T.mul[row[1]][v[1]]]][T.mul[row[2]][v[2]]])));
    const I = () => [[one, zero, zero], [zero, one, zero], [zero, zero, one]];
    const gens = [];
    // elementary transvection, a permutation of coordinates, and a diagonal with a primitive element
    const E = I();
    E[0][1] = one;
    gens.push(act(E));
    gens.push(act([[zero, zero, one], [one, zero, zero], [zero, one, zero]]));
    gens.push(act([[zero, one, zero], [one, zero, zero], [zero, zero, one]]));
    let prim = null;
    for (let a = 0; a < q && prim === null; a++) {
      if (a === zero) continue;
      let x = a;
      let ord = 1;
      while (x !== one) {
        x = T.mul[x][a];
        ord++;
      }
      if (ord === q - 1) prim = a;
    }
    if (prim !== null && prim !== one) {
      const D = I();
      D[0][0] = prim;
      gens.push(act(D));
    }
    if (T.k > 1) gens.push(this.coordinates.map((v) => this.pointAt(v.map((x) => T.frob[x]))));
    return new PermGroup(gens.filter((g) => g.some((x, i) => x !== i)), this.v, { maxOrder });
  }
}
/** A finite affine plane AG(2, q): the points (x, y) of GF(q)² and the lines y = mx + c and x = c. */
export class FiniteAffinePlane extends Incidence {
  constructor(q) {
    const T = fieldTables(q);
    const id = (x, y) => x * q + y;
    const lines = [];
    const classes = [];
    for (let m = 0; m < q; m++) {
      const cls = [];
      for (let c = 0; c < q; c++) {
        cls.push(lines.length);
        lines.push([...Array(q).keys()].map((x) => id(x, T.add[T.mul[m][x]][c])));
      }
      classes.push(cls);
    }
    const vert = [];
    for (let c = 0; c < q; c++) {
      vert.push(lines.length);
      lines.push([...Array(q).keys()].map((y) => id(c, y)));
    }
    classes.push(vert);
    const labels = [];
    for (let x = 0; x < q; x++) for (let y = 0; y < q; y++) labels.push(`(${T.names[x]}, ${T.names[y]})`);
    super(lines, { points: q * q, name: `AG(2, ${q})`, labels });
    this.q = q;
    this.field = T;
    /** the parallel classes: lists of line numbers with the same slope */
    this.parallelClasses = Object.freeze(classes.map((c) => Object.freeze(c)));
    Object.freeze(this);
  }
  /**
   * The projective completion: add one point at infinity for each parallel
   * class and one line at infinity through them. The result is a projective
   * plane of order q.
   */
  completion() {
    const q = this.q;
    const inf = (k) => q * q + k;
    const lines = this.lines.map((l, j) => [...l, inf(this.parallelClasses.findIndex((c) => c.includes(j)))]);
    lines.push(this.parallelClasses.map((_, k) => inf(k)));
    return new Incidence(lines, { points: q * q + q + 1, name: `the completion of AG(2, ${q})` });
  }
}

export const projectivePlane = (q) => new FiniteProjectivePlane(q);
export const affinePlane = (q) => new FiniteAffinePlane(q);
export const fano = () => new FiniteProjectivePlane(2);
