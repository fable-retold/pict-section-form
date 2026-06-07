const libPictSectionInputExtension = require('../Pict-Provider-InputExtension.js');

/**
 * CustomInputHandler class for the Autofill Trigger Group
 *
 * Autofill Trigger Groups have three parameters:
 *  - the group hash
 *  - a boolean defining whether the input triggers all inputs on the group
 *    to autofill themselves
 *  - an address (either in Pict or AppData) to pull data from
 *  - whether or not to marshal values if the result is empty/null/undefined
 *
 * In practice this looks like this:
 *
	Providers: ["Pict-Input-AutofillTriggerGroup"],
	AutofillTriggerGroup:
		{
			TriggerGroupHash: "Author",
			TriggerAddress: "AppData.CurrentAuthor.Name",
			MarshalEmptyValues: true
		}
 *
 *
 * The group is cavalier about clearing data when
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

		/** @type {import('pict')} */
		this.pict;
		/** @type {any} */
		this.log;
	}

	getTriggerGroupConfigurationArray(pInput)
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
		return tmpAutoFillTriggerGroups;
	}

	autoFillFromAddressList(pView, pInput, pTriggerGroupInfo, pHTMLSelector)
	{
		// First sanity check the triggergroupinfo
		if (!('TriggerGroupHash' in pTriggerGroupInfo) || (typeof(pTriggerGroupInfo.TriggerGroupHash) != 'string'))
		{
			this.log.warn(`AutofillTriggerGroup failed to autofill because a TriggerGroupHash string is not present.`);
			return false;
		}
		if (!('TriggerAddress' in pTriggerGroupInfo) || (typeof(pTriggerGroupInfo.TriggerAddress) != 'string'))
		{
			this.log.warn(`AutofillTriggerGroup failed to autofill because a TriggerAddress string is not present.`);
			return false;
		}

		let tmpValue = this.pict.manifest.getValueByHash(this.pict, pTriggerGroupInfo.TriggerAddress);

		if ((!tmpValue) && !pTriggerGroupInfo.MarshalEmptyValues)
		{
			return false;
		}
		// Maybe this just works!
		pView.setDataByInput(pInput, tmpValue);
		pView.manualMarshalDataToViewByInput(pInput);
		return true;
	}

	autoFillFromAddressListTabular(pView, pInput, pTriggerGroupInfo, pHTMLSelector, pRowIndex)
	{
		// First sanity check the triggergroupinfo
		if (!('TriggerGroupHash' in pTriggerGroupInfo) || (typeof(pTriggerGroupInfo.TriggerGroupHash) != 'string'))
		{
			this.log.warn(`AutofillTriggerGroup failed to autofill because a TriggerGroupHash string is not present.`);
			return false;
		}
		if (!('TriggerAddress' in pTriggerGroupInfo) || (typeof(pTriggerGroupInfo.TriggerAddress) != 'string'))
		{
			this.log.warn(`AutofillTriggerGroup failed to autofill because a TriggerAddress string is not present.`);
			return false;
		}

		let tmpValue = this.pict.manifest.getValueByHash(this.pict, pTriggerGroupInfo.TriggerAddress);

		if ((!tmpValue) && !pTriggerGroupInfo.MarshalEmptyValues)
		{
			return false;
		}
		// Setting data is in the view intentionally, to allow triggered events.  Probabbly needs to be a separate provider.
		pView.setDataTabularByHash(pInput.PictForm.GroupIndex, pInput.Hash, pRowIndex, tmpValue);
		pView.manualMarshalTabularDataToViewByInput(pInput, pRowIndex);
		return true;
	}

	// Trigger the group if it's flagged as a triggering input
	/**
	 * Handles the change event for the data in the select input.
	 *
	 * @param {Object} pView - The view object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The new value of the input.
	 * @param {string} pHTMLSelector - The HTML selector of the input.
	 * @param {string} pTransactionGUID - The transaction GUID, if any.
	 * @returns {any} - The result of the super.onDataChange method.
	 */
	onDataChange(pView, pInput, pValue, pHTMLSelector, pTransactionGUID)
	{
		let tmpTriggerGroupConfigurations = this.getTriggerGroupConfigurationArray(pInput);
		if (Array.isArray(tmpTriggerGroupConfigurations) && this.pict.views.PictFormMetacontroller)
		{
			for (let i = 0; i < tmpTriggerGroupConfigurations.length; i++)
			{
				const tmpGroupConfig = tmpTriggerGroupConfigurations[i];
				if (tmpGroupConfig.TriggerAllInputs)
				{
					if (Array.isArray(tmpGroupConfig.PreSolvers))
					{
						this.pict.providers.DynamicSolver.executeSolvers(pView, tmpGroupConfig.PreSolvers, `AutofillTriggerGroup hash ${tmpGroupConfig.TriggerGroupHash} pre-trigger`);
					}
					pView.registerOnTransactionCompleteCallback(pTransactionGUID, () =>
					{
						if (Array.isArray(tmpGroupConfig.PostSolvers))
						{
							this.pict.providers.DynamicSolver.executeSolvers(pView, tmpGroupConfig.PostSolvers, `AutofillTriggerGroup hash ${tmpGroupConfig.TriggerGroupHash} post-trigger`);
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
					this.pict.views.PictFormMetacontroller.triggerGlobalInputEvent(
						`TriggerGroup:${tmpGroupConfig.TriggerGroupHash}:DataChange:${pInput.Hash || pInput.DataAddress}:${this.pict.getUUID()}`,
						pTransactionGUID);
				}
			}
		}
		return super.onDataChange(pView, pInput, pValue, pHTMLSelector, pTransactionGUID);
	}

	/**
	 * Handles the change event for tabular data.
	 *
	 * @param {Object} pView - The view object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The new value.
	 * @param {string} pHTMLSelector - The HTML selector.
	 * @param {number} pRowIndex - The index of the row.
	 * @param {string} pTransactionGUID - The transaction GUID, if any.
	 * @returns {any} - The result of the super method.
	 */
	onDataChangeTabular(pView, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID)
	{
		let tmpTriggerGroupConfigurations = this.getTriggerGroupConfigurationArray(pInput);
		if (Array.isArray(tmpTriggerGroupConfigurations) && this.pict.views.PictFormMetacontroller)
		{
			for (let i = 0; i < tmpTriggerGroupConfigurations.length; i++)
			{
				const tmpGroupConfig = tmpTriggerGroupConfigurations[i];
				if (tmpGroupConfig.TriggerAllInputs)
				{
					if (Array.isArray(tmpGroupConfig.PreSolvers))
					{
						this.pict.providers.DynamicSolver.executeSolvers(pView, tmpGroupConfig.PreSolvers, `AutofillTriggerGroup hash ${tmpGroupConfig.TriggerGroupHash} tabular pre-trigger`);
					}
					pView.registerOnTransactionCompleteCallback(pTransactionGUID, () =>
					{
						if (Array.isArray(tmpGroupConfig.PostSolvers))
						{
							this.pict.providers.DynamicSolver.executeSolvers(pView, tmpGroupConfig.PostSolvers, `AutofillTriggerGroup hash ${tmpGroupConfig.TriggerGroupHash} tabular post-trigger`);
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
					this.pict.views.PictFormMetacontroller.triggerGlobalInputEvent(
						`TriggerGroup:${tmpGroupConfig.TriggerGroupHash}:DataChange:${pInput.Hash || pInput.DataAddress}:${this.pict.getUUID()}`,
						pTransactionGUID);
				}
			}
		}
		return super.onDataChangeTabular(pView, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID);
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
		let [ tmpType, tmpGroupHash, tmpEvent, tmpInputHash, tmpEventGUID ] = tmpPayload.split(':');
		if (!tmpEventGUID)
		{
			tmpEventGUID = this.pict.getUUID();
		}

		let tmpAutoFillTriggerGroups = pInput.PictForm.AutofillTriggerGroup;
		if (!tmpAutoFillTriggerGroups || tmpType !== 'TriggerGroup' || (pInput.Hash || pInput.DataAddress) == tmpInputHash)
		{
			return super.onAfterEventCompletion(pView, pInput, pValue, pHTMLSelector, pEvent, pTransactionGUID);
		}
		if (!Array.isArray(tmpAutoFillTriggerGroups))
		{
			tmpAutoFillTriggerGroups = [tmpAutoFillTriggerGroups];
		}
		for (let i = 0; i < tmpAutoFillTriggerGroups.length; i++)
		{
			let tmpAutoFillTriggerGroup = tmpAutoFillTriggerGroups[i];
			if (tmpAutoFillTriggerGroup.TriggerGroupHash !== tmpGroupHash)
			{
				continue;
			}

			if (Array.isArray(tmpAutoFillTriggerGroup.PreSolvers))
			{
				this.pict.providers.DynamicSolver.executeSolvers(pView, tmpAutoFillTriggerGroup.PreSolvers, `AutofillTriggerGroup hash ${tmpAutoFillTriggerGroup.TriggerGroupHash} pre-autofill`);
			}

			//FIXME: why is this check here? revisit
			if ('TriggerAddress' in tmpAutoFillTriggerGroup)
			{
				// Autofill based on the address list as it isn't a select option
				this.autoFillFromAddressList(pView, pInput, tmpAutoFillTriggerGroup, pHTMLSelector);
			}
			
			if (tmpAutoFillTriggerGroup.SelectOptionsRefresh)
			{
				// Regenerate the picklist
				// Because the pick lists are view specific, we need to lookup the view the input is in
				let tmpInputView = this.pict.views[pInput.PictForm.ViewHash];
				this.pict.providers.DynamicMetaLists.rebuildListByHash(pInput.PictForm.SelectOptionsPickList);
				this.pict.providers['Pict-Input-Select'].refreshSelectList(tmpInputView, tmpInputView.getGroup(pInput.PictForm.GroupIndex), tmpInputView.getRow(pInput.PictForm.GroupIndex, pInput.PictForm.Row), pInput, pValue, pHTMLSelector);
				tmpInputView.manualMarshalDataToViewByInput(pInput, tmpEventGUID);
			}

			if (Array.isArray(tmpAutoFillTriggerGroup.PostSolvers))
			{
				this.pict.providers.DynamicSolver.executeSolvers(pView, tmpAutoFillTriggerGroup.PostSolvers, `AutofillTriggerGroup hash ${tmpAutoFillTriggerGroup.TriggerGroupHash} post-autofill`);
				const tmpMarshalScope = tmpAutoFillTriggerGroup.MarshalOnComplete;
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
		}

		return super.onAfterEventCompletion(pView, pInput, pValue, pHTMLSelector, pEvent, pTransactionGUID);
	}

	/**
	 * Handles events for the Pict-Provider-InputExtension.
	 *
	 * @param {Object} pView - The view object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The value from AppData.
	 * @param {string} pHTMLSelector - The HTML selector.
	 * @param {number} pRowIndex - The row index of the tabular data.
	 * @param {string} pEvent - The event hash that is expected to be triggered.
	 * @param {string} pTransactionGUID - The transaction GUID, if any.
	 * @returns {boolean} - Returns true.
	 */
	onAfterEventTabularCompletion(pView, pInput, pValue, pHTMLSelector, pRowIndex, pEvent, pTransactionGUID)
	{
		const tmpPayload = typeof pEvent === 'string' ? pEvent : '';
		let [ tmpType, tmpGroupHash, tmpEvent, tmpInputHash, tmpEventGUID ] = tmpPayload.split(':');
		if (!tmpEventGUID)
		{
			tmpEventGUID = this.pict.getUUID();
		}

		if (!pInput.PictForm.AutofillTriggerGroup || tmpType !== 'TriggerGroup' || (pInput.Hash || pInput.DataAddress) == tmpInputHash)
		{
			// Do nothing for now -- this is the triggering element
			return super.onAfterEventTabularCompletion(pView, pInput, pValue, pHTMLSelector, pRowIndex, pEvent, pTransactionGUID);
		}
		let tmpAutoFillTriggerGroups = pInput.PictForm.AutofillTriggerGroup;
		if (!Array.isArray(tmpAutoFillTriggerGroups))
		{
			tmpAutoFillTriggerGroups = [tmpAutoFillTriggerGroups];
		}
		for (const tmpAutoFillTriggerGroup of tmpAutoFillTriggerGroups)
		{
			if (tmpAutoFillTriggerGroup.TriggerGroupHash !== tmpGroupHash)
			{
				continue;
			}
			/*
			 * FIXME: for large tables, do we want to run this for every row?
			if (Array.isArray(tmpAutoFillTriggerGroup.PreSolvers))
			{
				this.pict.providers.DynamicSolver.executeSolvers(pView, tmpAutoFillTriggerGroup.PreSolvers, `AutofillTriggerGroup hash ${tmpAutoFillTriggerGroup.TriggerGroupHash} pre-autofill`);
			}
			*/

			//FIXME: why is this flow different from non-tabular? revisit
			if (!tmpAutoFillTriggerGroup.SelectOptionsRefresh)
			{
				// Autofill based on the address list as it isn't a select option
				this.autoFillFromAddressListTabular(pView, pInput, tmpAutoFillTriggerGroup, pHTMLSelector, pRowIndex);
			}
			else if (!pInput.PictForm.SelectOptionsPickList)
			{
				// There is no select options picklist so we can't auto refresh it.
			}
			else
			{
				// Regenerate the picklist
				// TODO: This is inefficient -- it regenerates the list for every single row.  Easy optimization.
				// Use the transaction stuff at some point, now that we have it in the event.
				let tmpInputView = this.pict.views[pInput.PictForm.ViewHash];
				this.pict.providers.DynamicMetaLists.rebuildListByHash(pInput.PictForm.SelectOptionsPickList);
				this.pict.providers['Pict-Input-Select'].refreshSelectListTabular(tmpInputView, tmpInputView.getGroup(pInput.PictForm.GroupIndex), tmpInputView.getRow(pInput.PictForm.GroupIndex, pInput.PictForm.Row), pInput, pValue, pHTMLSelector, pRowIndex);
				tmpInputView.manualMarshalTabularDataToViewByInput(pInput, pRowIndex, tmpEventGUID);
			}
			/*
			 * TODO: for large tables, do we want to run this for every row?
			if (Array.isArray(tmpAutoFillTriggerGroup.PostSolvers))
			{
				this.pict.providers.DynamicSolver.executeSolvers(pView, tmpAutoFillTriggerGroup.PostSolvers, `AutofillTriggerGroup hash ${tmpAutoFillTriggerGroup.TriggerGroupHash} post-autofill`);
			}
			*/
		}

		return super.onAfterEventTabularCompletion(pView, pInput, pValue, pHTMLSelector, pRowIndex, pEvent, pTransactionGUID);
	}
}

module.exports = CustomInputHandler;
