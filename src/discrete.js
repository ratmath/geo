// Computational geometry with exact predicates, lattice geometry, and
// metrics other than the Euclidean one. With exact coordinates the
// degenerate cases (three points on a line, four on a circle) that defeat
// floating-point implementations are decided, not guessed.
import { Rational } from "@ratmath/core";
import { num, N, refuse, ZERO, ONE, TWO, Q } from "./num.js";
import { Point, point, cross, dot, orientation, distance, distance2, circumcircle, midpoint } from "./plane.js";

const P = point;
const byXY = (p, q) => N.cmp(p.x, q.x) || N.cmp(p.y, q.y);
const between = (a, b, p) => N.sign(dot(a.minus(p), b.minus(p))) <= 0;
/** is p on the closed segment ab? */
export const onSegment = (a, b, p) => orientation(P(a), P(b), P(p)) === 0 && between(P(a), P(b), P(p));

/** The convex hull, counter-clockwise from the lowest-left point, without the points on its edges. */
export function convexHull(points) {
  const pts = points.map(P).sort(byXY).filter((p, i, all) => i === 0 || !p.equals(all[i - 1]));
  if (pts.length < 3) return pts;
  const build = (list) => {
    const h = [];
    for (const p of list) {
      while (h.length >= 2 && orientation(h[h.length - 2], h[h.length - 1], p) <= 0) h.pop();
      h.push(p);
    }
    h.pop();
    return h;
  };
  return [...build(pts), ...build(pts.slice().reverse())];
}

/**
 * Do the closed segments ab and cd meet? { meets, kind, point } with kind
 * "cross" (one interior point each), "touch" (an endpoint is involved),
 * "overlap" (collinear with a shared stretch) or "none".
 */
export function segmentIntersection(a, b, c, d) {
  const [A, B, C, D] = [a, b, c, d].map(P);
  const [o1, o2, o3, o4] = [orientation(A, B, C), orientation(A, B, D), orientation(C, D, A), orientation(C, D, B)];
  if (o1 === 0 && o2 === 0) {
    // collinear: compare along the line
    const pts = [A, B].sort(byXY);
    const qts = [C, D].sort(byXY);
    const lo = byXY(pts[0], qts[0]) >= 0 ? pts[0] : qts[0];
    const hi = byXY(pts[1], qts[1]) <= 0 ? pts[1] : qts[1];
    const c2 = byXY(lo, hi);
    if (c2 > 0) return { meets: false, kind: "none", point: null };
    return c2 === 0 ? { meets: true, kind: "touch", point: lo } : { meets: true, kind: "overlap", point: null, from: lo, to: hi };
  }
  if (o1 * o2 > 0 || o3 * o4 > 0) return { meets: false, kind: "none", point: null };
  const r = B.minus(A);
  const s = D.minus(C);
  const t = N.div(cross(C.minus(A), s), cross(r, s));
  return { meets: true, kind: o1 * o2 < 0 && o3 * o4 < 0 ? "cross" : "touch", point: A.plus(r.times(t)) };
}

