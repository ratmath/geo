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

// ---- phase 4: the projective plane and finite geometries ----

export class PPoint {
  readonly coords: readonly [Num, Num, Num];
  readonly key: string;
  readonly atInfinity: boolean;
  readonly dual: PLine;
  equals(o: PPoint): boolean;
  on(l: PLine): boolean;
  toAffine(): Point | null;
  toString(): string;
}
export class PLine {
  readonly coords: readonly [Num, Num, Num];
  readonly key: string;
  readonly dual: PPoint;
  readonly isAtInfinity: boolean;
  equals(o: PLine): boolean;
  contains(p: PPoint): boolean;
  toString(): string;
}
export type PPointLike = PPoint | Point | [NumLike, NumLike] | [NumLike, NumLike, NumLike];
export function ppoint(...coords: NumLike[] | [PPointLike]): PPoint;
export function pline(...coords: NumLike[] | [[NumLike, NumLike, NumLike]]): PLine;
export function lineAtInfinity(): PLine;
export function join(p: PPointLike, q: PPointLike): PLine;
export function meetLines(l: PLine | [NumLike, NumLike, NumLike], m: PLine | [NumLike, NumLike, NumLike]): PPoint;
export function collinearP(p: PPointLike, q: PPointLike, r: PPointLike): boolean;
export function concurrentP(l: PLine, m: PLine, n: PLine): boolean;
export function crossRatio(a: PPointLike | PLine, b: PPointLike | PLine, c: PPointLike | PLine, d: PPointLike | PLine): Num | "infinity";
export function harmonicConjugate(a: PPointLike, b: PPointLike, c: PPointLike): PPoint;
export type Matrix3 = [[NumLike, NumLike, NumLike], [NumLike, NumLike, NumLike], [NumLike, NumLike, NumLike]];
export class Projectivity {
  constructor(matrix: Matrix3);
  readonly matrix: readonly (readonly Num[])[];
  readonly isAffine: boolean;
  apply(x: PPointLike): PPoint;
  apply(x: PLine): PLine;
  compose(other: Projectivity): Projectivity;
  inverse(): Projectivity;
  equals(o: Projectivity): boolean;
  toString(): string;
}
export function projectivity(matrix: Matrix3): Projectivity;
export function projectivityFrom(from: PPointLike[], to: PPointLike[]): Projectivity;
export class Conic {
  constructor(matrix: Matrix3);
  static fromCoefficients(c: [NumLike, NumLike, NumLike, NumLike, NumLike, NumLike]): Conic;
  readonly matrix: readonly (readonly Num[])[];
  readonly coefficients: Num[];
  readonly determinant: Num;
  readonly degenerate: boolean;
  value(p: PPointLike): Num;
  contains(p: PPointLike): boolean;
  polar(p: PPointLike): PLine;
  pole(l: PLine): PPoint;
  tangentAt(p: PPointLike): PLine;
  transform(T: Projectivity): Conic;
  classify(): string;
  toString(): string;
}
export function conicThrough(points: PPointLike[]): Conic;
export function desargues(t1: PPointLike[], t2: PPointLike[]): { fromPoint: boolean; fromLine: boolean; holds: boolean; center: PPoint | null; axis: PLine | null; meets: PPoint[] };
export function pappus(abc: PPointLike[], ABC: PPointLike[]): { holds: boolean; points: PPoint[]; line: PLine };
export function pascal(points: PPointLike[], conic?: Conic | null): { holds: boolean; points: PPoint[]; line: PLine; conic: Conic };
export function brianchon(conic: Conic, points: PPointLike[]): { holds: boolean; vertices: PPoint[]; center: PPoint | null };

