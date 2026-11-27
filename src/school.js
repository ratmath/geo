// School geometry: polygon angles, the forms of a line, tangent lengths,
// measures of the round solids and of boxes, similar solids, and a circle
// read from its general equation. Everything is exact.
import { Rational } from "@ratmath/core";
import { ring } from "@ratmath/structures";
import { num, N, refuse, ZERO, ONE, TWO, Q } from "./num.js";
import { point, line, Line, Circle } from "./plane.js";
import { polyhedron } from "./solids.js";
import { piTimes } from "./angle.js";

const sides = (n) => {
  if (!Number.isInteger(n) || n < 3) refuse("bad-polygon", "a polygon has at least three sides");
  return n;
};
/** The sum of the interior angles of an n-gon, in degrees: (n − 2)·180. */
export const angleSum = (n) => Q((sides(n) - 2) * 180);
/** Each interior angle of a regular n-gon, in degrees: (n − 2)·180/n. */
export const interiorAngle = (n) => Q((sides(n) - 2) * 180, n);
/** Each exterior angle of a regular n-gon, in degrees: 360/n. */
export const exteriorAngle = (n) => Q(360, sides(n));

/**
 * The slope–intercept form of a line (or of the line through two points):
 * { slope, intercept, text: "y = -2x + 1" }; slope and intercept are null
 * for a vertical line.
 */
export function slopeIntercept(l, q) {
  const L = l instanceof Line ? l : line(l, q);
  return { slope: L.slope, intercept: L.intercept, text: L.toSlopeIntercept(), line: L };
}
/** The line through p with slope m (exact): its text forms are toPointSlope() and toSlopeIntercept(). */
export function pointSlope(p, m) {
  const P = point(p);
  const k = num(m);
  // y − y₀ = m(x − x₀)  ⇔  m·x − y + (y₀ − m·x₀) = 0
  return new Line(k, N.neg(ONE), N.sub(P.y, N.mul(k, P.x)));
}

/** The length of a tangent segment from p to the circle: √(power of p), exactly. */
export function tangentLength(c, p) {
  const pw = c.power(point(p));
  if (N.sign(pw) < 0) refuse("inside", "the point is inside the circle: no tangent reaches it");
  return N.sqrt(pw);
}

/** The box a × b × c as an exact polyhedron (volume, surfaceArea, …). */
export function box(a, b, c) {
  const [x, y, z] = [a, b, c].map(num);
  if ([x, y, z].some((v) => N.sign(v) <= 0)) refuse("degenerate", "a box needs positive edges");
  const pts = [];
  for (const i of [ZERO, x]) for (const j of [ZERO, y]) for (const k of [ZERO, z]) pts.push([i, j, k]);
  return polyhedron(pts, { name: `${N.text(x)} × ${N.text(y)} × ${N.text(z)} box` });
}

const positive = (v, what) => {
  const q = num(v);
  if (N.sign(q) <= 0) refuse("bad-argument", `${what} must be positive`);
  return q;
};
/** A right circular cylinder: volume πr²h, lateral area 2πrh, surface area 2πr(r + h), as multiples of π. */
export function cylinder(r, h) {
  const R = positive(r, "the radius"), H = positive(h, "the height");
  return { kind: "cylinder", radius: R, height: H, volume: piTimes(N.mul(N.sq(R), H)), lateralArea: piTimes(N.mul(TWO, N.mul(R, H))), surfaceArea: piTimes(N.mul(N.mul(TWO, R), N.add(R, H))) };
}
/** A right circular cone: volume πr²h/3, slant height √(r² + h²), lateral area πrs, surface area πr(r + s). */
export function cone(r, h) {
  const R = positive(r, "the radius"), H = positive(h, "the height");
  const s = N.sqrt(N.add(N.sq(R), N.sq(H)));
  return { kind: "cone", radius: R, height: H, slant: s, volume: piTimes(N.div(N.mul(N.sq(R), H), Q(3))), lateralArea: piTimes(N.mul(R, s)), surfaceArea: piTimes(N.mul(R, N.add(R, s))) };
}
/** A sphere: volume 4πr³/3, surface area 4πr². */
export function sphere(r) {
  const R = positive(r, "the radius");
  return { kind: "sphere", radius: R, volume: piTimes(N.div(N.mul(Q(4), N.mul(N.sq(R), R)), Q(3))), surfaceArea: piTimes(N.mul(Q(4), N.sq(R))) };
}
/**
 * Similar figures with scale factor k (lengths multiply by k): areas multiply
 * by k², volumes by k³. Give k, or two corresponding lengths, areas or
 * volumes as { lengths: [a, b] } / { areas } / { volumes }.
 */
