// Phases 4 and 5: projective and finite geometry; solids, symmetry, tilings.
// Each exact answer is checked against something computed another way.
import { describe, test, expect } from "bun:test";
import { Rational } from "@ratmath/core";
import {
  N, num, ppoint, pline, join, meetLines, collinearP, crossRatio, harmonicConjugate, projectivity, projectivityFrom, Conic, conicThrough,
  desargues, pappus, pascal, brianchon, lineAtInfinity,
  incidence, projectivePlane, affinePlane, fano,
  polyhedron, solids, prism, figureSymmetry, wallpaper, wallpaperGroup, friezeGroup, friezes,
  polygonAngle, vertexTypes, uniformTiling, regularTilings, regularPolygon,
} from "../index.js";

const q = (n, d = 1) => new Rational(BigInt(n), BigInt(d));
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const rq = () => q(Math.floor(rnd() * 41) - 20, Math.floor(rnd() * 9) + 1);
const ex = (x) => N.toNumber(x);

describe("the projective plane", () => {
  test("cross-ratio of ordinary points is (AC·BD)/(AD·BC) with signed lengths", () => {
    for (let i = 0; i < 30; i++) {
      const xs = [rq(), rq(), rq(), rq()];
      if (new Set(xs.map(String)).size < 4) continue;
      // points on the line y = 2x + 1
      const P = xs.map((x) => [x, x.multiply(q(2)).add(q(1))]);
      const [a, b, c, d] = xs;
      const expected = c.subtract(a).multiply(d.subtract(b)).divide(d.subtract(a).multiply(c.subtract(b)));
      expect(N.eq(crossRatio(...P), expected)).toBe(true);
    }
  });
  test("projective maps keep cross-ratios and incidence", () => {
    for (let i = 0; i < 10; i++) {
      const M = [[rq(), rq(), rq()], [rq(), rq(), rq()], [rq(), rq(), rq()]];
      let T;
      try {
        T = projectivity(M);
      } catch {
        continue;
      }
      const P = [[0, 1], [1, 3], [2, 5], ["7/2", 8]];
      const before = crossRatio(...P);
      const imgs = P.map((p) => T.apply(p));
      if (imgs.some((p) => p.atInfinity)) continue;
      expect(N.eq(crossRatio(...imgs), before)).toBe(true);
      // a line's image contains the images of its points
      const l = join(P[0], P[1]);
      expect(T.apply(l).contains(imgs[2])).toBe(true);
      expect(T.compose(T.inverse()).equals(projectivity([[1, 0, 0], [0, 1, 0], [0, 0, 1]]))).toBe(true);
    }
  });
  test("the fundamental theorem: four points to four points", () => {
    const from = [[0, 0], [1, 0], [0, 1], [1, 1]];
    const to = [[1, 2], [3, "1/2"], [-1, 4], [5, 7]];
    const T = projectivityFrom(from, to);
    from.forEach((p, i) => expect(T.apply(p).equals(ppoint(to[i]))).toBe(true));
    expect(() => projectivityFrom([[0, 0], [1, 1], [2, 2], [3, 5]], to)).toThrow();
  });
  test("duality and the harmonic conjugate", () => {
    const l = join([0, 0], [1, 1]);
    const m = join([0, 1], [1, 2]);
    expect(meetLines(l, m).atInfinity).toBe(true); // parallel lines meet at infinity
    expect(lineAtInfinity().contains(meetLines(l, m))).toBe(true);
    expect(l.dual.dual.equals(l)).toBe(true);
    const D = harmonicConjugate([0, 0], [6, 0], [2, 0]);
    expect(N.eq(crossRatio([0, 0], [6, 0], [2, 0], D), num(-1))).toBe(true);
    expect(D.toAffine().x.equals(q(-6))).toBe(true); // 1/AC + 1/AD = 2/AB: 1/2 − 1/6 = 1/3
  });
  test("conics: five points, classification, tangents, poles", () => {
    // rational points on the circle x² + y² = 25
    const pts = [[5, 0], [3, 4], [-4, 3], [0, -5], [4, -3]];
    const C = conicThrough(pts);
    expect(C.classify()).toBe("circle");
    expect(C.contains([-3, -4])).toBe(true);
    const t = C.tangentAt([3, 4]);
    // the tangent at (3, 4) is 3x + 4y = 25
    expect(t.equals(pline(3, 4, -25))).toBe(true);
    expect(C.pole(t).equals(ppoint(3, 4))).toBe(true);
    expect(Conic.fromCoefficients([1, 0, -1, 0, 0, -1]).classify()).toBe("hyperbola");
    expect(Conic.fromCoefficients([0, 0, 1, -4, 0, 0]).classify()).toBe("parabola");
    expect(Conic.fromCoefficients([1, 0, 4, 0, 0, -4]).classify()).toBe("ellipse");
    expect(Conic.fromCoefficients([1, 0, 1, 0, 0, 1]).classify()).toBe("ellipse with no real points");
    expect(Conic.fromCoefficients([1, 0, -1, 0, 0, 0]).classify()).toBe("two crossing lines");
    expect(() => conicThrough([[0, 0], [1, 0], [2, 0], [3, 0], [0, 1]])).toThrow();
  });
  test("Pascal, Brianchon, Desargues, Pappus on random exact figures", () => {
    // rational points on the hyperbola xy = 1 and the circle by its rational parametrization
    const circle = (t) => [q(1).subtract(t.multiply(t)).divide(q(1).add(t.multiply(t))), q(2).multiply(t).divide(q(1).add(t.multiply(t)))];
    for (let i = 0; i < 5; i++) {
      const ts = [rq(), rq(), rq(), rq(), rq(), rq()];
      if (new Set(ts.map(String)).size < 6) continue;
      expect(pascal(ts.map(circle)).holds).toBe(true);
      const hyp = ts.filter((t) => t.numerator !== 0n).map((t) => [t, q(1).divide(t)]);
      if (hyp.length === 6) expect(pascal(hyp).holds).toBe(true);
      expect(brianchon(conicThrough(ts.slice(0, 5).map(circle)), ts.map(circle)).holds).toBe(true);
    }
    // six points not on one conic
    expect(() => pascal([[0, 0], [1, 0], [0, 1], [2, 3], [5, 1], [7, 9]])).toThrow();
    for (let i = 0; i < 10; i++) {
      const O = [rq(), rq()];
      const T = [[rq(), rq()], [rq(), rq()], [rq(), rq()]];
      const s = [rq(), rq(), rq()];
      const T2 = T.map((p, k) => [O[0].add(s[k].multiply(p[0].subtract(O[0]))), O[1].add(s[k].multiply(p[1].subtract(O[1])))]);
      let r;
      try {
        r = desargues(T, T2);
      } catch {
        continue; // a degenerate random figure
      }
      expect(r.fromPoint).toBe(true);
      expect(r.fromLine).toBe(true);
    }
    for (let i = 0; i < 10; i++) {
      const A = [rq(), rq(), rq()].map((x) => [x, q(0)]);
      const B = [rq(), rq(), rq()].map((x) => [x, x.multiply(q(3)).add(q(1))]);
      try {
        expect(pappus(A, B).holds).toBe(true);
      } catch (e) {
        expect(e.code).toBe("degenerate");
      }
    }
  });
});

