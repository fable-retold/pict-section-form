export = DynamicTabularData;
/**
 * @typedef {Object} ElementDescriptor
 * @property {string} Hash - The hash of the element.
 */
/**
 * The DynamicTabularData class is a provider that translates simple list entries into arrays of entries ready to use in drop-down lists and such
 */
declare class DynamicTabularData extends libPictProvider {
    /** @type {any} */
    options: any;
    /** @type {import('pict')} */
    pict: import("pict");
    /**
     * Retrieves the tabular record set from the specified view and group index.
     *
     * @param {Object} pView - The view object.
     * @param {number} pGroupIndex - The index of the group.
     * @returns {Array|Object|boolean} - The tabular record set if it exists, otherwise false.
     */
    getTabularRecordSet(pView: any, pGroupIndex: number): any[] | any | boolean;
    /**
     * Retrieves the tabular record input from the specified view, group, and input indexes.
     *
     * @param {Object} pView - The view object.
     * @param {number} pGroupIndex - The index of the group.
     * @param {number} pInputIndex - The index of the input.
     * @returns {ElementDescriptor|boolean} The tabular record input or false if the group is invalid.
     */
    getTabularRecordInput(pView: any, pGroupIndex: number, pInputIndex: number): ElementDescriptor | boolean;
    /**
     * Retrieves the tabular record input from the specified view, group, and input indexes.
     *
     * @param {Object} pView - The view object.
     * @param {number} pGroupHash - The index of the group.
     * @param {number} pInputHash - The index of the input.
     * @returns {ElementDescriptor|boolean} The tabular record input or false if the group is invalid.
     */
    getTabularRecordInputByHash(pView: any, pGroupHash: number, pInputHash: number): ElementDescriptor | boolean;
    /**
     * Retrieves tabular record data based on the provided parameters.
     *
     * @param {Object} pView - The view object.
     * @param {number} pGroupIndex - The index of the group.
     * @param {string} pRowIdentifier - The identifier of the row.
     * @returns {boolean|Object} - The tabular record data or false if not found.
     */
    getTabularRecordData(pView: any, pGroupIndex: number, pRowIdentifier: string): boolean | any;
    /**
     * Creates a dynamic table row for the given view and group index.
     *
     * @param {Object} pView - The view object.
     * @param {number} pGroupIndex - The index of the group.
     */
    createDynamicTableRow(pView: any, pGroupIndex: number): void;
    /**
     * Creates a dynamic table row for the given view and group index without firing render or marshal events.
     *
     * @param {Object} pView - The view object.
     * @param {number} pGroupIndex - The index of the group.
     */
    createDynamicTableRowWithoutEvents(pView: any, pGroupIndex: number): void;
    /**
     * Sets the index of a dynamic table row in a view.
     *
     * @param {Object} pView - The view object.
     * @param {number} pGroupIndex - The index of the group.
     * @param {number|string} pRowIndex - The current index of the row.
     * @param {number} pNewRowIndex - The new index to move the row to.
     * @returns {boolean} - Returns false if the index is out of bounds, otherwise returns undefined.
     */
    setDynamicTableRowIndex(pView: any, pGroupIndex: number, pRowIndex: number | string, pNewRowIndex: number): boolean;
    /**
     * Moves a dynamic table row down within a view.
     *
     * @param {Object} pView - The view containing the dynamic table.
     * @param {number} pGroupIndex - The index of the group containing the row.
     * @param {number|string} pRowIndex - The index of the row to be moved.
     * @returns {boolean} - Returns true if the row was successfully moved, false otherwise.
     */
    moveDynamicTableRowDown(pView: any, pGroupIndex: number, pRowIndex: number | string): boolean;
    /**
     * Moves a dynamic table row up.
     *
     * @param {Object} pView - The view object.
     * @param {number} pGroupIndex - The index of the group.
     * @param {number|string} pRowIndex - The index of the row to be moved.
     * @returns {boolean} Returns true if the row was moved successfully, false otherwise.
     */
    moveDynamicTableRowUp(pView: any, pGroupIndex: number, pRowIndex: number | string): boolean;
    /**
     * Deletes a dynamic table row from the specified view.
     *
     * @param {Object} pView - The view from which to delete the row.
     * @param {number} pGroupIndex - The index of the group containing the row.
     * @param {number|string} pRowIndex - The index or key of the row to delete.
     * @returns {boolean} - Returns true if the row was successfully deleted, false otherwise.
     */
    deleteDynamicTableRow(pView: any, pGroupIndex: number, pRowIndex: number | string): boolean;
    /**
     * Rebuild every OTHER section-form view whose DynamicColumns are sourced from
     * pSourceRecordSetAddress: re-resolve their generated columns and rebuild their
     * template + DOM. Call this in the RENDER phase (after a source row was added or
     * removed, before solving + marshaling) so dependent tables paint their column
     * changes up front instead of mid-marshal. Idempotent and safe when there are no
     * dependent views (it simply finds none).
     *
     * @param {string} pSourceRecordSetAddress - RecordSetAddress whose rows drive the columns.
     */
    _rebuildDependentDynamicColumnViews(pSourceRecordSetAddress: string): void;
    /**
     * For position-keyed DynamicColumns (KeyBy: "Position") sourced from
     * pSourceRecordSetAddress, shift each dependent row's positional cells down past
     * a just-removed source index so values stay aligned with their column. Cells are
     * addressed by resolving the generator's InformaryDataAddressTemplate with the
     * synthetic { __Index } record, the same way columns are generated. No-op for
     * value-keyed generators (their data stays attached to the stable value).
     *
     * @param {string} pSourceRecordSetAddress - RecordSetAddress of the deleted-from source.
     * @param {number} pDeletedIndex - Index of the source row that was removed.
     * @param {number} pOriginalLength - Source row count BEFORE the removal.
     */
    _spliceDependentPositionalColumns(pSourceRecordSetAddress: string, pDeletedIndex: number, pOriginalLength: number): void;
}
declare namespace DynamicTabularData {
    export { _DefaultProviderConfiguration as default_configuration, ElementDescriptor };
}
import libPictProvider = require("pict-provider");
/** @type {Record<string, any>} */
declare const _DefaultProviderConfiguration: Record<string, any>;
type ElementDescriptor = {
    /**
     * - The hash of the element.
     */
    Hash: string;
};
//# sourceMappingURL=Pict-Provider-DynamicTabularData.d.ts.map