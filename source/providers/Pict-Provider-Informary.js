const libPictProvider = require('pict-provider');

// TODO: Pull this back to pict as a core service once we are happy with the shape.
/** @type {Record<string, any>} */
const _DefaultProviderConfiguration = (
{
	"ProviderIdentifier": "Pict-DynamicForms-Informary",

	"AutoInitialize": false,
	"AutoInitializeOrdinal": 0,

	"AutoSolveWithApp": false
});

/**
 * Represents a provider for dynamic forms in the PICT system.
 * Extends the `libPictProvider` class.
 */
class PictDynamicFormsInformary extends libPictProvider
{
	/**
	 * Creates an instance of the `PictDynamicFormsInformary` class.
	 *
	 * @param {import('fable')} pFable - The Fable instance.
	 * @param {Record<string, any>} [pOptions] - The options for the provider.
	 * @param {string} [pServiceHash] - The service hash for the provider.
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(_DefaultProviderConfiguration)), pOptions);

		super(pFable, tmpOptions, pServiceHash);

		/** @type {any} */
		this.options;
		/** @type {import('pict') & { newManyfest: (options: any) => import('manyfest') }} */
		this.pict;
		/** @type {any} */
		this.log;

		this.genericManifest = this.pict.newManyfest({Scope:'GenericInformary'});
	}

	/**
	 * Retrieves all form elements for a given form hash.
	 *
	 * @param {string} pFormHash - The hash of the form.
	 * @returns {HTMLElement[]} - An array of HTML elements representing the form elements.
	 */
	getFormElements(pFormHash)
	{
		let tmpSelector = `[data-i-form="${pFormHash}"]`;
		//this.log.trace(`Getting form elements for form hash selector: ${tmpSelector}`);
		return this.pict.ContentAssignment.getElement(tmpSelector);
	}

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
	getContentBrowserAddress(pFormHash, pDatumHash, pContainer, pIndex)
	{
		// TODO: Need some guards, yo
		if (pContainer)
		{
			return `[data-i-form="${pFormHash}"][data-i-datum="${pDatumHash}"][data-i-container="${pContainer}"][data-i-index="${pIndex}"]`;
		}
		else
		{
			return `[data-i-form="${pFormHash}"][data-i-datum="${pDatumHash}"]`;
		}
	}

	/**
	 * Returns the composed container address string for a given container, index, and datum hash.
	 *
	 * @param {string} pContainer - The container name.
	 * @param {string|number} pIndex - The index of the container.
	 * @param {string} pDatumHash - The datum hash.
	 * @returns {string} The composed container address.
	 */
	getComposedContainerAddress(pContainer, pIndex, pDatumHash)
	{
		return `${pContainer}[${pIndex}].${pDatumHash}`;
	}

	/**
	 * Marshals form data to the provided application state data object using the given form hash and manifest.
	 *
	 * @param {object} pAppStateData - The application state data object to marshal the form data to.
	 * @param {string} pFormHash - The form hash representing the form elements.
	 * @param {import('manyfest')} pManifest - The manifest object used to map form data to the application state data.
	 * @param {string} [pDatum] - The datum hash to pull in.  If not provided, all data is marshalled.
	 * @param {number|string} [pRecordIndex] - The record index to pull in.  If not provided, all data is marshalled.
	 */
	marshalFormToData(pAppStateData, pFormHash, pManifest, pDatum, pRecordIndex)
	{
		const tmpManifest = typeof(pManifest) === 'object' ? pManifest : this.genericManifest;
		const tmpFormElements = this.getFormElements(pFormHash);

		// Optional Filters (so we don't just blindly do the whole form)
		const tmpDatum = (pDatum != null) ? false : pDatum;
		const tmpRecordIndex = (typeof(pRecordIndex) === 'number') ? String(pRecordIndex) : pRecordIndex;

		// Enumerate the form elements, and put data in them for each address
		for (const tmpFormElement of tmpFormElements)
		{
			this.marshalSpecicificFormElementToData(pFormHash, tmpFormElement, tmpManifest, pAppStateData, tmpDatum, tmpRecordIndex);
		}
	}

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
	marshalSpecicificFormElementToData(pFormHash, pFormElement, pManifest, pAppStateData, pDatumFilter, pRecordIndexFilter)
	{
		const tmpDatumAddress = pFormElement.getAttribute('data-i-datum');

		const tmpContainerAddress = pFormElement.getAttribute('data-i-container');
		const tmpIndex = pFormElement.getAttribute('data-i-index');

		// Process the filters
		// TODO: Now that this is a function, having these filters here is not good.  We need to move this to the caller.  But the above getAttribute is required... rethink filtering?
		if (pDatumFilter && (pDatumFilter !== tmpDatumAddress))
		{
			// Falls outside the filter, continue on
			return false;
		}
		if (pRecordIndexFilter && tmpIndex && pRecordIndexFilter !== tmpIndex)
		{
			// Falls outside the filter, continue on
			return false;
		}

		let tmpBrowserValue = this.pict.ContentAssignment.readContent(this.getContentBrowserAddress(pFormHash, tmpDatumAddress, tmpContainerAddress, tmpIndex));
		if (this.pict.LogNoisiness > 3)
		{
			this.log.trace(`Informary marshalling BrowserForm Data ${tmpBrowserValue} from form element [${tmpDatumAddress}] in container [${tmpContainerAddress}] at index [${tmpIndex}] to the datum address [${tmpDatumAddress}].`);
		}

		if (tmpBrowserValue == null)
		{
			return false;
		}

		if (!tmpContainerAddress)
		{
			pManifest.setValueAtAddress(pAppStateData, tmpDatumAddress, tmpBrowserValue);
		}
		else
		{
			// Compose the address .. right now only arrays
			pManifest.setValueAtAddress(pAppStateData, this.getComposedContainerAddress(tmpContainerAddress, tmpIndex, tmpDatumAddress), tmpBrowserValue);
		}
		return true;
	}

	/**
	 * Marshals data from some application state object to a specific subset of browser form elements.
	 *
	 * @param {object} pAppStateData - The application state data to marshal into the form.  Usually AppData but can be other objects.
	 * @param {string} pFormHash - The hash of the form to marshal data into.  This is the data-i-form attribute.
	 * @param {import('manyfest')} pManifest - The manifest object.  If not provided, the generic manifest is used.
	 */
	marshalDataToForm(pAppStateData, pFormHash, pManifest)
	{
		// TODO: Take a list of hashes and/or index addresses to marshal in, preventing OVERMARSHAL from taking control
		let tmpManifest = typeof(pManifest) === 'object' ? pManifest : this.genericManifest;
		let tmpFormElements = this.getFormElements(pFormHash);

		// Enumerate the form elements, and put data in them for each address
		for (let i = 0; i < tmpFormElements.length; i++)
		{
			this.marshalSpecificElementDataToForm(tmpFormElements[i], tmpManifest, pAppStateData);
		}
	}

	/**
	 * Marshals specific element data to a form.
	 *
	 * @param {HTMLElement} pFormElement - The form element to marshal data to.
	 * @param {import('manyfest')} pManifest - The manifest object containing data retrieval methods.
	 * @param {Record<string, any>} pAppStateData - The application state data.
	 * @returns {boolean} Returns false if the form element does not have a datum address.
	 */
	marshalSpecificElementDataToForm(pFormElement, pManifest, pAppStateData)
	{
		let tmpDatumAddress = pFormElement.getAttribute('data-i-datum');

		let tmpContainerAddress = pFormElement.getAttribute('data-i-container');
		let tmpIndex = Number(pFormElement.getAttribute('data-i-index'));

		if (!tmpDatumAddress)
		{
			this.log.warn(`Informary found a form element without a datum address.  Skipping.`);
			return false;
		}

		if (!tmpContainerAddress)
		{
			let tmpAppStateValue = pManifest.getValueAtAddress(pAppStateData, tmpDatumAddress);

			if (this.pict.LogNoisiness > 3)
			{
				this.log.trace(`Informary marshalling App State data ${tmpAppStateValue} to Browser Form element [${tmpDatumAddress}].`);
			}

			if (tmpAppStateValue != null)
			{
				this.pict.ContentAssignment.assignContent(pFormElement, tmpAppStateValue);
			}
		}
		else
		{
			let tmpAppStateValue = pManifest.getValueAtAddress(pAppStateData, this.getComposedContainerAddress(tmpContainerAddress, tmpIndex, tmpDatumAddress));

			if (this.pict.LogNoisiness > 3)
			{
				this.log.trace(`Informary marshalling App State data ${tmpAppStateValue} to Browser Form element [${tmpDatumAddress}] in container [${tmpContainerAddress}] at index [${tmpIndex}].`);
			}

			if (tmpAppStateValue != null)
			{
				this.pict.ContentAssignment.assignContent(pFormElement, tmpAppStateValue);
			}
		}
		return true;
	}

	/**
	 * Manually marshals data to a form by assigning content based on context in the descriptor.
	 * @param {Record<string, any>} pInput - The input manifest descriptor to marshal data to form from.
	 * @returns boolean if assignment was successful
	 */
	manualMarshalDataToFormByInput(pInput)
	{
		if (typeof(pInput) !== 'object')
		{
			this.log.error(`Informary failed to marshal data to form because the input is not an object.`);
			return false;
		}
		if (!('Hash' in pInput))
		{
			this.log.error(`Informary failed to marshal data to form because the input is missing a hash.`);
			return false;
		}
		if (!('PictForm' in pInput))
		{
			this.log.error(`Informary failed to marshal data to form because the input is missing a PictForm object.`);
			return false;
		}
		let tmpInputView = this.pict.views[pInput.PictForm.ViewHash];
		if (!tmpInputView)
		{
			this.log.error(`Informary failed to marshal data to form because the input view is missing.`);
			return false;
		}
		return this.pict.ContentAssignment.assignContent(pInput.Macro.HTMLSelector, tmpInputView.getValueByHash(pInput.Hash));
	}

	/**
	 * Manually marshals tabular data to a form by assigning content based on context in the descriptor.
	 * @param {object} pInput - The input manifest descriptor to marshal data to form from.
	 * @param {number} pRowIndex - The index of the row in the tabular data.
	 * @returns boolean if assignment was successful
	 */
	manualMarshalTabularDataToFormByInput(pInput, pRowIndex)
	{
		if (typeof(pInput) !== 'object')
		{
			this.log.error(`Informary failed to marshal data to form because the input is not an object.`);
			return false;
		}
		if (!('Hash' in pInput))
		{
			this.log.error(`Informary failed to marshal data to form because the input is missing a hash.`);
			return false;
		}
		if (!('PictForm' in pInput))
		{
			this.log.error(`Informary failed to marshal data to form because the input is missing a PictForm object.`);
			return false;
		}
		let tmpInputView = this.pict.views[pInput.PictForm.ViewHash];
		if (!tmpInputView)
		{
			this.log.error(`Informary failed to marshal data to form because the input view is missing.`);
			return false;
		}
		return this.pict.ContentAssignment.assignContent(`${pInput.Macro.HTMLSelectorTabular}[data-i-index="${pRowIndex}"]`,
			tmpInputView.getTabularValueByHash(pInput.PictForm.GroupIndex, pInput.PictForm.InputIndex, pRowIndex));
	}

	/**
	 * Manually marshals data to a form by assigning content to a specified HTML address.
	 *
	 * @param {string} pHTMLAddress - The HTML address where the content should be assigned.
	 * @param {string} pValue - The value to be assigned to the specified HTML address.
	 */
	manualMarshalDataToForm(pHTMLAddress, pValue)
	{
		return this.pict.ContentAssignment.assignContent(pHTMLAddress, pValue);
	}

	/**
	 * Manually marshals tabular data to a form.
	 *
	 * @param {string} pHTMLAddress - The HTML address where the data should be assigned.
	 * @param {string} pValue - The value to be assigned to the form element.
	 * @param {number} pRowIndex - The index of the row in the tabular data.
	 */
	manualMarshalTabularDataToForm(pHTMLAddress, pValue, pRowIndex)
	{
		return this.pict.ContentAssignment.assignContent(`${pHTMLAddress}[data-i-index="${pRowIndex}"]`, pValue);
	}
}

module.exports = PictDynamicFormsInformary;
module.exports.default_configuration = _DefaultProviderConfiguration;