describe("finite geometries", () => {
  // N Nᵀ = n·I + J for the incidence matrix of a projective plane of order n
  const checkGram = (P, n) => {
    const M = P.matrix;
    const b = M.length;
    for (let i = 0; i < b; i++) for (let j = 0; j < b; j++) {
      let s = 0;
      for (let k = 0; k < P.v; k++) s += M[i][k] * M[j][k];
      expect(s).toBe(i === j ? n + 1 : 1);
    }
  };
  test("PG(2, q) for q = 2, 3, 4, 5, 7, 8, 9", () => {
    for (const qq of [2, 3, 4, 5, 7, 8, 9]) {
      const P = projectivePlane(qq);
      expect(P.v).toBe(qq * qq + qq + 1);
      expect(P.b).toBe(qq * qq + qq + 1);
      expect(P.order).toBe(qq);
      checkGram(P, qq);
      if (qq <= 4) expect(P.isProjectivePlane()).toBe(true);
      expect(P.designParameters()).toMatchObject({ k: qq + 1, lambda: 1 });
    }
    expect(() => projectivePlane(6)).toThrow();
    expect(() => projectivePlane(10)).toThrow();
  });
  test("the Fano plane and its 168 collineations", () => {
    const F = fano();
    expect(F.collineations().order).toBe(168);
    expect(F.collineationGroup().order).toBe(168);
    expect(F.dual().isProjectivePlane()).toBe(true);
    expect(F.parallels(0, F.lines.findIndex((l) => !l.includes(0)))).toEqual([]);
  });
  test("collineation groups have order k·q³(q³ − 1)(q² − 1)", () => {
    expect(projectivePlane(3).collineationGroup().order).toBe(27 * 26 * 8);
    expect(projectivePlane(4).collineationGroup().order).toBe(2 * 64 * 63 * 15);
  }, 60000);
  test("AG(2, q): Playfair holds, and the completion is a projective plane", () => {
    for (const qq of [2, 3, 4, 5]) {
      const A = affinePlane(qq);
      expect(A.v).toBe(qq * qq);
      expect(A.b).toBe(qq * qq + qq);
      expect(A.isAffinePlane()).toBe(true);
      expect(A.parallelClasses.length).toBe(qq + 1);
      const C = A.completion();
      checkGram(C, qq);
    }
    // a triangle is neither
    const T = incidence([[0, 1], [1, 2], [0, 2]]);
    expect(T.isProjectivePlane()).toBe(false);
    expect(T.isAffinePlane()).toBe(false);
  });
});

