// Tilings of the plane by regular polygons, counted around a vertex.
//
// Polygons with n₁, …, n_k sides fit around a point exactly when their
// angles add up to a full turn: Σ (1 − 2/nᵢ) = 2, a statement about
// rationals. That gives 21 vertex types. A tiling in which every vertex has
// the same type (a uniform, or Archimedean, tiling) exists for 11 of them.
// For the other 10 a short argument rules it out, and the program carries it
// out: walking round an odd-sided polygon, the polygons on its edges would
// have to alternate between two different kinds, which an odd cycle cannot do.
import { Rational } from "@ratmath/core";
import { refuse } from "./num.js";

const q = (n, d = 1) => new Rational(BigInt(n), BigInt(d));
/** The interior angle of a regular n-gon, as a fraction of a full turn: (n − 2)/(2n). */
export const polygonAngle = (n) => {
  if (!Number.isInteger(n) || n < 3) refuse("bad-argument", "a polygon has at least three sides");
  return q(n - 2, 2 * n);
};

const canonical = (seq) => {
  const rots = [];
  for (const s of [seq, [...seq].reverse()]) for (let r = 0; r < s.length; r++) rots.push([...s.slice(r), ...s.slice(0, r)]);
  rots.sort((a, b) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  });
  return rots[0];
};

/** Every way regular polygons can fill the space around a point, up to rotation and reflection: 21 cyclic sequences. */
export function vertexTypes() {
  const out = new Map();
  const full = q(1);
  // at most 6 polygons (each angle ≥ 1/6 of a turn); a polygon with n sides needs the rest to fill 1 − angle
  const rec = (seq, sum) => {
    if (sum.equals(full) && seq.length >= 3) {
      // every arrangement of this multiset around the point
      perms(seq).forEach((p) => {
        const c = canonical(p);
        out.set(c.join("."), c);
      });
      return;
    }
    if (seq.length >= 6 || sum.compareTo(full) >= 0) return;
    const rest = full.subtract(sum);
    const start = seq.length ? seq[seq.length - 1] : 3;
    // at least m more polygons, each with angle ≥ this one's: m·angle ≤ rest (one polygon's angle is < 1/2)
    let m = Math.max(1, 3 - seq.length);
    if (rest.compareTo(q(1, 2)) >= 0) m = Math.max(m, 2);
    for (let n = start; polygonAngle(n).multiply(q(m)).compareTo(rest) <= 0; n++) rec([...seq, n], sum.add(polygonAngle(n)));
  };
  rec([], q(0));
  return [...out.values()].sort((a, b) => a.length - b.length || a.join(".").localeCompare(b.join("."), undefined, { numeric: true }));
}
function perms(arr) {
  if (arr.length <= 1) return [arr];
  const out = [];
  const seen = new Set();
  arr.forEach((x, i) => {
    if (seen.has(x)) return;
    seen.add(x);
    for (const p of perms([...arr.slice(0, i), ...arr.slice(i + 1)])) out.push([x, ...p]);
  });
  return out;
}

const UNIFORM = new Set(["3.3.3.3.3.3", "4.4.4.4", "6.6.6", "3.6.3.6", "3.12.12", "4.6.12", "4.8.8", "3.4.6.4", "3.3.3.3.6", "3.3.3.4.4", "3.3.4.3.4"]);

/**
 * Can every vertex of a tiling have this type? Returns the verdict and the
 * reason: for the 10 impossible types, the odd polygon round which the
 * neighbours would have to alternate; for the 11 possible ones, that the
 * tiling exists (the Archimedean tilings, known since Kepler, 1619).
 */
export function uniformTiling(type) {
  const seq = typeof type === "string" ? type.split(".").map(Number) : [...type];
  const sum = seq.reduce((s, n) => s.add(polygonAngle(n)), q(0));
  if (!sum.equals(q(1))) return Object.freeze({ type: seq.join("."), fits: false, uniform: false, reason: `the angles add up to ${sum} of a full turn, not 1` });
  const c = canonical(seq).join(".");
  for (const n of new Set(seq)) {
    if (n % 2 === 0) continue;
    // the pairs of neighbours an n-gon can have at a vertex of this type
    const pairs = [];
    seq.forEach((m, i) => {
      if (m === n) pairs.push([seq[(i - 1 + seq.length) % seq.length], seq[(i + 1) % seq.length]]);
    });
    // label the n edges of the polygon by the polygon across each, so that consecutive edges form an allowed pair:
    // a closed walk of length n in the graph whose edges are the allowed pairs
    if (!closedWalk(pairs, n)) {
      const shown = [...new Set(pairs.map((p) => `${p[0]} and ${p[1]}`))].join(", or ");
      return Object.freeze({ type: c, fits: true, uniform: false, reason: `round a ${n}-gon the polygons on its edges would have to alternate (its neighbours at a vertex are ${shown}), and ${n} is odd` });
    }
  }
  if (!UNIFORM.has(c)) refuse("internal", `no argument for ${c}`);
  return Object.freeze({ type: c, fits: true, uniform: true, reason: "the tiling exists: one of the 3 regular and 8 semiregular tilings (Kepler, 1619)" });
}
/** Is there a closed walk of exactly n steps in the graph with these (undirected) edges? */
function closedWalk(pairs, n) {
  const nodes = [...new Set(pairs.flat())];
  const idx = new Map(nodes.map((x, i) => [x, i]));
  const k = nodes.length;
  const A = Array.from({ length: k }, () => new Array(k).fill(false));
  for (const [a, b] of pairs) {
    A[idx.get(a)][idx.get(b)] = true;
    A[idx.get(b)][idx.get(a)] = true;
  }
  // reachable[i][j] after exactly s steps, by dynamic programming
  for (let s0 = 0; s0 < k; s0++) {
    let cur = new Array(k).fill(false);
    cur[s0] = true;
    for (let step = 0; step < n; step++) {
      const nxt = new Array(k).fill(false);
      for (let i = 0; i < k; i++) if (cur[i]) for (let j = 0; j < k; j++) if (A[i][j]) nxt[j] = true;
      cur = nxt;
    }
    if (cur[s0]) return true;
  }
  return false;
}

/**
 * The regular tilings {p, q}: q regular p-gons at each vertex. The angle
 * condition q(p − 2)/(2p) = 1 is (p − 2)(q − 2) = 4, whose only solutions are
 * {3, 6}, {4, 4} and {6, 3}.
 */
export function regularTilings() {
  const out = [];
  for (let p = 3; p <= 6; p++) for (let qq = 3; qq <= 6; qq++) if ((p - 2) * (qq - 2) === 4) out.push({ p, q: qq, symbol: `{${p}, ${qq}}`, dual: `{${qq}, ${p}}` });
  return out;
}
