const libPictSectionInputExtension = require('../Pict-Provider-InputExtension.js');

/**
 * CustomInputHandler class for Entity Bundle Requests.
 *
 * When an input is flagged as an EntityBundleRequest entity, it will go pull a
 * sequential list of records on data selection.
 *
 * Paired with the AutofillTriggerGroup, this allows other values to be filled
 * when a record is selected and fetched.

Providers: ["Pict-Input-EntityBundleRequest", "Pict-Input-TriggerGroup"],
		EntitiesBundle: [
		{
			"Entity": "Author",
			"Filter": "FBV~IDAuthor~EQ~{~D:Record.Value~}",
			"Destination": "AppData.CurrentAuthor",
			// This marshals a single record
			"SingleRecord": true
		},
		{
			"Entity": "BookAuthorJoin",
			"Filter": "FBV~IDAuthor~EQ~{~D:Appdata.CurrentAuthor.IDAuthor~}",
			"Destination": "AppData.BookAuthorJoins"
		},
		{
			"Entity": "Book",
			"Filter": "FBL~IDBook~LK~{PJU~:,^IDBook^Appdata.BookAuthorJoins~}",
			"Destination": "AppData.BookAuthorJoins"
		}
	],
	EntityBundleTriggerGroup: "BookTriggerGroup"

 *
 * @class
 * @extends libPictSectionInputExtension
 * @memberof providers.inputs
 */