describe("polyhedra", () => {
  const known = {
    tetrahedron: { V: 4, E: 6, F: 4, sym: 24, rot: 12, cos: [1 / 3] },
    cube: { V: 8, E: 12, F: 6, sym: 48, rot: 24, cos: [0] },
    octahedron: { V: 6, E: 12, F: 8, sym: 48, rot: 24, cos: [-1 / 3] },
    dodecahedron: { V: 20, E: 30, F: 12, sym: 120, rot: 60, cos: [-1 / Math.sqrt(5)] },
    icosahedron: { V: 12, E: 30, F: 20, sym: 120, rot: 60, cos: [-Math.sqrt(5) / 3] },
    cuboctahedron: { V: 12, E: 24, F: 14, sym: 48, rot: 24 },
    truncatedOctahedron: { V: 24, E: 36, F: 14, sym: 48, rot: 24 },
    truncatedTetrahedron: { V: 12, E: 18, F: 8, sym: 24, rot: 12 },
    truncatedCube: { V: 24, E: 36, F: 14, sym: 48, rot: 24 },
  };
  // volume from the edge length a: the classical formulas
  const volumeOf = { tetrahedron: (a) => a ** 3 / (6 * Math.SQRT2), cube: (a) => a ** 3, octahedron: (a) => (Math.SQRT2 / 3) * a ** 3, dodecahedron: (a) => ((15 + 7 * Math.sqrt(5)) / 4) * a ** 3, icosahedron: (a) => ((5 * (3 + Math.sqrt(5))) / 12) * a ** 3, cuboctahedron: (a) => ((5 * Math.SQRT2) / 3) * a ** 3, truncatedOctahedron: (a) => 8 * Math.SQRT2 * a ** 3, truncatedTetrahedron: (a) => ((23 * Math.SQRT2) / 12) * a ** 3, truncatedCube: (a) => ((21 + 14 * Math.SQRT2) / 3) * a ** 3 };
  for (const [k, K] of Object.entries(known))
    test(k, () => {
      const P = solids[k]();
      expect([P.V, P.E, P.F]).toEqual([K.V, K.E, K.F]);
      expect(P.euler).toBe(2);
      expect(P.edgeLengths2.length).toBe(1);
      expect(P.vertexConfigurations.length).toBe(1);
      const a = Math.sqrt(ex(P.edgeLengths2[0]));
      expect(Math.abs(ex(P.volume) - volumeOf[k](a))).toBeLessThan(1e-9 * volumeOf[k](a));
      if (K.cos) expect(P.dihedralCosines.map(ex).sort()).toEqual(K.cos.map((c) => expect.closeTo(c, 12)));
      const s = P.symmetry();
      expect([s.order, s.rotations]).toEqual([K.sym, K.rot]);
      expect(s.group.order).toBe(K.sym);
    });
  test("duals swap vertices and faces", () => {
    for (const [a, b] of [["cube", "octahedron"], ["icosahedron", "dodecahedron"], ["tetrahedron", "tetrahedron"]]) {
      const D = solids[a]().dual();
      const B = solids[b]();
      expect([D.V, D.E, D.F]).toEqual([B.V, B.E, B.F]);
      expect(D.faceCounts).toEqual(B.faceCounts);
    }
    const C = solids.cuboctahedron().dual();
    expect(C.faceCounts).toEqual({ 4: 12 }); // the rhombic dodecahedron
    expect(C.vertexConfigurations.sort()).toEqual(["4.4.4", "4.4.4.4"]);
  });
  test("surface area, prisms, hulls", () => {
    expect(ex(solids.icosahedron().surfaceArea)).toBeCloseTo(20 * Math.sqrt(3), 12);
    const p = prism(5);
    expect(p.faceCounts).toEqual({ 4: 5, 5: 2 });
    expect(ex(p.volume)).toBeCloseTo(2 * (5 / 2) * Math.sin((2 * Math.PI) / 5), 12);
    expect(p.symmetry().order).toBe(20);
    // the hull of a cube with a point inside it is refused as a list of corners
    expect(() => polyhedron([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1], ["1/5", "1/5", "1/5"]])).toThrow();
    // volume of a random rational hull equals the sum of the tetrahedra (float check)
    const pts = [[0, 0, 0], [3, 0, 0], [0, 2, 0], [0, 0, 5], [2, 2, 2], [1, -1, 3]];
    const H = polyhedron(pts);
    expect(H.euler).toBe(2);
    let v = 0;
    const c = H.center.map(ex);
    for (const f of H.faces) {
      const P = f.map((i) => H.vertices[i].map(ex).map((x, k) => x - c[k]));
      for (let i = 1; i + 1 < P.length; i++) {
        const [a, b, d] = [P[0], P[i], P[i + 1]];
        v += (a[0] * (b[1] * d[2] - b[2] * d[1]) - a[1] * (b[0] * d[2] - b[2] * d[0]) + a[2] * (b[0] * d[1] - b[1] * d[0])) / 6;
      }
    }
    expect(ex(H.volume)).toBeCloseTo(v, 12);
  });
});

