import { describe, expect, test } from "bun:test";
import { Rational } from "@ratmath/core";
import * as G from "../index.js";

const { N } = G;
const S = (x) => String(x);

describe("exact numbers", () => {
  test("reading and printing", () => {
    expect(N.text(G.num("sqrt(2)"))).toBe("√2");
    expect(N.text(G.num("3*sqrt(5)/2"))).toBe("3√5/2");
    expect(N.text(G.num("0.25"))).toBe("1/4");
    expect(() => G.num(0.1)).toThrow(G.GeoError);
    expect(N.mul(G.num("sqrt(2)"), G.num("sqrt(2)")) instanceof Rational).toBe(true);
    expect(N.cmp(G.num("sqrt(2)"), G.num("3/2"))).toBe(-1);
  });
});

describe("points, lines, circles", () => {
  test("lines", () => {
    expect(S(G.line([0, 0], [2, 1]))).toBe("x - 2·y = 0");
    expect(S(G.line([1, 1], [1, 5]))).toBe("x - 1 = 0");
    expect(S(G.perpendicularBisector([0, 0], [4, 0]))).toBe("x - 2 = 0");
    expect(G.parallel(G.line([0, 0], [1, 1]), G.line([0, 1], [1, 2]))).toBe(true);
    expect(G.perpendicular(G.line([0, 0], [1, 1]), G.line([0, 1], [1, 0]))).toBe(true);
    expect(() => G.line([1, 1], [1, 1])).toThrow();
  });
  test("meeting", () => {
    expect(S(G.meet(G.line([0, 0], [1, 1]), G.line([0, 2], [2, 0])))).toBe("(1, 1)");
    expect(G.meet(G.line([0, 0], [1, 0]), G.line([0, 1], [1, 1]))).toBe(null);
    expect(G.meet(G.line([0, 0], [1, 1]), G.circle([0, 0], { radius: 1 })).map(S)).toEqual(["(-√2/2, -√2/2)", "(√2/2, √2/2)"]);
    expect(G.meet(G.circle([0, 0], [1, 0]), G.circle([1, 0], [0, 0])).map(S)).toEqual(["(1/2, -√3/2)", "(1/2, √3/2)"]);
    expect(G.meet(G.line([0, 1], [1, 1]), G.circle([0, 0], { radius: 1 })).map(S)).toEqual(["(0, 1)"]);
    expect(G.meet(G.line([0, 2], [1, 2]), G.circle([0, 0], { radius: 1 }))).toEqual([]);
  });
  test("tangents and the circle through three points", () => {
    const c = G.circle([0, 0], { radius: 1 });
    const ts = G.tangents(c, [2, 0]);
    expect(ts.length).toBe(2);
    expect(ts.every((t) => G.meet(t, c).length === 1)).toBe(true);
    expect(S(G.circumcircle([0, 0], [4, 0], [0, 3]))).toBe("circle, centre (2, 3/2), radius 5/2");
    expect(G.concyclic([1, 0], [0, 1], [-1, 0], [0, -1])).toBe(true);
    expect(G.concyclic([1, 0], [0, 1], [-1, 0], [0, -2])).toBe(false);
  });
  test("regular polygons are exact", () => {
    const p = G.regularPolygon(5);
    expect(S(p[1])).toBe("((-1 + √5)/4, √(10 + 2√5)/4)");
    expect(N.eq(G.distance2(p[0], p[1]), G.distance2(p[2], p[3]))).toBe(true);
    const h = G.regularPolygon(7);
    expect(N.eq(G.distance2(h[0], h[1]), G.distance2(h[3], h[4]))).toBe(true);
  });
  test("a construction keeps exact coordinates and counts its steps", () => {
    const c = G.construction({ A: [0, 0], B: [1, 0] });
    c.circle("a", "A", "B").circle("b", "B", "A").meet(["C", "D"], "a", "b").line("m", "C", "D").line("AB", "A", "B").meet("M", "m", "AB");
    expect(S(c.get("C"))).toBe("(1/2, -√3/2)");
    expect(S(c.get("M"))).toBe("(1/2, 0)");
    expect(c.count).toEqual({ ruler: 2, compass: 2, mark: 2 });
    expect(() => c.line("m", "A", "B")).toThrow(/already used/);
    expect(() => c.get("Z")).toThrow();
  });
});

