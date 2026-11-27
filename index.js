// @ratmath/geo: geometry for RatMath.
//
// The Euclidean plane with exact coordinates (constructions, triangle
// centres, transformations, theorems checked on exact figures), exact
// computational and lattice geometry, and other metrics; the projective
// plane and finite geometries; polyhedra, symmetry groups, friezes,
// wallpaper groups and tilings; the sphere and the hyperbolic plane with
// exact trigonometry; and general proofs of theorems by algebra, with
// certificates. `plan` lists what is still to come (nothing).

export { plan } from "./src/plan.js";
export { GeoError, num, N } from "./src/num.js";
export {
  Point, point, dot, cross, Line, line, Circle, circle, distance, distance2, midpoint, orientation, collinear, parallel, perpendicular, concurrent, concyclic,
  parallelThrough, perpendicularThrough, perpendicularBisector, angleBisector, foot, reflect, meet, tangents, circumcircle, regularPolygon,
  Construction, construction, Triangle, triangle,
  Transform, identity, translation, rotation, reflection, glide, dilation, affine, inversion,
} from "./src/plane.js";
export { theorems } from "./src/theorems.js";
export { Vector, vector, tripleProduct, Line3, line3, Plane, plane } from "./src/space.js";
export { angleSum, interiorAngle, exteriorAngle, slopeIntercept, pointSlope, tangentLength, box, cylinder, cone, sphere, similar, conicCoefficients, circleFromEquation } from "./src/school.js";
export { Polygon, polygon, convexHull, segmentIntersection, onSegment, inCircle, delaunay, voronoi, closestPair, latticePointsOn, pick, isVisible, visiblePoints, metric } from "./src/discrete.js";
export {
  PPoint, PLine, ppoint, pline, lineAtInfinity, join, meetLines, collinearP, concurrentP, crossRatio, harmonicConjugate,
  Projectivity, projectivity, projectivityFrom, Conic, conicThrough, desargues, pappus, pascal, brianchon,
} from "./src/projective.js";
export { Incidence, incidence, FiniteProjectivePlane, FiniteAffinePlane, projectivePlane, affinePlane, fano } from "./src/finite.js";
export { Polyhedron, polyhedron, solids, prism } from "./src/solids.js";
export { figureSymmetry, wallpaperGroup, wallpaper, friezeGroup, friezes } from "./src/symmetry.js";
export { polygonAngle, vertexTypes, uniformTiling, regularTilings, tilingPatch } from "./src/tilings.js";
export { Angle, angle, Length, piTimes, turnsOfCos } from "./src/angle.js";
export { SPoint, spoint, latLon, fromStereographic, northPole, GreatCircle, greatCircle, equator, SCircle, scircle, STriangle, striangle, lune, SIsometry, srotation, antipodalMap } from "./src/sphere.js";
export {
  HPoint, hpoint, fromKlein, fromHalfPlane, fromHyperboloid, horigin, HIdeal, ideal, HLine, hline, hmidpoint, hbisector, HCircle, hcircle, horocycle,
  HTriangle, htriangle, HIsometry, hreflection, hrotation, hhalfTurn, htranslation, schlafli, hyperbolicTiling,
} from "./src/hyperbolic.js";
export { parallelPostulate } from "./src/postulate.js";
export { configuration, Configuration, GeoPoint, GeoExpr, Proof } from "./src/prove.js";
export { proofs, provable } from "./src/proofs.js";
export { toSurd, toGraphics, fromGraphics, geoFigure, constructionFrames, tilingFigure, solidPicture, wallpaperFigure, incidenceFigure, hyperbolicFigure, hyperbolicTilingFigure } from "./src/pictures.js";
// Drawing a figure, from @ratmath/graphics (re-exported so geo's pictures need no second import).
export { figureSVG, figurePNG, figurePDF, figureTikZ, figureASCII, framesSVG, framesPNG } from "@ratmath/graphics";
