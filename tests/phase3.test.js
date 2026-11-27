import { test, expect, describe } from "bun:test";
import * as G from "../index.js";
const { N, num } = G;
const txt = (x) => N.text(x);

describe("angles and lengths", () => {
  test("rational multiples of π are decided", () => {
    expect(String(G.turnsOfCos("1/2"))).toBe("1/6");
    expect(String(G.turnsOfCos("sqrt(2)/2"))).toBe("1/8");
    expect(String(G.turnsOfCos(N.cosPi(num("2/7"))))).toBe("1/7");
    expect(String(G.turnsOfCos(-1))).toBe("1/2");
    // Niven: the only rational cosines of rational angles are 0, ±1/2, ±1
    expect(G.turnsOfCos("1/3")).toBe(null);
    expect(G.turnsOfCos("3/5")).toBe(null);
    expect(G.turnsOfCos(N.div(N.sqrt(num(5)), num(3)))).toBe(null);
  });
  test("angles add as real numbers", () => {
    const a = G.angle("1/3");
    const s = a.add(a).add(a);
    expect(String(s.turns)).toBe("1");
    expect(s.text).toBe("2π");
    expect(G.angle({ cos: "1/3" }).text.startsWith("1.2309594173")).toBe(true);
    const v = G.angle({ cos: "1/3" }).value(25);
    expect(v.low.toDecimal(22).startsWith("1.23095941734077468213")).toBe(true);
    expect(v.high.subtract(v.low).toNumber()).toBeLessThan(1e-25);
    expect(G.angle("1/8").degrees).toBe(45);
  });
  test("lengths keep cosh and exp exactly", () => {
    const d = G.Length.ofExp(3);
    expect(txt(d.cosh)).toBe("5/3");
    expect(txt(d.double().exp)).toBe("9");
    expect(d.half().double().equals(d)).toBe(true);
    expect(d.text).toBe("ln(3)");
    expect(d.value(20).low.toDecimal(18).startsWith("1.098612288668109")).toBe(true);
  });
});

describe("the sphere", () => {
  test("points, distances and great circles", () => {
    const A = G.spoint(1, 0, 0);
    const B = G.spoint(1, 1, 0);
    expect(A.distanceTo(B).text).toBe("π/4");
    expect(String(G.fromStereographic(["1/2", "1/3"]))).toBe("(36/49, 24/49, -23/49)");
    expect(String(G.fromStereographic(["1/2", "1/3"]).stereographic)).toBe("(1/2, 1/3)");
    expect(G.latLon("1/8", "1/4").latLon.lat.text).toBe("π/4");
    expect(() => new G.SPoint(1, 1, 0)).toThrow();
    const g = G.greatCircle(A, [0, 1, 0]);
    const h = G.greatCircle(A, [0, 1, 1]);
    expect(g.equals(G.equator())).toBe(true);
    expect(g.meet(h).map(String)).toEqual(["(1, 0, 0)", "(-1, 0, 0)"]);
    expect(g.angleWith(h).text).toBe("π/4");
    expect(() => G.greatCircle(A, A.antipode)).toThrow();
    expect(g.parallelsThrough(G.northPole()).length).toBe(0);
    expect(g.perpendicularThrough(B).isPerpendicularTo(g)).toBe(true);
  });
  test("the octant triangle covers an eighth of the sphere", () => {
    const t = G.striangle([1, 0, 0], [0, 1, 0], [0, 0, 1]);
    expect(t.angles.A.text).toBe("π/2");
    expect(t.excess.text).toBe("π/2");
    expect(String(t.fractionOfSphere)).toBe("1/8");
    expect(t.classify()).toEqual({ rightAngles: 3, sides: "equilateral" });
    expect(t.checks().all).toBe(true);
  });
  test("a triangle with angles π/4, π/2, π/3 has excess π/12", () => {
    const t = G.striangle([1, 0, 0], [1, 1, 0], [1, 1, 1]);
    expect([t.angles.A.text, t.angles.B.text, t.angles.C.text]).toEqual(["π/4", "π/2", "π/3"]);
    expect(t.excess.text).toBe("π/12");
    expect(String(t.fractionOfSphere)).toBe("1/48"); // the sphere is 48 such triangles: the cube's symmetry group
    expect(t.checks().all).toBe(true);
  });
  test("a triangle with no rational angle: laws hold exactly, excess enclosed", () => {
    const t = G.striangle([1, 2, 2], [2, -1, 2], [0, 0, 1]);
    expect(t.excess.turns).toBe(null);
    expect(t.checks().all).toBe(true);
    const v = t.excess.value(12);
    expect(v.low.toNumber()).toBeCloseTo(t.angles.A.approx + t.angles.B.approx + t.angles.C.approx - Math.PI, 10);
    expect(t.excess.approx).toBeGreaterThan(0);
  });
  test("circles are smaller than in the plane", () => {
    const c = G.scircle([0, 0, 1], { radius: "1/12" });
    expect(c.circumference.text).toBe("π");
    expect(c.area.text).toBe("(2 - √3)·π");
    expect(G.scircle([0, 0, 1], [1, 0, 0]).isGreat).toBe(true);
  });
  test("isometries: Euler's rotation theorem", () => {
    const r = G.srotation([0, 0, 1], "1/4");
    expect(String(r.apply(G.spoint(1, 0, 0)))).toBe("(0, 1, 0)");
    const c = r.then(G.srotation([1, 0, 0], "1/4")).classify();
    expect(c.kind).toBe("rotation");
    expect(c.angle.text).toBe("2π/3");
    expect(String(c.axis)).toBe("(√3/3, -√3/3, √3/3)");
    expect(G.equator().reflection.classify().kind).toBe("reflection");
    expect(r.then(G.equator().reflection).classify().kind).toBe("rotary reflection");
    expect(G.antipodalMap().classify().antipodal).toBe(true);
    expect(r.then(r.inverse).classify().kind).toBe("identity");
    expect(G.srotation([1, 1, 1], "1/2").classify().angle.text).toBe("π");
  });
});