export class Polygon {
  constructor(vertices) {
    this.vertices = vertices.map(P);
    if (this.vertices.length < 3) refuse("degenerate", "a polygon has at least three vertices");
  }
  get edges() {
    return this.vertices.map((p, i) => [p, this.vertices[(i + 1) % this.vertices.length]]);
  }
  /** positive when the vertices run counter-clockwise */
  get signedArea() {
    return N.div(N.sum(...this.edges.map(([p, q]) => cross(p, q))), TWO);
  }
  get area() {
    return N.abs(this.signedArea);
  }
  get perimeter() {
    return N.sum(...this.edges.map(([p, q]) => distance(p, q)));
  }
  get centroid() {
    const a6 = N.mul(Q(6), this.signedArea);
    let x = ZERO;
    let y = ZERO;
    for (const [p, q] of this.edges) {
      const w = cross(p, q);
      x = N.add(x, N.mul(N.add(p.x, q.x), w));
      y = N.add(y, N.mul(N.add(p.y, q.y), w));
    }
    return new Point(N.div(x, a6), N.div(y, a6));
  }
  isConvex() {
    const turns = this.vertices.map((p, i, v) => orientation(p, v[(i + 1) % v.length], v[(i + 2) % v.length])).filter((t) => t !== 0);
    return turns.every((t) => t === turns[0]);
  }
  /** no two edges meet except neighbours at their shared vertex */
  isSimple() {
    const e = this.edges;
    const n = e.length;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const hit = segmentIntersection(...e[i], ...e[j]);
        if (!hit.meets) continue;
        const neighbours = j === i + 1 || (i === 0 && j === n - 1);
        if (!neighbours || hit.kind === "overlap" || hit.kind === "cross") return false;
        const shared = j === i + 1 ? e[i][1] : e[i][0];
        if (!hit.point.equals(shared)) return false;
      }
    }
    return true;
  }
  /** "inside", "boundary" or "outside", exactly */
  locate(p) {
    const pt = P(p);
    let inside = false;
    for (const [a, b] of this.edges) {
      if (onSegment(a, b, pt)) return "boundary";
      // does the edge cross the horizontal ray to the right of pt?
      const up = N.cmp(a.y, pt.y) <= 0 && N.cmp(b.y, pt.y) > 0;
      const down = N.cmp(b.y, pt.y) <= 0 && N.cmp(a.y, pt.y) > 0;
      if (up && orientation(a, b, pt) > 0) inside = !inside;
      if (down && orientation(a, b, pt) < 0) inside = !inside;
    }
    return inside ? "inside" : "outside";
  }
  contains(p) {
    return this.locate(p) !== "outside";
  }
  /** cut into triangles by clipping ears: [[i, j, k], …] as indices into vertices */
  triangulate() {
    if (!this.isSimple()) refuse("not-simple", "only a polygon whose edges do not cross can be triangulated this way");
    const v = this.vertices;
    const ccw = N.sign(this.signedArea) > 0;
    let idx = v.map((_, i) => i);
    if (!ccw) idx.reverse();
    const out = [];
    let guard = 0;
    while (idx.length > 3) {
      if (guard++ > 10 * v.length * v.length) refuse("failed", "no ear found");
      let cut = false;
      for (let i = 0; i < idx.length; i++) {
        const [a, b, c] = [idx[(i + idx.length - 1) % idx.length], idx[i], idx[(i + 1) % idx.length]];
        const turn = orientation(v[a], v[b], v[c]);
        if (turn < 0) continue;
        if (turn === 0) {
          idx.splice(i, 1);
          cut = true;
          break;
        }
        const blocked = idx.some((k) => k !== a && k !== b && k !== c && orientation(v[a], v[b], v[k]) >= 0 && orientation(v[b], v[c], v[k]) >= 0 && orientation(v[c], v[a], v[k]) >= 0);
        if (blocked) continue;
        out.push([a, b, c]);
        idx.splice(i, 1);
        cut = true;
        break;
      }
      if (!cut) refuse("failed", "no ear found");
    }
    if (orientation(v[idx[0]], v[idx[1]], v[idx[2]]) !== 0) out.push(idx);
    return out;
  }
  /** this polygon cut down to a convex one (Sutherland–Hodgman): the intersection, or null when empty */
  clip(convex) {
    const clipper = convex instanceof Polygon ? convex : new Polygon(convex);
    if (!clipper.isConvex()) refuse("not-convex", "the clipping polygon must be convex");
    const cv = N.sign(clipper.signedArea) > 0 ? clipper.vertices : clipper.vertices.slice().reverse();
    let subject = this.vertices;
    for (let i = 0; i < cv.length && subject.length; i++) {
      const [a, b] = [cv[i], cv[(i + 1) % cv.length]];
      const input = subject;
      subject = [];
      for (let k = 0; k < input.length; k++) {
        const [p, q] = [input[k], input[(k + 1) % input.length]];
        const [sp, sq] = [orientation(a, b, p), orientation(a, b, q)];
        if (sp >= 0) subject.push(p);
        if (sp * sq < 0) {
          const r = q.minus(p);
          const t = N.div(cross(a.minus(p), b.minus(a)), cross(r, b.minus(a)));
          subject.push(p.plus(r.times(t)));
        }
      }
    }
    const clean = subject.filter((p, i, all) => !p.equals(all[(i + all.length - 1) % all.length]));
    return clean.length >= 3 ? new Polygon(clean) : null;
  }
  toString() {
    return `polygon ${this.vertices.join(" ")}`;
  }
}
export const polygon = (vertices) => new Polygon(vertices);

