import { describe, expect, test } from "bun:test";
import * as G from "../index.js";

const { N } = G;
const S = (x) => String(x);

describe("computational geometry", () => {
  test("convex hull drops interior and edge points", () => {
    expect(G.convexHull([[0, 0], [2, 0], [1, 1], [2, 2], [0, 2], [1, 0], [1, 3]]).map(S)).toEqual(["(0, 0)", "(2, 0)", "(2, 2)", "(1, 3)", "(0, 2)"]);
    expect(G.convexHull([[0, 0], [1, 1], [2, 2]]).length).toBe(2);
  });
  test("segments", () => {
    expect(G.segmentIntersection([0, 0], [2, 2], [0, 2], [2, 0]).kind).toBe("cross");
    expect(S(G.segmentIntersection([0, 0], [3, 3], [0, 2], [2, 0]).point)).toBe("(1, 1)");
    expect(G.segmentIntersection([0, 0], [1, 1], [1, 1], [2, 0]).kind).toBe("touch");
    expect(G.segmentIntersection([0, 0], [2, 0], [1, 0], [3, 0]).kind).toBe("overlap");
    expect(G.segmentIntersection([0, 0], [1, 0], [2, 0], [3, 0]).meets).toBe(false);
    expect(G.onSegment([0, 0], [4, 2], [2, 1])).toBe(true);
  });
  test("polygons", () => {
    const p = G.polygon([[0, 0], [4, 0], [4, 3], [2, 1], [0, 3]]);
    expect(N.text(p.area)).toBe("8");
    expect(S(p.centroid)).toBe("(2, 13/12)");
    expect(p.isConvex()).toBe(false);
    expect(p.isSimple()).toBe(true);
    expect([p.locate([2, 1]), p.locate([2, 2]), p.locate([1, 1]), p.locate([4, 1])]).toEqual(["boundary", "outside", "inside", "boundary"]);
    const tris = p.triangulate();
    expect(tris.length).toBe(3);
    const total = tris.reduce((s, [a, b, c]) => N.add(s, G.triangle(p.vertices[a], p.vertices[b], p.vertices[c]).area), G.num(0));
    expect(N.eq(total, p.area)).toBe(true);
    expect(G.polygon([[0, 0], [2, 2], [2, 0], [0, 2]]).isSimple()).toBe(false);
  });
  test("clipping", () => {
    const sq = G.polygon([[0, 0], [4, 0], [4, 4], [0, 4]]);
    const c = sq.clip([[2, 2], [6, 2], [6, 6], [2, 6]]);
    expect(N.text(c.area)).toBe("4");
    expect(sq.clip([[5, 5], [6, 5], [6, 6]])).toBe(null);
    const tri = G.polygon([[0, 0], [4, 0], [0, 4]]).clip([[1, 1], [5, 1], [5, 5], [1, 5]]);
    expect(N.text(tri.area)).toBe("2");
  });
  test("Delaunay: empty circles, and the cocircular case is reported", () => {
    const pts = [[0, 0], [4, 0], [0, 3], [4, 3], [2, 1], [1, 2], [3, 5]];
    const d = G.delaunay(pts);
    for (const [a, b, c] of d.triangles) {
      d.points.forEach((p, i) => {
        if (i !== a && i !== b && i !== c) expect(G.inCircle(d.points[a], d.points[b], d.points[c], p)).toBeLessThanOrEqual(0);
      });
    }
    const hull = G.convexHull(pts);
    const area = d.triangles.reduce((s, [a, b, c]) => N.add(s, G.triangle(d.points[a], d.points[b], d.points[c]).area), G.num(0));
    expect(N.eq(area, G.polygon(hull).area)).toBe(true);
    const sq = G.delaunay([[0, 0], [1, 0], [0, 1], [1, 1]]);
    expect(sq.triangles.length).toBe(2);
    expect(sq.cocircular).toBe(true);
    expect(() => G.delaunay([[0, 0], [1, 1], [2, 2]])).toThrow();
  });
  test("Voronoi", () => {
    const v = G.voronoi([[0, 0], [4, 0], [0, 4], [4, 4], [2, 2]]);
    const mid = v.cells.find((c) => S(c.site) === "(2, 2)");
    expect(mid.bounded).toBe(true);
    expect(mid.corners.map(S).sort()).toEqual(["(0, 2)", "(2, 0)", "(2, 4)", "(4, 2)"]);
    expect(v.cells.filter((c) => !c.bounded).length).toBe(4);
    // every corner is equally far from the sites of the cells it belongs to
    for (const c of v.cells) for (const k of c.corners) expect(N.eq(G.distance2(k, c.site), G.distance2(k, mid.site)) || !mid.corners.some((m) => m.equals(k))).toBe(true);
  });
  test("closest pair", () => {
    const c = G.closestPair([[0, 0], [5, 5], [1, 1], [9, 0]]);
    expect(N.text(c.distance)).toBe("√2");
  });
});