describe("triangles", () => {
  const t = G.triangle([0, 0], [4, 0], [1, 3]);
  test("centres", () => {
    expect([t.centroid, t.circumcenter, t.orthocenter, t.ninePointCenter, t.symmedian].map(S)).toEqual(["(5/3, 1)", "(2, 1)", "(1, 1)", "(3/2, 1)", "(14/11, 12/11)"]);
    expect(S(t.eulerLine)).toBe("y - 1 = 0");
  });
  test("measures", () => {
    expect(N.text(t.area)).toBe("6");
    expect(N.text(t.circumradius)).toBe("√5");
    expect(N.text(t.cosines.A)).toBe("√10/10");
    expect(t.classify()).toEqual({ angles: "acute", sides: "scalene" });
    expect(t.degrees.B).toBeCloseTo(45, 10);
  });
  test("the 3-4-5 triangle", () => {
    const r = G.triangle([0, 0], [4, 0], [0, 3]);
    expect(S(r.incenter)).toBe("(1, 1)");
    expect(N.text(r.inradius)).toBe("1");
    expect(r.classify().angles).toBe("right");
    expect(S(r.excenters.A)).toBe("(6, 6)");
    expect(G.triangle([0, 0], [2, 0], [1, "sqrt(3)"]).classify().sides).toBe("equilateral");
  });
  test("incircle touches the sides", () => {
    const inc = t.incircle;
    for (const [p, q] of [[t.A, t.B], [t.B, t.C], [t.C, t.A]]) expect(G.meet(G.line(p, q), inc).length).toBe(1);
  });
});

describe("transformations", () => {
  test("rotations", () => {
    const r = G.rotation([1, 1], "1/4");
    expect(S(r.apply([2, 1]))).toBe("(1, 2)");
    expect(r.classify().kind).toBe("rotation");
    expect(S(r.classify().center)).toBe("(1, 1)");
    const s = G.rotation([0, 0], "1/6");
    expect(S(s.apply([1, 0]))).toBe("(1/2, √3/2)");
    expect(s.compose(s).compose(s).compose(s).compose(s).compose(s).classify().kind).toBe("identity");
    expect(S(G.rotation([0, 0], { cos: "3/5", sin: "4/5" }).apply([5, 0]))).toBe("(3, 4)");
  });
  test("reflections compose to rotations and translations", () => {
    const a = G.reflection(G.line([0, 0], [1, 0]));
    const b = G.reflection(G.line([0, 0], [1, 1]));
    const k = b.compose(a).classify();
    expect(k.kind).toBe("rotation");
    expect(k.degrees).toBe(90);
    const c = G.reflection(G.line([0, 2], [1, 2]));
    const tr = c.compose(a).classify();
    expect(tr.kind).toBe("translation");
    expect(S(tr.vector)).toBe("(0, 4)");
    expect(a.classify().kind).toBe("reflection");
    expect(S(a.classify().axis)).toBe("y = 0");
  });
  test("glide reflections", () => {
    const g = G.glide(G.line([0, 1], [1, 1]), [3, 0]);
    const k = g.classify();
    expect(k.kind).toBe("glide reflection");
    expect(S(k.axis)).toBe("y - 1 = 0");
    expect(S(k.vector)).toBe("(3, 0)");
    expect(g.fixed()).toBe(null);
  });
  test("similarities and affine maps", () => {
    expect(G.dilation([1, 1], 3).classify().kind).toBe("dilation");
    const sp = G.dilation([0, 0], 2).compose(G.rotation([0, 0], "1/8")).classify();
    expect(sp.kind).toBe("spiral similarity");
    expect(N.text(sp.ratio)).toBe("2");
    const shear = G.affine([[1, 1], [0, 1]], [0, 0]);
    expect(shear.classify().kind).toBe("affine");
    expect(shear.isIsometry()).toBe(false);
    expect(shear.compose(shear.inverse()).equals(G.identity())).toBe(true);
    expect(() => shear.apply(G.circle([0, 0], { radius: 1 }))).toThrow();
    const img = G.rotation([0, 0], "1/4").apply(G.circle([2, 0], { radius: 1 }));
    expect(S(img.center)).toBe("(0, 2)");
  });
  test("inversion", () => {
    const inv = G.inversion(G.circle([0, 0], { radius: 1 }));
    expect(S(inv.apply([2, 0]))).toBe("(1/2, 0)");
    expect(S(inv.apply(G.line([2, 0], [2, 1])))).toBe("circle, centre (1/4, 0), radius 1/4");
    expect(S(inv.apply(G.circle([1, 0], { radius: 1 })))).toBe("2·x - 1 = 0");
    expect(() => inv.apply([0, 0])).toThrow();
  });
});

