# TabSectionSelector Input Provider

The TabSectionSelector provider manages tab navigation between multiple form
sections, enabling multi-page form workflows.

## Provider Information

| Property | Value |
|----------|-------|
| Provider Hash | `Pict-Input-TabSectionSelector` |
| Input Type | `TabSectionSelector` |
| Supports Tabular | No |

## Basic Usage

```json
{
  "UI.SectionTabs": {
    "Name": "Section Navigation",
    "Hash": "SectionTabState",
    "DataType": "String",
    "PictForm": {
      "Section": "Navigation",
      "InputType": "TabSectionSelector",
      "TabSectionSet": ["Personal", "Employment", "Review"],
      "TabSectionNames": ["Personal Info", "Employment History", "Review & Submit"]
    }
  }
}
```

## Configuration Options

### TabSectionSet

Array of section hashes that become tabs:

```json
"TabSectionSet": ["SectionHash1", "SectionHash2", "SectionHash3"]
```

### TabSectionNames

Optional display names for tabs:

```json
"TabSectionNames": ["Display Name 1", "Display Name 2", "Display Name 3"]
```

### DefaultFromData

Use input value to determine default tab (default: true):

```json
"DefaultFromData": true
```

### DefaultTabSectionHash

Fallback default section when value is empty:

```json
"DefaultTabSectionHash": "Personal"
```

## How It Works

1. **View Hash Mapping**: Maps manifest section hashes to view hashes
2. **Tab Generation**: Creates buttons for each section in TabSectionSet
3. **Visibility Control**: Hides non-active sections via CSS
4. **Navigation**: Clicking tabs shows/hides entire sections

## CSS Classes

| Class | Applied To | Purpose |
|-------|-----------|---------|
| `pict-tab-section-hidden` | Hidden sections | Hides inactive sections |
| `pict-tab-section-selectedtab` | Active tab button | Styles active tab (bold) |

## Lifecycle Hooks

### onInputInitialize

1. Resolves section hashes to view hashes via metacontroller
2. Generates tab button HTML
3. Applies CSS for visibility control
4. Sets the default section: the stored value (unless `DefaultFromData` is false), else `DefaultTabSectionHash`, else the first section. Hashes not in `TabSectionSet` are skipped.

### getViewHash

Maps manifest section hash to the actual view hash used by
PictFormMetacontroller.

### selectTabByViewHash

Core method that:
1. Hides all sections in TabSectionSet
2. Shows selected section
3. Updates tab button styling
4. Updates input value

Returns `true` once the section is shown, and `false` without changing anything if the view, input, `TabSectionSet` or section view is missing or the hash is not in `TabSectionSet`.

## Example: Multi-Page Form

```json
{
  "Sections": [
    {
      "Hash": "Navigation",
      "Name": "Form Navigation",
      "Groups": []
    },
    {
      "Hash": "Step1",
      "Name": "Personal Information"
    },
    {
      "Hash": "Step2",
      "Name": "Contact Details"
    },
    {
      "Hash": "Step3",
      "Name": "Review"
    }
  ],
  "Descriptors": {
    "UI.FormSteps": {
      "Name": "Form Steps",
      "Hash": "CurrentStep",
      "DataType": "String",
      "Default": "Step1",
      "PictForm": {
        "Section": "Navigation",
        "Row": 1,
        "Width": 12,
        "InputType": "TabSectionSelector",
        "TabSectionSet": ["Step1", "Step2", "Step3"],
        "TabSectionNames": ["1. Personal", "2. Contact", "3. Review"],
        "DefaultTabSectionHash": "Step1"
      }
    },
    "Personal.Name": {
      "Name": "Full Name",
      "Hash": "FullName",
      "DataType": "String",
      "PictForm": { "Section": "Step1", "Row": 1 }
    },
    "Contact.Email": {
      "Name": "Email Address",
      "Hash": "Email",
      "DataType": "String",
      "PictForm": { "Section": "Step2", "Row": 1 }
    },
    "Review.Summary": {
      "Name": "Summary",
      "Hash": "ReviewSummary",
      "DataType": "String",
      "PictForm": { "Section": "Step3", "Row": 1, "InputType": "HTML" }
    }
  }
}
```

## Custom Styling

Style tabs as a wizard/stepper:

```css
.pict-tab-section-hidden {
  display: none !important;
}

.pict-section-tabs {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.pict-section-tab-button {
  flex: 1;
  padding: 15px;
  text-align: center;
  background: #f0f0f0;
  border: 1px solid #ddd;
  cursor: pointer;
}

.pict-section-tab-button.pict-tab-section-selectedtab {
  background: #007bff;
  color: white;
  font-weight: bold;
}

.pict-section-tab-button:not(:last-child)::after {
  content: "->";
  margin-left: 10px;
}
```

## Programmatic Navigation

```javascript
// Navigate to a specific section (viewHash, inputHash, tabSectionHash)
const tabProvider = pict.providers['Pict-Input-TabSectionSelector'];
tabProvider.selectTabByViewHash('Navigation', 'CurrentStep', 'Step2');

// Or via button click handler in template
"<button onclick=\"{~P~}.providers['Pict-Input-TabSectionSelector'].selectTabByViewHash('{~D:Context[0].Hash~}', '{~D:Record.Hash~}', 'Step2')\">Next</button>"
```

## Navigation Buttons

Add prev/next buttons using meta-templates:

```json
"MetaTemplates": [
  {
    "HashPostfix": "-Template-Section-Postfix",
    "Template": "<div class=\"nav-buttons\"><button onclick=\"navigatePrev()\">Previous</button><button onclick=\"navigateNext()\">Next</button></div></section>"
  }
]
```

## Validation Before Navigation

Implement validation in a custom provider or via solvers:

```javascript
// Example validation approach
function navigateNext(pViewHash, pInputHash, pNextSectionHash) {
  if (validateCurrentSection()) {
    pict.providers['Pict-Input-TabSectionSelector']
      .selectTabByViewHash(pViewHash, pInputHash, pNextSectionHash);
  } else {
    showValidationErrors();
  }
}
```

## Difference from TabGroupSelector

| Feature | TabGroupSelector | TabSectionSelector |
|---------|-----------------|-------------------|
| Scope | Groups within one section | Multiple sections |
| Use Case | Tabbed panels | Multi-page forms |
| Container | Section | Metacontroller |
| CSS Prefix | `pict-tab-group-` | `pict-tab-section-` |

## Notes

- Works with PictFormMetacontroller for section management
- Section state persists in the input value
- Can be combined with visibility solvers for conditional sections
- Consider form validation before allowing section changes

## Related Documentation

- [TabGroupSelector Provider](012-tab-group-selector.md) - Group-level tabs
- [Architecture](../Pict_Section_Form_Architecture.md) - Section/Metacontroller
- [Configuration](../Configuration.md) - Section setup