export interface PermGroupLike { degree: number; order: number; elements: number[][]; generators: number[][] }
export class Incidence {
  constructor(lines: number[][], options?: { points?: number | null; name?: string; labels?: string[] | null });
  readonly v: number;
  readonly b: number;
  readonly lines: readonly (readonly number[])[];
  readonly name: string;
  readonly labels: readonly string[] | null;
  readonly matrix: number[][];
  readonly order: number | null;
  linesThrough(p: number): number[];
  lineThrough(p: number, q: number): number | number[] | null;
  meet(i: number, j: number): number[];
  parallels(p: number, line: number): number[];
  projectiveAxioms(): { twoPointsOneLine: boolean; twoLinesOnePoint: boolean; fourPointsNoThreeCollinear: boolean; holds: boolean };
  isProjectivePlane(): boolean;
  affineAxioms(): { twoPointsOneLine: boolean; playfair: boolean; threeNonCollinear: boolean; holds: boolean };
  isAffinePlane(): boolean;
  hasQuadrangle(): boolean;
  designParameters(): { v: number; b: number; k: number | null; r: number | null; lambda: number | null };
  dual(): Incidence;
  collineations(options?: { maxOrder?: number }): { order: number; group: PermGroupLike | null; elements: number[][] };
  toString(): string;
}
export function incidence(lines: number[][], options?: { points?: number | null; name?: string; labels?: string[] | null }): Incidence;
export class FiniteProjectivePlane extends Incidence {
  constructor(q: number);
  readonly q: number;
  readonly coordinates: readonly (readonly number[])[];
  pointAt(v: number[]): number;
  collineationGroup(options?: { maxOrder?: number }): PermGroupLike;
}
export class FiniteAffinePlane extends Incidence {
  constructor(q: number);
  readonly q: number;
  readonly parallelClasses: readonly (readonly number[])[];
  completion(): Incidence;
}
export function projectivePlane(q: number): FiniteProjectivePlane;
export function affinePlane(q: number): FiniteAffinePlane;
export function fano(): FiniteProjectivePlane;

// ---- phase 5: solids, symmetry, tilings ----

export type Point3 = [NumLike, NumLike, NumLike];
export interface SolidSymmetry { order: number; rotations: number; group: PermGroupLike; rotationGroup: PermGroupLike | null; name: string }
export class Polyhedron {
  constructor(vertices: Point3[], faces?: number[][] | null, options?: { name?: string; check?: boolean });
  readonly vertices: readonly (readonly Num[])[];
  readonly faces: readonly (readonly number[])[];
  readonly center: readonly Num[];
  readonly name: string;
  readonly V: number;
  readonly E: number;
  readonly F: number;
  readonly edges: [number, number][];
  readonly euler: number;
  readonly faceCounts: Record<number, number>;
  readonly vertexConfigurations: string[];
  readonly edgeLengths2: Num[];
  readonly volume: Num;
  readonly surfaceArea: Num;
  readonly dihedralCosines: Num[];
  vertexConfiguration(i: number): string;
  faceArea(k: number): Num;
  dual(options?: { name?: string | null }): Polyhedron;
  symmetry(): SolidSymmetry;
  toString(): string;
}
export function polyhedron(points: Point3[], options?: { name?: string }): Polyhedron;
export const solids: Readonly<Record<"tetrahedron" | "cube" | "octahedron" | "dodecahedron" | "icosahedron" | "cuboctahedron" | "truncatedOctahedron" | "truncatedTetrahedron" | "truncatedCube", () => Polyhedron>>;
export function prism(n: number, options?: { height?: NumLike }): Polyhedron;

export function figureSymmetry(points: PointLike[], options?: { labels?: unknown[] | null }): { order: number; rotations: number; reflections: number; name: string; center?: Point; transforms: Transform[]; group: PermGroupLike | null };
export type WallpaperName = "p1" | "p2" | "pm" | "pg" | "cm" | "pmm" | "pmg" | "pgg" | "cmm" | "p3" | "p3m1" | "p31m" | "p4" | "p4m" | "p4g" | "p6" | "p6m";
export interface LatticePatternSpec { gram: [[NumLike, NumLike], [NumLike, NumLike]]; points: Array<[NumLike, NumLike]>; labels?: unknown[] | null }
export function wallpaperGroup(pattern: LatticePatternSpec): { name: WallpaperName; orbifold: string; pointGroupOrder: number; symmetries: number; steps: string[] };
export const wallpaper: {
  readonly names: readonly WallpaperName[];
  readonly orbifold: Readonly<Record<WallpaperName, string>>;
  pattern(name: WallpaperName, seeds?: Array<[NumLike, NumLike]>): { gram: [[NumLike, NumLike], [NumLike, NumLike]]; points: Array<[Rational, Rational]>; labels: number[] };
  classify(pattern: LatticePatternSpec): ReturnType<typeof wallpaperGroup>;
};
export type FriezeName = "p1" | "p11g" | "p1m1" | "p2" | "p2mg" | "p11m" | "p2mm";
export function friezeGroup(spec: { points: Array<[NumLike, NumLike]>; period?: NumLike; labels?: unknown[] | null }): { name: FriezeName; conway: string; orbifold: string; horizontalMirror: boolean; verticalMirror: boolean; halfTurn: boolean; glide: boolean; mirrorAt: Rational | null; halfTurnAt: [Rational, Rational] | null; centreLine: Rational };
export const friezes: Readonly<Record<FriezeName, { name: FriezeName; conway: string; orbifold: string }>>;

