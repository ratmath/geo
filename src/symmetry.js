// Symmetry in the plane: the symmetry group of a finite figure (a rosette
// group, cyclic or dihedral, as Leonardo found), the seven frieze groups and
// the seventeen wallpaper groups. Patterns are given by exact points, so
// every symmetry is checked exactly and the group is named by the standard
// flowchart, step by step.
import { PermGroup } from "@ratmath/algebraic";
import { Rational } from "@ratmath/core";
import { num, N, refuse, ZERO, ONE, Q } from "./num.js";
import { point, Transform, distance2 } from "./plane.js";

// ---- finite figures -------------------------------------------------------------

/**
 * The symmetries of a finite set of points (optionally labelled, so only
 * like points may be swapped). Every isometry fixes the centroid, and one is
 * fixed by where it sends two points, so candidates are tried pair by pair
 * and each is checked exactly. Returns the group as a PermGroup on the points,
 * the isometries as Transforms, and the name: Cₙ (n rotations) or Dₙ (n
 * rotations and n reflections).
 */
export function figureSymmetry(points, { labels = null } = {}) {
  const P = points.map((p) => point(...(Array.isArray(p) ? p : [p.x, p.y])));
  const n = P.length;
  if (n < 1) refuse("bad-argument", "give at least one point");
  const lab = labels ?? P.map(() => 0);
  const cx = N.div(P.map((p) => p.x).reduce(N.add), num(n));
  const cy = N.div(P.map((p) => p.y).reduce(N.add), num(n));
  const R = P.map((p) => [N.sub(p.x, cx), N.sub(p.y, cy)]);
  // a base pair: a point off the centre, and another not on its line through the centre if there is one
  const r2 = R.map(([x, y]) => N.add(N.sq(x), N.sq(y)));
  const i0 = r2.findIndex((v) => !N.isZero(v));
  if (i0 < 0) return Object.freeze({ order: 1, rotations: 1, reflections: 0, name: "C1", transforms: [new Transform([[1, 0], [0, 1]])], group: null });
  const crossR = (a, b) => N.sub(N.mul(a[0], b[1]), N.mul(a[1], b[0]));
  const dotR = (a, b) => N.add(N.mul(a[0], b[0]), N.mul(a[1], b[1]));
  const i1 = R.findIndex((v) => !N.isZero(crossR(R[i0], v)));
  const found = [];
  const keys = new Set();
  const tryMap = (M) => {
    // M is [[a, b], [c, d]] acting on centred coordinates
    const perm = [];
    for (let m = 0; m < n; m++) {
      const w = [N.add(N.mul(M[0][0], R[m][0]), N.mul(M[0][1], R[m][1])), N.add(N.mul(M[1][0], R[m][0]), N.mul(M[1][1], R[m][1]))];
      const t = R.findIndex((q, k) => lab[k] === lab[m] && N.eq(q[0], w[0]) && N.eq(q[1], w[1]));
      if (t < 0) return;
      perm.push(t);
    }
    const k = perm.join(",");
    if (keys.has(k)) return;
    keys.add(k);
    found.push({ perm, M });
  };
  for (let j = 0; j < n; j++) {
    if (lab[j] !== lab[i0] || !N.eq(r2[j], r2[i0])) continue;
    // the rotation and the reflection taking R[i0] to R[j]: M = [[a, −s·b], [b, s·a]] with (a, b) from the two vectors
    const u = R[i0];
    const v = R[j];
    const a = N.div(dotR(u, v), r2[i0]);
    const b = N.div(crossR(u, v), r2[i0]);
    tryMap([[a, N.neg(b)], [b, a]]);
    // reflection: v = M u with M = [[c, s], [s, −c]], c + i s = (v / u)·(u/ū)…: c = (v·ū)… solved directly
    const uu = r2[i0];
    const c = N.div(N.sub(N.mul(u[0], v[0]), N.mul(u[1], v[1])), uu);
    const s = N.div(N.add(N.mul(u[1], v[0]), N.mul(u[0], v[1])), uu);
    tryMap([[c, s], [s, N.neg(c)]]);
  }
  void i1;
  const rotations = found.filter((f) => N.sign(N.sub(N.mul(f.M[0][0], f.M[1][1]), N.mul(f.M[0][1], f.M[1][0]))) > 0).length;
  const order = found.length;
  const transforms = found.map(({ M }) => {
    // p ↦ M(p − c) + c
    const t = [N.sub(cx, N.add(N.mul(M[0][0], cx), N.mul(M[0][1], cy))), N.sub(cy, N.add(N.mul(M[1][0], cx), N.mul(M[1][1], cy)))];
    return new Transform(M, t);
  });
  const gens = found.map((f) => f.perm).filter((p) => p.some((x, k) => x !== k));
  return Object.freeze({
    order,
    rotations,
    reflections: order - rotations,
    name: order === rotations ? `C${rotations}` : `D${rotations}`,
    center: point(cx, cy),
    transforms,
    group: gens.length ? new PermGroup(gens, n) : null,
  });
}

