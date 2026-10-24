# Repository instructions

## Mandatory skill maintenance

For **every code modification**, update the affected repository skills under
`skills/` in the **same change**, including relevant references and examples.
Read `skills/lambda-router/SKILL.md` before modifying router code. Even when
semantics are unchanged, review and update the relevant skill guidance or
examples to reflect the modification; do not silently skip skill maintenance.

Keep implementation, source doc comments, README, and skill examples in sync.
Document public API inputs, results, failure behavior, and useful caller-side
examples. Verify examples against current exports and signatures. Distinguish
mandatory guards from optional prefetch and render-time middleware. UI guards
never replace authentication and authorization on server requests.

## Validation

Run `npm run format:check`, `npm run lint`, `npm test`, and `npm run build`.
Typecheck production sources and changed executable examples with a config that
actually includes them. Root `tsc --noEmit` checks zero files; it is not evidence
of type safety. Report existing project-reference/setup errors separately from
errors in changed sources. Confirm docs-only TypeScript changes preserve the
parsed program (excluding comments). Before committing, inspect the full diff
and run the git-workflow sensitive-file checker for every staged file.