export function polygonAngle(n: number): Rational;
export function vertexTypes(): number[][];
export function uniformTiling(type: string | number[]): { type: string; fits: boolean; uniform: boolean; reason: string };
export function regularTilings(): Array<{ p: number; q: number; symbol: string; dual: string }>;
export function tilingPatch(type: string | number[], options?: { radius?: number; maxPolygons?: number }): { readonly type: string; readonly ok: boolean; readonly polygons: { n: number; points: [number, number][] }[]; readonly vertices: number; readonly choices: number; readonly reason?: string };

// ---- pictures and the join with graphics ----
import type { Figure, Frames, Camera, Point as GPoint, Line as GLine, Circle as GCircle, Polygon as GPolygon, Surd } from "@ratmath/graphics";
export { figureSVG, figurePNG, figurePDF, figureTikZ, figureASCII, framesSVG, framesPNG } from "@ratmath/graphics";
/** An exact number as a graphics Surd a + b√d, or null when it is not rational or quadratic. */
export function toSurd(x: unknown): Surd | null;
/** A geo object as the graphics object with the same exact coordinates; refuses numbers outside Q(√d). */
export function toGraphics(x: Point): GPoint;
export function toGraphics(x: Line): GLine;
export function toGraphics(x: Circle): GCircle;
export function toGraphics(x: Polygon | Triangle): GPolygon;
export function fromGraphics(x: GPoint): Point;
export function fromGraphics(x: GLine): Line;
export function fromGraphics(x: GCircle): Circle;
export function fromGraphics(x: GPolygon): Polygon;
export function geoFigure(items: unknown[], options?: { x?: [number, number]; y?: [number, number]; title?: string; axes?: boolean }): Figure;
export function constructionFrames(c: Construction, options?: { title?: string }): Frames;
export function tilingFigure(type: string | number[], options?: { radius?: number; view?: number; title?: string }): Figure;
export function solidPicture(poly: Polyhedron | { vertices: unknown[][]; faces: number[][]; name?: string }, options?: { cam?: Camera; colors?: string[]; opacity?: number }): Figure;
export function wallpaperFigure(pattern: { gram: unknown[][]; points: unknown[][]; labels?: number[] }, options?: { cells?: number; title?: string }): Figure;
export function incidenceFigure(geometry: Incidence, options?: { title?: string }): Figure;

// ---- angles and hyperbolic lengths ----
import type { RationalInterval } from "@ratmath/core";
/** An angle kept as its exact cosine and sine, with a float saying which turn it is on. */
export class Angle {
  constructor(cos: NumLike, sin: NumLike, approx?: number);
  readonly cos: Num;
  readonly sin: Num;
  /** The angle in radians as a double. */
  readonly approx: number;
  /** The angle between 0 and π with this cosine. */
  static ofCos(c: NumLike): Angle;
  /** From a fraction of a full turn. */
  static ofTurns(q: NumLike): Angle;
  static readonly PI: Angle;
  static readonly ZERO: Angle;
  static readonly RIGHT: Angle;
  /** The fraction of a full turn, or null when the angle is not a rational multiple of π (decided exactly). */
  readonly turns: Rational | null;
  readonly isRational: boolean;
  readonly isRight: boolean;
  readonly isZero: boolean;
  readonly degrees: number;
  /** "π/3", or radians to 10 places when the angle is not a rational multiple of π. */
  readonly text: string;
  /** An interval of radians containing the angle. */
  value(digits?: number): RationalInterval;
  toNumber(): number;
  add(o: Angle): Angle;
  sub(o: Angle): Angle;
  neg(): Angle;
  equals(o: Angle): boolean;
  compare(o: Angle): -1 | 0 | 1;
  toString(): string;
}
export type AngleLike = Angle | NumLike | { cos: NumLike; sin?: NumLike };
export function angle(x: AngleLike): Angle;
/** The fraction q of a full turn (0 ≤ q ≤ 1/2) with cos(2πq) = c, or null: a proof that there is none. */
export function turnsOfCos(c: NumLike): Rational | null;
/** π times an exact number. */
export interface PiMultiple { coefficient: Num; text: string; value(digits?: number): RationalInterval; toNumber(): number }
export function piTimes(k: NumLike): PiMultiple;
/** A hyperbolic length held as its exact cosh and sinh. */
export class Length {
  constructor(cosh: NumLike, sinh?: NumLike);
  readonly cosh: Num;
  readonly sinh: Num;
  static ofCosh(c: NumLike): Length;
  static ofSinh(s: NumLike): Length;
  /** From eᵈ: Length.ofExp(2) is ln 2. */
  static ofExp(e: NumLike): Length;
  readonly exp: Num;
  readonly tanh: Num;
  readonly isZero: boolean;
  /** "ln(2 + √3)". */
  readonly text: string;
  add(o: Length): Length;
  double(): Length;
  half(): Length;
  equals(o: Length): boolean;
  compare(o: Length): number;
  value(digits?: number): RationalInterval;
  toNumber(): number;
  toString(): string;
}

