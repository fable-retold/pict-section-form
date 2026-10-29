# Dynamic Analysis - Injecting Sections at Runtime

<!-- docuserve:example-launch:start -->
> **[Launch the live app](examples/dynamic%5Fanalysis/index.html)** - runs in your browser, opens in a new tab.
<!-- docuserve:example-launch:end -->


Every other example here defines a fixed form. Dynamic Analysis defines a form
that **grows while you use it**. It is a Fruit Nutrition Analysis Lab: a
49-fruit dataset, an overview dashboard, an explorer grid - and two analysis
modules you can inject, repeatedly, at runtime. Each injection is an
independent, self-scoped copy that calculates without colliding with any other.

The mechanism behind it is the interesting part. An injectable module is just a
reference manifest; when it is injected the framework runs
`createDistinctManifest`, which **rewrites the module's solver expressions and
data addresses** with a fresh UUID so each copy is its own world.

## What it demonstrates

| Capability | Where you see it |
|------------|------------------|
| Injectable modules | `CalorieAnalysis` and `MacroBreakdown` live in `ReferenceManifests` |
| Solver rewriting on injection | `createDistinctManifest` UUID-scopes each copy's solvers |
| Address-rewritten function args | Section-hash arguments are rewritten alongside data addresses |
| Per-row record solvers | The explorer grid computes derived nutrition columns |
| Aggregate solvers | Dataset totals are summed from array-element hashes |
| AppData cross-references | `getvalue` / `setvalue` read and write across the data tree |
| Conditional visibility | A detail section shows itself based on a solved value |
| Solver-driven charts | `bar` and `polarArea` charts are computed by solver expressions |
| Chart value labels | A `line` chart draws each point's value, moving or hiding labels that would overlap |

## Key files

- `Dynamic-Analysis-Application.js` - the application: a thin class and the entire inline manifest
- `FruitData.json` - the 49-fruit seed dataset (`DefaultAppData`)
- `html/index.html` - HTML shell + theme CSS

The application class itself is almost empty - the injection machinery lives in
the `pict-section-form` library. This example's job is to supply a manifest
shaped for that machinery to consume.

## The data model

`FruitData.json` seeds `FruitData.FruityVice` - 49 fruit records, each with
flat fields (`name`, `family`, `genus`, ...) and a nested `nutritions` object
(`calories`, `fat`, `sugar`, `carbohydrates`, `protein`). Solvers populate
further runtime addresses: `DatasetSummary.*`, `OverviewChart.*`, and - per
injected module - independent `Analysis.*` / `Macro.*` objects.

---

## Feature 1 - Injectable modules are reference manifests

The manifest's `ReferenceManifests` map holds more than the grid's row editor.
It also holds two whole **modules** - each one a manifest fragment with its own
`Scope`, `Sections`, and `Descriptors`:

```js
"ReferenceManifests": {
    "FruitEditor":     { "Scope": "FruitEditor", "Descriptors": { /* ... */ } },
    "CalorieAnalysis": { "Scope": "CalorieAnalysis", "Sections": [ /* ... */ ], "Descriptors": { /* ... */ } },
    "MacroBreakdown":  { "Scope": "MacroBreakdown",  "Sections": [ /* ... */ ], "Descriptors": { /* ... */ } }
}
```

A module sits dormant in `ReferenceManifests` until something injects it.

---

## Feature 2 - Solver rewriting on injection

When a module is injected, the framework calls `createDistinctManifest`. It
clones the module and **rewrites every solver expression and data address** to
carry a fresh UUID, so a second injection of the same module cannot read or
overwrite the first one's values:

```text
getvalue("AppData.Analysis.TotalCalories")
   ->  getvalue("AppData.<UUID>.Analysis.TotalCalories")
```

The module's solvers are authored against the *un-scoped* address; the rewrite
happens automatically at injection time. That is why the same module can be
injected any number of times.

---

## Feature 3 - Address-rewritten function arguments

Rewriting is not limited to data addresses - solver *function arguments* are
rewritten too. Functions like `hidesections` and `setsectionvisibility` declare
which of their arguments are section hashes, so the hash `"CalorieDetail"` is
rewritten to `"CalorieDetail_<UUID>"` for each injected copy:

```js
{ "Ordinal": 50, "Expression": "hidesections(\"CalorieDetail\")" },
{ "Ordinal": 51, "Expression": "setsectionvisibility(\"CalorieDetail\", IF(AverageCalories, \">\", 50, 1, 0))" }
```

Each injected module hides and reveals *its own* detail section, never another
copy's.

