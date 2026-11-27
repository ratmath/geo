// The parallel postulate, examined in each geometry the package has.
//
// Playfair's form: through a point not on a line there is exactly one line
// that never meets it. Each row below takes a line and a point in one
// geometry, counts the parallels exactly, and says what the count is in
// general. In the finite planes the count is checked for every line and
// every point off it.
import { point, line, parallelThrough, meet } from "./plane.js";
import { spoint, equator } from "./sphere.js";
import { hpoint, hline, ideal } from "./hyperbolic.js";
import { affinePlane, projectivePlane } from "./finite.js";

const finiteCounts = (G) => {
  const counts = new Set();
  for (let l = 0; l < G.lines.length; l++) for (let p = 0; p < G.v; p++) if (!G.lines[l].includes(p)) counts.add(G.parallels(p, l).length);
  return [...counts].sort();
};

/**
 * One row per geometry: { geometry, parallels, count, example, checked }.
 * `parallels` is "exactly one", "none" or "infinitely many"; `checked` is
 * true when the example (or, for a finite plane, every case) was verified
 * exactly.
 */
export function parallelPostulate({ q = 3 } = {}) {
  const rows = [];
  {
    const l = line(point(0, 0), point(1, 0));
    const P = point(0, 1);
    const m = parallelThrough(l, P);
    const other = line(P, point(1, "3/2"));
    rows.push({ geometry: "Euclidean plane", parallels: "exactly one", count: 1, example: { line: l, point: P, parallel: m, anotherLineMeetsAt: meet(l, other) }, checked: meet(l, m) === null && meet(l, other) !== null });
  }
  {
    const l = equator();
    const P = spoint(0, 0, 1);
    const r = l.parallelsThrough(P);
    rows.push({ geometry: "sphere", parallels: "none", count: 0, example: { line: l, point: P, anyLineMeetsAt: r.witness.meets }, checked: r.length === 0 && r.witness.meets.every((x) => l.contains(x) && r.witness.line.contains(x)) });
  }
  {
    const l = hline(ideal(-1, 0), ideal(1, 0));
    const P = hpoint(0, "1/2");
    const r = l.parallelsThrough(P);
    const three = [...r.limiting, r.ultraparallel];
    rows.push({ geometry: "hyperbolic plane", parallels: "infinitely many", count: Infinity, example: { line: l, point: P, limiting: r.limiting, ultraparallel: r.ultraparallel, angleOfParallelism: r.angle }, checked: three.every((m) => m.contains(P) && !l.meets(m)) && !three[0].equals(three[1]) && !three[0].equals(three[2]) });
  }
  {
    const G = affinePlane(q);
    const c = finiteCounts(G);
    rows.push({ geometry: `affine plane over the field with ${q} elements`, parallels: "exactly one", count: 1, example: { points: G.v, lines: G.lines.length }, checked: c.length === 1 && c[0] === 1 });
  }
  {
    const G = projectivePlane(2);
    const c = finiteCounts(G);
    rows.push({ geometry: "Fano plane (projective, 7 points)", parallels: "none", count: 0, example: { points: G.v, lines: G.lines.length }, checked: c.length === 1 && c[0] === 0 });
  }
  return rows;
}

