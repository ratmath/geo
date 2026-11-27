// Pictures of geometry (roadmap phase 7), drawn by @ratmath/graphics, and
// the join between geo's plane kernel and graphics'.
//
// Graphics has exact plane geometry over Q(√d): enough to draw, not enough
// for an incentre. Geo's kernel works over all real algebraic numbers. The
// two meet here:
//   toGraphics(x)    a geo point, line, circle or polygon as the graphics
//                    object with the same exact coordinates, when each one
//                    is rational or of the form a + b√d (refused otherwise)
//   fromGraphics(x)  a graphics point, line, circle or polygon in geo
// and, for drawing anything, geo objects become figure shapes at their
// float values (the picture is a picture; the exact objects stay in geo).
//
//   geoFigure          points, lines, circles, segments, polygons, triangles
//   constructionFrames a Construction step by step
//   tilingFigure       a patch of the tiling with a vertex type (grown and
//                      checked by tilingPatch)
//   solidPicture       a Polyhedron, lit, faces coloured by number of sides
//   wallpaperFigure    a lattice pattern repeated over a few cells
//   incidenceFigure    a finite geometry as its Levi graph (points against lines)
//   hyperbolicFigure   points, lines, triangles and circles of the hyperbolic
//                      plane in the Poincaré disc, the Klein disc or the half-plane
//   hyperbolicTilingFigure  the tiling {p, q} in either disc
import { Rational } from "@ratmath/core";
import * as G from "@ratmath/graphics";
import { N, num, refuse } from "./num.js";
import { Point, Line, Circle, Triangle } from "./plane.js";
import { Polygon } from "./discrete.js";
import { tilingPatch } from "./tilings.js";
import { HPoint, HIdeal, HLine, HTriangle, HCircle, hyperbolicTiling } from "./hyperbolic.js";

// ---- the join -------------------------------------------------------------------------------

/** An exact number as a graphics Surd a + b√d, or null when it is not of that form. */
export function toSurd(x) {
  const v = num(x);
  if (v instanceof Rational) return G.surd(v);
  const p = v.poly;
  if (!p || p.length !== 3) return null;
  // c0 + c1·x + c2·x² = 0, so x = (−c1 ± √(c1² − 4c0c2)) / (2c2)
  const [c0, c1, c2] = p.map((c) => BigInt(c));
  const disc = c1 * c1 - 4n * c0 * c2;
  const a = new Rational(-c1, 2n * c2);
  const b = new Rational(1n, 2n * c2);
  const plus = G.surd(a, b, disc);
  const minus = G.surd(a, b.negate(), disc);
  const f = N.toNumber(v);
  return Math.abs(plus.toNumber() - f) < Math.abs(minus.toNumber() - f) ? plus : minus;
}
const fromSurd = (s) => {
  if (s.b.numerator === 0n) return s.a;
  return N.add(s.a, N.mul(s.b, N.sqrt(new Rational(s.d))));
};
const needSurd = (x, what) => toSurd(x) ?? refuse("not-in-graphics", `${what} is ${N.text(x)}, which is not rational or of the form a + b√d, so graphics cannot hold it exactly`);

/** A geo point, line, circle, polygon or triangle as the graphics object with the same exact coordinates. */
export function toGraphics(x) {
  if (x instanceof Point) return G.point(needSurd(x.x, "x"), needSurd(x.y, "y"));
  if (x instanceof Line) return G.line({ a: needSurd(x.a, "a"), b: needSurd(x.b, "b"), c: needSurd(N.neg(x.c), "c") });
  if (x instanceof Circle) return G.circle(toGraphics(x.center), { r2: needSurd(x.radius2, "the squared radius") });
  if (x instanceof Polygon) return G.polygon(x.vertices.map(toGraphics));
  if (x instanceof Triangle) return G.polygon([x.A, x.B, x.C].map(toGraphics));
  refuse("bad-argument", "toGraphics takes a point, line, circle, polygon or triangle");
}
/** A graphics point, line, circle or polygon in geo. */
export function fromGraphics(x) {
  if (x instanceof G.Point) return new Point(fromSurd(x.x), fromSurd(x.y));
  if (x instanceof G.Line) return new Line(fromSurd(x.a), fromSurd(x.b), N.neg(fromSurd(x.c)));
  if (x instanceof G.Circle) return new Circle(fromGraphics(x.center), fromSurd(G.surd(x.r2)));
  if (x instanceof G.Polygon) return new Polygon(x.vertices.map(fromGraphics));
  refuse("bad-argument", "fromGraphics takes a graphics point, line, circle or polygon");
}

