import { describe, expect, test } from "bun:test";
import { Rational } from "@ratmath/core";
import { vector, tripleProduct, line3, Line3, plane, Plane, N, box } from "../index.js";

const s = (v) => String(v);

describe("vectors in space", () => {
  test("dot and cross of (1, 2, −2) and (3, 0, 4)", () => {
    const u = vector(1, 2, -2), v = vector([3, 0, 4]);
    expect(s(u.dot(v))).toBe("-5");
    expect(s(u.cross(v))).toBe("(8, -10, -6)");
    expect(s(u.norm)).toBe("3");
    expect(s(v.norm)).toBe("5");
  });
  test("cross product laws (independent checks)", () => {
    const vs = [[1, 2, -2], [3, 0, 4], ["1/2", -1, 5], [0, 7, "2/3"]].map((a) => vector(a));
    for (const a of vs) for (const b of vs) {
      const c = a.cross(b);
      expect(c.isOrthogonal(a) && c.isOrthogonal(b)).toBe(true);
      expect(c.equals(b.cross(a).neg())).toBe(true);
      // Lagrange's identity |a × b|² = |a|²|b|² − (a·b)²
      expect(N.eq(c.norm2, N.sub(N.mul(a.norm2, b.norm2), N.sq(a.dot(b))))).toBe(true);
    }
    // the triple product is the volume of the box spanned by the edges
    expect(s(tripleProduct([4, 0, 0], [0, 5, 0], [0, 0, 6]))).toBe(s(box(4, 5, 6).volume));
  });
  test("angles and projections", () => {
    const u = vector(1, 0, 0), v = vector(1, 1, 0);
    expect(u.angle(v).degrees).toBeCloseTo(45, 12);
    expect(s(vector(2, 3, 4).projectOnto([0, 0, 1]))).toBe("(0, 0, 4)");
    expect(s(vector(1, 2, 2).componentAlong([0, 3, 4]))).toBe("14/5");
    expect(vector(1, 2, 3).isParallel([2, 4, 6])).toBe(true);
    expect(s(vector(0, 3, 4).unit())).toBe("(0, 3/5, 4/5)");
    expect(() => vector(0, 0, 0).unit()).toThrow();
  });
});

describe("planes", () => {
  test("through (1, 0, 2), (2, 1, 0), (0, 3, 1): 5x + 3y + 4z = 13", () => {
    const P = plane([1, 0, 2], [2, 1, 0], [0, 3, 1]);
    expect(P.equation).toBe("5x + 3y + 4z = 13");
    for (const p of [[1, 0, 2], [2, 1, 0], [0, 3, 1]]) expect(P.contains(p)).toBe(true);
    expect(() => plane([0, 0, 0], [1, 1, 1], [2, 2, 2])).toThrow();
  });
  test("distance agrees with the distance to the foot (independent check)", () => {
    const P = plane([1, 0, 2], [2, 1, 0], [0, 3, 1]);
    for (const p of [[0, 0, 0], [5, -1, 2], ["1/2", 4, 7]]) {
      const f = P.foot(p);
      expect(P.contains(f)).toBe(true);
      expect(N.eq(P.distance(p), vector(p).sub(f).norm)).toBe(true);
    }
    expect(s(plane([0, 0, 0], { normal: [0, 0, 2] }).distance([1, 2, 3]))).toBe("3");
  });
  test("intersections", () => {
    const P = plane({ coefficients: [1, 1, 1, 3] }), Q = plane({ coefficients: [1, -1, 0, 1] });
    const L = P.meet(Q);
    expect(L).toBeInstanceOf(Line3);
    for (const t of [0, 1, -2]) expect(P.contains(L.at(t)) && Q.contains(L.at(t))).toBe(true);
    expect(s(P.meet(line3([0, 0, 0], [1, 1, 1])))).toBe("(1, 1, 1)");
    expect(P.meet(plane({ coefficients: [2, 2, 2, 1] }))).toBe(null);
    expect(P.meet(plane({ coefficients: [2, 2, 2, 6] }))).toBe(P);
    expect(P.meet(new Line3([3, 0, 0], [1, -1, 0]))).toBeInstanceOf(Line3);
    expect(P.angle(plane({ coefficients: [0, 0, 1, 0] })).cos.toString()).toBe(N.div(new Rational(1n), N.sqrt(new Rational(3n))).toString());
  });
  test("lines in space", () => {
    const L = line3([0, 0, 0], [1, 0, 0]);
    expect(s(L.distance([3, 3, 4]))).toBe("5");
    expect(L.contains([7, 0, 0])).toBe(true);
  });
});