// ---- lattice patterns: friezes and wallpapers -----------------------------------------------

const frac = (q) => {
  // q − ⌊q⌋ for a Rational
  const f = q.numerator >= 0n ? q.numerator / q.denominator : -((-q.numerator + q.denominator - 1n) / q.denominator);
  return q.subtract(new Rational(f));
};
const isInt = (q) => q.denominator === 1n;
const R = (x) => (x instanceof Rational ? x : num(x));

/**
 * A pattern repeated by a lattice of translations, given in lattice
 * coordinates: points (x, y) with 0 ≤ x, y < 1 in the cell spanned by the
 * basis vectors, each with an optional label (a colour). The Gram matrix
 * [[a·a, a·b], [a·b, b·b]] of the basis carries the shape of the lattice.
 */
class LatticePattern {
  constructor({ gram, points, labels = null }) {
    this.gram = gram.map((r) => r.map(num));
    if (!N.eq(this.gram[0][1], this.gram[1][0])) refuse("bad-argument", "the Gram matrix is symmetric");
    this.points = points.map(([x, y]) => [frac(R(x)), frac(R(y))]);
    if (this.points.some(([x, y]) => !(x instanceof Rational) || !(y instanceof Rational))) refuse("bad-argument", "points in lattice coordinates must be rational");
    this.labels = labels ?? this.points.map(() => 0);
    this._keys = new Set(this.points.map((p, i) => `${this.labels[i]}|${p[0]}|${p[1]}`));
    if (this._keys.size !== this.points.length) refuse("bad-argument", "a point is listed twice");
  }
  /** Integer matrices M (columns: images of the basis vectors) that keep the Gram matrix: the point group's candidates. */
  latticeSymmetries() {
    const G = this.gram;
    const out = [];
    for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) for (let c = -2; c <= 2; c++) for (let d = -2; d <= 2; d++) {
      const det = a * d - b * c;
      if (det !== 1 && det !== -1) continue;
      // MᵀGM = G with M = [[a, b], [c, d]] (columns (a, c) and (b, d))
      const M = [[a, b], [c, d]];
      const ok = [0, 1].every((i) => [0, 1].every((j) => {
        let s = ZERO;
        for (let k = 0; k < 2; k++) for (let l = 0; l < 2; l++) s = N.add(s, N.mul(num(M[k][i] * M[l][j]), G[k][l]));
        return N.eq(s, G[i][j]);
      }));
      if (ok) out.push(M);
    }
    return out;
  }
  /** Does x ↦ Mx + t map the pattern onto itself (modulo the lattice)? */
  keeps(M, t) {
    return this.points.every(([x, y], i) => {
      const X = frac(x.multiply(Q(M[0][0])).add(y.multiply(Q(M[0][1]))).add(t[0]));
      const Y = frac(x.multiply(Q(M[1][0])).add(y.multiply(Q(M[1][1]))).add(t[1]));
      return this._keys.has(`${this.labels[i]}|${X}|${Y}`);
    });
  }
  /** All symmetries x ↦ Mx + t modulo lattice translations. */
  symmetries() {
    const out = [];
    const [p0] = this.points;
    for (const M of this.latticeSymmetries()) {
      const seen = new Set();
      for (let j = 0; j < this.points.length; j++) {
        if (this.labels[j] !== this.labels[0]) continue;
        const q = this.points[j];
        const t = [frac(q[0].subtract(p0[0].multiply(Q(M[0][0]))).subtract(p0[1].multiply(Q(M[0][1])))), frac(q[1].subtract(p0[0].multiply(Q(M[1][0]))).subtract(p0[1].multiply(Q(M[1][1]))))];
        const k = `${t[0]}|${t[1]}`;
        if (seen.has(k)) continue;
        seen.add(k);
        if (this.keeps(M, t)) out.push({ M, t });
      }
    }
    return out;
  }
}

