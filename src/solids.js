// Convex polyhedra with exact coordinates: the Platonic solids, some
// Archimedean ones, prisms, and any convex hull of exact points.
//
// Coordinates are rationals or algebraic numbers (the dodecahedron and
// icosahedron live in Q(√5), the truncated cube in Q(√2)). Faces are found in
// floating point and then proved exactly: every vertex of a face is on its
// plane and every other vertex is strictly inside. Euler's formula, volumes,
// dihedral angles and duals are then exact; the symmetry group is an
// algebraic PermGroup on the vertices whose generators are checked exactly.
import { PermGroup } from "@ratmath/algebraic";
import { num, N, refuse, ZERO, ONE, Q } from "./num.js";

const v3 = (p) => {
  if (!Array.isArray(p) || p.length !== 3) refuse("bad-argument", "a point of space is [x, y, z]");
  return p.map(num);
};
const sub3 = (a, b) => a.map((x, i) => N.sub(x, b[i]));
const add3 = (a, b) => a.map((x, i) => N.add(x, b[i]));
const scale3 = (a, k) => a.map((x) => N.mul(x, k));
const dot3 = (a, b) => N.sum(N.mul(a[0], b[0]), N.mul(a[1], b[1]), N.mul(a[2], b[2]));
const cross3 = (u, v) => [N.sub(N.mul(u[1], v[2]), N.mul(u[2], v[1])), N.sub(N.mul(u[2], v[0]), N.mul(u[0], v[2])), N.sub(N.mul(u[0], v[1]), N.mul(u[1], v[0]))];
const det3 = (a, b, c) => dot3(a, cross3(b, c));
const f3 = (p) => p.map((x) => N.toNumber(x));
const fsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const fdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const fcross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const fnorm = (a) => Math.sqrt(fdot(a, a));

/** Faces of the convex hull of float points: lists of vertex indices in counter-clockwise order seen from outside. */
function floatHullFaces(P) {
  const n = P.length;
  const c = P.reduce((s, p) => [s[0] + p[0] / n, s[1] + p[1] / n, s[2] + p[2] / n], [0, 0, 0]);
  const scale = Math.max(...P.map((p) => fnorm(fsub(p, c))));
  const tol = 1e-9 * scale;
  const seen = new Set();
  const faces = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    let nv = fcross(fsub(P[j], P[i]), fsub(P[k], P[i]));
    const len = fnorm(nv);
    if (len < tol * scale) continue;
    nv = nv.map((x) => x / len);
    const d = fdot(nv, P[i]);
    let pos = 0;
    let neg = 0;
    const on = [];
    for (let m = 0; m < n; m++) {
      const s = fdot(nv, P[m]) - d;
      if (s > tol) pos++;
      else if (s < -tol) neg++;
      else on.push(m);
    }
    if (pos && neg) continue;
    if (pos) nv = nv.map((x) => -x);
    const key = on.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    // order counter-clockwise around the face's centre, seen from outside (along +nv)
    const fc = on.reduce((s, m) => [s[0] + P[m][0] / on.length, s[1] + P[m][1] / on.length, s[2] + P[m][2] / on.length], [0, 0, 0]);
    const e1 = fsub(P[on[0]], fc);
    const e1n = e1.map((x) => x / fnorm(e1));
    const e2 = fcross(nv, e1n);
    const ang = (m) => {
      const w = fsub(P[m], fc);
      return Math.atan2(fdot(w, e2), fdot(w, e1n));
    };
    faces.push([...on].sort((a, b) => ang(a) - ang(b)));
  }
  return faces;
}

