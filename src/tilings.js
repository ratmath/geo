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

// ---- growing a patch of a tiling ------------------------------------------------------------

const TAU = 2 * Math.PI;
const EPS = 1e-7;
const wrap = (a) => ((a % TAU) + TAU) % TAU;
const sameAngle = (a, b) => {
  const d = Math.abs(wrap(a) - wrap(b));
  return d < 1e-6 || TAU - d < 1e-6;
};
const interior = (n) => (Math.PI * (n - 2)) / n;

/**
 * Grow a patch of an edge-to-edge tiling in which every vertex has this
 * type, out to `radius` (edges of length 1), starting with one vertex at the
 * origin. At each vertex the polygons already there must sit, in angle and
 * in order, inside one rotation or reflection of the type; when only one way
 * fits, the missing polygons are placed. When every open vertex allows more
 * than one way, the nearest takes the first (a choice, counted in
 * `choices`; the first vertex's orientation is one). A vertex where no way
 * fits, or a polygon that would overlap another, ends the growth.
 *
 * Returns { type, ok, polygons: [{ n, points: [[x, y], …] }], vertices,
 * choices, reason? }. With ok, every vertex within radius − 2 of the origin
 * was checked to have exactly the type round it. Coordinates are floats:
 * the picture is estimated, the combinatorics checked.
 */
export function tilingPatch(type, { radius = 5, maxPolygons = 4000 } = {}) {
  const seq = typeof type === "string" ? type.split(".").map(Number) : [...type];
  const sum = seq.reduce((s, n) => s + interior(n), 0);
  if (Math.abs(sum - TAU) > 1e-9) refuse("bad-argument", `${seq.join(".")} does not fill the angle round a point`);
  const variants = [];
  for (const s of [seq, [...seq].reverse()]) for (let r = 0; r < s.length; r++) variants.push([...s.slice(r), ...s.slice(0, r)]);
  const verts = new Map();
  const key = (p) => `${Math.round(p[0] * 1e6)},${Math.round(p[1] * 1e6)}`;
  const vertexAt = (p) => {
    const k = key(p);
    if (!verts.has(k)) verts.set(k, { p, corners: [] });
    return verts.get(k);
  };
  const polygons = [];
  const grid = new Map();
  const cell = (p) => `${Math.floor(p[0] / 2)},${Math.floor(p[1] / 2)}`;
  const near = (c) => {
    const [i, j] = cell(c).split(",").map(Number);
    const out = [];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) out.push(...(grid.get(`${i + a},${j + b}`) ?? []));
    return out;
  };
  const strictlyInside = (q, poly) => {
    const P = poly.points;
    for (let i = 0; i < P.length; i++) {
      const [a, b] = [P[i], P[(i + 1) % P.length]];
      if ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) < EPS) return false;
    }
    return true;
  };
  const place = (v, start, n) => {
    const beta = TAU / n;
    const pts = [v.p];
    for (let k = 1; k < n; k++) {
      const [x, y] = pts[k - 1];
      const d = start + (k - 1) * beta;
      pts.push([x + Math.cos(d), y + Math.sin(d)]);
    }
    const c = pts.reduce((s, q) => [s[0] + q[0] / n, s[1] + q[1] / n], [0, 0]);
    for (const o of near(c)) {
      if (Math.hypot(o.centre[0] - c[0], o.centre[1] - c[1]) < 1e-6) return "duplicate";
      if (strictlyInside(c, o) || strictlyInside(o.centre, { points: pts }) || pts.some((q) => strictlyInside(q, o)) || o.points.some((q) => strictlyInside(q, { points: pts }))) return "overlap";
    }
    const poly = { n, points: pts, centre: c };
    polygons.push(poly);
    const g = cell(c);
    if (!grid.has(g)) grid.set(g, []);
    grid.get(g).push(poly);
    for (let k = 0; k < n; k++) {
      const out = start + k * beta; // direction from vertex k to vertex k+1
      vertexAt(pts[k]).corners.push({ start: wrap(out), n });
    }
    return "ok";
  };
  // the ways the vertex can be completed: lists of [start, n] still to place
  const completions = (v) => {
    const cs = v.corners;
    const base = cs[0];
    const found = new Map();
    for (const c of variants)
      for (let i = 0; i < c.length; i++) {
        if (c[i] !== base.n) continue;
        const wedges = [];
        let a = base.start;
        for (let k = 0; k < c.length; k++) {
          const n = c[(i + k) % c.length];
          wedges.push({ start: wrap(a), n });
          a += interior(n);
        }
        const used = new Set();
        let fits = true;
        for (const x of cs) {
          const w = wedges.findIndex((y, j) => !used.has(j) && y.n === x.n && sameAngle(y.start, x.start));
          if (w < 0) {
            fits = false;
            break;
          }
          used.add(w);
        }
        if (!fits) continue;
        const rest = wedges.filter((_, j) => !used.has(j));
        const k = rest.map((w) => `${Math.round(w.start * 1e6)}:${w.n}`).sort().join("|");
        found.set(k, rest);
      }
    return [...found.values()];
  };
  const full = (v) => Math.abs(v.corners.reduce((s, c) => s + interior(c.n), 0) - TAU) < 1e-9;
  let choices = 0;
  // the first vertex: the type in one orientation
  {
    const v = vertexAt([0, 0]);
    let a = 0;
    for (const n of seq) {
      place(v, a, n);
      a += interior(n);
    }
    choices++;
  }
  const fail = (reason) => Object.freeze({ type: seq.join("."), ok: false, reason, polygons: polygons.map(({ n, points }) => ({ n, points })), vertices: verts.size, choices });
  for (;;) {
    if (polygons.length > maxPolygons) return fail(`more than ${maxPolygons} polygons`);
    const open = [...verts.values()].filter((v) => Math.hypot(...v.p) <= radius && !full(v)).sort((a, b) => Math.hypot(...a.p) - Math.hypot(...b.p));
    if (!open.length) break;
    let progress = false;
    let ambiguous = null;
    for (const v of open) {
      if (full(v)) continue;
      const ways = completions(v);
      if (!ways.length) return fail(`no arrangement of ${seq.join(".")} fits the polygons already round the vertex at (${v.p.map((x) => x.toFixed(3)).join(", ")})`);
      if (ways.length > 1) {
        ambiguous ??= [v, ways[0]];
        continue;
      }
      for (const w of ways[0]) {
        const r = place(v, w.start, w.n);
        if (r === "overlap") return fail(`a ${w.n}-gon at (${v.p.map((x) => x.toFixed(3)).join(", ")}) would overlap another polygon`);
      }
      progress = true;
    }
    if (!progress) {
      if (!ambiguous) break;
      choices++;
      for (const w of ambiguous[1]) {
        const r = place(ambiguous[0], w.start, w.n);
        if (r === "overlap") return fail(`a ${w.n}-gon at (${ambiguous[0].p.map((x) => x.toFixed(3)).join(", ")}) would overlap another polygon`);
      }
    }
  }
  // the check: every inner vertex has exactly the type round it
  const want = canonical(seq).join(".");
  for (const v of verts.values()) {
    if (Math.hypot(...v.p) > radius - 2) continue;
    const order = [...v.corners].sort((a, b) => a.start - b.start).map((c) => c.n);
    if (!full(v) || canonical(order).join(".") !== want) return fail(`the vertex at (${v.p.map((x) => x.toFixed(3)).join(", ")}) has type ${order.join(".")}`);
  }
  return Object.freeze({ type: want, ok: true, polygons: polygons.map(({ n, points }) => ({ n, points })), vertices: verts.size, choices });
}