describe("the hyperbolic plane", () => {
  test("one point, four models", () => {
    const p = G.hpoint("1/2", 0);
    expect(p.hyperboloid.map(txt)).toEqual(["5/3", "4/3", "0"]);
    expect(String(p.klein)).toBe("(4/5, 0)");
    expect(String(p.halfPlane)).toBe("(0, 3)");
    expect(G.fromKlein(p.klein).equals(p)).toBe(true);
    expect(G.fromHalfPlane(p.halfPlane).equals(p)).toBe(true);
    expect(G.fromHyperboloid(p.hyperboloid).equals(p)).toBe(true);
    expect(String(G.fromHalfPlane(0, 1).disc)).toBe("(0, 0)");
    expect(() => G.hpoint(1, 0)).toThrow();
    expect(G.ideal(1, 0).halfPlane).toBe(null);
    expect(txt(G.ideal(-1, 0).halfPlane)).toBe("0");
  });
  test("distance", () => {
    expect(G.horigin().distanceTo(G.hpoint("1/2", 0)).text).toBe("ln(3)");
    const d = G.hpoint("1/2", 0).distanceTo(G.hpoint(0, "1/2"));
    expect(txt(d.cosh)).toBe("25/9");
    expect(d.text).toBe("ln((25 + 4√34)/9)");
    expect(G.hmidpoint([0, 0], ["1/2", 0]).distanceTo(G.horigin()).double().text).toBe("ln(3)");
  });
  test("a line in each model", () => {
    const l = G.hline(["1/2", 0], [0, "1/2"]);
    expect(String(l.disc)).toBe("circle, centre (5/4, 5/4), radius √34/4");
    expect(String(l.klein)).toBe("5·x + 5·y - 4 = 0");
    expect(String(l.halfPlane)).toBe("circle, centre (5, 0), radius √34");
    expect(l.disc.contains(G.hpoint(0, "1/2").disc)).toBe(true);
    expect(l.klein.contains(G.hpoint(0, "1/2").klein)).toBe(true);
    expect(l.halfPlane.contains(G.hpoint(0, "1/2").halfPlane)).toBe(true);
    expect(l.ends.every((e) => l.contains(e))).toBe(true);
    expect(G.hline([0, 0], ["1/2", "1/3"]).disc instanceof G.Line).toBe(true);
    expect(G.hbisector([0, 0], ["1/2", 0]).contains(G.hmidpoint([0, 0], ["1/2", 0]))).toBe(true);
  });
  test("three ways for two lines to lie", () => {
    const l = G.hline(G.ideal(-1, 0), G.ideal(1, 0));
    expect(l.relation(G.hline(G.ideal(0, 1), G.ideal(1, 0))).kind).toBe("asymptotic");
    const r = l.relation(G.hline(G.ideal("3/5", "4/5"), G.ideal("-3/5", "4/5")));
    expect(r.kind).toBe("ultraparallel");
    expect(r.distance.text).toBe("ln(3)");
    expect(r.commonPerpendicular.isPerpendicularTo(l)).toBe(true);
    const x = l.relation(G.hline([0, 0], ["1/2", "1/2"]));
    expect(x.kind).toBe("intersecting");
    expect(x.angle.text).toBe("π/4");
    expect(x.point.equals(G.horigin())).toBe(true);
  });
  test("parallels: infinitely many, and the angle of parallelism", () => {
    const l = G.hline(G.ideal(-1, 0), G.ideal(1, 0));
    const P = G.hpoint(0, "1/2");
    const pp = l.parallelsThrough(P);
    expect(pp.count).toBe(Infinity);
    expect(pp.limiting.map((m) => l.relation(m).kind)).toEqual(["asymptotic", "asymptotic"]);
    expect(l.relation(pp.ultraparallel).kind).toBe("ultraparallel");
    expect(pp.distance.text).toBe("ln(3)");
    expect(txt(pp.angle.cos)).toBe("4/5"); // tanh(ln 3)
    // the limiting parallels make that angle with the perpendicular
    const perp = l.perpendicularThrough(P);
    expect(perp.relation(pp.limiting[0]).angle.equals(pp.angle)).toBe(true);
    // distance ln √3 gives exactly 60°
    const Q = G.hpoint(0, N.sub(num(2), N.sqrt(num(3))));
    expect(l.distanceTo(Q).double().text).toBe("ln(3)");
    expect(l.parallelsThrough(Q).angle.text).toBe("π/3");
  });
  test("triangles: defect is area", () => {
    const t = G.htriangle([0, 0], ["1/2", 0], [0, "1/2"]);
    expect(t.angles.A.text).toBe("π/2");
    expect(t.checks().all).toBe(true);
    expect(t.defect.approx).toBeGreaterThan(0);
    expect(t.defect.approx).toBeCloseTo(Math.PI / 2 - 2 * t.angles.B.approx, 12);
    // hyperbolic Pythagoras: cosh c = cosh a · cosh b
    expect(N.eq(t.sides.a.cosh, N.mul(t.sides.b.cosh, t.sides.c.cosh))).toBe(true);
    const idealT = G.htriangle(G.ideal(1, 0), G.ideal(0, 1), G.ideal(-1, 0));
    expect(idealT.area.text).toBe("π");
    expect(idealT.sides.a).toBe(null);
    expect(G.htriangle([0, 0], G.ideal(1, 0), G.ideal(0, 1)).area.text).toBe("π/2");
  });
  test("circles are larger than in the plane", () => {
    const c = G.hcircle([0, 0], { exp: 3 });
    expect(c.circumference.text).toBe("8/3·π");
    expect(c.area.text).toBe("4/3·π");
    const k = G.hcircle(["1/2", 0], ["1/2", "1/4"]);
    expect(String(k.disc)).toBe("circle, centre (11/24, 0), radius √37/24");
    expect(k.disc.contains(G.hpoint("1/2", "1/4").disc)).toBe(true);
    const h = G.horocycle(G.ideal(1, 0), [0, 0]);
    expect(String(h.disc)).toBe("circle, centre (1/2, 0), radius 1/2");
  });
  test("isometries, classified", () => {
    const r = G.hrotation(["1/2", 0], "1/6");
    expect(String(G.hrotation([0, 0], "1/4").apply(G.hpoint("1/2", 0)))).toBe("(0, 1/2) in the disc");
    const k = r.classify();
    expect(k.kind).toBe("rotation");
    expect(k.angle.text).toBe("π/3");
    expect(k.center.equals(G.hpoint("1/2", 0))).toBe(true);
    expect(G.hrotation([0, 0], "-1/6").classify().angle.text).toBe("−π/3");
    const t = G.htranslation([0, 0], ["1/2", 0]);
    expect(t.apply(G.horigin()).equals(G.hpoint("1/2", 0))).toBe(true);
    const tk = t.classify();
    expect(tk.kind).toBe("translation");
    expect(tk.length.text).toBe("ln(3)");
    expect(tk.axis.equals(G.hline(G.ideal(-1, 0), G.ideal(1, 0)))).toBe(true);
    const f = G.hline([0, 0], ["1/2", "1/3"]).reflection;
    expect(f.classify().kind).toBe("reflection");
    expect(f.then(f).classify().kind).toBe("identity");
    expect(f.then(t).classify().kind).toBe("glide reflection");
    // reflections in two asymptotic lines: a parabolic map fixing their shared end
    const a = G.hline(G.ideal(1, 0), G.ideal(0, 1));
    const b = G.hline(G.ideal(1, 0), G.ideal(-1, 0));
    const p = a.reflection.then(b.reflection).classify();
    expect(p.kind).toBe("parabolic");
    expect(p.ideal.equals(G.ideal(1, 0))).toBe(true);
    // a rotation by 60° then a translation by ln 3 along a line through its centre is parabolic: cos 60° = tanh(ln √3)
    expect(r.then(t).classify().kind).toBe("parabolic");
    expect(t.then(t.inverse).classify().kind).toBe("identity");
    expect(t.apply(a).equals(G.hline(t.apply(G.ideal(1, 0)), t.apply(G.ideal(0, 1))))).toBe(true);
  });
  test("isometries as Möbius maps of the disc", () => {
    const m = G.htranslation([0, 0], ["1/2", 0]).toMobius();
    // z → (z + 1/2)/(z/2 + 1)
    expect([m.a, m.b, m.c, m.d].map((z) => z.map(txt))).toEqual([["1", "0"], ["1/2", "0"], ["1/2", "0"], ["1", "0"]]);
    const q = G.hrotation([0, 0], "1/4").toMobius();
    expect(q.a.map(txt)).toEqual(["0", "1"]);
    expect(q.conjugate).toBe(false);
    expect(G.hline([0, 0], ["1/2", 0]).reflection.toMobius().conjugate).toBe(true);
  });
});