/** A convex polyhedron with exact vertices and faces (each a cycle of vertex numbers, counter-clockwise from outside). */
export class Polyhedron {
  constructor(vertices, faces = null, { name = "polyhedron", check = true } = {}) {
    this.vertices = Object.freeze(vertices.map((p) => Object.freeze(v3(p))));
    if (this.vertices.length < 4) refuse("degenerate", "a polyhedron needs at least four vertices");
    this.name = name;
    const fl = this.vertices.map(f3);
    this.faces = Object.freeze((faces ?? floatHullFaces(fl)).map((f) => Object.freeze([...f])));
    // the centre: the average of the vertices, exact
    const n = this.vertices.length;
    this.center = Object.freeze(this.vertices.reduce(add3).map((x) => N.div(x, num(n))));
    // planes n·x = d with outward normals, exact
    this._planes = this.faces.map((f) => {
      const [a, b, c] = f.slice(0, 3).map((i) => this.vertices[i]);
      const nv = cross3(sub3(b, a), sub3(c, a));
      return { n: nv, d: dot3(nv, a) };
    });
    if (check) this._verify();
    Object.freeze(this);
  }
  /** Prove the faces: each is planar, the rest of the solid is strictly on the inner side, and every vertex is on some face. */
  _verify() {
    const used = new Set();
    this.faces.forEach((f, k) => {
      const { n, d } = this._planes[k];
      if (f.length < 3) refuse("degenerate", "a face needs three vertices");
      if (N.sign(N.sub(dot3(n, this.center), d)) >= 0) refuse("not-convex", `face ${k} is not oriented outward, or the solid is flat`);
      for (let i = 0; i < this.vertices.length; i++) {
        const s = N.sign(N.sub(dot3(n, this.vertices[i]), d));
        if (f.includes(i)) {
          if (s !== 0) refuse("not-convex", `vertex ${i} is off the plane of face ${k}`);
          used.add(i);
        } else if (s >= 0) refuse("not-convex", `vertex ${i} is not strictly inside the plane of face ${k}`);
      }
    });
    if (used.size !== this.vertices.length) refuse("not-convex", "some vertex is not a corner of the hull");
  }
  get V() {
    return this.vertices.length;
  }
  get F() {
    return this.faces.length;
  }
  /** The edges as sorted pairs of vertex numbers. */
  get edges() {
    const s = new Map();
    for (const f of this.faces) f.forEach((a, i) => {
      const b = f[(i + 1) % f.length];
      const e = a < b ? [a, b] : [b, a];
      s.set(e.join(","), e);
    });
    return [...s.values()];
  }
  get E() {
    return this.edges.length;
  }
  /** V − E + F, which is 2 for every convex polyhedron. */
  get euler() {
    return this.V - this.E + this.F;
  }
  /** How many faces of each size, e.g. { 3: 8, 4: 6 }. */
  get faceCounts() {
    const c = {};
    for (const f of this.faces) c[f.length] = (c[f.length] ?? 0) + 1;
    return c;
  }
  /** The sizes of the faces around vertex i in cyclic order, e.g. "3.4.3.4". */
  vertexConfiguration(i) {
    const around = this.faces.map((f, k) => [f, k]).filter(([f]) => f.includes(i));
    // follow the faces around the vertex: the face after f contains the edge (i, previous vertex of f)
    const out = [];
    let [f] = around[0];
    for (let step = 0; step < around.length; step++) {
      out.push(f.length);
      const prev = f[(f.indexOf(i) - 1 + f.length) % f.length];
      const next = around.find(([g]) => g !== f && g[(g.indexOf(i) + 1) % g.length] === prev);
      if (!next) break;
      f = next[0];
    }
    // canonical: the least rotation (or reflection) of the cycle
    const rots = [];
    for (const seq of [out, [...out].reverse()]) for (let r = 0; r < seq.length; r++) rots.push([...seq.slice(r), ...seq.slice(0, r)].join("."));
    return rots.sort()[0];
  }
  /** The distinct vertex configurations (one for a vertex-transitive solid). */
  get vertexConfigurations() {
    return [...new Set(this.vertices.map((_, i) => this.vertexConfiguration(i)))];
  }
  /** The squared edge lengths that occur (one value when all edges are equal). */
  get edgeLengths2() {
    const out = [];
    for (const [a, b] of this.edges) {
      const d = dot3(sub3(this.vertices[a], this.vertices[b]), sub3(this.vertices[a], this.vertices[b]));
      if (!out.some((x) => N.eq(x, d))) out.push(d);
    }
    return out;
  }
  /** The volume, exactly: a sum of tetrahedra from the centre. */
  get volume() {
    let vol = ZERO;
    for (const f of this.faces) {
      const a = sub3(this.vertices[f[0]], this.center);
      for (let i = 1; i + 1 < f.length; i++) vol = N.add(vol, det3(a, sub3(this.vertices[f[i]], this.center), sub3(this.vertices[f[i + 1]], this.center)));
    }
    return N.div(vol, num(6));
  }
  /** Twice the area vector of face k (its length is twice the area). */
  _areaVector(k) {
    const f = this.faces[k];
    let s = [ZERO, ZERO, ZERO];
    for (let i = 0; i < f.length; i++) s = add3(s, cross3(this.vertices[f[i]], this.vertices[f[(i + 1) % f.length]]));
    return s;
  }
  /** The area of face k, exactly. */
  faceArea(k) {
    const s = this._areaVector(k);
    return N.div(N.sqrt(dot3(s, s)), num(2));
  }
  /** The total surface area: exact, a sum over the distinct face areas. */
  get surfaceArea() {
    // group faces by squared area so equal faces are added by multiplication
    const groups = [];
    this.faces.forEach((_, k) => {
      const s = this._areaVector(k);
      const a2 = dot3(s, s);
      const g = groups.find((x) => N.eq(x.a2, a2));
      if (g) g.count++;
      else groups.push({ a2, count: 1 });
    });
    return groups.map((g) => N.mul(num(g.count), N.div(N.sqrt(g.a2), num(2)))).reduce(N.add);
  }
  /**
   * The cosines of the dihedral angles (the angle inside the solid between two
   * faces along an edge), exactly; each distinct value once.
   */
  get dihedralCosines() {
    const out = [];
    const faceOf = new Map();
    this.faces.forEach((f, k) => f.forEach((a, i) => faceOf.set(`${a},${f[(i + 1) % f.length]}`, k)));
    for (const [a, b] of this.edges) {
      const n1 = this._planes[faceOf.get(`${a},${b}`)].n;
      const n2 = this._planes[faceOf.get(`${b},${a}`)].n;
      // interior angle θ has cos θ = −n1·n2/(|n1||n2|)
      const c2num = N.sq(dot3(n1, n2));
      const c2 = N.div(c2num, N.mul(dot3(n1, n1), dot3(n2, n2)));
      const c = N.mul(num(N.sign(dot3(n1, n2)) > 0 ? -1 : 1), N.sqrt(c2));
      if (!out.some((x) => N.eq(x, c))) out.push(c);
    }
    return out;
  }
  /**
   * The dual, by reciprocation in a sphere about the centre: the plane
   * n·(x − c) = d of each face becomes the vertex c + n/d, and each vertex
   * becomes a face through the duals of the faces around it.
   */
  dual({ name = null } = {}) {
    const c = this.center;
    const verts = this._planes.map(({ n, d }) => add3(c, scale3(n, N.div(ONE, N.sub(d, dot3(n, c))))));
    const faces = this.vertices.map((_, i) => {
      const around = this.faces.map((f, k) => [f, k]).filter(([f]) => f.includes(i));
      const out = [];
      let [f, k] = around[0];
      for (let step = 0; step < around.length; step++) {
        out.push(k);
        const next = f[(f.indexOf(i) + 1) % f.length];
        const g = around.find(([h]) => h !== f && h[(h.indexOf(i) - 1 + h.length) % h.length] === next);
        if (!g) break;
        [f, k] = g;
      }
      return out.reverse();
    });
    return new Polyhedron(verts, faces, { name: name ?? `dual of the ${this.name}` });
  }
  /**
   * The symmetry group, as a PermGroup on the vertices, with the rotations
   * as a subgroup. Candidate symmetries are linear maps (about the centre)
   * sending one vertex and two of its neighbours to another such triple;
   * they are found in floating point with a wide margin, and each generator
   * of the group is then checked exactly (MᵀM = I and M sends the vertex
   * set onto itself).
   */
  symmetry() {
    const c = f3(this.center);
    const P = this.vertices.map((p) => fsub(f3(p), c));
    const n = P.length;
    const adj = Array.from({ length: n }, () => new Set());
    for (const [a, b] of this.edges) {
      adj[a].add(b);
      adj[b].add(a);
    }
    const [a0, a1, a2] = [0, ...[...adj[0]].slice(0, 2)];
    const A = [P[a0], P[a1], P[a2]];
    const Ainv = finv([0, 1, 2].map((i) => [A[0][i], A[1][i], A[2][i]]));
    const scale = Math.max(...P.map(fnorm));
    const close = (u, v) => fnorm(fsub(u, v)) < 1e-7 * scale;
    const perms = [];
    const isom = [];
    for (let i = 0; i < n; i++) for (const j of adj[i]) for (const k of adj[i]) {
      if (j === k) continue;
      const B = [0, 1, 2].map((r) => [P[i][r], P[j][r], P[k][r]]);
      const M = fmul(B, Ainv);
      const perm = [];
      for (let m = 0; m < n; m++) {
        const w = fapply(M, P[m]);
        const t = P.findIndex((q) => close(q, w));
        if (t < 0) break;
        perm.push(t);
      }
      if (perm.length === n && new Set(perm).size === n) {
        perms.push(perm);
        isom.push({ perm, frame: [i, j, k], det: fdet(M) });
      }
    }
    const key = (p) => p.join(",");
    const uniq = [...new Map(isom.map((x) => [key(x.perm), x])).values()];
    const gens = [];
    let G = null;
    for (const x of uniq) {
      if (x.perm.every((y, m) => y === m)) continue;
      const H = new PermGroup([...gens.map((g) => g.perm), x.perm], n);
      if (!G || H.order > G.order) {
        gens.push(x);
        G = H;
      }
      if (G.order === uniq.length) break;
    }
    // exact check of each generator
    for (const g of gens) this._checkSymmetry(g.perm, g.frame, [a0, a1, a2]);
    const rot = uniq.filter((x) => x.det > 0);
    const rgens = [];
    let R = null;
    for (const x of rot) {
      if (x.perm.every((y, m) => y === m)) continue;
      const H = new PermGroup([...rgens, x.perm], n);
      if (!R || H.order > R.order) {
        rgens.push(x.perm);
        R = H;
      }
      if (R.order === rot.length) break;
    }
    const order = uniq.length;
    const rotations = rot.length;
    return Object.freeze({ order, rotations, group: G, rotationGroup: R, name: symmetryName(order, rotations, this) });
  }
  _checkSymmetry(perm, frame, base) {
    const c = this.center;
    const A = base.map((i) => sub3(this.vertices[i], c));
    const B = frame.map((i) => sub3(this.vertices[i], c));
    // M = B A⁻¹ with columns: M aᵢ = bᵢ
    const Ac = [0, 1, 2].map((r) => [A[0][r], A[1][r], A[2][r]]);
    const Bc = [0, 1, 2].map((r) => [B[0][r], B[1][r], B[2][r]]);
    const d = det3(Ac[0], Ac[1], Ac[2]);
    const adjT = [cross3(Ac[1], Ac[2]), cross3(Ac[2], Ac[0]), cross3(Ac[0], Ac[1])];
    const inv = [0, 1, 2].map((r) => [0, 1, 2].map((s) => N.div(adjT[s][r], d)));
    const M = Bc.map((row) => [0, 1, 2].map((s) => N.sum(N.mul(row[0], inv[0][s]), N.mul(row[1], inv[1][s]), N.mul(row[2], inv[2][s]))));
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
      const e = N.sum(N.mul(M[0][i], M[0][j]), N.mul(M[1][i], M[1][j]), N.mul(M[2][i], M[2][j]));
      if (!N.eq(e, i === j ? ONE : ZERO)) refuse("not-proven", "a symmetry found in floating point is not an isometry exactly");
    }
    this.vertices.forEach((v, m) => {
      const w = sub3(v, c);
      const img = M.map((row) => dot3(row, w));
      if (!img.every((x, r) => N.eq(x, sub3(this.vertices[perm[m]], c)[r]))) refuse("not-proven", "a symmetry found in floating point does not map the vertices exactly");
    });
  }
  toString() {
    return `${this.name}: ${this.V} vertices, ${this.E} edges, ${this.F} faces`;
  }
}

