export = PictDynamicFormsSolverBehaviors;
/**
 * Provides functions available in the solver for manipulating the form.
 * Such as showing/hiding sections, inputs, groups.  Coloring inputs,
 * sections, groups.  Applying styles to inputs, sections, groups.
 * Extends the `libPictProvider` class.
 */
declare class PictDynamicFormsSolverBehaviors extends libPictProvider {
    /** @type {any} */
    options: any;
    /** @type {import('pict') & { newManyfest: (options: any) => import('manyfest') }} */
    pict: import("pict") & {
        newManyfest: (options: any) => import("manyfest");
    };
    /** @type {string} */
    cssHideSectionClass: string;
    cssHideGroupClass: string;
    /** @type {string} */
    cssTabularRowHighlightClass: string;
    /** @type {string} */
    cssTabularColumnHighlightClass: string;
    cssSnippet: string;
    solverOrdinalMap: {};
    setCSSSnippets(pCSSHideClass: any, pCSSSnippet: any): void;
    cssHideClass: any;
    addSolverFunction(pExpressionParser: any, pFunctionName: any, pFunctionAddress: any, pFunctionComment: any, pAddressParameterIndices: any): void;
    runSolvers(): void;
    injectBehaviors(pExpressionParser: any): boolean;
    /**
     * Returns a new array containing the union of two input arrays, removing duplicate values.
     *
     * @param {Array} pArrayA - The first array to union.
     * @param {Array} pArrayB - The second array to union.
     * @returns {Array} A new array containing unique elements from both input arrays.
     */
    unionArrays(pArrayA: any[], pArrayB: any[]): any[];
    /**
     * Returns an array containing the elements that are present in the first array but not in the second array.
     *
     * @param {Array} pArrayA - The array from which to subtract elements.
     * @param {Array} pArrayB - The array containing elements to exclude from the first array.
     * @returns {Array} An array of elements found in pArrayA but not in pArrayB.
     */
    differenceArrays(pArrayA: any[], pArrayB: any[]): any[];
    /**
     * Returns a new array containing only the unique elements from the input array.
     *
     * @param {Array} pArray - The array from which to extract unique elements.
     * @returns {Array} A new array with duplicate values removed.
     */
    uniqueArray(pArray: any[]): any[];
    /**
     * Sorts the given array in place using the default sort order.
     * If the input is not an array, returns an empty array.
     *
     * @param {Array} pArray - The array to be sorted.
     * @returns {Array} The sorted array, or an empty array if input is not an array.
     */
    sortArray(pArray: any[]): any[];
    /**
     * @param {number|string} pSolverOrdinal
     * @param {boolean|string|number} pEnabled
     */
    setSolverOrdinalEnabled(pSolverOrdinal: number | string, pEnabled: boolean | string | number): void;
    /**
     * @param {number|string} pSolverOrdinal
     */
    enableSolverOrdinal(pSolverOrdinal: number | string): void;
    /**
     * @param {number|string} pSolverOrdinal
     */
    disableSolverOrdinal(pSolverOrdinal: number | string): void;
    /**
     * @param {number|string} pSolveOrdinal
     *
     * @return {boolean}
     */
    checkSolverOrdinalEnabled(pSolveOrdinal: number | string): boolean;
    getSectionSelector(pSectionFormID: any): string;
    setSectionVisibility(pSectionHash: any, pVisible: any): boolean;
    /**
     * Shows multiple sections by their hash identifiers.
     *
     * Iterates over the provided array of section hash values and calls `showSection`
     * for each one to display the corresponding section.
     *
     * @param {string | Array<string>} pSectionHashArray - An array of section hash strings to be shown.
     */
    showSections(pSectionHashArray: string | Array<string>): void;
    /**
     * Hides multiple sections specified by their hash values.
     *
     * Iterates over the provided array of section hashes and hides each section
     * by calling the `hideSection` method for each hash.
     *
     * @param {string | Array<string>} pSectionHashArray - An array of section hash strings to be hidden.
     */
    hideSections(pSectionHashArray: string | Array<string>): void;
    hideSection(pSectionHash: any): boolean;
    showSection(pSectionHash: any): boolean;
    getGroupSelector(pSectionFormID: any, pGroupHash: any): string;
    setGroupVisibility(pSectionHash: any, pGroupHash: any, pVisible: any): boolean;
    hideGroup(pSectionHash: any, pGroupHash: any): boolean;
    showGroup(pSectionHash: any, pGroupHash: any): boolean;
    /**
     * Causes a tabular section to refresh its display
     *
     * @param {string} pSectionHash - The hash of the section containing the tabular group
     * @param {string} pGroupHash - The hash of the tabular group
     *
     * @return {void}
     */
    refreshTabularSection(pSectionHash: string, pGroupHash: string): void;
    /**
     * Set the length of a tabular set
     * @param {string} pSectionHash - The hash of the section containing the tabular group
     * @param {string} pGroupHash - The hash of the tabular group
     * @param {number|string} pLength - The desired length of the tabular set
     * @param {boolean|string} pDeleteExtraRows - If true, will delete extra rows from the end if the length is less than current
     * @returns
     */
    setTabularRowLength(pSectionHash: string, pGroupHash: string, pLength: number | string, pDeleteExtraRows?: boolean | string): boolean;
    generateHTMLHexColor(pRed: any, pGreen: any, pBlue: any): string;
    colorSectionBackground(pSectionHash: any, pColor: any, pApplyChange: any): boolean;
    colorGroupBackground(pSectionHash: any, pGroupHash: any, pColor: any, pApplyChange: any): boolean;
    /**
     * Colors an input background or its container with a HTML hex color (e.g. #FF0000 for red).
     * @param {string} pSectionHash - The hash of the section containing the input.
     * @param {string} pInputHash - The hash of the input to color.
     * @param {string} pColor - The HTML hex color to apply (e.g. #FF0000 for red).
     * @param {string} pApplyChange - If "0", the change will not be applied.
     * @param {string} [pCSSSelector] - Optional. If provided, the color will be applied to the closest element matching this selector instead of the input itself.
     * @returns {boolean} - Returns true if the color was applied successfully or if the change was skipped for pApplyChange equal to "0", false otherwise.
     */
    colorInputBackground(pSectionHash: string, pInputHash: string, pColor: string, pApplyChange: string, pCSSSelector?: string): boolean;
    /**
     * Colors an input background or its container with a HTML hex color (e.g. #FF0000 for red).
     * @param {string} pSectionHash - The hash of the section containing the input.
     * @param {string} pGroupHash - The hash of the group containing the input.
     * @param {number} pRowIndex - The index of the row.
     * @param {string} pInputHash - The hash of the input to color.
     * @param {string} pColor - The HTML hex color to apply (e.g. #FF0000 for red).
     * @param {string} pApplyChange - If "0", the change will not be applied.
     * @param {string} [pCSSSelector] - Optional. If provided, the color will be applied to the closest element matching this selector instead of the input itself.
     * @param {string} [pElementIDPrefix] - Optional. The prefix for the tabular element ID. Default is 'TABULAR-DATA-'.
     * @returns {boolean} - Returns true if the color was applied successfully or if the change was skipped for pApplyChange equal to "0", false otherwise.
     */
    colorInputBackgroundTabular(pSectionHash: string, pGroupHash: string, pInputHash: string, pRowIndex: number, pColor: string, pApplyChange: string, pCSSSelector?: string, pElementIDPrefix?: string): boolean;
    /**
     * @param {Array<HTMLElement>} pElementSet - The element to color.
     * @param {string} pColor - The HTML hex color to apply (e.g. #FF0000 for red).
     * @param {string} [pCSSSelector] - Optional. If provided, the color will be applied to the closest element matching this selector instead of the input itself.
     *
     * @returns {boolean}
     */
    colorElementBackground(pElementSet: Array<HTMLElement>, pColor: string, pCSSSelector?: string): boolean;
    /**
     * Interprets a solver-supplied 1/0 (or true/false) flag.
     *
     * Solver numbers arrive as arbitrary-precision strings, so a plain truthiness
     * check would treat the string "0" as true. This normalizes the common
     * "off" representations to false and everything else to true.
     *
     * @param {any} pFlag
     * @returns {boolean}
     */
    isSolverFlagEnabled(pFlag: any): boolean;
    /**
     * Resolves the DOM selector for a tabular group's container div.
     *
     * The tabular group div carries `id="GROUP-<formID>-<groupHash>"` (the same
     * convention the non-tabular group layout uses), so highlight/color solvers
     * can scope their cell queries to a single group.
     *
     * @param {string} pSectionHash - The hash of the section containing the group.
     * @param {string} pGroupHash - The hash of the tabular group.
     * @returns {string|null} A CSS selector for the group container, or null if unresolved.
     */
    getTabularGroupSelector(pSectionHash: string, pGroupHash: string): string | null;
    /**
     * Adds (pApplyFlag truthy) or removes (pApplyFlag falsy) a highlight class on
     * every cell of a tabular row -- the row labels, editing controls and data
     * cells all get the class because it lands on the row's `<tr>`.
     *
     * @param {string} pSectionHash - The hash of the section containing the tabular group.
     * @param {string} pGroupHash - The hash of the tabular group.
     * @param {number|string} pRowIndex - The zero-based row index.
     * @param {number|string|boolean} pApplyFlag - 1/0 (or true/false) -- add or remove the class.
     * @param {string} [pHighlightClass] - Optional override for the class name.
     * @returns {boolean}
     */
    highlightTabularRow(pSectionHash: string, pGroupHash: string, pRowIndex: number | string, pApplyFlag: number | string | boolean, pHighlightClass?: string): boolean;
    /**
     * Adds (pApplyFlag truthy) or removes (pApplyFlag falsy) a highlight class on
     * every cell of a tabular column -- both the `<th>` header cell and every
     * `<td>` data cell that carries the matching `data-tabular-column-index`.
     *
     * @param {string} pSectionHash - The hash of the section containing the tabular group.
     * @param {string} pGroupHash - The hash of the tabular group.
     * @param {number|string} pColumnIndex - The column's input index (descriptor InputIndex).
     * @param {number|string|boolean} pApplyFlag - 1/0 (or true/false) -- add or remove the class.
     * @param {string} [pHighlightClass] - Optional override for the class name.
     * @returns {boolean}
     */
    highlightTabularColumn(pSectionHash: string, pGroupHash: string, pColumnIndex: number | string, pApplyFlag: number | string | boolean, pHighlightClass?: string): boolean;
    /**
     * Sets (pApplyFlag truthy) or clears (pApplyFlag falsy) an inline background
     * color on every data cell of a tabular row.
     *
     * The color is applied with `important` priority so it beats both host
     * table-striping CSS and the highlight classes.
     *
     * @param {string} pSectionHash - The hash of the section containing the tabular group.
     * @param {string} pGroupHash - The hash of the tabular group.
     * @param {number|string} pRowIndex - The zero-based row index.
     * @param {string} pColor - The HTML color to apply (e.g. #FF0000).
     * @param {number|string|boolean} pApplyFlag - 1/0 (or true/false) -- apply or clear the color.
     * @returns {boolean}
     */
    colorTabularRow(pSectionHash: string, pGroupHash: string, pRowIndex: number | string, pColor: string, pApplyFlag: number | string | boolean): boolean;
    /**
     * Sets (pApplyFlag truthy) or clears (pApplyFlag falsy) an inline background
     * color on every cell of a tabular column -- header `<th>` plus all data `<td>`.
     *
     * @param {string} pSectionHash - The hash of the section containing the tabular group.
     * @param {string} pGroupHash - The hash of the tabular group.
     * @param {number|string} pColumnIndex - The column's input index (descriptor InputIndex).
     * @param {string} pColor - The HTML color to apply (e.g. #FF0000).
     * @param {number|string|boolean} pApplyFlag - 1/0 (or true/false) -- apply or clear the color.
     * @returns {boolean}
     */
    colorTabularColumn(pSectionHash: string, pGroupHash: string, pColumnIndex: number | string, pColor: string, pApplyFlag: number | string | boolean): boolean;
    /**
     * Gets a value from the global form data by hash, falling back to address resolution
     * using the global manyfest from the metacontroller.
     *
     * @param {string} pHash - The hash to resolve from the global form data.
     * @returns {any} The value at the hash, or undefined if not found.
     */
    getGlobalFormData(pHash: string): any;
    /**
     * Resolves a value from the global form data by manyfest address,
     * using the global manyfest from the metacontroller and the viewMarshalDestination.
     *
     * @param {string} pAddress - The manyfest address to resolve from the global form data.
     * @returns {any} The value at the address, or undefined if not found.
     */
    resolveGlobalFormData(pAddress: string): any;
    /**
     * Gets a value from a specific section's form data by hash or address.
     *
     * Uses the section view's sectionManifest and getMarshalDestinationObject
     * to properly resolve the value within the section's scope.
     *
     * @param {string} pSectionHash - The hash of the section to get data from.
     * @param {string} pHashOrAddress - The hash or address to resolve within the section.
     * @returns {any} The value at the hash/address, or undefined if not found.
     */
    getSectionFormData(pSectionHash: string, pHashOrAddress: string): any;
    /**
     * Gets a value from a specific tabular section's row data by hash or address.
     *
     * Resolves the tabular record set from the section view, then gets the specific
     * row's value using the group's supportingManifest.
     *
     * @param {string} pSectionHash - The hash of the section containing the tabular group.
     * @param {string} pGroupHash - The hash of the tabular group.
     * @param {number|string} pRowIndex - The index of the row (may be string due to arbitrary precision).
     * @param {string} pHashOrAddress - The hash or address to resolve within the row.
     * @returns {any} The value at the hash/address in the row, or undefined if not found.
     */
    getSectionTabularFormData(pSectionHash: string, pGroupHash: string, pRowIndex: number | string, pHashOrAddress: string): any;
    logValues(...args: any[]): any;
    /**
     * Resolves the comprehension destination object, creating intermediate objects along the configured
     * address if they don't exist.  The address is read from
     * `PictFormMetacontroller.comprehensionDestinationAddress` (default `AppData.FormEntityComprehensions`)
     * and resolved against the pict instance, so callers can target any subtree (`AppData.*`, `Bundle.*`, ...).
     *
     * @returns {Record<string, any>|null} The destination object (mutable), or null if the address resolves
     * to a non-object value the function can't safely write into (e.g. a number).
     */
    resolveComprehensionDestination(): Record<string, any> | null;
    /**
     * Writes a single property/value into the configured comprehension destination, nested as
     * `Context -> Entity -> GUID -> Property = Value`.
     *
     * `Context` is a manyfest address (dot-separated) so dotted contexts like
     * `OnApprovalAction.Approve` produce nested context branches.  `Entity`, `GUID`, and `Property`
     * are treated as opaque property names -- dots in them are NOT interpreted as nesting (so an
     * entity GUID like `0x73278432987` lands as a single key).
     *
     * Successive calls to the same `(Context, Entity, GUID)` accumulate properties on the same
     * record.  Successive calls to the same `(Context, Entity, GUID, Property)` overwrite.
     *
     * The destination address is configured on the metacontroller via
     * `comprehensionDestinationAddress` (default `AppData.FormEntityComprehensions`) -- see
     * `docs/Comprehensions.md`.
     *
     * @param {string} pContext - The comprehension context address (e.g. `"OnSave"`, `"OnApprovalAction.Approve"`).
     * @param {string} pEntity - The entity name (e.g. `"Book"`).
     * @param {string} pGUID - The external GUID for the record (e.g. `"0x73278432987"`).
     * @param {string} pProperty - The property to set on the record (e.g. `"Title"`).
     * @param {any} pValue - The value to write.
     *
     * @returns {any} `pValue` on success, `undefined` if the call was a no-op (invalid args / unwritable destination).
     */
    addComprehensionEntity(pContext: string, pEntity: string, pGUID: string, pProperty: string, pValue: any): any;
}
declare namespace PictDynamicFormsSolverBehaviors {
    export { _DefaultProviderConfiguration as default_configuration };
}
import libPictProvider = require("pict-provider");
/** @type {Record<string, any>} */
declare const _DefaultProviderConfiguration: Record<string, any>;
//# sourceMappingURL=Pict-Provider-DynamicFormSolverBehaviors.d.ts.map