describe("regular tilings", () => {
  test("{p, q} sorts into three geometries", () => {
    const d = G.schlafli(5, 3);
    expect([d.geometry, d.solid, d.faces, d.vertices, d.edges, d.tileArea.text]).toEqual(["spherical", "dodecahedron", 12, 20, 30, "π/3"]);
    expect(G.schlafli(3, 5).faces).toBe(20);
    expect(G.schlafli(4, 3).edge.text.startsWith("1.2309594173")).toBe(true); // the cube's edge subtends arccos(1/3)
    expect(G.schlafli(4, 4).geometry).toBe("euclidean");
    expect(G.schlafli(6, 3).geometry).toBe("euclidean");
    const h = G.schlafli(7, 3);
    expect(h.geometry).toBe("hyperbolic");
    expect(h.tileArea.text).toBe("π/3");
  });
  test("{5, 4}: right-angled pentagons, exactly", () => {
    const t = G.hyperbolicTiling(5, 4);
    expect(t.tileArea.text).toBe("π/2");
    expect(t.check()).toEqual({ angle: true, edge: true });
    const p = t.patch(3);
    expect(p.kind).toBe("float");
    expect(p.counts).toEqual([1, 5, 15, 40]);
    expect(() => G.hyperbolicTiling(4, 4)).toThrow();
  });
  test("{7, 3} grows by 1, 7, 21, 56, 147", () => {
    expect(G.hyperbolicTiling(7, 3).patch(4).counts).toEqual([1, 7, 21, 56, 147]);
  });
});

describe("the parallel postulate and pictures", () => {
  test("five geometries, three answers", () => {
    const rows = G.parallelPostulate();
    expect(rows.map((r) => r.parallels)).toEqual(["exactly one", "none", "infinitely many", "exactly one", "none"]);
    expect(rows.every((r) => r.checked)).toBe(true);
  });
  test("figures in each model", () => {
    const l = G.hline(G.ideal(-1, 0), G.ideal(1, 0));
    const items = [l, G.hpoint(0, "1/2"), G.htriangle([0, 0], ["1/2", 0], G.ideal("1/8")), G.hcircle(["-1/2", "-1/3"], ["-1/2", "-1/2"]), G.ideal(0, 1)];
    for (const model of ["disc", "klein", "halfPlane"]) expect(G.figureSVG(G.hyperbolicFigure(items, { model })).includes("<svg")).toBe(true);
    expect(G.figureSVG(G.hyperbolicTilingFigure(5, 4, { layers: 2 })).includes("<svg")).toBe(true);
    expect(() => G.hyperbolicFigure(items, { model: "band" })).toThrow();
  });
});