/** is d strictly inside the circle through a, b, c? 1 inside, 0 on it, −1 outside (any orientation of abc) */
export function inCircle(a, b, c, d) {
  const [A, B, C, D] = [a, b, c, d].map(P);
  const row = (p) => {
    const dx = N.sub(p.x, D.x);
    const dy = N.sub(p.y, D.y);
    return [dx, dy, N.add(N.sq(dx), N.sq(dy))];
  };
  const [r1, r2, r3] = [row(A), row(B), row(C)];
  const det = N.sum(
    N.mul(r1[0], N.sub(N.mul(r2[1], r3[2]), N.mul(r2[2], r3[1]))),
    N.neg(N.mul(r1[1], N.sub(N.mul(r2[0], r3[2]), N.mul(r2[2], r3[0])))),
    N.mul(r1[2], N.sub(N.mul(r2[0], r3[1]), N.mul(r2[1], r3[0]))),
  );
  return N.sign(det) * orientation(A, B, C);
}

/**
 * The Delaunay triangulation of a set of points (Bowyer–Watson, with the
 * exact in-circle test). { points, triangles: [[i, j, k]], edges, cocircular }.
 * When four or more points lie on one empty circle the triangulation is
 * not unique; one is returned and `cocircular` says so.
 */
export function delaunay(input) {
  const pts = input.map(P).sort(byXY).filter((p, i, all) => i === 0 || !p.equals(all[i - 1]));
  const n = pts.length;
  if (n < 3) refuse("degenerate", "a triangulation needs at least three different points");
  if (pts.every((p) => orientation(pts[0], pts[1], p) === 0)) refuse("degenerate", "all the points are on one line");
  // a triangle that contains everything, far outside
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const [x0, x1, y0, y1] = [xs.reduce(N.min), xs.reduce(N.max), ys.reduce(N.min), ys.reduce(N.max)];
  const span = N.add(N.add(N.sub(x1, x0), N.sub(y1, y0)), ONE);
  const big = N.mul(span, Q(1000));
  const all = [...pts, new Point(N.sub(x0, big), N.sub(y0, span)), new Point(N.add(x1, big), N.sub(y0, span)), new Point(N.div(N.add(x0, x1), TWO), N.add(y1, big))];
  let tris = [[n, n + 1, n + 2]];
  let cocircular = false;
  for (let i = 0; i < n; i++) {
    const bad = [];
    const keep = [];
    for (const t of tris) {
      const s = inCircle(all[t[0]], all[t[1]], all[t[2]], all[i]);
      if (s === 0 && t.every((k) => k < n)) cocircular = true;
      (s > 0 ? bad : keep).push(t);
    }
    // the boundary of the hole: edges that belong to exactly one bad triangle
    const count = new Map();
    for (const t of bad) {
      for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]]) {
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        count.set(key, (count.get(key) ?? 0) + 1);
      }
    }
    tris = keep;
    for (const [key, c] of count) {
      if (c !== 1) continue;
      const [a, b] = key.split(",").map(Number);
      if (orientation(all[a], all[b], all[i]) !== 0) tris.push(orientation(all[a], all[b], all[i]) > 0 ? [a, b, i] : [b, a, i]);
    }
  }
  const triangles = tris.filter((t) => t.every((k) => k < n)).map((t) => t.slice().sort((a, b) => a - b)).sort((s, t) => s[0] - t[0] || s[1] - t[1] || s[2] - t[2]);
  const edges = new Set();
  for (const t of triangles) for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[0], t[2]]]) edges.add(`${a},${b}`);
  return { points: pts, triangles, edges: [...edges].map((e) => e.split(",").map(Number)), cocircular };
}

/**
 * The Voronoi diagram, from the Delaunay triangulation: for each point its
 * cell's corners (the circumcentres of the triangles around it, exact) and
 * whether the cell is unbounded. { points, vertices, cells: [{ site,
 * corners, bounded }], edges: [{ between: [i, j], from, to }] } where an
 * edge with to = null is a ray leaving `from`.
 */
