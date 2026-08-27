# Diagram Input Provider

The Diagram input provider pairs
[pict-section-excalidraw](https://fable-retold.github.io/pict-section-excalidraw/)'s
Excalidraw view (edit mode) with an inline themed SVG (view mode) inside a
form field. The stored value is the Excalidraw-exported SVG with the scene
embedded in `<metadata>`, so editing round-trips losslessly. Boots in **view
mode** — the Excalidraw vendor bundle isn't pulled until the host UI flips
the field into edit mode.

## Provider Information

| Property | Value |
|----------|-------|
| Provider Hash | `Pict-Input-Diagram` |
| Input Type | `Diagram` |
| Supports Tabular | No (Phase 1) |
| Display Only | No |

## Setup

The provider class lives in pict-section-form. It lazy-requires
`pict-section-excalidraw` on the first `setMode('edit')`, so add that module
as a dependency in apps that allow diagram editing.

```javascript
const libPictSectionForm = require('pict-section-form');
const libDiagramInput    = libPictSectionForm.DiagramInput;

pict.addProvider(
    libDiagramInput.default_configuration.ProviderIdentifier,
    libDiagramInput.default_configuration,
    libDiagramInput);
```

## Basic Usage

```json
{
  "Architecture.Diagram": {
    "Name": "Architecture",
    "Hash": "ArchDiagram",
    "DataType": "String",
    "PictForm": {
      "InputType": "Diagram",
      "Diagram": {
        "ThemeColors":          true,
        "Height":               "640px",
        "FormFactor":           "pointer",
        "EditorImplementation": "react"
      }
    }
  }
}
```

## Configuration Options

### ThemeColors

Boolean (default `true`). When `true`, the exported SVG passes through
`themeifySVG()` on every save: hex strokes like `stroke="#1B1F23"` become
`stroke="var(--diagram-ink, #1B1F23)"`. The hex fallback keeps the SVG
correct standalone (no theme provider), while a host that defines
`--diagram-*` CSS variables can recolor every stored diagram live without
re-rendering.

Token names: `--diagram-ink`, `--diagram-paper`, `--diagram-accent`,
`--diagram-highlight`, `--diagram-deemphasis`, `--diagram-link`.

The metadata block is protected — the embedded scene round-trips byte-for-byte,
so the SVG re-opens cleanly in any Excalidraw-aware viewer.

### Height

Starting height of the canvas while the field is in **edit mode**. A CSS length
(`"640px"`, `"40rem"`) or a bare number, which is read as pixels (`640` and
`"640"` both mean `640px`). Defaults to `560px`.

Height is worth setting deliberately, because Excalidraw scales its own UI to
the box it is given: below roughly 500px it decides it is on a phone and folds
the shape properties away behind a popover, and the left-hand properties island
starts to clip into a scrolling sliver. `560px` is the smallest height that
avoids both.

Users can also drag the bottom-right grip to resize the canvas (the same
affordance a `textarea` has). A height they drag to is remembered per field in
`localStorage` and wins over `Height` on the next open; the field falls back to
`Height` wherever storage is unavailable. Read and Print themes are unaffected —
they render the static SVG at its natural size.

### FormFactor

How Excalidraw should classify the editor when picking how dense its UI is.

| Value | Behaviour |
|---|---|
| `"pointer"` *(default)* | Desktop chrome on a mouse; Excalidraw's own answer on a touch screen. |
| `"auto"` | Excalidraw decides, from the size of the container. |
| `"desktop"` / `"tablet"` / `"phone"` | Pin it. |

Excalidraw's own detection reads the **container's** box — right for
excalidraw.com, where the container is the viewport, and wrong for a form field,
where a 560px-tall box on a 27" monitor is not a phone. `"pointer"` classifies
by input device instead, so the full properties island stays put at any field
width. Set `"auto"` to opt back out.

### EditorImplementation

`"react"` (default) or `"iframe"`. Dispatches to pict-section-excalidraw's two
view implementations.

### EditorOptions

Pass-through to the underlying Excalidraw view configuration. Use sparingly —
the defaults are tuned for in-form embedding.

## Runtime API

```javascript
let tmpProvider = pict.providers['Pict-Input-Diagram'];

tmpProvider.setMode('ArchDiagram', 'edit', (pErr) => { /* … */ });
tmpProvider.setMode('ArchDiagram', 'view', (pErr) => { /* … */ });
tmpProvider.toggleMode('ArchDiagram', (pErr) => { /* … */ });
tmpProvider.getMode('ArchDiagram');                 // 'edit' | 'view' | null
tmpProvider.commit('ArchDiagram', (pErr) => { /* … */ });
```

`commit` forces a synchronous export so the form value reflects the latest
scene even if the throttled `OnChange` hasn't fired yet.

## themeifySVG utility

The Themeify-SVG regex pass is exposed standalone for hosts that want to
re-color stored SVGs without going through the provider:

```javascript
const libPictSectionForm = require('pict-section-form');

let tmpStored = '<svg>...<rect stroke="#1B1F23"/>...</svg>';
let tmpThemed = libPictSectionForm.themeifySVG(tmpStored);
// stroke becomes stroke="var(--diagram-ink, #1B1F23)"
```

Accepts a second argument: either a flat palette `{ink, paper, accent, …}` or a
style profile object carrying `.Palette`. The metadata block is protected from
the rewrite pass.

## Lifecycle Hooks

| Hook | What it does |
|------|-------------|
| `onInputInitialize` | Mounts the slot in view mode (writes the stored SVG verbatim into `#DISPLAY-FOR-…`) |
| `onDataMarshalToForm` | View mode: re-renders the SVG. Edit mode: parses the embedded scene from the new SVG and calls `setScene` on the live editor |
| `onInputInitializeTabular` | Throws — Diagram is not supported inside tabular rows in Phase 1 |

## Tabular Limitation

Phase 1 explicitly does not support `Diagram` inside tabular rows. N
Excalidraw canvases per row × M rows is a memory landmine; defer until real
demand surfaces.

## Related Documentation

- [Diagram Form example](https://fable-retold.github.io/pict-section-excalidraw/#/page/examples/diagram%5Fform/README) — minimal one-field demo with live theme swap.
- [Superhero Studio example](https://fable-retold.github.io/pict-section-excalidraw/#/page/examples/superhero%5Fstudio/README) — Diagram + RichText + stock InputTypes in one form.
- [RichText Input Type](014-rich-text.md) — the markdown sibling.
- [pict-section-excalidraw docs](https://fable-retold.github.io/pict-section-excalidraw/) — the underlying editor.
- [pict-renderer-graph](https://fable-retold.github.io/pict-renderer-graph/) — pair with Diagram inputs to pre-bake stored values from JSON, then let users hand-edit.
