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
}
import libPictSectionGroupLayout = require("../Pict-Provider-DynamicLayout.js");
//# sourceMappingURL=Pict-Layout-Tabular.d.ts.map