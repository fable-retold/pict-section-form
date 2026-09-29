# Providers

Providers are singleton services that handle specific responsibilities in
Pict Section Form. They are managed by the `PictDynamicFormDependencyManager`
and available through `pict.providers`.

## Core Providers

### DynamicInput

Routes input rendering to appropriate templates and handlers.

**Hash:** `DynamicInput`

**Responsibilities:**
- Maps input types to template names
- Returns appropriate input providers for each type
- Differentiates between tabular and non-tabular inputs

**Key Methods:**

```javascript
// Get the input provider(s) for a given input
const providers = pict.providers.DynamicInput.getDefaultInputProviders(view, input);

// Check if an input type has a custom provider
const hasProvider = pict.providers.DynamicInput.hasInputProvider('DateTime');
```

### DynamicSolver

Processes expressions to compute values and control form behavior.

**Hash:** `DynamicSolver`

**Responsibilities:**
- Parses and evaluates solver expressions
- Injects custom solver functions
- Manages solver behaviors (visibility, styling)
- Tracks solver execution results

**Key Methods:**

```javascript
// Solve all view solvers
pict.providers.DynamicSolver.solveViews(['ViewHash1', 'ViewHash2']);

// Add custom function
pict.providers.DynamicSolver.expressionParser.addFunction('myFunc', (x) => x * 2);
```

### DynamicTemplates

Manages the hierarchical template system.

**Hash:** `DynamicTemplates`

**Responsibilities:**
- Registers default form templates
- Manages template sets with customizable prefixes
- Associates input extensions with templates

**Key Methods:**

```javascript
// Add a template set
pict.providers.DynamicTemplates.addTemplateSet('MyTheme-', templateDefinitions);

// Check if template exists
const exists = pict.providers.DynamicTemplates.checkTemplate('MyTheme-Template-Input-Text');
```

### MetatemplateGenerator

Creates on-demand templates for dynamic input rendering.

**Hash:** `MetatemplateGenerator`

**Responsibilities:**
- Generates template references for layout levels
- Creates view sections for displaying dynamic inputs
- Manages base template prefix

**Key Methods:**

```javascript
// Rebuild custom template for a view
pict.providers.MetatemplateGenerator.rebuildCustomTemplate(view);

// Get layout provider for a group
const layoutProvider = pict.providers.MetatemplateGenerator.getGroupLayoutProvider(view, group);
```

### Informary

Handles DOM-to-data and data-to-DOM marshaling.

**Hash:** `Informary`

**Responsibilities:**
- Retrieves form HTML elements by form hash
- Marshals data between form and AppData
- Manages macro attribute extraction

**Key Methods:**

```javascript
// Marshal form data to AppData
pict.providers.Informary.marshalFormToData(destinationObject, formID, manifest);

// Marshal AppData to form
pict.providers.Informary.marshalDataToForm(sourceObject, formID, manifest);

// Get composed address for tabular data
const address = pict.providers.Informary.getComposedContainerAddress(container, rowIndex, dataAddress);
```

### DynamicLayout

Generates layout templates for different group types.

**Hash:** `DynamicLayout`

**Responsibilities:**
- Provides layout providers for each layout type
- Generates group-level templates
- Manages layout initialization

**Available Layouts:**

| Layout | Description |
|--------|-------------|
| `Record` | Standard form with rows and columns |
| `VerticalRecord` | Single column stacked layout |
| `Tabular` | Table with multiple data rows |
| `RecordSet` | Multiple related records |
| `TuiGrid` | TUI Grid integration |
| `Chart` | Data visualization |

**Key Methods:**

```javascript
// Get layout provider by name
const provider = pict.providers.DynamicLayout.getLayoutProvider('Tabular');
```

### DynamicInputEvents

Manages input event handling and change detection.

**Hash:** `DynamicInputEvents`

**Responsibilities:**
- Handles input event routing
- Manages data change detection
- Coordinates input-level callbacks

**Key Methods:**

