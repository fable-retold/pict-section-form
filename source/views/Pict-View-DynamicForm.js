const libPictViewClass = require('pict-view');

/** @type {Record<string, any>} */
const libPackage = require('../../package.json');

/** @type {Record<string, any>} */
const _DefaultConfiguration = require('./Pict-View-DynamicForm-DefaultConfiguration.json');

const PENDING_ASYNC_OPERATION_TYPE = 'PendingAsyncOperation';
const TRANSACTION_COMPLETE_CALLBACK_TYPE = 'onTransactionComplete';
const READY_TO_FINALIZE_TYPE = 'ReadyToFinalize';

/**
 * Represents a dynamic form view for the Pict application.
 *
 * This is the code that maintains the lifecycle with the Pict application and
 * the data handling methods for a dynamic forms view (or set of views).
 *
 * @extends libPictViewClass
 */
class PictViewDynamicForm extends libPictViewClass
{
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(_DefaultConfiguration)), pOptions);

		if (!tmpOptions.Manifests)
		{
			throw new Error('PictSectionForm instantiation attempt without a Manifests in pOptions.Manifest -- cannot instantiate.');
		}
		if (!('Section' in tmpOptions.Manifests))
		{
			throw new Error('PictSectionForm instantiation attempt without a Section manifest in pOptions.Manifests -- cannot instantiate.');
		}
		// Set the default destination address to be based on the section hash if it hasn't been overridden by the manifest section definition
		if (tmpOptions.DefaultDestinationAddress === '#Pict-Form-Container')
		{
			tmpOptions.DefaultDestinationAddress = `#Pict-Form-Container-${tmpOptions.Hash}`;
		}
		// Set the default renderable to be based on the section hash if it hasn't been overridden by the manifest section definition
		if (tmpOptions.DefaultRenderable === 'Form-Main')
		{
			tmpOptions.DefaultRenderable = `Form-${tmpOptions.Hash}`;
		}
		// Set the template hash (which is the section-specific template prefix) if it hasn't been overridden by the manifest section definition
		if (!tmpOptions.SectionTemplateHash)
		{
			tmpOptions.SectionTemplateHash = `Pict-Form-Template-${tmpOptions.Hash}`;
		}

		// Create a renderable if none exist
		if (tmpOptions.Renderables.length < 1)
		{
			tmpOptions.Renderables.push(
				{
					RenderableHash: tmpOptions.DefaultRenderable,
					TemplateHash: tmpOptions.SectionTemplateHash,
					RenderMethod: 'replace'
				});
		}

		// Now construct the view.
		super(pFable, tmpOptions, pServiceHash);

		if (!this.fable.PictDynamicFormDependencyManager)
		{
			throw new Error('PictSectionForm instantiation attempt without a PictDynamicFormDependencyManager service in fable -- cannot instantiate.');
		}

		// Use this to manage transactions
		//FIXME: should we have these sioled??
		//this.transactionTracking = this.pict.newTransactionTracker();

		/** @type {Record<string, any>} */
		this._PackagePictView = this._Package;
		this._Package = libPackage;

		// Pull in the section definition
		this.sectionDefinition = this.options;

		// Initialize the section manifest -- instantiated to live only the lifecycle of this view
		this.sectionManifest = this.fable.instantiateServiceProviderWithoutRegistration('Manifest', this.options.Manifests.Section);

		// Shift solvers to an array of tasks
		this.sectionSolvers = [];
		// Pull in solvers
		if (('Solvers' in this.options) && Array.isArray(this.options.Solvers))
		{
			for (let i = 0; i < this.options.Solvers.length; i++)
			{
				if (typeof (this.options.Solvers[i]) === 'string')
				{
					this.sectionSolvers.push(this.options.Solvers[i]);
				}
			}
		}

		// Load any view section-specific templates
		this.formsTemplateSetPrefix = `PFT-${this.Hash}-${this.UUID}`;
		if (('MetaTemplates' in this.options) && Array.isArray(this.options.MetaTemplates))
		{
			for (let i = 0; i < this.options.MetaTemplates.length; i++)
			{
				let tmpMetaTemplate = this.options.MetaTemplates[i];

				if (('HashPostfix' in tmpMetaTemplate) && ('Template' in tmpMetaTemplate))
				{
					let tmpTemplateHash = `${this.formsTemplateSetPrefix}${tmpMetaTemplate.HashPostfix}`;
					this.pict.TemplateProvider.addTemplate(tmpTemplateHash, tmpMetaTemplate.Template);
				}
				else
				{
					this.log.warn(`MetaTemplate entry ${i} in PictSectionForm [${this.UUID}]::[${this.Hash}] does not have a Hash and Template property; custom template skipped.`);
				}
			}
		}
		// The default template prefix
		this.customDefaultTemplatePrefix = null;

		this.formID = `Pict-Form-${this.Hash}-${this.UUID}`;

		this.viewMarshalDestination = null;
		this.initialBundleLoaded = false;

		this.fable.ManifestFactory.initializeFormGroups(this);

		this._LoopDetectionData = {};
	}

	/**
	 * Returns the default template prefix.
	 *
	 * @returns {string} The default template prefix.
	 */
	get defaultTemplatePrefix()
	{
		if (this.customDefaultTemplatePrefix)
		{
			return this.customDefaultTemplatePrefix;
		}
		else if (this.pict.views.PictFormMetacontroller)
		{
			return this.pict.views.PictFormMetacontroller.formTemplatePrefix;
		}
		else
		{
			return this.pict.providers.MetatemplateGenerator.baseTemplatePrefix;
		}
	}

	/**
	 * This method is called whenever data is changed within an input.
	 *
	 * It handles the data marshaling from the view to the data model,
	 * runs any providers connected to the input, solves the Pict application,
	 * then marshals data back to the view.
	 *
	 * @param {string} pInputHash - The hash of the input that triggered the data change.
	 */
	dataChanged(pInputHash)
	{
		let tmpInput = this.getInputFromHash(pInputHash);
		// This is what is called whenever a hash is changed.  We could marshal from view, solve and remarshal to view.

		if (this.pict.LogNoisiness > 2)
		{
			this.log.trace(`Dynamic form [${this.Hash}]::[${this.UUID}] dataChanged event for input [${pInputHash}].`);
		}
		if (pInputHash)
		{
			// The informary stuff doesn't know the resolution of the hash to address, so do it here.
			let tmpHashAddress = this.sectionManifest.resolveHashAddress(pInputHash);
			const tmpTransactionGUID = this.fable.getUUID();
			this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);
			try
			{
				let tmpMarshalDestinationObject = this.getMarshalDestinationObject();
				this.pict.providers.Informary.marshalFormToData(tmpMarshalDestinationObject, this.formID, this.sectionManifest, tmpHashAddress);
				// Now run any providers connected to this input
				let tmpValue = this.sectionManifest.getValueByHash(tmpMarshalDestinationObject, tmpHashAddress);

				let tmpInputProviderList = this.getInputProviderList(tmpInput);
				for (let i = 0; i < tmpInputProviderList.length; i++)
				{
					if (this.pict.providers[tmpInputProviderList[i]])
					{
						this.pict.providers[tmpInputProviderList[i]].onDataChange(this, tmpInput, tmpValue, tmpInput.Macro.HTMLSelector, tmpTransactionGUID);
					}
					else
					{
						this.log.error(`Dynamic form dataChanged [${this.Hash}]::[${this.UUID}] cannot find provider [${tmpInputProviderList[i]}] for input [${tmpInput.Hash}].`);
					}
				}
			}
			catch (pError)
			{
				this.log.error(`Dynamic form [${this.Hash}]::[${this.UUID}] gross error marshaling specific (${pInputHash}) data from view in dataChanged event: ${pError}`);
			}
			finally
			{
				this.finalizeTransaction(tmpTransactionGUID);
			}
		}
		else
		{
			this.marshalFromView();
		}
		// Run any dynamic input providers for the input hash.
		this.pict.PictApplication.solve();
		if (this.pict.views.PictFormMetacontroller)
		{
			// since the solver may have changed data in other secitons, remarshal all sections
			this.pict.views.PictFormMetacontroller.marshalFormSections();
		}
		else
		{
			this.marshalToView();
		}
		// Notify the FormPersistence provider if it exists, for autosave
		if (this.pict.providers.FormPersistence)
		{
			this.pict.providers.FormPersistence.onFormDataChanged();
		}
	}


	/**
	 * Called whenever tabular data is changed.
	 *
	 * @param {number} pGroupIndex - the index of the group
	 * @param {number} pInputIndex - the index of the input
	 * @param {number} pRowIndex - the index of the row where the data was changed
	 */
	dataChangedTabular(pGroupIndex, pInputIndex, pRowIndex)
	{
		if (this.pict.LogNoisiness > 2)
		{
			this.log.trace(`Dynamic form [${this.Hash}]::[${this.UUID}] dataChangedTabular event for group ${pGroupIndex} input ${pInputIndex} row ${pRowIndex}.`);
		}
		let tmpInput = this.getTabularRecordInput(pGroupIndex, pInputIndex);
		if (
			(typeof (pGroupIndex) != 'undefined')
			&& (typeof (pInputIndex) != 'undefined')
			&& (typeof (pRowIndex) != 'undefined')
			&& (typeof (tmpInput) == 'object')
		)
		{
			// The informary stuff doesn't know the resolution of the hash to address, so do it here.
			let tmpHashAddress = tmpInput.Address;
			const tmpTransactionGUID = this.fable.getUUID();
			this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);
			try
			{
				let tmpMarshalDestinationObject = this.getMarshalDestinationObject();
				this.pict.providers.Informary.marshalFormToData(tmpMarshalDestinationObject, this.formID, this.sectionManifest, tmpHashAddress, pRowIndex);

				// TODO: Can we simplify this?
				let tmpValueAddress = this.pict.providers.Informary.getComposedContainerAddress(tmpInput.PictForm.InformaryContainerAddress, pRowIndex, tmpInput.PictForm.InformaryDataAddress);
				let tmpValue = this.sectionManifest.getValueByHash(tmpMarshalDestinationObject, tmpValueAddress);
				// Each row has a distinct address!
				let tmpVirtualInformaryHTMLSelector = tmpInput.Macro.HTMLSelectorTabular + `[data-i-index="${pRowIndex}"]`;
				let tmpInputProviderList = this.getInputProviderList(tmpInput);
				for (let i = 0; i < tmpInputProviderList.length; i++)
				{
					if (this.pict.providers[tmpInputProviderList[i]])
					{
						this.pict.providers[tmpInputProviderList[i]].onDataChangeTabular(this, tmpInput, tmpValue, tmpVirtualInformaryHTMLSelector, pRowIndex, tmpTransactionGUID);
					}
					else
					{
						this.log.error(`Dynamic form dataChangedTabular [${this.Hash}]::[${this.UUID}] cannot find provider [${tmpInputProviderList[i]}] for input [${tmpInput.Hash}] row ${pRowIndex}.`);
					}
				}
			}
			catch (pError)
			{
				this.log.error(`Dynamic form [${this.Hash}]::[${this.UUID}] gross error marshaling specific (${tmpInput.Hash}) tabular data for group ${pGroupIndex} row ${pRowIndex} from view in dataChanged event: ${pError}`);
			}
			finally
			{
				this.finalizeTransaction(tmpTransactionGUID);
			}
		}
		else
		{
			// This is what is called whenever a hash is changed.  We could marshal from view, solve and remarshal to view.
			this.marshalFromView();
		}
		// Run any dynamic input providers for the input hash.
		this.pict.PictApplication.solve();
		if (this.pict.views.PictFormMetacontroller)
		{
			// since the solver may have changed data in other secitons, remarshal all sections
			this.pict.views.PictFormMetacontroller.marshalFormSections();
		}
		else
		{
			this.marshalToView();
		}
		// Notify the FormPersistence provider if it exists, for autosave
		if (this.pict.providers.FormPersistence)
		{
			this.pict.providers.FormPersistence.onFormDataChanged();
		}
	}

	/**
	 * Sets the data in a specific form input based on the provided input object
	 *
	 * FIXME: does this need to have a transaction GUID passed in?
	 *
	 * @param {object} pInput - The input object.
	 * @param {any} pValue - The value to set.
	 * @returns {boolean} Returns true if the data was set successfully, false otherwise.
	 */
	setDataByInput(pInput, pValue)
	{
		const tmpTransactionGUID = this.fable.getUUID();
		this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);
		try
		{
			this.sectionManifest.setValueByHash(this.getMarshalDestinationObject(), pInput.Hash, pValue);

			// TODO: DRY TIME, excellent.
			let tmpValue = pValue;
			// Each row has a distinct address!
			let tmpVirtualInformaryHTMLSelector = pInput.Macro.HTMLSelector;
			let tmpInputProviderList = this.getInputProviderList(pInput);
			for (let i = 0; i < tmpInputProviderList.length; i++)
			{
				if (this.pict.providers[tmpInputProviderList[i]])
				{
					this.pict.providers[tmpInputProviderList[i]].onDataChange(this, pInput, tmpValue, tmpVirtualInformaryHTMLSelector, tmpTransactionGUID);
				}
				else
				{
					this.log.error(`Dynamic form setDataByInput [${this.Hash}]::[${this.UUID}] cannot find provider [${tmpInputProviderList[i]}] for input [${pInput.Hash}].`);
				}
			}
		}
		catch (pError)
		{
			this.log.error(`Dynamic form setDataByInput [${this.Hash}]::[${this.UUID}] gross error marshaling specific (${pInput.Hash}) from view in dataChanged event: ${pError}`);
		}
		finally
		{
			this.finalizeTransaction(tmpTransactionGUID);
		}

		return false;
	}

	/**
	 * Sets the data in a specific tabular form input based on the provided hash, group and row.
	 *
	 * FIXME: does this need to have a transaction GUID passed in?
	 *
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {string} pInputHash - The hash of the input.
	 * @param {number} pRowIndex - The index of the row.
	 * @param {any} pValue - The value to set.
	 * @returns {boolean} Returns true if the data was set successfully, false otherwise.
	 */
	setDataTabularByHash(pGroupIndex, pInputHash, pRowIndex, pValue)
	{
		// The neat thing about how the tabular groups work is that we can make it clever about whether it's an object or an array.
		let tmpGroup = this.getGroup(pGroupIndex);

		if (!tmpGroup)
		{
			this.log.warn(`PICT View Metatemplate Helper setDataTabularByHash ${pGroupIndex} was not a valid group.`);
			return false;
		}

		let tmpInputIndex = -1;
		let tmpElementDescriptorKeys = Object.keys(tmpGroup.supportingManifest.elementDescriptors);
		for (let i = 0; i < tmpElementDescriptorKeys.length; i++)
		{
			if (tmpGroup.supportingManifest.elementDescriptors[tmpElementDescriptorKeys[i]].Hash === pInputHash)
			{
				tmpInputIndex = i;
				break;
			}
		}
		if (tmpInputIndex < 0)
		{
			this.log.warn(`PICT View Metatemplate Helper setDataTabularByHash Group ${pGroupIndex} did not have hash [${pInputHash}].`);
			return false;
		}

		let tmpInput = this.getTabularRecordInput(pGroupIndex, tmpInputIndex);
		if (
			(typeof (pGroupIndex) != 'undefined')
			&& (typeof (pRowIndex) != 'undefined')
			&& (typeof (tmpInput) == 'object')
		)
		{
			// The informary stuff doesn't know the resolution of the hash to address, so do it here.
			const tmpTransactionGUID = this.fable.getUUID();
			this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);
			try
			{
				let tmpMarshalDestinationObject = this.getMarshalDestinationObject();
				let tmpValueAddress = this.pict.providers.Informary.getComposedContainerAddress(tmpInput.PictForm.InformaryContainerAddress, pRowIndex, tmpInput.PictForm.InformaryDataAddress);
				this.sectionManifest.setValueByHash(tmpMarshalDestinationObject, tmpValueAddress, pValue)

				// TODO: DRY TIME, excellent.
				let tmpValue = pValue;
				// Each row has a distinct address!
				let tmpVirtualInformaryHTMLSelector = tmpInput.Macro.HTMLSelectorTabular + `[data-i-index="${pRowIndex}"]`;
				let tmpInputProviderList = this.getInputProviderList(tmpInput);
				for (let i = 0; i < tmpInputProviderList.length; i++)
				{
					if (this.pict.providers[tmpInputProviderList[i]])
					{
						this.pict.providers[tmpInputProviderList[i]].onDataChangeTabular(this, tmpInput, tmpValue, tmpVirtualInformaryHTMLSelector, pRowIndex, tmpTransactionGUID);
					}
					else
					{
						this.log.error(`Dynamic form setDataTabularByHash [${this.Hash}]::[${this.UUID}] cannot find provider [${tmpInputProviderList[i]}] for input [${tmpInput.Hash}] row ${pRowIndex}.`);
					}
				}
			}
			catch (pError)
			{
				this.log.error(`Dynamic form setDataTabularByHash [${this.Hash}]::[${this.UUID}] gross error marshaling specific (${pInputHash}) tabular data for group ${pGroupIndex} row ${pRowIndex} from view in dataChanged event: ${pError}`);
			}
			finally
			{
				this.finalizeTransaction(tmpTransactionGUID);
			}
		}

		return false;
	}

	/**
	 * Retrieves the marshal destination address.
	 *
	 * @returns {string} The marshal destination address.
	 */
	getMarshalDestinationAddress()
	{
		return this.viewMarshalDestination || this.pict.providers.DataBroker.marshalDestination;
	}

	/**
	 * Retrieves the marshal destination object.  This is where the model data is stored.
	 *
	 * @return {Record<string, any>} The marshal destination object.
	 */
	getMarshalDestinationObject()
	{
		return this.pict.providers.DataBroker.resolveMarshalDestinationObject(this.viewMarshalDestination);
	}

	/**
	 * Gets a value by hash address.
	 *
	 * @param {string} pHashAddress
	 * @return {any} The value at the specified hash address.
	 */
	getValueByHash(pHashAddress)
	{
		return this.sectionManifest.getValueByHash(this.getMarshalDestinationObject(), pHashAddress);
	}

	/**
	 * Gets a value by hash address.
	 *
	 * @param {number} pGroupIndex
	 * @param {number} pInputIndex
	 * @param {number} pRowIndex
	 * @return {any} The value at the specified hash address.
	 */
	getTabularValueByHash(pGroupIndex, pInputIndex, pRowIndex)
	{
		const tmpInput = this.getTabularRecordInput(pGroupIndex, pInputIndex);
		const tmpAddress = this.pict.providers.Informary.getComposedContainerAddress(tmpInput.PictForm.InformaryContainerAddress, pRowIndex, tmpInput.PictForm.InformaryDataAddress);
		return this.sectionManifest.getValueByHash(this.getMarshalDestinationObject(), tmpAddress);
	}

	/**
	 * Marshals data to the view.
	 *
	 * @returns {any} The result of calling the superclass's onMarshalToView method.
	 */
	onMarshalToView()
	{
		// TODO: Only marshal data that has changed since the last marshal.  Thought experiment: who decides what changes happened?
		const tmpTransactionGUID = this.fable.getUUID();
		this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);
		try
		{
			let tmpMarshalDestinationObject = this.getMarshalDestinationObject();
			// TODO: Add optional transaction awareness to informary
			this.pict.providers.Informary.marshalDataToForm(tmpMarshalDestinationObject, this.formID, this.sectionManifest);
			this.runLayoutProviderFunctions('onDataMarshalToForm', tmpTransactionGUID);
			this.runInputProviderFunctions('onDataMarshalToForm', null, null, tmpTransactionGUID);
		}
		catch (pError)
		{
			this.log.error(`Gross error marshaling data to view: ${pError}`);
		}
		finally
		{
			this.finalizeTransaction(tmpTransactionGUID);
		}
		return super.onMarshalToView();
	}

	manualMarshalDataToViewByInput(pInput, pTransactionGUID)
	{
		const tmpTransactionGUID = (typeof(pTransactionGUID) == 'string') ? pTransactionGUID : this.fable.getUUID();
		this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);
		try
		{
			this.pict.providers.Informary.manualMarshalDataToFormByInput(pInput);
			this.runLayoutProviderFunctions('onDataMarshalToForm', tmpTransactionGUID);
			this.runInputProviderFunctions('onDataMarshalToForm', pInput.Hash, null, tmpTransactionGUID);
		}
		catch (pError)
		{
			this.log.error(`Gross error marshaling data to view: ${pError}`);
		}
		finally
		{
			if (tmpTransactionGUID !== pTransactionGUID)
			{
				this.finalizeTransaction(tmpTransactionGUID);
			}
		}
	}

	manualMarshalTabularDataToViewByInput(pInput, pRowIndex, pTransactionGUID)
	{
		const tmpTransactionGUID = (typeof(pTransactionGUID) == 'string') ? pTransactionGUID : this.fable.getUUID();
		this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);
		try
		{
			this.pict.providers.Informary.manualMarshalTabularDataToFormByInput(pInput, pRowIndex);
			this.runLayoutProviderFunctions('onDataMarshalToForm', tmpTransactionGUID);
			this.runInputProviderFunctions('onDataMarshalToForm', pInput.Hash, pRowIndex, tmpTransactionGUID);
		}
		catch (pError)
		{
			this.log.error(`Gross error marshaling tabular data to view: ${pError}`);
		}
		finally
		{
			if (tmpTransactionGUID !== pTransactionGUID)
			{
				this.finalizeTransaction(tmpTransactionGUID);
			}
		}
	}

	/**
	 * Marshals data from the view to the destination object.
	 * @returns {any} The result of calling the superclass's onMarshalFromView method.
	 */
	onMarshalFromView()
	{
		try
		{
			let tmpMarshalDestinationObject = this.getMarshalDestinationObject();
			this.pict.providers.Informary.marshalFormToData(tmpMarshalDestinationObject, this.formID, this.sectionManifest);
		}
		catch (pError)
		{
			this.log.error(`Gross error marshaling data from view: ${pError}`);
		}
		return super.onMarshalFromView();
	}

	/**
	 * Executes after marshaling the data to the form.
	 * Checks if there are any hooks set from the input providers (from custom InputType handler hooks) and runs them.
	 */
	onAfterMarshalToForm()
	{
		// Check to see if there are any hooks set from the input templates
		const tmpTransactionGUID = this.fable.getUUID();
		this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);
		try
		{
			this.runInputProviderFunctions('onAfterMarshalToForm', null, null, tmpTransactionGUID);

		}
		catch (pError)
		{
			this.log.error(`Gross error running after marshal to form: ${pError}`);
		}
		finally
		{
			this.finalizeTransaction(tmpTransactionGUID);
		}
	}

	/**
	 * Executes the solve operation for the dynamic views.
	 *
	 * @returns {any} The result of the solve operation.
	 */
	onSolve()
	{
		// Usually the metacontroller runs this for the views
		if (this.options.ExecuteSolversWithoutMetacontroller)
		{
			this.pict.providers.DynamicSolver.solveViews([this.Hash]);
		}
		return super.onSolve();
	}

	/**
	 * Lifecycle hook that triggers before the view is rendered.
	 *
	 * @param {import('pict-view').Renderable} pRenderable - The renderable that will be rendered.
	 */
	onBeforeRender(pRenderable)
	{
		if (!this.initialBundleLoaded)
		{
			if (Array.isArray(this.sectionDefinition.InitialBundle))
			{
				this.pict.EntityProvider.processBundle(this.sectionDefinition.InitialBundle);
			}
			this.initialBundleLoaded = true;
		}
		return super.onBeforeRender(pRenderable);
	}

	/**
	 * Lifecycle hook that triggers before the view is rendered (async flow).
	 *
	 * @param {(error?: Error) => void} fCallback - The callback to call when the async operation is complete.
	 * @param {import('pict-view').Renderable} pRenderable - The renderable that will be rendered.
	 */
	onBeforeRenderAsync(fCallback, pRenderable)
	{
		super.onBeforeRenderAsync((pError) =>
		{
			if (!this.initialBundleLoaded)
			{
				if (Array.isArray(this.sectionDefinition.InitialBundle))
				{
					this.pict.EntityProvider.gatherDataFromServer(this.sectionDefinition.InitialBundle, (pInnerError) =>
					{
						if (pInnerError)
						{
							this.log.error(`Dynamic form [${this.Hash}]::[${this.UUID}] failed to load initial bundle: ${pInnerError}`);
						}
						// in case of an empty array, or all tasks being synchronous, wait for the next tick so we don't get event ordering problems
						setTimeout(() => fCallback(pError), 0);
					});
					return;
				}
				this.initialBundleLoaded = true;
			}
			return fCallback(pError);
		}, pRenderable);
	}

	/**
	 * Lifecycle hook that triggers after the view is rendered.
	 *
	 * @param {import('pict-view').Renderable} pRenderable - The renderable that was rendered.
	 */
	onAfterRender(pRenderable)
	{
		let tmpTransactionGUID = this.fable.getUUID();
		this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);

		try
		{
			this.runLayoutProviderFunctions('onGroupLayoutInitialize', tmpTransactionGUID);
			this.runInputProviderFunctions('onInputInitialize', null, null, tmpTransactionGUID, true);
		}
		catch (pError)
		{
			this.log.error(`Gross error running after render: ${pError.message || pError}`);
		}
		finally
		{
			this.finalizeTransaction(tmpTransactionGUID);
		}

		// The render that just happened repainted this section's markup without anything the solvers put
		// on it -- the setsectionvisibility / setgroupvisibility hide classes, and any highlight class or
		// inline color. Solvers run before the marshal that triggers most renders, so nothing else puts
		// them back: restore them here, once, for every render path.
		if (this.pict.providers.DynamicFormSolverBehaviors && this.sectionDefinition)
		{
			this.pict.providers.DynamicFormSolverBehaviors.reapplySectionDOMState(this.sectionDefinition.Hash);
		}

		return super.onAfterRender(pRenderable);
	}

	/**
	 * Executes layout provider functions based on the given function name.
	 *
	 * These were TODO items that are now done but..  leaving them here to document complexity of why it works this way.
	 *
	 * --> This happens based on markers in the DOM, since we don't know which layout providers are active for which groups.
	 *
	 * --> This is easy to make happen with a macro on groups that gives us the data.
	 *
	 * --> THIS IS NOW SCOPED TO A PARTICULAR GROUP.  That is ... only one layout for a group at a time.
	 *
	 * The easiest way (and a speed up for other queries as such) is to scope it within the view container element
	 *
	 * @param {string} pFunctionName - The name of the function to execute.
	 * @param {string} [pTransactionGUID] - The transaction GUID to use for logging.
	 */
	runLayoutProviderFunctions(pFunctionName, pTransactionGUID)
	{
		const tmpTransactionGUID = (typeof(pTransactionGUID) === 'string') ? pTransactionGUID : this.fable.getUUID();
		const tmpTransaction = this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);

		// Check to see if there are any hooks set from the input templates
		let tmpLayoutProviders = this.pict.ContentAssignment.getElement(`${this.sectionDefinition.DefaultDestinationAddress} [data-i-pictdynamiclayout="true"]`);

		// Slightly more code for getting the active layout providers but provides TRUE DYNAMISM.
		for (let i = 0; i < tmpLayoutProviders.length; i++)
		{
			let tmpGroupIndex = tmpLayoutProviders[0].getAttribute('data-i-pictgroupindex');
			let tmpLayout = tmpLayoutProviders[0].getAttribute('data-i-pictlayout');

			if (isNaN(tmpGroupIndex) || (tmpGroupIndex < 0))
			{
				this.log.warn(`PICT View Metatemplate Helper runLayoutProviderFunctions ${tmpGroupIndex} was not a valid group index.`);
				continue;
			}
			let tmpGroup = this.getGroup(tmpGroupIndex);
			if (!tmpGroup)
			{
				this.log.warn(`PICT View Metatemplate Helper runLayoutProviderFunctions for group ${tmpGroupIndex} was not a valid group.`);
				continue;
			}
			if (!tmpLayout || typeof (tmpLayout) !== 'string')
			{
				this.log.warn(`PICT View Metatemplate Helper runLayoutProviderFunctions for group ${tmpGroup} layout [${tmpLayout}] was not a valid layout.`);
				continue;
			}

			let tmpLayoutProvider = this.pict.providers.MetatemplateGenerator.getGroupLayoutProvider(this, tmpGroup);
			if (tmpLayoutProvider && (pFunctionName in tmpLayoutProvider))
			{
				let tmpFunction = tmpLayoutProvider[pFunctionName];
				if (this.pict.TransactionTracking.checkEvent(tmpTransaction.TransactionKey, `G${tmpGroupIndex}-L${tmpLayout}`, pFunctionName))
				{
					tmpFunction.call(tmpLayoutProvider, this, tmpGroup);
				}
			}
		}
		if (tmpTransactionGUID !== pTransactionGUID)
		{
			this.finalizeTransaction(tmpTransactionGUID);
		}
	}

	/**
	 * @private
	 * @param {string} pFunctionName
	 * @param {string} [pInputHash]
	 * @param {number} [pRowIndex]
	 */
	_trackInfiniteLoop(pFunctionName, pInputHash, pRowIndex)
	{
		this._LoopDetectionData[pFunctionName] = this._LoopDetectionData[pFunctionName] || {};
		const tmpInputSignature = `${pInputHash ?? ''}::${pRowIndex ?? ''}`;
		const tmpNowEpochMS = Date.now();
		this._LoopDetectionData[pFunctionName][tmpInputSignature] = this._LoopDetectionData[pFunctionName][tmpInputSignature] || { Count: 0, Timestamp: tmpNowEpochMS };
		if (tmpNowEpochMS - this._LoopDetectionData[pFunctionName][tmpInputSignature].Timestamp > 1000)
		{
			// only track events within a 1 second window
			this._LoopDetectionData[pFunctionName][tmpInputSignature].Count = 0;
			this._LoopDetectionData[pFunctionName][tmpInputSignature].Timestamp = tmpNowEpochMS;
		}
		this._LoopDetectionData[pFunctionName][tmpInputSignature].Count += 1;
		return this._LoopDetectionData[pFunctionName][tmpInputSignature];
	}

	/**
	 * Runs the input provider functions.
	 *
	 * @param {string} pFunctionName - The name of the function to run for each input provider.
	 * @param {string} [pInputHash] - The hash of the input to run the function for.
	 * @param {number} [pRowIndex] - The index of the row to run the
	 * @param {string} [pTransactionGUID] - The transaction GUID to use for logging.
	 * @param {boolean} [pLoopDetection] - Whether to enable loop detection.
	 */
	runInputProviderFunctions(pFunctionName, pInputHash, pRowIndex, pTransactionGUID, pLoopDetection)
	{
		const tmpLoopData = this._trackInfiniteLoop(pFunctionName, pInputHash, pRowIndex);
		if (pLoopDetection && tmpLoopData.Count > 10) // seems like a reasonable threshold for now (10 inits in a second)
		{
			this.log.fatal(` !!!!!! Infinite loop detected in runInputProviderFunctions for function [${pFunctionName}] on input [${pInputHash}] row [${pRowIndex}] in form [${this.Hash}]::[${this.UUID}].  Aborting further processing.`, { Stack: new Error().stack });
			return;
		}
		const tmpTransactionGUID = (typeof(pTransactionGUID) === 'string') ? pTransactionGUID : this.fable.getUUID();
		const tmpTransaction = this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);

		// Check to see if there are any hooks set from the input templates
		for (let i = 0; i < this.sectionDefinition.Groups.length; i++)
		{
			let tmpGroup = this.sectionDefinition.Groups[i];

			if (Array.isArray(tmpGroup.Rows))
			{
				for (let j = 0; j < tmpGroup.Rows.length; j++)
				{
					// TODO: Do we want row macros?  Let's be still and find out.
					let tmpRow = tmpGroup.Rows[j];
					for (let k = 0; k < tmpRow.Inputs.length; k++)
					{
						let tmpInput = tmpRow.Inputs[k];
						// Now run any providers connected to this input
						if (tmpInput && tmpInput.PictForm
							&& (!pInputHash || (pInputHash === tmpInput.Hash)))
						{
							let tmpInputProviderList = this.getInputProviderList(tmpInput);
							for (let l = 0; l < tmpInputProviderList.length; l++)
							{
								if (this.pict.providers[tmpInputProviderList[l]])
								{
									let tmpHashAddress = this.sectionManifest.resolveHashAddress(tmpInput.Hash);
									let tmpValue = this.sectionManifest.getValueByHash(this.getMarshalDestinationObject(), tmpHashAddress);
									try
									{
										if (this.pict.LogNoisiness > 2)
										{
											this.log.trace(`Dynamic form [${this.Hash}]::[${this.UUID}] running provider [${tmpInputProviderList[l]}] function [${pFunctionName}] for input [${tmpInput.Hash}].`);
										}
										// TODO: Right now the Option input requires this bug to work
										//if (this.pict.TransactionTracking.checkEvent(tmpTransaction.TransactionKey, `I${tmpInput.Hash}-P${tmpInputProviderList[l]}`, pFunctionName))
										if ((tmpInput.PictForm.InputType == 'Option') || this.pict.TransactionTracking.checkEvent(tmpTransaction.TransactionKey, `I${tmpInput.Hash}-P${tmpInputProviderList[l]}`, pFunctionName))
										{
											this.pict.providers[tmpInputProviderList[l]][pFunctionName](this, tmpGroup, j, tmpInput, tmpValue, tmpInput.Macro.HTMLSelector, tmpTransactionGUID);
										}
									}
									catch (pError)
									{
										this.log.error(`Dynamic form [${this.Hash}]::[${this.UUID}] failed to run provider [${tmpInputProviderList[l]}] function [${pFunctionName}] for input [${tmpInput.Hash}] with error: ${pError}`);
									}
								}
								else
								{
									this.log.error(`Dynamic form runInputProviderFunctions core [${this.Hash}]::[${this.UUID}] cannot find provider [${tmpInputProviderList[l]}] for input [${tmpInput.Hash}].`);
								}
							}
						}
					}
				}
			}

			if (tmpGroup.supportingManifest)
			{
				let tmpSupportingManifestDescriptorKeys = Object.keys(tmpGroup.supportingManifest.elementDescriptors);
				for (let k = 0; k < tmpSupportingManifestDescriptorKeys.length; k++)
				{
					let tmpTabularRecordSet = this.getTabularRecordSet(tmpGroup.GroupIndex);
					// No data in the record set, no events to push to providers.
					if (!tmpTabularRecordSet)
					{
						continue;
					}

					if (Array.isArray(tmpTabularRecordSet))
					{
						let tmpInput = tmpGroup.supportingManifest.elementDescriptors[tmpSupportingManifestDescriptorKeys[k]];
						// Now run any providers connected to this input
						if (tmpInput && tmpInput.PictForm
							&& (!pInputHash || (pInputHash === tmpInput.Hash)))
						{
							let tmpInputProviderList = this.getInputProviderList(tmpInput);
							for (let l = 0; l < tmpInputProviderList.length; l++)
							{
								let tmpRowsToExecute = [];
								if (pRowIndex != null)
								{
									if (pRowIndex < tmpTabularRecordSet.length)
									{
										tmpRowsToExecute.push(pRowIndex);
									}
									else
									{
										this.log.error(`Dynamic form runInputProviderFunctions [${this.Hash}]::[${this.UUID}] row index ${pRowIndex} is out of bounds for input [${tmpInput.Hash}] with ${tmpTabularRecordSet.length} rows.`);
									}
								}
								else
								{
									for (let r = 0; r < tmpTabularRecordSet.length; r++)
									{
										tmpRowsToExecute.push(r);
									}
								}
								for (const r of tmpRowsToExecute)
								{
									if (this.pict.providers[tmpInputProviderList[l]] &&
										(pRowIndex === undefined || pRowIndex === null || pRowIndex === r))
									{
										// There is a provider, we have an input and it is supposed to be run through for a record
										let tmpValueAddress = this.pict.providers.Informary.getComposedContainerAddress(tmpInput.PictForm.InformaryContainerAddress, r, tmpInput.PictForm.InformaryDataAddress);
										let tmpValue = this.sectionManifest.getValueByHash(this.getMarshalDestinationObject(), tmpValueAddress);
										try
										{
											if (this.pict.TransactionTracking.checkEvent(tmpTransaction.TransactionKey, `TI${tmpInput.Hash}-P${tmpInputProviderList[l]}-R${r}`, pFunctionName))
											{
												this.pict.providers[tmpInputProviderList[l]][pFunctionName + 'Tabular'](this, tmpGroup, tmpInput, tmpValue, tmpInput.Macro.HTMLSelectorTabular, r, tmpTransactionGUID);
											}
										}
										catch (pError)
										{
											this.log.error(`Dynamic form [${this.Hash}]::[${this.UUID}] failed to run provider [${tmpInputProviderList[l]}] function [${pFunctionName}] for input [${tmpInput.Hash}] with error: ${pError}`);
										}
									}
									else
									{
										this.log.error(`Dynamic form runInputProviderFunctions supporting [${this.Hash}]::[${this.UUID}] cannot find provider [${tmpInputProviderList[l]}] for input [${tmpInput.Hash}]${pRowIndex != null ? ` in row ${pRowIndex}` : ''}.`);
									}
								}
							}
						}
					}
				}
			}
		}
		if (pTransactionGUID !== tmpTransactionGUID)
		{
			this.finalizeTransaction(tmpTransactionGUID);
		}
	}

	/**
	 * Checks if a view-specific template exists based on the given template postfix.
	 * @param {string} pTemplatePostfix - The postfix of the template to check.
	 * @returns {boolean} - Returns true if the view-specific template exists, otherwise false.
	 */
	checkViewSpecificTemplate(pTemplatePostfix)
	{
		// This is here to cut down on complex guards, and, so we can optimize/extend it later if we need to.
		return (this.getViewSpecificTemplateHash(pTemplatePostfix) in this.pict.TemplateProvider.templates);
	}

	/**
	 * Returns the template hash for the view specific template.
	 *
	 * @param {string} pTemplatePostfix - The postfix for the template.
	 * @returns {string} The template hash for the view specific template.
	 */
	getViewSpecificTemplateHash(pTemplatePostfix)
	{
		return `${this.formsTemplateSetPrefix}${pTemplatePostfix}`;
	}

	/**
	 * Checks if a theme-specific template exists.
	 *
	 * @param {string} pTemplatePostfix - The postfix of the template.
	 * @returns {boolean} - Returns true if the theme-specific template exists, otherwise false.
	 */
	checkThemeSpecificTemplate(pTemplatePostfix)
	{
		// This is here to cut down on complex guards, and, so we can optimize/extend it later if we need to.
		return (this.getThemeSpecificTemplateHash(pTemplatePostfix) in this.pict.TemplateProvider.templates);
	}

	/**
	 * Returns the theme-specific template hash based on the given template postfix.
	 *
	 * @param {string} pTemplatePostfix - The postfix to be appended to the default template prefix.
	 * @returns {string} The theme-specific template hash.
	 */
	getThemeSpecificTemplateHash(pTemplatePostfix)
	{
		// This is here to cut down on complex guards, and, so we can optimize/extend it later if we need to.
		return `${this.defaultTemplatePrefix}${pTemplatePostfix}`;
	}

	/**
	 * Rebuilds the custom template fore the dynamic form..
	 */
	rebuildCustomTemplate()
	{
		this.pict.providers.MetatemplateGenerator.rebuildCustomTemplate(this);
	}

	/**
	 * Returns the index of a group within the sectionDefinition.Groups array that matches the provided hash.
	 *
	 * @param {string} pGroupHash - The hash value of the group to find.
	 * @returns {number} The index of the group if found; otherwise, -1.
	 */
	getGroupIndexFromHash(pGroupHash)
	{
		for (let i = 0; i < this.sectionDefinition.Groups.length; i++)
		{
			if (this.sectionDefinition.Groups[i].Hash === pGroupHash)
			{
				return i;
			}
		}
		this.log.warn(`PICT View Metatemplate Helper getGroupIndexByHash could not find group with hash [${pGroupHash}].`);
		return -1;
	}

	/**
	 * Get a group by its hash
	 * @param {string} pGroupHash - The hash of the group to retrieve.
	 * @returns {object|boolean} - The group object if found, or false if the group hash is not found.
	 */
	getGroupFromHash(pGroupHash)
	{
		for (let i = 0; i < this.sectionDefinition.Groups.length; i++)
		{
			if (this.sectionDefinition.Groups[i].Hash === pGroupHash)
			{
				return this.sectionDefinition.Groups[i];
			}
		}
		this.log.warn(`PICT View Metatemplate Helper getGroupByHash could not find group with hash [${pGroupHash}].`);
		return false;
	}

	/**
	 * Retrieves a group from the PICT View Metatemplate Helper based on the provided group index.
	 *
	 * @param {number} pGroupIndex - The index of the group to retrieve.
	 * @returns {object|boolean} - The group object if found, or false if the group index is invalid.
	 */
	getGroup(pGroupIndex)
	{
		if (isNaN(pGroupIndex))
		{
			this.log.warn(`PICT View Metatemplate Helper getGroup ${pGroupIndex} was expecting a number.`);
			return false;
		}
		if (pGroupIndex > this.sectionDefinition.Groups.length)
		{
			this.log.warn(`PICT View Metatemplate Helper getGroup ${pGroupIndex} was out of bounds.`);
			return false;
		}

		return this.sectionDefinition.Groups[pGroupIndex];
	}

	/**
	 * Returns all groups in the section.
	 * @returns {Array}
	 */
	getGroups()
	{
		if (!Array.isArray(this.sectionDefinition.Groups))
		{
			return [];
		}
		return this.sectionDefinition.Groups;
	}

	/**
	 * Get a row for an input form group.
	 *
	 * Rows are a horizontal collection of inputs.
	 *
	 * @param {number} pGroupIndex
	 * @param {number} pRowIndex
	 * @returns
	 */
	getRow(pGroupIndex, pRowIndex)
	{
		let tmpGroup = this.getGroup(pGroupIndex);

		if (tmpGroup)
		{
			if (isNaN(pRowIndex))
			{
				this.log.warn(`PICT View Metatemplate Helper getRow ${pRowIndex} was expecting a number.`);
				return false;
			}
			if (pRowIndex > tmpGroup.Rows.length)
			{
				//this.log.warn(`PICT View Metatemplate Helper getRow ${pRowIndex} was out of bounds.`);
				return [];
			}
			return tmpGroup.Rows[pRowIndex];
		}
		else
		{
			return false;
		}
	}

	/**
	 * Get a customized key value pair object for a specific row.
	 *
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {number} pRowIndex - The index of the row.
	 * @returns {Object} a key value pair for a specific row, used in metatemplating.
	 */
	getRowKeyValuePair(pGroupIndex, pRowIndex)
	{
		return { Key: pGroupIndex, Value: this.getRow(pGroupIndex, pRowIndex), Group: this.getGroup(pGroupIndex) };
	}

	/**
	 *
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {number} pRowIndex - The index of the row.
	 * @param {number} pInputIndex - The index of the input.
	 * @returns {Object|boolean} The input object if found, or false if the input index is invalid.
	 */
	getInput(pGroupIndex, pRowIndex, pInputIndex)
	{
		let tmpRow = this.getRow(pGroupIndex, pRowIndex);

		if (tmpRow)
		{
			if (isNaN(pInputIndex))
			{
				this.log.warn(`PICT View Metatemplate Helper getInput ${pInputIndex} was expecting a number.`);
				return false;
			}
			if (pInputIndex > tmpRow.Inputs.length)
			{
				this.log.warn(`PICT View Metatemplate Helper getInput ${pInputIndex} was out of bounds.`);
				return false;
			}
			return tmpRow.Inputs[pInputIndex];
		}
		else
		{
			return false;
		}
	}

	/**
	 * Retrieves the input provider list for the given input object.
	 *
	 * @param {Object} pInput - The input object.
	 * @returns {Array} The input provider list.
	 */
	getInputProviderList(pInput)
	{
		if (!('PictForm' in pInput))
		{
			return [];
		}
		if (('Providers' in pInput.PictForm) && Array.isArray(pInput.PictForm.Providers))
		{
			let tmpDefaultProviders = this.pict.providers.DynamicInput.getDefaultInputProviders(this, pInput);

			if (tmpDefaultProviders.length > 0)
			{
				return tmpDefaultProviders.concat(pInput.PictForm.Providers);
			}
			return pInput.PictForm.Providers;
		}
		else
		{
			return this.pict.providers.DynamicInput.getDefaultInputProviders(this, pInput);
		}
	}

	/**
	 * Retrieves the input object for a specific hash.
	 *
	 * @param {string} pInputHash - The string hash for an input (not the address).
	 * @returns {Object} The input Object for the given hash.
	 */
	getInputFromHash(pInputHash)
	{
		return this.sectionManifest.getDescriptorByHash(pInputHash);
	}

	/**
	 * Triggers a DataRequest event for an Input Provider
	 *
	 * @param {String} pInputHash - The input hash.
	 * @param {any} [pEvent] - The input event.
	 * @returns {boolean} Whether or not the data request was successful.
	 */
	inputDataRequest(pInputHash, pEvent)
	{
		return this.pict.providers.DynamicInputEvents.inputDataRequest(this, pInputHash, pEvent);
	}

	/**
	 * Handles the generic Input Event for an Input Provider
	 *
	 * @param {String} pInputHash - The input hash object.
	 * @param {string} pEvent - The input event string.
	 * @param {string} [pTransactionGUID] - The transaction GUID.
	 * @returns {any} - The result of the input event handling.
	 */
	inputEvent(pInputHash, pEvent, pTransactionGUID)
	{
		return this.pict.providers.DynamicInputEvents.inputEvent(this, pInputHash, pEvent, pTransactionGUID);
	}

	/**
	 * @deprecated
	 * @param {string} pEvent - The input event string.
	 * @param {Object} pCompletedHashes - the hashes that have already signaled the event
	 * @param {string} [pTransactionGUID] - The transaction GUID.
	 */
	globalInputEvent(pEvent, pCompletedHashes, pTransactionGUID)
	{
		this.manifestInputEvent(pEvent, pCompletedHashes, pTransactionGUID);
	}

	/**
	 *
	 * @param {string} pEvent - The input event string.
	 * @param {Object} pCompletedHashes - the hashes that have already signaled the event
	 * @param {string} [pTransactionGUID] - The transaction GUID.
	 */
	manifestInputEvent(pEvent, pCompletedHashes, pTransactionGUID)
	{
		const tmpTransactionGUID = (pTransactionGUID && typeof(pTransactionGUID) === 'string') ? pTransactionGUID : this.fable.getUUID();
		const tmpInputHashes = Object.keys(this.sectionManifest.elementHashes);

		for (let i = 0; i < tmpInputHashes.length; i++)
		{
			if (!(tmpInputHashes[i] in pCompletedHashes))
			{
				pCompletedHashes[tmpInputHashes[i]] = true;
				this.inputEvent(tmpInputHashes[i], pEvent, pTransactionGUID);
			}
		}
		if (pTransactionGUID !== tmpTransactionGUID)
		{
			// We created a transaction, so finalize it.
			this.finalizeTransaction(tmpTransactionGUID);
		}
	}

	/**
	 * Triggers a DataRequest event for an Input Provider
	 *
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {number} pInputIndex - The index of the input.
	 * @param {number} pRowIndex - The index of the row.
	 * @param {any} [pEvent] - The input event.
	 * @returns {Promise<any>} A promise that resolves with the input data.
	 */
	inputDataRequestTabular(pGroupIndex, pInputIndex, pRowIndex, pEvent)
	{
		return this.pict.providers.DynamicInputEvents.inputDataRequestTabular(this, pGroupIndex, pInputIndex, pRowIndex, pEvent);
	}

	/**
	 * Handles the generic Tabular Input Event for an Input Provider
	 *
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {number} pInputIndex - The index of the input.
	 * @param {number} pRowIndex - The index of the row.
	 * @param {string} pEvent - The input event object.
	 * @param {string} [pTransactionGUID] - The transaction GUID.
	 * @returns {any} - The result of the input event handling.
	 */
	inputEventTabular(pGroupIndex, pInputIndex, pRowIndex, pEvent, pTransactionGUID)
	{
		return this.pict.providers.DynamicInputEvents.inputEventTabular(this, pGroupIndex, pInputIndex, pRowIndex, pEvent, pTransactionGUID);
	}

	/**
	 * @param {string} pTransactionGUID - The transaction GUID.
	 * @param {string} pAsyncOperationHash - The hash of the async operation.
	 */
	registerEventTransactionAsyncOperation(pTransactionGUID, pAsyncOperationHash)
	{
		this.pict.TransactionTracking.pushToTransactionQueue(pTransactionGUID, pAsyncOperationHash, PENDING_ASYNC_OPERATION_TYPE);
	}

	/**
	 * FIXME: consolidate with same functions(s) in the metacontroller
	 *
	 * @param {string} pTransactionGUID - The transaction GUID.
	 * @param {string} pAsyncOperationHash - The hash of the async operation.
	 *
	 * @return {boolean} - Returns true if the async operation was found and marked as complete, otherwise false.
	 */
	eventTransactionAsyncOperationComplete(pTransactionGUID, pAsyncOperationHash)
	{
		const tmpQueue = this.pict.TransactionTracking.checkTransactionQueue(pTransactionGUID);
		let tmpPendingAsyncOperationCount = 0;
		let tmpMarkedOperationCount = 0;
		let tmpReadyToFinalize = false;
		for (let i = 0; i < tmpQueue.length; i++)
		{
			const tmpQueueItem = tmpQueue[i];
			if (tmpQueueItem.Type === PENDING_ASYNC_OPERATION_TYPE)
			{
				if (tmpQueueItem.Data === pAsyncOperationHash)
				{
					tmpQueue.splice(i, 1);
					++tmpMarkedOperationCount;
					--i;
				}
				else
				{
					++tmpPendingAsyncOperationCount;
				}
			}
			if (tmpQueueItem.Type === READY_TO_FINALIZE_TYPE)
			{
				tmpReadyToFinalize = true;
			}
		}
		if (tmpMarkedOperationCount === 0)
		{
			this.log.error(`PICT View Metatemplate Helper eventTransactionAsyncOperationComplete ${pTransactionGUID} could not find async operation with hash ${pAsyncOperationHash}.`);
			return;
		}
		if (tmpReadyToFinalize && tmpPendingAsyncOperationCount === 0)
		{
			for (let i = 0; i < tmpQueue.length; i++)
			{
				const tmpQueueItem = tmpQueue[i];
				if (tmpQueueItem.Type === TRANSACTION_COMPLETE_CALLBACK_TYPE)
				{
					tmpQueue.splice(i, 1);
					--i;
					if (typeof tmpQueueItem.Data !== 'function')
					{
						this.log.error(`PICT View Metatemplate Helper eventTransactionAsyncOperationComplete transaction callback was not a function.`);
						continue;
					}
					try
					{
						tmpQueueItem.Data();
					}
					catch (pError)
					{
						this.log.error(`PICT View Metatemplate Helper eventTransactionAsyncOperationComplete transaction callback error: ${pError}`, { Stack: pError.stack });
					}
				}
			}
			delete this.pict.TransactionTracking.transactions[pTransactionGUID];
		}
		return tmpMarkedOperationCount > 0;
	}

	/**
	 * @param {string} pTransactionGUID - The transaction GUID.
	 *
	 * @return {boolean} - Returns true if the transaction was found and able to be finalized, otherwise false.
	 */
	finalizeTransaction(pTransactionGUID)
	{
		this.pict.TransactionTracking.pushToTransactionQueue(pTransactionGUID, null, READY_TO_FINALIZE_TYPE);

		const tmpQueue = this.pict.TransactionTracking.checkTransactionQueue(pTransactionGUID);
		let tmpPendingAsyncOperationCount = 0;
		for (const tmpQueueItem of tmpQueue)
		{
			if (tmpQueueItem.Type === PENDING_ASYNC_OPERATION_TYPE)
			{
				++tmpPendingAsyncOperationCount;
			}
		}
		if (tmpPendingAsyncOperationCount > 0)
		{
			this.pict.log.info(`PICT View Metatemplate Helper finalizeTransaction ${pTransactionGUID} is waiting on ${tmpPendingAsyncOperationCount} pending async operations.`);
			return false;
		}
		for (let i = 0; i < tmpQueue.length; i++)
		{
			const tmpQueueItem = tmpQueue[i];
			if (tmpQueueItem.Type === TRANSACTION_COMPLETE_CALLBACK_TYPE)
			{
				tmpQueue.splice(i, 1);
				--i;
				if (typeof tmpQueueItem.Data !== 'function')
				{
					this.log.error(`PICT View Metatemplate Helper finalizeTransaction transaction callback was not a function.`);
					continue;
				}
				try
				{
					tmpQueueItem.Data();
				}
				catch (pError)
				{
					this.log.error(`PICT View Metatemplate Helper finalizeTransaction transaction callback error: ${pError}`, { Stack: pError.stack });
				}
			}
		}
		delete this.pict.TransactionTracking.transactions[pTransactionGUID];
		return true;
	}

	/**
	 * @param {string} pTransactionGUID - The transaction GUID.
	 * @param {Function} fCallback - The callback to call when the transaction is complete.
	 */
	registerOnTransactionCompleteCallback(pTransactionGUID, fCallback)
	{
		const tmpQueue = this.pict.TransactionTracking.checkTransactionQueue(pTransactionGUID);
		let tmpPendingAsyncOperationCount = 0;
		let tmpReadyToFinalize = false;
		for (const tmpQueueItem of tmpQueue)
		{
			if (tmpQueueItem.Type === PENDING_ASYNC_OPERATION_TYPE)
			{
				++tmpPendingAsyncOperationCount;
			}
			if (tmpQueueItem.Type === READY_TO_FINALIZE_TYPE)
			{
				tmpReadyToFinalize = true;
			}
		}
		if (tmpReadyToFinalize && tmpPendingAsyncOperationCount === 0)
		{
			fCallback();
		}
		else
		{
			this.pict.TransactionTracking.pushToTransactionQueue(pTransactionGUID, fCallback, TRANSACTION_COMPLETE_CALLBACK_TYPE);
		}
	}

	/**
	 *
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {string} pEvent - The input event string.
	 * @param {Object} pCompletedHashes - the hashes that have already signaled the event
	 * @param {string} [pTransactionGUID] - The transaction GUID.
	 */
	groupInputEvent(pGroupIndex, pEvent, pCompletedHashes, pTransactionGUID)
	{
		const tmpGroup = this.getGroup(pGroupIndex);

		if (!tmpGroup)
		{
			this.log.warn(`PICT View Metatemplate Helper subManifestInputEvent ${pGroupIndex} is not a valid group index.`);
			return;
		}

		const tmpTransactionGUID = (pTransactionGUID && typeof(pTransactionGUID) === 'string') ? pTransactionGUID : this.fable.getUUID();
		if (pTransactionGUID !== tmpTransactionGUID)
		{
			this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);
		}
		if (tmpGroup.Rows.length < 1)
		{
			// tabular
			const tmpRecordSetRows = this.getTabularRecordSet(pGroupIndex);
			if (!Array.isArray(tmpRecordSetRows))
			{
				return;
			}
			for (let i = 0; i < tmpRecordSetRows.length; i++)
			{
				for (const tmpInput of Object.values(tmpGroup.supportingManifest.elementDescriptors))
				{
					const tmpInputSignature = `${this.Hash}-${tmpGroup.Hash}-${tmpInput.Hash}-${i}`;
					if (!(tmpInputSignature in pCompletedHashes))
					{
						pCompletedHashes[tmpInputSignature] = true;
						this.inputEventTabular(pGroupIndex, tmpInput.PictForm.InputIndex, i, pEvent, tmpTransactionGUID);
					}
				}
			}
		}
		for (const tmpRow of tmpGroup.Rows || [])
		{
			for (const tmpInput of tmpRow.Inputs || [])
			{
				const tmpInputSignature = `${this.Hash}-${tmpGroup.Hash}-${tmpInput.Hash}-${tmpRow.Hash}`;
				if (!(tmpInputSignature in pCompletedHashes))
				{
					pCompletedHashes[tmpInputSignature] = true;
					this.inputEvent(tmpInput.Hash, pEvent, tmpTransactionGUID);
				}
			}
		}
		if (pTransactionGUID !== tmpTransactionGUID)
		{
			// We created a transaction, so finalize it.
			this.finalizeTransaction(tmpTransactionGUID);
		}
	}

	/**
	 *
	 * @param {string} pEvent - The input event string.
	 * @param {Object} pCompletedHashes - the hashes that have already signaled the event
	 * @param {string} [pTransactionGUID] - The transaction GUID.
	 */
	sectionInputEvent(pEvent, pCompletedHashes, pTransactionGUID)
	{
		const tmpGroupCount = this.sectionDefinition.Groups.length;
		const tmpTransactionGUID = (pTransactionGUID && typeof(pTransactionGUID) === 'string') ? pTransactionGUID : this.fable.getUUID();
		if (pTransactionGUID !== tmpTransactionGUID)
		{
			this.pict.TransactionTracking.registerTransaction(tmpTransactionGUID);
		}

		for (let i = 0; i < tmpGroupCount; i++)
		{
			this.groupInputEvent(i, pEvent, pCompletedHashes, pTransactionGUID);
		}
		if (pTransactionGUID !== tmpTransactionGUID)
		{
			this.finalizeTransaction(tmpTransactionGUID);
		}
	}

	/**
	 * Get the input object for a specific tabular record group and index.
	 *
	 * Input objects are not distinct among rows.
	 *
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {number} pInputIndex - The index of the input.
	 * @returns
	 */
	getTabularRecordInput(pGroupIndex, pInputIndex)
	{
		return this.pict.providers.DynamicTabularData.getTabularRecordInput(this, pGroupIndex, pInputIndex);
	}

	/**
	 * Get the input object for a specific tabular record group and index.
	 *
	 * Input objects are not distinct among rows.
	 *
	 * @param {string} pGroupHash - The hash of the group.
	 * @param {string} pInputHash - The hash of the input.
	 *
	 * @return {Object} The input object.
	 */
	getTabularRecordInputByHash(pGroupHash, pInputHash)
	{
		return this.pict.providers.DynamicTabularData.getTabularRecordInputByHash(this, pGroupHash, pInputHash);
	}

	/**
	 * Get the tabular record object for a particular row in a group.
	 *
	 * @param {number} pGroupIndex
	 * @param {number} pRowIdentifier - The row number
	 * @returns {Object} The record for the particular row
	 */
	getTabularRecordData(pGroupIndex, pRowIdentifier)
	{
		return this.pict.providers.DynamicTabularData.getTabularRecordData(this, pGroupIndex, pRowIdentifier);
	}

	/**
	 * Get the tabular record set for a particular group.
	 *
	 * @param {number} pGroupIndex
	 * @returns {Array} The record set for the group.
	 */
	getTabularRecordSet(pGroupIndex)
	{
		return this.pict.providers.DynamicTabularData.getTabularRecordSet(this, pGroupIndex);
	}

	/**
	 * Add a new data row to the end of a dynamic tabular group.
	 *
	 * This will generate any defaults in the SubManifest.
	 *
	 * @param {number} pGroupIndex
	 * @returns
	 */
	createDynamicTableRow(pGroupIndex)
	{
		return this.pict.providers.DynamicTabularData.createDynamicTableRow(this, pGroupIndex);
	}

	/**
	 * Move a dynamic table row to an arbitrary position in the array.
	 *
	 * @param {number} pGroupIndex - The group to manage the dynamic table row for
	 * @param {number} pRowIndex - The row to move
	 * @param {number} pNewRowIndex - The new position for the row
	 * @returns {boolean} True if the move was successful, or false if it wasn't.
	 */
	setDynamicTableRowIndex(pGroupIndex, pRowIndex, pNewRowIndex)
	{
		return this.pict.providers.DynamicTabularData.setDynamicTableRowIndex(this, pGroupIndex, pRowIndex, pNewRowIndex);
	}

	/**
	 * Move a dynamic table row down
	 *
	 * @param {number} pGroupIndex - The group to manage the dynamic table row for
	 * @param {number} pRowIndex - The row to move down
	 * @returns {boolean} True if the move was successful, or false if it wasn't.
	 */
	moveDynamicTableRowDown(pGroupIndex, pRowIndex)
	{
		return this.pict.providers.DynamicTabularData.moveDynamicTableRowDown(this, pGroupIndex, pRowIndex);
	}

	/**
	 * Move a dynamic table row up
	 *
	 * @param {number} pGroupIndex - The group to manage the dynamic table row for
	 * @param {number} pRowIndex - The row to move up
	 * @returns {boolean} True if the move was successful, or false if it wasn't.
	 */
	moveDynamicTableRowUp(pGroupIndex, pRowIndex)
	{
		return this.pict.providers.DynamicTabularData.moveDynamicTableRowUp(this, pGroupIndex, pRowIndex);
	}

	/**
	 * Deletes a dynamic table row.
	 *
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {number} pRowIndex - The index of the row.
	 * @returns {Promise} A promise that resolves when the row is deleted.
	 */
	deleteDynamicTableRow(pGroupIndex, pRowIndex)
	{
		return this.pict.providers.DynamicTabularData.deleteDynamicTableRow(this, pGroupIndex, pRowIndex);
	}

	/**
	 * Returns whether the current form is a Pict Section form.
	 * @returns {boolean} True if the form is a Pict Section form, false otherwise.
	 */
	get isPictSectionForm()
	{
		return true;
	}
}

module.exports = PictViewDynamicForm;

module.exports.default_configuration = _DefaultConfiguration;
