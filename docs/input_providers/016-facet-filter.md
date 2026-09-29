# FacetFilter Input Provider

Dropdowns that choose from one shared list of records, each narrowed by what the others hold. Pick a genre
and the author list shows only authors with books in it; pick a book and its genre and author fill in. In a
tabular group every row is independent: a row's lists narrow by that row's choices only.

Two pieces work together:

- a `Facet` rule in the input's `ListFilterRules` narrows what the dropdown offers
  (`ListDistilling.filterList`, applied whenever the list is built for a row), and
- the `Pict-Input-FacetFilter` provider keeps the row consistent when one of them changes.

## Provider Information

| Property | Value |
|----------|-------|
| Provider Hash | `Pict-Input-FacetFilter` |
| Input Type | Any select-style input (`Option`), alongside its own provider |
| Supports Tabular | Yes (row-scoped) |

## Basic Usage

The shared list is any array of records in application state -- typically loaded once by the form's
`InitialBundle` and flattened with a `ProjectDataset` step. Each dropdown names the record field it holds:

```json
{
  "PickLists":
  [
    { "Hash": "Genres",  "ListAddress": "Genres",  "ListSourceAddress": "AppData.Catalog", "ListSourceAddressGlobal": true, "IDTemplate": "{~D:Record.Genre~}",  "TextTemplate": "{~D:Record.Genre~}",  "Unique": true, "Sorted": true, "SkipEmpty": true },
    { "Hash": "Authors", "ListAddress": "Authors", "ListSourceAddress": "AppData.Catalog", "ListSourceAddressGlobal": true, "IDTemplate": "{~D:Record.Author~}", "TextTemplate": "{~D:Record.Author~}", "Unique": true, "Sorted": true, "SkipEmpty": true },
    { "Hash": "Books",   "ListAddress": "Books",   "ListSourceAddress": "AppData.Catalog", "ListSourceAddressGlobal": true, "IDTemplate": "{~D:Record.IDBook~}", "TextTemplate": "{~D:Record.Title~}" }
  ]
}
```

```json
"Genre":
{
  "Name": "Genre", "Hash": "ShelfGenre", "DataAddress": "Genre", "DataType": "String",
  "PictForm":
  {
    "InputType": "Option",
    "SelectOptionsPickList": "Genres",
    "ListFilterRules": [ { "FilterType": "Facet", "JoinListAddress": "AppData.Catalog", "JoinListAddressGlobal": true, "JoinListValueAddress": "Genre" } ],
    "Providers": [ "Pict-Input-FacetFilter" ]
  }
}
```

Give `Author` and `Book` the same rule with `JoinListValueAddress` `Author` and `IDBook`. Inputs that share a
`JoinListAddress` find each other -- there is no per-pair wiring.

## The Facet rule

| Key | Default | Meaning |
|-----|---------|---------|
| `JoinListAddress` | -- | Where the shared records are. |
| `JoinListAddressGlobal` | `false` | Resolve `JoinListAddress` against application state (`AppData.`, `Pict.`, `Bundle.`) rather than the form data. |
| `JoinListValueAddress` | -- | The record field this input holds; an option is offered when a record agreeing with the other choices has it. |
| `NarrowBy` | `All` | `All`: narrowed by every other choice. `Preceding`: narrowed only by the inputs before it (column order in a table), so any upstream value can always be picked and the downstream ones adjust. |
| `Facets` | `[]` | Extra constraints that are not dropdowns in the set: `{ JoinListValueAddress, Value \| ValueAddress, Operator }`. `ValueAddress` reads the form data. `Operator` is `EQ` (default), `NE`, `LT`, `LE`, `GT` or `GE`; numbers compare as numbers, and a bare `YYYY-MM-DD` compares against the date part of an ISO timestamp. An empty value does not constrain. |
| `KeepCurrentValue` | `true` | Always offer the value the input already holds, so a filter never hides a stored choice (for example one that has since fallen out of a date range). |
| `ClearInvalid` | `true` | FacetFilter: clear this input when a sibling's change contradicts it. |
| `AutoFillSingle` | `true` | FacetFilter: fill this input when exactly one value is left for it. |
| `CarryFields` | -- | FacetFilter: `{ "<row address>": "<record address>" }`. When this input holds a value and the choices identify exactly one record, copy those fields into the row (or the form, outside a table); clear them otherwise. |

Narrowing is joint: one record has to agree with every constraint at once, not a different record per
constraint.

## What FacetFilter does on a change

When the user changes a facet input, before the form solves:

1. Walking the other inputs in column order, each one no longer consistent with the change (and the ones
   already kept) is cleared, unless its rule says `ClearInvalid: false`.
2. Each empty input left with exactly one possible value takes it, repeated until nothing changes. The input
   the user changed is never filled, so clearing it sticks.
3. `CarryFields` are copied from the record the row now identifies, or cleared.

Because this runs before the solve, section and record set solvers see the finished row in the same pass.

It never runs on load or on marshal, so opening a saved document rewrites nothing -- including carried
fields, which keep the values they had when the choice was made even if the shared records change later.

## PickList keys used here

| Key | Meaning |
|-----|---------|
| `ListSourceAddressGlobal` | Read `ListSourceAddress` from application state rather than the form data, so a list can be built from data the form does not save. |
| `SkipEmpty` | Skip records whose `IDTemplate` / `TextTemplate` render empty without logging each one -- for distinct-value lists over a field some records lack. |

## Injection

Injected (salted) copies of a manifest keep a Facet rule as written: the join list is shared application
state and `JoinListValueAddress` names a field of its records, so neither is translated, and sibling inputs
are found by position (same row, same view) so copies never mix. A `Facets[].ValueAddress` that points at
form data is not translated either; use a literal `Value` or an application-state address in a manifest
that will be injected.

## Related

- [Select](001-select.md) -- the dropdown the rule narrows; tabular lists with a Facet rule are refreshed on
  every marshal and only rebuilt when their options change.
- [AutofillTriggerGroup](011-autofill-trigger-group.md) -- trigger-driven autofill for values outside a
  facet set.