describe("symmetry in the plane", () => {
  test("rosettes: regular polygons are dihedral", () => {
    for (const n of [3, 4, 5, 6]) expect(figureSymmetry(regularPolygon(n)).name).toBe(`D${n}`);
    expect(figureSymmetry([[0, 0], [3, 0], [0, 1]]).name).toBe("C1");
    // a pinwheel: rotations but no mirrors
    expect(figureSymmetry([[2, 0], [0, 2], [-2, 0], [0, -2], [2, 1], [-1, 2], [-2, -1], [1, -2]]).name).toBe("C4");
    const s = figureSymmetry(regularPolygon(4));
    for (const T of s.transforms) expect(T.isIsometry()).toBe(true);
  });
  const seeds = [["1/7", "2/11"], ["1/5", "3/13"], ["2/9", "1/17"]];
  test("all seventeen wallpaper groups are recovered from their generators", () => {
    for (const name of wallpaper.names) expect(wallpaper.classify(wallpaper.pattern(name, seeds)).name).toBe(name);
  });
  test("the classification does not depend on the origin or the basis", () => {
    for (const name of wallpaper.names) {
      const p = wallpaper.pattern(name, seeds);
      // shift every point by a rational vector
      const shifted = { ...p, points: p.points.map(([x, y]) => [x.add(q(3, 10)), y.add(q(1, 7))]) };
      expect(wallpaperGroup(shifted).name).toBe(name);
      // change basis by U = [[1, 1], [0, 1]]: new coordinates U⁻¹x, Gram UᵀGU
      const G = p.gram.map((r) => r.map(num));
      const G2 = [[G[0][0], N.add(G[0][0], G[0][1])], [N.add(G[0][0], G[0][1]), N.sum(G[0][0], G[0][1], G[0][1], G[1][1])]];
      const moved = { gram: G2, labels: p.labels, points: p.points.map(([x, y]) => [x.subtract(y), y]) };
      expect(wallpaperGroup(moved).name).toBe(name);
    }
  });
  test("the seven frieze groups", () => {
    const m = [[q(1, 10), q(1, 5)], [q(3, 20), q(1, 2)], [q(1, 5), q(3, 10)], [q(2, 5), q(0)], [q(9, 20), q(1)]];
    const id = ([x, y]) => [x, y];
    const H = ([x, y]) => [x, q(1).subtract(y)];
    const V = ([x, y]) => [x.negate(), y];
    const Rt = ([x, y]) => [x.negate(), q(1).subtract(y)];
    const G = ([x, y]) => [x.add(q(1, 2)), q(1).subtract(y)];
    const VG = ([x, y]) => [x.negate().add(q(1, 2)), q(1).subtract(y)];
    const cases = { p1: [id], p11g: [id, G], p1m1: [id, V], p2: [id, Rt], p2mg: [id, V, G, VG], p11m: [id, H], p2mm: [id, H, V, Rt] };
    for (const [name, ops] of Object.entries(cases)) {
      const pts = ops.flatMap((f) => m.map(f));
      const r = friezeGroup({ points: pts });
      expect(r.name).toBe(name);
      expect(r.conway).toBe(friezes[name].conway);
      // moving the motif along the strip changes nothing
      expect(friezeGroup({ points: pts.map(([x, y]) => [x.add(q(2, 7)), y]) }).name).toBe(name);
    }
  });
});

