// Angles and hyperbolic lengths with exact trigonometry.
//
// An Angle is a point (cos, sin) of the unit circle, kept exactly, together
// with a float that says which turn it is on (so that sums such as a
// triangle's angle sum are real numbers, not numbers mod 2π). Whether the
// angle is a rational multiple of π is decided, not guessed: cos(2πk/n) has
// degree φ(n)/2 over Q, so the degree of the cosine leaves finitely many n
// to try, and each candidate is checked exactly. When the angle is such a
// multiple it is given as a fraction of a full turn; otherwise as an
// enclosure in radians.
//
// A Length is a hyperbolic distance kept as its exact cosh and sinh, so
// that eᵈ is exact and d = ln(eᵈ) is enclosed.
import { Rational, RationalInterval } from "@ratmath/core";
import { enclose, constants } from "@ratmath/analytic";
import { num, N, refuse, ZERO, ONE, TWO, Q } from "./num.js";

const degreeOf = (c) => (c instanceof Rational ? 1 : c.poly.length - 1);
const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
const phi = (n) => {
  let r = n;
  let m = n;
  for (let p = 2; p * p <= m; p++)
    if (m % p === 0) {
      while (m % p === 0) m /= p;
      r -= r / p;
    }
  if (m > 1) r -= r / m;
  return r;
};

/**
 * The fraction q of a full turn, 0 ≤ q ≤ 1/2, with cos(2πq) = c, or null
 * when the angle with this cosine is not a rational multiple of π. Decided:
 * a null is a proof that there is no such fraction.
 */
export function turnsOfCos(c) {
  c = num(c);
  if (N.cmp(N.abs(c), ONE) > 0) refuse("bad-angle", "a cosine lies between −1 and 1");
  const d = degreeOf(c);
  const theta = Math.acos(Math.max(-1, Math.min(1, N.toNumber(c))));
  const candidates = d === 1 ? [1, 2, 3, 4, 6] : [];
  if (d > 1) for (let n = 5; n <= 8 * d * d + 8; n++) if (phi(n) === 2 * d) candidates.push(n);
  for (const n of candidates) {
    const k = Math.round((theta * n) / (2 * Math.PI));
    if (k < 0 || 2 * k > n || gcd(k, n) !== 1) continue;
    if (Math.abs((2 * Math.PI * k) / n - theta) > 1e-7) continue;
    // cosPi takes a fraction of a half turn
    if (N.eq(N.cosPi(Q(2 * k, n)), c)) return Q(k, n);
  }
  return null;
}

const piText = (q) => {
  // q of a full turn is 2q·π
  const r = q.multiply(TWO);
  const n = r.numerator;
  const d = r.denominator;
  if (n === 0n) return "0";
  const top = n === 1n ? "π" : n === -1n ? "−π" : `${String(n).replace("-", "−")}π`;
  return d === 1n ? top : `${top}/${d}`;
};

export class Angle {
  /** cos and sin exactly, and a float saying which turn the angle is on */
  constructor(cos, sin, approx) {
    this.cos = num(cos);
    this.sin = num(sin);
    this.approx = approx ?? Math.atan2(N.toNumber(this.sin), N.toNumber(this.cos));
    this._turns = undefined;
  }
  /** the angle between 0 and π with this cosine */
  static ofCos(c) {
    c = num(c);
    if (N.cmp(N.abs(c), ONE) > 0) refuse("bad-angle", "a cosine lies between −1 and 1");
    return new Angle(c, N.sqrt(N.sub(ONE, N.sq(c))));
  }
  /** from a fraction of a full turn: Angle.ofTurns("1/6") is 60° */
  static ofTurns(q) {
    const t = num(q);
    if (!(t instanceof Rational)) refuse("bad-angle", "give the angle as a fraction of a full turn");
    const a = new Angle(N.cosPi(t.multiply(TWO)), N.sinPi(t.multiply(TWO)), 2 * Math.PI * t.toNumber());
    a._turns = t;
    return a;
  }
  /** this angle as a fraction of a full turn, or null when it is not a rational multiple of π (decided exactly) */
  get turns() {
    if (this._turns !== undefined) return this._turns;
    const base = turnsOfCos(this.cos); // in [0, 1/2]
    if (base === null) return (this._turns = null);
    const s = N.sign(this.sin) < 0 ? -1 : 1;
    const signed = s < 0 ? base.negate() : base;
    const whole = Math.round((this.approx - 2 * Math.PI * signed.toNumber()) / (2 * Math.PI));
    return (this._turns = signed.add(Q(whole)));
  }
  get isRational() {
    return this.turns !== null;
  }
  /** an interval of radians containing the angle, at least `digits` decimals narrow */
  value(digits = 20) {
    const bits = Math.ceil(digits * 3.33) + 16;
    const pi = constants.pi(bits);
    const t = this.turns;
    if (t !== null) return pi.multiply(new RationalInterval(t.multiply(TWO), t.multiply(TWO)));
    const [lo, hi] = N.enclose(this.cos, bits);
    const base = enclose.acos(new RationalInterval(lo, hi), bits); // in (0, π)
    const s = N.sign(this.sin) < 0 ? -1 : 1;
    const whole = Math.round((this.approx - s * Math.acos(N.toNumber(this.cos))) / (2 * Math.PI));
    const signed = s < 0 ? base.negate() : base;
    const k = new Rational(BigInt(2 * whole));
    return signed.add(pi.multiply(new RationalInterval(k, k)));
  }
  toNumber() {
    return this.approx;
  }
  get degrees() {
    const t = this.turns;
    return t !== null ? t.multiply(Q(360)).toNumber() : (this.approx * 180) / Math.PI;
  }
  add(o) {
    return new Angle(N.sub(N.mul(this.cos, o.cos), N.mul(this.sin, o.sin)), N.add(N.mul(this.sin, o.cos), N.mul(this.cos, o.sin)), this.approx + o.approx);
  }
  neg() {
    return new Angle(this.cos, N.neg(this.sin), -this.approx);
  }
  sub(o) {
    return this.add(o.neg());
  }
  equals(o) {
    return N.eq(this.cos, o.cos) && N.eq(this.sin, o.sin) && Math.abs(this.approx - o.approx) < 1;
  }
  /** −1, 0 or 1: compares the real numbers, exactly */
  compare(o) {
    if (this.equals(o)) return 0;
    return this.approx < o.approx ? -1 : 1;
  }
  get isRight() {
    return N.isZero(this.cos) && Math.abs(this.approx - Math.PI / 2) < 1;
  }
  get isZero() {
    return N.eq(this.cos, ONE) && Math.abs(this.approx) < 1;
  }
  /** "π/3" when the angle is a rational multiple of π, otherwise radians to 10 places */
  get text() {
    const t = this.turns;
    return t !== null ? piText(t) : `${this.value(12).low.toDecimal(10)}…`;
  }
  toString() {
    return this.text;
  }
}
Angle.PI = Angle.ofTurns(Q(1, 2));
Angle.ZERO = Angle.ofTurns(ZERO);
Angle.RIGHT = Angle.ofTurns(Q(1, 4));
/** An angle from a fraction of a full turn, or from { cos } (between 0 and π) or { cos, sin }. */
export function angle(x) {
  if (x instanceof Angle) return x;
  if (x !== null && typeof x === "object" && !(x instanceof Rational) && "cos" in x) return "sin" in x ? new Angle(x.cos, x.sin) : Angle.ofCos(x.cos);
  return Angle.ofTurns(x);
}