const det2 = (M) => M[0][0] * M[1][1] - M[0][1] * M[1][0];
const tr2 = (M) => M[0][0] + M[1][1];
const rotationOrder = (M) => ({ 2: 1, [-2]: 2, [-1]: 3, 0: 4, 1: 6 })[tr2(M)];
const apply = (M, v) => [v[0].multiply(Q(M[0][0])).add(v[1].multiply(Q(M[0][1]))), v[0].multiply(Q(M[1][0])).add(v[1].multiply(Q(M[1][1])))];
const addv = (a, b) => [a[0].add(b[0]), a[1].add(b[1])];
const span = (k) => {
  const out = [];
  for (let a = -k; a <= k; a++) for (let b = -k; b <= k; b++) out.push([Q(a), Q(b)]);
  return out;
};

/** The facts about a pattern's symmetries that decide its wallpaper group. */
function wallpaperFacts(pat) {
  const ops = pat.symmetries();
  const rot = ops.filter((o) => det2(o.M) === 1);
  const refl = ops.filter((o) => det2(o.M) === -1);
  const n = Math.max(...rot.map((o) => rotationOrder(o.M)));
  // mirrors: a reflection op with some lattice shift L that fixes a point (glide vector (t′ + Mt′)/2 = 0 exactly)
  const mirrorDirs = new Set();
  let properGlide = false;
  for (const o of refl) {
    for (const L of span(2)) {
      const t = addv(o.t, L);
      const g = addv(t, apply(o.M, t)).map((x) => x.divide(Q(2)));
      if (g[0].numerator === 0n && g[1].numerator === 0n) mirrorDirs.add(o.M.flat().join(","));
      else if (!(isInt(g[0]) && isInt(g[1]))) properGlide = true;
    }
  }
  // the centres of rotations of each order, modulo the lattice
  const centres = (order) => {
    const out = new Map();
    for (const o of rot) {
      if (rotationOrder(o.M) !== order) continue;
      // (I − M) c = t + L
      const [[a, b], [c, d]] = [[1 - o.M[0][0], -o.M[0][1]], [-o.M[1][0], 1 - o.M[1][1]]];
      const det = a * d - b * c;
      for (const L of span(3)) {
        const r = addv(o.t, L);
        const cc = [frac(r[0].multiply(Q(d)).subtract(r[1].multiply(Q(b))).divide(Q(det))), frac(r[1].multiply(Q(a)).subtract(r[0].multiply(Q(c))).divide(Q(det)))];
        out.set(`${cc[0]}|${cc[1]}`, cc);
      }
    }
    return [...out.values()];
  };
  // is c on a mirror? some reflection op fixes it: (I − M)c − t is a lattice vector
  const onMirror = (c) =>
    refl.some((o) => {
      const r = [c[0].subtract(apply(o.M, c)[0]).subtract(o.t[0]), c[1].subtract(apply(o.M, c)[1]).subtract(o.t[1])];
      return isInt(r[0]) && isInt(r[1]);
    });
  return { ops, n, reflections: refl.length > 0, mirrorDirections: mirrorDirs.size, properGlide, centres, onMirror };
}

/**
 * The wallpaper group of a pattern, by the usual flowchart: the highest order
 * of rotation, whether there are mirrors, in how many directions, whether
 * there are glide reflections whose axes are not mirrors, and whether the
 * rotation centres lie on mirrors. Returns the name (crystallographic
 * notation, with the orbifold symbol) and the steps.
 */
export function wallpaperGroup(pattern) {
  const pat = new LatticePattern(pattern);
  const f = wallpaperFacts(pat);
  const steps = [`the highest order of rotation is ${f.n}`];
  let name;
  const allOnMirrors = (order) => f.centres(order).every(f.onMirror);
  const mirrors = f.mirrorDirections > 0;
  steps.push(mirrors ? `there are mirrors in ${f.mirrorDirections} direction${f.mirrorDirections === 1 ? "" : "s"}` : f.reflections ? "there are glide reflections but no mirrors" : "there are no reflections or glide reflections");
  if (f.n === 1) {
    if (mirrors) {
      steps.push(f.properGlide ? "some glide axis is not a mirror" : "every glide axis is a mirror");
      name = f.properGlide ? "cm" : "pm";
    } else name = f.reflections ? "pg" : "p1";
  } else if (f.n === 2) {
    if (mirrors && f.mirrorDirections >= 2) {
      const on = allOnMirrors(2);
      steps.push(on ? "every half-turn centre is on a mirror" : "some half-turn centre is off the mirrors");
      name = on ? "pmm" : "cmm";
    } else if (mirrors) name = "pmg";
    else name = f.reflections ? "pgg" : "p2";
  } else if (f.n === 3) {
    if (mirrors) {
      const on = allOnMirrors(3);
      steps.push(on ? "every centre of a third turn is on a mirror" : "some centre of a third turn is off the mirrors");
      name = on ? "p3m1" : "p31m";
    } else name = "p3";
  } else if (f.n === 4) {
    if (mirrors) {
      const on = allOnMirrors(4);
      steps.push(on ? "the centres of quarter turns are on mirrors" : "the centres of quarter turns are off the mirrors");
      name = on ? "p4m" : "p4g";
    } else name = "p4";
  } else name = mirrors ? "p6m" : "p6";
  return Object.freeze({ name, orbifold: ORBIFOLD[name], pointGroupOrder: new Set(f.ops.map((o) => o.M.flat().join(","))).size, symmetries: f.ops.length, steps });
}
const ORBIFOLD = { p1: "o", p2: "2222", pm: "**", pg: "xx", cm: "*x", pmm: "*2222", pmg: "22*", pgg: "22x", cmm: "2*22", p3: "333", p3m1: "*333", p31m: "3*3", p4: "442", p4m: "*442", p4g: "4*2", p6: "632", p6m: "*632" };

