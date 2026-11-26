# Changelog

## Unreleased

- Phase 7, pictures (roadmap step 14): `tilingPatch` grows a patch of the
  tiling with a vertex type and checks every inner vertex; it succeeds for
  exactly the 11 uniform types. `tilingFigure`, `solidPicture`,
  `wallpaperFigure`, `incidenceFigure`, `constructionFrames` and `geoFigure`
  draw with `@ratmath/graphics` (now a vendored dependency, with analytic),
  and `figureSVG` and the other drawing functions are re-exported.
  `toGraphics`, `fromGraphics` and `toSurd` join geo's plane kernel with
  graphics' exactly. Docs: Pictures of geometry. The docs code box can show
  pictures.

## 0.2.0

- Phase 4: the projective plane in homogeneous coordinates (`ppoint`,
  `pline`, `join`, `meetLines`, duality, `crossRatio`, `harmonicConjugate`,
  `projectivity`, `projectivityFrom`), conics (`conicThrough`, `Conic` with
  polar, pole, tangent and classification) and the theorems of Desargues,
  Pappus, Pascal and Brianchon checked on exact figures. Finite geometries:
  `projectivePlane(q)`, `affinePlane(q)`, `fano()` over algebraic's finite
  fields, and `incidence` for any incidence structure, with the axioms,
  design parameters, parallels, projective completion, and collineation
  groups by search and by matrices.
- Phase 5: convex polyhedra with exact coordinates (`solids`, `polyhedron`,
  `prism`): faces found in floats and proved exactly, Euler's formula,
  volume, surface area, dihedral angles, duals and symmetry groups as
  PermGroups with each generator checked exactly. Plane symmetry:
  `figureSymmetry` (rosette groups), `friezeGroup` (the seven frieze groups),
  `wallpaperGroup` and `wallpaper` (the seventeen wallpaper groups, by the
  standard flowchart). Tilings by regular polygons: `vertexTypes`,
  `uniformTiling`, `regularTilings`.
- Docs: five new topic pages and two new explore panels.

## 0.1.0

- The Euclidean plane (roadmap phase 1) with exact coordinates, rational or
  algebraic: `point`, `line`, `circle`, `meet`, `foot`, `reflect`, `tangents`,
  bisectors, `regularPolygon`, and exact tests (`collinear`, `concyclic`,
  `concurrent`, `parallel`, `perpendicular`). `construction` records a
  ruler-and-compass construction. `triangle` gives the centres, circles and
  lines of a triangle. Transformations (`translation`, `rotation`,
  `reflection`, `glide`, `dilation`, `affine`) compose, invert and classify
  themselves; `inversion` maps points, lines and circles. `theorems` checks
  fifteen classical theorems exactly on a given figure.
- Phase 2: `convexHull`, `segmentIntersection`, `polygon` (area, centroid,
  point location, triangulation, clipping), `inCircle`, `delaunay`, `voronoi`,
  `closestPair`, all with exact predicates; `pick`, `latticePointsOn`,
  `isVisible`, `visiblePoints`; `metric` for the taxicab and Chebyshev
  metrics with circles, bisectors and ellipses.
- Docs: overview, explore, reference and seven topic pages.