// ---- drawing geo objects ----------------------------------------------------------------------

const xy = (p) => p.toNumbers();
/** Shapes for one geo object (floats of its exact values). Lines are cut to the window. */
function shapesFor(obj, style, win) {
  const o = obj?.item ?? obj;
  const s = { color: obj?.color, width: obj?.width, dash: obj?.dash, fill: obj?.fill, fillAlpha: obj?.fillAlpha };
  const out = [];
  if (o instanceof Point) {
    out.push(G.dot(xy(o), { r: 4, ...s, ...style }));
    if (obj?.label) out.push(G.text(xy(o), obj.label, { anchor: "ne", color: s.color, size: 13 }));
  } else if (o instanceof Line) {
    const [a, b, c] = [o.a, o.b, o.c].map(N.toNumber);
    const [x0, x1] = win.x;
    const [y0, y1] = win.y;
    const pts = Math.abs(b) > Math.abs(a) ? [[x0, -(a * x0 + c) / b], [x1, -(a * x1 + c) / b]] : [[-(b * y0 + c) / a, y0], [-(b * y1 + c) / a, y1]];
    out.push(G.path(pts, { width: 1.6, ...s }));
  } else if (o instanceof Circle) {
    const [cx, cy] = xy(o.center);
    const r = Math.sqrt(N.toNumber(o.radius2));
    out.push(G.path(Array.from({ length: 145 }, (_, k) => [cx + r * Math.cos((2 * Math.PI * k) / 144), cy + r * Math.sin((2 * Math.PI * k) / 144)]), { width: 1.6, ...s }));
  } else if (o instanceof Polygon || o instanceof Triangle) {
    const vs = o instanceof Triangle ? [o.A, o.B, o.C] : o.vertices;
    out.push(G.path(vs.map(xy), { closed: true, fillAlpha: 0.12, fill: s.fill ?? s.color, width: 1.6, ...s }));
  } else if (Array.isArray(o) && o.length === 2 && o[0] instanceof Point) {
    out.push(G.path(o.map(xy), { width: 1.8, ...s }));
  } else refuse("bad-argument", "geoFigure draws points, lines, circles, segments [p, q], polygons and triangles");
  return out;
}
const pointsOf = (o) => {
  o = o?.item ?? o;
  if (o instanceof Point) return [o];
  if (o instanceof Circle) {
    const [cx, cy] = xy(o.center);
    const r = Math.sqrt(N.toNumber(o.radius2));
    return [new Point(String(cx - r), String(cy - r)), new Point(String(cx + r), String(cy + r))].map((p) => p);
  }
  if (o instanceof Polygon) return o.vertices;
  if (o instanceof Triangle) return [o.A, o.B, o.C];
  if (Array.isArray(o)) return o.filter((p) => p instanceof Point);
  return [];
};
const windowOf = (objs, pad = 0.15) => {
  const pts = objs.flatMap(pointsOf).map((p) => (p.toNumbers ? p.toNumbers() : p));
  if (!pts.length) return { x: [-5, 5], y: [-5, 5] };
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), 1);
  return { x: [Math.min(...xs) - pad * span, Math.max(...xs) + pad * span], y: [Math.min(...ys) - pad * span, Math.max(...ys) + pad * span] };
};

/**
 * Geo objects in one figure: items are objects or { item, color, label, … }.
 * The window covers every point, circle and polygon (lines are cut to it).
 * The objects are exact; the figure draws their float values, so its status
 * is estimated unless every coordinate is rational (then exact).
 */
