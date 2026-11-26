// Exact real numbers for coordinates: a Core Rational when the number is
// rational, and otherwise an algebraic number from @ratmath/algebraic, which
// carries its minimal polynomial and so can be compared and tested for zero
// exactly. Everything a ruler and compass can reach is such a number.
import { Rational } from "@ratmath/core";
import * as A from "@ratmath/algebraic";

export class GeoError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GeoError";
    this.code = code;
  }
}
export const refuse = (code, message) => {
  throw new GeoError(code, message);
};

export const ZERO = new Rational(0n);
export const ONE = new Rational(1n);
export const TWO = new Rational(2n);
export const Q = (n, d = 1) => new Rational(BigInt(n), BigInt(d));

const isAlg = (x) => x !== null && typeof x === "object" && !(x instanceof Rational) && "poly" in x;
/** an algebraic number that is really rational, as a Rational */
const lower = (a) => {
  const r = a.rational;
  return r ? new Rational(r[0], r[1]) : a;
};
const lift = (x) => (x instanceof Rational ? A.fromRational([x.numerator, x.denominator]) : x);

/** An exact number from a whole number, a bigint, a Rational, a string ("7/2", "0.35", "sqrt(2)") or an algebraic number. */
export function num(x) {
  if (x instanceof Rational) return x;
  if (isAlg(x)) return lower(x);
  if (typeof x === "bigint") return new Rational(x);
  if (typeof x === "number") {
    if (Number.isInteger(x)) return new Rational(BigInt(x));
    refuse("inexact", `${x} is a floating-point number; write it as a string ("${x}") so its exact value is the one you typed`);
  }
  if (typeof x === "string") {
    const s = x.trim();
    const root = /^(-?)\s*(?:(\S+?)\s*\*\s*)?sqrt\((.+)\)(?:\s*\/\s*(\S+))?$/.exec(s);
    if (root) {
      let v = N.sqrt(num(root[3]));
      if (root[2]) v = N.mul(num(root[2]), v);
      if (root[4]) v = N.div(v, num(root[4]));
      return root[1] ? N.neg(v) : v;
    }
    const dec = /^(-?)(\d*)\.(\d+)$/.exec(s);
    if (dec) {
      const q = new Rational(BigInt((dec[2] || "0") + dec[3]), 10n ** BigInt(dec[3].length));
      return dec[1] ? q.negate() : q;
    }
    try {
      return new Rational(s);
    } catch {
      refuse("bad-number", `cannot read "${x}" as an exact number`);
    }
  }
  refuse("bad-number", `cannot read ${String(x)} as an exact number`);
}

const both = (a, b) => a instanceof Rational && b instanceof Rational;
const perfectSquare = (n) => {
  if (n < 0n) return null;
  if (n < 2n) return n;
  let x = BigInt(Math.floor(Math.sqrt(Number(n))));
  while (x * x > n) x -= 1n;
  while ((x + 1n) * (x + 1n) <= n) x += 1n;
  return x * x === n ? x : null;
};

export const N = {
  add: (a, b) => (both(a, b) ? a.add(b) : lower(A.add(lift(a), lift(b)))),
  sub: (a, b) => (both(a, b) ? a.subtract(b) : lower(A.sub(lift(a), lift(b)))),
  mul: (a, b) => (both(a, b) ? a.multiply(b) : lower(A.mul(lift(a), lift(b)))),
  div(a, b) {
    if (N.isZero(b)) refuse("division", "division by zero");
    return both(a, b) ? a.divide(b) : lower(A.div(lift(a), lift(b)));
  },
  neg: (a) => (a instanceof Rational ? a.negate() : lower(A.neg(a))),
  sq: (a) => N.mul(a, a),
  sqrt(a) {
    if (N.sign(a) < 0) refuse("sqrt", "square root of a negative number");
    if (a instanceof Rational) {
      const n = perfectSquare(a.numerator);
      const d = perfectSquare(a.denominator);
      if (n !== null && d !== null) return new Rational(n, d);
    }
    return lower(A.sqrt(lift(a)));
  },
  sign: (a) => (a instanceof Rational ? (a.numerator > 0n ? 1 : a.numerator < 0n ? -1 : 0) : A.sign(a)),
  isZero: (a) => (a instanceof Rational ? a.numerator === 0n : A.isZero(a)),
  cmp: (a, b) => (both(a, b) ? a.compareTo(b) : N.sign(N.sub(a, b))),
  eq: (a, b) => (both(a, b) ? a.equals(b) : N.isZero(N.sub(a, b))),
  abs: (a) => (N.sign(a) < 0 ? N.neg(a) : a),
  min: (a, b) => (N.cmp(a, b) <= 0 ? a : b),
  max: (a, b) => (N.cmp(a, b) >= 0 ? a : b),
  isRational: (a) => a instanceof Rational,
  toNumber: (a) => a.toNumber(),
  /** a readable exact form: a fraction, a closed form for quadratic irrationals, otherwise certified digits */
  text: (a, digits = 10) => (a instanceof Rational ? a.toString() : A.format(a, { digits }).replace(/−/g, "-")),
  /** [lo, hi] rationals around the number */
  enclose: (a, bits = 64) => (a instanceof Rational ? [a, a] : a.interval(bits)),
  sum: (...xs) => xs.reduce(N.add),
  /** cos and sin of a fraction of a half turn: cos(πq), sin(πq), exact */
  cosPi: (q) => lower(A.cosPi(q instanceof Rational ? [q.numerator, q.denominator] : q)),
  sinPi: (q) => lower(A.sinPi(q instanceof Rational ? [q.numerator, q.denominator] : q)),
};
