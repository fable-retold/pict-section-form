export = PictInputRichText;
declare class PictInputRichText extends libPictSectionInputExtension {
    constructor(pFable: any, pOptions: any, pServiceHash: any);
    /** @type {import('pict')} */ pict: import("pict");
    _instances: {};
    getContentDisplayHTMLID(pInputHTMLID: any): string;
    getTabularContentDisplayInputID(pInputHTMLID: any, pRowIndex: any): string;
    /**
     * Resolve a string value from various places the form may stash content.
     */
    _resolveContent(pInput: any, pValue: any): any;
    /**
     * Render markdown to HTML. Falls back to escaping if marked throws.
     */
    _renderMarkdown(pMarkdown: any): string | Promise<string>;
    _writeHiddenInputValue(pInputHTMLID: any, pValue: any): boolean;
    _assignSlotContent(pSlotID: any, pHTML: any): boolean;
    _mountView(pView: any, pInput: any, pValue: any): void;
    _buildEditorOptions(pInput: any, pValue: any, pInst: any): any;
    _mountEdit(pView: any, pInput: any, pValue: any, fCallback: any): void;
    _destroyEdit(pInput: any): void;
    getMode(pInputHash: any): any;
    setMode(pInputHash: any, pMode: any, fCallback: any): void;
    toggleMode(pInputHash: any, fCallback: any): void;
    commit(pInputHash: any, fCallback: any): void;
    onInputInitialize(pView: any, pGroup: any, pRow: any, pInput: any, pValue: any, pHTMLSelector: any, pTransactionGUID: any): boolean;
    onInputInitializeTabular(pView: any, pGroup: any, pInput: any, pValue: any, pHTMLSelector: any, pRowIndex: any, pTransactionGUID: any): void;
    onDataMarshalToForm(pView: any, pGroup: any, pRow: any, pInput: any, pValue: any, pHTMLSelector: any, pTransactionGUID: any): boolean;
    onDataMarshalToFormTabular(pView: any, pGroup: any, pInput: any, pValue: any, pHTMLSelector: any, pRowIndex: any, pTransactionGUID: any): boolean;
}
declare namespace PictInputRichText {
    export { _DefaultProviderConfiguration as default_configuration };
}
import libPictSectionInputExtension = require("../Pict-Provider-InputExtension.js");
declare namespace _DefaultProviderConfiguration {
    let ProviderIdentifier: string;
    let AutoInitialize: boolean;
    let AutoInitializeOrdinal: number;
    let AutoSolveWithApp: boolean;
}
//# sourceMappingURL=Pict-Provider-Input-RichText.d.ts.map