// The properties of a conic A·x² + B·xy + C·y² + D·x + E·y + F = 0, exactly.
//
// 1. Classify with the 3 × 3 determinant Δ and δ = AC − B²/4 (so B² − 4AC = −4δ).
//    Degenerate conics (Δ = 0) and empty ones return their type and stop.
// 2. Centre of an ellipse or hyperbola from the linear system; vertex and axis
//    of a parabola.
// 3. Axes from the eigenvectors of the quadratic part [[A, B/2], [B/2, C]]. With
//    B = 0 the numbers are rational or single square roots; with B ≠ 0 they are
//    algebraic numbers (nested square roots), still exact.
// 4. Vertices, foci, eccentricity, directrices, and a hyperbola's asymptotes.
import { num, N, refuse, ZERO, ONE, TWO, Q } from "./num.js";
import { Point, Line } from "./plane.js";
import { conicCoefficients } from "./school.js";

const HALF = Q(1, 2);
const pt = (x, y) => new Point(x, y);
/** p + t·u for a point p and a vector u = [ux, uy] */
const along = (p, u, t) => pt(N.add(p.x, N.mul(t, u[0])), N.add(p.y, N.mul(t, u[1])));
/** the line through p with direction u */
const lineDir = (p, u) => {
  let k = [u[1], N.neg(u[0]), N.sub(N.mul(u[0], p.y), N.mul(u[1], p.x))];
  // irrational coefficients print best with the first one made 1
  if (!k.every(N.isRational)) {
    const lead = N.isZero(k[0]) ? k[1] : k[0];
    k = k.map((v) => N.div(v, lead));
  }
  return new Line(...k);
};
const unit = (u) => {
  const n = N.sqrt(N.add(N.sq(u[0]), N.sq(u[1])));
  return [N.div(u[0], n), N.div(u[1], n)];
};

function classify(A, B, C, D, E, F) {
  const b = N.mul(B, HALF), d = N.mul(D, HALF), e = N.mul(E, HALF);
  // Δ = det [[A, b, d], [b, C, e], [d, e, F]]
  const Delta = N.sum(N.mul(A, N.sub(N.mul(C, F), N.sq(e))), N.neg(N.mul(b, N.sub(N.mul(b, F), N.mul(e, d)))), N.mul(d, N.sub(N.mul(b, e), N.mul(C, d))));
  const delta = N.sub(N.mul(A, C), N.sq(b));
  if (N.isZero(A) && N.isZero(B) && N.isZero(C)) refuse("not-a-conic", "there is no x², xy or y² term: this is a line, not a conic");
  if (N.isZero(Delta)) {
    if (N.sign(delta) > 0) return { type: "point", Delta, delta };
    if (N.sign(delta) < 0) return { type: "two crossing lines", Delta, delta };
    // parallel lines: K = (AF − d²) + (CF − e²) decides two real lines, one double line, or none
    const K = N.add(N.sub(N.mul(A, F), N.sq(d)), N.sub(N.mul(C, F), N.sq(e)));
    return { type: N.sign(K) < 0 ? "two parallel lines" : N.isZero(K) ? "double line" : "empty", Delta, delta };
  }
  if (N.isZero(delta)) return { type: "parabola", Delta, delta };
  if (N.sign(delta) < 0) return { type: "hyperbola", Delta, delta };
  // an ellipse is real when (A + C)·Δ < 0
  if (N.sign(N.mul(N.add(A, C), Delta)) > 0) return { type: "empty", Delta, delta, note: "an ellipse with no real points" };
  return { type: N.eq(A, C) && N.isZero(B) ? "circle" : "ellipse", Delta, delta };
}

/** The eigenvalues of [[A, b], [b, C]] (b = B/2), smaller first, and a unit eigenvector for each. */
function axes(A, B, C) {
  const b = N.mul(B, HALF);
  if (N.isZero(b)) {
    const pairs = [[A, [ONE, ZERO]], [C, [ZERO, ONE]]];
    pairs.sort((p, q) => N.cmp(p[0], q[0]));
    return pairs;
  }
  const mean = N.mul(N.add(A, C), HALF);
  const r = N.sqrt(N.add(N.sq(N.mul(N.sub(A, C), HALF)), N.sq(b)));
  const out = [N.sub(mean, r), N.add(mean, r)].map((l) => [l, unit([b, N.sub(l, A)])]);
  return out;
}

/**
 * Everything a course asks about a conic: its type, and for an ellipse,
 * hyperbola or parabola the centre or vertex, axes, vertices, foci,
 * eccentricity, directrices and (hyperbola) asymptotes.
 * @param {string|Array} input  text such as "9x^2 + 4y^2 - 36 = 0", or [A, B, C, D, E, F]
 */
export function conicProperties(input) {
  const [A, B, C, D, E, F] = conicCoefficients(input);
  const cls = classify(A, B, C, D, E, F);
  const base = { type: cls.type, coefficients: [A, B, C, D, E, F], discriminant: N.sub(N.sq(B), N.mul(Q(4), N.mul(A, C))), determinant: cls.Delta };
  if (!["circle", "ellipse", "hyperbola", "parabola"].includes(cls.type)) return { ...base, degenerate: true, ...(cls.note ? { note: cls.note } : {}) };
  return cls.type === "parabola" ? parabola(base, A, B, C, D, E, F) : central(base, cls, A, B, C, D, E, F);
}

