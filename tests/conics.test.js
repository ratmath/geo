import { describe, expect, test } from "bun:test";
import { Rational } from "@ratmath/core";
import { conicProperties, Conic, distance, foot, N, point } from "../index.js";

const q = (n, d = 1) => new Rational(BigInt(n), BigInt(d));
const s = (v) => String(v);
const pts = (list) => list.map(String);

/** the coefficients of the conic X²/a2 ± Y²/b2 = 1 rotated by the 3-4-5 rotation and moved to (h, k) */
function rotated(a2, b2, sign, h, k) {
  // X = (3(x − h) + 4(y − k))/5, Y = (−4(x − h) + 3(y − k))/5
  // X²/a2 + sign·Y²/b2 − 1, expanded
  const c = (x) => q(x);
  const A = N.add(N.div(q(9, 25), a2), N.mul(c(sign), N.div(q(16, 25), b2)));
  const B = N.sub(N.div(q(24, 25), a2), N.mul(c(sign), N.div(q(24, 25), b2)));
  const C = N.add(N.div(q(16, 25), a2), N.mul(c(sign), N.div(q(9, 25), b2)));
  const D = N.neg(N.add(N.mul(TWOq, N.mul(A, h)), N.mul(B, k)));
  const E = N.neg(N.add(N.mul(TWOq, N.mul(C, k)), N.mul(B, h)));
  const F = N.sub(N.sum(N.mul(A, N.sq(h)), N.mul(B, N.mul(h, k)), N.mul(C, N.sq(k))), q(1));
  return [A, B, C, D, E, F];
}
const TWOq = q(2);

describe("classification", () => {
  test("every type, including the degenerate ones", () => {
    const cases = {
      "9x^2 + 4y^2 - 36 = 0": "ellipse", "x^2 + y^2 = 4": "circle", "x^2 - y^2 = 1": "hyperbola", "y^2 = 8x": "parabola",
      "x^2 + y^2 = 0": "point", "x^2 - y^2 = 0": "two crossing lines", "x^2 = 1": "two parallel lines", "(x + y)^2 = 0": "double line",
      "x^2 + 1 = 0": "empty", "x^2 + y^2 + 1 = 0": "empty",
    };
    for (const [e, type] of Object.entries(cases)) {
      const p = conicProperties(e);
      expect(p.type).toBe(type);
      if (["point", "two crossing lines", "two parallel lines", "double line", "empty"].includes(type)) expect(p.degenerate).toBe(true);
    }
    expect(() => conicProperties("x + y = 1")).toThrow();
  });
  test("agrees with the projective Conic.classify", () => {
    for (const e of [[9, 0, 4, 0, 0, -36], [1, 0, -1, 0, 0, -1], [0, 0, 1, -8, 0, 0], [1, 1, 1, 0, 0, -3], [1, -2, 1, -4, -4, 0]]) {
      const c = Conic.fromCoefficients(e);
      const mine = conicProperties(e).type;
      expect(c.classify().startsWith(mine) || (mine === "circle" && c.classify() === "circle")).toBe(true);
      expect(c.properties().type).toBe(mine);
    }
  });
});

