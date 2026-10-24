# Development toolchain maintenance

## Upgrade workflow

1. Use the Node version from `.nvmrc` for installation and validation. The
   development toolchain uses Node 26 and matching Node typings: Vitest 5
   supports Node 26 but not Node 25. Development engines and published runtime
   engines are separate contracts; a tooling upgrade does not raise consumer
   engines.
2. Resolve stable releases and inspect their engine and peer requirements.
   Upgrade Vitest and its coverage provider together. Keep React and React DOM
   development versions paired. Preserve optional consumer peer ranges unless
   the runtime API actually changes.
3. Refresh compatible transitive dependencies and inspect `npm audit`. Confirm
   a clean `npm ci` succeeds and `npm ls` has no invalid dependencies. Avoid
   force-installing a graph that merely happens to run locally.
4. Run formatting, lint, tests, coverage, and the production build. Review new
   lint rules without weakening the global configuration or changing runtime
   behavior just to silence a diagnostic. Prefetch tests use an object ref
   and query their mounted DOM target rather than assigning an outer variable
   in a ref callback.
5. Typecheck production files with a config that includes them. Root
   `tsc --noEmit` checks no files. Compare any full-project diagnostics with
   the base commit, and report baseline errors separately.
6. Inspect declarations and pack the library. Exercise both package entry
   points through ESM and CommonJS, plus SSR with a supported React version.
   Confirm generated declarations and source maps are present, and React
   remains external. Update this skill when tooling requirements change.

## TypeScript compatibility

The declaration generator depends on the JavaScript Compiler API. Keep
TypeScript 6.0.3 until a TypeScript 7 upgrade has a valid peer graph as well as
passing declaration generation. In the tested TypeScript 7 configuration,
`unplugin-dts` requested the `@typescript/typescript6` fallback, but its Volar
dependencies still required `typescript <7`. Adding that fallback alone did
not make `npm ls` valid. Do not suppress those conflicts with force flags.

## Validation commands

Run these with the `.nvmrc` runtime active:

```sh
npm ci
npm ls
npm audit
npm run format:check
npm run lint
npm test
npm run test:cover
npm run build
npm pack --dry-run --ignore-scripts
```

These commands complement, rather than replace, a production-source typecheck
and packed-package consumer checks. Report warnings and declaration diagnostics
even when a command exits successfully.