// ---- the sphere ----
export type Vec3Like = [NumLike, NumLike, NumLike];
export class SPoint {
  constructor(x: NumLike, y: NumLike, z: NumLike);
  readonly v: [Num, Num, Num];
  readonly x: Num;
  readonly y: Num;
  readonly z: Num;
  readonly antipode: SPoint;
  readonly latLon: { lat: Angle; lon: Angle };
  /** Stereographic projection from the north pole onto the plane z = 0. */
  readonly stereographic: Point;
  equals(o: SPoint): boolean;
  isAntipodeOf(o: SPoint): boolean;
  dot(o: SPointLike): Num;
  distanceTo(o: SPointLike): Angle;
  toNumbers(): [number, number, number];
  toString(): string;
}
export type SPointLike = SPoint | Vec3Like;
/** The point of the sphere in the direction of a non-zero vector. */
export function spoint(x: NumLike, y: NumLike, z: NumLike): SPoint;
export function spoint(p: SPointLike): SPoint;
/** Latitude and longitude as fractions of a full turn. */
export function latLon(lat: AngleLike, lon: AngleLike): SPoint;
export function fromStereographic(p: PointLike): SPoint;
export function northPole(): SPoint;
export class GreatCircle {
  constructor(normal: Vec3Like);
  readonly n: [Num, Num, Num];
  readonly poles: [SPoint, SPoint];
  readonly reflection: SIsometry;
  contains(p: SPointLike): boolean;
  side(p: SPointLike): -1 | 0 | 1;
  equals(o: GreatCircle): boolean;
  /** The two opposite points where the circles cross. */
  meet(o: GreatCircle): [SPoint, SPoint];
  angleWith(o: GreatCircle): Angle;
  isPerpendicularTo(o: GreatCircle): boolean;
  perpendicularThrough(p: SPointLike): GreatCircle;
  distanceTo(p: SPointLike): Angle;
  /** Always empty: any two great circles meet. */
  parallelsThrough(p: SPointLike): GreatCircle[] & { count: 0; reason: string; witness: { line: GreatCircle; meets: [SPoint, SPoint] } };
  toString(): string;
}
/** The great circle through two points, or with a given pole. */
export function greatCircle(a: SPointLike, b?: SPointLike): GreatCircle;
export function equator(): GreatCircle;
export class SCircle {
  constructor(center: SPointLike, cosRadius: NumLike);
  readonly center: SPoint;
  readonly cosRadius: Num;
  readonly radius: Angle;
  readonly circumference: PiMultiple;
  readonly area: PiMultiple;
  readonly isGreat: boolean;
  contains(p: SPointLike): boolean;
  toString(): string;
}
export function scircle(center: SPointLike, through: SPointLike | { radius: AngleLike } | { cos: NumLike }): SCircle;
export interface TrigChecks { lawOfCosines: boolean; secondLawOfCosines: boolean; lawOfSines: boolean; all: boolean }
export class STriangle {
  constructor(A: SPointLike, B: SPointLike, C: SPointLike);
  readonly A: SPoint;
  readonly B: SPoint;
  readonly C: SPoint;
  readonly vertices: [SPoint, SPoint, SPoint];
  /** The sides as angles; a is opposite A. */
  readonly sides: { a: Angle; b: Angle; c: Angle };
  readonly angles: { A: Angle; B: Angle; C: Angle };
  readonly angleSum: Angle;
  /** A + B + C − π. */
  readonly excess: Angle;
  /** The area on the unit sphere: the excess. */
  readonly area: Angle;
  /** The share of the whole sphere, when rational. */
  readonly fractionOfSphere: Rational | null;
  readonly perimeter: Angle;
  readonly polar: STriangle;
  readonly sidesAsCircles: { a: GreatCircle; b: GreatCircle; c: GreatCircle };
  classify(): { rightAngles: number; sides: "equilateral" | "isosceles" | "scalene" };
  checks(): TrigChecks & { polar: boolean; excess: boolean };
  toString(): string;
}
export function striangle(a: SPointLike, b: SPointLike, c: SPointLike): STriangle;
/** The area of a lune with the given angle: twice the angle. */
export function lune(a: AngleLike): Angle;
export type SIsometryKind =
  | { kind: "identity" }
  | { kind: "rotation"; axis: SPoint; angle: Angle }
  | { kind: "reflection"; mirror: GreatCircle }
  | { kind: "rotary reflection"; axis: SPoint | null; angle: Angle; antipodal: boolean };
