import { describe, expect, test } from "bun:test";
import { configuration, proofs, provable, Proof } from "../index.js";

const triangle = (T) => [T.at("A", 0, 0), T.at("B", "b", 0), T.at("C", "c", "d")];
const meanings = (p) => p.conditions.map((c) => c.meaning ?? c.text);

describe("the prover", () => {
  test("Thales, with both methods", () => {
    for (const method of ["wu", "groebner", "auto"]) {
      const T = configuration("Thales");
      const O = T.at("O", 0, 0);
      const A = T.at("A", -1, 0);
      const B = T.at("B", 1, 0);
      const C = T.on("C", (P) => T.onCircle(P, O, A));
      const p = T.prove(T.rightAngle(A, C, B), { method });
      expect(p).toBeInstanceOf(Proof);
      expect(p.proved).toBe(true);
      expect(p.replay()).toBe(true);
      expect(p.conditions).toEqual([]);
      expect(String(p)).toContain("proved");
    }
  });
  test("the certificate is an identity that multiplies out", () => {
    const T = configuration("Euler line");
    const [A, B, C] = triangle(T);
    const O = T.circumcenter("O", A, B, C);
    const G = T.centroid("G", A, B, C);
    const H = T.orthocenter("H", A, B, C);
    const p = T.prove(T.collinear(O, G, H));
    expect(p.proved).toBe(true);
    expect(p.method).toBe("wu");
    const id = p.identity;
    expect(String(id.multiplier)).toBe("b·d");
    expect(id.cofactors.length).toBe(T.hypotheses.length);
    const right = id.cofactors.reduce((s, c, i) => s.add(c.mul(id.hypotheses[i])), id.ring.zero);
    expect(id.multiplier.mul(id.conclusion.pow(id.power)).equals(right)).toBe(true);
    expect(meanings(p)).toEqual(["A, B, C are not collinear"]);
    expect(p.explain()).toContain("A, B, C are not collinear");
    expect(p.size.power).toBe(1);
  });
  test("the Gröbner method gives conditions on the parameters alone", () => {
    const T = configuration("Simson");
    const [A, B, C] = triangle(T);
    const P = T.onCircumcircle("P", A, B, C);
    const p = T.prove(T.collinear(T.foot("X", P, [B, C]), T.foot("Y", P, [C, A]), T.foot("Z", P, [A, B])), { method: "groebner" });
    expect(p.proved).toBe(true);
    expect(p.method).toBe("groebner");
    expect(p.identity.multiplier.variables().every((v) => T.parameters.includes(v))).toBe(true);
    expect(meanings(p).sort()).toEqual(["A ≠ C", "A, B, C are not collinear", "B ≠ C"]);
  });
  test("a false statement is not proved, and one figure shows why", () => {
    const T = configuration("medians are altitudes?");
    const [A, B, C] = triangle(T);
    const M = T.midpoint("M", B, C);
    for (const method of ["wu", "groebner", "auto"]) {
      const p = T.prove(T.perpendicular(A, M, B, C), { method });
      expect(p.proved).toBe(false);
      expect(p.identity).toBe(null);
      expect(p.replay()).toBe(false);
      expect(p.instance.solutions).toBe(1);
      expect(p.instance.holdsAt).toBe(0);
      expect(p.explain()).toContain("Not proved");
    }
  });
  test("a statement true for some solutions only is not proved", () => {
    // "a point on the line AM and on the circle" can be A itself, so the butterfly fails as stated this way
    const T = configuration("butterfly, stated loosely");
    const M = T.at("M", 0, 0);
    const O = T.at("O", 0, "o");
    const P = T.at("P", "p", 0);
    const A = T.on("A", (X) => T.onCircle(X, O, P));
    const C = T.on("C", (X) => T.onCircle(X, O, P));
    const B = T.where("B", (X) => [T.collinear(A, M, X), T.onCircle(X, O, P)]);
    const D = T.where("D", (X) => [T.collinear(C, M, X), T.onCircle(X, O, P)]);
    const X = T.intersection("X", [A, D], [M, P]);
    const Y = T.intersection("Y", [B, C], [M, P]);
    const p = T.prove(T.equal(X.x.add(Y.x), 0));
    expect(p.proved).toBe(false);
    expect(p.instance.holdsAt).toBeGreaterThan(0);
    expect(p.instance.holdsAt).toBeLessThan(p.instance.solutions);
  });
  test("several conclusions, and a mixture", () => {
    const T = configuration("midline");
    const [A, B, C] = triangle(T);
    const M = T.midpoint("M", A, B);
    const N = T.midpoint("N", A, C);
    const p = T.prove([T.parallel(M, N, B, C), T.equal(T.distance2(M, N).mul(4), T.distance2(B, C))]);
    expect(p.proved).toBe(true);
    expect(p.parts.length).toBe(2);
    const q = T.prove([T.parallel(M, N, B, C), T.perpendicular(M, N, B, C)]);
    expect(q.proved).toBe(false);
    expect(q.parts.map((x) => x.proved)).toEqual([true, false]);
  });
  test("unknown numbers: Napoleon's theorem needs √3", () => {
    const p = proofs.napoleon();
    expect(p.proved).toBe(true);
    expect(p.configuration.unknowns).toContain("s");
  });
  test("refusals", () => {
    const T = configuration();
    const A = T.at("A", 0, 0);
    expect(() => T.at("A", 1, 1)).toThrow("already");
    expect(() => T.at("B c", 1, 1)).toThrow("name");
    expect(() => T.where("P", (P) => [T.collinear(A, A, P)])).toThrow("condition");
    expect(() => T.prove(T.distance2(A, A), { method: "magic" })).toThrow("method");
    expect(() => proofs.setup("nothing")).toThrow("no theorem");
    const U = configuration();
    expect(() => U.prove(U.distance2(U.at("A", 0, 0), U.at("B", 1, 0)))).toThrow("nothing general");
  });
  test("describe lists the figure and the hypotheses", () => {
    const { configuration: T } = proofs.setup("pythagoras");
    const text = T.describe();
    expect(text).toContain("A = (0, 0)");
    expect(text).toContain("∠ACB is a right angle");
    expect(T.parameters).toEqual(["b", "xC"]);
    expect(T.unknowns).toEqual(["yC"]);
  });
});

describe("classical theorems, proved in general", () => {
  test("the list", () => {
    expect(provable.length).toBeGreaterThanOrEqual(20);
    expect(provable.every((t) => t.id && t.name && t.statement && typeof proofs[t.id] === "function")).toBe(true);
  });
  test("every one is proved and its certificate replays", () => {
    for (const { id, proof } of proofs.all()) {
      expect([id, proof.proved]).toEqual([id, true]);
      expect([id, proof.replay()]).toEqual([id, true]);
    }
  });
  test("the Gröbner method agrees on a selection", () => {
    for (const id of ["thales", "pythagoras", "midline", "altitudes", "eulerLine", "varignon", "inscribedAngle", "simson", "orthocentreReflection", "napoleon"]) {
      const p = proofs[id]({ method: "groebner" });
      expect([id, p.proved, p.method]).toEqual([id, true, "groebner"]);
    }
  });
  test("degenerate cases are named", () => {
    expect(meanings(proofs.eulerLine())).toEqual(["A, B, C are not collinear"]);
    expect(meanings(proofs.pappus())).toContain("AE is not parallel to BD");
    expect(meanings(proofs.varignon())).toEqual([]);
  });
});
