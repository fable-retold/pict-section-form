# Injection Conformance

A manifest can be injected into a running form more than once. `PictFormMetacontroller.createDistinctManifest()`
salts each copy -- section, group and input hashes get the salt appended, data addresses get nested under it --
so that every copy owns its own data. Every reference the manifest makes to itself has to be translated with
it, and every reference it makes to something outside itself has to be left alone.

The injection conformance fixture is how that stays true. It is one manifest that uses every construct the
injector has to translate, injected twice into a host form that deliberately holds same-named data at the
unsalted root, so a copy that reads or writes the wrong place is visible immediately.

## The two tiers

| | Data tier | Browser tier |
|---|---|---|
| File | `test/PictSectionForm-Injection-Conformance_tests.js` | `test/browser/` |
| Runs with | `npm test` (always) | `npm run test:injection` |
| Needs | nothing beyond the test dependencies | a chrome-family browser (`CHROME_BIN` overrides) |
| Asserts | fixture coverage, that a salted copy names nothing of its own by its unsalted name, and a data round trip through the view API: data in, solve, read back, write through the view, re-render | what needs a painted page: charts, tab switching, solver-driven visibility, templated rendering, trigger groups driven by real change events, and the unsalted root after all of it |

`browser-env` gives the data tier a DOM object model but does not paint: views render, macros and selectors
are built, but no input elements land in the document. That is why the always-on tier round trips through the
view data API (`setDataByInput`, `marshalToView`, `render`) and the browser tier owns everything that needs
real elements and real events.

The browser tier runs two scenarios. The edge case scenario injects the fixture twice with two salts that
share a prefix (`alpha`, `alphabeta`) and asserts what each copy should hold. The differential scenario needs
no expected values and works for any manifest: it loads the same manifest as a pair of copies, then each copy
alone, and compares -- a copy that reads or writes outside its own subtree computes differently next to a
sibling than it does alone.

## Adding a case

1. Add the input to `test/fixtures/injection/Injection-Fixture-Manifest.json`, in the `Inputs` or `Composed`
   section, configured the way the input type is meant to be used.
2. Add a case to `INPUT_CASES` in `test/fixtures/injection/Injection-Fixture-Cases.js`:

```js
{ Registry: 'InputType:TextArea', Hash: 'NoteText', Tier: 'data', Marshals: true, Accepts: true, Value: 'a crate note' },
```

   * `Registry` is `InputType:<name>` for a type the metatemplates dispatch on, or `Provider:<name>` for an
     input provider an input opts into through `PictForm.Providers`.
   * `Tier` is `data` when the round trip can be asserted without a browser, `browser` when it needs a painted
     page, and `expression` when the input cannot round trip at all in a test (it gathers from a server, or
     needs a third party editing surface) -- then only its salted configuration is asserted. A case that is
     not on the data tier carries a `Note` saying why.
   * `Marshals` is whether data reaches the control, `Accepts` whether a write through the control reaches the
     data, and `Value` is what the round trip writes.
3. If the input type genuinely needs no case, add it to `EXCLUDED_REGISTRY_ENTRIES` with the reason. An input
   type that is only reached through another one (`Select` through `InputType:Option`) belongs here.

Keep the fixture's vocabulary neutral: it is a crate of fruit, not anything from a product that uses the
library.

## What a coverage failure means

The coverage suite measures the fixture against the library's own registries rather than against a list
someone has to remember to update.

**"every input type and input provider in the library has a fixture case"** -- the metatemplates
(`source/providers/dynamictemplates/`) dispatch on an `InputType` that no case names, or a provider file
appeared in `source/providers/inputs/`. Add a case, or an explained exclusion.

**"every construct the injector translates appears in the fixture manifest"** -- `createDistinctManifest`
translates a `PictForm` property the fixture never uses. The list comes from `InjectionTranslation`, exported
by `source/views/Pict-View-Form-Metacontroller.js`, which is the same list the translation itself runs off; if
you taught the injector about a new property, the fixture has to exercise it.

**"every solver directive is used by the fixture manifest"** -- the fixture has no solver using a directive
the injector knows how to scope (`SERIES`, `MAP`, `MULTIROWMAP`, `MONTECARLO`). A directive that cannot be
asserted in a fixture (`MONTECARLO` samples at random) is declared in `EXCLUDED_SOLVER_DIRECTIVES` with the
reason and is asserted at the expression level instead.

**"every reference shape ... appears in the fixture manifest"** -- `REFERENCE_SHAPES` lists the ways a solver
can name something of its own: an exact symbol, a state address, `X.length`, `X[0]`, `X[].Column`, a nested
property, a marshal-destination-prefixed string, a hash passed as a string parameter, a string literal that
merely looks like a hash, and a reference to something outside the manifest. Each has to appear in a fixture
solver.

**"no section, group or input of an injected copy holds an untranslated reference"** -- this is the check that
catches a construct nobody thought about. It walks the salted copy, reads solver expressions with the
expression parser (so an iteration variable a directive declares, a string literal that is not an address
parameter, and the columns a record set solver reads are not mistaken for references) and scans every other
string for a name the manifest owns. When it fails, either translate the construct in `createDistinctManifest`,
or -- if the property is prose or presentation and cannot name anything -- add it to `LABEL_PROPERTIES` in the
cases file.

## Known open behavior

These are properties of injection itself rather than of the translation. They are declared in `KNOWN_OPEN` in
the cases file and both tiers print them rather than failing on them:

* **Undeclared solver targets.** A solver can assign to a name no descriptor declares, and the expression
  parser assigns an expression that has no assignment of its own to `Result`. Neither is nested into the copy,
  so copies share them.

## Trigger groups

A trigger group hash is salted with the rest of the copy, so a change in one copy runs only that copy's
trigger groups. Every carrier is salted together -- a group configuration (`AutofillTriggerGroup`,
`TemplatedEntityLookup`, `TabularTriggerGroup`) and a bare hash (`TriggerGroupHash`,
`EntityBundleTriggerGroup`) -- because both sides of a trigger read the hash from their own configuration, so
salting one side and not the other leaves the group silently dead.

A manifest that means to hear the form it is injected into lists those hashes in `SharedTriggerGroups` at its
root, and they are left unsalted:

```json
{ "Scope": "Crate", "SharedTriggerGroups": [ "HostCrateChange" ], "Sections": [] }
```

A host with input providers of its own carries its trigger group hashes in properties this library knows
nothing about. It adds them to the carrier lists on the metacontroller, before anything is injected:

```javascript
pict.views.PictFormMetacontroller.injectionTriggerGroupProperties.push('MyGroupConfiguration');
pict.views.PictFormMetacontroller.injectionTriggerGroupHashProperties.push('MyTriggerGroupHash');
```

Not declared in `KNOWN_OPEN`, because neither tier exercises it: the library has no way to remove an injected
copy. Injection appends the copy's sections, descriptors and (translated, de-duplicated) `ValidationSolvers`
to the form's manifest; a host that tears a copy down again has to take its validation solvers out of
`manifestDescription.ValidationSolvers` too, or they keep running against the removed copy's data.