---

## Feature 4 - Per-row record solvers

The explorer grid is a `Tabular` group. Its `RecordSetSolvers` run once per
fruit, computing derived nutrition columns in place:

```js
"RecordSetSolvers": [
    { "Ordinal": 0, "Expression": "CaloriesFromFat = Fat * 9" },
    { "Ordinal": 1, "Expression": "CalorieDensity = Calories / (Fat + Carbohydrates + Protein + 0.001) * 100" },
    { "Ordinal": 2, "Expression": "SugarRatio = Sugar / (Carbohydrates + 0.001) * 100" }
]
```

The `+ 0.001` terms are a small guard against divide-by-zero on records with a
zero macro.

---

## Feature 5 - Aggregate solvers over array-element hashes

A descriptor whose address ends in `[].field` extracts that field from every
record into a named array. Section `Solvers` then aggregate it:

```js
"FruitData.FruityVice[].nutritions.calories": { "Hash": "FruitCalories" }
```

```js
"Solvers": [
    "TotalDatasetCalories = SUM(FruitCalories)",
    "AverageDatasetCalories = MEAN(FruitCalories)",
    "DatasetFruitCount = COUNT(FruitCalories)"
]
```

---

## Feature 6 - Reading and writing across AppData

Solvers are not limited to their own descriptors. `getvalue` and `setvalue`
reach anywhere in the data tree by address - here a module reads a global total
and writes a normalized result back:

```js
GlobalTotalCalories = getvalue("AppData.Analysis.TotalCalories")
setvalue("AppData.Analysis.NormalizedEnergy", EnergyDensityFromGlobal / 100)
```

(After injection, both addresses are UUID-scoped by the rewrite from Feature 2.)

---

## Feature 7 - Solver-driven charts

A chart is a descriptor with `InputType: "Chart"`. `ChartType` picks the
Chart.js type, and the labels and every dataset are **solver expressions**:

```js
"InputType": "Chart",
"ChartType": "bar",
"ChartLabelsSolver": "objectkeystoarray(aggregationhistogrambyobject(FruitGrid, \"name\", \"nutritions.calories\"))",
"ChartDatasetsSolvers": [
    { "Label": "Calories per Fruit", "DataSolver": "objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, \"name\", \"nutritions.calories\"))" }
]
```

`ChartDatasetsSolvers` is an array, so a single chart can plot several series -
the macro-breakdown chart computes one dataset each for fat, carbohydrates,
protein, and sugar. The lab also uses a `polarArea` chart with the same
solver-driven shape.

The Sugar vs Carbohydrates chart in the overview shows values on the points
without hovering. `ChartValueLabels` turns that on, and `ValueLabels: false`
leaves one series unlabelled:

```json
"ChartValueLabels": { "Decimals": 1, "Color": "Dataset" },
"ChartDatasetsSolvers": [
  { "Label": "Carbohydrates (g)", "DataSolver": "..." },
  { "Label": "Sugar (g)", "DataSolver": "..." },
  { "Label": "Protein (g, unlabelled)", "DataSolver": "...", "ValueLabels": false }
]
```

Where two labels would collide, the later series' label moves to the other side
of its point, and is hidden if that side is taken too. See
[Point Value Labels](../../input_providers/009-chart.md#point-value-labels).

## Running the example

```bash
cd example_applications/dynamic_analysis
npm run build
# serve ./dist and open index.html - inject a module to watch it self-scope
```

## Takeaways

1. **A form can grow at runtime.** Modules sit dormant in `ReferenceManifests`
   and become live sections only when injected.
2. **Injection rewrites, it does not share.** `createDistinctManifest`
   UUID-scopes every solver expression and data address, so each injected copy
   computes in isolation.
3. **Arguments are rewritten too.** Section-hash arguments to functions like
   `setsectionvisibility` are rewritten alongside data addresses, so a module
   only ever controls its own sections.
4. **Solvers do real analysis.** Per-row record solvers, dataset aggregates,
   and `getvalue` / `setvalue` cross-references turn the manifest into a
   calculation engine.
5. **Charts are just more solvers.** `ChartLabelsSolver` and
   `ChartDatasetsSolvers` make a `bar` or `polarArea` chart a live view of
   solved data.

## Related documentation

- [Solvers](../../Solvers.md) - solver expressions, ordinals, and `getvalue` / `setvalue`
- [Layouts](../../Layouts.md) - the `Tabular` layout and `RecordSetSolvers`
- [Configuration](../../Configuration.md) - reference manifests and descriptors
