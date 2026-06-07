export = PictInputDiagram;
/**
 * @typedef {Object} Instance
 * @property {string} mode - 'edit' or 'view'
 * @property {string} slotID - The HTML ID of the content slot for this input
 * @property {string} lastValue - The last known value (SVG string)
 * @property {Object} viewInstance - The editor view instance (if in edit mode)
 * @property {string} viewHash - The hash of the editor view (if in edit mode)
 * @property {Object} input - The input definition object
 */
declare class PictInputDiagram extends libPictSectionInputExtension {
    /**
     * Creates an instance of the PictInputExtensionProvider class.
     *
     * @param {import('pict')} pFable - The Pict instance.
     * @param {Record<string, any>} [pOptions] - The options for the provider.
     * @param {string} [pServiceHash] - The service hash for the provider.
     */
    constructor(pFable: import("pict"), pOptions?: Record<string, any>, pServiceHash?: string);
    /** @type {import('pict')} */ pict: import("pict");
    /** @type {Record<String, Instance>} */
    _instances: Record<string, Instance>;
    /**
     * @param {string} pInputHTMLID - The RawHTMLID of the input.
     * @returns {string} The HTML ID selector for the content display slot corresponding to the input.
     */
    getContentDisplayHTMLID(pInputHTMLID: string): string;
    /**
     * @param {string} pInputHTMLID - The RawHTMLID of the input.
     * @param {number} pRowIndex - The row index for tabular inputs.
     * @returns {string} The HTML ID selector for the content display slot corresponding to the tabular input.
     */
    getTabularContentDisplayInputID(pInputHTMLID: string, pRowIndex: number): string;
    /**
     * Resolve the value to use for display/editing, following this precedence:
     * 1. The provided pValue (if a non-empty string)
     * 2. The input's Content property (if a non-empty string)
     * 3. The input's Default property (if a non-empty string)
     * 4. An empty string if none of the above are valid
     *
     * @param {Object} pInput - The input definition object.
     * @param {any} pValue - The value provided for the input.
     * @returns {string} The resolved value to use for display/editing.
     */
    _resolveValue(pInput: any, pValue: any): string;
    /**
     * @param {any} pValue - The value to check.
     * @return {boolean} True if the value is a string that appears to contain an <svg> element, false otherwise.
     */
    _isLikelySvg(pValue: any): boolean;
    /**
     * @param {string} pSlotID - The HTML ID of the content slot to assign.
     * @param {string} pHTML - The HTML string to assign to the slot.
     * @returns {boolean} True if the assignment was successful, false otherwise.
     */
    _assignSlotContent(pSlotID: string, pHTML: string): boolean;
    /**
     * @param {string} pInputHTMLID - The RawHTMLID of the input whose hidden value field should be updated.
     * @param {string} pValue - The SVG string to set as the value of the hidden input field.
     * @returns {boolean} True if the value was successfully written and a change event dispatched, false otherwise.
     */
    _writeHiddenInputValue(pInputHTMLID: string, pValue: string): boolean;
    _resolveVendor(): any;
    /**
     * Wrap an SVG string in a thin <div> for the view-mode slot. If the value
     * is empty or not an SVG, show an "(empty)" placeholder.
     *
     * @param {string} pValue - The SVG string to wrap for display.
     * @returns {string} The HTML string to assign to the view slot.
     */
    _buildViewHTML(pValue: string): string;
    /**
     * @param {Object} pInput - The input definition object.
     * @param {string} pMode - The mode to set ('edit' or 'view').
     */
    _setSlotModeClass(pInput: any, pMode: string): void;
    _mountView(pView: any, pInput: any, pValue: any): void;
    _extractSceneFromSvg(pSVG: any, fCallback: any): any;
    _buildEditorOptions(pInput: any, pValue: any, pInst: any): any;
    _mountEdit(pView: any, pInput: any, pValue: any, fCallback: any): void;
    _destroyEdit(pInput: any): void;
    getMode(pInputHash: any): string;
    setMode(pInputHash: any, pMode: any, fCallback: any): void;
    toggleMode(pInputHash: any, fCallback: any): void;
    commit(pInputHash: any, fCallback: any): void;
    onInputInitialize(pView: any, pGroup: any, pRow: any, pInput: any, pValue: any, pHTMLSelector: any, pTransactionGUID: any): boolean;
    onDataMarshalToFormTabular(pView: any, pGroup: any, pInput: any, pValue: any, pHTMLSelector: any, pRowIndex: any, pTransactionGUID: any): boolean;
}
declare namespace PictInputDiagram {
    export { _DefaultProviderConfiguration as default_configuration, Instance };
}
import libPictSectionInputExtension = require("../Pict-Provider-InputExtension.js");
declare namespace _DefaultProviderConfiguration {
    let ProviderIdentifier: string;
    let AutoInitialize: boolean;
    let AutoInitializeOrdinal: number;
    let AutoSolveWithApp: boolean;
}
type Instance = {
    /**
     * - 'edit' or 'view'
     */
    mode: string;
    /**
     * - The HTML ID of the content slot for this input
     */
    slotID: string;
    /**
     * - The last known value (SVG string)
     */
    lastValue: string;
    /**
     * - The editor view instance (if in edit mode)
     */
    viewInstance: any;
    /**
     * - The hash of the editor view (if in edit mode)
     */
    viewHash: string;
    /**
     * - The input definition object
     */
    input: any;
};
//# sourceMappingURL=Pict-Provider-Input-Diagram.d.ts.map