import { expect, test } from "bun:test";
import * as lib from "../index.js";
import { readFileSync } from "node:fs";

test("the package loads and says what is still planned", () => {
  expect(Array.isArray(lib.plan)).toBe(true);
  expect(lib.plan.map((p) => p.phase)).toEqual([]);
  for (const p of lib.plan) {
    expect(typeof p.contents).toBe("string");
    expect(typeof p.estimate).toBe("string");
  }
  expect(Object.isFrozen(lib.plan)).toBe(true);
});

test("everything index.d.ts declares is exported", () => {
  const dts = readFileSync(new URL("../index.d.ts", import.meta.url), "utf8");
  const declared = [...dts.matchAll(/^export (?:declare )?(?:function|class|const) (\w+)/gm)].map((m) => m[1]);
  expect(declared.length).toBeGreaterThan(50);
  expect(declared.filter((name) => !(name in lib))).toEqual([]);
});

test("dot and cross take points or pairs", () => {
  expect(String(lib.dot([3, -4], [2, 1]))).toBe("2");
  expect(String(lib.dot(lib.point(3, -4), lib.point(2, 1)))).toBe("2");
  expect(String(lib.cross([1, 0], [0, 1]))).toBe("1");
  expect(String(lib.cross(["1/2", 2], [3, "sqrt(2)"]))).toBe(String(lib.N.sub(lib.N.mul(lib.num("1/2"), lib.num("sqrt(2)")), lib.num(6))));
});