const fmul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
const fapply = (M, v) => M.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const fdet = (M) => fdot(M[0], fcross(M[1], M[2]));
function finv(M) {
  const d = fdet(M);
  const c = [fcross(M[1], M[2]), fcross(M[2], M[0]), fcross(M[0], M[1])];
  return [0, 1, 2].map((i) => [0, 1, 2].map((j) => c[j][i] / d));
}
function symmetryName(order, rotations, P) {
  if (rotations === 12 && order === 24) return "full tetrahedral (Td, order 24)";
  if (rotations === 12 && order === 12) return "chiral tetrahedral (T, order 12)";
  if (rotations === 24 && order === 48) return "full octahedral (Oh, order 48)";
  if (rotations === 24 && order === 24) return "chiral octahedral (O, order 24)";
  if (rotations === 60 && order === 120) return "full icosahedral (Ih, order 120)";
  if (rotations === 60) return "chiral icosahedral (I, order 60)";
  return `order ${order} (${rotations} rotations)`;
}

/** The convex hull of exact points of space. */
export const polyhedron = (points, options) => new Polyhedron(points, null, options);

const signs = (p) => {
  // all sign changes of the non-zero coordinates
  let out = [[]];
  for (const x of p) out = out.flatMap((s) => (x === 0 || (typeof x === "string" && x === "0") ? [[...s, x]] : [[...s, x], [...s, neg(x)]]));
  return out;
};
const neg = (x) => (typeof x === "number" ? -x : N.neg(num(x)));
const cyc = (p) => [p, [p[1], p[2], p[0]], [p[2], p[0], p[1]]];
const allPerm = (p) => [p, [p[0], p[2], p[1]], [p[1], p[0], p[2]], [p[1], p[2], p[0]], [p[2], p[0], p[1]], [p[2], p[1], p[0]]];
const dedupe = (pts) => {
  const out = [];
  for (const p of pts.map(v3)) if (!out.some((q) => q.every((x, i) => N.eq(x, p[i])))) out.push(p);
  return out;
};
const even = (p) => {
  // the even permutations of (x, y, z): the cyclic ones
  return cyc(p);
};

