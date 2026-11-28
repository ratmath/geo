import { describe, expect, test } from "bun:test";
import {
  surface, classifySurface, parseEdgeWord, simplicialComplex, simplicial, solids,
  finiteSpace, fromBasis, fromPreorder, countTopologies, allTopologies, finiteSpaces,
} from "../index.js";

const H = (X) => X.homologyGroups().map((G) => G.toString({ additive: true }));
const ab = (X) => String(X.fundamentalGroup().abelianInvariants());

describe("surfaces from glued polygons", () => {
  const known = [
    ["a a^-1", ["Z", "0", "Z"], "sphere", true],
    ["a b a^-1 b^-1", ["Z", "Z^2", "Z"], "torus", true],
    ["a a", ["Z", "Z/2", "0"], "projective plane", false],
    ["a b a^-1 b", ["Z", "Z/2 ⊕ Z", "0"], "Klein bottle", false],
    ["a a b b", ["Z", "Z/2 ⊕ Z", "0"], "Klein bottle", false],
    ["a1 b1 a1^-1 b1^-1 a2 b2 a2^-1 b2^-1", ["Z", "Z^4", "Z"], "connected sum of 2 tori", true],
    ["a a b b c c", ["Z", "Z/2 ⊕ Z^2", "0"], "connected sum of 3 projective planes", false],
  ];
  for (const [w, h, name, orientable] of known) {
    test(`${w}: homology, name, χ = Σ(−1)^k b_k, H₁ = π₁ abelianised`, () => {
      const S = surface(w);
      expect(H(S)).toEqual(h);
      expect(S.classify().name).toBe(name);
      expect(S.orientable).toBe(orientable);
      expect(S.betti().reduce((s, b, k) => s + (k % 2 ? -b : b), 0)).toBe(S.eulerCharacteristic);
      expect(ab(S)).toBe(S.homology(1).toString());
      // the normal form is the same surface
      const N = surface(S.classify().normalForm);
      expect(N.classify()).toEqual(S.classify());
      expect(H(N)).toEqual(h);
    });
  }
  test("surfaces with boundary: disk, annulus, Möbius band", () => {
    expect(surface("a b").classify().name).toBe("disk");
    expect(surface("a x b x^-1").classify().name).toBe("annulus");
    const M = surface("a b a c");
    expect(M.classify().name).toBe("Möbius band");
    expect(M.boundaryComponents).toBe(1);
    expect(H(M)).toEqual(["Z", "Z", "0"]);
  });
  test("several polygons; singleFace keeps the surface", () => {
    const S = surface(["a b c", "c^-1 b^-1 a^-1"]);
    expect(S.cells).toEqual([3, 3, 2]);
    expect(S.classify().name).toBe("sphere");
    expect(S.singleFace().classify().name).toBe("sphere");
    const T = surface(["a b c", "c^-1 a^-1 b^-1"]);   // two triangles making a torus
    expect(T.classify().name).toBe(surface(["a b c", "c^-1 a^-1 b^-1"]).singleFace().classify().name);
    expect(H(T)).toEqual(H(T.singleFace()));
  });
  test("connected sums: T # P = P # P # P, and χ adds as χ₁ + χ₂ − 2", () => {
    const TP = surface("a b a^-1 b^-1").connectedSum("a a");
    expect(TP.classify().name).toBe("connected sum of 3 projective planes");
    const TT = surface("a b a^-1 b^-1").connectedSum(surface("a b a^-1 b^-1"));
    expect(TT.classify().genus).toBe(2);
    expect(TT.eulerCharacteristic).toBe(0 + 0 - 2);
    expect(String(TT.fundamentalGroup().abelianInvariants())).toBe("Z^4");
  });
  test("fundamental groups: torus ⟨a, b | aba⁻¹b⁻¹⟩, RP² of order 2", () => {
    expect(String(surface("a b a^-1 b^-1").fundamentalGroup())).toBe("⟨a, b | aba⁻¹b⁻¹⟩");
    expect(surface("a a").fundamentalGroup().order()).toBe(2);
  });
  test("parsing and refusals", () => {
    expect(parseEdgeWord("aba⁻¹b'")).toEqual([{ label: "a", exp: 1 }, { label: "b", exp: 1 }, { label: "a", exp: -1 }, { label: "b", exp: -1 }]);
    expect(() => surface("a a a")).toThrow(/3 times/);
    expect(() => surface(["a a^-1", "b b^-1"])).toThrow(/connected/);
    expect(() => surface("a ? b")).toThrow(/cannot read/);
  });
  test("classifySurface from χ: 10 − 36 + 24 = −2 orientable is genus 2", () => {
    // f-vector of a minimal genus-2 triangulation; 3F = 2E as for every closed triangulated surface
    const c = classifySurface({ euler: 10 - 36 + 24, orientable: true });
    expect([c.genus, c.name]).toEqual([2, "connected sum of 2 tori"]);
    expect(classifySurface({ euler: -1, orientable: false }).crosscaps).toBe(3);
    expect(() => classifySurface({ euler: -1, orientable: true })).toThrow();
    expect(() => classifySurface({ euler: 3, orientable: false })).toThrow();
    // a boundary count is a whole number, 0 or more
    expect(() => classifySurface({ euler: 2, orientable: true, boundaryComponents: -2 })).toThrow(/whole number/);
    expect(() => classifySurface({ euler: 0, orientable: true, boundaryComponents: 1.5 })).toThrow(/whole number/);
    expect(classifySurface({ euler: -1, orientable: true, boundaryComponents: 1 }).name).toBe("torus with 1 hole");
    expect(classifySurface({ euler: 0, orientable: true, boundaryComponents: 2 }).name).toBe("annulus");
  });
});

