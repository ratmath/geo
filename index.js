// @ratmath/geo: geometry for RatMath.
//
// The Euclidean plane with exact coordinates (constructions, triangle
// centres, transformations, theorems checked on exact figures), exact
// computational and lattice geometry, and other metrics. `plan` lists what
// is coming.

export { plan } from "./src/plan.js";
export { GeoError, num, N } from "./src/num.js";
export {
  Point, point, Line, line, Circle, circle, distance, distance2, midpoint, orientation, collinear, parallel, perpendicular, concurrent, concyclic,
  parallelThrough, perpendicularThrough, perpendicularBisector, angleBisector, foot, reflect, meet, tangents, circumcircle, regularPolygon,
  Construction, construction, Triangle, triangle,
  Transform, identity, translation, rotation, reflection, glide, dilation, affine, inversion,
} from "./src/plane.js";
export { theorems } from "./src/theorems.js";
export { Polygon, polygon, convexHull, segmentIntersection, onSegment, inCircle, delaunay, voronoi, closestPair, latticePointsOn, pick, isVisible, visiblePoints, metric } from "./src/discrete.js";
