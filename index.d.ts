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
