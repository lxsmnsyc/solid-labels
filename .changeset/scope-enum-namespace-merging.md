---
'solid-labels': patch
---

- Enum members with a string-literal name that is a valid identifier (`"a" = 1`) can be referenced by that name.
- Members of an earlier `enum E {}` block, and exported members of another `namespace N {}` block, resolve in later blocks of the same declaration. A `$signal` exported from one namespace block is read as `s()` in another.
