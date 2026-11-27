import { describe, expect, test } from "bun:test";
import { Rational } from "@ratmath/core";
import {
  angleSum, interiorAngle, exteriorAngle, slopeIntercept, pointSlope, tangentLength, box, cylinder, cone, sphere, similar,
  conicCoefficients, circleFromEquation, line, circle, tangents, meet, distance, regularPolygon, polygon, prism, N,
} from "../index.js";

const s = (v) => String(v);

describe("polygon angles", () => {
  test("octagon: 1080° in all, 135° each", () => {
    expect(s(angleSum(8))).toBe("1080");
    expect(s(interiorAngle(8))).toBe("135");
    expect(s(exteriorAngle(8))).toBe("45");
    expect(s(interiorAngle(7))).toBe("900/7");
    expect(() => angleSum(2)).toThrow();
  });
  test("interior + exterior = 180, and exterior angles sum to 360 (independent check)", () => {
    for (let n = 3; n <= 20; n++) {
      expect(interiorAngle(n).add(exteriorAngle(n)).equals(new Rational(180n))).toBe(true);
      expect(interiorAngle(n).multiply(new Rational(BigInt(n))).equals(angleSum(n))).toBe(true);
    }
  });
});

describe("forms of a line", () => {
  test("slope–intercept from two points", () => {
    const r = slopeIntercept([-2, 5], [4, -7]);
    expect([s(r.slope), s(r.intercept), r.text]).toEqual(["-2", "1", "y = -2x + 1"]);
    expect(line([-2, 5], [4, -7]).toPointSlope([-2, 5])).toBe("y - 5 = -2(x + 2)");
    expect(slopeIntercept([0, 0], [2, 1]).text).toBe("y = (1/2)x");
    expect(slopeIntercept([0, 3], [5, 3]).text).toBe("y = 3");
    const v = slopeIntercept([1, 0], [1, 5]);
    expect([v.slope, v.intercept, v.text]).toEqual([null, null, "x = 1"]);
  });
  test("pointSlope builds the line, which passes through the point with that slope", () => {
    for (const [p, m] of [[[1, 2], "3/4"], [[-3, 0], -5], [[0, "1/2"], 0]]) {
      const l = pointSlope(p, m);
      expect(l.contains(p)).toBe(true);
      expect(N.eq(l.slope, new Rational(String(m)))).toBe(true);
      // a second point on the line, one step to the right, rises by m
      const q = [N.add(new Rational(BigInt(p[0])), new Rational(1n)), N.add(new Rational(String(p[1])), new Rational(String(m)))];
      expect(l.contains(q)).toBe(true);
    }
    expect(pointSlope([1, 2], "sqrt(2)").toSlopeIntercept()).toBe("y = √2x + 2 - √2");
  });
});

describe("tangent length", () => {
  test("13 from the centre of a radius-5 circle: 12", () => {
    expect(s(tangentLength(circle([0, 0], [5, 0]), [13, 0]))).toBe("12");
  });
  test("equals the distance to the point of tangency (independent check)", () => {
    const c = circle([1, 2], { radius: 3 });
    const p = [7, 10];
    const t = tangents(c, p)[0];
    const [touch] = meet(c, t);
    expect(N.eq(tangentLength(c, p), distance(p, touch))).toBe(true);
    expect(() => tangentLength(c, [1, 2])).toThrow();
  });
});

describe("solids", () => {
  test("a 4 × 5 × 6 box", () => {
    const b = box(4, 5, 6);
    expect([s(b.volume), s(b.surfaceArea), b.V, b.E, b.F]).toEqual(["120", "148", 8, 12, 6]);
    expect(s(box("1/2", 2, 3).volume)).toBe("3");
  });
  test("a cube as a box equals the cube as a prism over a square (independent check)", () => {
    // prism(4) has a square of side √2 and height 2 (z = ±1): volume 4
    expect(s(prism(4).volume)).toBe("4");
    expect(N.eq(box("sqrt(2)", "sqrt(2)", 2).volume, prism(4).volume)).toBe(true);
  });
  test("round solids as multiples of π", () => {
    expect(cylinder(3, 5).volume.text).toBe("45·π");
    expect(cylinder(3, 5).surfaceArea.text).toBe("48·π");
    expect(cone(3, 4).slant.toString()).toBe("5");
    expect(cone(3, 4).volume.text).toBe("12·π");
    expect(cone(3, 4).surfaceArea.text).toBe("24·π");
    expect(sphere(3).volume.text).toBe("36·π");
    expect(sphere(3).surfaceArea.text).toBe("36·π");
    // Archimedes: the sphere is 2/3 of its circumscribed cylinder in volume and area
    const S = sphere(2), C = cylinder(2, 4);
    expect(N.eq(S.volume.coefficient, N.mul(C.volume.coefficient, new Rational(2n, 3n)))).toBe(true);
    expect(N.eq(S.surfaceArea.coefficient, N.mul(C.surfaceArea.coefficient, new Rational(2n, 3n)))).toBe(true);
  });
  test("similar solids", () => {
    const k = similar({ volumes: [8, 27] });
    expect([s(k.scale), s(k.area), s(k.volume)]).toEqual(["3/2", "9/4", "27/8"]);
    expect(s(similar({ areas: [4, 9] }).scale)).toBe("3/2");
    expect(s(similar(2).volume)).toBe("8");
    // checked on boxes
    expect(box(2, 4, 6).volume.divide(box(1, 2, 3).volume).equals(similar(2).volume)).toBe(true);
    expect(() => similar({ volumes: [1, 2] })).toThrow();
  });
});

describe("circle from its equation", () => {
  test("x² + y² − 6x + 4y − 12 = 0: centre (3, −2), radius 5", () => {
    const c = circleFromEquation("x^2 + y^2 - 6x + 4y - 12 = 0");
    expect([s(c.center), s(c.radius)]).toEqual(["(3, -2)", "5"]);
    expect(s(circleFromEquation("2x^2 + 2y^2 = 8x").center)).toBe("(2, 0)");
    expect(s(circleFromEquation([1, 0, 1, 0, 0, -2]).radius2)).toBe("2");
  });
  test("the circle found satisfies the equation at its points (independent check)", () => {
    const text = "3x^2 + 3y^2 + 6x - 12y - 30 = 0";
    const c = circleFromEquation(text);
    const [A, B, C, D, E, F] = conicCoefficients(text);
    for (const p of regularPolygon(6, { center: c.center, vertex: [N.add(c.center.x, c.radius), c.center.y] })) {
      const v = N.sum(N.mul(A, N.sq(p.x)), N.mul(B, N.mul(p.x, p.y)), N.mul(C, N.sq(p.y)), N.mul(D, p.x), N.mul(E, p.y), F);
      expect(N.isZero(v)).toBe(true);
    }
  });
  test("refusals", () => {
    expect(() => circleFromEquation("x^2 + 2y^2 = 1")).toThrow();
    expect(() => circleFromEquation("x^2 + y^2 + 1 = 0")).toThrow(/r²/);
    expect(() => circleFromEquation("x^2 + y^2 = 0")).toThrow(/single point/);
    expect(() => conicCoefficients("x^3 = y")).toThrow();
  });
});