export class SIsometry {
  constructor(matrix: NumLike[][]);
  readonly matrix: Num[][];
  readonly inverse: SIsometry;
  readonly determinant: Num;
  apply(x: SPoint): SPoint;
  apply(x: GreatCircle): GreatCircle;
  apply(x: STriangle): STriangle;
  apply(x: SCircle): SCircle;
  then(o: SIsometry): SIsometry;
  equals(o: SIsometry): boolean;
  classify(): SIsometryKind;
  toString(): string;
}
export function srotation(axis: SPointLike, turns: AngleLike): SIsometry;
export function antipodalMap(): SIsometry;

// ---- the hyperbolic plane ----
export class HPoint {
  constructor(t: NumLike, x: NumLike, y: NumLike);
  readonly v: [Num, Num, Num];
  /** (t, x, y) with t² − x² − y² = 1. */
  readonly hyperboloid: [Num, Num, Num];
  readonly disc: Point;
  readonly klein: Point;
  readonly halfPlane: Point;
  equals(o: unknown): boolean;
  distanceTo(o: HPointLike): Length;
  toString(): string;
}
export type HPointLike = HPoint | Point | [NumLike, NumLike];
/** The point with coordinates (x, y) in the Poincaré disc. */
export function hpoint(x: NumLike, y: NumLike): HPoint;
export function hpoint(p: HPointLike): HPoint;
export function fromKlein(x: NumLike | Point | [NumLike, NumLike], y?: NumLike): HPoint;
export function fromHalfPlane(x: NumLike | Point | [NumLike, NumLike], y?: NumLike): HPoint;
export function fromHyperboloid(t: NumLike | Vec3Like, x?: NumLike, y?: NumLike): HPoint;
export function horigin(): HPoint;
/** A point of the circle at infinity. */
export class HIdeal {
  constructor(x: NumLike, y: NumLike);
  readonly x: Num;
  readonly y: Num;
  readonly disc: Point;
  readonly klein: Point;
  /** The real number on the edge of the half-plane, or null for its point at infinity. */
  readonly halfPlane: Num | null;
  equals(o: unknown): boolean;
  toString(): string;
}
/** The ideal point in a direction, or at an angle given as a fraction of a full turn. */
export function ideal(x: NumLike | Point | [NumLike, NumLike] | HIdeal, y?: NumLike): HIdeal;
export type HAny = HPointLike | HIdeal;
export type HRelation =
  | { kind: "equal" }
  | { kind: "intersecting"; point: HPoint; angle: Angle }
  | { kind: "asymptotic"; ideal: HIdeal }
  | { kind: "ultraparallel"; commonPerpendicular: HLine; distance: Length };