/** π times an exact number: { coefficient, text, value(digits) }. Circumferences and areas come out in this form. */
export function piTimes(k) {
  const c = num(k);
  const t = N.text(c);
  return {
    coefficient: c,
    text: N.eq(c, ONE) ? "π" : N.isZero(c) ? "0" : `${/[ +\-/]/.test(t) && !/^\d+\/\d+$/.test(t) ? `(${t})` : t}·π`,
    value(digits = 20) {
      const bits = Math.ceil(digits * 3.33) + 16;
      const [lo, hi] = N.enclose(c, bits);
      return constants.pi(bits).multiply(new RationalInterval(lo, hi));
    },
    toNumber: () => Math.PI * N.toNumber(c),
  };
}

/** A hyperbolic length d, held as cosh d and sinh d (d ≥ 0), both exact. */
export class Length {
  constructor(cosh, sinh) {
    this.cosh = num(cosh);
    if (N.cmp(this.cosh, ONE) < 0) refuse("bad-length", "cosh of a length is at least 1");
    this.sinh = sinh === undefined ? N.sqrt(N.sub(N.sq(this.cosh), ONE)) : num(sinh);
  }
  static ofCosh(c) {
    return new Length(c);
  }
  static ofSinh(s) {
    s = N.abs(num(s));
    return new Length(N.sqrt(N.add(ONE, N.sq(s))), s);
  }
  /** from eᵈ, an exact number at least 1: Length.ofExp(2) is ln 2 */
  static ofExp(e) {
    e = num(e);
    const inv = N.div(ONE, e);
    return new Length(N.div(N.add(e, inv), TWO), N.div(N.sub(e, inv), TWO));
  }
  /** eᵈ, exact */
  get exp() {
    return N.add(this.cosh, this.sinh);
  }
  get tanh() {
    return N.div(this.sinh, this.cosh);
  }
  add(o) {
    return new Length(N.add(N.mul(this.cosh, o.cosh), N.mul(this.sinh, o.sinh)), N.add(N.mul(this.sinh, o.cosh), N.mul(this.cosh, o.sinh)));
  }
  double() {
    return this.add(this);
  }
  half() {
    // cosh(d/2) = √((cosh d + 1)/2)
    return new Length(N.sqrt(N.div(N.add(this.cosh, ONE), TWO)));
  }
  equals(o) {
    return N.eq(this.cosh, o.cosh);
  }
  compare(o) {
    return N.cmp(this.cosh, o.cosh);
  }
  get isZero() {
    return N.eq(this.cosh, ONE);
  }
  /** an interval containing d */
  value(digits = 20) {
    if (this.isZero) return new RationalInterval(ZERO, ZERO);
    const bits = Math.ceil(digits * 3.33) + 16;
    const [lo, hi] = N.enclose(this.exp, bits);
    return enclose.log(new RationalInterval(lo, hi), bits);
  }
  toNumber() {
    return Math.log(N.toNumber(this.exp));
  }
  /** "ln(2 + √3)": the exact form */
  get text() {
    return this.isZero ? "0" : `ln(${N.text(this.exp)})`;
  }
  toString() {
    return this.text;
  }
}