export function similar(spec) {
  let k;
  if (spec && typeof spec === "object" && !(spec instanceof Rational)) {
    if (spec.lengths) k = N.div(num(spec.lengths[1]), num(spec.lengths[0]));
    else if (spec.areas) k = N.sqrt(N.div(num(spec.areas[1]), num(spec.areas[0])));
    else if (spec.volumes) k = cubeRoot(N.div(num(spec.volumes[1]), num(spec.volumes[0])));
    else refuse("bad-argument", "give k, or { lengths }, { areas } or { volumes } as [first, second]");
  } else k = num(spec);
  if (N.sign(k) <= 0) refuse("bad-argument", "the scale factor must be positive");
  return { scale: k, length: k, area: N.sq(k), volume: N.mul(N.sq(k), k) };
}
function cubeRoot(q) {
  if (!(q instanceof Rational)) refuse("unsupported", "the volume ratio must be rational");
  const root = (n) => {
    const neg = n < 0n;
    let a = neg ? -n : n;
    let x = BigInt(Math.round(Math.cbrt(Number(a))));
    for (const d of [x - 1n, x, x + 1n]) if (d >= 0n && d * d * d === a) return neg ? -d : d;
    return null;
  };
  const n = root(q.numerator), d = root(q.denominator);
  if (n === null || d === null) refuse("unsupported", `the volume ratio ${q} is not a rational cube, so the scale factor is not rational`);
  return new Rational(n, d);
}

/**
 * The six coefficients [A, B, C, D, E, F] of A·x² + B·xy + C·y² + D·x + E·y + F
 * from text ("x^2 + y^2 - 6x + 4y - 12 = 0", either side of "=") or an array.
 */
export function conicCoefficients(input) {
  if (Array.isArray(input)) {
    if (input.length !== 6) refuse("bad-argument", "give six coefficients [A, B, C, D, E, F]");
    return input.map(num);
  }
  if (typeof input !== "string") refuse("bad-argument", "give the equation as text or as [A, B, C, D, E, F]");
  const R = ring(["x", "y"]);
  const sidesOf = input.split("=");
  if (sidesOf.length > 2) refuse("bad-argument", "an equation has at most one =");
  let p;
  try {
    p = R.poly(sidesOf[0]);
    if (sidesOf.length === 2) p = p.sub(R.poly(sidesOf[1]));
  } catch (e) {
    refuse("bad-argument", `cannot read "${input}" as a polynomial in x and y: ${e.message}`);
  }
  if (p.degree() > 2) refuse("bad-argument", "a conic has degree at most 2");
  const c = (i, j) => num(p.coefficient([i, j]));
  return [c(2, 0), c(1, 1), c(0, 2), c(1, 0), c(0, 1), c(0, 0)];
}

/**
 * The circle x² + y² + Dx + Ey + F = 0 (any common factor allowed), by
 * completing the square: centre (−D/2, −E/2), r² = (D² + E²)/4 − F.
 * Refuses an equation that is not a circle, a single point, or empty.
 */
export function circleFromEquation(input) {
  const [A, B, C, D, E, F] = conicCoefficients(input);
  if (!N.isZero(B) || !N.eq(A, C) || N.isZero(A)) refuse("not-a-circle", "a circle needs equal x² and y² coefficients and no xy term");
  const [d, e, f] = [D, E, F].map((v) => N.div(v, A));
  const center = point(N.neg(N.div(d, TWO)), N.neg(N.div(e, TWO)));
  const r2 = N.sub(N.div(N.add(N.sq(d), N.sq(e)), Q(4)), f);
  if (N.isZero(r2)) refuse("degenerate", `the equation is the single point ${center}`);
  if (N.sign(r2) < 0) refuse("empty", "no real point satisfies the equation (r² < 0)");
  return new Circle(center, r2);
}
