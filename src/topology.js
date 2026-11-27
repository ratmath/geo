// Topology of surfaces and simplicial complexes, computed exactly.
//
// A surface is given the way textbooks draw it: polygons whose edges are
// glued in pairs, each polygon read as a word in edge labels ("a b a^-1 b^-1"
// is the torus). Gluing identifies corners, and the cells (vertices, edges,
// faces) give a chain complex whose homology comes from @ratmath/structures.
// A simplicial complex is given by its maximal simplices; its faces, boundary
// maps, homology and fundamental group follow, and a triangulated surface is
// recognised and classified the same way as a glued polygon.
//
// The classification theorem: a closed connected surface is a sphere, a
// connected sum of g tori, or a connected sum of k projective planes, and
// orientability with the Euler characteristic decides which. With b boundary
// circles, χ = 2 − 2g − b (orientable) or 2 − k − b (not).

import { chainComplex, presentation } from "@ratmath/structures";
import { GeoError } from "./num.js";

const refuse = (code, message) => {
  throw new GeoError(code, message);
};

// ---- edge words -----------------------------------------------------------------------------

/** "a b a^-1 b^-1", "aba⁻¹b⁻¹" or "a b a' b'" → [{ label, exp }]. Labels are a letter and optional digits. */
export function parseEdgeWord(text) {
  if (Array.isArray(text)) return text.map((t) => (typeof t === "string" ? { label: t, exp: 1 } : { label: t.label, exp: t.exp < 0 ? -1 : 1 }));
  const src = String(text).replace(/⁻¹/g, "^-1").replace(/−/g, "-");
  const out = [];
  const re = /\s*([A-Za-z][0-9]*)\s*(\^\s*\(?\s*-1\s*\)?|\^\s*\(?\s*1\s*\)?|')?/y;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) refuse("bad-argument", `cannot read the edge word at "${src.slice(pos)}": use letters such as a, b1 and inverses a^-1 or a'`);
    out.push({ label: m[1], exp: m[2] && /-1|'/.test(m[2]) ? -1 : 1 });
    pos = re.lastIndex;
  }
  if (!out.length) refuse("bad-argument", "an edge word needs at least one edge");
  return out;
}

export const formatEdgeWord = (w) => w.map((t) => (t.exp < 0 ? `${t.label}^-1` : t.label)).join(" ");

const invertWord = (w) => w.map((t) => ({ label: t.label, exp: -t.exp })).reverse();

class UnionFind {
  constructor(n) {
    this.p = Array.from({ length: n }, (_, i) => i);
  }
  find(i) {
    while (this.p[i] !== i) i = this.p[i] = this.p[this.p[i]];
    return i;
  }
  union(i, j) {
    const [a, b] = [this.find(i), this.find(j)];
    if (a !== b) this.p[Math.max(a, b)] = Math.min(a, b);
  }
}

// ---- classification -------------------------------------------------------------------------

/**
 * The surface with this Euler characteristic, orientability and number of
 * boundary circles, by the classification theorem: its genus (or number of
 * cross-caps), name and normal-form word.
 */
export function classifySurface({ eulerCharacteristic, euler, orientable, boundaryComponents = 0 }) {
  const chi = eulerCharacteristic ?? euler;
  if (!Number.isInteger(chi)) refuse("bad-argument", "classifySurface needs the Euler characteristic as a whole number");
  if (typeof orientable !== "boolean") refuse("bad-argument", "classifySurface needs orientable: true or false");
  const b = boundaryComponents;
  const twice = 2 - chi - b;
  let genus = null;
  let crosscaps = null;
  if (orientable) {
    if (twice < 0 || twice % 2) refuse("not-a-surface", `no orientable surface has χ = ${chi} with ${b} boundary circle${b === 1 ? "" : "s"}`);
    genus = twice / 2;
  } else {
    if (twice < 1) refuse("not-a-surface", `no non-orientable surface has χ = ${chi} with ${b} boundary circle${b === 1 ? "" : "s"}`);
    crosscaps = twice;
  }
  let base;
  if (orientable) base = genus === 0 ? "sphere" : genus === 1 ? "torus" : `connected sum of ${genus} tori`;
  else base = crosscaps === 1 ? "projective plane" : crosscaps === 2 ? "Klein bottle" : `connected sum of ${crosscaps} projective planes`;
  let name = base;
  if (b) {
    if (orientable && genus === 0 && b === 1) name = "disk";
    else if (orientable && genus === 0 && b === 2) name = "annulus";
    else if (!orientable && crosscaps === 1 && b === 1) name = "Möbius band";
    else name = `${base} with ${b} hole${b === 1 ? "" : "s"}`;
  }
  // normal form: a1 b1 a1⁻¹ b1⁻¹ … or a1 a1 a2 a2 …, then x_j c_j x_j⁻¹ for each boundary circle
  const parts = [];
  if (orientable) for (let i = 1; i <= genus; i++) parts.push(`a${i} b${i} a${i}^-1 b${i}^-1`);
  else for (let i = 1; i <= crosscaps; i++) parts.push(`a${i} a${i}`);
  for (let j = 1; j <= b; j++) parts.push(`x${j} c${j} x${j}^-1`);
  const normalForm = parts.length ? parts.join(" ") : "a a^-1";
  return Object.freeze({ eulerCharacteristic: chi, orientable, genus, crosscaps, boundaryComponents: b, closed: b === 0, name, normalForm });
}

// ---- glued polygons -------------------------------------------------------------------------

export class Surface {
  /** faces: edge words (text or token lists), glued along equal labels. */
  constructor(faces, { name = null } = {}) {
    const words = (Array.isArray(faces) && faces.length && (typeof faces[0] === "string" || Array.isArray(faces[0])) ? faces : [faces]).map(parseEdgeWord);
    this.faces = Object.freeze(words.map((w) => Object.freeze(w.map((t) => Object.freeze(t)))));
    this.name = name;
    // occurrences of each label
    const occ = new Map();
    words.forEach((w, f) => w.forEach((t, i) => {
      if (!occ.has(t.label)) occ.set(t.label, []);
      occ.get(t.label).push({ face: f, pos: i, exp: t.exp });
    }));
    for (const [label, l] of occ) if (l.length > 2) refuse("not-a-surface", `edge ${label} appears ${l.length} times; each edge is glued at most once (two appearances)`);
    this.edges = Object.freeze([...occ.keys()]);
    this._occ = occ;
    // connected: faces linked by shared edges
    const uf = new UnionFind(words.length);
    for (const l of occ.values()) if (l.length === 2) uf.union(l[0].face, l[1].face);
    if (words.some((_, f) => uf.find(f) !== 0)) refuse("not-connected", "the polygons do not form one connected surface");
    // corners: corner (f, i) starts token i of face f
    const start = [];
    let c = 0;
    for (const w of words) {
      start.push(c);
      c += w.length;
    }
    const corner = (f, i) => start[f] + (i % words[f].length);
    const cu = new UnionFind(c);
    const tail = new Map();
    const head = new Map();
    for (const [label, l] of occ) {
      const ends = l.map(({ face, pos, exp }) => (exp > 0 ? [corner(face, pos), corner(face, pos + 1)] : [corner(face, pos + 1), corner(face, pos)]));
      for (let k = 1; k < ends.length; k++) {
        cu.union(ends[0][0], ends[k][0]);
        cu.union(ends[0][1], ends[k][1]);
      }
      tail.set(label, ends[0][0]);
      head.set(label, ends[0][1]);
    }
    const classes = new Map();
    for (let i = 0; i < c; i++) {
      const r = cu.find(i);
      if (!classes.has(r)) classes.set(r, classes.size);
    }
    const vOf = (i) => classes.get(cu.find(i));
    this.vertexCount = classes.size;
    this._ends = new Map(this.edges.map((e) => [e, [vOf(tail.get(e)), vOf(head.get(e))]]));
    this.boundaryEdges = Object.freeze(this.edges.filter((e) => occ.get(e).length === 1));
    // orientability: o(f1)·o(f2) = −e1·e2 for each glued pair
    const o = Array(words.length).fill(0);
    o[0] = 1;
    let orientable = true;
    const queue = [0];
    while (queue.length) {
      const f = queue.shift();
      for (const [, l] of occ) {
        if (l.length !== 2) continue;
        const [p, q] = l;
        if (p.face === q.face) {
          if (p.face === f && p.exp === q.exp) orientable = false;
          continue;
        }
        const [me, other] = p.face === f ? [p, q] : q.face === f ? [q, p] : [null, null];
        if (!me) continue;
        const want = -o[f] * me.exp * other.exp;
        if (!o[other.face]) {
          o[other.face] = want;
          queue.push(other.face);
        } else if (o[other.face] !== want) orientable = false;
      }
    }
    this.orientable = orientable;
    this._orientation = orientable ? o : null;
    // boundary circles: components of the boundary edges over the vertices
    const bu = new UnionFind(this.vertexCount);
    const touched = new Set();
    for (const e of this.boundaryEdges) {
      const [a, b] = this._ends.get(e);
      bu.union(a, b);
      touched.add(a);
      touched.add(b);
    }
    this.boundaryComponents = new Set([...touched].map((v) => bu.find(v))).size;
    Object.freeze(this);
  }

  /** The cell counts [V, E, F]. */
  get cells() {
    return [this.vertexCount, this.edges.length, this.faces.length];
  }
  get eulerCharacteristic() {
    return this.vertexCount - this.edges.length + this.faces.length;
  }
  get closed() {
    return this.boundaryComponents === 0;
  }

  /** ∂1 (a row per vertex, a column per edge: head − tail) and ∂2 (a row per edge, a column per face). */
  get boundaryMatrices() {
    const V = this.vertexCount;
    const d1 = Array.from({ length: V }, () => Array(this.edges.length).fill(0));
    this.edges.forEach((e, j) => {
      const [t, h] = this._ends.get(e);
      d1[h][j] += 1;
      d1[t][j] -= 1;
    });
    const idx = new Map(this.edges.map((e, i) => [e, i]));
    const d2 = this.edges.map(() => Array(this.faces.length).fill(0));
    this.faces.forEach((w, f) => w.forEach((t) => (d2[idx.get(t.label)][f] += t.exp)));
    return [d1, d2];
  }

  /** The cellular chain complex (a structures ChainComplex). */
  chainComplex() {
    return chainComplex(this.boundaryMatrices, { sizes: this.cells });
  }
  /** H_k as an AbelianGroup (or a vector space with { coefficients: "Q" | "Z/p" }). */
  homology(k, options) {
    return this.chainComplex().homology(k, options);
  }
  homologyGroups(options) {
    return this.chainComplex().homologyGroups(options);
  }
  betti(options) {
    return this.chainComplex().betti(options);
  }

  /** Which surface this is: genus or cross-caps, boundary circles, name and normal form. */
  classify() {
    return classifySurface({ eulerCharacteristic: this.eulerCharacteristic, orientable: this.orientable, boundaryComponents: this.boundaryComponents });
  }

  /**
   * π₁ as a structures Presentation: contract a spanning tree of the edges,
   * the other edges are the generators and each face word (tree edges
   * deleted) is a relator.
   */
  fundamentalGroup() {
    const tree = spanningTree(this.vertexCount, this.edges.map((e) => this._ends.get(e)));
    const gens = this.edges.filter((_, i) => !tree.has(i));
    const keep = new Set(gens);
    const rels = this.faces.map((w) => formatEdgeWord(w.filter((t) => keep.has(t.label)))).filter(Boolean);
    return presentation(gens, rels);
  }

  /** The same surface as one polygon, by gluing faces along shared edges. */
  singleFace() {
    if (this.faces.length === 1) return this;
    let faces = this.faces.map((w) => [...w]);
    while (faces.length > 1) {
      let found = null;
      for (let i = 0; i < faces.length && !found; i++) {
        for (const t of faces[i]) {
          const j = faces.findIndex((w, k) => k !== i && w.some((u) => u.label === t.label));
          if (j >= 0) {
            found = [i, j, t.label];
            break;
          }
        }
      }
      const [i, j, x] = found;
      let A = faces[i];
      let B = faces[j];
      const ea = A.find((t) => t.label === x).exp;
      if (B.find((t) => t.label === x).exp === ea) B = invertWord(B);
      const ia = A.findIndex((t) => t.label === x);
      A = [...A.slice(ia + 1), ...A.slice(0, ia)]; // u, with x removed from the end
      const ib = B.findIndex((t) => t.label === x);
      B = [...B.slice(ib + 1), ...B.slice(0, ib)]; // v, with x⁻¹ removed from the front
      let merged = [...A, ...B];
      if (!merged.length) merged = [{ label: x, exp: 1 }, { label: x, exp: -1 }];
      faces = faces.filter((_, k) => k !== i && k !== j);
      faces.push(merged);
    }
    return new Surface([faces[0]], { name: this.name });
  }

  /** The connected sum with another closed surface: the two words side by side, labels renamed apart. */
  connectedSum(other) {
    const T = other instanceof Surface ? other : surface(other);
    if (!this.closed || !T.closed) refuse("unsupported", "connected sums are of closed surfaces in this version");
    const a = this.singleFace().faces[0];
    const b = T.singleFace().faces[0];
    const used = new Set(a.map((t) => t.label));
    const rename = new Map();
    for (const t of b) {
      if (rename.has(t.label)) continue;
      let name = t.label;
      if (used.has(name)) {
        const letter = name[0];
        let k = 1;
        while (used.has(`${letter}${k}`) || [...rename.values()].includes(`${letter}${k}`)) k++;
        name = `${letter}${k}`;
      }
      rename.set(t.label, name);
      used.add(name);
    }
    return new Surface([[...a, ...b.map((t) => ({ label: rename.get(t.label), exp: t.exp }))]]);
  }

  toString() {
    return this.faces.map(formatEdgeWord).join(" | ");
  }
}

/**
 * A surface from glued polygons: one edge word, or a list of them.
 *
 *   surface("a b a^-1 b^-1")      // torus
 *   surface("a a")                // projective plane
 *   surface("a b a^-1 b")         // Klein bottle
 *   surface(["a b c", "c^-1 b^-1 a^-1"])   // a sphere from two triangles
 */
export function surface(faces, options) {
  return new Surface(faces, options);
}

function spanningTree(n, ends) {
  const uf = new UnionFind(n);
  const tree = new Set();
  ends.forEach(([a, b], i) => {
    if (uf.find(a) !== uf.find(b)) {
      uf.union(a, b);
      tree.add(i);
    }
  });
  return tree;
}

// ---- simplicial complexes -------------------------------------------------------------------

const cmpV = (a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0);
const keyOf = (s) => JSON.stringify(s);

export class SimplicialComplex {
  /** From maximal simplices, each a list of vertex labels (numbers or strings). */
  constructor(simplices, { name = null } = {}) {
    if (!Array.isArray(simplices) || !simplices.length) refuse("bad-argument", "a simplicial complex needs at least one simplex");
    const byDim = [];
    const seen = new Set();
    for (const s0 of simplices) {
      if (!Array.isArray(s0) || !s0.length) refuse("bad-argument", "each simplex is a nonempty list of vertices");
      const s = [...new Set(s0)].sort(cmpV);
      if (s.length !== s0.length) refuse("bad-argument", `the simplex [${s0}] repeats a vertex`);
      if (s.length > 16) refuse("unsupported", "simplices of dimension above 15 are not supported");
      for (let m = 1; m < 1 << s.length; m++) {
        const f = s.filter((_, i) => (m >> i) & 1);
        const k = keyOf(f);
        if (seen.has(k)) continue;
        seen.add(k);
        (byDim[f.length - 1] ??= []).push(f);
      }
    }
    for (const l of byDim) l.sort((x, y) => {
      for (let i = 0; i < x.length; i++) {
        const c = cmpV(x[i], y[i]);
        if (c) return c;
      }
      return 0;
    });
    this._faces = byDim.map((l) => Object.freeze(l.map((f) => Object.freeze(f))));
    this._index = byDim.map((l) => new Map(l.map((f, i) => [keyOf(f), i])));
    this.dimension = byDim.length - 1;
    this.vertices = Object.freeze(byDim[0].map((f) => f[0]));
    this.name = name;
    // facets: faces in no larger face
    const inLarger = new Set();
    for (let d = 1; d <= this.dimension; d++) for (const f of byDim[d]) for (let i = 0; i < f.length; i++) inLarger.add(keyOf(f.filter((_, t) => t !== i)));
    this.facets = Object.freeze(byDim.flat().filter((f) => !inLarger.has(keyOf(f))));
    Object.freeze(this);
  }

  /** The k-dimensional faces, each a sorted list of vertices. */
  faces(k) {
    return this._faces[k] ?? [];
  }
  /** [f0, f1, …]: the number of faces in each dimension. */
  get fVector() {
    return this._faces.map((l) => l.length);
  }
  get eulerCharacteristic() {
    return this.fVector.reduce((s, n, k) => s + (k % 2 ? -n : n), 0);
  }
  get isPure() {
    return this.facets.every((f) => f.length === this.dimension + 1);
  }

  /** ∂_k: a row per (k−1)-face, a column per k-face; the face without vertex i has sign (−1)^i. */
  boundary(k) {
    if (k < 1 || k > this.dimension) return null;
    const rows = this._faces[k - 1];
    const M = rows.map(() => Array(this._faces[k].length).fill(0));
    this._faces[k].forEach((f, j) => f.forEach((_, i) => {
      M[this._index[k - 1].get(keyOf(f.filter((_, t) => t !== i)))][j] += i % 2 ? -1 : 1;
    }));
    return M;
  }

  /** The simplicial chain complex (a structures ChainComplex). */
  chainComplex() {
    return chainComplex(Array.from({ length: this.dimension }, (_, i) => this.boundary(i + 1)), { sizes: this.fVector });
  }
  homology(k, options) {
    return this.chainComplex().homology(k, options);
  }
  homologyGroups(options) {
    return this.chainComplex().homologyGroups(options);
  }
  betti(options) {
    return this.chainComplex().betti(options);
  }

  /** The link of a vertex: the faces σ with v ∉ σ and σ ∪ {v} a face. */
  link(v) {
    const out = [];
    for (const f of this.facets) if (f.includes(v) && f.length > 1) out.push(f.filter((u) => u !== v));
    return out.length ? new SimplicialComplex(out) : null;
  }

  /** The components of the 1-skeleton, as lists of vertices. */
  components() {
    const idx = new Map(this.vertices.map((v, i) => [keyOf(v), i]));
    const uf = new UnionFind(this.vertices.length);
    for (const [a, b] of this.faces(1)) uf.union(idx.get(keyOf(a)), idx.get(keyOf(b)));
    const groups = new Map();
    this.vertices.forEach((v, i) => {
      const r = uf.find(i);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r).push(v);
    });
    return [...groups.values()];
  }
  get isConnected() {
    return this.components().length === 1;
  }

  /**
   * Whether this is a triangulated surface: pure of dimension 2, each edge in
   * one or two triangles, and the link of each vertex a circle or an arc.
   * Returns { surface: boolean, reason? }.
   */
  surfaceCheck() {
    if (this.dimension !== 2 || !this.isPure) return { surface: false, reason: "not pure of dimension 2" };
    const count = new Map();
    for (const t of this.faces(2)) for (let i = 0; i < 3; i++) {
      const k = keyOf(t.filter((_, s) => s !== i));
      count.set(k, (count.get(k) ?? 0) + 1);
    }
    for (const [k, c] of count) if (c > 2) return { surface: false, reason: `edge ${k} is in ${c} triangles` };
    for (const v of this.vertices) {
      const L = this.link(v);
      const edges = L.faces(1);
      const deg = new Map();
      for (const [a, b] of edges) {
        deg.set(keyOf(a), (deg.get(keyOf(a)) ?? 0) + 1);
        deg.set(keyOf(b), (deg.get(keyOf(b)) ?? 0) + 1);
      }
      if ([...deg.values()].some((d) => d > 2) || !L.isConnected || L.dimension !== 1) return { surface: false, reason: `the link of vertex ${v} is not a circle or an arc` };
    }
    return { surface: true };
  }
  get isSurface() {
    return this.surfaceCheck().surface;
  }

  /** The triangulated surface as glued triangles: each edge a label, each triangle a word. */
  toSurface() {
    const check = this.surfaceCheck();
    if (!check.surface) refuse("not-a-surface", `not a triangulated surface: ${check.reason}`);
    if (!this.isConnected) refuse("not-connected", "the complex is not connected");
    const lab = (a, b) => `e${this._index[1].get(keyOf([a, b])) + 1}`;
    const words = this.faces(2).map(([a, b, c]) => [{ label: lab(a, b), exp: 1 }, { label: lab(b, c), exp: 1 }, { label: lab(a, c), exp: -1 }]);
    return new Surface(words, { name: this.name });
  }
  /** The classification of a triangulated surface (same result as from a glued polygon). */
  classify() {
    return this.toSurface().classify();
  }

  /** π₁ as a structures Presentation, from a spanning tree of the 1-skeleton (connected complexes). */
  fundamentalGroup() {
    if (!this.isConnected) refuse("not-connected", "π₁ needs a connected complex");
    const vi = new Map(this.vertices.map((v, i) => [keyOf(v), i]));
    const edges = this.faces(1);
    const tree = spanningTree(this.vertices.length, edges.map(([a, b]) => [vi.get(keyOf(a)), vi.get(keyOf(b))]));
    const name = (i) => `e${i + 1}`;
    const gens = edges.map((_, i) => i).filter((i) => !tree.has(i)).map(name);
    const keep = new Set(gens);
    const lab = (a, b) => name(this._index[1].get(keyOf([a, b])));
    const rels = this.faces(2)
      .map(([a, b, c]) => [lab(a, b), lab(b, c), `${lab(a, c)}^-1`].filter((t) => keep.has(t.replace("^-1", ""))).join(" "))
      .filter(Boolean);
    return presentation(gens, rels);
  }

  toString() {
    return `simplicial complex: f-vector (${this.fVector.join(", ")}), ${this.facets.length} facets`;
  }
}

/** A simplicial complex from its maximal simplices. */
export function simplicialComplex(simplices, options) {
  return new SimplicialComplex(simplices, options);
}

const range = (n, from = 1) => Array.from({ length: n }, (_, i) => i + from);

/** Named complexes and ways to make one. */
export const simplicial = Object.freeze({
  /** The n-simplex: one simplex on vertices 1 … n + 1. */
  simplex: (n) => new SimplicialComplex([range(n + 1)], { name: `${n}-simplex` }),
  /** The n-sphere as the boundary of the (n + 1)-simplex. */
  sphere(n) {
    const V = range(n + 2);
    return new SimplicialComplex(V.map((v) => V.filter((u) => u !== v)), { name: `${n}-sphere` });
  },
  /** Möbius and Császár's 7-vertex torus: every pair of vertices is an edge. */
  torus: () =>
    new SimplicialComplex(
      [[1, 2, 4], [2, 3, 5], [3, 4, 6], [4, 5, 7], [5, 6, 1], [6, 7, 2], [7, 1, 3], [1, 2, 6], [2, 3, 7], [3, 4, 1], [4, 5, 2], [5, 6, 3], [6, 7, 4], [7, 1, 5]],
      { name: "torus" },
    ),
  /** The 6-vertex projective plane (the hemi-icosahedron). */
  projectivePlane: () =>
    new SimplicialComplex([[1, 2, 3], [1, 3, 4], [1, 4, 5], [1, 5, 6], [1, 6, 2], [2, 3, 5], [3, 4, 6], [4, 5, 2], [5, 6, 3], [6, 2, 4]], { name: "projective plane" }),
  /** A Klein bottle from a 3 × 4 grid of squares, the long sides glued with a flip. */
  kleinBottle() {
    const [m, n] = [3, 4];
    const v = (i, j) => {
      let [x, y] = [((i % m) + m) % m, j];
      if (y === n) [x, y] = [(m - x) % m, 0];
      return y * m + x + 1;
    };
    const tris = [];
    for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
      tris.push([v(i, j), v(i + 1, j), v(i + 1, j + 1)]);
      tris.push([v(i, j), v(i, j + 1), v(i + 1, j + 1)]);
    }
    return new SimplicialComplex(tris, { name: "Klein bottle" });
  },
  /**
   * A graph as a 1-dimensional complex: { vertices, edges } with edges as
   * pairs, or a discrete Graph (vertices() and edges() with from and to).
   */
  fromGraph(G) {
    const vs = typeof G.vertices === "function" ? G.vertices() : G.vertices;
    const es = (typeof G.edges === "function" ? G.edges() : G.edges).map((e) => (Array.isArray(e) ? e : [e.from, e.to]));
    const used = new Set(es.flat().map(keyOf));
    const loose = (vs ?? []).filter((v) => !used.has(keyOf(v))).map((v) => [v]);
    if (es.some(([a, b]) => keyOf(a) === keyOf(b))) refuse("unsupported", "a loop is not a simplex");
    return new SimplicialComplex([...es, ...loose], { name: "graph" });
  },
  /** The boundary of a polyhedron, each face split into triangles from its first vertex. */
  fromPolyhedron(P) {
    const tris = [];
    for (const f of P.faces) for (let i = 1; i + 1 < f.length; i++) tris.push([f[0] + 1, f[i] + 1, f[i + 1] + 1]);
    return new SimplicialComplex(tris, { name: P.name ?? "polyhedron" });
  },
});