export function geoFigure(items, { x, y, title = "", axes = true } = {}) {
  const win = x && y ? { x: x.map(Number), y: y.map(Number) } : windowOf(items);
  const out = items.flatMap((it, i) => shapesFor(it?.item ? it : { item: it, color: G.CATEGORY[i % G.CATEGORY.length] }, {}, win));
  const exact = items.every((it) => pointsOf(it).every((p) => N.isRational(p.x) && N.isRational(p.y)) && !((it?.item ?? it) instanceof Circle && !N.isRational((it?.item ?? it).radius2)));
  return G.figure({ layers: [G.shapes(out)], x: win.x, y: win.y, equal: true, axes, status: exact ? "exact" : "estimated", title });
}

/** A Construction's steps as frames: each frame adds what one step made, highlighted. */
export function constructionFrames(c, { title = "Construction" } = {}) {
  const made = c.steps.map((s) => s.makes.map((name) => ({ name, obj: c.objects.get(name) })));
  const all = made.flat().map((m) => m.obj);
  const win = windowOf(all, 0.35);
  const steps = c.steps.map((s, k) => ({ shapes: made[k].flatMap(({ name, obj }) => shapesFor({ item: obj, label: obj instanceof Point ? name : undefined }, {}, win)), note: `${s.step}. ${s.text}` }));
  return G.stepsFigures(steps, { title, status: all.every((o) => pointsOf(o).every((p) => N.isRational(p.x) && N.isRational(p.y))) ? "exact" : "estimated" });
}

/**
 * A patch of the tiling whose every vertex has this type, polygons coloured
 * by their number of sides. Refuses a type with no such tiling, giving
 * tilingPatch's reason. The patch's combinatorics are checked; its
 * coordinates are floats.
 */
export function tilingFigure(type, { radius = 5, view = radius - 1.5, title } = {}) {
  const patch = tilingPatch(type, { radius });
  if (!patch.ok) refuse("no-tiling", patch.reason);
  const polys = patch.polygons.filter((p) => p.points.some(([a, b]) => Math.hypot(a, b) < view + 1));
  return G.polygonsFigure(polys, { x: [-view, view], y: [-view, view], title: title ?? `the tiling ${patch.type}`, status: "estimated" });
}

/** A Polyhedron (or { vertices, faces }) lit and coloured by face size. */
export function solidPicture(poly, options = {}) {
  const V = poly.vertices.map((p) => p.map((c) => (typeof c === "number" ? c : N.toNumber(num(c)))));
  return G.solidFigure(V, poly.faces, { title: poly.name ?? "", status: "estimated", ...options });
}

/**
 * A lattice pattern (wallpaper.pattern's result) repeated over cells:
 * the lattice drawn from its Gram matrix, one cell outlined, the points
 * coloured by label.
 */
export function wallpaperFigure(pattern, { cells = 2, title = "" } = {}) {
  const fl = (c) => (typeof c === "number" ? c : N.toNumber(num(c)));
  const g = pattern.gram.map((r) => r.map(fl));
  const a = [Math.sqrt(g[0][0]), 0];
  const bx = g[0][1] / a[0];
  const b = [bx, Math.sqrt(Math.max(0, g[1][1] - bx * bx))];
  const at = (u, v) => [u * a[0] + v * b[0], u * a[1] + v * b[1]];
  const out = [];
  for (let i = -cells; i < cells; i++)
    for (let j = -cells; j < cells; j++) {
      out.push(G.path([at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)], { closed: true, color: "#cbd5e1", width: 0.8 }));
      pattern.points.forEach(([u, v], k) => out.push(G.dot(at(i + fl(u), j + fl(v)), { r: 3, color: G.CATEGORY[(pattern.labels?.[k] ?? 0) % G.CATEGORY.length], width: 0 })));
    }
  out.push(G.path([at(0, 0), at(1, 0), at(1, 1), at(0, 1)], { closed: true, color: "#334155", width: 1.6 }));
  return G.figure({ layers: [G.shapes(out)], equal: true, status: "estimated", title, notes: [`${pattern.points.length} points per cell`] });
}

