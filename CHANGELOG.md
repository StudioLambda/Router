# Changelog

## [0.1.1] - 2026-04-12

### 🐛 Bug Fixes

- Resolve high-severity audit findings across matcher, router, CI, and build
- Regenerate lockfile to resolve missing transitive deps on CI
## [0.1.0] - 2026-03-29

### 🚀 Features

- Add trie-based route matcher with static, dynamic, and wildcard segments
- Add React 19 integration with Router, Link, hooks, contexts, and memory navigation
- Add declarative createRouter builder API with example app
- [**breaking**] Add PrefetchContext to PrefetchFunc signature
- Accept callback function in redirect() for dynamic targets

### 🐛 Bug Fixes

- Remove invalid char
- Add missing transitive deps to lockfile
- Format and fix tsc
- Resolve lint errors in test helpers, search params, and prefetch effect
- Remove NPM_TOKEN from release workflow, use OIDC provenance

### 🧪 Testing

- Add comprehensive test suite with 180 concurrent tests at 98.98% line coverage

### ⚙️ Miscellaneous Tasks

- Scaffold project with build, lint, and test config
- Add GitHub Actions CI workflow and recommended VS Code extensions
- Add README, git-cliff config, and automated release workflow