function central(base, cls, A, B, C, D, E, F) {
  const b = N.mul(B, HALF);
  // centre: [[A, b], [b, C]]·(x, y) = −(D/2, E/2)
  const d = N.neg(N.mul(D, HALF)), e = N.neg(N.mul(E, HALF));
  const det = cls.delta;
  const center = pt(N.div(N.sub(N.mul(d, C), N.mul(b, e)), det), N.div(N.sub(N.mul(A, e), N.mul(b, d)), det));
  // the constant after moving the centre to the origin: F' = Δ/δ
  const Fc = N.div(cls.Delta, det);
  const [[l1, u1], [l2, u2]] = axes(A, B, C);
  let major, minor, a2, b2, lmaj;
  if (cls.type === "hyperbola") {
    // λ u² + μ v² = −F': the transverse axis is the one whose λ has the sign of −F'
    const firstTransverse = N.sign(N.div(N.neg(Fc), l1)) > 0;
    const [lt, ut, lc, uc] = firstTransverse ? [l1, u1, l2, u2] : [l2, u2, l1, u1];
    a2 = N.div(N.neg(Fc), lt);
    b2 = N.div(Fc, lc);
    major = ut; minor = uc; lmaj = lt;
  } else {
    // the smaller |λ| gives the longer axis; both λ have the sign opposite to F'
    const swap = N.cmp(N.abs(l1), N.abs(l2)) > 0;
    const [lM, uM, lm, um] = swap ? [l2, u2, l1, u1] : [l1, u1, l2, u2];
    a2 = N.div(N.neg(Fc), lM);
    b2 = N.div(N.neg(Fc), lm);
    major = uM; minor = um; lmaj = lM;
  }
  const a = N.sqrt(a2), bb = N.sqrt(b2);
  const c2 = cls.type === "hyperbola" ? N.add(a2, b2) : N.sub(a2, b2);
  const c = N.sqrt(c2);
  const out = {
    ...base, degenerate: false, center,
    a, b: bb, c,
    semiMajor: a, semiMinor: bb,
    eccentricity: N.div(c, a),
    axes: { major: lineDir(center, major), minor: lineDir(center, minor) },
    axisDirection: major,
    vertices: [along(center, major, a), along(center, major, N.neg(a))],
    coVertices: [along(center, minor, bb), along(center, minor, N.neg(bb))],
    foci: N.isZero(c) ? [center] : [along(center, major, c), along(center, major, N.neg(c))],
    standardForm: cls.type === "hyperbola" ? `X²/${N.text(a2)} − Y²/${N.text(b2)} = 1` : `X²/${N.text(a2)} + Y²/${N.text(b2)} = 1`,
  };
  if (cls.type === "circle") {
    out.radius = a;
    out.directrices = [];
  } else {
    // directrices: perpendicular to the major axis at distance a²/c from the centre
    const k = N.div(a2, c);
    out.directrices = [lineDir(along(center, major, k), minor), lineDir(along(center, major, N.neg(k)), minor)];
  }
  if (cls.type === "hyperbola") {
    out.asymptotes = [
      lineDir(center, [N.add(N.mul(a, major[0]), N.mul(bb, minor[0])), N.add(N.mul(a, major[1]), N.mul(bb, minor[1]))]),
      lineDir(center, [N.sub(N.mul(a, major[0]), N.mul(bb, minor[0])), N.sub(N.mul(a, major[1]), N.mul(bb, minor[1]))]),
    ];
  }
  void lmaj;
  return out;
}

function parabola(base, A, B, C, D, E, F) {
  const b = N.mul(B, HALF);
  const J = N.add(A, C);
  // axis direction t: Qt = 0; the normal n: the eigenvector for J
  const t = unit(N.isZero(A) && N.isZero(b) ? [ONE, ZERO] : [N.neg(b), A]);
  const n = [N.neg(t[1]), t[0]];
  // in coordinates s along t and w along n: J·w² + Ds·s + Ew·w + F = 0
  const Ds = N.add(N.mul(D, t[0]), N.mul(E, t[1]));
  const Ew = N.add(N.mul(D, n[0]), N.mul(E, n[1]));
  const w0 = N.neg(N.div(Ew, N.mul(TWO, J)));
  const s0 = N.neg(N.div(N.sub(F, N.div(N.sq(Ew), N.mul(Q(4), J))), Ds));
  // (w − w0)² = −(Ds/J)(s − s0) = 4p(s − s0): the focus is p along t from the vertex
  const p = N.neg(N.div(Ds, N.mul(Q(4), J)));
  const origin = pt(ZERO, ZERO);
  const vertex = along(along(origin, t, s0), n, w0);
  const focus = along(vertex, t, p);
  return {
    ...base, degenerate: false,
    vertex, focus,
    focalLength: N.abs(p),
    eccentricity: ONE,
    axis: lineDir(vertex, t),
    axisDirection: N.sign(p) > 0 ? t : [N.neg(t[0]), N.neg(t[1])],
    directrix: lineDir(along(vertex, t, N.neg(p)), n),
    latusRectum: N.abs(N.mul(Q(4), p)),
    standardForm: `Y² = ${N.text(N.abs(N.mul(Q(4), p)))}·X`,
  };
}
