export = FacetFilterInputHandler;
/**
 * FacetFilter input provider.
 *
 * Keeps a set of inputs that choose from one shared join list (their `Facet` ListFilterRules name the same
 * `JoinListAddress`) mutually consistent when one of them changes.  In a tabular group the set is the
 * facet inputs in the changed row only; outside a table it is the facet inputs in the same view.
 *
 * On a change it runs, before the form solves:
 *   1. ClearInvalid (default true): walking the siblings in column order, a sibling whose value no longer
 *      appears in any join record agreeing with the changed value (and the siblings already kept) is cleared.
 *   2. AutoFillSingle (default true): an empty sibling left with exactly one allowed value takes it, repeated
 *      until nothing changes.  The changed input itself is never filled, so clearing it sticks.
 *   3. CarryFields ({ "<row address>": "<join record address>" }): on a sibling that holds a value, the join
 *      record its facet set now identifies (exactly one agreeing record) is copied into the row; with no value,
 *      or no single record, those row fields are cleared.
 *
 * It only acts on a user change, never on load or marshal, so a saved value -- carried fields included -- is
 * never rewritten by opening a document or by the join list changing later.  Narrowing the offered options
 * is the `Facet` rule's job in ListDistilling.filterList.
 *
 *   ListFilterRules: [ { FilterType: "Facet", JoinListAddress: "AppData.Graph", JoinListAddressGlobal: true, JoinListValueAddress: "Colour" } ],
 *   Providers: [ "Pict-Input-FacetFilter" ]
 *
 * @class
 * @extends libPictSectionInputExtension
 * @memberof providers.inputs
 */
declare class FacetFilterInputHandler extends libPictSectionInputExtension {
    /** @type {import('pict')} */
    pict: import("pict");
    reconciling: boolean;
    /**
     * @param {Object} pView
     * @param {Record<string, any>} pInput
     * @param {number|undefined} pRowIndex - undefined outside a table
     * @param {any} pValue
     */
    setFacetValue(pView: any, pInput: Record<string, any>, pRowIndex: number | undefined, pValue: any): void;
    /**
     * Reconciles the changed input's facet siblings; see the class description.
     *
     * @param {Object} pView
     * @param {Record<string, any>} pInput - the input the user changed
     * @param {number} [pRowIndex]
     * @return {Array<string>} hashes of the siblings whose value was changed
     */
    reconcileFacets(pView: any, pInput: Record<string, any>, pRowIndex?: number): Array<string>;
    /**
     * @param {Object} pView
     * @param {Record<string, any>} pInput - the input the user changed
     * @param {number} [pRowIndex]
     * @return {Array<string>} hashes of the siblings whose value was changed
     */
    reconcileFacetSiblings(pView: any, pInput: Record<string, any>, pRowIndex?: number): Array<string>;
    /**
     * Copies a sibling's CarryFields from the one join record its facet set identifies, or clears them.
     *
     * @param {Object} pView
     * @param {{ Input: Record<string, any>, Rule: Record<string, any>, Value: any }} pSibling
     * @param {number|undefined} pRowIndex
     * @param {Array<{ Input: Record<string, any>, Rule: Record<string, any>, Value: any }>} pSiblings
     */
    carryFields(pView: any, pSibling: {
        Input: Record<string, any>;
        Rule: Record<string, any>;
        Value: any;
    }, pRowIndex: number | undefined, pSiblings: Array<{
        Input: Record<string, any>;
        Rule: Record<string, any>;
        Value: any;
    }>): void;
    /**
     * @param {Object} pView - The view object.
     * @param {Object} pInput - The input object.
     * @param {any} pValue - The new value.
     * @param {string} pHTMLSelector - The HTML selector.
     * @param {string} pTransactionGUID - The transaction GUID, if any.
     * @returns {any}
     */
    onDataChange(pView: any, pInput: any, pValue: any, pHTMLSelector: string, pTransactionGUID: string): any;
    /**
     * @param {Object} pView - The view object.
     * @param {Object} pInput - The input object.
     * @param {any} pValue - The new value.
     * @param {string} pHTMLSelector - The HTML selector.
     * @param {number} pRowIndex - The index of the row.
     * @param {string} pTransactionGUID - The transaction GUID, if any.
     * @returns {any}
     */
    onDataChangeTabular(pView: any, pInput: any, pValue: any, pHTMLSelector: string, pRowIndex: number, pTransactionGUID: string): any;
}
declare namespace FacetFilterInputHandler {
    export { default_configuration };
}
import libPictSectionInputExtension = require("../Pict-Provider-InputExtension.js");
declare namespace default_configuration {
    let ProviderIdentifier: string;
    let AutoInitialize: boolean;
    let AutoInitializeOrdinal: number;
    let AutoSolveWithApp: boolean;
}
//# sourceMappingURL=Pict-Provider-Input-FacetFilter.d.ts.map