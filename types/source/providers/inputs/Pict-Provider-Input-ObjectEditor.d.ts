export = PictInputObjectEditor;
/**
 * @typedef {Object} Instance
 * @property {string} mode - 'edit' or 'view'
 * @property {string} slotID - The HTML ID selector of the content slot for this input
 * @property {Object} viewInstance - The object editor view instance
 * @property {string} viewHash - The hash of the object editor view
 * @property {Object} input - The input definition object
 */
declare class PictInputObjectEditor extends libPictSectionInputExtension {
    /**
     * Creates an instance of the PictInputObjectEditor class.
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
     * @returns {string} The HTML ID selector for the content display slot.
     */
    getContentDisplayHTMLID(pInputHTMLID: string): string;
    /**
     * The AppData address where this input's editable object is stashed.
     *
     * @param {string} pInputHash - The input Hash.
     * @returns {string} The dotted AppData address the object editor binds to.
     */
    getObjectDataAddress(pInputHash: string): string;
    /**
     * Resolve the incoming value to a plain object, accepting either a live
     * object or a JSON string. Falls back to the input's Content / Default /
     * an empty object.
     *
     * @param {Object} pInput - The input definition object.
     * @param {any} pValue - The value provided for the input.
     * @returns {Object} The resolved object to edit/display.
     */
    _resolveValue(pInput: any, pValue: any): any;
    /**
     * Determine whether the editor should be editable for this input. An
     * explicit PictForm.ObjectEditor.Editable boolean wins; otherwise the tree
     * is editable unless PictForm.ReadOnly is true.
     *
     * @param {Object} pInput - The input definition object.
     * @returns {boolean} True if the tree should be editable.
     */
    _resolveEditable(pInput: any): boolean;
    /**
     * Ensure the per-input AppData stash exists and return its wrapper.
     *
     * @param {string} pInputHash - The input Hash.
     * @returns {Object} The stash wrapper { Data }.
     */
    _ensureStash(pInputHash: string): any;
    /**
     * @param {string} pInputHash - The input Hash.
     * @returns {Object} The current edited object from the stash.
     */
    _currentObject(pInputHash: string): any;
    /**
     * Serialize an object into the input's hidden field.
     *
     * @param {string} pInputHTMLID - The RawHTMLID of the input.
     * @param {Object} pObject - The object to serialize.
     * @param {boolean} [pDispatchChange] - When true, dispatch a DOM change event.
     * @returns {boolean} True if the value was written.
     */
    _writeHiddenInputValue(pInputHTMLID: string, pObject: any, pDispatchChange?: boolean): boolean;
    /**
     * Mount (or re-render) the object editor for an input. Re-uses the view
     * instance across re-renders, re-painting into the (possibly fresh) slot.
     *
     * @param {Object} pInput - The input definition object.
     * @param {any} pValue - The value to edit/display.
     * @param {boolean} pEditable - Whether the tree is editable.
     * @param {Function} [fCallback] - Optional completion callback.
     */
    _mount(pInput: any, pValue: any, pEditable: boolean, fCallback?: Function): void;
    getMode(pInputHash: any): string;
    setMode(pInputHash: any, pMode: any, fCallback: any): void;
    toggleMode(pInputHash: any, fCallback: any): void;
    /**
     * Flush the current edited object to the input's hidden field.
     *
     * @param {string} pInputHash - The input Hash.
     * @param {Function} [fCallback] - Optional completion callback.
     */
    commit(pInputHash: string, fCallback?: Function): void;
    onInputInitialize(pView: any, pGroup: any, pRow: any, pInput: any, pValue: any, pHTMLSelector: any, pTransactionGUID: any): boolean;
}
declare namespace PictInputObjectEditor {
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
     * - The HTML ID selector of the content slot for this input
     */
    slotID: string;
    /**
     * - The object editor view instance
     */
    viewInstance: any;
    /**
     * - The hash of the object editor view
     */
    viewHash: string;
    /**
     * - The input definition object
     */
    input: any;
};
//# sourceMappingURL=Pict-Provider-Input-ObjectEditor.d.ts.map