/** A finite geometry (Incidence, projectivePlane(q), fano()) as its Levi graph: points on the left, lines on the right. */
export function incidenceFigure(geom, { title = geom.name ?? "" } = {}) {
  const pts = Array.from({ length: geom.v }, (_, i) => (geom.labels ? String(geom.labels[i]) : `P${i}`));
  const lines = geom.lines.map((_, j) => `L${j}`);
  const edges = geom.lines.flatMap((l, j) => l.map((p) => [pts[p], lines[j]]));
  return G.drawGraph({ vertices: [...pts, ...lines], edges }, { layout: "bipartite", left: pts, title });
}


// ---- the hyperbolic plane ----------------------------------------------------------------------

const hv = (p) => p.v.map(N.toNumber);
const hnorm = (w) => {
  const n = Math.sqrt(Math.max(1e-300, w[0] * w[0] - w[1] * w[1] - w[2] * w[2]));
  return [w[0] / n, w[1] / n, w[2] / n];
};
const toModel = (model) => (w) => {
  const [u, v] = model === "klein" ? [w[1] / w[0], w[2] / w[0]] : [w[1] / (1 + w[0]), w[2] / (1 + w[0])];
  if (model !== "halfPlane") return [u, v];
  const D = (1 - u) * (1 - u) + v * v;
  return [(-2 * v) / D, (1 - u * u - v * v) / D];
};
/** points along the geodesic from a to b (each a point or an ideal point), on the hyperboloid */
function geodesic(a, b, n = 48) {
  const [p, q] = [hv(a), hv(b)];
  const [ia, ib] = [a instanceof HIdeal, b instanceof HIdeal];
  const mix = (s, t) => hnorm([p[0] * s + q[0] * t, p[1] * s + q[1] * t, p[2] * s + q[2] * t]);
  const out = [];
  for (let k = 0; k <= n; k++) {
    const s = k / n;
    if (ia && ib) out.push(mix(Math.exp(7 * (1 - 2 * s)), Math.exp(-7 * (1 - 2 * s))));
    else if (ib) out.push(mix(1, Math.expm1(9 * s)));
    else if (ia) out.push(mix(Math.expm1(9 * (1 - s)), 1));
    else out.push(mix(1 - s, s));
  }
  return out;
}

/**
 * Hyperbolic objects in one figure, in a chosen model: "disc" (Poincaré,
 * the default), "klein" or "halfPlane". Items are HPoints, ideal points,
 * HLines, HTriangles, HCircles, segments [p, q], or { item, color, label }.
 * The objects are exact; the picture draws their float values.
 */
