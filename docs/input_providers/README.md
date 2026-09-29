# Input Providers

Input providers extend the functionality of form inputs with specialized
behavior for different data types and interaction patterns.

## Provider Reference

| # | Provider | Input Type | Description |
|---|----------|------------|-------------|
| 001 | [Select](001-select.md) | Select, Option | Dropdown lists with static/dynamic options |
| 002 | [DateTime](002-datetime.md) | DateTime | Date and time picker |
| 003 | [Markdown](003-markdown.md) | Markdown | Markdown content display |
| 004 | [HTML](004-html.md) | HTML | Raw HTML content display |
| 005 | [PreciseNumber](005-precise-number.md) | PreciseNumber | Formatted numbers with precision |
| 006 | [Link](006-link.md) | Link | Hyperlink inputs |
| 007 | [Templated](007-templated.md) | Templated | Dynamic template rendering |
| 008 | [TemplatedEntityLookup](008-templated-entity-lookup.md) | TemplatedEntityLookup | Entity fetch with templates |
| 009 | [Chart](009-chart.md) | Chart | Chart.js visualizations |
| 010 | [EntityBundleRequest](010-entity-bundle-request.md) | (any) | Cascading entity fetches |
| 011 | [AutofillTriggerGroup](011-autofill-trigger-group.md) | (any) | Trigger-based autofill |
| 012 | [TabGroupSelector](012-tab-group-selector.md) | TabGroupSelector | Tab navigation for groups |
| 013 | [TabSectionSelector](013-tab-section-selector.md) | TabSectionSelector | Tab navigation for sections |
| 014 | [RichText](014-rich-text.md) | RichText | Markdown editor (edit) + rendered markdown (view); pluggable image uploader |
| 015 | [Diagram](015-diagram.md) | Diagram | Excalidraw (edit) + inline themed SVG (view); themeify on save |
| 016 | [FacetFilter](016-facet-filter.md) | (any select) | Dropdowns over one shared record list, each narrowed by the others (row-scoped in tables) |

## Provider Categories

### Display Providers

Render content without user input:

- **[Markdown](003-markdown.md)** - Renders markdown as HTML
- **[HTML](004-html.md)** - Renders raw HTML content
- **[Templated](007-templated.md)** - Dynamic Pict template rendering
- **[TemplatedEntityLookup](008-templated-entity-lookup.md)** - Entity data with templates

### Input Providers

Handle user data entry:

- **[Select](001-select.md)** - Dropdown/option selection
- **[DateTime](002-datetime.md)** - Date and time input
- **[PreciseNumber](005-precise-number.md)** - Formatted numeric input
- **[Link](006-link.md)** - URL/hyperlink input

### Data Providers

Manage data loading and synchronization:

- **[EntityBundleRequest](010-entity-bundle-request.md)** - Fetch related entities
- **[AutofillTriggerGroup](011-autofill-trigger-group.md)** - Coordinate field filling

### Navigation Providers

Handle multi-section/multi-group navigation:

- **[TabGroupSelector](012-tab-group-selector.md)** - Tabs within a section
- **[TabSectionSelector](013-tab-section-selector.md)** - Tabs across sections

### Visualization Providers

Display data graphically:

- **[Chart](009-chart.md)** - Chart.js integration

### Editable Rich Providers

Pair a heavy editor (edit mode) with a render-only view (view mode), with the
heavy bundle lazy-loaded on the first edit toggle:

- **[RichText](014-rich-text.md)** - Markdown editor + rendered markdown; pluggable image uploader
- **[Diagram](015-diagram.md)** - Excalidraw + themed inline SVG; themeify on save

## Using Providers

### Specifying Providers

Add providers via the `Providers` array:

```json
"PictForm": {
  "InputType": "Select",
  "Providers": ["Pict-Input-Select", "Pict-Input-EntityBundleRequest"]
}
```

### Provider Order

Providers execute in array order. Place data-loading providers before
display providers:

```json
"Providers": [
  "Pict-Input-EntityBundleRequest",  // Load data first
  "Pict-Input-AutofillTriggerGroup", // Then autofill
  "Pict-Input-Select"                // Finally handle selection
]
```

### Default Providers

When `InputType` is specified without `Providers`, the default provider
for that type is used automatically.

## Provider Lifecycle

All providers can implement these lifecycle hooks:

| Hook | When Called | Purpose |
|------|-------------|---------|
| `onInputInitialize` | After render | Initialize input behavior |
| `onInputInitializeTabular` | After tabular render | Initialize tabular input |
| `onDataChange` | Value changes | Handle user input |
| `onDataChangeTabular` | Tabular value changes | Handle tabular input |
| `onDataMarshalToForm` | Data -> UI | Update display from data |
| `onDataMarshalToFormTabular` | Data -> tabular UI | Update tabular display |
| `onAfterMarshalToForm` | After all marshaling | Post-marshal actions |
| `onDataRequest` | Reading value | Get current value |
| `onAfterEventCompletion` | After trigger events | Handle trigger responses |

## Creating Custom Providers

```javascript
const libPictProvider = require('pict-provider');

class MyCustomProvider extends libPictProvider {
  constructor(pFable, pOptions, pServiceHash) {
    super(pFable, pOptions, pServiceHash);
    this.serviceType = 'PictFormInputExtension';
  }

  onInputInitialize(pView, pGroup, pRow, pInput, pValue, pHTMLSelector, pTransactionGUID) {
    // Initialize custom behavior
  }

  onDataChange(pView, pInput, pValue, pHTMLSelector, pTransactionGUID) {
    // Handle value changes
  }
}

module.exports = MyCustomProvider;
```

Register and use:

```javascript
pict.addProvider('MyCustomInput', MyCustomProvider);
```

```json
"Providers": ["MyCustomInput"]
```

## Related Documentation

- [Input Types](../Input_Types.md) - Input type overview
- [Configuration](../Configuration.md) - PictForm configuration
- [Providers](../Providers.md) - Provider architecture