export function voronoi(input) {
  const d = delaunay(input);
  const centre = d.triangles.map((t) => circumcircle(d.points[t[0]], d.points[t[1]], d.points[t[2]]).center);
  const byEdge = new Map();
  d.triangles.forEach((t, ti) => {
    for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[0], t[2]]]) {
      const key = `${a},${b}`;
      byEdge.set(key, [...(byEdge.get(key) ?? []), ti]);
    }
  });
  const edges = [];
  const open = new Set();
  for (const [key, ts] of byEdge) {
    const between = key.split(",").map(Number);
    if (ts.length === 2) {
      if (!centre[ts[0]].equals(centre[ts[1]])) edges.push({ between, from: centre[ts[0]], to: centre[ts[1]] });
    } else {
      between.forEach((i) => open.add(i));
      // the ray leaves the circumcentre away from the triangle's third vertex, along the bisector
      const t = d.triangles[ts[0]];
      const third = d.points[t.find((k) => !between.includes(k))];
      const [p, q] = between.map((i) => d.points[i]);
      const m = midpoint(p, q);
      const normal = new Point(N.sub(q.y, p.y), N.sub(p.x, q.x));
      const outward = N.sign(dot(normal, third.minus(m))) > 0 ? normal.times(-1) : normal;
      edges.push({ between, from: centre[ts[0]], to: null, direction: outward });
    }
  }
  const cells = d.points.map((site, i) => {
    const around = d.triangles.map((t, ti) => (t.includes(i) ? ti : -1)).filter((ti) => ti >= 0);
    const corners = around.map((ti) => centre[ti]).filter((c, k, all) => all.findIndex((o) => o.equals(c)) === k);
    // order the corners by angle around the site
    const half = (v) => (N.sign(v.y) > 0 || (N.sign(v.y) === 0 && N.sign(v.x) > 0) ? 0 : 1);
    corners.sort((u, w) => {
      const [a, b] = [u.minus(site), w.minus(site)];
      return half(a) - half(b) || -N.sign(cross(a, b));
    });
    return { site, corners, bounded: !open.has(i) };
  });
  return { points: d.points, vertices: centre.filter((c, k, all) => all.findIndex((o) => o.equals(c)) === k), cells, edges, cocircular: d.cocircular };
}

/** the two closest points and their distance, exactly */
export function closestPair(input) {
  const pts = input.map(P);
  if (pts.length < 2) refuse("degenerate", "give at least two points");
  let best = null;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const d2 = distance2(pts[i], pts[j]);
      if (best === null || N.cmp(d2, best.distance2) < 0) best = { points: [pts[i], pts[j]], distance2: d2 };
    }
  }
  return { ...best, distance: N.sqrt(best.distance2) };
}

// ---- lattice geometry ----------------------------------------------------------

const gcd = (a, b) => {
  [a, b] = [a < 0n ? -a : a, b < 0n ? -b : b];
  while (b) [a, b] = [b, a % b];
  return a;
};
const whole = (x, what) => {
  const q = num(x);
  if (!(q instanceof Rational) || q.denominator !== 1n) refuse("not-lattice", `${what} must have whole-number coordinates`);
  return q.numerator;
};
/** the number of lattice points on the closed segment from p to q (both lattice points) */
export function latticePointsOn(p, q) {
  const [a, b] = [P(p), P(q)];
  return Number(gcd(whole(b.x, "a lattice point") - whole(a.x, "a lattice point"), whole(b.y, "a lattice point") - whole(a.y, "a lattice point"))) + 1;
}
/**
 * Pick's theorem on a simple polygon with lattice vertices:
 * area = I + B/2 − 1. The boundary points B come from gcds, the interior
 * points I are counted one by one, and the area from the shoelace formula,
 * so the three are found independently and `holds` is a real check.
 */
