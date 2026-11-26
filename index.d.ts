// Type declarations for @ratmath/geo.
import type { Rational } from "@ratmath/core";

export interface PlannedPhase {
  phase: number;
  contents: string;
  /** Rough size in source lines, as text. */
  estimate: string;
}
/** The phases still to come. */
export const plan: readonly PlannedPhase[];

export class GeoError extends Error {
  code: string;
}

/** An algebraic real from @ratmath/algebraic. */
export interface AlgebraicValue {
  poly: bigint[];
  rational: [bigint, bigint] | null;
  interval(bits?: number): [unknown, unknown];
  toNumber(): number;
  toString(digits?: number): string;
}
/** An exact real number: a Rational when it is rational, otherwise an algebraic number. */
export type Num = Rational | AlgebraicValue;
/** What a coordinate may be written as. A JavaScript number that is not whole is refused; "sqrt(3)/2" and "0.35" are read exactly. */
export type NumLike = Num | bigint | number | string;

export function num(x: NumLike): Num;
export const N: {
  add(a: Num, b: Num): Num;
  sub(a: Num, b: Num): Num;
  mul(a: Num, b: Num): Num;
  div(a: Num, b: Num): Num;
  neg(a: Num): Num;
  sq(a: Num): Num;
  sqrt(a: Num): Num;
  sign(a: Num): -1 | 0 | 1;
  isZero(a: Num): boolean;
  cmp(a: Num, b: Num): number;
  eq(a: Num, b: Num): boolean;
  abs(a: Num): Num;
  min(a: Num, b: Num): Num;
  max(a: Num, b: Num): Num;
  sum(...xs: Num[]): Num;
  isRational(a: Num): a is Rational;
  toNumber(a: Num): number;
  /** A fraction, a closed form for quadratic irrationals, otherwise certified digits. */
  text(a: Num, digits?: number): string;
  enclose(a: Num, bits?: number): [unknown, unknown];
  /** cos(πq) and sin(πq), exact. */
  cosPi(q: Rational | [bigint, bigint]): Num;
  sinPi(q: Rational | [bigint, bigint]): Num;
};

// ---- the plane ---------------------------------------------------------------

export class Point {
  constructor(x: NumLike, y: NumLike);
  x: Num;
  y: Num;
  equals(o: Point): boolean;
  plus(o: Point): Point;
  minus(o: Point): Point;
  times(k: NumLike): Point;
  toNumbers(): [number, number];
  toString(): string;
}
export type PointLike = Point | [NumLike, NumLike];
export function point(x: NumLike, y: NumLike): Point;
export function point(p: PointLike): Point;

/** The line ax + by + c = 0. */
export class Line {
  constructor(a: NumLike, b: NumLike, c: NumLike);
  a: Num;
  b: Num;
  c: Num;
  readonly direction: Point;
  readonly origin: Point;
  at(p: PointLike): Num;
  contains(p: PointLike): boolean;
  equals(o: Line): boolean;
  toString(): string;
}
export function line(p: PointLike, q: PointLike): Line;
export function line(a: NumLike, b: NumLike, c: NumLike): Line;

export class Circle {
  constructor(center: Point, radius2: Num);
  center: Point;
  radius2: Num;
  readonly radius: Num;
  /** |PO|² − r². */
  power(p: PointLike): Num;
  contains(p: PointLike): boolean;
  equals(o: Circle): boolean;
  toString(): string;
}
/** The circle with a centre through a point. */
export function circle(center: PointLike, through: PointLike): Circle;

export function dot(u: Point, v: Point): Num;
export function cross(u: Point, v: Point): Num;
export function distance(p: PointLike, q: PointLike): Num;
export function distance2(p: PointLike, q: PointLike): Num;
export function midpoint(p: PointLike, q: PointLike): Point;
/** +1 for a left turn, −1 for a right turn, 0 when the three are on a line. */
export function orientation(p: PointLike, q: PointLike, r: PointLike): -1 | 0 | 1;
export function collinear(...points: PointLike[]): boolean;
export function concyclic(...points: PointLike[]): boolean;
export function parallel(l: Line, m: Line): boolean;
export function perpendicular(l: Line, m: Line): boolean;
export function concurrent(l: Line, m: Line, n: Line): boolean;
export function parallelThrough(l: Line, p: PointLike): Line;
export function perpendicularThrough(l: Line, p: PointLike): Line;
export function perpendicularBisector(p: PointLike, q: PointLike): Line;
export function angleBisector(a: PointLike, vertex: PointLike, b: PointLike, options?: { external?: boolean }): Line;
export function foot(p: PointLike, l: Line): Point;
export function reflect(p: PointLike, l: Line): Point;
/** The points common to two lines, a line and a circle, or two circles. */
export function meet(f: Line | Circle, g: Line | Circle): Point[];
export function tangents(c: Circle, p: PointLike): Line[];
export function circumcircle(a: PointLike, b: PointLike, c: PointLike): Circle;
export function regularPolygon(n: number, options?: { center?: PointLike; vertex?: PointLike }): Point[];

