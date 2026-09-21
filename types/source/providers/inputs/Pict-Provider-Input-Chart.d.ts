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
    defaultCoreParsingConfiguration: any;
    defaultLabelParsingConfiguration: any;
    defaultDataParsingConfiguration: any;
    currentChartObjects: {};
    currentChartDataObjects: {};
    currentChartLegendState: {};
    /**
     * Classify a dataset's line style for its legend swatch, so a reading, a
     * dashed control limit and an unconnected marker series are told apart at a
     * glance. Chart.js's own legend draws every entry as the same block.
     *
     * @param {Object} pDataset - The Chart.js dataset.
     * @return {string} A swatch modifier class.
     */
    _legendSwatchClass(pDataset: any): string;
    /**
     * Group the datasets for the legend. A dataset declares its group with
     * `LegendGroup` on the solver entry (carried onto the dataset as
     * `pictLegendGroup`); anything that does not is "Data". Group ORDER follows
     * first appearance, so configuration controls it rather than sort order.
     *
     * @param {Object} pChart - The Chart.js instance.
     * @return {Array<{Key: string, Items: Array<{Index: number, Dataset: Object}>}>}
     */
    _legendGroups(pChart: any): Array<{
        Key: string;
        Items: Array<{
            Index: number;
            Dataset: any;
        }>;
    }>;
    /**
     * Build (or rebuild) the grouped HTML legend beside a chart's canvas.
     *
     * The legend is created in the DOM rather than in the template because there
     * are several chart templates (the base set plus per-theme copies) and a
     * legend added to only some of them is the kind of divergence that goes
     * unnoticed. Chart.js's built-in legend is switched off whenever this runs.
     *
     * @param {string} pRawHTMLID - The input's Macro.RawHTMLID.
     * @param {Object} pChart - The Chart.js instance.
     * @param {Object} pLegendConfiguration - The resolved ChartLegend config.
     */
    renderChartLegend(pRawHTMLID: string, pChart: any, pLegendConfiguration: any): boolean;
    /**
     * Resolve the ChartLegend configuration for an input. Returns null when the
     * grouped legend is not in use, in which case Chart.js's own legend stands.
     *
     * @param {Object} pInput - The PictForm input object.
     * @return {Object|null}
     */
    resolveChartLegendConfiguration(pInput: any): any | null;
    /**
     *
     * @param {Object} pInput - The PictForm input object
     * @param {*} pChartConfiguration - The current configuration object for the form
     * @param {*} pParsingConfiguration - The parsing configuration to apply
     * @param {*} pInputParsingConfigurationScope - The input-specific parsing configuration string address for additional configuration
     * @returns
     */
    applyInputParsingConfiguration(pInput: any, pChartConfiguration: any, pParsingConfiguration: any, pInputParsingConfigurationScope: any): boolean;
    getInputChartConfiguration(pView: any, pInput: any, pValue: any): any;
    initializeChartVisualization(pView: any, pGroup: any, pRow: any, pInput: any, pValue: any, pHTMLSelector: any): boolean;
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
//# sourceMappingURL=Pict-Provider-Input-Chart.d.ts.map