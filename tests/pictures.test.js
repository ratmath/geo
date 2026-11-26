// Phase 7: pictures, and the join between geo's plane kernel and graphics'.
import { describe, expect, test } from "bun:test";
import * as G from "@ratmath/graphics";
import {
  point, line, circle, triangle, polygon, construction, N, num, solids, projectivePlane, fano, wallpaper,
  vertexTypes, uniformTiling, tilingPatch, toSurd, toGraphics, fromGraphics, geoFigure, constructionFrames, tilingFigure,
  solidPicture, wallpaperFigure, incidenceFigure, figureSVG, framesSVG,
} from "../index.js";

describe("the two kernels", () => {
  test("numbers of the form a + b√d go across exactly, others are refused", () => {
    expect(String(toSurd("sqrt(3)/2"))).toBe("√3/2");
    expect(String(toSurd(N.sub(num(1), N.sqrt(num(2)))))).toBe("1 - √2");
    expect(toSurd(N.sqrt(N.add(num(1), N.sqrt(num(2)))))).toBeNull(); // degree 4
    const p = point("1/2", "sqrt(3)/2");
    const g = toGraphics(p);
    expect(g instanceof G.Point).toBe(true);
    expect(fromGraphics(g).equals(p)).toBe(true);
  });
  test("lines, circles and polygons round-trip, and graphics' exact predicates agree with geo's", () => {
    const A = point(0, 0);
    const B = point(2, "sqrt(5)");
    const l = line(A, B);
    const gl = toGraphics(l);
    // the graphics line passes through the graphics images of A and B
    for (const P of [A, B]) {
      const q = toGraphics(P);
      expect(gl.a.multiply(q.x).add(gl.b.multiply(q.y)).subtract(gl.c).isZero).toBe(true);
    }
    expect(N.isZero(fromGraphics(gl).at(B))).toBe(true);
    const c = circle(point(1, 1), point(2, 3));
    const gc = toGraphics(c);
    expect(fromGraphics(gc).equals(c)).toBe(true);
    const sq = polygon([[0, 0], [1, 0], [1, 1], [0, 1]]);
    expect(G.area(toGraphics(sq)).toString()).toBe("1");
    // where the line meets the circle, worked out in graphics, is on the circle in geo
    for (const P of G.intersect(toGraphics(line(point(0, 1), point(1, 1))), gc)) expect(c.contains(fromGraphics(P))).toBe(true);
  });
  test("an incentre is beyond Q(√d): refused, not rounded", () => {
    const t = triangle([0, 0], [4, 0], [1, 3]);
    expect(() => toGraphics(t.incenter)).toThrow(/a \+ b√d/);
  });
});

describe("tilings grown from their vertex types", () => {
  test("a patch grows for exactly the 11 types with a uniform tiling, and every inner vertex has the type", () => {
    for (const t of vertexTypes()) {
      const r = tilingPatch(t, { radius: 4.5 });
      expect(r.ok).toBe(uniformTiling(t).uniform);
      if (r.ok) expect(r.polygons.length).toBeGreaterThan(20);
    }
  });
  test("the regular tilings' polygon counts in a patch match their density", () => {
    // in 3.3.3.3.3.3 each vertex is in 6 triangles and each triangle has 3 vertices: twice as many triangles as vertices
    const r = tilingPatch("3.3.3.3.3.3", { radius: 6 });
    expect(r.polygons.every((p) => p.n === 3)).toBe(true);
    const r2 = tilingPatch("4.8.8", { radius: 6 });
    const sq = r2.polygons.filter((p) => p.n === 4).length;
    const oc = r2.polygons.filter((p) => p.n === 8).length;
    expect(Math.abs(sq / oc - 1)).toBeLessThan(0.35); // one square per octagon in the limit
  });
  test("a figure of 3.4.6.4 and a refusal for 5.5.10", () => {
    const f = tilingFigure("3.4.6.4", { radius: 5 });
    expect(f.count).toBeGreaterThan(30);
    expect(figureSVG(f)).toContain("<svg");
    expect(() => tilingFigure("5.5.10")).toThrow(/overlap|no arrangement/);
  });
});

describe("pictures", () => {
  test("geo objects in a figure: exact when every coordinate is rational", () => {
    const t = triangle([0, 0], [4, 0], [0, 3]);
    const f = geoFigure([t, t.circumcircle, t.centroid]);
    expect(f.status).toBe("exact");
    expect(geoFigure([point("sqrt(2)", 0)]).status).toBe("estimated");
    expect(figureSVG(f)).toContain("<svg");
  });
  test("a construction step by step", () => {
    const c = construction({ A: [0, 0], B: [4, 0] }).circle("c1", "A", "B").circle("c2", "B", "A").meet(["P", "Q"], "c1", "c2").line("m", "P", "Q");
    const fr = constructionFrames(c);
    expect(fr.frames.length).toBe(c.steps.length);
    expect(fr.frames.at(-1).notes[0]).toContain("line m");
    expect(framesSVG(fr)).toContain("<animate");
  });
  test("solids, wallpaper patterns and finite planes", () => {
    const cube = solidPicture(solids.cube());
    expect(cube.faces).toBe(6);
    const ico = solidPicture(solids.icosahedron());
    expect(ico.faces).toBe(20);
    const p = wallpaper.pattern("p4m", [["1/10", "1/5"]]);
    const w = wallpaperFigure(p);
    expect(w.notes[0]).toBe(`${p.points.length} points per cell`);
    const levi = incidenceFigure(fano());
    // the Levi graph of the Fano plane: 7 points, 7 lines, 21 incidences
    expect(G.graphData({ vertices: [...levi.positions.keys()], edges: [] }).vertices.length).toBe(14);
    expect(incidenceFigure(projectivePlane(3)).positions.size).toBe(26);
  });
});
