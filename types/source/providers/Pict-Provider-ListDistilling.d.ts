export = PictListDistilling;
/**
 * The PictListDistilling class is a provider that filters lists based on input rules.
 */
declare class PictListDistilling extends libPictProvider {
    /** @type {import('pict')} */
    pict: import("pict");
    /** @type {import('pict')} */
    fable: import("pict");
    /**
      * Filter a list of options based on the filtering rules in a dynamic form input.
      *
      * Example Configuration:
      * ...
            "ListFilterRules": [
                    {
                        "Filter": "Colour Entry Filter",
                        "FilterType": "Explicit",
                        "FilterValueComparison": "==",
                        "FilterValueAddress": "Listopia.Filters.Colour",
                        "IgnoreEmptyValue": true
                    },
                    {
                        "Filter": "Colour List Distilling Filter",
                        "FilterType": "CrossMap",
                        "JoinListAddress": "View.sectionDefinition.Intersections.Colors.FruitSelectionColorsJoin",
                        "JoinListAddressGlobal": true,
                        "JoinListValueAddress": "GUIDColors",
                        "ExternalValueAddress": "GUIDFruitSelection",
                        "FilterToValueAddress": "Listopia.Fruit",
                        "IgnoreEmpty": true
                    }
                ],
      * ...
      *
      * @param {Object} pView - The pict view the list is within
      * @param {*} pInput - The input within the dynamic forms view
      * @param {*} pList - The raw list of options to filter
      * @param {number} [pRowIndex] - The tabular row the list is for; Facet rules read sibling values from this row
      * @returns
      */
    filterList(pView: any, pInput: any, pList: any, pRowIndex?: number): any;
    /**
     * @param {Record<string, any>} pInput
     * @return {Record<string, any>|null} the input's Facet rule, if it has one
     */
    getFacetRule(pInput: Record<string, any>): Record<string, any> | null;
    /**
     * @param {Object} pView
     * @param {Record<string, any>} pRule
     * @return {Array<any>} the join list a Facet rule distills, as an array
     */
    getFacetJoinList(pView: any, pRule: Record<string, any>): Array<any>;
    /**
     * Every input that shares a Facet rule's join list with pInput, in the same tabular row (or the same
     * view, outside a table), with the value it currently holds.  pInput itself is included.
     *
     * @param {Object} pView
     * @param {Record<string, any>} pInput
     * @param {number} [pRowIndex]
     * @return {Array<{ Input: Record<string, any>, Rule: Record<string, any>, Value: any }>}
     */
    getFacetSiblings(pView: any, pInput: Record<string, any>, pRowIndex?: number): Array<{
        Input: Record<string, any>;
        Rule: Record<string, any>;
        Value: any;
    }>;
    /**
     * @param {any} pValue
     * @return {boolean}
     */
    isEmptyFacetValue(pValue: any): boolean;
    /**
     * The values a Facet rule's dropdown offers: the allowed values (narrowed per the rule's NarrowBy), plus
     * the input's own current value unless KeepCurrentValue is false, so a filter never hides what the row
     * already stores (a saved choice that has since fallen out of scope still shows).
     *
     * @param {Object} pView
     * @param {Record<string, any>} pInput
     * @param {Record<string, any>} pRule - the input's Facet rule
     * @param {number} [pRowIndex]
     * @return {Set<string>}
     */
    getFacetOfferedValues(pView: any, pInput: Record<string, any>, pRule: Record<string, any>, pRowIndex?: number): Set<string>;
    /**
     * @param {any} pJoinValue - the value on the join record
     * @param {string} pOperator - EQ (default), NE, LT, LE, GT or GE
     * @param {string} pValue - the constraint value
     * @return {boolean}
     */
    compareFacetValue(pJoinValue: any, pOperator: string, pValue: string): boolean;
    /**
     * The values a Facet rule's input may hold, given what its siblings hold: the distinct
     * JoinListValueAddress values of the join records that agree with every constraining non-empty sibling
     * value and every explicit facet.  Empty siblings do not constrain.
     *
     * pNarrowBy picks the constraining siblings: 'All' (default) is every sibling; 'Preceding' is only the
     * siblings before this input (column order in a table), so a list offers every value its upstream
     * choices allow and picking one never needs a downstream value cleared first.
     *
     * @param {Object} pView
     * @param {Record<string, any>} pInput
     * @param {Record<string, any>} pRule - the input's Facet rule
     * @param {number} [pRowIndex]
     * @param {Array<{ Input: Record<string, any>, Rule: Record<string, any>, Value: any }>} [pSiblings] - precomputed siblings (values may be overridden by the caller)
     * @param {string} [pNarrowBy] - 'All' or 'Preceding'
     * @return {Set<string>}
     */
    getFacetAllowedValues(pView: any, pInput: Record<string, any>, pRule: Record<string, any>, pRowIndex?: number, pSiblings?: Array<{
        Input: Record<string, any>;
        Rule: Record<string, any>;
        Value: any;
    }>, pNarrowBy?: string): Set<string>;
    /**
     * The join records that agree with every constraining non-empty sibling value and every explicit facet;
     * see getFacetAllowedValues for pNarrowBy.  pInput's own value does not constrain.
     *
     * @param {Object} pView
     * @param {Record<string, any>} pInput
     * @param {Record<string, any>} pRule - the input's Facet rule
     * @param {number} [pRowIndex]
     * @param {Array<{ Input: Record<string, any>, Rule: Record<string, any>, Value: any }>} [pSiblings]
     * @param {string} [pNarrowBy] - 'All' or 'Preceding'
     * @return {Array<Record<string, any>>}
     */
    getFacetMatchingRecords(pView: any, pInput: Record<string, any>, pRule: Record<string, any>, pRowIndex?: number, pSiblings?: Array<{
        Input: Record<string, any>;
        Rule: Record<string, any>;
        Value: any;
    }>, pNarrowBy?: string): Array<Record<string, any>>;
}
declare namespace PictListDistilling {
    export { _DefaultProviderConfiguration as default_configuration };
}
import libPictProvider = require("pict-provider");
/** @type {Record<string, any>} */
declare const _DefaultProviderConfiguration: Record<string, any>;
//# sourceMappingURL=Pict-Provider-ListDistilling.d.ts.map