export function hyperbolicFigure(items, { model = "disc", title = "", x, y } = {}) {
  if (!["disc", "klein", "halfPlane"].includes(model)) refuse("bad-argument", 'model is "disc", "klein" or "halfPlane"');
  const M = toModel(model);
  const out = [];
  const finite = [];
  const curve = (pts, style) => {
    const m = pts.map(M).filter((q) => Number.isFinite(q[0]) && Number.isFinite(q[1]) && Math.abs(q[0]) < 1e3 && Math.abs(q[1]) < 1e3);
    finite.push(...m);
    if (m.length > 1) out.push(G.path(m, style));
  };
  if (model !== "halfPlane") out.push(G.path(Array.from({ length: 181 }, (_, k) => [Math.cos((Math.PI * k) / 90), Math.sin((Math.PI * k) / 90)]), { color: "#64748b", width: 1.2 }));
  items.forEach((it, i) => {
    const o = it?.item ?? it;
    const color = it?.color ?? G.CATEGORY[i % G.CATEGORY.length];
    if (o instanceof HPoint) {
      const q = M(hv(o));
      finite.push(q);
      out.push(G.dot(q, { r: 4, color }));
      if (it?.label) out.push(G.text(q, it.label, { anchor: "ne", color, size: 13 }));
    } else if (o instanceof HIdeal) {
      if (model === "halfPlane" && o.halfPlane === null) return;
      const q = model === "halfPlane" ? [N.toNumber(o.halfPlane), 0] : [N.toNumber(o.x), N.toNumber(o.y)];
      finite.push(q);
      out.push(G.dot(q, { r: 4, color, fill: "#ffffff" }));
    } else if (o instanceof HLine) curve(geodesic(...o.ends, 96), { width: 1.6, color });
    else if (o instanceof HTriangle) {
      const [A, B, C] = o.vertices;
      curve([...geodesic(A, B), ...geodesic(B, C), ...geodesic(C, A)], { closed: true, width: 1.6, color, fill: color, fillAlpha: 0.14 });
    } else if (o instanceof HCircle) {
      const c = o.disc;
      const [cx, cy] = c.center.toNumbers();
      const r = Math.sqrt(N.toNumber(c.radius2));
      const pts = Array.from({ length: 145 }, (_, k) => {
        const [u, v] = [cx + r * Math.cos((Math.PI * k) / 72), cy + r * Math.sin((Math.PI * k) / 72)];
        const d = 1 - u * u - v * v;
        return [(1 + u * u + v * v) / d, (2 * u) / d, (2 * v) / d];
      });
      curve(pts, { closed: true, width: 1.6, color });
    } else if (Array.isArray(o) && o.length === 2) curve(geodesic(o[0], o[1]), { width: 1.8, color });
    else refuse("bad-argument", "hyperbolicFigure draws hyperbolic points, ideal points, lines, triangles, circles and segments [p, q]");
  });
  let win = { x: [-1.05, 1.05], y: [-1.05, 1.05] };
  if (model === "halfPlane") {
    const near = finite.filter((q) => Math.abs(q[0]) <= 5 && q[1] <= 5);
    const xs = near.map((q) => q[0]);
    const [lo, hi] = xs.length ? [Math.min(...xs), Math.max(...xs)] : [-1, 1];
    const pad = Math.max(0.4, 0.1 * (hi - lo));
    const top = Math.max(1.5, Math.min(5, Math.max(0, ...near.map((q) => q[1])) * 1.15));
    win = { x: [lo - pad, hi + pad], y: [-0.04 * top, top] };
    out.unshift(G.path([[win.x[0], 0], [win.x[1], 0]], { color: "#64748b", width: 1.2 }));
  }
  return G.figure({ layers: [G.shapes(out)], x: x?.map(Number) ?? win.x, y: y?.map(Number) ?? win.y, equal: true, axes: false, status: "estimated", title });
}

/** The tiling {p, q} of the hyperbolic plane, drawn in the Poincaré disc (or "klein"), tiles coloured by their distance in steps from the central one. */
export function hyperbolicTilingFigure(p, q, { layers = 3, model = "disc", title } = {}) {
  if (!["disc", "klein"].includes(model)) refuse("bad-argument", 'model is "disc" or "klein"');
  const patch = hyperbolicTiling(p, q).patch(layers);
  const shade = ["#1d4ed8", "#3b82f6", "#93c5fd", "#bfdbfe", "#dbeafe", "#eff6ff"];
  const M = toModel(model);
  const lift = ([u, v]) => {
    const d = 1 - u * u - v * v;
    return [(1 + u * u + v * v) / d, (2 * u) / d, (2 * v) / d];
  };
  const out = [G.path(Array.from({ length: 181 }, (_, k) => [Math.cos((Math.PI * k) / 90), Math.sin((Math.PI * k) / 90)]), { color: "#64748b", width: 1.2 })];
  for (const t of patch.tiles) {
    const vs = t.points.map(lift);
    const pts = vs.flatMap((a, i) => {
      const b = vs[(i + 1) % vs.length];
      return Array.from({ length: 8 }, (_, k) => M(hnorm([a[0] + ((b[0] - a[0]) * k) / 8, a[1] + ((b[1] - a[1]) * k) / 8, a[2] + ((b[2] - a[2]) * k) / 8])));
    });
    out.push(G.path(pts, { closed: true, fill: shade[Math.min(t.layer, shade.length - 1)], fillAlpha: 1, color: "#1e293b", width: 0.7 }));
  }
  return G.figure({ layers: [G.shapes(out)], x: [-1.05, 1.05], y: [-1.05, 1.05], equal: true, axes: false, status: "estimated", title: title ?? `the tiling {${p}, ${q}}`, notes: [`${patch.tiles.length} tiles: ${patch.counts.join(" + ")}`] });
}