describe("tilings", () => {
  test("21 vertex types, found again by brute force over integers", () => {
    // Σ (n − 2)/n = 2 ⇔ Σ (1/2 − 1/n) = 1; multisets of n ≥ 3 with up to 6 parts
    const sols = [];
    const rec = (parts, start) => {
      const s = parts.reduce((a, n) => a + (n - 2) / n, 0);
      if (parts.length >= 3 && Math.abs(s - 2) < 1e-12) sols.push(parts.join("."));
      if (parts.length === 6 || s > 2) return;
      for (let n = start; n <= 100; n++) rec([...parts, n], n);
    };
    rec([], 3);
    expect(sols.length).toBe(17); // multisets
    const types = vertexTypes();
    expect(types.length).toBe(21);
    for (const t of types) expect(t.reduce((s, n) => s.add(polygonAngle(n)), q(0)).equals(q(1))).toBe(true);
    const multisets = new Set(types.map((t) => [...t].sort((a, b) => a - b).join(".")));
    expect(multisets).toEqual(new Set(sols));
  });
  test("exactly 11 can be uniform", () => {
    const u = vertexTypes().map(uniformTiling);
    expect(u.filter((x) => x.uniform).map((x) => x.type).sort()).toEqual(["3.12.12", "3.3.3.3.3.3", "3.3.3.3.6", "3.3.3.4.4", "3.3.4.3.4", "3.4.6.4", "3.6.3.6", "4.4.4.4", "4.6.12", "4.8.8", "6.6.6"]);
    expect(uniformTiling("3.4.4.6").uniform).toBe(false);
    expect(uniformTiling("3.3.3.3").fits).toBe(false);
    expect(regularTilings().map((t) => t.symbol)).toEqual(["{3, 6}", "{4, 4}", "{6, 3}"]);
  });
});
