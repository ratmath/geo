# Changelog

## 0.4.0

- Phase 6, general proofs. `configuration()` states a theorem in
  coordinates: points that are fixed, free, or tied to earlier ones by
  conditions, with predicates (`collinear`, `parallel`, `perpendicular`,
  `equidistant`, `concyclic`, `concurrent`, `equalAngle`, `tangent`, …) that
  give the polynomial of a property, and constructions (`midpoint`,
  `intersection`, `foot`, `reflection`, `circumcenter`, `orthocenter`,
  `centroid`, `otherIntersection`, …).
- `prove(conclusion)` finds an identity d·gᵏ = Σ cᵢhᵢ between the conclusion
  and the hypotheses, by Wu's method (pseudo-division down the construction)
  or by a Gröbner basis over the field of the parameters (Kapur's method),
  and multiplies it out before reporting `proved`. The `Proof` has the
  `identity`, `replay()`, `conditions` (the degenerate cases, with a
  geometric reading where one is recognised) and `explain()`. A statement
  that is not proved comes with one figure and the number of its solutions
  at which the conclusion holds.
- `proofs` and `provable`: 21 classical theorems proved for every figure,
  among them the Euler line, the nine-point circle, Simson's line, the
  butterfly theorem, Pappus, Desargues, the Newton–Gauss line and Napoleon's
  theorem.
- `@ratmath/structures` (0.3) is a new dependency, vendored like the others.
- Docs: a new topic page, General proofs.

## 0.3.0

- Phase 3, the sphere: `spoint`, `greatCircle`, `striangle`, `scircle`,
  `srotation`. Distances and angles keep exact cosines; a triangle's excess
  is its area, an exact multiple of π when it is one; the laws of spherical
  trigonometry are tested as exact equalities; isometries are classified.
- Phase 3, the hyperbolic plane: `hpoint`, `ideal`, `hline`, `hcircle`,
  `htriangle`, one exact object seen in the Poincaré disc, the Klein disc,
  the half-plane and the hyperboloid. Exact cosh of distances, the three
  relations of two lines, limiting parallels and the angle of parallelism,
  defect as area, isometries classified (rotation, parabolic, translation,
  reflection, glide) with their Möbius form, the regular tilings `{p, q}`
  with exact tiles (`schlafli`, `hyperbolicTiling`).
- `Angle` decides whether an angle is a rational multiple of π from the
  degree of its cosine; `Length` keeps a hyperbolic length as exact cosh and
  sinh. `parallelPostulate()` counts parallels in five geometries.
- `hyperbolicFigure` and `hyperbolicTilingFigure` draw in each model.
- Docs: four new topic pages and two new explore panels.
- `@ratmath/core` is now a peer dependency (`>=0.10.0 <0.12.0`): the package
  uses the program's own copy of Core instead of bringing its own, so Core 0.11
  works and there is never a second copy whose `Rational` is not the same class.

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