export function pick(vertices) {
  const poly = vertices instanceof Polygon ? vertices : new Polygon(vertices);
  if (!poly.isSimple()) refuse("not-simple", "Pick's theorem is for polygons whose edges do not cross");
  const v = poly.vertices;
  v.forEach((p) => (whole(p.x, "a vertex"), whole(p.y, "a vertex")));
  const boundary = poly.edges.reduce((s, [p, q]) => s + latticePointsOn(p, q) - 1, 0);
  const xs = v.map((p) => p.x.numerator);
  const ys = v.map((p) => p.y.numerator);
  const [x0, x1, y0, y1] = [xs.reduce((a, b) => (a < b ? a : b)), xs.reduce((a, b) => (a > b ? a : b)), ys.reduce((a, b) => (a < b ? a : b)), ys.reduce((a, b) => (a > b ? a : b))];
  if ((x1 - x0) * (y1 - y0) > 4000000n) refuse("too-large", "the bounding box has more than four million lattice points to test");
  let interior = 0;
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) if (poly.locate(new Point(new Rational(x), new Rational(y))) === "inside") interior++;
  const area = poly.area;
  const formula = N.sub(N.add(Q(interior), Q(boundary, 2)), ONE);
  return { area, interior, boundary, formula, holds: N.eq(area, formula) };
}
/** can (x, y) be seen from the origin, with no lattice point in the way? */
export const isVisible = (x, y) => gcd(whole(x, "the point"), whole(y, "the point")) === 1n;
/**
 * Lattice points (x, y) with 1 ≤ x, y ≤ n visible from the origin: the
 * exact count and its share, which tends to 6/π² ≈ 0.6079.
 */
export function visiblePoints(n) {
  if (!Number.isInteger(n) || n < 1 || n > 3000) refuse("bad-size", "n is a whole number from 1 to 3000");
  let count = 0;
  for (let x = 1n; x <= BigInt(n); x++) for (let y = 1n; y <= BigInt(n); y++) if (gcd(x, y) === 1n) count++;
  return { n, count, share: new Rational(BigInt(count), BigInt(n * n)), limit: "6/π² ≈ 0.6079271019" };
}

// ---- other metrics -------------------------------------------------------------

const NORMS = {
  euclidean: (dx, dy) => N.sqrt(N.add(N.sq(dx), N.sq(dy))),
  taxicab: (dx, dy) => N.add(N.abs(dx), N.abs(dy)),
  chebyshev: (dx, dy) => N.max(N.abs(dx), N.abs(dy)),
};
/**
 * The plane with another way to measure distance: "taxicab" (|dx| + |dy|),
 * "chebyshev" (max(|dx|, |dy|)) or "euclidean". { distance, circle,
 * bisector, ellipse, pi }.
 */