```javascript
// Trigger input event
pict.providers.DynamicInputEvents.inputEvent(view, inputHash, eventName);

// Trigger tabular input event
pict.providers.DynamicInputEvents.inputEventTabular(view, groupIndex, inputIndex, rowIndex, eventName);

// Handle data request
pict.providers.DynamicInputEvents.inputDataRequest(view, inputHash, event);
```

### DynamicTabularData

Handles tabular data structures and row operations.

**Hash:** `DynamicTabularData`

**Responsibilities:**
- Manages tabular record sets
- Handles row CRUD operations
- Maintains row ordering

**Key Methods:**

```javascript
// Get tabular record set
const records = pict.providers.DynamicTabularData.getTabularRecordSet(view, groupIndex);

// Add new row
pict.providers.DynamicTabularData.createDynamicTableRow(view, groupIndex);

// Delete row
pict.providers.DynamicTabularData.deleteDynamicTableRow(view, groupIndex, rowIndex);

// Move row
pict.providers.DynamicTabularData.moveDynamicTableRowUp(view, groupIndex, rowIndex);
pict.providers.DynamicTabularData.moveDynamicTableRowDown(view, groupIndex, rowIndex);
```

### MetaLists

Manages dynamic list definitions for select inputs.

**Hash:** `MetaLists`

**Responsibilities:**
- Stores and retrieves pick lists
- Provides dynamic list generation
- Manages list refresh

**PickList keys:** `Hash`, `ListAddress`, `ListSourceAddress` (read from the form data, or from application
state with `ListSourceAddressGlobal: true`), `IDTemplate`, `TextTemplate`, `Unique`, `Sorted`, and
`SkipEmpty` (skip records whose id or text renders empty without logging them).

**Key Methods:**

```javascript
// Get a pick list
const options = pict.providers.MetaLists.getList('CountryList');

// Register a list
pict.providers.MetaLists.setList('StatusCodes', [
  { id: 'active', text: 'Active' },
  { id: 'inactive', text: 'Inactive' }
]);
```

### ListDistilling

Filters a select input's options by the `ListFilterRules` on its descriptor.

**Hash:** `ListDistilling`

**Rule types:** `Explicit` (compare each option to one value), `CrossMap` (keep options a join list maps to
another value), `Facet` (options drawn from a shared record list, narrowed by the other inputs of the same
row -- see [FacetFilter](input_providers/016-facet-filter.md)), or the hash of a provider with its own
`filterList`.

**Key Methods:**

```javascript
// Filter a list of { id, text } options for an input; pass the row index for a tabular input.
const filtered = pict.providers.ListDistilling.filterList(view, input, options, rowIndex);
```

### DataBroker

Manages data flow and storage locations.

**Hash:** `DataBroker`

**Responsibilities:**
- Resolves marshal destination objects
- Manages data address resolution
- Coordinates entity data loading

**Key Methods:**

```javascript
// Get marshal destination
const destination = pict.providers.DataBroker.resolveMarshalDestinationObject(address);

// Default marshal destination
const defaultDest = pict.providers.DataBroker.marshalDestination;
```

## Input Extension Providers

Input extension providers handle specific input types. They all extend
`PictInputExtensionProvider` and implement lifecycle hooks.

### Common Lifecycle Hooks

| Hook | Parameters | Description |
|------|------------|-------------|
| `onInputInitialize` | view, group, row, input, value, selector | Initialize input |
| `onInputInitializeTabular` | view, group, input, value, selector, rowIndex | Initialize tabular input |
| `onDataChange` | view, input, value, selector, transactionGUID | Handle value change |
| `onDataChangeTabular` | view, input, value, selector, rowIndex, transactionGUID | Handle tabular change |
| `onDataMarshalToForm` | view, group, row, input, value, selector | Data marshaled to form |
| `onAfterMarshalToForm` | view, group, row, input, value, selector | After marshal complete |
| `onDataRequest` | view, input, callback | Async data request |

### Available Input Providers

