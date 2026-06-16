export = PictDynamicFormsInformary;
/**
 * Represents a provider for dynamic forms in the PICT system.
 * Extends the `libPictProvider` class.
 */
declare class PictDynamicFormsInformary extends libPictProvider {
    /** @type {any} */
    options: any;
    /** @type {import('pict') & { newManyfest: (options: any) => import('manyfest') }} */
    pict: import("pict") & {
        newManyfest: (options: any) => import("manyfest");
    };
    genericManifest: import("manyfest");
    /**
     * Retrieves all form elements for a given form hash.
     *
     * @param {string} pFormHash - The hash of the form.
     * @returns {HTMLElement[]} - An array of HTML elements representing the form elements.
     */
    getFormElements(pFormHash: string): HTMLElement[];
    /**
     * Get a full content browser address based on the form, datum and optionally the container and index.
     *
     * This can be used in getDomElementByAddress or jquery selectors to return the element.
     *
     * @param {string} pFormHash - The form hash.
     * @param {string} pDatumHash - The datum hash.
     * @param {string|null} pContainer - The container (optional).
     * @param {string|number} pIndex - The index.
     * @returns {string} The content browser address.
     */
    getContentBrowserAddress(pFormHash: string, pDatumHash: string, pContainer: string | null, pIndex: string | number): string;
    /**
     * Returns the composed container address string for a given container, index, and datum hash.
     *
     * @param {string} pContainer - The container name.
     * @param {string|number} pIndex - The index of the container.
     * @param {string} pDatumHash - The datum hash.
     * @returns {string} The composed container address.
     */
    getComposedContainerAddress(pContainer: string, pIndex: string | number, pDatumHash: string): string;
    /**
     * Marshals form data to the provided application state data object using the given form hash and manifest.
     *
     * @param {object} pAppStateData - The application state data object to marshal the form data to.
     * @param {string} pFormHash - The form hash representing the form elements.
     * @param {import('manyfest')} pManifest - The manifest object used to map form data to the application state data.
     * @param {string} [pDatum] - The datum hash to pull in.  If not provided, all data is marshalled.
     * @param {number|string} [pRecordIndex] - The record index to pull in.  If not provided, all data is marshalled.
     */
    marshalFormToData(pAppStateData: object, pFormHash: string, pManifest: import("manyfest"), pDatum?: string, pRecordIndex?: number | string): void;
    /**
     * Marshals a specific form element's data to the application state data.
     *
     * @param {string} pFormHash - The hash of the form.
     * @param {HTMLElement} pFormElement - The form element to marshal.
     * @param {import('manyfest')} pManifest - The manifest object to set values.
     * @param {Object} pAppStateData - The application state data object.
     * @param {any} [pDatumFilter] - Optional filter for datum address.
     * @param {any} [pRecordIndexFilter] - Optional filter for record index.
     * @returns {boolean} - Returns false if the element falls outside the filters or if the browser value is null.
     */
    marshalSpecicificFormElementToData(pFormHash: string, pFormElement: HTMLElement, pManifest: import("manyfest"), pAppStateData: any, pDatumFilter?: any, pRecordIndexFilter?: any): boolean;
    /**
     * Marshals data from some application state object to a specific subset of browser form elements.
     *
     * @param {object} pAppStateData - The application state data to marshal into the form.  Usually AppData but can be other objects.
     * @param {string} pFormHash - The hash of the form to marshal data into.  This is the data-i-form attribute.
     * @param {import('manyfest')} pManifest - The manifest object.  If not provided, the generic manifest is used.
     */
    marshalDataToForm(pAppStateData: object, pFormHash: string, pManifest: import("manyfest")): void;
    /**
     * Marshals specific element data to a form.
     *
     * @param {HTMLElement} pFormElement - The form element to marshal data to.
     * @param {import('manyfest')} pManifest - The manifest object containing data retrieval methods.
     * @param {Record<string, any>} pAppStateData - The application state data.
     * @returns {boolean} Returns false if the form element does not have a datum address.
     */
    marshalSpecificElementDataToForm(pFormElement: HTMLElement, pManifest: import("manyfest"), pAppStateData: Record<string, any>): boolean;
    /**
     * Manually marshals data to a form by assigning content based on context in the descriptor.
     * @param {Record<string, any>} pInput - The input manifest descriptor to marshal data to form from.
     * @returns boolean if assignment was successful
     */
    manualMarshalDataToFormByInput(pInput: Record<string, any>): false | void;
    /**
     * Manually marshals tabular data to a form by assigning content based on context in the descriptor.
     * @param {object} pInput - The input manifest descriptor to marshal data to form from.
     * @param {number} pRowIndex - The index of the row in the tabular data.
     * @returns boolean if assignment was successful
     */
    manualMarshalTabularDataToFormByInput(pInput: object, pRowIndex: number): false | void;
    /**
     * Manually marshals data to a form by assigning content to a specified HTML address.
     *
     * @param {string} pHTMLAddress - The HTML address where the content should be assigned.
     * @param {string} pValue - The value to be assigned to the specified HTML address.
     */
    manualMarshalDataToForm(pHTMLAddress: string, pValue: string): void;
    /**
     * Manually marshals tabular data to a form.
     *
     * @param {string} pHTMLAddress - The HTML address where the data should be assigned.
     * @param {string} pValue - The value to be assigned to the form element.
     * @param {number} pRowIndex - The index of the row in the tabular data.
     */
    manualMarshalTabularDataToForm(pHTMLAddress: string, pValue: string, pRowIndex: number): void;
}
declare namespace PictDynamicFormsInformary {
    export { _DefaultProviderConfiguration as default_configuration };
}
import libPictProvider = require("pict-provider");
/** @type {Record<string, any>} */
declare const _DefaultProviderConfiguration: Record<string, any>;
//# sourceMappingURL=Pict-Provider-Informary.d.ts.map