/** The classical solids with exact coordinates. */
export const solids = Object.freeze({
  tetrahedron: () => polyhedron([[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]], { name: "tetrahedron" }),
  cube: () => polyhedron(signs([1, 1, 1]), { name: "cube" }),
  octahedron: () => polyhedron(dedupe(signs([1, 0, 0]).flatMap(cyc)), { name: "octahedron" }),
  /** vertices (±1, ±1, ±1) and the cyclic shifts of (0, ±1/φ, ±φ), φ = (1 + √5)/2 */
  dodecahedron: () => {
    const phi = N.div(N.add(ONE, num("sqrt(5)")), num(2));
    const iphi = N.sub(phi, ONE);
    return polyhedron([...signs([1, 1, 1]), ...signs([0, iphi, phi]).flatMap(even)], { name: "dodecahedron" });
  },
  /** the cyclic shifts of (0, ±1, ±φ) */
  icosahedron: () => {
    const phi = N.div(N.add(ONE, num("sqrt(5)")), num(2));
    return polyhedron(signs([0, 1, phi]).flatMap(even), { name: "icosahedron" });
  },
  /** the permutations of (±1, ±1, 0) */
  cuboctahedron: () => polyhedron(dedupe(signs([1, 1, 0]).flatMap(cyc)), { name: "cuboctahedron" }),
  /** the permutations of (0, ±1, ±2) */
  truncatedOctahedron: () => polyhedron(dedupe(signs([0, 1, 2]).flatMap(allPerm)), { name: "truncated octahedron" }),
  /** the permutations of (±1, ±1, ±3) with an even number of minus signs */
  truncatedTetrahedron: () =>
    polyhedron(dedupe(signs([1, 1, 3]).filter((p) => p.filter((x) => Number(x) < 0).length % 2 === 0).flatMap(allPerm)), { name: "truncated tetrahedron" }),
  /** the permutations of (±(√2 − 1), ±1, ±1) */
  truncatedCube: () => {
    const x = N.sub(num("sqrt(2)"), ONE);
    return polyhedron(dedupe(signs([x, 1, 1]).flatMap(cyc)), { name: "truncated cube" });
  },
});

/** The prism over a regular n-gon (vertices cos(2πk/n), sin(2πk/n), ±h), exact. */
export function prism(n, { height = 1 } = {}) {
  if (!Number.isInteger(n) || n < 3) refuse("bad-argument", "a prism needs n ≥ 3");
  const h = num(height);
  const pts = [];
  for (const z of [h, N.neg(h)]) for (let k = 0; k < n; k++) pts.push([N.cosPi(Q(2 * k, n)), N.sinPi(Q(2 * k, n)), z]);
  return polyhedron(pts, { name: `${n}-gonal prism` });
}