export function metric(name = "taxicab") {
  const norm = NORMS[name] ?? refuse("bad-metric", "the metric is taxicab, chebyshev or euclidean");
  const d = (p, q) => {
    const v = P(p).minus(P(q));
    return norm(v.x, v.y);
  };
  const polygonal = name !== "euclidean";
  const need = () => polygonal || refuse("not-polygonal", "this is for the taxicab and Chebyshev metrics, whose circles are polygons");
  /** the level set { p : f(p) = level } of a convex piecewise-linear function whose kinks lie on the given vertical and horizontal lines */
  const levelSet = (f, level, xsK, ysK) => {
    const span = N.add(N.abs(level), ONE);
    const lo = (ks) => N.sub(ks.reduce(N.min), N.mul(span, Q(4)));
    const hi = (ks) => N.add(ks.reduce(N.max), N.mul(span, Q(4)));
    const pts = [];
    const solve = (g, breaks, make) => {
      // g is convex and piecewise linear with kinks at `breaks`: find where it equals level
      const ks = [...breaks].sort(N.cmp);
      const grid = [lo(ks), ...ks, hi(ks)];
      for (let i = 0; i + 1 < grid.length; i++) {
        const [a, b] = [grid[i], grid[i + 1]];
        if (N.eq(a, b)) continue;
        const [ga, gb] = [N.sub(g(a), level), N.sub(g(b), level)];
        if (N.isZero(ga)) pts.push(make(a));
        if (N.isZero(gb)) pts.push(make(b));
        if (N.sign(ga) * N.sign(gb) < 0) pts.push(make(N.add(a, N.mul(N.sub(b, a), N.div(ga, N.sub(ga, gb))))));
      }
    };
    for (const x of xsK) solve((y) => f(new Point(x, y)), ysK, (y) => new Point(x, y));
    for (const y of ysK) solve((x) => f(new Point(x, y)), xsK, (x) => new Point(x, y));
    return convexHull(pts);
  };
  return {
    name,
    distance: d,
    /** the "circle" of radius r about c: its corner points for the polygonal metrics */
    circle(center, radius) {
      need();
      const c = P(center);
      const r = num(radius);
      const at = (dx, dy) => new Point(N.add(c.x, dx), N.add(c.y, dy));
      const m = N.neg(r);
      return name === "taxicab" ? [at(r, ZERO), at(ZERO, r), at(m, ZERO), at(ZERO, m)] : [at(r, r), at(m, r), at(m, m), at(r, m)];
    },
    /** circumference ÷ diameter of a circle, measured in this metric: 4 for both polygonal metrics */
    get pi() {
      if (!polygonal) return "π";
      const c = this.circle([0, 0], 1);
      const around = N.sum(...c.map((p, i) => d(p, c[(i + 1) % 4])));
      return N.div(around, TWO);
    },
    /**
     * The points at equal distance from p and q, for the taxicab metric:
     * { segments, regions }. In general it is a bent line of three pieces
     * (the outer two run off to infinity and are given as rays); when
     * |dx| = |dy| the two ends are whole quarter-planes instead.
     */
    bisector(p, q) {
      if (name !== "taxicab") refuse("unsupported", "bisectors are worked out here for the taxicab metric");
      const [A, B] = [P(p), P(q)];
      if (A.equals(B)) refuse("degenerate", "the two points are the same");
      const dx = N.sub(B.x, A.x);
      const dy = N.sub(B.y, A.y);
      const m = midpoint(A, B);
      const [adx, ady] = [N.abs(dx), N.abs(dy)];
      if (N.isZero(dx)) return { segments: [], rays: [{ from: m, direction: new Point(1, 0) }, { from: m, direction: new Point(-1, 0) }], regions: [], kind: "a horizontal line" };
      if (N.isZero(dy)) return { segments: [], rays: [{ from: m, direction: new Point(0, 1) }, { from: m, direction: new Point(0, -1) }], regions: [], kind: "a vertical line" };
      // the middle piece has slope ∓1 and spans the smaller of the two extents
      const s = N.sign(dx) * N.sign(dy);
      const h = N.div(N.min(adx, ady), TWO);
      const e1 = new Point(N.sub(m.x, h), N.add(m.y, N.mul(Q(s), h)));
      const e2 = new Point(N.add(m.x, h), N.sub(m.y, N.mul(Q(s), h)));
      const c = N.cmp(adx, ady);
      if (c === 0) {
        return { segments: [[e1, e2]], rays: [], regions: [{ corner: e1, quadrant: [new Point(-1, 0), new Point(0, s)] }, { corner: e2, quadrant: [new Point(1, 0), new Point(0, -s)] }], kind: "a segment joining two quarter-planes" };
      }
      // wider than tall: the ends are vertical rays; taller than wide: horizontal
      const rays = c > 0 ? [{ from: e1, direction: new Point(0, s) }, { from: e2, direction: new Point(0, -s) }] : [{ from: e1, direction: new Point(-1, 0) }, { from: e2, direction: new Point(1, 0) }];
      return { segments: [[e1, e2]], rays, regions: [], kind: "a bent line of three pieces" };
    },
    /** the points whose distances to two foci add up to `sum`: the corners of the polygon (taxicab or Chebyshev) */
    ellipse(f1, f2, sum) {
      need();
      const [F1, F2] = [P(f1), P(f2)];
      const s = num(sum);
      if (N.cmp(s, d(F1, F2)) <= 0) refuse("degenerate", "the sum must be more than the distance between the foci");
      const f = (p) => N.add(d(p, F1), d(p, F2));
      if (name === "taxicab") return levelSet(f, s, [F1.x, F2.x], [F1.y, F2.y]);
      // Chebyshev is the taxicab metric turned 45° and scaled: (x, y) ↦ ((x + y)/2, (x − y)/2)
      const to = (p) => new Point(N.div(N.add(p.x, p.y), TWO), N.div(N.sub(p.x, p.y), TWO));
      const back = (p) => new Point(N.add(p.x, p.y), N.sub(p.x, p.y));
      return convexHull(metric("taxicab").ellipse(to(F1), to(F2), s).map(back));
    },
  };
}