/**
 * The seventeen wallpaper groups, each with a lattice (its Gram matrix) and
 * generators x ↦ Mx + t in lattice coordinates, from the standard tables.
 * group.orbit(point) makes a pattern with that symmetry from one point.
 */
const sq = [[1, 0], [0, 1]];
const rect = [[1, 0], [0, 2]];
const obl = [[1, "1/5"], ["1/5", "3/2"]];
const rhomb = [[5, -3], [-3, 5]]; // a centred rectangular lattice in a primitive basis: a = (1, 2), b = (1, −2)
const hex = [[1, "-1/2"], ["-1/2", 1]]; // a = (1, 0), b = (−1/2, √3/2)
const gen = (M, t = [0, 0]) => ({ M, t: t.map((x) => R(x)) });
const R6 = [[1, -1], [1, 0]]; // a sixth turn in the hexagonal basis
const R3 = [[0, -1], [1, -1]]; // a third turn
const R4 = [[0, -1], [1, 0]];
const H = [[-1, 0], [0, -1]];
const GROUPS = {
  p1: { gram: obl, gens: [] },
  p2: { gram: obl, gens: [gen(H)] },
  pm: { gram: rect, gens: [gen([[-1, 0], [0, 1]])] },
  pg: { gram: rect, gens: [gen([[-1, 0], [0, 1]], [0, "1/2"])] },
  cm: { gram: rhomb, gens: [gen([[0, 1], [1, 0]])] },
  pmm: { gram: rect, gens: [gen([[-1, 0], [0, 1]]), gen([[1, 0], [0, -1]])] },
  pmg: { gram: rect, gens: [gen([[-1, 0], [0, 1]]), gen(H, ["1/2", 0])] },
  pgg: { gram: rect, gens: [gen(H), gen([[-1, 0], [0, 1]], ["1/2", "1/2"])] },
  cmm: { gram: rhomb, gens: [gen([[0, 1], [1, 0]]), gen(H)] },
  p3: { gram: hex, gens: [gen(R3)] },
  p3m1: { gram: hex, gens: [gen(R3), gen([[0, -1], [-1, 0]])] },
  p31m: { gram: hex, gens: [gen(R3), gen([[0, 1], [1, 0]])] },
  p4: { gram: sq, gens: [gen(R4)] },
  p4m: { gram: sq, gens: [gen(R4), gen([[-1, 0], [0, 1]])] },
  p4g: { gram: sq, gens: [gen(R4), gen([[-1, 0], [0, 1]], ["1/2", "1/2"])] },
  p6: { gram: hex, gens: [gen(R6)] },
  p6m: { gram: hex, gens: [gen(R6), gen([[0, 1], [1, 0]])] },
};
/** A pattern with the symmetry of the named group: the orbit of one point (or several, labelled) under the generators. */
function orbitPattern(name, seeds) {
  const g = GROUPS[name];
  if (!g) refuse("bad-argument", `the wallpaper groups are ${Object.keys(GROUPS).join(", ")}`);
  const points = [];
  const labels = [];
  const keys = new Set();
  seeds.forEach((s, label) => {
    const queue = [[frac(R(s[0])), frac(R(s[1]))]];
    while (queue.length) {
      const p = queue.pop();
      const k = `${label}|${p[0]}|${p[1]}`;
      if (keys.has(k)) continue;
      keys.add(k);
      points.push(p);
      labels.push(label);
      for (const { M, t } of g.gens) {
        const q = addv(apply(M, p), t).map(frac);
        queue.push(q);
      }
      if (points.length > 500) refuse("too-large", "the orbit is too large");
    }
  });
  return { gram: g.gram, points, labels };
}
export const wallpaper = Object.freeze({
  names: Object.freeze(Object.keys(GROUPS)),
  orbifold: Object.freeze(ORBIFOLD),
  /** pattern(name, seeds): the orbit of the seed points (lattice coordinates, generic ones give a free orbit). */
  pattern: (name, seeds = [["1/7", "2/11"]]) => orbitPattern(name, seeds),
  classify: wallpaperGroup,
});

