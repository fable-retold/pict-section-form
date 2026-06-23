const libPictProvider = require('pict-provider');

/** @type {Record<string, any>} */
const _DefaultProviderConfiguration = (
{
	"ProviderIdentifier": "Pict-DynamicForms-DynamicTabularData",

	"AutoInitialize": true,
	"AutoInitializeOrdinal": 0,

	"AutoSolveWithApp": false
});

/**
 * @typedef {Object} ElementDescriptor
 * @property {string} Hash - The hash of the element.
 */

/**
 * The DynamicTabularData class is a provider that translates simple list entries into arrays of entries ready to use in drop-down lists and such
 */
class DynamicTabularData extends libPictProvider
{
	/**
	 * Creates an instance of the DynamicTabularData class.
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
		/** @type {import('pict')} */
		this.pict;
		/** @type {any} */
		this.log;
	}

	/**
	 * Retrieves the tabular record set from the specified view and group index.
	 *
	 * @param {Object} pView - The view object.
	 * @param {number} pGroupIndex - The index of the group.
	 * @returns {Array|Object|boolean} - The tabular record set if it exists, otherwise false.
	 */
	getTabularRecordSet(pView, pGroupIndex)
	{
		// The neat thing about how the tabular groups work is that we can make it clever about whether it's an object or an array.
		let tmpGroup = pView.getGroup(pGroupIndex);
		if (!tmpGroup || !tmpGroup?.RecordSetAddress)
		{
			this.log.warn(`PICT View Metatemplate Helper getTabularRecordSet ${pGroupIndex} was not a valid group or did not have a valid RecordSetAddress.`);
			return false;
		}

		let tmpRowSource = pView.sectionManifest.getValueByHash(pView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);

		return tmpRowSource;
	}

	/**
	 * Retrieves the tabular record input from the specified view, group, and input indexes.
	 *
	 * @param {Object} pView - The view object.
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {number} pInputIndex - The index of the input.
	 * @returns {ElementDescriptor|boolean} The tabular record input or false if the group is invalid.
	 */
	getTabularRecordInput(pView, pGroupIndex, pInputIndex)
	{
		// The neat thing about how the tabular groups work is that we can make it clever about whether it's an object or an array.
		let tmpGroup = pView.getGroup(pGroupIndex);

		if (!tmpGroup)
		{
			this.log.warn(`PICT View Metatemplate Helper getTabularRecordInput ${pGroupIndex} was not a valid group.`);
			return false;
		}

		// Now get the supporting manifest and the input element
		// This needs more guards
		let tmpSupportingManifestHash = tmpGroup.supportingManifest.elementAddresses[pInputIndex];
		return tmpGroup.supportingManifest.elementDescriptors[tmpSupportingManifestHash];
	}

	/**
	 * Retrieves the tabular record input from the specified view, group, and input indexes.
	 *
	 * @param {Object} pView - The view object.
	 * @param {number} pGroupHash - The index of the group.
	 * @param {number} pInputHash - The index of the input.
	 * @returns {ElementDescriptor|boolean} The tabular record input or false if the group is invalid.
	 */
	getTabularRecordInputByHash(pView, pGroupHash, pInputHash)
	{
		// The neat thing about how the tabular groups work is that we can make it clever about whether it's an object or an array.
		let tmpGroup = pView.getGroups().find((pGroup) => pGroup.Hash === pGroupHash);

		if (!tmpGroup)
		{
			this.log.warn(`PICT View Metatemplate Helper getTabularRecordInputByHash ${pGroupHash} was not a valid group.`);
			return false;
		}

		if (!tmpGroup.supportingManifest)
		{
			this.log.warn(`PICT View Metatemplate Helper getTabularRecordInputByHash ${pGroupHash} s not a tabular group.`);
			return false;
		}

		// Now get the supporting manifest and the input element
		// This needs more guards
		for (const tmpDescriptor of Object.values(tmpGroup.supportingManifest.elementDescriptors))
		{
			if (tmpDescriptor.Hash === pInputHash)
			{
				return tmpDescriptor;
			}
		}

		this.log.warn(`PICT View Metatemplate Helper getTabularRecordInputByHash ${pGroupHash} could not find input ${pInputHash}.`);
		return false;
	}

	/**
	 * Retrieves tabular record data based on the provided parameters.
	 *
	 * @param {Object} pView - The view object.
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {string} pRowIdentifier - The identifier of the row.
	 * @returns {boolean|Object} - The tabular record data or false if not found.
	 */
	getTabularRecordData(pView, pGroupIndex, pRowIdentifier)
	{
		// The neat thing about how the tabular groups work is that we can make it clever about whether it's an object or an array.
		let tmpGroup = pView.getGroup(pGroupIndex);

		if (!tmpGroup)
		{
			this.log.warn(`PICT View Metatemplate Helper getTabularRecordData ${pGroupIndex} was not a valid group.`);
			return false;
		}

		// Now identify the group
		let tmpRowSourceRecord =  pView.sectionManifest.getValueByHash(pView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);

		if (!tmpRowSourceRecord)
		{
			// Try the address
			tmpRowSourceRecord = pView.sectionManifest.getValueAtAddress(pView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);
		}

		if (!tmpRowSourceRecord)
		{
			this.log.warn(`PICT View Metatemplate Helper getTabularRecordData ${pGroupIndex} could not find the record set for ${tmpGroup.RecordSetAddress}.`);
			return false;
		}

		// Now we have the source record let's see what it is
		try
		{
			if (Array.isArray(tmpRowSourceRecord))
			{
				return tmpRowSourceRecord[pRowIdentifier];
			}
			else if (typeof(tmpRowSourceRecord) === 'object')
			{
				return tmpRowSourceRecord[pRowIdentifier];
			}
			else
			{
				this.log.warn(`PICT View Metatemplate Helper getTabularRecordData ${pGroupIndex} could not determine the type of the record set for ${tmpGroup.RecordSetAddress}.`);
				return false;
			}
		}
		catch (pError)
		{
			this.log.error(`PICT View Metatemplate Helper getTabularRecordData ${pGroupIndex} encountered an error: ${pError}`);
			return false;
		}
	}

	/**
	 * Creates a dynamic table row for the given view and group index.
	 *
	 * @param {Object} pView - The view object.
	 * @param {number} pGroupIndex - The index of the group.
	 */
	createDynamicTableRow(pView, pGroupIndex)
	{
		let tmpGroup = pView.getGroup(pGroupIndex);

		if (tmpGroup)
		{
			let tmpDestinationObject = pView.sectionManifest.getValueByHash(pView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);

			if (Array.isArray(tmpDestinationObject))
			{
				if (tmpGroup.MaximumRowCount && (tmpDestinationObject.length >= tmpGroup.MaximumRowCount))
				{
					this.log.warn(`Dynamic View [${pView.UUID}]::[${pView.Hash}] Group ${tmpGroup.Hash} attempting to add a row but the maximum rows ${tmpGroup.MaximumRowCount} has been reached.`);
					return;
				}
				let tmpRowPrototype = {};
				if (tmpGroup.DefaultRows && tmpDestinationObject.length < tmpGroup.DefaultRows.length)
				{
					tmpRowPrototype = JSON.parse(JSON.stringify(tmpGroup.DefaultRows[tmpDestinationObject.length]));
				}
				tmpDestinationObject.push(tmpGroup.supportingManifest.populateDefaults(tmpRowPrototype));

				// Also render any other views that have this as the RecordSetAddress
				// Filter the views by each Group.RecordSetAddress and find the ones with this RecordSetAddress
				let tmpViewsToRender = this.pict.views.PictFormMetacontroller.filterViews(
					/** @param {import('../views/Pict-View-DynamicForm.js')} pViewToTestForGroup */
					(pViewToTestForGroup) =>
					{
						if (!pViewToTestForGroup.isPictSectionForm)
						{
							return false;
						}
						let tmpGroupsToTest = pViewToTestForGroup.getGroups();
						for (let i = 0; i < tmpGroupsToTest.length; i++)
						{
							if (tmpGroupsToTest[i].RecordSetAddress == tmpGroup.RecordSetAddress)
							{
								return true;
							}
						}
						return false;
					}
				)
				// We expect this view to be in the set. Re-rendering an entity-selector
				// table clobbers its selected values in the model, so preserve them.
				this._renderViewsPreservingRecordSet(tmpGroup.RecordSetAddress, tmpViewsToRender);

				// Rebuild any OTHER views whose DynamicColumns are sourced from this record set
				// (e.g. a "% Passing" table whose columns are generated from this "Products" table)
				// HERE, in the render phase -- BEFORE the marshal below -- so the column DOM is
				// correct when the marshal fills it. Previously these dependent tables were only
				// rebuilt from inside the Tabular layout's onDataMarshalToForm hook (mid-marshal),
				// which left the freshly rebuilt cells unpopulated until a later edit/marshal --
				// the "dependent table blanks out on row add/delete until you edit a field" bug.
				this._rebuildDependentDynamicColumnViews(tmpGroup.RecordSetAddress);

				// Run the solver
				this.pict.providers.DynamicSolver.solveViews();

				//pView.render();
				//pView.marshalToView();
				// We've re-rendered but we don't know what needs to be marshaled based on the solve that ran above so marshal everything
				this.pict.views.PictFormMetacontroller.marshalFormSections();
			}
		}
	}


	/**
	 * Creates a dynamic table row for the given view and group index without firing render or marshal events.
	 *
	 * @param {Object} pView - The view object.
	 * @param {number} pGroupIndex - The index of the group.
	 */
	createDynamicTableRowWithoutEvents(pView, pGroupIndex)
	{
		let tmpGroup = pView.getGroup(pGroupIndex);

		if (tmpGroup)
		{
			let tmpDestinationObject = pView.sectionManifest.getValueByHash(pView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);

			if (Array.isArray(tmpDestinationObject))
			{
				if (tmpGroup.MaximumRowCount && (tmpDestinationObject.length >= tmpGroup.MaximumRowCount))
				{
					this.log.warn(`Dynamic View [${pView.UUID}]::[${pView.Hash}] Group ${tmpGroup.Hash} attempting to add a row but the maximum rows ${tmpGroup.MaximumRowCount} has been reached.`);
					return;
				}
				let tmpRowPrototype = {};
				if (tmpGroup.DefaultRows && tmpDestinationObject.length < tmpGroup.DefaultRows.length)
				{
					tmpRowPrototype = JSON.parse(JSON.stringify(tmpGroup.DefaultRows[tmpDestinationObject.length]));
				}
				tmpDestinationObject.push(tmpGroup.supportingManifest.populateDefaults(tmpRowPrototype))
			}
		}
	}

	/**
	 * Sets the index of a dynamic table row in a view.
	 *
	 * @param {Object} pView - The view object.
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {number|string} pRowIndex - The current index of the row.
	 * @param {number} pNewRowIndex - The new index to move the row to.
	 * @returns {boolean} - Returns false if the index is out of bounds, otherwise returns undefined.
	 */
	setDynamicTableRowIndex(pView, pGroupIndex, pRowIndex, pNewRowIndex)
	{
		let tmpGroup = pView.getGroup(pGroupIndex);

		if (tmpGroup)
		{
			let tmpDestinationObject = pView.sectionManifest.getValueByHash(pView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);

			if (Array.isArray(tmpDestinationObject))
			{
				let tmpRowIndex = parseInt(String(pRowIndex), 10);
				let tmpNewRowIndex = parseInt(String(pNewRowIndex), 10);
				if ((tmpDestinationObject.length <= tmpRowIndex) || (tmpRowIndex < 0))
				{
					this.log.error(`Dynamic View [${pView.UUID}]::[${pView.Hash}] Group ${tmpGroup.Hash} attempting to move row [${pRowIndex}] to [${pNewRowIndex}] but the index is out of bounds.`);
					return false;
				}
				let tmpOriginalLength = tmpDestinationObject.length;
				let tmpElementToBeMoved = tmpDestinationObject.splice(tmpRowIndex, 1);
				tmpDestinationObject.splice(tmpNewRowIndex, 0, tmpElementToBeMoved[0]);

				// Position-keyed DynamicColumns (KeyBy:"Position") store dependent cell data by the
				// source row's INDEX, so a source reorder must apply the same permutation to every
				// dependent row's positional cells -- otherwise user-entered values stay put while
				// their column re-labels to a different source row. Must run BEFORE the dependent
				// views re-resolve their columns below. No-op for value-keyed generators.
				this._moveDependentPositionalColumns(tmpGroup.RecordSetAddress, tmpRowIndex, tmpNewRowIndex, tmpOriginalLength);

				// Render (source + dependent views) BEFORE solving so dependent DynamicColumns tables
				// don't blank until the next edit, and the solve's DOM side effects survive. Matches
				// the add/delete handlers' order.
				this._repaintAfterRowReorder(tmpGroup);
			}
		}
	}

	/**
	 * Moves a dynamic table row down within a view.
	 *
	 * @param {Object} pView - The view containing the dynamic table.
	 * @param {number} pGroupIndex - The index of the group containing the row.
	 * @param {number|string} pRowIndex - The index of the row to be moved.
	 * @returns {boolean} - Returns true if the row was successfully moved, false otherwise.
	 */
	moveDynamicTableRowDown(pView, pGroupIndex, pRowIndex)
	{
		let tmpGroup = pView.getGroup(pGroupIndex);

		if (tmpGroup)
		{
			let tmpDestinationObject = pView.sectionManifest.getValueByHash(pView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);

			if (Array.isArray(tmpDestinationObject))
			{
				let tmpRowIndex = parseInt(String(pRowIndex), 10);
				if (tmpDestinationObject.length <= tmpRowIndex)
				{
					this.log.error(`Dynamic View [${pView.UUID}]::[${pView.Hash}] Group ${tmpGroup.Hash} attempting to move row [${pRowIndex}] down but it's already at the bottom.`);
					return false;
				}
				let tmpOriginalLength = tmpDestinationObject.length;
				let tmpElementToBeMoved = tmpDestinationObject.splice(tmpRowIndex, 1);
				let tmpNewRowIndex = tmpRowIndex + 1;
				tmpDestinationObject.splice(tmpNewRowIndex, 0, tmpElementToBeMoved[0]);

				// Position-keyed DynamicColumns (KeyBy:"Position") store dependent cell data by the
				// source row's INDEX, so a source reorder must apply the same permutation to every
				// dependent row's positional cells -- otherwise user-entered values stay put while
				// their column re-labels to a different source row. Must run BEFORE the dependent
				// views re-resolve their columns below. No-op for value-keyed generators.
				this._moveDependentPositionalColumns(tmpGroup.RecordSetAddress, tmpRowIndex, tmpNewRowIndex, tmpOriginalLength);

				// Render (source + dependent views) BEFORE solving so the solve's DOM side effects
				// (e.g. SetGroupVisibility hiding a validation message) act on the freshly rebuilt
				// DOM and survive, and so dependent DynamicColumns tables don't blank until the next
				// edit. Matches the add/delete handlers' order.
				this._repaintAfterRowReorder(tmpGroup);
			}
		}
	}

	/**
	 * Moves a dynamic table row up.
	 *
	 * @param {Object} pView - The view object.
	 * @param {number} pGroupIndex - The index of the group.
	 * @param {number|string} pRowIndex - The index of the row to be moved.
	 * @returns {boolean} Returns true if the row was moved successfully, false otherwise.
	 */
	moveDynamicTableRowUp(pView, pGroupIndex, pRowIndex)
	{
		let tmpGroup = pView.getGroup(pGroupIndex);

		if (tmpGroup)
		{
			let tmpDestinationObject = pView.sectionManifest.getValueByHash(pView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);

			if (Array.isArray(tmpDestinationObject))
			{
				let tmpRowIndex = parseInt(String(pRowIndex), 10);
				if (tmpRowIndex == 0)
				{
					this.log.error(`Dynamic View [${pView.UUID}]::[${pView.Hash}] Group ${tmpGroup.Hash} attempting to move row [${pRowIndex}] up but it's already at the top.`);
					return false;
				}
				if (tmpDestinationObject.length <= tmpRowIndex)
				{
					this.log.error(`Dynamic View [${pView.UUID}]::[${pView.Hash}] Group ${tmpGroup.Hash} attempting to move row [${pRowIndex}] but the index is out of bounds.`);
					return false;
				}
				let tmpOriginalLength = tmpDestinationObject.length;
				let tmpElementToBeMoved = tmpDestinationObject.splice(tmpRowIndex, 1);
				let tmpNewRowIndex = tmpRowIndex - 1;
				tmpDestinationObject.splice(tmpNewRowIndex, 0, tmpElementToBeMoved[0]);

				// Position-keyed DynamicColumns (KeyBy:"Position") store dependent cell data by the
				// source row's INDEX, so a source reorder must apply the same permutation to every
				// dependent row's positional cells -- otherwise user-entered values stay put while
				// their column re-labels to a different source row. Must run BEFORE the dependent
				// views re-resolve their columns below. No-op for value-keyed generators.
				this._moveDependentPositionalColumns(tmpGroup.RecordSetAddress, tmpRowIndex, tmpNewRowIndex, tmpOriginalLength);

				// Render (source + dependent views) BEFORE solving so the solve's DOM side effects
				// (e.g. SetGroupVisibility hiding a validation message) act on the freshly rebuilt
				// DOM and survive, and so dependent DynamicColumns tables don't blank until the next
				// edit. Matches the add/delete handlers' order.
				this._repaintAfterRowReorder(tmpGroup);
			}
		}
	}


	/**
	 * Deletes a dynamic table row from the specified view.
	 *
	 * @param {Object} pView - The view from which to delete the row.
	 * @param {number} pGroupIndex - The index of the group containing the row.
	 * @param {number|string} pRowIndex - The index or key of the row to delete.
	 * @returns {boolean} - Returns true if the row was successfully deleted, false otherwise.
	 */
	deleteDynamicTableRow(pView, pGroupIndex, pRowIndex)
	{
		let tmpGroup = pView.getGroup(pGroupIndex);

		if (tmpGroup)
		{
			let tmpDestinationObject = pView.sectionManifest.getValueByHash(pView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);

			if (Array.isArray(tmpDestinationObject))
			{
				if (tmpGroup.MinimumRowCount && (tmpDestinationObject.length <= tmpGroup.MinimumRowCount))
				{
					this.log.warn(`Dynamic View [${pView.UUID}]::[${pView.Hash}] Group ${tmpGroup.Hash} attempting to delete a row but the minimum rows ${tmpGroup.MinimumRowCount} has been reached.`);
					return false;
				}

				let tmpRowIndex = parseInt(String(pRowIndex), 10);
				if (tmpDestinationObject.length <= tmpRowIndex)
				{
					this.log.error(`Dynamic View [${pView.UUID}]::[${pView.Hash}] Group ${tmpGroup.Hash} attempting to delete row [${pRowIndex}] but the index is out of bounds.`);
					return false;
				}
				let tmpOriginalLength = tmpDestinationObject.length;
				tmpDestinationObject.splice(tmpRowIndex, 1);

				// Position-keyed DynamicColumns (KeyBy:"Position") store dependent cell data by the
				// source row's INDEX, so deleting a source row must shift every dependent row's
				// positional cells down past the removed index -- otherwise the values below it
				// re-associate to the wrong column. (Solver-filled cells re-derive on the next
				// solve; user-entered cells would shift without this.) Must run BEFORE the
				// dependent views re-resolve their columns below. No-op for value-keyed generators.
				this._spliceDependentPositionalColumns(tmpGroup.RecordSetAddress, tmpRowIndex, tmpOriginalLength);

				// Also render any other views that have this as the RecordSetAddress
				// Filter the views by each Group.RecordSetAddress and find the ones with this RecordSetAddress
				let tmpViewsToRender = this.pict.views.PictFormMetacontroller.filterViews(
					(pViewToTestForGroup) =>
					{
						if (!pViewToTestForGroup.isPictSectionForm)
						{
							return false;
						}
						let tmpGroupsToTest = pViewToTestForGroup.getGroups();
						for (let i = 0; i < tmpGroupsToTest.length; i++)
						{
							if (tmpGroupsToTest[i].RecordSetAddress == tmpGroup.RecordSetAddress)
							{
								return true;
							}
						}
						return false;
					}
				)
				// We expect this view to be in the set. Re-rendering an entity-selector
				// table clobbers its selected values in the model, so preserve them.
				this._renderViewsPreservingRecordSet(tmpGroup.RecordSetAddress, tmpViewsToRender);

				// Rebuild any OTHER views whose DynamicColumns are sourced from this record set
				// (e.g. a "% Passing" table whose columns are generated from this "Products" table)
				// HERE, in the render phase -- BEFORE the marshal below -- so the column DOM is
				// correct when the marshal fills it. Previously these dependent tables were only
				// rebuilt from inside the Tabular layout's onDataMarshalToForm hook (mid-marshal),
				// which left the freshly rebuilt cells unpopulated until a later edit/marshal --
				// the "dependent table blanks out on row add/delete until you edit a field" bug.
				this._rebuildDependentDynamicColumnViews(tmpGroup.RecordSetAddress);

				// Run the solver
				this.pict.providers.DynamicSolver.solveViews();

				// We've re-rendered but we don't know what needs to be marshaled based on the solve that ran above so marshal everything
				this.pict.views.PictFormMetacontroller.marshalFormSections();
			}
		}
	}

	/**
	 * Render every view in pViewsToRender while preserving pRecordSetAddress's data in
	 * the model. Re-rendering a table that contains entity-selector cells (Material /
	 * Organization / Product / etc.) destroys and recreates their select2 widgets; the
	 * transient empty widget gets read back into the model and wipes the selected value
	 * AND its resolved __Record for EVERY row -- the "selected Source / Name disappears
	 * after adding or deleting a row" data-loss bug. Because it clobbers the saved
	 * FormData, the value is then also missing from the exported PDF. A render() must be
	 * model-non-destructive, so snapshot the record set before rendering and restore any
	 * cleared fields afterward. No-op for plain (non-entity) tables, where render never
	 * changes the model (snapshot == post-render state, restore is a no-op).
	 *
	 * @param {string} pRecordSetAddress - RecordSetAddress of the table being re-rendered.
	 * @param {Array<Object>} pViewsToRender - Views bound to that record set to render.
	 */
	_renderViewsPreservingRecordSet(pRecordSetAddress, pViewsToRender)
	{
		if (!Array.isArray(pViewsToRender) || (pViewsToRender.length < 1))
		{
			return;
		}
		// Snapshot the record set (deep clone each row) from a view that owns it.
		let tmpRecordSet = false;
		let tmpSnapshot = false;
		for (let i = 0; i < pViewsToRender.length; i++)
		{
			let tmpCandidate = pViewsToRender[i].sectionManifest.getValueByHash(pViewsToRender[i].getMarshalDestinationObject(), pRecordSetAddress);
			if (Array.isArray(tmpCandidate))
			{
				tmpRecordSet = tmpCandidate;
				tmpSnapshot = tmpCandidate.map((pRow) => (pRow && (typeof pRow === 'object')) ? JSON.parse(JSON.stringify(pRow)) : pRow);
				break;
			}
		}
		for (let i = 0; i < pViewsToRender.length; i++)
		{
			pViewsToRender[i].render();
		}
		// Restore any model fields a destructive re-render cleared (entity value + __Record).
		if (Array.isArray(tmpRecordSet) && Array.isArray(tmpSnapshot))
		{
			for (let i = 0; i < tmpRecordSet.length; i++)
			{
				if (tmpRecordSet[i] && (typeof tmpRecordSet[i] === 'object') && tmpSnapshot[i] && (typeof tmpSnapshot[i] === 'object'))
				{
					Object.assign(tmpRecordSet[i], tmpSnapshot[i]);
				}
			}
		}
	}

	/**
	 * Rebuild every OTHER section-form view whose DynamicColumns are sourced from
	 * pSourceRecordSetAddress: re-resolve their generated columns and rebuild their
	 * template + DOM. Call this in the RENDER phase (after a source row was added or
	 * removed, before solving + marshaling) so dependent tables paint their column
	 * changes up front instead of mid-marshal. Idempotent and safe when there are no
	 * dependent views (it simply finds none).
	 *
	 * @param {string} pSourceRecordSetAddress - RecordSetAddress whose rows drive the columns.
	 */
	_rebuildDependentDynamicColumnViews(pSourceRecordSetAddress)
	{
		if ((typeof pSourceRecordSetAddress !== 'string') || (pSourceRecordSetAddress.length < 1))
		{
			return;
		}
		if (!this.pict.views.PictFormMetacontroller)
		{
			return;
		}
		let tmpDependentViews = this.pict.views.PictFormMetacontroller.filterViews(
			(pViewToTest) =>
			{
				if (!pViewToTest.isPictSectionForm)
				{
					return false;
				}
				let tmpGroups = pViewToTest.getGroups();
				for (let i = 0; i < tmpGroups.length; i++)
				{
					let tmpDynamicColumns = tmpGroups[i].DynamicColumns;
					if (!Array.isArray(tmpDynamicColumns))
					{
						continue;
					}
					for (let g = 0; g < tmpDynamicColumns.length; g++)
					{
						if (tmpDynamicColumns[g] && (tmpDynamicColumns[g].SourceAddress === pSourceRecordSetAddress))
						{
							return true;
						}
					}
				}
				return false;
			});
		for (let i = 0; i < tmpDependentViews.length; i++)
		{
			let tmpView = tmpDependentViews[i];
			let tmpGroups = tmpView.getGroups();
			for (let g = 0; g < tmpGroups.length; g++)
			{
				let tmpGroup = tmpGroups[g];
				if (Array.isArray(tmpGroup.DynamicColumns) && (tmpGroup.DynamicColumns.length > 0) &&
					this.fable.ManifestFactory && (typeof this.fable.ManifestFactory._resolveDynamicColumns === 'function'))
				{
					this.fable.ManifestFactory._resolveDynamicColumns(tmpView, tmpGroup);
				}
			}
			tmpView.rebuildCustomTemplate();
			tmpView.render();
		}
	}

	/**
	 * For position-keyed DynamicColumns (KeyBy: "Position") sourced from
	 * pSourceRecordSetAddress, shift each dependent row's positional cells down past
	 * a just-removed source index so values stay aligned with their column. Cells are
	 * addressed by resolving the generator's InformaryDataAddressTemplate with the
	 * synthetic { __Index } record, the same way columns are generated. No-op for
	 * value-keyed generators (their data stays attached to the stable value).
	 *
	 * @param {string} pSourceRecordSetAddress - RecordSetAddress of the deleted-from source.
	 * @param {number} pDeletedIndex - Index of the source row that was removed.
	 * @param {number} pOriginalLength - Source row count BEFORE the removal.
	 */
	_spliceDependentPositionalColumns(pSourceRecordSetAddress, pDeletedIndex, pOriginalLength)
	{
		if ((typeof pSourceRecordSetAddress !== 'string') || (pSourceRecordSetAddress.length < 1))
		{
			return;
		}
		if (!this.pict.views.PictFormMetacontroller)
		{
			return;
		}
		let tmpManifestFactory = this.fable.ManifestFactory;
		if (!tmpManifestFactory || (typeof tmpManifestFactory._parseDynamicColumnTemplate !== 'function'))
		{
			return;
		}
		let tmpViews = this.pict.views.PictFormMetacontroller.filterViews((pViewToTest) => { return pViewToTest.isPictSectionForm; });
		for (let v = 0; v < tmpViews.length; v++)
		{
			let tmpView = tmpViews[v];
			let tmpGroups = tmpView.getGroups();
			for (let g = 0; g < tmpGroups.length; g++)
			{
				let tmpGroup = tmpGroups[g];
				if (!Array.isArray(tmpGroup.DynamicColumns) || (tmpGroup.DynamicColumns.length < 1))
				{
					continue;
				}
				let tmpDependentRows = tmpView.sectionManifest.getValueByHash(tmpView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);
				if (!Array.isArray(tmpDependentRows) || (tmpDependentRows.length < 1))
				{
					continue;
				}
				for (let c = 0; c < tmpGroup.DynamicColumns.length; c++)
				{
					let tmpGenerator = tmpGroup.DynamicColumns[c];
					if (!tmpGenerator || (tmpGenerator.SourceAddress !== pSourceRecordSetAddress))
					{
						continue;
					}
					// Only position-keyed generators store data by index; value-keyed columns keep
					// their data attached to the (stable) value, so they need no shifting.
					if (tmpGenerator.KeyBy !== 'Position')
					{
						continue;
					}
					if (typeof tmpGenerator.InformaryDataAddressTemplate !== 'string')
					{
						continue;
					}
					// Resolve the positional cell address for each original column index once.
					let tmpAddresses = [];
					for (let k = 0; k < pOriginalLength; k++)
					{
						tmpAddresses[k] = tmpManifestFactory._parseDynamicColumnTemplate(tmpGenerator.InformaryDataAddressTemplate, { __Index: k, __RowNumber: k + 1 });
					}
					for (let r = 0; r < tmpDependentRows.length; r++)
					{
						let tmpRow = tmpDependentRows[r];
						if (!tmpRow || (typeof tmpRow !== 'object'))
						{
							continue;
						}
						// Shift every cell below the deleted index down by one.
						for (let k = pDeletedIndex; k < (pOriginalLength - 1); k++)
						{
							if (!tmpAddresses[k] || !tmpAddresses[k + 1])
							{
								continue;
							}
							let tmpNextValue = tmpView.sectionManifest.getValueByHash(tmpRow, tmpAddresses[k + 1]);
							tmpView.sectionManifest.setValueByHash(tmpRow, tmpAddresses[k], tmpNextValue);
						}
						// Clear the now-orphaned final positional cell.
						let tmpLastAddress = tmpAddresses[pOriginalLength - 1];
						if (tmpLastAddress)
						{
							tmpView.sectionManifest.setValueByHash(tmpRow, tmpLastAddress, undefined);
						}
					}
				}
			}
		}
	}

	/**
	 * For position-keyed DynamicColumns (KeyBy: "Position") sourced from
	 * pSourceRecordSetAddress, REORDER each dependent row's positional cells to
	 * mirror a source row that moved from pOldIndex to pNewIndex. The source array
	 * was already spliced (remove at pOldIndex, insert at pNewIndex); this applies
	 * the identical permutation to every dependent row's positional cell VALUES so
	 * the data stays attached to its column when the columns re-resolve to the new
	 * source order. Without it, a reorder leaves user-entered cells under the wrong
	 * (renamed) column. Solver-filled rows re-derive on the next solve regardless;
	 * applying the move to them too is harmless (the solve overwrites them). No-op
	 * for value-keyed generators (their data stays attached to the stable value).
	 *
	 * Must run AFTER the source splice and BEFORE the dependent views re-resolve +
	 * the marshal repaints them. Symmetric with _spliceDependentPositionalColumns.
	 *
	 * @param {string} pSourceRecordSetAddress - RecordSetAddress of the moved-within source.
	 * @param {number} pOldIndex - Source row's index before the move.
	 * @param {number} pNewIndex - Source row's index after the move.
	 * @param {number} pLength - Source row count (unchanged by a move).
	 */
	_moveDependentPositionalColumns(pSourceRecordSetAddress, pOldIndex, pNewIndex, pLength)
	{
		if ((typeof pSourceRecordSetAddress !== 'string') || (pSourceRecordSetAddress.length < 1))
		{
			return;
		}
		if (pOldIndex === pNewIndex)
		{
			return;
		}
		if (!this.pict.views.PictFormMetacontroller)
		{
			return;
		}
		let tmpManifestFactory = this.fable.ManifestFactory;
		if (!tmpManifestFactory || (typeof tmpManifestFactory._parseDynamicColumnTemplate !== 'function'))
		{
			return;
		}
		let tmpViews = this.pict.views.PictFormMetacontroller.filterViews((pViewToTest) => { return pViewToTest.isPictSectionForm; });
		for (let v = 0; v < tmpViews.length; v++)
		{
			let tmpView = tmpViews[v];
			let tmpGroups = tmpView.getGroups();
			for (let g = 0; g < tmpGroups.length; g++)
			{
				let tmpGroup = tmpGroups[g];
				if (!Array.isArray(tmpGroup.DynamicColumns) || (tmpGroup.DynamicColumns.length < 1))
				{
					continue;
				}
				let tmpDependentRows = tmpView.sectionManifest.getValueByHash(tmpView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);
				if (!Array.isArray(tmpDependentRows) || (tmpDependentRows.length < 1))
				{
					continue;
				}
				for (let c = 0; c < tmpGroup.DynamicColumns.length; c++)
				{
					let tmpGenerator = tmpGroup.DynamicColumns[c];
					if (!tmpGenerator || (tmpGenerator.SourceAddress !== pSourceRecordSetAddress))
					{
						continue;
					}
					// Only position-keyed generators store data by index; value-keyed columns keep
					// their data attached to the (stable) value, so they need no reordering.
					if (tmpGenerator.KeyBy !== 'Position')
					{
						continue;
					}
					if (typeof tmpGenerator.InformaryDataAddressTemplate !== 'string')
					{
						continue;
					}
					// Resolve the positional cell address for each column index once.
					let tmpAddresses = [];
					for (let k = 0; k < pLength; k++)
					{
						tmpAddresses[k] = tmpManifestFactory._parseDynamicColumnTemplate(tmpGenerator.InformaryDataAddressTemplate, { __Index: k, __RowNumber: k + 1 });
					}
					for (let r = 0; r < tmpDependentRows.length; r++)
					{
						let tmpRow = tmpDependentRows[r];
						if (!tmpRow || (typeof tmpRow !== 'object'))
						{
							continue;
						}
						// Read the current positional cell values, apply the identical
						// remove-at-old / insert-at-new permutation, then write them back.
						let tmpValues = [];
						for (let k = 0; k < pLength; k++)
						{
							tmpValues[k] = tmpAddresses[k] ? tmpView.sectionManifest.getValueByHash(tmpRow, tmpAddresses[k]) : undefined;
						}
						let tmpMoved = tmpValues.splice(pOldIndex, 1);
						tmpValues.splice(pNewIndex, 0, tmpMoved[0]);
						for (let k = 0; k < pLength; k++)
						{
							if (tmpAddresses[k])
							{
								tmpView.sectionManifest.setValueByHash(tmpRow, tmpAddresses[k], tmpValues[k]);
							}
						}
					}
				}
			}
		}
	}

	/**
	 * Shared tail for the row-reorder handlers (move up / move down / set index).
	 * Repaints the moved source table and every dependent view, in the RENDER phase
	 * BEFORE solving + marshaling, then solves and marshals. Mirrors what the add /
	 * delete handlers do so a reorder doesn't blank dependent DynamicColumns tables
	 * (or the rest of their section) until the next edit. Render happens before the
	 * solve so the solve's DOM side effects (e.g. SetGroupVisibility) land on the
	 * freshly rebuilt DOM and survive.
	 *
	 * @param {Object} pGroup - The reordered group (its RecordSetAddress drives dependents).
	 */
	_repaintAfterRowReorder(pGroup)
	{
		// Render every view that renders this record set as a table (the source table itself
		// plus any sibling views bound to the same RecordSetAddress).
		let tmpViewsToRender = this.pict.views.PictFormMetacontroller.filterViews(
			(pViewToTestForGroup) =>
			{
				if (!pViewToTestForGroup.isPictSectionForm)
				{
					return false;
				}
				let tmpGroupsToTest = pViewToTestForGroup.getGroups();
				for (let i = 0; i < tmpGroupsToTest.length; i++)
				{
					if (tmpGroupsToTest[i].RecordSetAddress == pGroup.RecordSetAddress)
					{
						return true;
					}
				}
				return false;
			});
		// Re-rendering an entity-selector table clobbers its selected values in the
		// model, so preserve them across the render.
		this._renderViewsPreservingRecordSet(pGroup.RecordSetAddress, tmpViewsToRender);

		// Rebuild any OTHER views whose DynamicColumns are sourced from this record set
		// HERE, in the render phase -- BEFORE the marshal below -- so the column DOM is
		// correct (and re-labeled to the new order) when the marshal fills it. Without
		// this the dependent table is only rebuilt mid-marshal (onDataMarshalToForm),
		// which renders AFTER the cells were filled and blanks them until the next edit.
		this._rebuildDependentDynamicColumnViews(pGroup.RecordSetAddress);

		// Run the solver
		this.pict.providers.DynamicSolver.solveViews();

		// We've re-rendered but we don't know what needs to be marshaled based on the solve that ran above so marshal everything
		this.pict.views.PictFormMetacontroller.marshalFormSections();
	}
}

module.exports = DynamicTabularData;
module.exports.default_configuration = _DefaultProviderConfiguration;