| Provider | Input Type | Description |
|----------|------------|-------------|
| `Pict-Input-Select` | Select | Dropdown selection |
| `Pict-Input-DateTime` | DateTime | Date/time picker |
| `Pict-Input-Markdown` | Markdown | Markdown editor |
| `Pict-Input-HTML` | HTML | HTML content |
| `Pict-Input-Chart` | Chart | Chart visualization |
| `Pict-Input-PreciseNumber` | PreciseNumber | High-precision numbers |
| `Pict-Input-Link` | Link | Hyperlink input |
| `Pict-Input-Templated` | Templated | Custom template |
| `Pict-Input-TabGroupSelector` | TabGroupSelector | Tab navigation |
| `Pict-Input-TabSectionSelector` | TabSectionSelector | Section tabs |
| `Pict-Input-EntityBundleRequest` | EntityBundleRequest | Entity loading |
| `Pict-Input-AutofillTriggerGroup` | AutofillTriggerGroup | Auto-fill |
| `Pict-Input-TemplatedEntityLookup` | TemplatedEntityLookup | Entity lookup |
| `Pict-Input-FacetFilter` | (any select) | Keeps facet dropdowns consistent on change |

## Creating Custom Providers

### Basic Structure

```javascript
const libPictProvider = require('pict-provider');

class MyCustomProvider extends libPictProvider
{
  constructor(pFable, pOptions, pServiceHash)
  {
    super(pFable, pOptions, pServiceHash);
    this.serviceType = 'PictFormInputExtension';
  }

  onInputInitialize(pView, pGroup, pRowIndex, pInput, pValue, pHTMLSelector, pTransactionGUID)
  {
    // Initialize custom behavior
    const element = this.pict.ContentAssignment.getElement(pHTMLSelector);
    if (element.length > 0)
    {
      // Add event listeners, setup UI, etc.
    }
  }

  onDataChange(pView, pInput, pValue, pHTMLSelector, pTransactionGUID)
  {
    // Handle value changes
    this.log.trace(`Value changed to: ${pValue}`);
  }

  onDataMarshalToForm(pView, pGroup, pRowIndex, pInput, pValue, pHTMLSelector, pTransactionGUID)
  {
    // Update UI when data marshaled to form
    const element = this.pict.ContentAssignment.getElement(pHTMLSelector);
    if (element.length > 0)
    {
      // Update element display
    }
  }
}

module.exports = MyCustomProvider;
```

### Registration

```javascript
// Register the provider
pict.addProvider('MyCustomInput', MyCustomProvider);

// Associate with input type
pict.providers.DynamicInput.registerInputProvider('CustomWidget', 'MyCustomInput');
```

### Template Registration

```javascript
// Add templates for the custom input
pict.TemplateProvider.addTemplate(
  'Pict-Form-Template-Input-InputType-CustomWidget',
  `<div class="custom-widget">
    <label>{~D:Record.Name~}</label>
    <div {~D:Record.Macro.HTMLID~} class="widget-content"></div>
  </div>`
);

// Tabular variant
pict.TemplateProvider.addTemplate(
  'Pict-Form-TabularTemplate-Input-InputType-CustomWidget',
  `<td><div {~D:Record.Macro.TabularHTMLID~} class="widget-content"></div></td>`
);
```

## Provider Communication

Providers can communicate through several mechanisms:

### Direct Reference

```javascript
// Access another provider
const solver = this.pict.providers.DynamicSolver;
solver.solveViews([viewHash]);
```

### Event System

```javascript
// Emit custom event
this.pict.emit('custom-event', { data: 'value' });

// Listen for events
this.pict.on('custom-event', (data) => {
  // Handle event
});
```

### Transaction Tracking

```javascript
// Register async operation
view.registerEventTransactionAsyncOperation(transactionGUID, 'myOperation');

// Mark operation complete
view.eventTransactionAsyncOperationComplete(transactionGUID, 'myOperation');
```

## Related Documentation

- [Architecture](Pict_Section_Form_Architecture.md) - Provider system architecture
- [Input Types](Input_Types.md) - Input provider usage
- [Templates](Templates.md) - Provider template integration