export class HLine {
  constructor(normal: Vec3Like);
  readonly n: [Num, Num, Num];
  /** A straight chord of the Klein disc. */
  readonly klein: Line;
  /** In the Poincaré disc: a circle orthogonal to the unit circle, or a diameter. */
  readonly disc: Circle | Line;
  /** In the half-plane: a half-circle centred on the real axis, or a vertical line. */
  readonly halfPlane: Circle | Line;
  readonly ends: [HIdeal, HIdeal];
  readonly reflection: HIsometry;
  contains(p: HAny): boolean;
  side(p: HAny): -1 | 0 | 1;
  equals(o: HLine): boolean;
  distanceTo(p: HPointLike): Length;
  foot(p: HPointLike): HPoint;
  perpendicularThrough(p: HAny): HLine;
  relation(o: HLine): HRelation;
  meets(o: HLine): boolean;
  isPerpendicularTo(o: HLine): boolean;
  /** Infinitely many: the two limiting parallels, one ultraparallel, and the angle of parallelism. */
  parallelsThrough(p: HPointLike): { count: number; limiting: [HLine, HLine]; ultraparallel: HLine; distance: Length; angle: Angle };
  toString(): string;
}
export function hline(a: HAny, b: HAny): HLine;
export function hmidpoint(a: HPointLike, b: HPointLike): HPoint;
export function hbisector(a: HPointLike, b: HPointLike): HLine;
export class HCircle {
  constructor(center: HPointLike, coshRadius: NumLike);
  readonly center: HPoint;
  readonly radius: Length;
  readonly circumference: PiMultiple;
  readonly area: PiMultiple;
  /** The same circle as a Euclidean circle of the Poincaré disc. */
  readonly disc: Circle;
  contains(p: HPointLike): boolean;
  toString(): string;
}
export function hcircle(center: HPointLike, through: HPointLike | Length | { cosh: NumLike } | { exp: NumLike }): HCircle;
export function horocycle(at: HIdeal | NumLike, p: HPointLike): { ideal: HIdeal; through: HPoint; disc: Circle };
export class HTriangle {
  constructor(A: HAny, B: HAny, C: HAny);
  readonly A: HPoint | HIdeal;
  readonly B: HPoint | HIdeal;
  readonly C: HPoint | HIdeal;
  readonly vertices: Array<HPoint | HIdeal>;
  readonly idealVertices: number;
  /** null for a side that runs to an ideal vertex. */
  readonly sides: { a: Length | null; b: Length | null; c: Length | null };
  readonly angles: { A: Angle; B: Angle; C: Angle };
  readonly angleSum: Angle;
  /** π − (A + B + C). */
  readonly defect: Angle;
  /** The area: the defect. */
  readonly area: Angle;
  readonly lines: { a: HLine; b: HLine; c: HLine };
  checks(): TrigChecks;
  toString(): string;
}
export function htriangle(a: HAny, b: HAny, c: HAny): HTriangle;
export type HIsometryKind =
  | { kind: "identity" }
  | { kind: "rotation"; center: HPoint; angle: Angle }
  | { kind: "parabolic"; ideal: HIdeal }
  | { kind: "translation"; axis: HLine; length: Length }
  | { kind: "reflection"; line: HLine }
  | { kind: "glide reflection"; axis: HLine; length: Length };
/** An exact complex number as [re, im]. */
export type ExactComplex = [Num, Num];
export class HIsometry {
  constructor(matrix: NumLike[][]);
  readonly matrix: Num[][];
  readonly inverse: HIsometry;
  readonly preservesOrientation: boolean;
  apply(x: HPoint): HPoint;
  apply(x: HIdeal): HIdeal;
  apply(x: HLine): HLine;
  apply(x: HTriangle): HTriangle;
  apply(x: HCircle): HCircle;
  then(o: HIsometry): HIsometry;
  equals(o: HIsometry): boolean;
  classify(): HIsometryKind;
  /** The map of the Poincaré disc z → (a·z + b)/(c·z + d), applied to the conjugate of z when `conjugate` is true. */
  toMobius(): { a: ExactComplex; b: ExactComplex; c: ExactComplex; d: ExactComplex; conjugate: boolean };
  toString(): string;
}
export function hreflection(l: HLine): HIsometry;
export function hrotation(center: HPointLike, turns: AngleLike): HIsometry;
export function hhalfTurn(center: HPointLike): HIsometry;
export function htranslation(a: HPointLike, b: HPointLike): HIsometry;
export interface SchlafliBase { p: number; q: number; symbol: string; interiorAngle: Angle }
export type Schlafli =
  | (SchlafliBase & { geometry: "euclidean" })
  | (SchlafliBase & { geometry: "spherical"; solid: string; faces: number; vertices: number; edges: number; tileArea: Angle; edge: Angle; circumradius: Angle; inradius: Angle })
  | (SchlafliBase & { geometry: "hyperbolic"; tileArea: Angle; edge: Length; circumradius: Length; inradius: Length });
/** The regular tiling {p, q}: which geometry it lives in, and the forced size of its tile. */
export function schlafli(p: number, q: number): Schlafli;
export interface HyperbolicTiling extends SchlafliBase {
  geometry: "hyperbolic";
  tileArea: Angle;
  edge: Length;
  circumradius: Length;
  inradius: Length;
  /** The central tile's circumradius in the Poincaré disc. */
  discRadius: Num;
  /** The central tile's vertices, exact. */
  readonly tile: HPoint[];
  check(): { angle: boolean; edge: boolean };
  /** The tiles within `layers` steps of the central one, in floats (disc coordinates). */
  patch(layers?: number, options?: { maxTiles?: number }): { kind: "float"; complete: boolean; counts: number[]; tiles: Array<{ layer: number; points: [number, number][] }> };
}
export function hyperbolicTiling(p: number, q: number): HyperbolicTiling;
/** Playfair's postulate tested in each geometry. */
export function parallelPostulate(options?: { q?: number }): Array<{ geometry: string; parallels: "exactly one" | "none" | "infinitely many"; count: number; example: Record<string, unknown>; checked: boolean }>;
export function hyperbolicFigure(items: unknown[], options?: { model?: "disc" | "klein" | "halfPlane"; title?: string; x?: [number, number]; y?: [number, number] }): Figure;
export function hyperbolicTilingFigure(p: number, q: number, options?: { layers?: number; model?: "disc" | "klein"; title?: string }): Figure;

