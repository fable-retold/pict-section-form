export = TabularLayout;
declare class TabularLayout extends libPictSectionGroupLayout {
    constructor(pFable: any, pOptions: any, pServiceHash: any);
    /** @type {import('pict')} */
    pict: import("pict");
    /** @type {import('pict')} */
    fable: import("pict");
    /**
     * Builds one prime-header `<th>` with an injected, clickable sort control
     * `<span>` carrying the sort SVG glyph. Used when the group has
     * `ColumnSorting: true`. The glyph reflects the current sort state of the
     * column (neutral / ascending / descending).
     *
     * @param {Object} pView
     * @param {Object} pGroup
     * @param {Object} pDescriptor - The column's descriptor.
     * @param {number} pColumnIndex - The descriptor's InputIndex.
     * @returns {string}
     */
    _buildSortableHeaderCell(pView: any, pGroup: any, pDescriptor: any, pColumnIndex: number): string;
    /**
     * Resolves one row's value for a column descriptor. Dynamic columns store
     * their value at the descriptor's InformaryDataAddress (a nested path);
     * static columns resolve by hash.
     *
     * @param {Object} pGroup
     * @param {Object} pDescriptor
     * @param {Object} pRecord
     * @returns {any}
     */
    _getTabularCellValue(pGroup: any, pDescriptor: any, pRecord: any): any;
    /**
     * Comparator for tabular sort. Numeric when both values parse as numbers,
     * otherwise a locale string comparison. Null/undefined sort as empty.
     *
     * @param {any} pValueA
     * @param {any} pValueB
     * @returns {number}
     */
    _compareTabularValues(pValueA: any, pValueB: any): number;
    /**
     * Inline-handler entry point: sorts a tabular group's record set by a column.
     * A fresh column starts ascending; clicking the active column toggles
     * ascending -> descending. Rebuilds so the header glyph re-bakes, then
     * re-renders and re-marshals.
     *
     * @param {string} pViewHash
     * @param {number|string} pGroupIndex
     * @param {number|string} pColumnIndex
     * @returns {boolean}
     */
    sortTabularColumn(pViewHash: string, pGroupIndex: number | string, pColumnIndex: number | string): boolean;
    /**
     * Resolve a template string against a record. Returns '' on failure.
     *
     * @param {string} pTemplate
     * @param {Object} pRecord
     * @returns {string}
     */
    _parseTabularTemplate(pTemplate: string, pRecord: any): string;
    /**
     * Build the expanded Headers config for a group.
     *
     * Returns the user-provided pGroup.Headers (each row = array of cells) plus
     * a synthesized "header group" row prepended at the front when any DynamicColumns
     * generator declares a HeaderGroupTemplate. The synthesized row clusters
     * consecutive descriptors with the same _DynamicColumnHeaderGroup value into
     * a single cell with ColumnSpan.
     *
     * @param {Object} pView
     * @param {Object} pGroup
     * @returns {Array<Array<{Label: string, ColumnSpan: number, CSSClass: string}>>}
     */
    _buildExpandedHeadersConfig(pView: any, pGroup: any): Array<Array<{
        Label: string;
        ColumnSpan: number;
        CSSClass: string;
    }>>;
    /**
     * Compute per-row label metadata for a tabular group with RowLabels config.
     *
     * Walks the current RecordSetAddress array. For each row, resolves the
     * label value for each RowLabels entry (Template / RowNumber / SourceAddress).
     * For Cluster:true columns, consecutive equal values collapse into a single
     * cell on the first row of the run, with continuation rows marked Skip:true.
     *
     * Writes the result to pGroup.RowLabelMetadata as an array index-aligned
     * with the record set. Idempotent — safe to call on every marshal.
     *
     * @param {Object} pView
     * @param {Object} pGroup
     */
    _computeRowLabelMetadata(pView: any, pGroup: any): void;
    /**
     * Called from the row template via the {~TRL:...~} tag. Returns the HTML for
     * the leading cells of one tabular row: an optional row-selection checkbox
     * cell followed by the configured row-label cells.
     *
     * @param {Object} pView
     * @param {number|string} pGroupIndex
     * @param {number|string} pRowKey
     * @returns {string}
     */
    _renderTabularRowLabelsHTML(pView: any, pGroupIndex: number | string, pRowKey: number | string): string;
    /**
     * Called from the row template via {~F:...~} to emit the editing controls
     * (del/up/down) for a row. Used when EditingControlsPosition === 'left'.
     * For EditingControlsPosition === 'right' the existing default
     * -TabularTemplate-Row-ExtraPostfix template handles this.
     *
     * @param {Object} pView
     * @param {number|string} pGroupIndex
     * @param {number|string} pRowKey
     * @returns {string}
     */
    _renderTabularEditingControlsHTML(pView: any, pGroupIndex: number | string, pRowKey: number | string): string;
    _escapeHTML(pString: any): string;
    /**
     * Normalize a Group.RowSelection / Group.ColumnSelection config value.
     *
     * Accepts `true` (use all defaults) or an object
     * `{ Enabled, DataAddress, HighlightClass, HeaderLabel }`. Returns null when
     * selection is not enabled.
     *
     * - `DataAddress` — address (relative to the form's marshal destination) where
     *   the boolean selection array is stored, so it persists with the form data.
     * - `HighlightClass` — class auto-applied to selected rows/columns. Set to an
     *   empty string to make selection purely data-driven (solver-applied only).
     * - `HeaderLabel` — text for the selection column's header cell.
     *
     * @param {boolean|Object} pConfigValue
     * @param {string} pDefaultDataAddress
     * @param {string} pDefaultHighlightClass
     * @returns {{DataAddress: string, HighlightClass: string, HeaderLabel: string}|null}
     */
    _normalizeSelectionConfig(pConfigValue: boolean | any, pDefaultDataAddress: string, pDefaultHighlightClass: string): {
        DataAddress: string;
        HighlightClass: string;
        HeaderLabel: string;
    } | null;
    /**
     * The absolute address (within the form's marshal destination) of a selection
     * config's boolean array.
     *
     * @param {Object} pView
     * @param {{DataAddress: string}} pSelectionConfig
     * @returns {string}
     */
    _getTabularSelectionAddress(pView: any, pSelectionConfig: {
        DataAddress: string;
    }): string;
    /**
     * Reads the boolean selection array for a row/column selection config.
     * Always returns an array (empty when nothing has been selected yet).
     *
     * @param {Object} pView
     * @param {{DataAddress: string}} pSelectionConfig
     * @returns {Array<boolean>}
     */
    _getTabularSelectionArray(pView: any, pSelectionConfig: {
        DataAddress: string;
    }): Array<boolean>;
    /**
     * Sets one flag in a selection array and writes it back into the form data.
     *
     * @param {Object} pView
     * @param {{DataAddress: string}} pSelectionConfig
     * @param {number|string} pIndex
     * @param {boolean} pSelected
     * @returns {Array<boolean>}
     */
    _setTabularSelectionFlag(pView: any, pSelectionConfig: {
        DataAddress: string;
    }, pIndex: number | string, pSelected: boolean): Array<boolean>;
    /**
     * Inline-handler entry point: toggles a row's selection state. Called by the
     * checkbox rendered in the row-selection column. Writes the new state into the
     * form data, optionally applies the highlight class, then re-solves so any
     * user solvers that read the selection state can react.
     *
     * @param {string} pViewHash
     * @param {number|string} pGroupIndex
     * @param {number|string} pRowKey
     * @param {boolean} pChecked
     * @returns {boolean}
     */
    toggleTabularRowSelection(pViewHash: string, pGroupIndex: number | string, pRowKey: number | string, pChecked: boolean): boolean;
    /**
     * Inline-handler entry point: toggles a column's selection state. Called by the
     * checkbox rendered in the column-selection header row.
     *
     * @param {string} pViewHash
     * @param {number|string} pGroupIndex
     * @param {number|string} pColumnIndex
     * @param {boolean} pChecked
     * @returns {boolean}
     */
    toggleTabularColumnSelection(pViewHash: string, pGroupIndex: number | string, pColumnIndex: number | string, pChecked: boolean): boolean;
    /**
     * Re-applies selection highlight classes from the stored selection arrays.
     * Run after a (re)render rebuilds the table DOM and the classes would
     * otherwise be lost. No-op when no highlight class is configured.
     *
     * @param {Object} pView
     * @param {Object} pGroup
     */
    _reapplyTabularSelectionHighlights(pView: any, pGroup: any): void;
    /**
     * Normalize a Group.ColumnChooser config value.
     *
     * Accepts `true` (use all defaults) or an object
     * `{ Enabled, DataAddress, ButtonLabel, DefaultHiddenColumns }`. Returns null
     * when the chooser is not enabled (the feature is strictly opt-in).
     *
     * - `DataAddress` — address (relative to the form's marshal destination) where
     *   the array of hidden column hashes is stored, so it persists with the form data.
     * - `ButtonLabel` — text for the trigger button above the table.
     * - `DefaultHiddenColumns` — column hashes hidden until the user changes them
     *   (merged with any descriptor-level `PictForm.TabularDefaultHidden` flags).
     *
     * @param {boolean|Object} pConfigValue
     * @param {string} pDefaultDataAddress
     * @returns {{DataAddress: string, ButtonLabel: string, DefaultHiddenColumns: Array<string>}|null}
     */
    _normalizeColumnChooserConfig(pConfigValue: boolean | any, pDefaultDataAddress: string): {
        DataAddress: string;
        ButtonLabel: string;
        DefaultHiddenColumns: Array<string>;
    } | null;
    /**
     * Lazily normalize (and cache on the group) the ColumnChooser config. The
     * template bake re-normalizes each pass; this accessor covers code paths
     * (marshal hooks, inline handlers) that may run against a group whose
     * template hasn't been baked yet.
     *
     * @param {Object} pGroup
     * @returns {{DataAddress: string, ButtonLabel: string, DefaultHiddenColumns: Array<string>}|null}
     */
    _ensureTabularColumnChooserConfig(pGroup: any): {
        DataAddress: string;
        ButtonLabel: string;
        DefaultHiddenColumns: Array<string>;
    } | null;
    /**
     * The absolute address (within the form's marshal destination) of the
     * chooser's hidden-column-hash array.
     *
     * @param {Object} pView
     * @param {{DataAddress: string}} pChooserConfig
     * @returns {string}
     */
    _getTabularHiddenColumnsAddress(pView: any, pChooserConfig: {
        DataAddress: string;
    }): string;
    /**
     * The set of column hashes hidden BY DEFAULT for a group: the chooser
     * config's DefaultHiddenColumns plus every descriptor flagged
     * `PictForm.TabularDefaultHidden`. These apply only until the user changes
     * column visibility (which writes an explicit array into the form data).
     *
     * @param {Object} pGroup
     * @returns {Array<string>}
     */
    _getTabularColumnChooserDefaultHidden(pGroup: any): Array<string>;
    /**
     * The EFFECTIVE set of chooser-hidden column hashes for a group: the array
     * stored in the form data when the user has made choices, otherwise the
     * configured defaults. Returns null when the chooser is not enabled, so
     * callers can use a single falsy check to keep the legacy code path intact.
     *
     * @param {Object} pView
     * @param {Object} pGroup
     * @returns {Set<string>|null}
     */
    _getTabularColumnChooserHiddenSet(pView: any, pGroup: any): Set<string> | null;
    /**
     * A canonical string for the group's effective hidden-column set, used to
     * detect (on marshal) that loaded form data carries different column
     * visibility than the table template was baked with.
     *
     * @param {Object} pView
     * @param {Object} pGroup
     * @returns {string}
     */
    _getTabularColumnChooserStateKey(pView: any, pGroup: any): string;
    /**
     * The columns the chooser can manage, in manifest order. Statically hidden
     * descriptors (`PictForm.TabularHidden`) are never choosable and never
     * listed. Each entry carries the descriptor's manifest index so inline
     * handlers can address it without string-escaping concerns.
     *
     * @param {Object} pView
     * @param {Object} pGroup
     * @returns {Array<{Key: string, Name: string, ColumnIndex: number, Visible: boolean}>}
     */
    _getTabularChoosableColumns(pView: any, pGroup: any): Array<{
        Key: string;
        Name: string;
        ColumnIndex: number;
        Visible: boolean;
    }>;
    /**
     * DOM element id for one of the chooser's baked elements (TRIGGER / POPOVER),
     * namespaced by form and group so multiple tabular groups can each carry
     * their own chooser.
     *
     * @param {Object} pView
     * @param {Object} pGroup
     * @param {string} pElement
     * @returns {string}
     */
    _getTabularColumnChooserElementId(pView: any, pGroup: any, pElement: string): string;
    /**
     * Builds the chooser bar baked above the table: a right-aligned trigger
     * button (with a "n hidden" hint when columns are hidden) plus the empty
     * popover container the open action renders into.
     *
     * @param {Object} pView
     * @param {Object} pGroup
     * @returns {string}
     */
    _buildTabularColumnChooserBarHTML(pView: any, pGroup: any): string;
    /**
     * Renders the chooser popover's content (backdrop + panel of checkbox rows +
     * reset footer) into its baked container. Runs on open and after each toggle
     * (the table re-render replaces the popover element, so its content must be
     * repainted to keep the menu open across toggles).
     *
     * @param {Object} pView
     * @param {Object} pGroup
     */
    _renderTabularColumnChooserPopover(pView: any, pGroup: any): void;
    /**
     * Reflect the chooser popover's open/closed state on its container element,
     * positioning it against the trigger when opening.
     *
     * @param {Object} pView
     * @param {Object} pGroup
     * @param {boolean} pOpen
     */
    _paintTabularColumnChooserOpenState(pView: any, pGroup: any, pOpen: boolean): void;
    /**
     * Position the (fixed) chooser popover against its trigger button, flipping
     * above when the room below is genuinely cramped — same approach as the
     * recordset's column chooser, so no ancestor overflow can clip it.
     *
     * @param {Object} pView
     * @param {Object} pGroup
     * @param {HTMLElement} pPopover
     */
    _positionTabularColumnChooserPopover(pView: any, pGroup: any, pPopover: HTMLElement): void;
    /**
     * Rebuild + re-render a tabular view and re-marshal the form data into it.
     * Same tail as sortTabularColumn: the rebuild re-bakes the table template
     * (column set, headers, chooser bar), the render repaints, the marshal
     * pushes current values back into the freshly built inputs.
     *
     * @param {Object} pView
     */
    _rebuildTabularGroupView(pView: any): void;
    /**
     * Inline-handler entry point: opens/closes a group's column chooser popover
     * (the trigger button's handler). Open/closed is derived from the popover's
     * DOM class, not an instance flag — a re-render replaces the popover element
     * (visually closed), so a flag would go stale and demand a double-click.
     *
     * @param {string} pViewHash
     * @param {number|string} pGroupIndex
     * @returns {boolean}
     */
    toggleTabularColumnChooser(pViewHash: string, pGroupIndex: number | string): boolean;
    /**
     * Inline-handler entry point: closes a group's column chooser popover (the
     * backdrop's handler).
     *
     * @param {string} pViewHash
     * @param {number|string} pGroupIndex
     * @returns {boolean}
     */
    closeTabularColumnChooser(pViewHash: string, pGroupIndex: number | string): boolean;
    /**
     * Inline-handler entry point: shows/hides one column (a chooser checkbox's
     * handler). Writes the updated hidden-hash array into the form data (so it
     * persists with a save), rebuilds the table template without the column,
     * re-renders, re-marshals, then re-opens the popover the re-render closed.
     *
     * Hiding never touches the underlying record data — the column's values
     * stay in the record set and reappear when the column is shown again.
     *
     * Refuses to hide the last visible column (the checkbox snaps back).
     *
     * @param {string} pViewHash
     * @param {number|string} pGroupIndex
     * @param {number|string} pColumnIndex - The column's manifest index (stable within a bake).
     * @param {boolean} pVisible - true to show the column, false to hide it.
     * @returns {boolean}
     */
    toggleTabularColumnVisibility(pViewHash: string, pGroupIndex: number | string, pColumnIndex: number | string, pVisible: boolean): boolean;
    /**
     * Inline-handler entry point: resets a group's column visibility to its
     * configured defaults (the reset footer button's handler). Writes the
     * default hidden set into the form data explicitly — the user interacted,
     * so the state should serialize deterministically with a save.
     *
     * @param {string} pViewHash
     * @param {number|string} pGroupIndex
     * @returns {boolean}
     */
    resetTabularColumnVisibility(pViewHash: string, pGroupIndex: number | string): boolean;
}
import libPictSectionGroupLayout = require("../Pict-Provider-DynamicLayout.js");
//# sourceMappingURL=Pict-Layout-Tabular.d.ts.map