export interface ConstructionStep {
  step: number;
  tool: "given" | "ruler" | "compass" | "mark";
  makes: string[];
  text: string;
}
/** A ruler-and-compass construction written down step by step. */
export class Construction {
  constructor(given?: Record<string, PointLike>);
  steps: ConstructionStep[];
  objects: Map<string, Point | Line | Circle>;
  get(name: string): Point | Line | Circle;
  line(name: string, p: string, q: string): this;
  /** Centre through a point, or centre with the radius |through to|. */
  circle(name: string, center: string, through: string, to?: string): this;
  meet(names: string | string[], f: string, g: string): this;
  readonly count: { ruler: number; compass: number; mark: number };
  toString(): string;
}
export function construction(given?: Record<string, PointLike>): Construction;

export interface PerVertex<T> {
  A: T;
  B: T;
  C: T;
}
export class Triangle {
  constructor(a: PointLike, b: PointLike, c: PointLike);
  A: Point;
  B: Point;
  C: Point;
  readonly vertices: [Point, Point, Point];
  /** a = |BC|, b = |CA|, c = |AB|. */
  readonly sides: { a: Num; b: Num; c: Num };
  readonly sides2: { a: Num; b: Num; c: Num };
  readonly area: Num;
  readonly perimeter: Num;
  readonly cosines: PerVertex<Num>;
  readonly degrees: PerVertex<number>;
  classify(): { angles: "acute" | "right" | "obtuse"; sides: "equilateral" | "isosceles" | "scalene" };
  barycentric(u: Num, v: Num, w: Num): Point;
  readonly centroid: Point;
  readonly circumcenter: Point;
  readonly orthocenter: Point;
  readonly incenter: Point;
  readonly excenters: PerVertex<Point>;
  readonly ninePointCenter: Point;
  readonly symmedian: Point;
  readonly circumcircle: Circle;
  readonly incircle: Circle;
  readonly excircles: PerVertex<Circle>;
  readonly ninePointCircle: Circle;
  readonly inradius: Num;
  readonly circumradius: Num;
  readonly medians: PerVertex<Line>;
  readonly altitudes: PerVertex<Line>;
  readonly feet: PerVertex<Point>;
  readonly bisectors: PerVertex<Line>;
  /** null for an equilateral triangle. */
  readonly eulerLine: Line | null;
  toString(): string;
}
export function triangle(a: PointLike, b: PointLike, c: PointLike): Triangle;

export interface TransformKind {
  kind: "identity" | "translation" | "rotation" | "reflection" | "glide reflection" | "dilation" | "spiral similarity" | "dilative reflection" | "affine" | "singular";
  vector?: Point;
  center?: Point | Line | "plane" | null;
  cos?: Num;
  sin?: Num;
  degrees?: number;
  axis?: Line;
  ratio?: Num;
  determinant?: Num;
  preservesOrientation?: boolean;
  areaFactor?: Num;
}
/** The affine map p ↦ Mp + t. */
export class Transform {
  constructor(matrix: [[NumLike, NumLike], [NumLike, NumLike]], vector?: PointLike);
  m: [[Num, Num], [Num, Num]];
  t: Point;
  readonly determinant: Num;
  apply(p: PointLike): Point;
  apply(points: PointLike[]): Point[];
  apply(l: Line): Line;
  apply(c: Circle): Circle;
  apply(t: Triangle): Triangle;
  /** this after other. */
  compose(other: Transform): Transform;
  inverse(): Transform;
  equals(o: Transform): boolean;
  isSimilarity(): boolean;
  isIsometry(): boolean;
  /** The points left where they are. */
  fixed(): Point | Line | "plane" | null;
  classify(): TransformKind;
  toString(): string;
}
export function identity(): Transform;
export function translation(v: PointLike): Transform;
/** turn is a fraction of a full turn, such as "1/6". */
export function rotation(center: PointLike, turn: NumLike): Transform;
export function reflection(l: Line): Transform;
export function glide(l: Line, vector: PointLike): Transform;
export function dilation(center: PointLike, ratio: NumLike): Transform;
export function affine(matrix: [[NumLike, NumLike], [NumLike, NumLike]], vector?: PointLike): Transform;
export function inversion(c: Circle): {
  circle: Circle;
  apply(p: PointLike): Point;
  apply(f: Line | Circle): Line | Circle;
};

// ---- checked theorems --------------------------------------------------------

