import { expect, test } from "bun:test";
import * as lib from "../index.js";

test("the package loads and says what is still planned", () => {
  expect(Array.isArray(lib.plan)).toBe(true);
  expect(lib.plan.map((p) => p.phase)).toEqual([3, 4, 5, 6, 7]);
  for (const p of lib.plan) {
    expect(typeof p.contents).toBe("string");
    expect(typeof p.estimate).toBe("string");
  }
  expect(Object.isFrozen(lib.plan)).toBe(true);
});