describe("ellipses and hyperbolas", () => {
  test("9x² + 4y² = 36", () => {
    const p = conicProperties("9x^2 + 4y^2 - 36 = 0");
    expect([s(p.center), s(p.a), s(p.b)]).toEqual(["(0, 0)", "3", "2"]);
    expect(pts(p.vertices)).toEqual(["(0, 3)", "(0, -3)"]);
    expect(pts(p.foci)).toEqual(["(0, √5)", "(0, -√5)"]);
    expect(N.eq(N.sq(p.eccentricity), q(5, 9))).toBe(true);
  });
  test("x²/16 − y²/9 = 1", () => {
    const p = conicProperties("x^2/16 - y^2/9 = 1");
    expect([s(p.a), s(p.b), s(p.c), s(p.eccentricity)]).toEqual(["4", "3", "5", "5/4"]);
    expect(pts(p.foci)).toEqual(["(5, 0)", "(-5, 0)"]);
    expect(pts(p.asymptotes)).toEqual(["3·x - 4·y = 0", "3·x + 4·y = 0"]);
    expect(pts(p.directrices)).toEqual(["5·x - 16 = 0", "5·x + 16 = 0"]);
  });
  test("focal sum and difference at exact points on rotated conics (independent check)", () => {
    // ellipse X²/25 + Y²/9 = 1 turned by the 3-4-5 rotation and centred at (1, −2)
    const h = q(1), k = q(-2);
    const e = conicProperties(rotated(q(25), q(9), 1, h, k));
    expect(e.type).toBe("ellipse");
    expect([s(e.center), s(e.a), s(e.b), s(e.c)]).toEqual(["(1, -2)", "5", "3", "4"]);
    // points X = 5cos t, Y = 3sin t with (cos t, sin t) = (3/5, 4/5), (−4/5, 3/5), (0, 1), (1, 0)
    for (const [cs, sn] of [[q(3, 5), q(4, 5)], [q(-4, 5), q(3, 5)], [q(0), q(1)], [q(1), q(0)]]) {
      const X = N.mul(q(5), cs), Y = N.mul(q(3), sn);
      const P = point(N.add(h, N.div(N.sub(N.mul(q(3), X), N.mul(q(4), Y)), q(5))), N.add(k, N.div(N.add(N.mul(q(4), X), N.mul(q(3), Y)), q(5))));
      expect(N.eq(N.add(distance(P, e.foci[0]), distance(P, e.foci[1])), q(10))).toBe(true);
    }
    // hyperbola X²/16 − Y²/9 = 1 turned the same way
    const hy = conicProperties(rotated(q(16), q(9), -1, h, k));
    expect([hy.type, s(hy.a), s(hy.b), s(hy.c), s(hy.eccentricity)]).toEqual(["hyperbola", "4", "3", "5", "5/4"]);
    for (const m of [q(2), q(1, 3), q(-3)]) {
      const X = N.mul(q(2), N.add(m, N.div(q(1), m))), Y = N.mul(q(3, 2), N.sub(m, N.div(q(1), m)));
      const P = point(N.add(h, N.div(N.sub(N.mul(q(3), X), N.mul(q(4), Y)), q(5))), N.add(k, N.div(N.add(N.mul(q(4), X), N.mul(q(3), Y)), q(5))));
      expect(N.eq(N.abs(N.sub(distance(P, hy.foci[0]), distance(P, hy.foci[1]))), q(8))).toBe(true);
    }
  });
  test("an irrational rotation: x² + xy + y² = 3", () => {
    const p = conicProperties("x^2 + xy + y^2 = 3");
    expect([s(N.sq(p.a)), s(N.sq(p.b)), s(p.c)]).toEqual(["6", "2", "2"]);
    expect(s(p.axes.major)).toBe("x + y = 0");
    for (const P of p.vertices) expect(N.isZero(N.sum(N.sq(P.x), N.mul(P.x, P.y), N.sq(P.y), q(-3)))).toBe(true);
  });
});

describe("parabolas", () => {
  test("y² = 8x and a shifted one", () => {
    const p = conicProperties("y^2 = 8x");
    expect([s(p.vertex), s(p.focus), s(p.directrix), s(p.focalLength)]).toEqual(["(0, 0)", "(2, 0)", "x + 2 = 0", "2"]);
    const r = conicProperties("x^2 - 4y - 2x + 9 = 0");
    expect([s(r.vertex), s(r.focus), s(r.directrix)]).toEqual(["(1, 2)", "(1, 3)", "y - 1 = 0"]);
  });
  test("focus–directrix property on a rotated parabola (independent check)", () => {
    const p = conicProperties("x^2 - 2xy + y^2 - 4x - 4y = 0");
    expect([s(p.vertex), s(p.focus)]).toEqual(["(0, 0)", "(1/2, 1/2)"]);
    // points on the curve: x = (t² + 2t)/4·… found by x − y = t, x + y = t²/4
    for (const t of [q(1), q(-2), q(6), q(1, 2)]) {
      const sum = N.div(N.sq(t), q(4));
      const P = point(N.div(N.add(sum, t), q(2)), N.div(N.sub(sum, t), q(2)));
      expect(N.isZero(N.sum(N.sq(P.x), N.mul(q(-2), N.mul(P.x, P.y)), N.sq(P.y), N.mul(q(-4), P.x), N.mul(q(-4), P.y)))).toBe(true);
      expect(N.eq(distance(P, p.focus), distance(P, foot(P, p.directrix)))).toBe(true);
    }
  });
});