// ---- general proofs ---------------------------------------------------------------

import type { MPoly, PolyRing } from "@ratmath/structures";

/** A polynomial expression in the coordinates of a configuration. */
export class GeoExpr {
  /** The polynomial, in a ring that has all the variables. */
  in(R: PolyRing): MPoly;
  add(o: GeoExpr | Scalar): GeoExpr;
  sub(o: GeoExpr | Scalar): GeoExpr;
  mul(o: GeoExpr | Scalar): GeoExpr;
  neg(): GeoExpr;
  pow(n: number): GeoExpr;
  /** What the polynomial says, when it came from a predicate. */
  label?: string;
}

/** A number, or a fraction written as text ("3/2"). */
export type Scalar = number | bigint | string | Rational;
/** A coordinate: a number, the name of a parameter, or an expression. */
export type Coordinate = Scalar | GeoExpr;

export class GeoPoint {
  readonly name: string;
  readonly x: GeoExpr;
  readonly y: GeoExpr;
  readonly kind: "fixed" | "free" | "on" | "dependent";
  toString(): string;
}

export type GeoLine = [GeoPoint, GeoPoint];

export interface ProveOptions {
  /** "wu", "groebner", or "auto" (Wu's method first; the default). */
  method?: "auto" | "wu" | "groebner";
  label?: string;
  /** Try one figure when no proof is found (default true). */
  instance?: boolean;
  maxPairs?: number;
  /** Milliseconds allowed to the Gröbner method (default 20000). */
  timeLimit?: number;
}

export interface ProofInstance {
  /** The parameter values tried, or null when no usable figure was found. */
  parameters: Record<string, number> | null;
  /** Solutions of the hypotheses for those parameters, with multiplicity, over the complex numbers. */
  solutions: number;
  /** At how many of them the conclusion holds. */
  holdsAt: number;
}

export interface ProofIdentity {
  ring: PolyRing;
  /** multiplier · conclusion^power = Σ cofactors[i] · hypotheses[i] */
  multiplier: MPoly;
  power: number;
  cofactors: MPoly[];
  hypotheses: MPoly[];
  conclusion: MPoly;
}

export interface ProofCondition {
  polynomial: MPoly;
  /** "… ≠ 0" */
  text: string;
  /** A geometric reading ("A, B, C are not collinear"), when it is one of the standard ones. */
  meaning: string | null;
}

export class Proof {
  readonly configuration: Configuration;
  readonly theorem: string;
  statement: string;
  readonly proved: boolean;
  /** The method that found the identity, or null. */
  readonly method: "wu" | "groebner" | string | null;
  readonly identity: ProofIdentity | null;
  /** One proof for each conclusion, when a list was given. */
  readonly parts?: Proof[];
  /** One figure tried, when no proof was found. */
  instance: ProofInstance | null;
  /** Why the Gröbner method stopped, when it ran out of time or pairs. */
  readonly gaveUp: string | null;
  readonly ms: number;
  /** Multiply the certificate out again and compare both sides. */
  replay(): boolean;
  /** The degenerate cases: the proof covers every figure at which none of these polynomials vanishes. */
  readonly conditions: ProofCondition[];
  readonly size: { multiplierTerms: number; cofactorTerms: number; power: number } | Array<{ multiplierTerms: number; cofactorTerms: number; power: number }> | null;
  explain(options?: { cofactors?: boolean; limit?: number }): string;
  toString(): string;
}

export class Configuration {
  constructor(name?: string);
  readonly name: string;
  readonly points: Map<string, GeoPoint>;
  /** The free coordinates. */
  readonly parameters: string[];
  /** The coordinates tied down by hypotheses. */
  readonly unknowns: string[];
  readonly hypotheses: Array<{ label: string; expr: GeoExpr; step: number }>;

  parameter(name: string): GeoExpr;
  unknown(name: string, condition: (v: GeoExpr) => GeoExpr): GeoExpr;
  free(name: string): GeoPoint;
  at(name: string, x?: Coordinate, y?: Coordinate): GeoPoint;
  on(name: string, condition: (P: GeoPoint) => GeoExpr, options?: { free?: "x" | "y" }): GeoPoint;
  where(name: string, conditions: (P: GeoPoint) => GeoExpr | Array<GeoExpr | GeoExpr[]>, what?: string): GeoPoint;