describe("simplicial complexes", () => {
  test("spheres Sⁿ: f-vector C(n+2, k+1), homology Z in 0 and n", () => {
    for (let n = 1; n <= 4; n++) {
      const S = simplicial.sphere(n);
      const h = H(S);
      expect(h[0]).toBe("Z");
      expect(h[n]).toBe("Z");
      expect(h.slice(1, n).every((x) => x === "0")).toBe(true);
      expect(S.eulerCharacteristic).toBe(n % 2 ? 0 : 2);
    }
    expect(simplicial.sphere(2).fVector).toEqual([4, 6, 4]);
  });
  test("the named surfaces: same classification from the triangulation and from the word", () => {
    const pairs = [[simplicial.torus(), "a b a^-1 b^-1"], [simplicial.projectivePlane(), "a a"], [simplicial.kleinBottle(), "a b a^-1 b"], [simplicial.sphere(2), "a a^-1"]];
    for (const [X, w] of pairs) {
      expect(X.isSurface).toBe(true);
      expect(X.classify()).toEqual(surface(w).classify());
      expect(H(X)).toEqual(H(surface(w)));
      expect(ab(X)).toBe(X.homology(1).toString());
    }
    expect(simplicial.torus().fVector).toEqual([7, 21, 14]);
    expect(simplicial.projectivePlane().fVector).toEqual([6, 15, 10]);
  });
  test("a graph: χ = V − E and b₁ = E − V + 1 (Petersen graph)", () => {
    const outer = [0, 1, 2, 3, 4], inner = [5, 6, 7, 8, 9];
    const edges = [...outer.map((v) => [v, (v + 1) % 5]), ...outer.map((v) => [v, v + 5]), ...inner.map((v) => [v, ((v - 5 + 2) % 5) + 5])];
    const G = simplicial.fromGraph({ vertices: [...outer, ...inner], edges });
    expect(G.eulerCharacteristic).toBe(-5);
    expect(G.betti()).toEqual([1, 6]);
    expect(String(G.fundamentalGroup().abelianInvariants())).toBe("Z^6");
  });
  test("a polyhedron's boundary is a sphere", () => {
    for (const name of ["cube", "icosahedron", "dodecahedron"]) {
      const X = simplicial.fromPolyhedron(solids[name]());
      expect(H(X)).toEqual(["Z", "0", "Z"]);
      expect(X.classify().name).toBe("sphere");
    }
  });
  test("not a surface; components and links", () => {
    const two = simplicialComplex([[1, 2, 3], [1, 2, 4], [1, 2, 5]]);
    expect(two.surfaceCheck()).toEqual({ surface: false, reason: "edge [1,2] is in 3 triangles" });
    const X = simplicialComplex([[1, 2], [3, 4], [5]]);
    expect(X.components().length).toBe(3);
    expect(X.betti()).toEqual([3, 0]);
    expect(simplicial.torus().link(1).fVector).toEqual([6, 6]);
  });
  test("homology with coefficients: RP² over Z/2 and Q", () => {
    const P = simplicial.projectivePlane();
    expect(P.betti({ coefficients: "Z/2" })).toEqual([1, 1, 1]);
    expect(P.betti({ coefficients: "Q" })).toEqual([1, 0, 0]);
  });
});

