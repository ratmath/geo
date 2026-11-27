// Topologies on finite sets.
//
// A topology on a finite set X is a family of subsets (the open sets)
// containing ∅ and X and closed under unions and intersections (finite ones
// are all there are). Each point x has a smallest open set U_x, the
// intersection of the open sets containing it, and x ≤ y when y ∈ U_x is a
// preorder (reflexive and transitive). The open sets are exactly the up-sets
// of that preorder, so topologies on X and preorders on X are the same thing:
// that is how they are counted. T₀ spaces are the partial orders; T₁ means
// discrete.
//
// Subsets are held as bit masks, so a space has at most 30 points.

import { GeoError } from "./num.js";

const refuse = (code, message) => {
  throw new GeoError(code, message);
};
const popcount = (m) => {
  let c = 0;
  while (m) {
    m &= m - 1;
    c++;
  }
  return c;
};

export class FiniteSpace {
  /** points: a list of distinct labels; opens: lists of points. Checks the axioms unless { check: false }. */
  constructor(points, opens, { check = true, name = null } = {}) {
    if (!Array.isArray(points)) refuse("bad-argument", "a finite space needs a list of points");
    const pts = [...points];
    if (new Set(pts.map(String)).size !== pts.length) refuse("bad-argument", "the points must be distinct");
    if (pts.length > 30) refuse("unsupported", "finite spaces have at most 30 points here");
    this.points = Object.freeze(pts);
    this._idx = new Map(pts.map((p, i) => [String(p), i]));
    this.name = name;
    const full = pts.length === 30 ? 0x3fffffff : (1 << pts.length) - 1;
    this._full = full;
    const masks = [...new Set(opens.map((A) => this._mask(A)))];
    if (check) {
      const set = new Set(masks);
      if (!set.has(0)) refuse("not-a-topology", "the empty set must be open");
      if (!set.has(full)) refuse("not-a-topology", "the whole set must be open");
      for (const a of masks) for (const b of masks) {
        if (!set.has(a | b)) refuse("not-a-topology", `the union of {${this._list(a)}} and {${this._list(b)}} is not open`);
        if (!set.has(a & b)) refuse("not-a-topology", `the intersection of {${this._list(a)}} and {${this._list(b)}} is not open`);
      }
    }
    masks.sort((a, b) => popcount(a) - popcount(b) || a - b);
    this._opens = masks;
    this._openSet = new Set(masks);
    // smallest open set about each point
    this._U = pts.map((_, i) => masks.filter((m) => (m >> i) & 1).reduce((x, m) => x & m, full));
    Object.freeze(this);
  }

  _mask(A) {
    let m = 0;
    for (const p of A) {
      const i = this._idx.get(String(p));
      if (i === undefined) refuse("bad-argument", `${p} is not a point of the space`);
      m |= 1 << i;
    }
    return m;
  }
  _list(m) {
    return this.points.filter((_, i) => (m >> i) & 1);
  }

