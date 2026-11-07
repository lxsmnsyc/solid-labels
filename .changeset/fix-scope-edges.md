---
'solid-labels': patch
---

Fix scope analysis: a class expression's own name is local inside the class, a parameter default no longer sees a body `var`, and a function expression's name no longer shadows a same-named parameter.
