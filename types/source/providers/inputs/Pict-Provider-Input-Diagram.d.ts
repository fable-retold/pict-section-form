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
     * Flag edit/view mode on the DISPLAY SLOT so the scoped CSS (sizing, the resize grip, the toggle
     * chip pseudo) has something to key off.
     *
     * The slot is resolved FIRST and the RawHTMLID element is only a fallback. That order is
     * load-bearing: a host template is free to put `id="{RawHTMLID}"` on the hidden <input> (it has
     * to, if it wants the provider's value write-back to find it), and when it does,
     * `getElementById(RawHTMLID)` returns that hidden input — so every mode class, and with it every
     * sizing rule keyed off `.pict-section-form-diagram-edit`, lands on an invisible element and the
     * editor silently falls back to the embed's own min-height. Our own default template omits that
     * id, so this reordering is a no-op there.
     *
     * @param {Object} pInput - The input definition object.
     * @param {string} pMode - The mode to set ('edit' or 'view').
     */
    _setSlotModeClass(pInput: any, pMode: string): void;
    /**
     * @param {Object} pInput - The input definition object.
     * @returns {Element} The display slot element for this input, or null when it isn't in the DOM.
     */
    _getSlotElement(pInput: any): Element;
    /**
     * Coerce a configured height into a CSS length. Bare numbers (and numeric strings) are treated as
     * pixels so a descriptor can say 640 or "640" as readily as "640px".
     *
     * @param {any} pValue - The configured height.
     * @returns {string} A CSS length, or '' when the value isn't usable.
     */
    _normalizeHeight(pValue: any): string;
    /**
     * @param {Object} pInput - The input definition object.
     * @returns {string} The localStorage key this input's user-dragged height is remembered under.
     */
    _heightStorageKey(pInput: any): string;
    /**
     * @param {Object} pInput - The input definition object.
     * @returns {string} The remembered height for this input, or '' if there isn't one.
     */
    _readStoredHeight(pInput: any): string;
    /**
     * @param {Object} pInput - The input definition object.
     * @param {string} pHeight - The height to remember.
     * @returns {boolean} True if it was written.
     */
    _writeStoredHeight(pInput: any, pHeight: string): boolean;
    /**
     * Resolve the editor height for an input: a height the user dragged to wins over the descriptor's
     * configured Height, which wins over the stylesheet default (signalled by '').
     *
     * @param {Object} pInput - The input definition object.
     * @returns {string} A CSS length, or '' to leave the stylesheet in charge.
     */
    _resolveEditorHeight(pInput: any): string;
    /**
     * Push the resolved height onto the slot as `--pict-diagram-height`, which the scoped CSS reads.
     * Any inline height left behind by an earlier drag is dropped first so the variable is what
     * actually applies on a fresh mount.
     *
     * @param {Object} pInput - The input definition object.
     */
    _applyEditorHeight(pInput: any): void;
    /**
     * Strip the edit-mode sizing when dropping back to view. The resize grip writes an INLINE height
     * onto the slot, and that would otherwise pin the static SVG view to whatever the canvas was
     * dragged to.
     *
     * @param {Object} pInput - The input definition object.
     */
    _clearEditorHeight(pInput: any): void;
    /**
     * Remember whatever height the slot is currently sitting at. Only an INLINE height counts — that is
     * what the native resize grip writes; a height coming from the stylesheet or the descriptor is not
     * a user decision and must not be frozen into storage.
     *
     * @param {Object} pInput - The input definition object.
     * @returns {boolean} True if a height was remembered.
     */
    _captureEditorHeight(pInput: any): boolean;
    /**
     * Watch the slot so a height the user drags to is remembered for next time. The grip is native CSS
     * `resize` (no drag handling of our own), so a ResizeObserver is the only signal that it moved.
     * Debounced — a drag fires continuously.
     *
     * @param {Object} pInput - The input definition object.
     * @param {Object} pInstance - The instance record to hang the observer off.
     */
    _observeEditorResize(pInput: any, pInstance: any): void;
    /**
     * @param {Object} pInstance - The instance record whose resize watcher should be torn down.
     */
    _unobserveEditorResize(pInstance: any): void;
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