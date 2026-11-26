// Classical theorems, checked on exact configurations. Each function takes
// a figure, builds what the theorem talks about, and tests the conclusion
// with exact arithmetic: { theorem, statement, holds, … }. `holds: true`
// means the conclusion is true for this figure, exactly. It is a check of
// one instance, not a proof of the theorem; general proofs by elimination
// are a later phase.
import { N, refuse, ONE, TWO, Q } from "./num.js";
import { Point, point, line, Triangle, triangle, Circle, distance, distance2, midpoint, collinear, concurrent, concyclic, foot, meet, cross, dot, orientation, regularPolygon, rotation } from "./plane.js";

const T = (t) => (t instanceof Triangle ? t : Array.isArray(t) ? triangle(...t) : refuse("bad-figure", "give a triangle"));
const result = (theorem, statement, holds, extra = {}) => ({ theorem, statement, holds, ...extra });
/** signed ratio AP : PB for P on line AB */
const ratio = (A, B, p) => {
  const ab = B.minus(A);
  const ap = p.minus(A);
  const pb = B.minus(p);
  return N.div(dot(ap, ab), dot(pb, ab));
};

export const theorems = {
  /** In a right triangle the squares on the legs add up to the square on the hypotenuse; in general c² = a² + b² − 2ab·cos C. */
  pythagoras(t) {
    const tri = T(t);
    const s = tri.sides2;
    const sorted = [s.a, s.b, s.c].sort(N.cmp);
    const right = tri.classify().angles === "right";
    const defect = N.sub(N.add(sorted[0], sorted[1]), sorted[2]);
    return result("Pythagoras", "a² + b² = c² exactly when the angle opposite c is a right angle", N.isZero(defect) === right, { right, squares: sorted, defect });
  },
  /** The circumcentre O, centroid G and orthocentre H lie on one line, with OG : GH = 1 : 2. */
  eulerLine(t) {
    const tri = T(t);
    const [O, G, H] = [tri.circumcenter, tri.centroid, tri.orthocenter];
    const twice = H.minus(G).equals(G.minus(O).times(2));
    return result("Euler line", "O, G and H are collinear and GH = 2·OG", collinear(O, G, H) && twice, { O, G, H, ninePointCenterIsMidpoint: tri.ninePointCenter.equals(midpoint(O, H)) });
  },
  /** The midpoints of the sides, the feet of the altitudes and the midpoints from the vertices to H lie on one circle, of half the circumradius. */
  ninePointCircle(t) {
    const tri = T(t);
    const H = tri.orthocenter;
    const f = tri.feet;
    const points = [midpoint(tri.A, tri.B), midpoint(tri.B, tri.C), midpoint(tri.C, tri.A), f.A, f.B, f.C, midpoint(tri.A, H), midpoint(tri.B, H), midpoint(tri.C, H)];
    const c = tri.ninePointCircle;
    return result("Nine-point circle", "nine points lie on one circle whose radius is half the circumradius", points.every((p) => c.contains(p)) && N.eq(N.mul(Q(4), c.radius2), tri.circumcircle.radius2), { circle: c, points });
  },
  /** The nine-point circle touches the incircle and all three excircles. */
  feuerbach(t) {
    const tri = T(t);
    const nine = tri.ninePointCircle;
    const touches = (c, inside) => {
      const d = distance(nine.center, c.center);
      return N.eq(d, inside ? N.abs(N.sub(nine.radius, c.radius)) : N.add(nine.radius, c.radius));
    };
    const ex = tri.excircles;
    const parts = { incircle: touches(tri.incircle, true), excircleA: touches(ex.A, false), excircleB: touches(ex.B, false), excircleC: touches(ex.C, false) };
    return result("Feuerbach", "the nine-point circle is tangent to the incircle and to each excircle", Object.values(parts).every(Boolean), parts);
  },
  /** Lines from the vertices through points D on BC, E on CA, F on AB meet in a point exactly when (BD/DC)(CE/EA)(AF/FB) = 1. */
  ceva(t, D, E, F) {
    const tri = T(t);
    const [d, e, f] = [point(D), point(E), point(F)];
    if (!collinear(tri.B, tri.C, d) || !collinear(tri.C, tri.A, e) || !collinear(tri.A, tri.B, f)) refuse("bad-figure", "D, E, F must lie on the lines BC, CA, AB");
    const product = N.mul(N.mul(ratio(tri.B, tri.C, d), ratio(tri.C, tri.A, e)), ratio(tri.A, tri.B, f));
    const meets = concurrent(line(tri.A, d), line(tri.B, e), line(tri.C, f));
    return result("Ceva", "the three cevians are concurrent exactly when the product of the ratios is 1", meets === N.eq(product, ONE), { product, concurrent: meets });
  },
  /** Points D, E, F on the lines BC, CA, AB are collinear exactly when (BD/DC)(CE/EA)(AF/FB) = −1. */
  menelaus(t, D, E, F) {
    const tri = T(t);
    const [d, e, f] = [point(D), point(E), point(F)];
    const product = N.mul(N.mul(ratio(tri.B, tri.C, d), ratio(tri.C, tri.A, e)), ratio(tri.A, tri.B, f));
    const onLine = collinear(d, e, f);
    return result("Menelaus", "the three points are collinear exactly when the product of the signed ratios is −1", onLine === N.eq(product, Q(-1)), { product, collinear: onLine });
  },
  /** For A, B, C, D in order on a circle, AC·BD = AB·CD + BC·DA; for any four points the left side is at most the right. */
  ptolemy(A, B, C, D) {
    const [a, b, c, d] = [A, B, C, D].map(point);
    const left = N.mul(distance(a, c), distance(b, d));
    const right = N.add(N.mul(distance(a, b), distance(c, d)), N.mul(distance(b, c), distance(d, a)));
    const cyclic = concyclic(a, b, c, d);
    // the order around the circle: the diagonals AC and BD must cross
    const convex = orientation(a, c, b) * orientation(a, c, d) < 0 && orientation(b, d, a) * orientation(b, d, c) < 0;
    const equal = N.eq(left, right);
    return result("Ptolemy", "AC·BD = AB·CD + BC·DA exactly when ABCD is cyclic (in that order)", equal === (cyclic && convex) && N.cmp(left, right) <= 0, { diagonals: left, sides: right, cyclic, equal });
  },
  /** Equilateral triangles built outward on the sides of any triangle have centres that form an equilateral triangle. */
  napoleon(t) {
    const tri = T(t);
    const sign = orientation(tri.A, tri.B, tri.C);
    const apex = (p, q) => rotation(p, sign > 0 ? "-1/6" : "1/6").apply(q); // the third vertex, on the side away from the triangle
    const centre = (p, q) => {
      const r = apex(p, q);
      return new Point(N.div(N.sum(p.x, q.x, r.x), Q(3)), N.div(N.sum(p.y, q.y, r.y), Q(3)));
    };
    const [X, Y, Z] = [centre(tri.A, tri.B), centre(tri.B, tri.C), centre(tri.C, tri.A)];
    const [x, y, z] = [distance2(X, Y), distance2(Y, Z), distance2(Z, X)];
    return result("Napoleon", "the centres of the three outer equilateral triangles form an equilateral triangle", N.eq(x, y) && N.eq(y, z), { centres: [X, Y, Z], side2: x });
  },
  /** For P on the circumcircle, the feet of the perpendiculars from P to the three sides are collinear. */
  simson(t, p) {
    const tri = T(t);
    const P = point(p);
    const feet = [foot(P, line(tri.B, tri.C)), foot(P, line(tri.C, tri.A)), foot(P, line(tri.A, tri.B))];
    const on = tri.circumcircle.contains(P);
    const lineUp = collinear(...feet);
    return result("Simson line", "the three feet are collinear exactly when P is on the circumcircle", on === lineUp, { onCircumcircle: on, collinear: lineUp, feet });
  },
  /** An angle standing on a diameter is a right angle. */
  thales(c, a, b, p) {
    if (!(c instanceof Circle)) refuse("bad-figure", "give a circle, the two ends of a chord and a third point on the circle");
    const [A, B, P] = [a, b, p].map(point);
    if (![A, B, P].every((q) => c.contains(q))) refuse("bad-figure", "the three points must be on the circle");
    const diameter = midpoint(A, B).equals(c.center);
    const right = N.isZero(dot(A.minus(P), B.minus(P)));
    return result("Thales", "the angle APB is a right angle exactly when AB is a diameter", diameter === right, { diameter, right });
  },
  /** For a point P and a circle, PA·PB is the same for every line through P meeting the circle at A and B. */
  powerOfPoint(c, p, l1, l2) {
    const P = point(p);
    const products = [l1, l2].map((l) => {
      const hits = meet(l, c);
      if (!l.contains(P) || hits.length === 0) refuse("bad-figure", "each line must pass through P and meet the circle");
      const [A, B] = hits.length === 1 ? [hits[0], hits[0]] : hits;
      return dot(A.minus(P), B.minus(P));
    });
    return result("Power of a point", "the signed product PA·PB equals |PO|² − r² for every secant through P", N.eq(products[0], products[1]) && N.eq(products[0], c.power(P)), { power: c.power(P), products });
  },
  /** The midpoints of the sides of any quadrilateral form a parallelogram of half the area. */
  varignon(A, B, C, D) {
    const q = [A, B, C, D].map(point);
    const m = q.map((p, i) => midpoint(p, q[(i + 1) % 4]));
    const parallelogram = m[1].minus(m[0]).equals(m[2].minus(m[3]));
    const area = (v) => N.div(N.sum(...v.map((p, i) => cross(p, v[(i + 1) % v.length]))), TWO);
    return result("Varignon", "the midpoints form a parallelogram with half the (signed) area", parallelogram && N.eq(N.mul(TWO, area(m)), area(q)), { midpoints: m, area: N.abs(area(q)), inner: N.abs(area(m)) });
  },
  /** The centroid divides each median 2 : 1, and the three medians, altitudes and bisectors are each concurrent. */
  concurrency(t) {
    const tri = T(t);
    const m = tri.medians;
    const h = tri.altitudes;
    const b = tri.bisectors;
    const parts = {
      medians: concurrent(m.A, m.B, m.C),
      altitudes: concurrent(h.A, h.B, h.C),
      bisectors: concurrent(b.A, b.B, b.C) && [b.A, b.B, b.C].every((l) => l.contains(tri.incenter)),
      centroidDivides: tri.centroid.minus(tri.A).equals(midpoint(tri.B, tri.C).minus(tri.centroid).times(2)),
    };
    return result("Concurrency", "medians, altitudes and angle bisectors each meet in a point", Object.values(parts).every(Boolean), parts);
  },
  /** The side and diagonal of a regular pentagon are in the golden ratio. */
  pentagon() {
    const v = regularPolygon(5);
    const side = distance(v[0], v[1]);
    const diagonal = distance(v[0], v[2]);
    const phi = N.div(diagonal, side);
    return result("Golden pentagon", "diagonal : side = φ, the root of φ² = φ + 1", N.eq(N.sq(phi), N.add(phi, ONE)), { ratio: phi, side, diagonal });
  },
  /** Heron: area² = s(s − a)(s − b)(s − c). */
  heron(t) {
    const tri = T(t);
    const { a, b, c } = tri.sides;
    const s = N.div(N.sum(a, b, c), TWO);
    const product = N.mul(N.mul(s, N.sub(s, a)), N.mul(N.sub(s, b), N.sub(s, c)));
    return result("Heron", "area² = s(s − a)(s − b)(s − c)", N.eq(N.sq(tri.area), product), { area: tri.area, semiperimeter: s });
  },
};
