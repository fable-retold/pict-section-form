const libPictSectionGroupLayout = require('../Pict-Provider-DynamicLayout.js');

class TabularLayout extends libPictSectionGroupLayout
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		/** @type {import('pict')} */
		this.pict;
		/** @type {import('pict')} */
		this.fable;
		/** @type {any} */
		this.log;

		// Register the sort glyphs used by the optional ColumnSorting feature, through
		// pict's built-in icon registry (so they theme + scale like every other glyph).
		if (this.pict && this.pict.providers && this.pict.providers.Icon
			&& typeof this.pict.providers.Icon.registerSet === 'function')
		{
			this.pict.providers.Icon.registerSet(
				{
					Outline:
					{
						Sort: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 20V5"/><path d="M5.5 8.5L9 5L12.5 8.5"/><path d="M15 4V19"/><path d="M11.5 15.5L15 19L18.5 15.5"/></svg>',
						SortAscending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V5"/><path d="M6 11L12 5L18 11"/></svg>',
						SortDescending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4V19"/><path d="M6 13L12 19L18 13"/></svg>'
					}
				});
		}

		// CSS for the clickable sort control. Inactive glyphs are faded; the
		// actively-sorted column's glyph is full opacity.
		if (this.pict && this.pict.CSSMap && typeof this.pict.CSSMap.addCSS === 'function')
		{
			this.pict.CSSMap.addCSS('Pict-Layout-Tabular-Sort-CSS',
				'.pict-tabular-sort-control { cursor: pointer; display: inline-flex; vertical-align: middle; margin-left: 0.3em; opacity: 0.4; }'
				+ ' .pict-tabular-sort-control:hover { opacity: 0.75; }'
				+ ' .pict-tabular-sort-control.pict-tabular-sort-asc, .pict-tabular-sort-control.pict-tabular-sort-desc { opacity: 1; }',
				500);
		}
	}

	/**
	 * Builds one prime-header `<th>` with an injected, clickable sort control
	 * `<span>` carrying the sort SVG glyph. Used when the group has
	 * `ColumnSorting: true`. The glyph reflects the current sort state of the
	 * column (neutral / ascending / descending).
	 *
	 * @param {Object} pView
	 * @param {Object} pGroup
	 * @param {Object} pDescriptor - The column's descriptor.
	 * @param {number} pColumnIndex - The descriptor's InputIndex.
	 * @returns {string}
	 */
	_buildSortableHeaderCell(pView, pGroup, pDescriptor, pColumnIndex)
	{
		let tmpSortState = pGroup._SortState || { ColumnIndex: -1, Direction: 'none' };
		let tmpIsActive = (tmpSortState.ColumnIndex === pColumnIndex) && (tmpSortState.Direction !== 'none');
		let tmpIconName = 'Sort';
		let tmpStateClass = 'pict-tabular-sort-none';
		if (tmpIsActive && tmpSortState.Direction === 'asc')
		{
			tmpIconName = 'SortAscending';
			tmpStateClass = 'pict-tabular-sort-asc';
		}
		else if (tmpIsActive && tmpSortState.Direction === 'desc')
		{
			tmpIconName = 'SortDescending';
			tmpStateClass = 'pict-tabular-sort-desc';
		}
		let tmpGlyph = (typeof this.pict.icon === 'function') ? this.pict.icon(tmpIconName) : '';
		let tmpName = this._escapeHTML((pDescriptor && pDescriptor.Name != null) ? String(pDescriptor.Name) : '');
		return `\n\t\t\t\t\t\t<th data-tabular-column-index="${pColumnIndex}">${tmpName} `
			+ `<span class="pict-tabular-sort-control ${tmpStateClass}" `
			+ `onclick="_Pict.providers['Pict-Layout-Tabular'].sortTabularColumn('${pView.Hash}', ${pGroup.GroupIndex}, ${pColumnIndex})">`
			+ `${tmpGlyph}</span></th>\n`;
	}

	/**
	 * Resolves one row's value for a column descriptor. Dynamic columns store
	 * their value at the descriptor's InformaryDataAddress (a nested path);
	 * static columns resolve by hash.
	 *
	 * @param {Object} pGroup
	 * @param {Object} pDescriptor
	 * @param {Object} pRecord
	 * @returns {any}
	 */
	_getTabularCellValue(pGroup, pDescriptor, pRecord)
	{
		if (!pDescriptor || !pRecord || !pGroup.supportingManifest)
		{
			return undefined;
		}
		let tmpKey = (pDescriptor.PictForm && typeof pDescriptor.PictForm.InformaryDataAddress === 'string'
			&& pDescriptor.PictForm.InformaryDataAddress.length > 0)
			? pDescriptor.PictForm.InformaryDataAddress
			: pDescriptor.Hash;
		try
		{
			return pGroup.supportingManifest.getValueByHash(pRecord, tmpKey);
		}
		catch (pError)
		{
			return undefined;
		}
	}

	/**
	 * Comparator for tabular sort. Numeric when both values parse as numbers,
	 * otherwise a locale string comparison. Null/undefined sort as empty.
	 *
	 * @param {any} pValueA
	 * @param {any} pValueB
	 * @returns {number}
	 */
	_compareTabularValues(pValueA, pValueB)
	{
		let tmpA = (pValueA == null) ? '' : pValueA;
		let tmpB = (pValueB == null) ? '' : pValueB;
		let tmpNumberA = Number(tmpA);
		let tmpNumberB = Number(tmpB);
		if ((tmpA !== '') && (tmpB !== '') && !isNaN(tmpNumberA) && !isNaN(tmpNumberB))
		{
			if (tmpNumberA < tmpNumberB) { return -1; }
			if (tmpNumberA > tmpNumberB) { return 1; }
			return 0;
		}
		return String(tmpA).localeCompare(String(tmpB));
	}

	/**
	 * Inline-handler entry point: sorts a tabular group's record set by a column.
	 * A fresh column starts ascending; clicking the active column toggles
	 * ascending -> descending. Rebuilds so the header glyph re-bakes, then
	 * re-renders and re-marshals.
	 *
	 * @param {string} pViewHash
	 * @param {number|string} pGroupIndex
	 * @param {number|string} pColumnIndex
	 * @returns {boolean}
	 */
	sortTabularColumn(pViewHash, pGroupIndex, pColumnIndex)
	{
		let tmpView = this.pict.views[pViewHash];
		if (!tmpView || !tmpView.sectionDefinition || !Array.isArray(tmpView.sectionDefinition.Groups))
		{
			return false;
		}
		let tmpGroup = tmpView.sectionDefinition.Groups[Number(pGroupIndex)];
		if (!tmpGroup || tmpGroup.ColumnSorting !== true)
		{
			return false;
		}
		let tmpColumnIndex = Number(pColumnIndex);
		if (isNaN(tmpColumnIndex) || tmpColumnIndex < 0)
		{
			return false;
		}

		// Cycle the direction: a new column starts ascending, the active column toggles.
		if (!tmpGroup._SortState)
		{
			tmpGroup._SortState = { ColumnIndex: -1, Direction: 'none' };
		}
		if (tmpGroup._SortState.ColumnIndex === tmpColumnIndex && tmpGroup._SortState.Direction === 'asc')
		{
			tmpGroup._SortState.Direction = 'desc';
		}
		else
		{
			tmpGroup._SortState.ColumnIndex = tmpColumnIndex;
			tmpGroup._SortState.Direction = 'asc';
		}

		// Resolve the descriptor + record set and sort the record set in place.
		let tmpDescriptor = null;
		if (tmpGroup.supportingManifest && Array.isArray(tmpGroup.supportingManifest.elementAddresses))
		{
			let tmpHash = tmpGroup.supportingManifest.elementAddresses[tmpColumnIndex];
			tmpDescriptor = tmpGroup.supportingManifest.elementDescriptors[tmpHash];
		}
		let tmpRecordSet = tmpView.sectionManifest.getValueByHash(tmpView.getMarshalDestinationObject(), tmpGroup.RecordSetAddress);
		if (tmpDescriptor && Array.isArray(tmpRecordSet))
		{
			let tmpDirection = (tmpGroup._SortState.Direction === 'desc') ? -1 : 1;
			tmpRecordSet.sort((pRecordA, pRecordB) =>
			{
				return this._compareTabularValues(
					this._getTabularCellValue(tmpGroup, tmpDescriptor, pRecordA),
					this._getTabularCellValue(tmpGroup, tmpDescriptor, pRecordB)) * tmpDirection;
			});
		}

		// Rebuild so the header re-bakes with the updated glyph, then re-render + marshal.
		tmpView.rebuildCustomTemplate();
		tmpView.render();
		if (this.pict.views.PictFormMetacontroller)
		{
			this.pict.views.PictFormMetacontroller.marshalFormSections();
		}
		else
		{
			tmpView.marshalToView();
		}
		return true;
	}

	/**
	 * Resolve a template string against a record. Returns '' on failure.
	 *
	 * @param {string} pTemplate
	 * @param {Object} pRecord
	 * @returns {string}
	 */
	_parseTabularTemplate(pTemplate, pRecord)
	{
		if (typeof pTemplate !== 'string')
		{
			return '';
		}
		if (pTemplate.indexOf('{') === -1)
		{
			return pTemplate;
		}
		try
		{
			let tmpResult = this.pict.parseTemplate(pTemplate, pRecord, null);
			return (typeof tmpResult === 'string') ? tmpResult : '';
		}
		catch (pError)
		{
			this.log.warn(`PICT Form Tabular template parse failed: ${pError && pError.message}`);
			return '';
		}
	}

	/**
	 * Build the expanded Headers config for a group.
	 *
	 * Returns the user-provided pGroup.Headers (each row = array of cells) plus
	 * a synthesized "header group" row prepended at the front when any DynamicColumns
	 * generator declares a HeaderGroupTemplate. The synthesized row clusters
	 * consecutive descriptors with the same _DynamicColumnHeaderGroup value into
	 * a single cell with ColumnSpan.
	 *
	 * @param {Object} pView
	 * @param {Object} pGroup
	 * @returns {Array<Array<{Label: string, ColumnSpan: number, CSSClass: string}>>}
	 */
	_buildExpandedHeadersConfig(pView, pGroup)
	{
		let tmpExpanded = [];

		// Render user-provided Headers config first (at the top of the table).
		if (Array.isArray(pGroup.Headers))
		{
			for (let r = 0; r < pGroup.Headers.length; r++)
			{
				let tmpRowConfig = pGroup.Headers[r];
				if (!Array.isArray(tmpRowConfig))
				{
					continue;
				}
				let tmpNormalizedRow = [];
				for (let c = 0; c < tmpRowConfig.length; c++)
				{
					let tmpCell = tmpRowConfig[c];
					if (!tmpCell || typeof tmpCell !== 'object')
					{
						continue;
					}
					tmpNormalizedRow.push({
						Label: (typeof tmpCell.Label === 'string') ? tmpCell.Label : '',
						ColumnSpan: (Number(tmpCell.ColumnSpan) > 0) ? Number(tmpCell.ColumnSpan) : 1,
						CSSClass: (typeof tmpCell.CSSClass === 'string') ? tmpCell.CSSClass : ''
					});
				}
				tmpExpanded.push(tmpNormalizedRow);
			}
		}

		// Then synthesize a clustered super-header row from any DynamicColumns generator
		// that declared a HeaderGroupTemplate. This row sits JUST ABOVE the default
		// column-name row so the visual cluster lines up with the columns it groups.
		// Walk the supportingManifest in order and group adjacent descriptors that
		// share both _DynamicColumnGeneratorIndex and _DynamicColumnHeaderGroup; static
		// descriptors get blank "spacer" cells.
		let tmpHasHeaderGroups = false;
		if (Array.isArray(pGroup.DynamicColumns))
		{
			for (let g = 0; g < pGroup.DynamicColumns.length; g++)
			{
				if (pGroup.DynamicColumns[g] && pGroup.DynamicColumns[g].HeaderGroupTemplate)
				{
					tmpHasHeaderGroups = true;
					break;
				}
			}
		}
		if (tmpHasHeaderGroups && pGroup.supportingManifest)
		{
			let tmpSynthRow = [];
			let tmpCurrentRun = null;
			let tmpAddresses = pGroup.supportingManifest.elementAddresses;
			for (let k = 0; k < tmpAddresses.length; k++)
			{
				let tmpDescriptor = pGroup.supportingManifest.elementDescriptors[tmpAddresses[k]];
				if (!tmpDescriptor)
				{
					continue;
				}
				if (tmpDescriptor.PictForm && tmpDescriptor.PictForm.TabularHidden)
				{
					continue;
				}
				let tmpIsDynamic = (typeof tmpDescriptor._DynamicColumnGeneratorIndex === 'number');
				let tmpGroupLabel = (tmpIsDynamic && typeof tmpDescriptor._DynamicColumnHeaderGroup === 'string')
					? tmpDescriptor._DynamicColumnHeaderGroup
					: '';
				let tmpRunKey = tmpIsDynamic ? `D${tmpDescriptor._DynamicColumnGeneratorIndex}|${tmpGroupLabel}` : `S|${k}`;
				if (tmpCurrentRun && tmpCurrentRun.RunKey === tmpRunKey)
				{
					tmpCurrentRun.Cell.ColumnSpan += 1;
				}
				else
				{
					tmpCurrentRun = {
						RunKey: tmpRunKey,
						Cell: {
							Label: tmpIsDynamic ? tmpGroupLabel : '',
							ColumnSpan: 1,
							CSSClass: tmpIsDynamic ? 'pict-tabular-dynamic-header-group' : 'pict-tabular-static-header-spacer'
						}
					};
					tmpSynthRow.push(tmpCurrentRun.Cell);
				}
			}
			tmpExpanded.push(tmpSynthRow);
		}

		return tmpExpanded;
	}

	/**
	 * Compute per-row label metadata for a tabular group with RowLabels config.
	 *
	 * Walks the current RecordSetAddress array. For each row, resolves the
	 * label value for each RowLabels entry (Template / RowNumber / SourceAddress).
	 * For Cluster:true columns, consecutive equal values collapse into a single
	 * cell on the first row of the run, with continuation rows marked Skip:true.
	 *
	 * Writes the result to pGroup.RowLabelMetadata as an array index-aligned
	 * with the record set. Idempotent — safe to call on every marshal.
	 *
	 * @param {Object} pView
	 * @param {Object} pGroup
	 */
	_computeRowLabelMetadata(pView, pGroup)
	{
		if (!Array.isArray(pGroup.RowLabels) || pGroup.RowLabels.length === 0)
		{
			pGroup.RowLabelMetadata = [];
			return;
		}
		let tmpRecordSet = [];
		if (typeof pGroup.RecordSetAddress === 'string' && pGroup.RecordSetAddress.length > 0)
		{
			let tmpMarshalDestinationObject = pView.getMarshalDestinationObject();
			let tmpFetched = pView.sectionManifest.getValueByHash(tmpMarshalDestinationObject, pGroup.RecordSetAddress);
			if (Array.isArray(tmpFetched))
			{
				tmpRecordSet = tmpFetched;
			}
		}

		let tmpMetadata = [];
		for (let i = 0; i < tmpRecordSet.length; i++)
		{
			let tmpRow = tmpRecordSet[i];
			let tmpCells = [];
			for (let l = 0; l < pGroup.RowLabels.length; l++)
			{
				let tmpLabelConfig = pGroup.RowLabels[l];
				let tmpRenderedLabel = '';
				if (tmpLabelConfig.RowNumber === true)
				{
					tmpRenderedLabel = String(i + 1);
				}
				else if (typeof tmpLabelConfig.SourceAddress === 'string' && tmpLabelConfig.SourceAddress.length > 0)
				{
					let tmpLabelSource = this.pict.resolveStateFromAddress(tmpLabelConfig.SourceAddress, null);
					if (Array.isArray(tmpLabelSource) && i < tmpLabelSource.length)
					{
						let tmpItem = tmpLabelSource[i];
						tmpRenderedLabel = (typeof tmpItem === 'string') ? tmpItem : (tmpItem == null ? '' : String(tmpItem));
					}
				}
				else if (typeof tmpLabelConfig.Template === 'string')
				{
					// Templates can reference Record.Value.X (the row record) or AppData.X.
					tmpRenderedLabel = this._parseTabularTemplate(tmpLabelConfig.Template, { Value: tmpRow, Key: i });
				}
				tmpCells.push({
					Label: tmpLabelConfig.Name || '',
					RenderedLabel: tmpRenderedLabel,
					RowSpan: 1,
					Skip: false,
					Cluster: tmpLabelConfig.Cluster === true,
					CSSClass: (typeof tmpLabelConfig.CSSClass === 'string') ? tmpLabelConfig.CSSClass : ''
				});
			}
			tmpMetadata.push({ Cells: tmpCells });
		}

		// Pass 2: apply clustering (rowspan collapse for consecutive equal values).
		for (let l = 0; l < pGroup.RowLabels.length; l++)
		{
			if (!pGroup.RowLabels[l].Cluster)
			{
				continue;
			}
			let tmpRunStart = 0;
			for (let i = 1; i <= tmpMetadata.length; i++)
			{
				let tmpAtEnd = (i === tmpMetadata.length);
				let tmpMatches = !tmpAtEnd
					&& tmpMetadata[i].Cells[l].RenderedLabel === tmpMetadata[tmpRunStart].Cells[l].RenderedLabel;
				if (tmpMatches)
				{
					tmpMetadata[i].Cells[l].Skip = true;
				}
				else
				{
					let tmpRunLength = i - tmpRunStart;
					tmpMetadata[tmpRunStart].Cells[l].RowSpan = tmpRunLength;
					tmpRunStart = i;
				}
			}
		}

		pGroup.RowLabelMetadata = tmpMetadata;
	}

	/**
	 * Called from the row template via the {~TRL:...~} tag. Returns the HTML for
	 * the leading cells of one tabular row: an optional row-selection checkbox
	 * cell followed by the configured row-label cells.
	 *
	 * @param {Object} pView
	 * @param {number|string} pGroupIndex
	 * @param {number|string} pRowKey
	 * @returns {string}
	 */
	_renderTabularRowLabelsHTML(pView, pGroupIndex, pRowKey)
	{
		if (!pView || !pView.sectionDefinition || !Array.isArray(pView.sectionDefinition.Groups))
		{
			return '';
		}
		let tmpGroupIdx = Number(pGroupIndex);
		if (isNaN(tmpGroupIdx) || tmpGroupIdx < 0 || tmpGroupIdx >= pView.sectionDefinition.Groups.length)
		{
			return '';
		}
		let tmpGroup = pView.sectionDefinition.Groups[tmpGroupIdx];
		let tmpRowKeyNum = Number(pRowKey);

		// The {~TRL:~} tag runs once per row, in row order, during a render pass.
		// Recompute the label metadata when the first row renders so a render()
		// that was not preceded by a fresh marshal (e.g. a row move / add / delete)
		// still shows correct, current row labels rather than the previous order.
		if (tmpRowKeyNum === 0)
		{
			this._computeRowLabelMetadata(pView, tmpGroup);
		}

		let tmpHTML = '';

		// Leading row-selection checkbox cell.
		if (tmpGroup._RowSelectionConfig && !isNaN(tmpRowKeyNum) && tmpRowKeyNum >= 0)
		{
			let tmpSelected = this._getTabularSelectionArray(pView, tmpGroup._RowSelectionConfig);
			let tmpCheckedAttr = tmpSelected[tmpRowKeyNum] ? ' checked="checked"' : '';
			tmpHTML += `<td class="pict-tabular-row-select">`
				+ `<input type="checkbox"${tmpCheckedAttr} onchange="_Pict.providers['Pict-Layout-Tabular'].toggleTabularRowSelection('${pView.Hash}', ${tmpGroupIdx}, '${tmpRowKeyNum}', this.checked)">`
				+ `</td>`;
		}

		// Row-label cells.
		if (Array.isArray(tmpGroup.RowLabelMetadata)
			&& !isNaN(tmpRowKeyNum) && tmpRowKeyNum >= 0 && tmpRowKeyNum < tmpGroup.RowLabelMetadata.length)
		{
			let tmpCells = tmpGroup.RowLabelMetadata[tmpRowKeyNum].Cells;
			for (let c = 0; c < tmpCells.length; c++)
			{
				let tmpCell = tmpCells[c];
				if (tmpCell.Skip)
				{
					continue;
				}
				let tmpRowSpanAttr = (tmpCell.RowSpan > 1) ? ` rowspan="${tmpCell.RowSpan}"` : '';
				let tmpClassAttr = `pict-row-label${tmpCell.Cluster ? ' pict-row-label-clustered' : ''}${tmpCell.CSSClass ? ' ' + tmpCell.CSSClass : ''}`;
				tmpHTML += `<td${tmpRowSpanAttr} class="${tmpClassAttr}">${this._escapeHTML(tmpCell.RenderedLabel)}</td>`;
			}
		}
		return tmpHTML;
	}

	/**
	 * Called from the row template via {~F:...~} to emit the editing controls
	 * (del/up/down) for a row. Used when EditingControlsPosition === 'left'.
	 * For EditingControlsPosition === 'right' the existing default
	 * -TabularTemplate-Row-ExtraPostfix template handles this.
	 *
	 * @param {Object} pView
	 * @param {number|string} pGroupIndex
	 * @param {number|string} pRowKey
	 * @returns {string}
	 */
	_renderTabularEditingControlsHTML(pView, pGroupIndex, pRowKey)
	{
		if (!pView)
		{
			return '';
		}
		let tmpViewHash = pView.Hash;
		return `<td class="pict-tabular-editing-controls"><a href="#/" onClick="_Pict.views['${tmpViewHash}'].deleteDynamicTableRow(${pGroupIndex},'${pRowKey}')">del</a> <a href="#/" onClick="_Pict.views['${tmpViewHash}'].moveDynamicTableRowUp(${pGroupIndex},'${pRowKey}')">up</a> <a href="#/" onClick="_Pict.views['${tmpViewHash}'].moveDynamicTableRowDown(${pGroupIndex},'${pRowKey}')">down</a></td>`;
	}

	_escapeHTML(pString)
	{
		if (typeof pString !== 'string')
		{
			return '';
		}
		return pString
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	/**
	 * Normalize a Group.RowSelection / Group.ColumnSelection config value.
	 *
	 * Accepts `true` (use all defaults) or an object
	 * `{ Enabled, DataAddress, HighlightClass, HeaderLabel }`. Returns null when
	 * selection is not enabled.
	 *
	 * - `DataAddress` — address (relative to the form's marshal destination) where
	 *   the boolean selection array is stored, so it persists with the form data.
	 * - `HighlightClass` — class auto-applied to selected rows/columns. Set to an
	 *   empty string to make selection purely data-driven (solver-applied only).
	 * - `HeaderLabel` — text for the selection column's header cell.
	 *
	 * @param {boolean|Object} pConfigValue
	 * @param {string} pDefaultDataAddress
	 * @param {string} pDefaultHighlightClass
	 * @returns {{DataAddress: string, HighlightClass: string, HeaderLabel: string}|null}
	 */
	_normalizeSelectionConfig(pConfigValue, pDefaultDataAddress, pDefaultHighlightClass)
	{
		if (pConfigValue !== true && (typeof pConfigValue !== 'object' || pConfigValue === null))
		{
			return null;
		}
		let tmpConfig = (typeof pConfigValue === 'object') ? pConfigValue : {};
		if (tmpConfig.Enabled === false)
		{
			return null;
		}
		return {
			DataAddress: (typeof tmpConfig.DataAddress === 'string' && tmpConfig.DataAddress.length > 0)
				? tmpConfig.DataAddress
				: pDefaultDataAddress,
			HighlightClass: ('HighlightClass' in tmpConfig)
				? (tmpConfig.HighlightClass || '')
				: pDefaultHighlightClass,
			HeaderLabel: (typeof tmpConfig.HeaderLabel === 'string') ? tmpConfig.HeaderLabel : ''
		};
	}

	/**
	 * The absolute address (within the form's marshal destination) of a selection
	 * config's boolean array.
	 *
	 * @param {Object} pView
	 * @param {{DataAddress: string}} pSelectionConfig
	 * @returns {string}
	 */
	_getTabularSelectionAddress(pView, pSelectionConfig)
	{
		return `${pView.getMarshalDestinationAddress()}.${pSelectionConfig.DataAddress}`;
	}

	/**
	 * Reads the boolean selection array for a row/column selection config.
	 * Always returns an array (empty when nothing has been selected yet).
	 *
	 * @param {Object} pView
	 * @param {{DataAddress: string}} pSelectionConfig
	 * @returns {Array<boolean>}
	 */
	_getTabularSelectionArray(pView, pSelectionConfig)
	{
		let tmpValue = this.pict.resolveStateFromAddress(this._getTabularSelectionAddress(pView, pSelectionConfig));
		return Array.isArray(tmpValue) ? tmpValue : [];
	}

	/**
	 * Sets one flag in a selection array and writes it back into the form data.
	 *
	 * @param {Object} pView
	 * @param {{DataAddress: string}} pSelectionConfig
	 * @param {number|string} pIndex
	 * @param {boolean} pSelected
	 * @returns {Array<boolean>}
	 */
	_setTabularSelectionFlag(pView, pSelectionConfig, pIndex, pSelected)
	{
		let tmpArray = this._getTabularSelectionArray(pView, pSelectionConfig);
		let tmpIndex = Number(pIndex);
		if (!isNaN(tmpIndex) && tmpIndex >= 0)
		{
			tmpArray[tmpIndex] = !!pSelected;
		}
		this.pict.setStateValueAtAddress(this._getTabularSelectionAddress(pView, pSelectionConfig), null, tmpArray);
		return tmpArray;
	}

	/**
	 * Inline-handler entry point: toggles a row's selection state. Called by the
	 * checkbox rendered in the row-selection column. Writes the new state into the
	 * form data, optionally applies the highlight class, then re-solves so any
	 * user solvers that read the selection state can react.
	 *
	 * @param {string} pViewHash
	 * @param {number|string} pGroupIndex
	 * @param {number|string} pRowKey
	 * @param {boolean} pChecked
	 * @returns {boolean}
	 */
	toggleTabularRowSelection(pViewHash, pGroupIndex, pRowKey, pChecked)
	{
		let tmpView = this.pict.views[pViewHash];
		if (!tmpView || !tmpView.sectionDefinition || !Array.isArray(tmpView.sectionDefinition.Groups))
		{
			return false;
		}
		let tmpGroup = tmpView.sectionDefinition.Groups[Number(pGroupIndex)];
		if (!tmpGroup || !tmpGroup._RowSelectionConfig)
		{
			return false;
		}
		this._setTabularSelectionFlag(tmpView, tmpGroup._RowSelectionConfig, pRowKey, pChecked);
		if (tmpGroup._RowSelectionConfig.HighlightClass && this.pict.providers.DynamicFormSolverBehaviors)
		{
			this.pict.providers.DynamicFormSolverBehaviors.highlightTabularRow(
				tmpView.sectionDefinition.Hash, tmpGroup.Hash, pRowKey, pChecked ? 1 : 0, tmpGroup._RowSelectionConfig.HighlightClass);
		}
		this.pict.PictApplication.solve();
		return true;
	}

	/**
	 * Inline-handler entry point: toggles a column's selection state. Called by the
	 * checkbox rendered in the column-selection header row.
	 *
	 * @param {string} pViewHash
	 * @param {number|string} pGroupIndex
	 * @param {number|string} pColumnIndex
	 * @param {boolean} pChecked
	 * @returns {boolean}
	 */
	toggleTabularColumnSelection(pViewHash, pGroupIndex, pColumnIndex, pChecked)
	{
		let tmpView = this.pict.views[pViewHash];
		if (!tmpView || !tmpView.sectionDefinition || !Array.isArray(tmpView.sectionDefinition.Groups))
		{
			return false;
		}
		let tmpGroup = tmpView.sectionDefinition.Groups[Number(pGroupIndex)];
		if (!tmpGroup || !tmpGroup._ColumnSelectionConfig)
		{
			return false;
		}
		this._setTabularSelectionFlag(tmpView, tmpGroup._ColumnSelectionConfig, pColumnIndex, pChecked);
		if (tmpGroup._ColumnSelectionConfig.HighlightClass && this.pict.providers.DynamicFormSolverBehaviors)
		{
			this.pict.providers.DynamicFormSolverBehaviors.highlightTabularColumn(
				tmpView.sectionDefinition.Hash, tmpGroup.Hash, pColumnIndex, pChecked ? 1 : 0, tmpGroup._ColumnSelectionConfig.HighlightClass);
		}
		this.pict.PictApplication.solve();
		return true;
	}

	/**
	 * Re-applies selection highlight classes from the stored selection arrays.
	 * Run after a (re)render rebuilds the table DOM and the classes would
	 * otherwise be lost. No-op when no highlight class is configured.
	 *
	 * @param {Object} pView
	 * @param {Object} pGroup
	 */
	_reapplyTabularSelectionHighlights(pView, pGroup)
	{
		let tmpBehaviors = this.pict.providers.DynamicFormSolverBehaviors;
		if (!tmpBehaviors || !pView.sectionDefinition)
		{
			return;
		}
		let tmpSectionHash = pView.sectionDefinition.Hash;
		if (pGroup._RowSelectionConfig && pGroup._RowSelectionConfig.HighlightClass)
		{
			let tmpRows = this._getTabularSelectionArray(pView, pGroup._RowSelectionConfig);
			for (let i = 0; i < tmpRows.length; i++)
			{
				tmpBehaviors.highlightTabularRow(tmpSectionHash, pGroup.Hash, i, tmpRows[i] ? 1 : 0, pGroup._RowSelectionConfig.HighlightClass);
			}
		}
		if (pGroup._ColumnSelectionConfig && pGroup._ColumnSelectionConfig.HighlightClass)
		{
			let tmpColumns = this._getTabularSelectionArray(pView, pGroup._ColumnSelectionConfig);
			for (let i = 0; i < tmpColumns.length; i++)
			{
				tmpBehaviors.highlightTabularColumn(tmpSectionHash, pGroup.Hash, i, tmpColumns[i] ? 1 : 0, pGroup._ColumnSelectionConfig.HighlightClass);
			}
		}
	}

	/**
	 * Generate a group layout template for a single-record dynamically generated group view.
	 *
	 * This is the standard name / field entry form that you're used to filling out for addresses
	 * and such.
	 *
	 * @param {object} pView - The view to generate the dynamic group layout for
	 * @param {object} pGroup - The group to generate and inject dynamic layout templates
	 * @returns {string} - The template for the group
	 */
	generateGroupLayoutTemplate(pView, pGroup)
	{
		// Tabular are odd in that they have a header row and then a meta TemplateSet for the rows()
		// In this case we are going to load the descriptors from the supportingManifests
		if (!pGroup.supportingManifest)
		{
			this.log.error(`PICT Form [${pView.UUID}]::[${pView.Hash}] error generating tabular metatemplate: missing group manifest ${pGroup.RecordManifest} from supportingManifests.`);
			return '';
		}

		let tmpMetatemplateGenerator = this.pict.providers.MetatemplateGenerator;
		let tmpTemplate = '';
		let tmpTemplateSetRecordRowTemplate = '';

		// Read new optional configuration.
		let tmpEditingControlsPosition = (typeof pGroup.EditingControlsPosition === 'string') ? pGroup.EditingControlsPosition : 'right';
		let tmpRowLabels = Array.isArray(pGroup.RowLabels) ? pGroup.RowLabels : [];
		let tmpSuppressDefaultColumnHeaderRow = (pGroup.SuppressDefaultColumnHeaderRow === true);
		// ColumnSorting (off by default): injects a clickable sort-glyph span into every prime header cell.
		let tmpColumnSortingEnabled = (pGroup.ColumnSorting === true);
		if (tmpColumnSortingEnabled && !pGroup._SortState)
		{
			pGroup._SortState = { ColumnIndex: -1, Direction: 'none' };
		}
		let tmpExpandedHeaders = this._buildExpandedHeadersConfig(pView, pGroup);

		// Stash the structures referenced by the templates below.
		pGroup.ExpandedHeaders = tmpExpandedHeaders;
		pGroup.RowLabelHeaderCells = tmpRowLabels.map((pLabel) =>
			({
				Name: pLabel.Name || '',
				CSSClass: (typeof pLabel.CSSClass === 'string') ? pLabel.CSSClass : ''
			}));

		// Selectable rows / columns. When enabled, a checkbox column / header row is
		// rendered and the boolean selection state is stored in the form data so it
		// persists with a save. Solvers can read that state; selection optionally
		// auto-applies a highlight class.
		pGroup._RowSelectionConfig = this._normalizeSelectionConfig(pGroup.RowSelection, `${pGroup.Hash}_RowSelection`, 'pict-tabular-row-highlight');
		pGroup._ColumnSelectionConfig = this._normalizeSelectionConfig(pGroup.ColumnSelection, `${pGroup.Hash}_ColumnSelection`, 'pict-tabular-column-highlight');
		let tmpRowSelectionEnabled = (pGroup._RowSelectionConfig != null);
		let tmpColumnSelectionEnabled = (pGroup._ColumnSelectionConfig != null);
		let tmpEditingLeft = (tmpEditingControlsPosition === 'left');
		let tmpEditingRight = (tmpEditingControlsPosition === 'right');
		// Leading (non-data) columns that precede the data cells: row-select, row labels, left controls.
		let tmpLeadingColumnCount = (tmpRowSelectionEnabled ? 1 : 0) + tmpRowLabels.length + (tmpEditingLeft ? 1 : 0);

		// When EditingControlsPosition isn't 'right' (the default), suppress the default
		// extra-postfix slots by registering empty view-specific overrides. This keeps the
		// existing template machinery intact for backwards compatibility -- consumers that
		// don't opt in to the new behavior see identical output.
		if (tmpEditingControlsPosition === 'left' || tmpEditingControlsPosition === 'hidden')
		{
			this.pict.TemplateProvider.addTemplate(pView.getViewSpecificTemplateHash('-TabularTemplate-Row-ExtraPostfix'), '');
			this.pict.TemplateProvider.addTemplate(pView.getViewSpecificTemplateHash('-TabularTemplate-RowHeader-ExtraPostfix'), '');
		}

		tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-Group-Prefix`, `getGroup("${pGroup.GroupIndex}")`);

		// Header section
		tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-RowHeader-Prefix`, `getGroup("${pGroup.GroupIndex}")`);

		// Emit additional header rows (above the default column-name row).
		// Each row gets its own <tr>; leading non-data columns get blank <th>s
		// prepended (and a trailing one for right-side editing controls) for alignment.
		for (let r = 0; r < tmpExpandedHeaders.length; r++)
		{
			let tmpHeaderRow = tmpExpandedHeaders[r];
			tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-ExtraHeaderRow-Prefix`, `getGroup("${pGroup.GroupIndex}")`);
			for (let l = 0; l < tmpLeadingColumnCount; l++)
			{
				tmpTemplate += `<th class="pict-row-label-spacer"></th>`;
			}
			for (let c = 0; c < tmpHeaderRow.length; c++)
			{
				let tmpCellAddress = `getGroup("${pGroup.GroupIndex}").ExpandedHeaders.${r}.${c}`;
				tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-ExtraHeaderCell`, tmpCellAddress);
			}
			if (tmpEditingRight)
			{
				tmpTemplate += `<th class="pict-row-label-spacer"></th>`;
			}
			tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-ExtraHeaderRow-Postfix`, `getGroup("${pGroup.GroupIndex}")`);
		}

		// Column-selection header row -- a <tr> of checkboxes, one per visible data
		// column, plus leading/trailing spacers to line up with the data columns.
		if (tmpColumnSelectionEnabled)
		{
			let tmpColumnSelectionState = this._getTabularSelectionArray(pView, pGroup._ColumnSelectionConfig);
			let tmpColumnSelectRow = `<tr class="pict-tabular-column-select-row">`;
			for (let l = 0; l < tmpLeadingColumnCount; l++)
			{
				tmpColumnSelectRow += `<th class="pict-row-label-spacer"></th>`;
			}
			for (let k = 0; k < pGroup.supportingManifest.elementAddresses.length; k++)
			{
				let tmpColumnDescriptor = pGroup.supportingManifest.elementDescriptors[pGroup.supportingManifest.elementAddresses[k]];
				if (!tmpColumnDescriptor || (tmpColumnDescriptor.PictForm && tmpColumnDescriptor.PictForm.TabularHidden))
				{
					continue;
				}
				let tmpColumnCheckedAttr = tmpColumnSelectionState[k] ? ' checked="checked"' : '';
				tmpColumnSelectRow += `<th class="pict-tabular-column-select">`
					+ `<input type="checkbox"${tmpColumnCheckedAttr} onchange="_Pict.providers['Pict-Layout-Tabular'].toggleTabularColumnSelection('${pView.Hash}', ${pGroup.GroupIndex}, ${k}, this.checked)">`
					+ `</th>`;
			}
			if (tmpEditingRight)
			{
				tmpColumnSelectRow += `<th class="pict-row-label-spacer"></th>`;
			}
			tmpColumnSelectRow += `</tr>`;
			tmpTemplate += tmpColumnSelectRow;
		}

		// Existing ExtraPrefix slot (preserved for host overrides)
		tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-RowHeader-ExtraPrefix`, `getGroup("${pGroup.GroupIndex}")`);

		// Row-selection header cell.
		if (tmpRowSelectionEnabled)
		{
			tmpTemplate += `<th class="pict-row-label-header pict-tabular-row-select-header">${this._escapeHTML(pGroup._RowSelectionConfig.HeaderLabel)}</th>`;
		}

		// Row label header cells in the default header row.
		for (let l = 0; l < tmpRowLabels.length; l++)
		{
			let tmpLabelHeaderAddress = `getGroup("${pGroup.GroupIndex}").RowLabelHeaderCells.${l}`;
			tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-RowLabel-HeaderCell`, tmpLabelHeaderAddress);
		}

		// Header cell matching the left-side editing controls column, if configured.
		if (tmpEditingLeft)
		{
			tmpTemplate += `<th class="pict-row-label-header pict-tabular-editing-controls-header"></th>`;
		}

		// Per-descriptor header cells + the per-descriptor row body template.
		let tmpDataColumnCount = 0;
		for (let k = 0; k < pGroup.supportingManifest.elementAddresses.length; k++)
		{
			let tmpSupportingManifestHash = pGroup.supportingManifest.elementAddresses[k];
			let tmpInput = pGroup.supportingManifest.elementDescriptors[tmpSupportingManifestHash];
			// Update the InputIndex to match the current render config
			if (!('PictForm' in tmpInput))
			{
				tmpInput.PictForm = {};
			}
			if (tmpInput.PictForm.TabularHidden)
			{
				continue;
			}
			tmpInput.PictForm.InputIndex = k;
			tmpInput.PictForm.GroupIndex = pGroup.GroupIndex;
			tmpInput.PictForm.RowIndex = 0;

			if (!tmpSuppressDefaultColumnHeaderRow)
			{
				if (tmpColumnSortingEnabled)
				{
					tmpTemplate += this._buildSortableHeaderCell(pView, pGroup, tmpInput, k);
				}
				else
				{
					tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-HeaderCell`, `getTabularRecordInput("${pGroup.GroupIndex}","${k}")`);
				}
			}

			tmpTemplateSetRecordRowTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-Cell-Prefix`, `getTabularRecordInput("${pGroup.GroupIndex}","${k}")`);
			let tmpInputType = (('PictForm' in tmpInput) && tmpInput.PictForm.InputType) ? tmpInput.PictForm.InputType : 'Default';
			tmpTemplateSetRecordRowTemplate += tmpMetatemplateGenerator.getTabularInputMetatemplateTemplateReference(pView, tmpInput.DataType, tmpInputType, `getTabularRecordInput("${pGroup.GroupIndex}","${k}")`, pGroup.GroupIndex, k);
			tmpTemplateSetRecordRowTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-Cell-Postfix`, `getTabularRecordInput("${pGroup.GroupIndex}","${k}")`);
			tmpDataColumnCount++;
		}

		tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-RowHeader-ExtraPostfix`, `getGroup("${pGroup.GroupIndex}")`);
		tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-RowHeader-Postfix`, `getGroup("${pGroup.GroupIndex}")`);

		// Warn on header alignment mismatches (data-column count must equal each extra-header
		// row's total ColumnSpan).
		for (let r = 0; r < tmpExpandedHeaders.length; r++)
		{
			let tmpSpanTotal = 0;
			for (let c = 0; c < tmpExpandedHeaders[r].length; c++)
			{
				tmpSpanTotal += tmpExpandedHeaders[r][c].ColumnSpan || 1;
			}
			if (tmpSpanTotal !== tmpDataColumnCount)
			{
				this.log.warn(`PICT Form [${pView.UUID}]::[${pView.Hash}] tabular group [${pGroup.Hash}] header row ${r} total ColumnSpan (${tmpSpanTotal}) does not match data column count (${tmpDataColumnCount}). Header will visually misalign.`);
			}
		}

		// Compute initial row label metadata; recomputed on every marshal in onDataMarshalToForm.
		this._computeRowLabelMetadata(pView, pGroup);

		// This is the template by which the tabular template includes the rows.
		// The template recursion here is difficult to envision without drawing it.
		// TODO: Consider making this function available in manyfest in some fashion it seems dope.
		let tmpTemplateSetVirtualRowTemplate = '';
		// Row-Prefix references the per-row MTVS record (not the group) so the <tr>
		// can carry data-tabular-row-index for the highlight/color/selection features.
		tmpTemplateSetVirtualRowTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReferenceRaw(pView, `-TabularTemplate-Row-Prefix`, `Record`);
		tmpTemplateSetVirtualRowTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReferenceRaw(pView, `-TabularTemplate-Row-ExtraPrefix`, `Record`);

		// Leading cells: the row-selection checkbox and the row-label columns
		// (both emitted by the {~TRL:~} tag), followed by left-side editing controls.
		if (tmpRowLabels.length > 0 || tmpRowSelectionEnabled)
		{
			tmpTemplateSetVirtualRowTemplate += `{~TRL:${pView.Hash}~}`;
		}
		if (tmpEditingLeft)
		{
			tmpTemplateSetVirtualRowTemplate += `{~TEC:${pView.Hash}~}`;
		}

		tmpTemplateSetVirtualRowTemplate += `\n\n{~T:${pGroup.SectionTabularRowTemplateHash}:Record~}\n`;
		tmpTemplateSetVirtualRowTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReferenceRaw(pView, `-TabularTemplate-Row-ExtraPostfix`, `Record`);
		tmpTemplateSetVirtualRowTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-Row-Postfix`, `getGroup("${pGroup.GroupIndex}")`);

		// This is a custom template expression
		tmpTemplate += `\n\n{~MTVS:${pGroup.SectionTabularRowVirtualTemplateHash}:${pGroup.GroupIndex}:${pView.getMarshalDestinationAddress()}.${pGroup.RecordSetAddress}~}\n`;

		tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-TabularTemplate-Group-Postfix`, `getGroup("${pGroup.GroupIndex}")`);
		// Add the TemplateSetTemplate
		this.pict.TemplateProvider.addTemplate(pGroup.SectionTabularRowVirtualTemplateHash, tmpTemplateSetVirtualRowTemplate);
		this.pict.TemplateProvider.addTemplate(pGroup.SectionTabularRowTemplateHash, tmpTemplateSetRecordRowTemplate);

		return tmpTemplate;
	}

	/**
	 * Called after the group layout renders. Restores selection highlight
	 * classes from the persisted selection arrays so a reload (or any render
	 * path that does not trigger a subsequent marshal-to-form) shows
	 * already-selected rows/columns highlighted from the first paint.
	 *
	 * The checkbox `checked` attribute is baked into the row HTML at render
	 * time; the highlight class is not, so the layout-init hook is what
	 * mirrors that state onto the `<tr>` / cells.
	 *
	 * @param {Object} pView
	 * @param {Object} pGroup
	 * @returns {boolean}
	 */
	onGroupLayoutInitialize(pView, pGroup)
	{
		if (!pGroup)
		{
			return true;
		}
		this._reapplyTabularSelectionHighlights(pView, pGroup);
		return true;
	}

	/**
	 * Called after data is marshaled to the form. Re-runs DynamicColumns
	 * resolution and row-label clustering so additions/removals of source
	 * data flow into the rendered table without manual refresh calls.
	 *
	 * Loop guard: only triggers a template rebuild + re-render when the
	 * desired set of dynamic descriptor hashes ACTUALLY changes from the
	 * cached state, so steady state is a no-op (just a row-label recompute).
	 *
	 * @param {Object} pView
	 * @param {Object} pGroup
	 * @returns {boolean}
	 */
	onDataMarshalToForm(pView, pGroup)
	{
		if (!pGroup)
		{
			return true;
		}
		// Avoid recursion when this hook itself triggers a render -> marshal cycle.
		if (pGroup._RebuildInProgress)
		{
			return true;
		}

		let tmpHasDynamicColumns = Array.isArray(pGroup.DynamicColumns) && pGroup.DynamicColumns.length > 0;
		if (tmpHasDynamicColumns && this.fable.ManifestFactory && typeof this.fable.ManifestFactory._resolveDynamicColumns === 'function')
		{
			let tmpResult = this.fable.ManifestFactory._resolveDynamicColumns(pView, pGroup);
			if (tmpResult && tmpResult.changed)
			{
				pGroup._RebuildInProgress = true;
				try
				{
					pView.rebuildCustomTemplate();
					pView.render();
				}
				finally
				{
					pGroup._RebuildInProgress = false;
				}
				// The re-render rebuilt the table DOM -- restore selection highlights.
				this._reapplyTabularSelectionHighlights(pView, pGroup);
				return true;
			}
		}

		this._computeRowLabelMetadata(pView, pGroup);
		// Keep selection highlights in sync with the (possibly reloaded) selection data.
		this._reapplyTabularSelectionHighlights(pView, pGroup);
		return true;
	}
}

module.exports = TabularLayout;
