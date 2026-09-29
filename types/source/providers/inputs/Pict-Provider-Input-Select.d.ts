export = CustomInputHandler;
/**
 * CustomInputHandler class.
 *
 * @class
 * @extends libPictSectionInputExtension
 * @memberof providers.inputs
 */
declare class CustomInputHandler extends libPictSectionInputExtension {
    /** @type {import('pict')} */
    pict: import("pict");
    /** @type {import('pict')} */
    fable: import("pict");
    /**
     * Generates the HTML ID for a select input element.
     *
     * @param {string} pInputHTMLID - The HTML ID of the input element.
     * @returns {string} - The generated HTML ID for the select input element.
     */
    getSelectInputHTMLID(pInputHTMLID: string): string;
    /**
     * Generates a tabular select input ID based on the provided input HTML ID and row index.
     *
     * @param {string} pInputHTMLID - The input HTML ID.
     * @param {number} pRowIndex - The row index.
     * @returns {string} - The generated tabular select input ID.
     */
    getTabularSelectInputID(pInputHTMLID: string, pRowIndex: number): string;
    /**
     * Generates a tabular select dropdown ID based on the input HTML ID and row index.
     *
     * @param {string} pInputHTMLID - The HTML ID of the input.
     * @param {number} pRowIndex - The index of the row.
     * @returns {string} - The generated tabular select dropdown ID.
     */
    getTabularSelectDropdownID(pInputHTMLID: string, pRowIndex: number): string;
    /**
     * Records the option ids on the element and reports whether they differ from what it last rendered,
     * so a refresh on every marshal does not rebuild (and blur) a dropdown whose options are unchanged.
     *
     * @param {HTMLElement} pSelectElement
     * @param {Array<{ id: string, text: string }>} pListData
     * @return {boolean}
     */
    optionsChanged(pSelectElement: HTMLElement, pListData: Array<{
        id: string;
        text: string;
    }>): boolean;
    /**
     * Refreshes the select list for a dynamic input.
     * @param {Object} pView - The view object.
     * @param {Object} pGroup - The group object.
     * @param {Object} pRow - The row object.
     * @param {Object} pInput - The input object.
     * @param {any} pValue - The input value.
     * @param {string} pHTMLSelector - The HTML selector.
     */
    refreshSelectList(pView: any, pGroup: any, pRow: any, pInput: any, pValue: any, pHTMLSelector: string): boolean;
    /**
     * Refreshes the select list for a tabular input.
     * @param {Object} pView - The view object.
     * @param {Object} pGroup - The group object.
     * @param {Object} pRow - The row object.
     * @param {Object} pInput - The input object.
     * @param {any} pValue - The input value.
     * @param {string} pHTMLSelector - The HTML selector.
     * @param {number} pRowIndex
     */
    refreshSelectListTabular(pView: any, pGroup: any, pRow: any, pInput: any, pValue: any, pHTMLSelector: string, pRowIndex: number): void;
    /**
     * Initializes a tabular input element.
     *
     * @param {Object} pView - The view object.
     * @param {Object} pGroup - The group object.
     * @param {Object} pInput - The input object.
     * @param {any} pValue - The input value.
     * @param {string} pHTMLSelector - The HTML selector.
     * @param {number} pRowIndex - The index of the row.
     * @param {string} pTransactionGUID - The transaction GUID for the event dispatch.
     * @returns {any} - The result of the initialization.
     */
    onInputInitializeTabular(pView: any, pGroup: any, pInput: any, pValue: any, pHTMLSelector: string, pRowIndex: number, pTransactionGUID: string): any;
    /**
     * Handles the change event for the data in the select input.
     *
     * @param {Object} pView - The view object.
     * @param {Object} pInput - The input object.
     * @param {any} pValue - The new value of the input.
     * @param {string} pHTMLSelector - The HTML selector of the input.
     * @param {string} pTransactionGUID - The transaction GUID for the event dispatch.
     * @returns {any} - The result of the super.onDataChange method.
     */
    onDataChange(pView: any, pInput: any, pValue: any, pHTMLSelector: string, pTransactionGUID: string): any;
    /**
     * Handles the change event for tabular data.
     *
     * @param {Object} pView - The view object.
     * @param {Object} pInput - The input object.
     * @param {any} pValue - The new value.
     * @param {string} pHTMLSelector - The HTML selector.
     * @param {number} pRowIndex - The index of the row.
     * @param {string} pTransactionGUID - The transaction GUID for the event dispatch.
     * @returns {any} - The result of the super method.
     */
    onDataChangeTabular(pView: any, pInput: any, pValue: any, pHTMLSelector: string, pRowIndex: number, pTransactionGUID: string): any;
    /**
     * Marshals data to the form for the given input.
     *
     * @param {Object} pView - The view object.
     * @param {Object} pGroup - The group object.
     * @param {Object} pRow - The row object.
     * @param {Object} pInput - The input object.
     * @param {any} pValue - The value to be marshaled.
     * @param {string} pHTMLSelector - The HTML selector.
     * @param {string} pTransactionGUID - The transaction GUID for the event dispatch.
     * @returns {boolean} - Returns true if the value is successfully marshaled to the form, otherwise false.
     */
    onDataMarshalToForm(pView: any, pGroup: any, pRow: any, pInput: any, pValue: any, pHTMLSelector: string, pTransactionGUID: string): boolean;
    /**
     * Marshals data to a form in tabular format.
     *
     * @param {Object} pView - The view object.
     * @param {Object} pGroup - The group object.
     * @param {Object} pInput - The input object.
     * @param {any} pValue - The value parameter.
     * @param {string} pHTMLSelector - The HTML selector parameter.
     * @param {number} pRowIndex - The row index parameter.
     * @param {string} pTransactionGUID - The transaction GUID for the event dispatch.
     * @returns {any} - The result of the data marshaling.
     */
    onDataMarshalToFormTabular(pView: any, pGroup: any, pInput: any, pValue: any, pHTMLSelector: string, pRowIndex: number, pTransactionGUID: string): any;
    /**
     * Handles the data request event for a select input in the PictProviderInputSelect class.
     *
     * @param {Object} pView - The view object.
     * @param {Object} pInput - The input object.
     * @param {any} pValue - The value object.
     * @param {string} pHTMLSelector - The HTML selector object.
     * @returns {any} - The result of the onDataRequest method.
     */
    onDataRequest(pView: any, pInput: any, pValue: any, pHTMLSelector: string): any;
    /**
     * Handles the data request event for a tabular input.
     *
     * @param {Object} pView - The view object.
     * @param {Object} pInput - The input object.
     * @param {any} pValue - The value object.
     * @param {string} pHTMLSelector - The HTML selector.
     * @param {number} pRowIndex - The row index.
     * @returns {any} - The result of the data request.
     */
    onDataRequestTabular(pView: any, pInput: any, pValue: any, pHTMLSelector: string, pRowIndex: number): any;
}
import libPictSectionInputExtension = require("../Pict-Provider-InputExtension.js");
//# sourceMappingURL=Pict-Provider-Input-Select.d.ts.map