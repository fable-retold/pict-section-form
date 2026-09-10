# TabGroupSelector Input Provider

The TabGroupSelector provider manages tab navigation between multiple groups
within a single form section.

## Provider Information

| Property | Value |
|----------|-------|
| Provider Hash | `Pict-Input-TabGroupSelector` |
| Input Type | `TabGroupSelector` |
| Supports Tabular | No |

## Basic Usage

```json
{
  "UI.TabState": {
    "Name": "Tab Selection",
    "Hash": "TabState",
    "DataType": "String",
    "PictForm": {
      "Section": "Main",
      "InputType": "TabGroupSelector",
      "TabGroupSet": ["PersonalInfo", "ContactInfo", "Preferences"],
      "TabGroupNames": ["Personal", "Contact", "Preferences"]
    }
  }
}
```

## Configuration Options

### TabGroupSet

Array of group hashes that become tabs:

```json
"TabGroupSet": ["GroupHash1", "GroupHash2", "GroupHash3"]
```

### TabGroupNames

Optional display names for tabs. If not provided, group hashes are used:

```json
"TabGroupNames": ["Display Name 1", "Display Name 2", "Display Name 3"]
```

### DefaultFromData

Use the input value to determine default tab (default: true):

```json
"DefaultFromData": true
```

### DefaultTabGroupHash

Fallback default tab when value is empty:

```json
"DefaultTabGroupHash": "PersonalInfo"
```

## How It Works

1. **Initialization**: Creates tab buttons for each group in TabGroupSet
2. **Selection**: Clicking a tab calls `selectTabByViewHash()`
3. **Visibility**: Non-active groups receive `pict-tab-group-hidden` CSS class
4. **Styling**: Active tab receives `pict-tab-group-selectedtab` CSS class

## CSS Classes

| Class | Applied To | Purpose |
|-------|-----------|---------|
| `pict-tab-group-hidden` | Hidden groups | Hides inactive groups |
| `pict-tab-group-selectedtab` | Active tab button | Styles active tab (bold) |

## Lifecycle Hooks

### onInputInitialize

1. Generates tab button HTML
2. Assigns to container element
3. Applies CSS snippets for show/hide behavior
4. Sets the default tab: the stored value (unless `DefaultFromData` is false), else `DefaultTabGroupHash`, else the first tab. Hashes not in `TabGroupSet` are skipped.

### setCSSSnippets

Injects CSS rules for tab visibility control.

### selectTabByViewHash

Core method that:
1. Hides all groups in TabGroupSet
2. Shows selected group
3. Updates tab button styling
4. Updates input value

Returns `true` once the tab is shown, and `false` without changing anything if the view, input or `TabGroupSet` is missing or the hash is not in `TabGroupSet`.

## Example: Complete Configuration

```json
{
  "Sections": [
    {
      "Hash": "Profile",
      "Name": "User Profile",
      "Groups": [
        { "Hash": "PersonalInfo", "Name": "Personal Information" },
        { "Hash": "ContactInfo", "Name": "Contact Details" },
        { "Hash": "SecurityInfo", "Name": "Security Settings" }
      ]
    }
  ],
  "Descriptors": {
    "UI.ProfileTabs": {
      "Name": "Profile Tabs",
      "Hash": "ProfileTabState",
      "DataType": "String",
      "Default": "PersonalInfo",
      "PictForm": {
        "Section": "Profile",
        "Row": 0,
        "Width": 12,
        "InputType": "TabGroupSelector",
        "TabGroupSet": ["PersonalInfo", "ContactInfo", "SecurityInfo"],
        "TabGroupNames": ["Personal", "Contact", "Security"],
        "DefaultTabGroupHash": "PersonalInfo"
      }
    },
    "Profile.FirstName": {
      "Name": "First Name",
      "Hash": "FirstName",
      "DataType": "String",
      "PictForm": { "Section": "Profile", "Group": "PersonalInfo", "Row": 1 }
    },
    "Profile.Email": {
      "Name": "Email",
      "Hash": "Email",
      "DataType": "String",
      "PictForm": { "Section": "Profile", "Group": "ContactInfo", "Row": 1 }
    },
    "Profile.Password": {
      "Name": "Password",
      "Hash": "Password",
      "DataType": "String",
      "PictForm": { "Section": "Profile", "Group": "SecurityInfo", "Row": 1 }
    }
  }
}
```

## Custom Tab Styling

Override the default styles with custom CSS:

```css
.pict-tab-group-hidden {
  display: none !important;
}

.pict-tab-group-selectedtab {
  font-weight: bold;
  border-bottom: 2px solid #007bff;
}

.pict-tab-button {
  padding: 10px 20px;
  cursor: pointer;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
}

.pict-tab-button:hover {
  background: #e9ecef;
}
```

## Programmatic Tab Selection

```javascript
// Get the provider
const tabProvider = pict.providers['Pict-Input-TabGroupSelector'];

// Select a specific tab (viewHash, inputHash, tabGroupHash)
tabProvider.selectTabByViewHash('Profile', 'ProfileTabState', 'ContactInfo');
```

## Multiple Tab Sets

You can have multiple independent tab sets in one section by using different
inputs:

```json
{
  "UI.MainTabs": {
    "PictForm": {
      "InputType": "TabGroupSelector",
      "TabGroupSet": ["Overview", "Details"]
    }
  },
  "UI.DetailsTabs": {
    "PictForm": {
      "InputType": "TabGroupSelector",
      "TabGroupSet": ["Specs", "Reviews", "Availability"]
    }
  }
}
```

## Notes

- Tab state is stored in the input value for persistence
- Groups must exist in the same section
- Consider accessibility when customizing tab styling
- Works with visibility solvers for conditional tabs

## Related Documentation

- [TabSectionSelector Provider](013-tab-section-selector.md) - Section-level tabs
- [Layouts](../Layouts.md) - Group configuration
- [Configuration](../Configuration.md) - Section and group setup