describe("lattice geometry", () => {
  test("Pick's theorem", () => {
    const r = G.pick([[0, 0], [4, 0], [4, 3], [2, 1], [0, 3]]);
    expect(r.interior).toBe(2);
    expect(r.boundary).toBe(14);
    expect(r.holds).toBe(true);
    expect(G.pick([[0, 0], [5, 0], [0, 5]]).interior).toBe(6);
    expect(() => G.pick([[0, 0], ["1/2", 0], [0, 1]])).toThrow(/whole-number/);
  });
  test("visible points", () => {
    expect(G.latticePointsOn([0, 0], [6, 4])).toBe(3);
    expect(G.isVisible(3, 5)).toBe(true);
    expect(G.isVisible(4, 6)).toBe(false);
    const v = G.visiblePoints(100);
    expect(v.count).toBe(6087);
  });
});

describe("other metrics", () => {
  const tx = G.metric("taxicab");
  test("taxicab distance, circles and pi", () => {
    expect(N.text(tx.distance([0, 0], [3, 4]))).toBe("7");
    expect(tx.circle([0, 0], 2).map(S)).toEqual(["(2, 0)", "(0, 2)", "(-2, 0)", "(0, -2)"]);
    expect(N.text(tx.pi)).toBe("4");
    expect(N.text(G.metric("chebyshev").pi)).toBe("4");
    expect(N.text(G.metric("euclidean").distance([0, 0], [1, 1]))).toBe("√2");
  });
  test("taxicab bisectors", () => {
    const b = tx.bisector([0, 0], [4, 2]);
    expect(b.kind).toBe("a bent line of three pieces");
    for (const p of [...b.segments[0], b.rays[0].from.plus(b.rays[0].direction.times(3)), b.rays[1].from.plus(b.rays[1].direction.times(3))]) {
      expect(N.eq(tx.distance(p, [0, 0]), tx.distance(p, [4, 2]))).toBe(true);
    }
    const q = tx.bisector([0, 0], [2, 2]);
    expect(q.regions.length).toBe(2);
    const inside = q.regions[0].corner.plus(q.regions[0].quadrant[0].times(2)).plus(q.regions[0].quadrant[1].times(5));
    expect(N.eq(tx.distance(inside, [0, 0]), tx.distance(inside, [2, 2]))).toBe(true);
    expect(tx.bisector([0, 0], [0, 2]).kind).toBe("a horizontal line");
  });
  test("ellipses are polygons", () => {
    const e = tx.ellipse([0, 0], [4, 0], 6);
    expect(e.length).toBe(6);
    for (const p of e) expect(N.text(N.add(tx.distance(p, [0, 0]), tx.distance(p, [4, 0])))).toBe("6");
    expect(tx.ellipse([0, 0], [2, 2], 6).length).toBe(8);
    const ch = G.metric("chebyshev");
    for (const p of ch.ellipse([0, 0], [2, 0], 4)) expect(N.text(N.add(ch.distance(p, [0, 0]), ch.distance(p, [2, 0])))).toBe("4");
    expect(() => tx.ellipse([0, 0], [4, 0], 4)).toThrow();
  });
});
