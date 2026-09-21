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
    /** @type {string} */
    cssHideClass: string;
    cssSelectedTabClass: string;
    cssSnippet: string;
    /**
     * @param {string} [pCSSHideClass]
     * @param {string} [pCSSSnippet]
     */
    setCSSSnippets(pCSSHideClass?: string, pCSSSnippet?: string): void;
    /**
     * @param {Object} pView - The view object.
     * @param {Object} pInput - The input object.
     * @param {string} pGroupHash - The group hash.
     *
     * @return {string}
     */
    getTabSelector(pView: any, pInput: any, pGroupHash: string): string;
    /**
     * @param {Object} pView - The view object.
     * @param {string} pGroupHash - The group hash.
     *
     * @return {string}
     */
    getGroupSelector(pView: any, pGroupHash: string): string;
    /**
     * Is this tab group hash actually one of the input's tabs?
     *
     * @param {Object} pInput - The input object.
     * @param {string} pTabGroupHash - The tab group hash to test.
     *
     * @return {boolean}
     */
    isTabInSet(pInput: any, pTabGroupHash: string): boolean;
    /**
     * @param {string} pViewHash
     * @param {string} pInputHash
     * @param {string} pTabHash
     *
     * @return {boolean} - true once the tab is shown; false (nothing changed) if the view, input or tab hash is not valid.
     */
    selectTabByViewHash(pViewHash: string, pInputHash: string, pTabHash: string): boolean;
    /**
     * Generates the HTML ID for a select input element.
     * @param {string} pInputHTMLID - The HTML ID of the input element.
     * @returns {string} - The generated HTML ID for the select input element.
     */
    getTabSelectorInputHTMLID(pInputHTMLID: string): string;
}
import libPictSectionInputExtension = require("../Pict-Provider-InputExtension.js");
//# sourceMappingURL=Pict-Provider-Input-TabGroupSelector.d.ts.map