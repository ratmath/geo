# @ratmath/geo

Geometries, continuous and discrete for [RatMath](https://ratmath.com/), part of the
[RatMath Shelf](https://ratmath.com/shelf/).

**Status: set up, nothing built yet.** This repository holds the package
skeleton and the docs site. The plan is in the
[library roadmap](https://github.com/ratmath/ratmath/blob/main/docs/design/library-roadmap.md#11-a-geometry-package-ratmathgeo).

A library for exploring geometries, continuous and discrete: the Euclidean plane with constructions and checked theorems, the sphere and the hyperbolic plane, projective and finite geometries, lattices, symmetry groups and tilings.

## Planned

| Phase | Contents |
|---|---|
| 1 | Euclidean plane: constructions, centres, transformations, checked theorems |
| 2 | Exact computational and lattice geometry, other metrics |
| 3 | Spherical and hyperbolic models |
| 4 | Projective and finite geometries |
| 5 | Solids, symmetry groups, friezes, wallpaper groups, tilings |
| 6 | General proofs of theorems by elimination |
| 7 | Pictures |

It will depend on: Core, graphics (the plane kernel and drawing), algebraic and linalg; structures for symmetry groups and proofs, complex for the hyperbolic models, analytic for enclosures.

## Layout

- `index.js`, `src/`: the library. For now it exports only `plan`, the list
  above, so that the tests and the docs build have something to load.
- `tests/`: `bun run test`.
- `docs/src/*.html`: the docs pages (overview, explore, reference, then one
  page per topic as topics are built). `bun run docs:build` writes `docs/`,
  typesets the mathematics and runs the code box at the end of every page.
  `docs/*.html` and `docs/assets/geo.js` are build output.
- `docs/assets/runbox.js` and `scripts/docs-kit.js` are shared with the other
  RatMath docs sites and should be kept in step with them.

## Development

```sh
bun install
bun run test
bun run docs:build
```

Each topic that is built gets its own docs page with usage, the mathematics
explained, and a runnable code box at the end, and is then listed on the
[Shelf page](https://ratmath.com/shelf/).

MIT licensed.