// ---- friezes ------------------------------------------------------------------------------

const FRIEZE = {
  p1: { conway: "hop", orbifold: "∞∞" },
  p11g: { conway: "step", orbifold: "∞x" },
  p1m1: { conway: "sidle", orbifold: "*∞∞" },
  p2: { conway: "spinning hop", orbifold: "22∞" },
  p2mg: { conway: "spinning sidle", orbifold: "2*∞" },
  p11m: { conway: "jump", orbifold: "∞*" },
  p2mm: { conway: "spinning jump", orbifold: "*22∞" },
};
/**
 * The frieze group of a pattern repeated by the translation (period, 0): give
 * the points of one period (exact coordinates, labels optional). The strip's
 * centre line is the middle of the points' heights, since every symmetry of a
 * frieze keeps the strip. Checks exactly for a horizontal mirror, vertical
 * mirrors, half-turns and a glide reflection.
 */
export function friezeGroup({ points, period = 1, labels = null }) {
  const T = num(period);
  if (!(T instanceof Rational) || N.sign(T) <= 0) refuse("bad-argument", "the period is a positive rational");
  const P = points.map(([x, y]) => [num(x), num(y)]);
  if (P.some(([x, y]) => !(x instanceof Rational) || !(y instanceof Rational))) refuse("bad-argument", "frieze points are rational");
  const lab = labels ?? P.map(() => 0);
  const red = (x) => frac(x.divide(T)).multiply(T);
  const keys = new Set(P.map(([x, y], i) => `${lab[i]}|${red(x)}|${y}`));
  const ys = P.map((p) => p[1]);
  const lo = ys.reduce((a, b) => (a.compareTo(b) <= 0 ? a : b));
  const hi = ys.reduce((a, b) => (a.compareTo(b) >= 0 ? a : b));
  const c = lo.add(hi).divide(Q(2));
  const keeps = (f) => P.every((p, i) => {
    const [x, y] = f(p);
    return keys.has(`${lab[i]}|${red(x)}|${y}`);
  });
  const flipY = (y) => c.add(c).subtract(y);
  const horizontalMirror = keeps(([x, y]) => [x, flipY(y)]);
  const glide = !horizontalMirror && keeps(([x, y]) => [x.add(T.divide(Q(2))), flipY(y)]);
  // vertical mirrors x ↦ 2a − x and half-turns about (a, c): 2a ≡ x₀ + xⱼ (mod T)
  const cands = new Set();
  const twoA = [];
  for (const q of P) {
    const s = red(P[0][0].add(q[0]));
    if (!cands.has(String(s))) {
      cands.add(String(s));
      twoA.push(s);
    }
  }
  const mirrorAt = twoA.find((s) => keeps(([x, y]) => [s.subtract(x), y]));
  const halfTurnAt = twoA.find((s) => keeps(([x, y]) => [s.subtract(x), flipY(y)]));
  const verticalMirror = mirrorAt !== undefined;
  const halfTurn = halfTurnAt !== undefined;
  let name;
  if (horizontalMirror) name = verticalMirror ? "p2mm" : "p11m";
  else if (verticalMirror) name = halfTurn || glide ? "p2mg" : "p1m1";
  else if (halfTurn) name = "p2";
  else name = glide ? "p11g" : "p1";
  return Object.freeze({
    name,
    ...FRIEZE[name],
    horizontalMirror,
    verticalMirror,
    halfTurn,
    glide,
    mirrorAt: verticalMirror ? mirrorAt.divide(Q(2)) : null,
    halfTurnAt: halfTurn ? [halfTurnAt.divide(Q(2)), c] : null,
    centreLine: c,
  });
}
export const friezes = Object.freeze(Object.fromEntries(Object.entries(FRIEZE).map(([k, v]) => [k, Object.freeze({ name: k, ...v })])));
