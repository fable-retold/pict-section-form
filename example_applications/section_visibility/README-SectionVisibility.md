# Section Visibility

A regression harness for solver-driven section and group visibility surviving a re-render.

## What it demonstrates

`setsectionvisibility` and `setgroupvisibility` apply a CSS class to `#SECTION-<formID>` and
`#GROUP-<formID>-<hash>`. Both of those elements are emitted **by the section template**, so a
`render()` repaints them carrying only their manifest `CSSClass` — and the hide is silently dropped.

Nothing used to put it back. Solvers run in the SOLVE phase; the renders that destroy the class
happen later in the MARSHAL, so a hidden section stayed wrongly visible until some later solve
happened to run. Adding another `SetSectionVisibility` call in a PostSolver does not help — that is
still solve-phase, still before the render.

The `Average Gradation` table here generates one column per `Products` row, labeled from that row's
name. Renaming a product is a **label-only** change: the column set is identical, so the Tabular
layout takes its `namesChanged` path — a `render()` with no template rebuild. That render is what
destroys the hide.

## Reproducing

```shell
npx quack examples
```

1. On load, `Average Gradation` is hidden (`Show Gradation` unchecked).
2. Rename a product in `Aggregate Products` and tab out.
3. Before the fix the section reappears with the box still unchecked. After it, the section stays
   hidden and its headers still relabel — tick the box to see the updated column names.

`Show Notes` toggles the **Gradation Notes** group inside that same section, which fails and passes the
same way — tick `Show Gradation` first so the section is visible, then rename a product. The group has to
live inside a section that actually re-renders; a group in an untouched section is never regenerated.

Reported against a Headlight combined form (`MI-BatchSheetCombined`), where picking a Source/Name on
the Aggregate Products table un-hid every CSB worksheet generated from it.