export interface Checked {
  theorem: string;
  statement: string;
  /** True when the conclusion is true for this figure, exactly. A check of one instance, not a proof. */
  holds: boolean;
  [detail: string]: unknown;
}
export type TriangleLike = Triangle | [PointLike, PointLike, PointLike];
export const theorems: {
  pythagoras(t: TriangleLike): Checked;
  eulerLine(t: TriangleLike): Checked;
  ninePointCircle(t: TriangleLike): Checked;
  feuerbach(t: TriangleLike): Checked;
  ceva(t: TriangleLike, D: PointLike, E: PointLike, F: PointLike): Checked;
  menelaus(t: TriangleLike, D: PointLike, E: PointLike, F: PointLike): Checked;
  ptolemy(A: PointLike, B: PointLike, C: PointLike, D: PointLike): Checked;
  napoleon(t: TriangleLike): Checked;
  simson(t: TriangleLike, p: PointLike): Checked;
  thales(c: Circle, a: PointLike, b: PointLike, p: PointLike): Checked;
  powerOfPoint(c: Circle, p: PointLike, l1: Line, l2: Line): Checked;
  varignon(A: PointLike, B: PointLike, C: PointLike, D: PointLike): Checked;
  concurrency(t: TriangleLike): Checked;
  pentagon(): Checked;
  heron(t: TriangleLike): Checked;
};

// ---- discrete geometry -------------------------------------------------------

export function onSegment(a: PointLike, b: PointLike, p: PointLike): boolean;
/** Counter-clockwise, without points inside edges. */
export function convexHull(points: PointLike[]): Point[];
export interface SegmentMeeting {
  meets: boolean;
  kind: "none" | "cross" | "touch" | "overlap";
  point: Point | null;
  from?: Point;
  to?: Point;
}
export function segmentIntersection(a: PointLike, b: PointLike, c: PointLike, d: PointLike): SegmentMeeting;

export class Polygon {
  constructor(vertices: PointLike[]);
  vertices: Point[];
  readonly edges: [Point, Point][];
  readonly signedArea: Num;
  readonly area: Num;
  readonly perimeter: Num;
  readonly centroid: Point;
  isConvex(): boolean;
  isSimple(): boolean;
  locate(p: PointLike): "inside" | "boundary" | "outside";
  contains(p: PointLike): boolean;
  /** Triangles as indices into vertices. */
  triangulate(): [number, number, number][];
  /** The part inside a convex polygon. */
  clip(convex: Polygon | PointLike[]): Polygon | null;
  toString(): string;
}
export function polygon(vertices: PointLike[]): Polygon;

/** Is d inside the circle through a, b, c (in either order)? +1 inside, 0 on it, −1 outside. */
export function inCircle(a: PointLike, b: PointLike, c: PointLike, d: PointLike): -1 | 0 | 1;
export interface Delaunay {
  points: Point[];
  triangles: [number, number, number][];
  edges: [number, number][];
  /** True when four points lie on one circle, so the triangulation is not unique. */
  cocircular: boolean;
}
export function delaunay(points: PointLike[]): Delaunay;
export interface Voronoi {
  points: Point[];
  vertices: Point[];
  cells: { site: number; corners: Point[]; bounded: boolean }[];
  /** An edge with to = null is a ray leaving `from`. */
  edges: { between: [number, number]; from: Point; to: Point | null }[];
  cocircular: boolean;
}
export function voronoi(points: PointLike[]): Voronoi;
export function closestPair(points: PointLike[]): { points: [Point, Point]; distance2: Num; distance: Num };

export function latticePointsOn(p: PointLike, q: PointLike): number;
export function pick(vertices: Polygon | PointLike[]): { area: Num; interior: number; boundary: number; formula: Num; holds: boolean };
export function isVisible(x: NumLike, y: NumLike): boolean;
export function visiblePoints(n: number): { n: number; count: number; share: Rational; limit: string };

export interface TaxicabBisector {
  segments: [Point, Point][];
  rays: { from: Point; direction: Point }[];
  regions: { corner: Point; quadrant: [Point, Point] }[];
  kind: string;
}
export interface Metric {
  name: "taxicab" | "chebyshev" | "euclidean";
  distance(p: PointLike, q: PointLike): Num;
  /** The corners of the "circle"; taxicab and Chebyshev only. */
  circle(center: PointLike, radius: NumLike): Point[];
  /** Circumference ÷ diameter in this metric. */
  pi: Num | "π";
  /** Taxicab only. */
  bisector(p: PointLike, q: PointLike): TaxicabBisector;
  /** The corners, counter-clockwise; taxicab and Chebyshev only. */
  ellipse(f1: PointLike, f2: PointLike, sum: NumLike): Point[];
}
export function metric(name?: "taxicab" | "chebyshev" | "euclidean"): Metric;
