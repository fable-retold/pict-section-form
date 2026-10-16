const libPictSectionGroupLayout = require('../Pict-Provider-DynamicLayout.js');

class RecordLayout extends libPictSectionGroupLayout
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

		/** @type {Array<(pInput: any) => boolean>} */
		this.layoutExcludedInputChecks = [];
	}

	/**
	 * Register a check that marks an input as taking no width in its row. An excluded
	 * input gets `PictForm.LayoutExcluded = true` and a QuantizedWidth of 0, and the
	 * other inputs in the row share its space.
	 *
	 * @param {(pInput: any) => boolean} fCheck - returns true when the input takes no width
	 */
	registerLayoutExcludedInputCheck(fCheck)
	{
		if ((typeof fCheck === 'function') && !this.layoutExcludedInputChecks.includes(fCheck))
		{
			this.layoutExcludedInputChecks.push(fCheck);
		}
	}

	/**
	 * @param {any} pInput
	 * @returns {boolean} - true when any registered check excludes the input from row width
	 */
	isLayoutExcludedInput(pInput)
	{
		for (let i = 0; i < this.layoutExcludedInputChecks.length; i++)
		{
			if (this.layoutExcludedInputChecks[i](pInput))
			{
				return true;
			}
		}
		return false;
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
		let tmpMetatemplateGenerator = this.pict.providers.MetatemplateGenerator;
		let tmpTemplate = '';

		pGroup.Rows.sort((rowA, rowB) =>
		{
			if (rowA.RowNumber && rowB.RowNumber)
			{
				return rowA.RowNumber >= rowB.RowNumber ? 1 : -1;
			}
			if (!rowA.RowNumber && !rowB.RowNumber)
			{
				return rowA.Hash >= rowB.Hash ? 1 : -1;
			}
			return rowA.RowNumber ? 1 : -1;
		});

		if (!('Rows' in pGroup))
		{
			pGroup.Rows = [];
		}

		tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-Template-Group-Prefix`, `getGroup("${pGroup.GroupIndex}")`);
		for (let j = 0; j < pGroup.Rows.length; j++)
		{
			// TODO: Validate that the row exists?  Bootstrap seems to have it here.
			let tmpRow = pGroup.Rows[j]
			tmpRow.WidthTotalRaw = 0;

			tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-Template-Row-Prefix`, `getGroup("${pGroup.GroupIndex}")`);

			for (let k = 0; k < tmpRow.Inputs.length; k++)
			{
				let tmpInput = tmpRow.Inputs[k];
				// Update the InputIndex to match the current render config
				tmpInput.PictForm.InputIndex = k;
				tmpInput.PictForm.GroupIndex = pGroup.GroupIndex;
				tmpInput.PictForm.RowIndex = j;
				let tmpInputWidth = 1;
				try
				{
					tmpInputWidth = Math.abs(parseFloat(tmpInput.PictForm.Width));
				}
				catch (pParseError)
				{
					tmpInputWidth = 1;
				}
				if (!tmpInputWidth || isNaN(tmpInputWidth) || tmpInputWidth <= 0)
				{
					tmpInputWidth = 1;
				}
				let tmpInputWidthOffset = Math.abs(parseFloat(tmpInput.PictForm.WidthOffset));
				if (!tmpInputWidthOffset || isNaN(tmpInputWidthOffset))
				{
					tmpInputWidthOffset = 0;
				}
				tmpInput.PictForm.LayoutExcluded = this.isLayoutExcludedInput(tmpInput);
				if (tmpInput.PictForm.LayoutExcluded)
				{
					tmpInputWidth = 0;
					tmpInputWidthOffset = 0;
				}
				tmpInput.PictForm.RawWidth = tmpInputWidth;
				tmpInput.PictForm.RawWidthOffset = tmpInputWidthOffset;
				tmpRow.WidthTotalRaw += tmpInputWidth + tmpInputWidthOffset;

				//tmpTemplate += tmpMetatemplateGenerator.getInputMetatemplateTemplateReference(pView, tmpInput.DataType, tmpInput.PictForm.InputType, `getInput("${pGroup.GroupIndex}","${j}","${k}")`);
			}
			// Now that we've gotten all the raw widths for the row, quantize them properly.
			// Default by quantizing to 99 percentage units wide
			let tmpGroupQuantizedWidth = 95;
			if ('WidthQuantization' in pGroup)
			{
				try
				{
					tmpGroupQuantizedWidth = Math.abs(parseInt(pGroup.WidthQuantization));
					if (!tmpGroupQuantizedWidth || isNaN(tmpGroupQuantizedWidth) || tmpGroupQuantizedWidth <= 0)
					{
						tmpGroupQuantizedWidth = 95;
					}
				}
				catch(pParseError)
				{
					// TODO: UGH THIS IS NaN at the moment.......
					tmpGroupQuantizedWidth = 95;
				}
			}
			else if ('WidthQuantization' in this.pict.PictApplication.options)
			{
				tmpGroupQuantizedWidth = this.pict.PictApplication.options.WidthQuantization;
			}
			for (let k = 0; k < tmpRow.Inputs.length; k++)
			{
				let tmpInput = tmpRow.Inputs[k];
				if (tmpRow.WidthTotalRaw > 0)
				{
					tmpInput.PictForm.QuantizedWidth = Math.round((tmpInput.PictForm.RawWidth / tmpRow.WidthTotalRaw) * tmpGroupQuantizedWidth);
					tmpInput.PictForm.QuantizedWidthOffset = Math.round((tmpInput.PictForm.RawWidthOffset / tmpRow.WidthTotalRaw) * tmpGroupQuantizedWidth);
				}
				else
				{
					tmpInput.PictForm.QuantizedWidth = 0;
					tmpInput.PictForm.QuantizedWidthOffset = 0;
				}
				//this.fable.log.trace(`Quantized input width for Group ${pGroup.GroupIndex} Row ${j} Input ${k} (${tmpInput.Name}) to ${tmpInput.PictForm.QuantizedWidth} (Raw: ${tmpInput.PictForm.RawWidth} / Total Raw: ${tmpRow.WidthTotalRaw} / Group Quantization: ${tmpGroupQuantizedWidth})`);

				tmpTemplate += tmpMetatemplateGenerator.getInputMetatemplateTemplateReference(pView, tmpInput.DataType, tmpInput.PictForm.InputType, `getInput("${pGroup.GroupIndex}","${j}","${k}")`);
			}

			tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-Template-Row-Postfix`, `getGroup("${pGroup.GroupIndex}")`);
		}
		tmpTemplate += tmpMetatemplateGenerator.getMetatemplateTemplateReference(pView, `-Template-Group-Postfix`, `getGroup("${pGroup.GroupIndex}")`);

		return tmpTemplate;
	}
}

module.exports = RecordLayout;
