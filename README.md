# @ratmath/geo

Geometries, continuous and discrete, for [RatMath](https://ratmath.com/), part of the
[RatMath Shelf](https://ratmath.com/shelf/). Docs: [ratmath.com/geo](https://ratmath.com/geo/).

Coordinates are exact: rationals where they can be, algebraic numbers (square
roots and beyond) where they must be. So "are these three points on a line?"
and "do these two circles touch?" get true answers, and a classical theorem
can be checked on a figure without a tolerance.

```js
import { triangle, theorems, construction, rotation, convexHull, delaunay, pick, metric, N } from "@ratmath/geo";

const t = triangle([0, 0], [4, 0], [1, 3]);
String(t.circumcenter);                 // "(2, 1)"
String(t.incenter);                     // exact, though its coordinates need square roots
String(t.eulerLine);                    // "y - 1 = 0"
theorems.feuerbach(t).holds;            // true: the nine-point circle touches the incircle and excircles, exactly
rotation([0, 0], "1/6").apply([1, 0]);  // (1/2, √3/2)
convexHull([[0, 0], [4, 0], [2, 1], [2, 5]]).join(" ");
pick([[0, 0], [5, 0], [0, 5]]);         // { area, interior, boundary, holds }
N.text(metric("taxicab").pi);           // "4"
```

## What is built

| Area | Functions |
|---|---|
| Points, lines, circles | `point`, `line`, `circle`, `distance`, `midpoint`, `meet`, `foot`, `reflect`, `tangents`, `angleBisector`, `perpendicularBisector`, `circumcircle`, `regularPolygon`, and the tests `collinear`, `concyclic`, `concurrent`, `parallel`, `perpendicular` |
| Constructions | `construction(given)` records a ruler-and-compass construction step by step and counts the tools used |
| Triangles | `triangle(a, b, c)`: centroid, circumcentre, orthocentre, incentre, excentres, nine-point centre, symmedian point, the circles, medians, altitudes, bisectors, Euler line, `classify()` |
| Transformations | `translation`, `rotation`, `reflection`, `glide`, `dilation`, `affine`, with `compose`, `inverse`, `fixed()` and `classify()`; `inversion` in a circle |
| Checked theorems | `theorems.pythagoras`, `eulerLine`, `ninePointCircle`, `feuerbach`, `ceva`, `menelaus`, `ptolemy`, `napoleon`, `simson`, `thales`, `powerOfPoint`, `varignon`, `concurrency`, `pentagon`, `heron` |
| Computational geometry | `convexHull`, `segmentIntersection`, `polygon` (area, centroid, `locate`, `triangulate`, `clip`), `inCircle`, `delaunay`, `voronoi`, `closestPair`, all with exact predicates |
| Lattice geometry | `pick`, `latticePointsOn`, `isVisible`, `visiblePoints` |
| Other metrics | `metric("taxicab" \| "chebyshev" \| "euclidean")`: `distance`, `circle`, `pi`, `bisector`, `ellipse` |

A checked theorem is a test of one figure, exactly; it is not a proof of the
theorem. General proofs by elimination are phase 6.

## Still planned

| Phase | Contents |
|---|---|
| 3 | Spherical and hyperbolic models |
| 4 | Projective and finite geometries |
| 5 | Solids, symmetry groups, friezes, wallpaper groups, tilings |
| 6 | General proofs of theorems by elimination |
| 7 | Pictures |

The plan is in the
[library roadmap](https://github.com/ratmath/ratmath/blob/main/docs/design/library-roadmap.md#11-a-geometry-package-ratmathgeo).

## Layout

- `index.js`, `src/`: the library. `src/num.js` (exact numbers), `src/plane.js`
  (the Euclidean plane), `src/theorems.js`, `src/discrete.js`, `src/plan.js`.
- `vendor/algebraic`: `@ratmath/algebraic` as a git submodule (clone with
  `--recurse-submodules`).
- `tests/`: `bun run test`.
- `docs/src/*.html`: the docs pages. `bun run docs:build` writes `docs/`,
  typesets the mathematics and runs the code box at the end of every page.
  `docs/*.html` and `docs/assets/geo.js` are build output.
- `docs/assets/runbox.js` and `scripts/docs-kit.js` are shared with the other
  RatMath docs sites and should be kept in step with them.

## Development

```sh
git submodule update --init
bun install
bun run test
bun run docs:build
```

MIT licensed.