  get size() {
    return this.points.length;
  }
  /** The open sets, smallest first. */
  get opens() {
    return this._opens.map((m) => this._list(m));
  }
  get closedSets() {
    return this._opens.map((m) => this._list(this._full & ~m)).reverse();
  }
  isOpen(A) {
    return this._openSet.has(this._mask(A));
  }
  isClosed(A) {
    return this._openSet.has(this._full & ~this._mask(A));
  }
  /** The largest open set inside A. */
  interior(A) {
    const a = this._mask(A);
    return this._list(this._opens.filter((m) => (m & ~a) === 0).reduce((x, m) => x | m, 0));
  }
  /** The smallest closed set containing A. */
  closure(A) {
    const a = this._mask(A);
    const closed = this._opens.map((m) => this._full & ~m).filter((c) => (a & ~c) === 0);
    return this._list(closed.reduce((x, c) => x & c, this._full));
  }
  boundary(A) {
    const cl = this._mask(this.closure(A));
    const int = this._mask(this.interior(A));
    return this._list(cl & ~int);
  }
  isDense(A) {
    return this._mask(this.closure(A)) === this._full;
  }
  /** U_x, the smallest open set containing x. */
  minimalOpen(x) {
    return this._list(this._U[this._mask([x]).toString(2).length - 1]);
  }
  /** The minimal open sets U_x form the smallest basis. */
  get minimalBasis() {
    return [...new Set(this._U)].map((m) => this._list(m));
  }
  /** Is this family a basis of the topology (its unions are exactly the open sets)? */
  isBasis(family) {
    const fs = family.map((A) => this._mask(A));
    if (fs.some((m) => !this._openSet.has(m))) return false;
    return this._U.every((u, i) => fs.some((m) => (m >> i) & 1 && (m & ~u) === 0));
  }
  /** The specialisation preorder: pairs [x, y] with x ≤ y, i.e. y ∈ U_x. */
  get specialization() {
    const out = [];
    this.points.forEach((x, i) => this.points.forEach((y, j) => {
      if ((this._U[i] >> j) & 1) out.push([x, y]);
    }));
    return out;
  }
  /** T₀: distinct points have distinct minimal open sets. */
  get isT0() {
    return new Set(this._U).size === this.points.length;
  }
  /** T₁: points are closed; for a finite space that means discrete. */
  get isT1() {
    return this._U.every((u, i) => u === 1 << i);
  }
  /** T₂ (Hausdorff): the same as T₁ for a finite space. */
  get isHausdorff() {
    return this.isT1;
  }
  /** The connected components (also the path components, for a finite space). */
  components() {
    const n = this.points.length;
    const parent = Array.from({ length: n }, (_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    this._U.forEach((u, i) => {
      for (let j = 0; j < n; j++) if ((u >> j) & 1) parent[find(j)] = find(i);
    });
    const groups = new Map();
    for (let i = 0; i < n; i++) {
      const r = find(i);
      if (!groups.has(r)) groups.set(r, 0);
      groups.set(r, groups.get(r) | (1 << i));
    }
    return [...groups.values()].map((m) => this._list(m));
  }
  get isConnected() {
    return this.points.length === 0 || this.components().length === 1;
  }
  /** Every finite space is compact. */
  get isCompact() {
    return true;
  }
  /** The subspace topology on A. */
  subspace(A) {
    const a = this._mask(A);
    const pts = this._list(a);
    return new FiniteSpace(pts, [...new Set(this._opens.map((m) => m & a))].map((m) => this._list(m)), { check: false });
  }
  /**
   * Is f : this → Y continuous (preimages of open sets open)? f is a
   * function, a Map, or an object from points to points of Y. Returns
   * { continuous, witness? } with an open set whose preimage is not open.
   */
  continuity(f, Y) {
    const g = typeof f === "function" ? f : f instanceof Map ? (x) => f.get(x) : (x) => f[x];
    const img = this.points.map((x) => {
      const y = g(x);
      if (!Y._idx.has(String(y))) refuse("bad-argument", `f(${x}) = ${y} is not a point of the target`);
      return Y._idx.get(String(y));
    });
    for (const V of Y._opens) {
      let pre = 0;
      img.forEach((j, i) => {
        if ((V >> j) & 1) pre |= 1 << i;
      });
      if (!this._openSet.has(pre)) return { continuous: false, witness: { open: Y._list(V), preimage: this._list(pre) } };
    }
    return { continuous: true };
  }
  isContinuous(f, Y) {
    return this.continuity(f, Y).continuous;
  }
  equals(other) {
    return this.points.length === other.points.length && this._opens.length === other._opens.length && other.opens.every((A) => this.isOpen(A));
  }
  toString() {
    return `{${this.opens.map((A) => `{${A.join(", ")}}`).join(", ")}}`;
  }
}

/** A finite space from its open sets (the axioms are checked). */
export function finiteSpace(points, opens, options) {
  return new FiniteSpace(points, opens, options);
}

/** The topology generated by a basis: checks the basis conditions, then takes all unions. */
export function fromBasis(points, basis) {
  const S = new FiniteSpace(points, [[], points], { check: false });
  const bs = basis.map((B) => S._mask(B));
  const full = S._full;
  if (bs.reduce((x, m) => x | m, 0) !== full) refuse("not-a-basis", "the basis sets do not cover the space");
  for (const a of bs) for (const b of bs) {
    const ab = a & b;
    for (let i = 0; i < points.length; i++) {
      if (!((ab >> i) & 1)) continue;
      if (!bs.some((c) => (c >> i) & 1 && (c & ~ab) === 0)) refuse("not-a-basis", `no basis set contains ${points[i]} inside {${S._list(a)}} ∩ {${S._list(b)}}`);
    }
  }
  const opens = new Set([0]);
  for (const b of bs) for (const m of [...opens]) opens.add(m | b);
  return new FiniteSpace(points, [...opens].map((m) => S._list(m)), { check: false });
}

/**
 * The topology of a preorder: pairs [x, y] meaning x ≤ y (the reflexive and
 * transitive closure is taken). The open sets are the up-sets, so U_x is
 * everything above x.
 */
export function fromPreorder(points, pairs) {
  const S = new FiniteSpace(points, [[], points], { check: false });
  const n = points.length;
  const up = points.map((_, i) => 1 << i);
  for (const [x, y] of pairs) up[S._mask([x]).toString(2).length - 1] |= S._mask([y]);
  for (let changed = true; changed; ) {
    changed = false;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((up[i] >> j) & 1 && (up[i] | up[j]) !== up[i]) {
        up[i] |= up[j];
        changed = true;
      }
    }
  }
  const opens = new Set([0]);
  for (const u of up) for (const m of [...opens]) opens.add(m | u);
  return new FiniteSpace(points, [...opens].map((m) => S._list(m)), { check: false });
}

/** The preorders on n points, each as rows of bit masks (row i: what is above i). */
function* preorders(n) {
  const off = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) off.push([i, j]);
  const total = 2 ** off.length;
  for (let m = 0; m < total; m++) {
    const up = Array.from({ length: n }, (_, i) => 1 << i);
    for (let k = 0; k < off.length; k++) if (Math.floor(m / 2 ** k) % 2) up[off[k][0]] |= 1 << off[k][1];
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      for (let j = 0; j < n; j++) if ((up[i] >> j) & 1 && (up[j] & ~up[i]) !== 0) {
        ok = false;
        break;
      }
    }
    if (ok) yield up;
  }
}