class CustomInputHandler extends libPictSectionInputExtension
{
	/**
	 * @param {import('fable')} pFable - The Fable instance.
	 * @param {Record<string, any>} [pOptions] - The options for the provider.
	 * @param {string} [pServiceHash] - The service hash for the provider.
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		/** @type {import('pict') & { newAnticipate: () => any }} */
		this.fable;
		/** @type {any} */
		this.log;
	}

	gatherEntitySet(fCallback, pEntityInformation, pView, pInput, pValue)
	{
		// First sanity check the pEntityInformation
		if (!('Entity' in pEntityInformation) || (typeof(pEntityInformation.Entity) != 'string'))
		{
			this.log.warn(`EntityBundleRequest failed to parse entity request because the entity stanza did not contain an Entity string.`);
			return fCallback();
		}
		if (!('Filter' in pEntityInformation) || (typeof(pEntityInformation.Filter) != 'string'))
		{
			this.log.warn(`EntityBundleRequest failed to parse entity request because the entity stanza did not contain a Filter string.`);
			return fCallback();
		}
		if (!('Destination' in pEntityInformation) || (typeof(pEntityInformation.Destination) != 'string'))
		{
			this.log.warn(`EntityBundleRequest failed to parse entity request because the entity stanza did not contain a Destination string.`);
			return fCallback();
		}

		const tmpFilterTemplateRecord = { Value:pValue, Input:pInput, View:pView };
		let tmpRecordStartCursor = null;
		let tmpRecordCount = null;
		if (pEntityInformation.RecordCount)
		{
			tmpRecordStartCursor = pEntityInformation.RecordStartCursor != null ? pEntityInformation.RecordStartCursor : 0;
			tmpRecordCount = pEntityInformation.RecordCount != null ? pEntityInformation.RecordCount : null;
		}
		// Parse the filter template
		const tmpFilterString = this.pict.parseTemplate(pEntityInformation.Filter, tmpFilterTemplateRecord);
		if (tmpFilterString == '')
		{
			// We may want to continue, but for now let's say nah and nope out.
			this.log.warn(`EntityBundleRequest failed to parse entity request because the entity Filter did not return a string for FilterBy`)
		}

		// Now get the records
		const callback = (pError, pRecordSet) =>
		{
			if (pError)
			{
				this.log.error(`EntityBundleRequest request Error getting entity set for [${pEntityInformation.Entity}] with filter [${tmpFilterString}]: ${pError}`, pError);
				return fCallback(pError, '');
			}

			this.log.trace(`EntityBundleRequest found ${pRecordSet.length} records for ${pEntityInformation.Entity} filtered to [${tmpFilterString}]`);

			// Now assign it back to the destination; because this is not view specific it doesn't use the manifests from them (to deal with scope overlap with subgrids).
			if (pEntityInformation.SingleRecord)
			{
				if (pRecordSet.length > 1)
				{
					this.log.warn(`EntityBundleRequest found more than one record for ${pEntityInformation.Entity} filtered to [${tmpFilterString}] but SingleRecord is true; setting the first record.`);
				}
				if (pRecordSet.length < 1)
				{
					this.pict.manifest.setValueByHash(this.pict, pEntityInformation.Destination, false);
				}
				this.pict.manifest.setValueByHash(this.pict, pEntityInformation.Destination, pRecordSet[0]);
			}
			else
			{
				this.pict.manifest.setValueByHash(this.pict, pEntityInformation.Destination, pRecordSet);
			}

			return fCallback();
		};
		if (tmpRecordCount)
		{
			this.pict.EntityProvider.getEntitySetPage(pEntityInformation.Entity, tmpFilterString, tmpRecordStartCursor, tmpRecordCount, callback);
		}
		else
		{
			this.pict.EntityProvider.getEntitySet(pEntityInformation.Entity, tmpFilterString, callback);
		}
	}

	gatherCustomDataSet(fCallback, pCustomRequestInformation, pView, pInput, pValue)
	{
		// First sanity check the pCustomRequestInformation
		if (!('URL' in pCustomRequestInformation) || (typeof(pCustomRequestInformation.URL) != 'string'))
		{
			this.log.warn(`EntityBundleRequest failed to parse custom data request because the stanza did not contain a URL string.`);
			return fCallback();
		}

		const tmpURLTemplateRecord = { Value:pValue, Input:pInput, View:pView };
		// Parse the filter template
		const tmpURLTemplateString = this.pict.parseTemplate(pCustomRequestInformation.URL, tmpURLTemplateRecord);
		if (tmpURLTemplateString == '')
		{
			// We may want to continue, but for now let's say nah and nope out.
			this.log.warn(`EntityBundleRequest failed to parse custom data request because the entity Filter did not return a string for FilterBy`)
		}

		let tmpURLPrefix = '';
		// This will only be true if the "Host" is set.
		const tmpCustomURIHost = pCustomRequestInformation.Host ? pCustomRequestInformation.Host : false;
		// If "Host" is set, protocol and port are optional.
		const tmpCustomURIProtocol = pCustomRequestInformation.Protocol ? pCustomRequestInformation.Protocol : 'https';
		const tmpCustomURIPort = pCustomRequestInformation.Port ? pCustomRequestInformation.Port : false;

		if (tmpCustomURIHost)
		{
			tmpURLPrefix = `${tmpCustomURIProtocol}://${tmpCustomURIHost}`;
			if (tmpCustomURIPort)
			{
				tmpURLPrefix += `:${tmpCustomURIPort}`;
			}
		}
		else
		{
			tmpURLPrefix = this.pict.EntityProvider.options.urlPrefix;
		}

		// Now get the records
		const callback = (pError, pResponse, pData) =>
		{
			if (pError)
			{
				this.log.error(`EntityBundleRequest request Error getting data set for [${pCustomRequestInformation.Entity}] with filter [${tmpURLTemplateString}]: ${pError}`, pError);
				return fCallback(pError, '');
			}

			this.log.trace(`EntityBundleRequest completed request for ${pCustomRequestInformation.Entity} filtered to [${tmpURLTemplateString}]`);

			// Since this is a templated endpoint it can be used for logging etc.
			if (pCustomRequestInformation.Destination)
			{
				this.pict.manifest.setValueByHash(this.pict, pCustomRequestInformation.Destination, pData);
			}

			return fCallback();
		};

		let tmpOptions = (
			{
				url: `${tmpURLPrefix}${tmpURLTemplateString}`
			});
		tmpOptions = this.pict.EntityProvider.prepareRequestOptions(tmpOptions);
		return this.pict.EntityProvider.restClient.getJSON(tmpOptions, callback);
	}

	/**
	 * TODO: I added a proise return here to know when this data load is done for the dashboard usecase. Could use a revisit.
	 *
	 * @param {Object} pView - The view object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The value of the input.
	 * @param {string} pHTMLSelector - The HTML selector.
	 * @param {string} [pTransactionGUID] - (optional) The transaction GUID for the event dispatch.
	 *
	 * @return {Promise<Error?>} - Returns a promise that resolves when the data has been gathered.
	 */
	async gatherDataFromServer(pView, pInput, pValue, pHTMLSelector, pTransactionGUID)
	{
		// Gather data from the server
		// These have to date not been asyncronous.  Now they will be...
		if ((typeof(pInput) !== 'object') || !('PictForm' in pInput) || !('EntitiesBundle' in pInput.PictForm) || !Array.isArray(pInput.PictForm.EntitiesBundle))
		{
			this.log.warn(`Input at ${pHTMLSelector} is set as an EntityBundleRequest input but no array of entity requests was found`);
			return null;
		}

		const tmpLoadGUID = `BundleLoad-${this.pict.getUUID()}`;
		if (pTransactionGUID)
		{
			pView.registerEventTransactionAsyncOperation(pTransactionGUID, tmpLoadGUID);
		}
		let tmpInput = pInput;
		let tmpValue = pValue;
		let tmpAnticipate = this.fable.newAnticipate();

		if (tmpInput.PictForm.EntitiesBundle.length > 0 && tmpInput.PictForm.EntitiesBundle[0].PictMode)
		{
			tmpAnticipate.anticipate((fNext) =>
			{
				this.pict.EntityProvider.gatherDataFromServer(tmpInput.PictForm.EntitiesBundle, (pError) =>
				{
					// in case of an empty array, or all tasks being synchronous, wait for the next tick so we don't get event ordering problems
					setTimeout(() => fNext(pError), 0);
				});
			});
		}
		else
		{
			const tmpStateStack = [];
			/** @type {Record<string, any>} */
			let tmpState = { Value: tmpValue, Input: tmpInput, View: pView };
			for (let i = 0; i < tmpInput.PictForm.EntitiesBundle.length; i++)
			{
				let tmpEntityBundleEntry = tmpInput.PictForm.EntitiesBundle[i];
				tmpAnticipate.anticipate(
					(fNext) =>
					{
						try
						{
							switch (tmpEntityBundleEntry.Type)
							{
								case 'Custom':
									return this.gatherCustomDataSet(fNext, tmpEntityBundleEntry, pView, tmpInput, tmpValue);
								case 'SetStateAddress':
									tmpStateStack.push(tmpState);
									tmpState = this.fable.manifest.getValueByHash(this.fable, tmpEntityBundleEntry.StateAddress);
									if (typeof tmpState === 'undefined')
									{
										tmpState = {};
										this.fable.manifest.setValueByHash(this.fable, tmpEntityBundleEntry.StateAddress, tmpState);
									}
									break;
								case 'PopState':
									if (tmpStateStack.length > 0)
									{
										tmpState = tmpStateStack.pop();
									}
									else
									{
										this.log.warn(`EntityBundleRequest encountered a PopState without a matching SetStateAddress.`);
									}
									break;
								case 'MapJoin':
									this.pict.EntityProvider.mapJoin(tmpEntityBundleEntry, this.pict.EntityProvider.prepareState(tmpState, tmpEntityBundleEntry));
									break;
								case 'ProjectDataset':
									this.pict.EntityProvider.projectDataset(tmpEntityBundleEntry, this.pict.EntityProvider.prepareState(tmpState, tmpEntityBundleEntry));
									break;
								// This is the default case, for a meadow entity set or single entity
								case 'MeadowEntity':
								default:
									return this.gatherEntitySet(fNext, tmpEntityBundleEntry, pView, tmpInput, tmpValue);
							}
						}
						catch (pError)
						{
							this.log.error(`EntityBundleRequest error gathering entity set: ${pError}`, pError);
						}
						return fNext();
					});
			}
			// in case of an empty array, or all tasks being synchronous, wait for the next tick so we don't get event ordering problems
			tmpAnticipate.anticipate((fNext) => setTimeout(fNext, 0));
		}

		tmpAnticipate.anticipate(
			(fNext) =>
			{
				if (tmpInput.PictForm.EntityBundleTriggerGroup && this.pict.views.PictFormMetacontroller)
				{
					const tmpGroupConfig = this.getTriggerGroupConfigurationArray(tmpInput, tmpInput.PictForm.EntityBundleTriggerGroup)[0];
					if (tmpGroupConfig && Array.isArray(tmpGroupConfig.PreSolvers))
					{
						this.pict.providers.DynamicSolver.executeSolvers(pView, tmpGroupConfig.PreSolvers, `EntityBundleTriggerGroup hash ${tmpGroupConfig.TriggerGroupHash} pre-trigger`);
					}
					let tmpTransactionGUID;
					if (tmpGroupConfig && Array.isArray(tmpGroupConfig.PostSolvers))
					{
						tmpTransactionGUID = pTransactionGUID || this.pict.getUUID();
						if (tmpTransactionGUID !== pTransactionGUID)
						{
							this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);
						}
						pView.registerOnTransactionCompleteCallback(tmpTransactionGUID, () =>
						{
							if (Array.isArray(tmpGroupConfig.PostSolvers))
							{
								this.pict.providers.DynamicSolver.executeSolvers(pView, tmpGroupConfig.PostSolvers, `EntityBundleTriggerGroup hash ${tmpGroupConfig.TriggerGroupHash} post-trigger`);
								const tmpMarshalScope = tmpGroupConfig.MarshalOnComplete;
								if (tmpMarshalScope === true)
								{
									this.pict.views.PictFormMetacontroller.marshalToView();
								}
								else if (tmpMarshalScope)
								{
									this.pict.views.PictFormMetacontroller.marshalSectionToView(tmpMarshalScope.Section);
									this.pict.views.PictFormMetacontroller.marshalInputToView(tmpMarshalScope.Input);
								}
							}
						});
					}
					// Trigger the autofill global event
					this.pict.views.PictFormMetacontroller.triggerGlobalInputEvent(`TriggerGroup:${tmpInput.PictForm.EntityBundleTriggerGroup}:BundleLoad:${pInput.Hash || pInput.DataAddress}:${this.pict.getUUID()}`, pTransactionGUID);
					if (tmpTransactionGUID && tmpTransactionGUID !== pTransactionGUID)
					{
						pView.finalizeTransaction(tmpTransactionGUID);
					}
				}
				if (tmpInput.PictForm.EntityBundleTriggerMetacontrollerSolve && this.pict.views.PictFormMetacontroller)
				{
					// Trigger the solve global event
					this.pict.views.PictFormMetacontroller.solve();
				}
				if (tmpInput.PictForm.EntityBundleTriggerMetacontrollerRender && this.pict.views.PictFormMetacontroller)
				{
					// Trigger the render
					this.pict.views.PictFormMetacontroller.render();
				}
				fNext();
			});

		return new Promise((pResolve, pReject) =>
		{
			// Now fire the "autofilldata" event for the groups.
			tmpAnticipate.wait(
				(pError) =>
				{
					//FIXME: should we be ignoring this error? rejecting here is unsafe since the result isn't guaranteed to be handled, so will crash stuff currently
					if (pError)
					{
						this.log.error(`EntityBundleRequest error gathering entity set: ${pError}`, pError);
					}
					//TODO: close the async operation if we have a transaction GUID
					if (pTransactionGUID)
					{
						pView.eventTransactionAsyncOperationComplete(pTransactionGUID, tmpLoadGUID);
					}

					return pResolve(pError);
				});
		});
	}

	/**
	 * @param {Object} pInput - The input object.
	 * @param {string} pTriggerGroupHash - The trigger group hash.
	 * @return {Array<Record<string, any>>} - An array of trigger group configurations.
	 */
	getTriggerGroupConfigurationArray(pInput, pTriggerGroupHash)
	{
		let tmpAutoFillTriggerGroups = pInput.PictForm.AutofillTriggerGroup;
		if (!tmpAutoFillTriggerGroups)
		{
			return [];
		}
		if (!Array.isArray(tmpAutoFillTriggerGroups))
		{
			tmpAutoFillTriggerGroups = [tmpAutoFillTriggerGroups];
		}
		if (pTriggerGroupHash == null)
		{
			return tmpAutoFillTriggerGroups;
		}
		return tmpAutoFillTriggerGroups.filter((pGroup) => pGroup.TriggerGroupHash === pTriggerGroupHash);
	}


	/**
	 * Initializes the input element for the Pict provider select input.
	 *
	 * @param {Object} pView - The view object.
	 * @param {Object} pGroup - The group object.
	 * @param {Object} pRow - The row object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The input value.
	 * @param {string} pHTMLSelector - The HTML selector.
	 * @param {string} pTransactionGUID - The transaction GUID for the event dispatch.
	 * @returns {boolean} - Returns true if the input element is successfully initialized, false otherwise.
	 */
	onInputInitialize(pView, pGroup, pRow, pInput, pValue, pHTMLSelector, pTransactionGUID)
	{
		// Try to get the input element
		if (pInput.PictForm && (pValue || pInput.PictForm.EntityBundleTriggerWithoutValue) && pInput.PictForm.EntityBundleTriggerOnInitialize)
		{
			// This is a request on initial load
			this.gatherDataFromServer(pView, pInput, pValue, pHTMLSelector, pTransactionGUID);
		}
		// This is in case we need to do a request on initial load!
		return super.onInputInitialize(pView, pGroup, pRow, pInput, pValue, pHTMLSelector, pTransactionGUID);
	}

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
	onInputInitializeTabular(pView, pGroup, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID)
	{
		this.log.error(`EntityBundleRequest for input [${pInput.Hash}] Tabular support is intentionally not supported.`);
		return super.onInputInitializeTabular(pView, pGroup, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID);
	}

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
	onDataChange(pView, pInput, pValue, pHTMLSelector, pTransactionGUID)
	{
		if (pInput.PictForm && (pValue || pInput.PictForm.EntityBundleTriggerWithoutValue) && pInput.PictForm.EntityBundleTriggerOnDataChange !== false)
		{
			this.gatherDataFromServer(pView, pInput, pValue, pHTMLSelector, pTransactionGUID);
		}
		return super.onDataChange(pView, pInput, pValue, pHTMLSelector, pTransactionGUID);
	}

	/**
	 * This input extension only responds to events
	 *
	 * @param {Object} pView - The view object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The value from AppData.
	 * @param {string} pHTMLSelector - The HTML selector.
	 * @param {string} pEvent - The event hash that is expected to be triggered.
	 * @param {string} pTransactionGUID - The transaction GUID, if any.
	 * @returns {boolean} - Returns true.
	 */
	onAfterEventCompletion(pView, pInput, pValue, pHTMLSelector, pEvent, pTransactionGUID)
	{
		const tmpPayload = typeof pEvent === 'string' ? pEvent : '';
		const [ tmpType, tmpGroupHash ] = tmpPayload.split(':');

		if (tmpType !== 'TriggerGroup' || !tmpGroupHash || pInput.PictForm.TriggerGroupHash !== tmpGroupHash)
		{
			return super.onAfterEventCompletion(pView, pInput, pValue, pHTMLSelector, pEvent, pTransactionGUID);
		}
		this.gatherDataFromServer(pView, pInput, pValue, pHTMLSelector, pTransactionGUID);

		return super.onAfterEventCompletion(pView, pInput, pValue, pHTMLSelector, pEvent, pTransactionGUID);
	}
}

module.exports = CustomInputHandler;
