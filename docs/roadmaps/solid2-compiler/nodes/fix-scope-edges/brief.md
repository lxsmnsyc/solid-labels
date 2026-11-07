---
id: fix-scope-edges
title: Fix scope analysis for class and function expression names and parameter defaults
status: active
priority: should
type: fix
story:
early: false
outline: false
milestone:
target:
ship: auto
size: S
spike: false
verify: pnpm -C packages/core exec vitest run test/scope-oracle.test.ts test/scope-edges.test.ts
exclusive: []
gate: false
added: 2026-11-07
owns:
  - packages/core/compiler/scope.ts
  - packages/core/test/scope-edges.test.ts
shared:
  - packages/core/test/scope-oracle.test.ts
  - .changeset/
reserves: []
provides: []
depends_on:
  - on: scope-oracle
    kind: hard
    why: turns the two `it.fails` cases in its test file into passing tests
---

# Fix scope analysis for class expression names and parameter defaults

## Goal

`scope-oracle` (PR #43) found two places where `analyze` (`packages/core/compiler/scope.ts`) disagrees with eslint-scope. Both change compile output. Fix both.

## Context

1. **Class expression name.** `ClassExpression` is handled with `ClassDeclaration` in `resolve` (~line 552), but only `ClassDeclaration` declares its id (~line 243). The inner name of a class expression is never declared, so uses inside the class body are unresolved and treated as globals. Effects found by the fresh review:
   - `const o = class $signal { m(){ return $signal; } };` throws `CompileError: $signal must initialize a variable declaration`.
   - `class $effect { m(){ return $effect(() => 1); } }` (as an expression) compiles the call to `_createEffect(...)`.
   - `const o = class Show { m(){ return <Show />; } };` imports `_Show` instead of using the class.
     Fix: give a named class expression its own scope holding its name, visible only inside the class.
2. **Parameter default resolved to a body `var`.** `function f(x = y) { var y = 1; } var y;` resolves the default's `y` to the body `var`. Parameter defaults must not see body declarations. Effects: `function f(x = $signal(1)) { var $signal = 1; }` leaves `$signal` uncompiled, and `function f(x = <Show when={a}>hi</Show>) { var Show = 1; }` does not import `Show`. Fix: when a function has non-simple parameters, declare body `var`s in a separate scope from the parameters (as the spec does).

3. **Function expression name vs a same-named parameter.** `FunctionExpression` declares its own name in the same scope as its parameters (`scope.ts` ~219-224), and the first declaration wins, so in `(function f(f) { return f; })` the inner `f` binds to the function name, not the parameter. Found by the cross-repo comparison; not in the eslint-scope oracle's hand corpus yet.

Model to follow: silmaril (`/Users/alexis/Documents/GitHub/silmaril/packages/silmaril/compiler/analysis/scope.ts`) gets all three right: a `params` scope separate from the body when parameters have expressions (~365-391), a `class` scope holding a class expression's name (~403-406), and a separate scope for a function expression's name (~356-360). Its `hasParameterExpressions` recurses into nested functions; do not copy that part.

## Acceptance

- [ ] The two `it.fails` cases in `test/scope-oracle.test.ts` become passing tests, and the oracle's `classes` and `default-param-shadow` exclusions are removed if the generator or hand corpus covers them.
- [ ] `test/scope-edges.test.ts`: the compile examples above, each checking the corrected output.
- [ ] `(function f(f) { return f; })` resolves the inner `f` to the parameter; add it to the oracle's hand corpus.
- [ ] Existing snapshots unchanged.
- [ ] Patch changeset.

## Sizing

S: two contained changes in one file, verified by an existing oracle.

## Notes for the worker

- `parent-chain-memory` rewrites `reference()` in the same file later; keep this change to scope creation and declaration.

- PR: #54. No snapshot changes; oracle unchanged. Behavior change: `function f(x=$signal(1)){var $signal=1}` now throws "$signal must initialize a variable declaration" instead of leaving `$signal` uncompiled. scope-oracle property: 0.55 s and 1.2 s under load (limit 120 s).