describe("finite spaces", () => {
  // independent: test every family of subsets against the axioms
  const bruteCount = (n) => {
    const subsets = 1 << n;
    const full = subsets - 1;
    let count = 0;
    for (let fam = 0; fam < 2 ** subsets; fam++) {
      const has = (m) => Math.floor(fam / 2 ** m) % 2 === 1;
      if (!has(0) || !has(full)) continue;
      let ok = true;
      for (let a = 0; a < subsets && ok; a++) if (has(a)) for (let b = 0; b < subsets; b++) if (has(b) && (!has(a | b) || !has(a & b))) { ok = false; break; }
      if (ok) count++;
    }
    return count;
  };
  test("counting topologies through preorders agrees with brute force (n ≤ 4)", () => {
    for (let n = 1; n <= 4; n++) expect(countTopologies(n)).toBe(bruteCount(n));
    expect(countTopologies(3)).toBe(29);
    expect(countTopologies(3, { t0: true })).toBe(19);
    expect(allTopologies([1, 2, 3]).length).toBe(29);
    expect(allTopologies([1, 2, 3]).every((X) => finiteSpace(X.points, X.opens))).toBeTruthy();
  });
  test("closure, interior, boundary, minimal open sets", () => {
    const X = finiteSpace(["a", "b", "c"], [[], ["a"], ["a", "b"], ["a", "b", "c"]]);
    expect(X.closure(["b"])).toEqual(["b", "c"]);
    expect(X.interior(["b", "c"])).toEqual([]);
    expect(X.boundary(["a"])).toEqual(["b", "c"]);
    expect(X.minimalOpen("c")).toEqual(["a", "b", "c"]);
    expect(X.isDense(["a"])).toBe(true);
    expect([X.isT0, X.isT1, X.isConnected]).toEqual([true, false, true]);
    expect(X.isBasis(X.minimalBasis)).toBe(true);
  });
  test("axioms and bases are checked", () => {
    expect(() => finiteSpace([1, 2, 3], [[], [1], [2], [1, 2, 3]])).toThrow(/union/);
    expect(() => finiteSpace([1, 2], [[1], [1, 2]])).toThrow(/empty/);
    expect(() => fromBasis([1, 2, 3], [[1, 2], [2, 3]])).toThrow(/basis/);
    expect(fromBasis([1, 2, 3], [[1, 2], [2, 3], [2]]).opens.length).toBe(5);
  });
  test("preorders, continuity, components, subspaces", () => {
    const P = fromPreorder([1, 2, 3], [[1, 2], [2, 3]]);   // a chain: U_1 = {1, 2, 3}
    expect(P.opens).toEqual([[], [3], [2, 3], [1, 2, 3]]);
    const S = finiteSpaces.sierpinski();
    expect(S.isContinuous((x) => x, S)).toBe(true);
    expect(S.continuity((x) => 1 - x, S)).toEqual({ continuous: false, witness: { open: [1], preimage: [0] } });
    const D = finiteSpaces.discrete([1, 2, 3]);
    expect([D.isT1, D.components().length]).toEqual([true, 3]);
    expect(finiteSpaces.indiscrete([1, 2]).isT0).toBe(false);
    expect(finiteSpaces.pseudocircle().isConnected).toBe(true);
    expect(P.subspace([1, 3]).opens).toEqual([[], [3], [1, 3]]);
  });
});