/**
 * How many topologies there are on an n-point set (n ≤ 5), counted through
 * preorders; { t0: true } counts the T₀ ones (partial orders). 1, 4, 29, 355,
 * 6942 and 1, 3, 19, 219, 4231.
 */
export function countTopologies(n, { t0 = false } = {}) {
  if (!Number.isInteger(n) || n < 0) refuse("bad-argument", "countTopologies(n) needs a whole number n ≥ 0");
  if (n > 5) refuse("unsupported", "counting by preorders is limited to n ≤ 5 here (6 points have 209527 topologies)");
  if (n === 0) return 1;
  let c = 0;
  for (const up of preorders(n)) if (!t0 || new Set(up).size === n) c++;
  return c;
}

/** Every topology on these points (at most 4), as FiniteSpaces. */
export function allTopologies(points, { t0 = false } = {}) {
  if (points.length > 4) refuse("unsupported", "listing topologies is limited to 4 points here");
  const out = [];
  for (const up of preorders(points.length)) {
    if (t0 && new Set(up).size !== points.length) continue;
    const pairs = [];
    up.forEach((u, i) => points.forEach((p, j) => {
      if (i !== j && (u >> j) & 1) pairs.push([points[i], p]);
    }));
    out.push(fromPreorder(points, pairs));
  }
  return out;
}

/** Named finite spaces. */
export const finiteSpaces = Object.freeze({
  discrete: (points) => fromBasis(points, points.map((p) => [p])),
  indiscrete: (points) => new FiniteSpace(points, [[], points]),
  /** The Sierpiński space {0, 1} with open sets ∅, {1}, {0, 1}. */
  sierpinski: () => new FiniteSpace([0, 1], [[], [1], [0, 1]], { name: "Sierpiński space" }),
  /** The finite model of the circle: four points a, b (open) and c, d (closed), the smallest finite space with the weak homotopy type of S¹. */
  pseudocircle: () => fromPreorder(["c", "d", "a", "b"], [["c", "a"], ["c", "b"], ["d", "a"], ["d", "b"]]),
});