  midpoint(name: string, A: GeoPoint, B: GeoPoint): GeoPoint;
  intersection(name: string, l1: GeoLine, l2: GeoLine): GeoPoint;
  foot(name: string, P: GeoPoint, l: GeoLine): GeoPoint;
  reflection(name: string, P: GeoPoint, l: GeoLine): GeoPoint;
  circumcenter(name: string, A: GeoPoint, B: GeoPoint, C: GeoPoint): GeoPoint;
  orthocenter(name: string, A: GeoPoint, B: GeoPoint, C: GeoPoint): GeoPoint;
  centroid(name: string, A: GeoPoint, B: GeoPoint, C: GeoPoint): GeoPoint;
  parallelogram(name: string, A: GeoPoint, B: GeoPoint, C: GeoPoint): GeoPoint;
  otherIntersection(name: string, A: GeoPoint, Q: GeoPoint, O: GeoPoint): GeoPoint;
  onLine(name: string, A: GeoPoint, B: GeoPoint, options?: { free?: "x" | "y" }): GeoPoint;
  onCircumcircle(name: string, A: GeoPoint, B: GeoPoint, C: GeoPoint, options?: { free?: "x" | "y" }): GeoPoint;
  tritangentCenter(name: string, A: GeoPoint, B: GeoPoint, C: GeoPoint): GeoPoint;

  distance2(A: GeoPoint, B: GeoPoint): GeoExpr;
  area2(A: GeoPoint, B: GeoPoint, C: GeoPoint): GeoExpr;
  dot(A: GeoPoint, B: GeoPoint, C: GeoPoint, D: GeoPoint): GeoExpr;
  cross(A: GeoPoint, B: GeoPoint, C: GeoPoint, D: GeoPoint): GeoExpr;
  number(c: Scalar): GeoExpr;

  collinear(A: GeoPoint, B: GeoPoint, C: GeoPoint): GeoExpr;
  parallel(A: GeoPoint, B: GeoPoint, C: GeoPoint, D: GeoPoint): GeoExpr;
  perpendicular(A: GeoPoint, B: GeoPoint, C: GeoPoint, D: GeoPoint): GeoExpr;
  equidistant(P: GeoPoint, A: GeoPoint, B: GeoPoint): GeoExpr;
  equalLength(A: GeoPoint, B: GeoPoint, C: GeoPoint, D: GeoPoint): GeoExpr;
  onCircle(P: GeoPoint, O: GeoPoint, A: GeoPoint): GeoExpr;
  isMidpoint(M: GeoPoint, A: GeoPoint, B: GeoPoint): [GeoExpr, GeoExpr];
  concyclic(A: GeoPoint, B: GeoPoint, C: GeoPoint, D: GeoPoint): GeoExpr;
  concurrent(l1: GeoLine, l2: GeoLine, l3: GeoLine): GeoExpr;
  rightAngle(A: GeoPoint, B: GeoPoint, C: GeoPoint): GeoExpr;
  equalAngle(A: GeoPoint, B: GeoPoint, C: GeoPoint, D: GeoPoint, E: GeoPoint, F: GeoPoint): GeoExpr;
  tangent(l: GeoLine, O: GeoPoint, P: GeoPoint): GeoExpr;
  equal(a: GeoExpr | Scalar, b: GeoExpr | Scalar, label?: string): GeoExpr;

  prove(conclusion: GeoExpr | Array<GeoExpr | GeoExpr[]>, options?: ProveOptions): Proof;
  instance(conclusion: GeoExpr, options?: { seed?: number; tries?: number }): ProofInstance;
  describe(): string;
}

export function configuration(name?: string): Configuration;

export type ProvableId =
  | "thales" | "pythagoras" | "isosceles" | "midline" | "medians" | "altitudes" | "bisectors" | "eulerLine"
  | "ninePointCircle" | "orthocentreReflection" | "tritangent" | "varignon" | "parallelogram" | "inscribedAngle"
  | "chords" | "simson" | "butterfly" | "pappus" | "desargues" | "gaussLine" | "napoleon";

export const provable: ReadonlyArray<{ readonly id: ProvableId; readonly name: string; readonly statement: string }>;

export const proofs: { readonly [K in ProvableId]: (options?: ProveOptions) => Proof } & {
  all(options?: ProveOptions): Array<{ id: ProvableId; name: string; statement: string; proof: Proof }>;
  setup(id: ProvableId): { configuration: Configuration; conclusion: GeoExpr | Array<GeoExpr | GeoExpr[]> };
};