describe("theorems on exact figures", () => {
  const t = G.triangle([0, 0], [4, 0], [1, 3]);
  test("triangle theorems hold", () => {
    for (const k of ["pythagoras", "eulerLine", "ninePointCircle", "feuerbach", "napoleon", "concurrency", "heron"]) expect(G.theorems[k](t).holds).toBe(true);
    expect(G.theorems.pythagoras([[0, 0], [4, 0], [0, 3]]).right).toBe(true);
  });
  test("Ceva and Menelaus", () => {
    const c = G.theorems.ceva(t, G.midpoint(t.B, t.C), G.midpoint(t.C, t.A), G.midpoint(t.A, t.B));
    expect(c.holds && c.concurrent).toBe(true);
    const off = G.theorems.ceva(t, [3, 1], G.midpoint(t.C, t.A), [1, 0]);
    expect(off.holds).toBe(true);
    expect(off.concurrent).toBe(false);
    const l = G.line([-1, 1], [5, 2]);
    const m = G.theorems.menelaus(t, G.meet(l, G.line(t.B, t.C)), G.meet(l, G.line(t.C, t.A)), G.meet(l, G.line(t.A, t.B)));
    expect(m.holds && m.collinear).toBe(true);
    expect(N.text(m.product)).toBe("-1");
  });
  test("circle theorems", () => {
    expect(G.theorems.ptolemy([1, 0], [0, 1], [-1, 0], [0, -1]).equal).toBe(true);
    const p = G.theorems.ptolemy([1, 0], [0, 1], [-1, 0], [0, -2]);
    expect(p.holds).toBe(true);
    expect(p.equal).toBe(false);
    const c = G.circle([0, 0], { radius: 5 });
    expect(G.theorems.thales(c, [5, 0], [-5, 0], [3, 4]).holds).toBe(true);
    expect(G.theorems.thales(c, [5, 0], [0, 5], [3, 4]).right).toBe(false);
    expect(G.theorems.powerOfPoint(c, [1, 2], G.line([1, 2], [4, 3]), G.line([1, 2], [1, 0])).holds).toBe(true);
    const on = G.meet(G.line(t.circumcenter, t.circumcenter.plus(G.point(1, 0))), t.circumcircle)[0];
    expect(G.theorems.simson(t, on).collinear).toBe(true);
    expect(G.theorems.simson(t, [1, 1]).collinear).toBe(false);
  });
  test("Varignon and the golden pentagon", () => {
    expect(G.theorems.varignon([0, 0], [5, 1], [4, 6], [-1, 3]).holds).toBe(true);
    const g = G.theorems.pentagon();
    expect(g.holds).toBe(true);
    expect(N.text(g.ratio)).toBe("(1 + √5)/2");
  });
});
