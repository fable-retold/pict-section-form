# Facet Filter

Order lines that pick **Genre -> Author -> Book** from one shared catalog. Each dropdown is narrowed by the
other choices in its own row, a pick fills in whatever is left with a single option, a change clears what it
contradicts, and the chosen book's price and format are carried into the row. The catalog comes from a small
REST server that ships with the example, so the whole path -- bundle load over HTTP, graph, lists, change
handling, solve -- runs for real.

What it exercises (see [the FacetFilter provider docs](../../docs/input_providers/016-facet-filter.md)):

| Behaviour | Where to see it |
|---|---|
| Form-level `InitialBundle`: active publishers, then their books (`FBL~IDPublisher~INN~...`), flattened by `ProjectDataset` from each book's nested `Details` | the server log on load -- two reads, nothing afterwards |
| `ListSourceAddressGlobal` picklists built from that graph; `SkipEmpty` leaves out the book with no genre | the Genre list |
| `Facet` rule, row-scoped and joint | pick in one row, open the same list in another |
| `NarrowBy: Preceding` vs `NarrowBy: All` | the two tables |
| `Facets` with `ValueAddress` and date `Operator`s | the Language and In print on fields |
| `Pict-Input-FacetFilter`: fill-single, clear-invalid, `CarryFields` | Price / Format / Line Total, and the live `AppData.Order` panel |
| `KeepCurrentValue` and carried values kept as saved | the pre-filled first line |

## Run it

```bash
cd example_applications/facet_filter
npm run build
npm start                      # http://localhost:8086/   (--port N, --latency MS)
```

The server logs every API request. Open the page and watch: the catalog loads in two requests, and picking
things afterwards makes none.

`npm run smoke` (after a build) starts the server on 8087, loads `/?smoke=1` in jsdom (which
fetches the page and scripts from the server and makes the app's reads over HTTP) and prints 20 checks. The
same `?smoke=1` works in a desktop browser -- the checks print to the console.

## Things to try

1. **The saved line.** Row 1 of the first table was "saved earlier": *Das Leise Licht*, which went out of
   print in 2024, at a price of 18 (the catalog now says 21). It still shows in its own row, the other rows do
   not offer it, and its price stays 18.
2. **History.** In row 2 pick Genre *History*. Author fills with *M. Petrov* (his third book is at an inactive
   publisher, so it was never loaded) and Book narrows to his two books but stays blank. Pick *The Winter
   Ports*: Price 25 and Format fill, Line Total and the order total update in the same step.
3. **One-book author.** In row 3 pick Author *R. Okafor*: Genre *Science* and Book *Small Worlds* fill in.
   *Northern Almanac* is his too but is not in print until 2027. Set **In print on** to `2027-06-01` and it
   becomes a choice.
4. **A change that contradicts.** Still in row 3, change Genre to *Poetry*: Author and Book clear (Okafor
   writes no poetry here), Price and Format clear with them, and the Author list narrows to Poetry authors.
   Row 2 is untouched.
5. **Shared author, joint narrowing.** Pick Author *A. Marlowe*: Genre offers Mystery and Poetry. Pick Poetry:
   Book narrows to *Tides in Verse* alone and fills.
6. **Left-narrowing vs symmetric.** In the second table pick Book *Le Quai Froid*: Genre and Author fill, and
   that row's Genre list now holds only *Mystery* -- to change genre there you would first clear the book. In
   the first table a filled row's Genre list stays whole, so you can re-pick and the row adjusts.
7. **Form-level facets.** Set Language to *French*: every row's lists narrow to French books, but rows already
   filled keep their values (and keep offering them) -- the form-level filters scope what can be picked, they
   do not rewrite what was picked.

Note: pict-section-form's base `Option` dropdown has no empty entry, so a choice cannot be cleared from the
dropdown itself here (delete the row instead). Hosts that render `Option` with a clearable picker show step 4's
"clear sticks" behaviour when you clear the Book: the rest of the row stays and the Book is not refilled.

## Files

| File | What |
|---|---|
| `Facet-Filter-Application.js` | The form: bundle, picklists, two order tables. Configuration only. |
| `Facet-Filter-Server.js` | Static server for `dist/` plus a meadow-endpoints-shaped read API over `FacetFilterData.json` (`FBV` EQ/NE/LT/LE/GT/GE/LK, `FBL` INN, paging, Count, Schema). |
| `FacetFilterData.json` | 4 publishers (one inactive), 16 books with nested `Details`. |
| `html/Facet-Filter-Smoke.js`, `Facet-Filter-Smoke-Runner.js` | The `?smoke=1` walkthrough and its runner. |
