const libPictSectionInputExtension = require('../Pict-Provider-InputExtension.js');
const libChartCSS = require('./Pict-Provider-Input-Chart-CSS.js');

/**
 * CustomInputHandler class.
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
		/** @type {import('pict')} */
		this.fable;
		/** @type {any} */
		this.log;

		// Manage the the configuration parsing configurations -- these can be overridden in the object or even per-input
		if (!this.options.DefaultCoreParsingConfiguration || !Array.isArray(this.options.DefaultCoreParsingConfiguration))
		{
			this.options.DefaultCoreParsingConfiguration = (
				{
					AddressInObject: '',
					ObjectType: 'object',
					MergeMethod: 'Object',
					Steps: [
						{
							InputProperty: false,
							Method: `Initialize`,
							Merge: false
						},
						{
							InputProperty: 'PictForm.ChartConfigCorePrototypeRaw',
							Method: `Raw`,
							Merge: true
						},
						{
							InputProperty: 'PictForm.ChartConfigCorePrototypeAddress',
							Method: `Address`,
							Merge: true
						},
						{
							InputProperty: `PictForm.ChartConfigCorePrototype`,
							Method: 'SingleSolver',
							Merge: true
						}
					]
				});
		}
		this.defaultCoreParsingConfiguration = JSON.parse(JSON.stringify(this.options.DefaultCoreParsingConfiguration));

		if (typeof (this.options.DefaultLabelParsingConfiguration) !== 'object' || !Array.isArray(this.options.DefaultLabelParsingConfiguration.Steps))
		{
			this.options.DefaultLabelParsingConfiguration = (
				{
					AddressInObject: 'data.labels',
					ObjectType: 'array',
					MergeMethod: 'Array',
					Steps: [
						{
							InputProperty: false,
							Method: `Initialize`,
							Merge: false
						},
						{
							InputProperty: 'PictForm.ChartLabelsRaw',
							Method: `Raw`,
							Merge: false
						},
						{
							InputProperty: 'PictForm.ChartLabelsAddress',
							Method: `Address`,
							Merge: false
						},
						{
							InputProperty: `PictForm.ChartLabelsSolver`,
							Method: 'SingleSolver',
							Merge: false
						}
					]
				});
		}
		this.defaultLabelParsingConfiguration = JSON.parse(JSON.stringify(this.options.DefaultLabelParsingConfiguration));

		if (typeof (this.options.DefaultDataParsingConfiguration) !== 'object' || !Array.isArray(this.options.DefaultDataParsingConfiguration.Steps))
		{
			this.options.DefaultDataParsingConfiguration = (
				{
					AddressInObject: 'data.datasets',
					ObjectType: 'array',
					MergeMethod: 'Array',
					Steps: [
						{
							InputProperty: false,
							Method: `Initialize`,
							Merge: false
						},
						{
							InputProperty: 'PictForm.ChartDatasetsRaw',
							Method: `Raw`,
							Merge: false
						},
						{
							InputProperty: 'PictForm.ChartDatasetsAddress',
							Method: `Address`,
							Merge: false
						},
						{
							InputProperty: 'PictForm.ChartDatasetsSolvers',
							Method: `ArrayOfSolvers`,
							Merge: true
						}
					]
				});
		}
		this.defaultDataParsingConfiguration = JSON.parse(JSON.stringify(this.options.DefaultDataParsingConfiguration));

		this.currentChartObjects = {};
		this.currentChartDataObjects = {};
		// Legend visibility + collapsed groups, per input hash, so a redraw does not
		// undo what the user toggled.
		this.currentChartLegendState = {};
		this.currentChartThemeColors = {};

		if (this.pict && this.pict.CSSMap && typeof this.pict.CSSMap.addCSS === 'function')
		{
			this.pict.CSSMap.addCSS('Pict-Input-Chart-CSS', libChartCSS, 500);
		}
	}

	/**
	 * Classify a dataset's line style for its legend swatch, so a reading, a
	 * dashed control limit and an unconnected marker series are told apart at a
	 * glance. Chart.js's own legend draws every entry as the same block.
	 *
	 * @param {Object} pDataset - The Chart.js dataset.
	 * @return {string} A swatch modifier class.
	 */
	_legendSwatchClass(pDataset)
	{
		if (pDataset.showLine === false) { return 'pict-swatch-markers'; }
		const tmpDash = Array.isArray(pDataset.borderDash) ? pDataset.borderDash : null;
		if (!tmpDash || tmpDash.length < 1) { return ''; }
		// A short first segment reads as dotted, a long one as dashed.
		return (Number(tmpDash[0]) <= 3) ? 'pict-swatch-dotted' : 'pict-swatch-dashed';
	}

	/**
	 * Group the datasets for the legend. A dataset declares its group with
	 * `LegendGroup` on the solver entry (carried onto the dataset as
	 * `pictLegendGroup`); anything that does not is "Data". Group ORDER follows
	 * first appearance, so configuration controls it rather than sort order.
	 *
	 * @param {Object} pChart - The Chart.js instance.
	 * @return {Array<{Key: string, Items: Array<{Index: number, Dataset: Object}>}>}
	 */
	_legendGroups(pChart)
	{
		const tmpGroups = [];
		const tmpIndex = {};
		const tmpDatasets = (pChart && pChart.data && pChart.data.datasets) || [];
		for (let i = 0; i < tmpDatasets.length; i++)
		{
			const tmpKey = tmpDatasets[i].pictLegendGroup || 'Data';
			if (!(tmpKey in tmpIndex))
			{
				tmpIndex[tmpKey] = tmpGroups.length;
				tmpGroups.push({ Key: tmpKey, Items: [] });
			}
			tmpGroups[tmpIndex[tmpKey]].Items.push({ Index: i, Dataset: tmpDatasets[i] });
		}
		return tmpGroups;
	}

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
	renderChartLegend(pRawHTMLID, pChart, pLegendConfiguration)
	{
		if (typeof (document) === 'undefined' || !pChart || !pChart.canvas) { return false; }
		const tmpCanvas = pChart.canvas;
		const tmpContainer = tmpCanvas.parentElement;
		if (!tmpContainer) { return false; }

		const tmpState = this.currentChartLegendState[pRawHTMLID] = this.currentChartLegendState[pRawHTMLID] || { Hidden: false, Collapsed: {} };
		const tmpPosition = pLegendConfiguration.Position || 'right';

		// Wrap the canvas ONCE: shell > (canvas area | legend).
		//
		// After the first wrap the container's parent is the canvas AREA, not the
		// shell, so testing the immediate parent for 'pict-chart-shell' never matches
		// again and every re-render nests another shell inside the last -- 14 shells
		// and 14 legends for 3 charts after a handful of toggles. Detect the wrapped
		// shape by its own marker and climb to the shell.
		let tmpShell = null;
		const tmpExistingArea = tmpContainer.parentElement;
		if (tmpExistingArea && tmpExistingArea.classList.contains('pict-chart-canvas-area')
			&& tmpExistingArea.parentElement && tmpExistingArea.parentElement.classList.contains('pict-chart-shell'))
		{
			tmpShell = tmpExistingArea.parentElement;
		}
		if (!tmpShell)
		{
			tmpShell = document.createElement('div');
			tmpShell.className = 'pict-chart-shell';
			tmpContainer.parentNode.insertBefore(tmpShell, tmpContainer);
			const tmpArea = document.createElement('div');
			tmpArea.className = 'pict-chart-canvas-area';
			tmpShell.appendChild(tmpArea);
			tmpArea.appendChild(tmpContainer);
		}
		tmpShell.classList.remove('pict-chart-legend-top', 'pict-chart-legend-bottom');
		if (tmpPosition === 'top') { tmpShell.classList.add('pict-chart-legend-top'); }
		if (tmpPosition === 'bottom') { tmpShell.classList.add('pict-chart-legend-bottom'); }

		let tmpLegend = tmpShell.querySelector(':scope > .pict-chart-legend');
		if (!tmpLegend)
		{
			tmpLegend = document.createElement('div');
			tmpLegend.className = 'pict-chart-legend';
			tmpShell.appendChild(tmpLegend);
		}
		tmpLegend.innerHTML = '';

		// Show/hide the whole legend. Charts differ in how much room they have,
		// so this is per-chart and remembered for the session.
		if (pLegendConfiguration.AllowHide !== false)
		{
			const tmpToggle = document.createElement('button');
			tmpToggle.type = 'button';
			tmpToggle.className = 'pict-chart-legend-toggle';
			tmpToggle.textContent = tmpState.Hidden ? 'Show legend' : 'Hide legend';
			tmpToggle.addEventListener('click', () =>
			{
				tmpState.Hidden = !tmpState.Hidden;
				this.renderChartLegend(pRawHTMLID, pChart, pLegendConfiguration);
			});
			tmpLegend.appendChild(tmpToggle);
		}
		if (tmpState.Hidden) { return true; }

		const tmpGroups = this._legendGroups(pChart);
		for (const tmpGroup of tmpGroups)
		{
			const tmpGroupElement = document.createElement('div');
			tmpGroupElement.className = 'pict-chart-legend-group';
			const tmpAllHidden = tmpGroup.Items.every((pItem) => pChart.getDatasetMeta(pItem.Index).hidden === true);
			if (tmpAllHidden) { tmpGroupElement.classList.add('pict-group-off'); }
			if (tmpState.Collapsed[tmpGroup.Key]) { tmpGroupElement.classList.add('pict-collapsed'); }

			const tmpHeader = document.createElement('div');
			tmpHeader.className = 'pict-chart-legend-group-header';
			const tmpCaret = document.createElement('span');
			tmpCaret.className = 'pict-chart-legend-group-caret';
			tmpCaret.textContent = '▾';
			tmpHeader.appendChild(tmpCaret);
			const tmpHeaderLabel = document.createElement('span');
			tmpHeaderLabel.textContent = tmpGroup.Key;
			tmpHeader.appendChild(tmpHeaderLabel);
			// Header click toggles the GROUP's series on/off; the caret collapses it.
			tmpHeader.addEventListener('click', (pEvent) =>
			{
				if (pEvent.target === tmpCaret)
				{
					tmpState.Collapsed[tmpGroup.Key] = !tmpState.Collapsed[tmpGroup.Key];
				}
				else
				{
					const tmpTurnOn = tmpAllHidden;
					for (const tmpItem of tmpGroup.Items)
					{
						pChart.getDatasetMeta(tmpItem.Index).hidden = tmpTurnOn ? false : true;
					}
					pChart.update();
				}
				this.renderChartLegend(pRawHTMLID, pChart, pLegendConfiguration);
			});
			tmpGroupElement.appendChild(tmpHeader);

			const tmpItems = document.createElement('div');
			tmpItems.className = 'pict-chart-legend-items';
			for (const tmpItem of tmpGroup.Items)
			{
				const tmpHidden = pChart.getDatasetMeta(tmpItem.Index).hidden === true;
				const tmpItemElement = document.createElement('div');
				tmpItemElement.className = 'pict-chart-legend-item' + (tmpHidden ? ' pict-hidden' : '');
				const tmpSwatch = document.createElement('span');
				tmpSwatch.className = ('pict-chart-legend-swatch ' + this._legendSwatchClass(tmpItem.Dataset)).trim();
				tmpSwatch.style.color = tmpItem.Dataset.borderColor || tmpItem.Dataset.backgroundColor || '#868E96';
				tmpItemElement.appendChild(tmpSwatch);
				const tmpLabel = document.createElement('span');
				tmpLabel.className = 'pict-chart-legend-label';
				tmpLabel.textContent = tmpItem.Dataset.label || `Series ${tmpItem.Index + 1}`;
				tmpLabel.title = tmpLabel.textContent;
				tmpItemElement.appendChild(tmpLabel);
				tmpItemElement.addEventListener('click', () =>
				{
					pChart.getDatasetMeta(tmpItem.Index).hidden = !tmpHidden;
					pChart.update();
					this.renderChartLegend(pRawHTMLID, pChart, pLegendConfiguration);
				});
				tmpItems.appendChild(tmpItemElement);
			}
			tmpGroupElement.appendChild(tmpItems);
			tmpLegend.appendChild(tmpGroupElement);
		}
		return true;
	}

	/**
	 * Resolve the ChartLegend configuration for an input. Returns null when the
	 * grouped legend is not in use, in which case Chart.js's own legend stands.
	 *
	 * @param {Object} pInput - The PictForm input object.
	 * @return {Object|null}
	 */
	resolveChartLegendConfiguration(pInput)
	{
		const tmpPictform = (pInput && pInput.PictForm) || {};
		const tmpLegend = tmpPictform.ChartLegend;
		if (!tmpLegend) { return null; }
		if (tmpLegend === true) { return { Position: 'right' }; }
		if (typeof (tmpLegend) !== 'object') { return null; }
		if (tmpLegend.Enabled === false) { return null; }
		return tmpLegend;
	}

	/**
	 * Resolve the ChartValueLabels configuration for an input, filled out with
	 * defaults. Returns null when values are not drawn on the chart, in which
	 * case they show only in the hover tooltip.
	 *
	 * @param {Object} pInput - The PictForm input object.
	 * @return {Object|null}
	 */
	resolveChartValueLabelConfiguration(pInput)
	{
		const tmpPictform = (pInput && pInput.PictForm) || {};
		let tmpValueLabels = tmpPictform.ChartValueLabels;
		if (tmpValueLabels === true)
		{
			tmpValueLabels = {};
		}
		if (!tmpValueLabels || (typeof (tmpValueLabels) !== 'object') || (tmpValueLabels.Enabled === false))
		{
			return null;
		}
		const tmpConfiguration = Object.assign(
			{
				Datasets: 'All',
				Position: 'top',
				Offset: 4,
				Padding: 2,
				FontSize: 11,
				FontWeight: 'normal',
				HideOverlaps: true,
			}, tmpValueLabels);
		if ([ 'top', 'bottom', 'center' ].indexOf(tmpConfiguration.Position) < 0)
		{
			tmpConfiguration.Position = 'top';
		}
		const fNumberOr = (pValue, pDefault) =>
		{
			const tmpNumber = parseFloat(pValue);
			return (isFinite(tmpNumber) && (tmpNumber >= 0)) ? tmpNumber : pDefault;
		};
		tmpConfiguration.Offset = fNumberOr(tmpConfiguration.Offset, 4);
		tmpConfiguration.Padding = fNumberOr(tmpConfiguration.Padding, 2);
		tmpConfiguration.FontSize = fNumberOr(tmpConfiguration.FontSize, 11) || 11;
		return tmpConfiguration;
	}

	/**
	 * Build the Chart.js inline plugin that draws each point's value on the chart.
	 *
	 * @param {Object} pConfiguration - From resolveChartValueLabelConfiguration.
	 * @return {Object} A Chart.js plugin.
	 */
	createChartValueLabelPlugin(pConfiguration)
	{
		return (
			{
				id: 'pictValueLabels',
				afterDatasetsDraw: (pChart) =>
				{
					this.drawChartValueLabels(pChart, pConfiguration);
				},
			});
	}

	/**
	 * Format a value for its label: blanks and non-numbers draw nothing, and
	 * floating-point noise (0.30000000000000004) is trimmed unless Decimals fixes
	 * the places.
	 *
	 * @param {any} pValue - The parsed data value.
	 * @param {Object} pConfiguration - From resolveChartValueLabelConfiguration.
	 * @return {string|null} The label text, or null for no label.
	 */
	_formatChartValueLabel(pValue, pConfiguration)
	{
		if ((pValue === null) || (typeof (pValue) === 'undefined') || (pValue === ''))
		{
			return null;
		}
		const tmpNumber = Number(pValue);
		if (!isFinite(tmpNumber))
		{
			return null;
		}
		const tmpDecimals = parseInt(pConfiguration.Decimals, 10);
		if (isFinite(tmpDecimals) && (tmpDecimals >= 0))
		{
			return tmpNumber.toFixed(Math.min(tmpDecimals, 20));
		}
		return String(parseFloat(tmpNumber.toPrecision(12)));
	}

	/**
	 * Work out every candidate value label for a drawn chart: its text, colour and
	 * box. A box that would leave the plot area is flipped to the other side of
	 * its point, then clamped inside.
	 *
	 * @param {Object} pChart - The Chart.js instance.
	 * @param {Object} pConfiguration - From resolveChartValueLabelConfiguration.
	 * @param {(pText: string) => number} fMeasureText - Returns the drawn width of a label's text.
	 * @return {Array<{ Text: string, Color: string, X: number, Y: number, Left: number, Top: number, Width: number, Height: number, DatasetIndex: number, Index: number }>}
	 */
	_collectChartValueLabels(pChart, pConfiguration, fMeasureText)
	{
		const tmpLabels = [];
		const tmpArea = pChart && pChart.chartArea;
		const tmpDatasets = (pChart && pChart.data && pChart.data.datasets) || [];
		if (!tmpArea)
		{
			return tmpLabels;
		}
		const tmpAllDatasets = (pConfiguration.Datasets !== 'OptIn');
		const tmpHeight = pConfiguration.FontSize + (2 * pConfiguration.Padding);
		for (let i = 0; i < tmpDatasets.length; i++)
		{
			const tmpDataset = tmpDatasets[i];
			if (!tmpDataset)
			{
				continue;
			}
			const tmpIncluded = (tmpDataset.pictValueLabels === true) || (tmpAllDatasets && (tmpDataset.pictValueLabels !== false));
			if (!tmpIncluded)
			{
				continue;
			}
			if ((typeof (pChart.isDatasetVisible) === 'function') && !pChart.isDatasetVisible(i))
			{
				continue;
			}
			const tmpMeta = pChart.getDatasetMeta(i);
			if (!tmpMeta || !Array.isArray(tmpMeta.data))
			{
				continue;
			}
			const tmpValueAxis = (tmpMeta.vScale && tmpMeta.vScale.axis) || 'y';
			for (let j = 0; j < tmpMeta.data.length; j++)
			{
				const tmpElement = tmpMeta.data[j];
				if (!tmpElement || tmpElement.skip)
				{
					continue;
				}
				let tmpValue = (tmpMeta.controller && (typeof (tmpMeta.controller.getParsed) === 'function')) ? tmpMeta.controller.getParsed(j) : tmpDataset.data[j];
				if ((typeof (tmpValue) === 'object') && (tmpValue !== null))
				{
					tmpValue = (tmpValueAxis in tmpValue) ? tmpValue[tmpValueAxis] : tmpValue.y;
				}
				const tmpText = this._formatChartValueLabel(tmpValue, pConfiguration);
				if (tmpText === null)
				{
					continue;
				}
				const tmpPosition = (typeof (tmpElement.tooltipPosition) === 'function') ? tmpElement.tooltipPosition(false) : tmpElement;
				if (!isFinite(tmpPosition.x) || !isFinite(tmpPosition.y))
				{
					continue;
				}
				const tmpWidth = fMeasureText(tmpText) + (2 * pConfiguration.Padding);
				const tmpRadius = (tmpElement.options && isFinite(tmpElement.options.radius)) ? Number(tmpElement.options.radius) : 0;
				const tmpGap = tmpRadius + pConfiguration.Offset;
				// Arcs (pie, doughnut, polar area) label their centroid
				let tmpPlacement = (typeof (tmpElement.outerRadius) === 'number') ? 'center' : pConfiguration.Position;
				// A bar below its base reads from its far end, so its label goes underneath
				if ((tmpPlacement !== 'center') && ('base' in tmpElement) && (Number(tmpValue) < 0))
				{
					tmpPlacement = (tmpPlacement === 'top') ? 'bottom' : 'top';
				}
				const tmpAboveTop = tmpPosition.y - tmpGap - tmpHeight;
				const tmpBelowTop = tmpPosition.y + tmpGap;
				const fClampTop = (pTop) => Math.max(tmpArea.top, Math.min(pTop, tmpArea.bottom - tmpHeight));
				let tmpTop = tmpPosition.y - (tmpHeight / 2);
				// The other side of the point, tried when the first choice collides with a kept label
				let tmpAlternateTop = null;
				if (tmpPlacement === 'top')
				{
					const tmpFits = (tmpAboveTop >= tmpArea.top);
					tmpTop = tmpFits ? tmpAboveTop : tmpBelowTop;
					tmpAlternateTop = tmpFits ? fClampTop(tmpBelowTop) : null;
				}
				else if (tmpPlacement === 'bottom')
				{
					const tmpFits = ((tmpBelowTop + tmpHeight) <= tmpArea.bottom);
					tmpTop = tmpFits ? tmpBelowTop : tmpAboveTop;
					tmpAlternateTop = tmpFits ? fClampTop(tmpAboveTop) : null;
				}
				tmpTop = fClampTop(tmpTop);
				const tmpLeft = Math.max(tmpArea.left, Math.min(tmpPosition.x - (tmpWidth / 2), tmpArea.right - tmpWidth));
				let tmpColor = pConfiguration.Color || (pChart.options && pChart.options.color) || '#666';
				if (pConfiguration.Color === 'Dataset')
				{
					tmpColor = (tmpElement.options && tmpElement.options.borderColor) || tmpDataset.borderColor || (pChart.options && pChart.options.color) || '#666';
				}
				tmpLabels.push(
					{
						Text: tmpText,
						Color: tmpColor,
						X: tmpLeft + (tmpWidth / 2),
						Y: tmpTop + (tmpHeight / 2),
						Left: tmpLeft,
						Top: tmpTop,
						Width: tmpWidth,
						Height: tmpHeight,
						AlternateTop: tmpAlternateTop,
						DatasetIndex: i,
						Index: j,
					});
			}
		}
		return tmpLabels;
	}

	/**
	 * Keep the labels that fit. A label that would overlap one already kept moves
	 * to the other side of its point if that is clear, and is hidden otherwise.
	 * Earlier datasets win, then earlier points, so the series listed first keeps
	 * its values when series crowd each other.
	 *
	 * @param {Array<Object>} pLabels - From _collectChartValueLabels.
	 * @param {boolean} pHideOverlaps - False keeps every label where it was first placed.
	 * @return {Array<Object>} The labels to draw.
	 */
	_layoutChartValueLabels(pLabels, pHideOverlaps)
	{
		if (!pHideOverlaps)
		{
			return pLabels;
		}
		const tmpKept = [];
		const fIsClear = (pLeft, pTop, pWidth, pHeight) =>
		{
			for (let j = 0; j < tmpKept.length; j++)
			{
				const tmpOther = tmpKept[j];
				if ((pLeft < tmpOther.Left + tmpOther.Width) && (tmpOther.Left < pLeft + pWidth)
					&& (pTop < tmpOther.Top + tmpOther.Height) && (tmpOther.Top < pTop + pHeight))
				{
					return false;
				}
			}
			return true;
		};
		for (let i = 0; i < pLabels.length; i++)
		{
			const tmpLabel = pLabels[i];
			if (fIsClear(tmpLabel.Left, tmpLabel.Top, tmpLabel.Width, tmpLabel.Height))
			{
				tmpKept.push(tmpLabel);
			}
			else if ((typeof (tmpLabel.AlternateTop) === 'number') && fIsClear(tmpLabel.Left, tmpLabel.AlternateTop, tmpLabel.Width, tmpLabel.Height))
			{
				tmpKept.push(Object.assign({}, tmpLabel, { Top: tmpLabel.AlternateTop, Y: tmpLabel.AlternateTop + (tmpLabel.Height / 2), AlternateTop: null }));
			}
		}
		return tmpKept;
	}

	/**
	 * The halo drawn behind label text so it stays readable over grid lines and
	 * other series: dark behind light text, light behind dark text.
	 *
	 * @param {string} pTextColor - The chart's text colour.
	 * @return {string} The halo colour.
	 */
	_chartValueLabelHaloColor(pTextColor)
	{
		const tmpMatch = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(pTextColor || '');
		if (tmpMatch)
		{
			const tmpLuminance = ((0.299 * Number(tmpMatch[1])) + (0.587 * Number(tmpMatch[2])) + (0.114 * Number(tmpMatch[3]))) / 255;
			if (tmpLuminance > 0.5)
			{
				return 'rgba(0, 0, 0, 0.75)';
			}
		}
		return 'rgba(255, 255, 255, 0.85)';
	}

	/**
	 * Draw each point's value on a chart's canvas, after its datasets.
	 *
	 * @param {Object} pChart - The Chart.js instance.
	 * @param {Object} pConfiguration - From resolveChartValueLabelConfiguration.
	 * @return {number} How many labels were drawn.
	 */
	drawChartValueLabels(pChart, pConfiguration)
	{
		const tmpContext = pChart && pChart.ctx;
		if (!tmpContext || !pChart.chartArea)
		{
			return 0;
		}
		const tmpFamily = (pChart.options && pChart.options.font && pChart.options.font.family) || 'sans-serif';
		tmpContext.save();
		tmpContext.font = `${pConfiguration.FontWeight} ${pConfiguration.FontSize}px ${tmpFamily}`;
		const tmpLabels = this._layoutChartValueLabels(
			this._collectChartValueLabels(pChart, pConfiguration, (pText) => tmpContext.measureText(pText).width),
			pConfiguration.HideOverlaps !== false);
		tmpContext.textAlign = 'center';
		tmpContext.textBaseline = 'middle';
		const tmpHaloWidth = parseFloat(pConfiguration.HaloWidth);
		if (pConfiguration.Halo !== false)
		{
			tmpContext.lineJoin = 'round';
			tmpContext.lineWidth = (isFinite(tmpHaloWidth) && (tmpHaloWidth > 0)) ? tmpHaloWidth : 3;
			tmpContext.strokeStyle = pConfiguration.HaloColor || this._chartValueLabelHaloColor(pChart.options && pChart.options.color);
		}
		for (let i = 0; i < tmpLabels.length; i++)
		{
			if (pConfiguration.Halo !== false)
			{
				tmpContext.strokeText(tmpLabels[i].Text, tmpLabels[i].X, tmpLabels[i].Y);
			}
			tmpContext.fillStyle = tmpLabels[i].Color;
			tmpContext.fillText(tmpLabels[i].Text, tmpLabels[i].X, tmpLabels[i].Y);
		}
		tmpContext.restore();
		return tmpLabels.length;
	}

	/**
	 * Resolve the text and grid colours a chart should draw with from the page
	 * around its canvas, so the canvas follows the host's light or dark theme the
	 * way the surrounding HTML does. `--pict-chart-text-color` and
	 * `--pict-chart-grid-color` win when set; otherwise the text colour is the
	 * canvas's inherited CSS `color` and the grid is that colour faded.
	 *
	 * @param {Object} pInput - The PictForm input object.
	 * @return {{ Text: string, Grid: string|null }|null} Null when there is no rendered canvas to read.
	 */
	resolveChartThemeColors(pInput)
	{
		if ((typeof (window) === 'undefined') || (typeof (window.getComputedStyle) !== 'function') || !pInput || !pInput.Macro)
		{
			return null;
		}
		const tmpCanvasElements = this.pict.ContentAssignment.getElement(`#CANVAS-FOR-${pInput.Macro.RawHTMLID}`);
		if (!Array.isArray(tmpCanvasElements) || (tmpCanvasElements.length < 1))
		{
			return null;
		}
		const tmpStyle = window.getComputedStyle(tmpCanvasElements[0]);
		const tmpText = tmpStyle.getPropertyValue('--pict-chart-text-color').trim() || tmpStyle.color;
		if (!tmpText)
		{
			return null;
		}
		const tmpGrid = tmpStyle.getPropertyValue('--pict-chart-grid-color').trim() || this._fadeChartColor(tmpText, 0.15);
		return { Text: tmpText, Grid: tmpGrid };
	}

	/**
	 * @param {string} pColor - A computed `rgb()` / `rgba()` colour.
	 * @param {number} pAlpha - The opacity to give it.
	 * @return {string|null} The faded colour, or null when the colour is in another notation.
	 */
	_fadeChartColor(pColor, pAlpha)
	{
		const tmpMatch = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(pColor);
		if (!tmpMatch)
		{
			return null;
		}
		return `rgba(${tmpMatch[1]}, ${tmpMatch[2]}, ${tmpMatch[3]}, ${pAlpha})`;
	}

	/**
	 * Apply theme colours to a drawn chart, filling only the colour options the
	 * manifest left unset, so an explicit colour always wins. Chart.js takes
	 * tick, grid and title colours from its global defaults rather than the
	 * chart's own `color`, so every scale the chart drew is coloured by id.
	 *
	 * @param {Object} pChart - The Chart.js instance.
	 * @param {Object} pManifestOptions - The chart options as built from the manifest, before Chart.js filled in its defaults.
	 * @param {{ Text: string, Grid: string|null }|null} pColors - From resolveChartThemeColors.
	 * @return {boolean} True when a colour changed and the chart was updated.
	 */
	applyChartThemeColors(pChart, pManifestOptions, pColors)
	{
		if (!pChart || (typeof (pChart.options) !== 'object') || !pColors)
		{
			return false;
		}
		const tmpManifestOptions = (typeof (pManifestOptions) === 'object' && pManifestOptions !== null) ? pManifestOptions : {};
		let tmpChanged = false;
		const fSetUnlessExplicit = (pPath, pValue) =>
		{
			if (!pValue)
			{
				return;
			}
			if (typeof (this.pict.manifest.getValueByHash(tmpManifestOptions, pPath)) !== 'undefined')
			{
				return;
			}
			const tmpParts = pPath.split('.');
			let tmpTarget = pChart.options;
			for (let i = 0; i < tmpParts.length - 1; i++)
			{
				if ((typeof (tmpTarget[tmpParts[i]]) !== 'object') || (tmpTarget[tmpParts[i]] === null))
				{
					tmpTarget[tmpParts[i]] = {};
				}
				tmpTarget = tmpTarget[tmpParts[i]];
			}
			const tmpKey = tmpParts[tmpParts.length - 1];
			if (tmpTarget[tmpKey] !== pValue)
			{
				tmpTarget[tmpKey] = pValue;
				tmpChanged = true;
			}
		};

		fSetUnlessExplicit('color', pColors.Text);
		fSetUnlessExplicit('plugins.title.color', pColors.Text);
		fSetUnlessExplicit('plugins.subtitle.color', pColors.Text);

		const tmpScales = (typeof (pChart.scales) === 'object' && pChart.scales !== null) ? pChart.scales : {};
		const tmpScaleIDs = Object.keys(tmpScales);
		for (let i = 0; i < tmpScaleIDs.length; i++)
		{
			const tmpScaleAddress = `scales.${tmpScaleIDs[i]}`;
			fSetUnlessExplicit(`${tmpScaleAddress}.ticks.color`, pColors.Text);
			fSetUnlessExplicit(`${tmpScaleAddress}.title.color`, pColors.Text);
			fSetUnlessExplicit(`${tmpScaleAddress}.grid.color`, pColors.Grid);
			fSetUnlessExplicit(`${tmpScaleAddress}.border.color`, pColors.Grid);
			const tmpScaleOptions = tmpScales[tmpScaleIDs[i]] && tmpScales[tmpScaleIDs[i]].options;
			if (tmpScaleOptions && tmpScaleOptions.pointLabels)
			{
				fSetUnlessExplicit(`${tmpScaleAddress}.pointLabels.color`, pColors.Text);
				fSetUnlessExplicit(`${tmpScaleAddress}.angleLines.color`, pColors.Grid);
				// Radial tick labels sit on a white backdrop by default, which hides light text
				fSetUnlessExplicit(`${tmpScaleAddress}.ticks.backdropColor`, 'transparent');
			}
		}

		if (tmpChanged && (typeof (pChart.update) === 'function'))
		{
			pChart.update('none');
		}
		return tmpChanged;
	}

	/**
	 * Re-read the theme colours around a chart and apply them when they differ
	 * from the last ones applied to it (or always, when forced for a new chart).
	 *
	 * @param {Object} pInput - The PictForm input object.
	 * @param {Object} pChart - The Chart.js instance.
	 * @param {Object} pManifestOptions - The chart options as built from the manifest.
	 * @param {boolean} [pForce] - Apply even if the colours have not changed.
	 */
	refreshChartThemeColors(pInput, pChart, pManifestOptions, pForce)
	{
		const tmpColors = this.resolveChartThemeColors(pInput);
		if (!tmpColors)
		{
			return;
		}
		const tmpKey = `Theme-For-${pInput.Macro.RawHTMLID}`;
		const tmpSignature = JSON.stringify(tmpColors);
		if (!pForce && (this.currentChartThemeColors[tmpKey] === tmpSignature))
		{
			return;
		}
		this.applyChartThemeColors(pChart, pManifestOptions, tmpColors);
		this.currentChartThemeColors[tmpKey] = tmpSignature;
	}

	/**
	 * Copy the arrays and plain objects of a chart configuration fragment, so the
	 * parsing steps can merge into it without writing back into the manifest or
	 * application state it was read from. Anything else (functions such as
	 * Chart.js callbacks, class instances) is carried across by reference.
	 *
	 * @param {any} pValue - The configuration fragment.
	 * @return {any} The copy.
	 */
	_cloneChartConfiguration(pValue)
	{
		if (Array.isArray(pValue))
		{
			return pValue.map((pItem) => this._cloneChartConfiguration(pItem));
		}
		if ((pValue === null) || (typeof (pValue) !== 'object'))
		{
			return pValue;
		}
		const tmpPrototype = Object.getPrototypeOf(pValue);
		if ((tmpPrototype !== Object.prototype) && (tmpPrototype !== null))
		{
			return pValue;
		}
		const tmpCopy = {};
		const tmpKeys = Object.keys(pValue);
		for (let i = 0; i < tmpKeys.length; i++)
		{
			tmpCopy[tmpKeys[i]] = this._cloneChartConfiguration(pValue[tmpKeys[i]]);
		}
		return tmpCopy;
	}

	/**
	 * 
	 * @param {Object} pInput - The PictForm input object
	 * @param {*} pChartConfiguration - The current configuration object for the form
	 * @param {*} pParsingConfiguration - The parsing configuration to apply
	 * @param {*} pInputParsingConfigurationScope - The input-specific parsing configuration string address for additional configuration
	 * @returns 
	 */
	applyInputParsingConfiguration(pInput, pChartConfiguration, pParsingConfiguration, pInputParsingConfigurationScope)
	{
		// TODO: There is a ton of DRY to be had in this function when we break it out to the base class
		let tmpInput = pInput;
		let tmpInputParsingConfigurationScope = pInputParsingConfigurationScope;

		let tmpChartConfiguration = pChartConfiguration;
		let tmpParsingConfiguration = pParsingConfiguration;

		if (typeof (pInput) !== 'object')
		{
			return false;
		}
		if (typeof (pInputParsingConfigurationScope) !== 'string' || (pInputParsingConfigurationScope.length < 1))
		{
			return false;
		}
		if (typeof (tmpParsingConfiguration) !== 'object')
		{
			return false;
		}

		if (typeof (tmpChartConfiguration) !== 'object')
		{
			tmpChartConfiguration = {};
		}

		// 1. Check if there is any custom configurtion for how to parse the config for this input (dynamic dynamic)
		let tmpInputCustomConfiguration = this.pict.manifest.getValueByHash(tmpInput, tmpInputParsingConfigurationScope);
		if (typeof (tmpInputCustomConfiguration) === 'object')
		{
			// Merge the custom configuration into the base configuration
			tmpParsingConfiguration = Object.assign({}, tmpParsingConfiguration, tmpInputCustomConfiguration);
		}

		let tmpExistingData;

		// 2. Enumerate through each step and apply them consistently
		for (let i = 0; i < tmpParsingConfiguration.Steps.length; i++)
		{
			let tmpCurrentStep = tmpParsingConfiguration.Steps[i];

			// Get existing data -- what the earlier steps left, so a merging step layers onto them
			if (!tmpParsingConfiguration.AddressInObject || (tmpParsingConfiguration.AddressInObject == ''))
			{
				tmpExistingData = tmpChartConfiguration;
			}
			else
			{
				tmpExistingData = this.pict.manifest.getValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject);
			}

			switch (tmpCurrentStep.Method)
			{
				case 'Initialize':
					// Do nothing, already initialized
					if (tmpParsingConfiguration.AddressInObject && (typeof (tmpParsingConfiguration.AddressInObject) === 'string') && (tmpParsingConfiguration.AddressInObject.length > 0))
					{
						let tmpCurrentStepData = this.pict.manifest.getValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject);
						// see if the address exists and if it's the type we expect
						if (tmpParsingConfiguration.ObjectType === 'array')
						{
							if (!tmpCurrentStepData || !Array.isArray(tmpCurrentStepData))
							{
								this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, []);
							}
						}
						else if (tmpParsingConfiguration.ObjectType === 'object')
						{
							if (!tmpCurrentStepData || (typeof (tmpCurrentStepData) !== 'object'))
							{
								this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, {});
							}
						}
						else
						{
							this.pict.log.warn(`Unsupported ObjectType ${tmpParsingConfiguration.ObjectType} parsing chart Initialize configuration for input ${tmpInput.Macro.RawHTMLID}`);
						}
					}
					break;
				case 'Raw':
					// Check if the Raw is in there
					let tmpRawDataExists = this.pict.manifest.checkAddressExists(tmpInput, tmpCurrentStep.InputProperty);
					if (!tmpRawDataExists)
					{
						break;
					}

					// Get the raw data from the input
					let tmpRawData = this._cloneChartConfiguration(this.pict.manifest.getValueByHash(tmpInput, tmpCurrentStep.InputProperty));
					let tmpRawDataType = typeof(tmpRawData);

					// We only support objects as configuration
					if (tmpRawDataType !== 'object')
					{
						break;
					}

					if (tmpParsingConfiguration.ObjectType === 'array')
					{
						if (Array.isArray(tmpRawData))
						{
							if (tmpCurrentStep.Merge)
							{
								// Get existing data
								if (!Array.isArray(tmpExistingData))
								{
									tmpExistingData = [];
								}
								// Merge in the arrays
								let tmpMergedData = tmpExistingData.concat(tmpRawData);
								this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpMergedData);
							}
							else
							{
								// Just set the value
								this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpRawData);
							}
						}
					}
					else if (tmpParsingConfiguration.ObjectType === 'object')
					{
						if (tmpCurrentStep.Merge)
						{
							if (!tmpParsingConfiguration.AddressInObject || (tmpParsingConfiguration.AddressInObject == ''))
							{
								// This is the "root" object, so we need to merge or set directly
								if (tmpCurrentStep.Merge)
								{
									tmpChartConfiguration = Object.assign(tmpChartConfiguration, tmpRawData);
								}
								else
								{
									tmpChartConfiguration = tmpRawData;
								}
							}
							else
							{
								if ((typeof(tmpExistingData) != 'object') || (tmpExistingData == null))
								{
									tmpExistingData = {};
								}
								if (tmpCurrentStep.Merge)
								{
									// Merge the objects
									let tmpMergedData = Object.assign(tmpExistingData, tmpRawData);
									this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpMergedData);
								}
								else
								{
									// Just set the value
									this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpRawData);
								}
							}
						}
						else
						{
							// Just set the value?
							this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpRawData);
						}
					}
					break;
				case 'Address':
					let tmpAddress = this.pict.manifest.getValueByHash(tmpInput, tmpCurrentStep.InputProperty);
					// Input is the Record in the resolution chain
					if (!tmpAddress)
					{
						break;
					}

					let tmpPotentialConfigurationObject = this._cloneChartConfiguration(this.pict.resolveStateFromAddress(tmpAddress, pInput));

					if (typeof (tmpPotentialConfigurationObject) !== 'object')
					{
						break;
					}

					if (tmpParsingConfiguration.ObjectType === 'array')
					{
						if (Array.isArray(tmpPotentialConfigurationObject))
						{
							if (tmpCurrentStep.Merge)
							{
								// Get existing data
								if (!Array.isArray(tmpExistingData))
								{
									tmpExistingData = [];
								}
								// Merge in the arrays
								let tmpMergedData = tmpExistingData.concat(tmpPotentialConfigurationObject);
								this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpMergedData);
							}
							else
							{
								// Just set the value
								this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpPotentialConfigurationObject);
							}
						}
					}
					else if (tmpParsingConfiguration.ObjectType === 'object')
					{
						if (tmpCurrentStep.Merge)
						{
							if (!tmpParsingConfiguration.AddressInObject || (tmpParsingConfiguration.AddressInObject == ''))
							{
								// This is the "root" object, so we need to merge or set directly
								if (tmpCurrentStep.Merge)
								{
									tmpChartConfiguration = Object.assign(tmpChartConfiguration, tmpPotentialConfigurationObject);
								}
								else
								{
									tmpChartConfiguration = tmpPotentialConfigurationObject;
								}
							}
							else
							{
								if ((typeof(tmpExistingData) != 'object') || (tmpExistingData == null))
								{
									tmpExistingData = {};
								}
								if (tmpCurrentStep.Merge)
								{
									// Merge the objects
									let tmpMergedData = Object.assign(tmpExistingData, tmpPotentialConfigurationObject);
									this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpMergedData);
								}
								else
								{
									// Just set the value
									this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpPotentialConfigurationObject);
								}
							}
						}
						else
						{
							// Just set the value?
							this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpPotentialConfigurationObject);
						}
					}
					break;
				case 'SingleSolver':
					let tmpSolverExpression = this.pict.manifest.getValueByHash(tmpInput, tmpCurrentStep.InputProperty);
					// Check that the expression is a string
					if (typeof (tmpSolverExpression) !== 'string')
					{
						break;
					}

					let tmpSolvedConfiguration = this.pict.providers.DynamicSolver.runSolver(tmpSolverExpression, true);

					if (tmpParsingConfiguration.ObjectType === 'array')
					{
						if (Array.isArray(tmpSolvedConfiguration))
						{
							if (tmpCurrentStep.Merge)
							{
								// Get existing data
								if (!Array.isArray(tmpExistingData))
								{
									tmpExistingData = [];
								}
								// Merge in the arrays
								let tmpMergedData = tmpExistingData.concat(tmpSolvedConfiguration);
								this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpMergedData);
							}
							else
							{
								// Just set the value
								this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpSolvedConfiguration);
							}
						}
					}
					else if (tmpParsingConfiguration.ObjectType === 'object')
					{
						if (tmpCurrentStep.Merge)
						{
							if (!tmpParsingConfiguration.AddressInObject || (tmpParsingConfiguration.AddressInObject == ''))
							{
								// This is the "root" object, so we need to merge or set directly
								if (tmpCurrentStep.Merge)
								{
									tmpChartConfiguration = Object.assign(tmpChartConfiguration, tmpSolvedConfiguration);
								}
								else
								{
									tmpChartConfiguration = tmpSolvedConfiguration;
								}
							}
							else
							{
								if ((typeof(tmpExistingData) != 'object') || (tmpExistingData == null))
								{
									tmpExistingData = {};
								}
								if (tmpCurrentStep.Merge)
								{
									// Merge the objects
									let tmpMergedData = Object.assign(tmpExistingData, tmpSolvedConfiguration);
									this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpMergedData);
								}
								else
								{
									// Just set the value
									this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpSolvedConfiguration);
								}
							}
						}
						else
						{
							// Just set the value?
							this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpSolvedConfiguration);
						}
					}
					break;

				case 'ArrayOfSolvers':
					let tmpSolverExpressionList = this.pict.manifest.getValueByHash(tmpInput, tmpCurrentStep.InputProperty);

					// Check that the expression is a string
					if (!Array.isArray(tmpSolverExpressionList))
					{
						break;
					}

					for (let i = 0; i < tmpSolverExpressionList.length; i++)
					{
						let tmpCurrentSolverExpression = tmpSolverExpressionList[i];
						if (typeof(tmpCurrentSolverExpression) !== 'object')
						{
							continue;
						}

						let tmpSolverLabel = tmpCurrentSolverExpression.Label;
						let tmpSolverExpression = tmpCurrentSolverExpression.DataSolver;
						let tmpSolvedDataSet = this.pict.providers.DynamicSolver.runSolver(tmpSolverExpression, true);

						let tmpDataObject = (
							{
								label: tmpSolverLabel,
								data: (Array.isArray(tmpSolvedDataSet)) ? tmpSolvedDataSet : []
							});

						if (tmpCurrentSolverExpression.ChartType)
						{
							tmpDataObject.type = tmpCurrentSolverExpression.ChartType;
						}

						// Add in any custom Y axis ID
						if (tmpCurrentSolverExpression.CustomYAxisID)
						{
							tmpDataObject.yAxisID = tmpCurrentSolverExpression.CustomYAxisID;
						}

						// Add in any custom X axis ID
						if (tmpCurrentSolverExpression.CustomXAxisID)
						{
							tmpDataObject.xAxisID = tmpCurrentSolverExpression.CustomXAxisID;
						}

						// Add in a custom Tension
						if ((tmpCurrentSolverExpression.Tension !== undefined) && (tmpCurrentSolverExpression.Tension !== null))
						{
							tmpDataObject.tension = tmpCurrentSolverExpression.Tension;
						}
						
						// Add in a custom pointRadius
						if ((tmpCurrentSolverExpression.PointRadius !== undefined) && (tmpCurrentSolverExpression.PointRadius !== null))
						{
							tmpDataObject.pointRadius = tmpCurrentSolverExpression.PointRadius;
						}

						// Check if this has a stack defined (for stacked bar charts and such)
						if (tmpCurrentSolverExpression.StackGroup)
						{
							tmpDataObject.stack = tmpCurrentSolverExpression.StackGroup;
						}

						// DatasetOptions is the general escape hatch: every key is merged onto
						// the Chart.js dataset as-is. Without it a dataset could only carry the
						// handful of properties named above, so a series could not be given a
						// colour, a dash pattern, or told not to join its points -- the config
						// was silently dropped and the chart drew in default colours. It is
						// applied last, so it wins over the named options above.
						if (tmpCurrentSolverExpression.DatasetOptions && (typeof(tmpCurrentSolverExpression.DatasetOptions) === 'object'))
						{
							Object.assign(tmpDataObject, tmpCurrentSolverExpression.DatasetOptions);
						}

						// Which legend group this series belongs to ("Data", "Limits", …).
						// Carried as a pict-prefixed key so it cannot collide with a Chart.js
						// dataset property.
						if (tmpCurrentSolverExpression.LegendGroup)
						{
							tmpDataObject.pictLegendGroup = tmpCurrentSolverExpression.LegendGroup;
						}

						if (typeof (tmpCurrentSolverExpression.ValueLabels) === 'boolean')
						{
							tmpDataObject.pictValueLabels = tmpCurrentSolverExpression.ValueLabels;
						}

						if (tmpParsingConfiguration.ObjectType === 'array')
						{
							if (Array.isArray(tmpSolvedDataSet))
							{
								if (tmpCurrentStep.Merge)
								{
									// Get existing data
									if (!Array.isArray(tmpExistingData))
									{
										tmpExistingData = [];
									}
									tmpExistingData.push(tmpDataObject);
									this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpExistingData);
								}
								else
								{
									this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, [tmpDataObject]);
								}
							}
						}
						else if (tmpParsingConfiguration.ObjectType === 'object')
						{
							if (tmpCurrentStep.Merge)
							{
								if (!tmpParsingConfiguration.AddressInObject || (tmpParsingConfiguration.AddressInObject == ''))
								{
									// This is the "root" object, so we need to merge or set directly
									if (tmpCurrentStep.Merge)
									{
										tmpChartConfiguration = Object.assign(tmpChartConfiguration, tmpSolvedDataSet);
									}
									else
									{
										tmpChartConfiguration = tmpSolvedDataSet;
									}
								}
								else
								{
									if ((typeof(tmpExistingData) != 'object') || (tmpExistingData == null))
									{
										tmpExistingData = {};
									}
									if (tmpCurrentStep.Merge)
									{
										// Merge the objects
										let tmpMergedData = Object.assign(tmpExistingData, tmpSolvedDataSet);
										this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpMergedData);
									}
									else
									{
										// Just set the value
										this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpSolvedDataSet);
									}
								}
							}
							else
							{
								// Just set the value?
								this.pict.manifest.setValueByHash(tmpChartConfiguration, tmpParsingConfiguration.AddressInObject, tmpSolvedDataSet);
							}
						}
					}
					break;
			}
		}
	}

	getInputChartConfiguration(pView, pInput, pValue)
	{
		let tmpView = pView;
		let tmpInput = pInput;
		let tmpValue = pValue;

		if (!('PictForm' in tmpInput))
		{
			return false;
		}

		let tmpPictform = pInput.PictForm;

		let tmpChartConfiguration = (typeof (tmpPictform.ChartJSOptionsCorePrototype) === 'object') ? this._cloneChartConfiguration(tmpPictform.ChartJSOptionsCorePrototype) : {};

		this.applyInputParsingConfiguration(pInput, tmpChartConfiguration, this.defaultCoreParsingConfiguration, 'PictForm.ChartConfigCoreParsingConfigurationOverride');
		if (!('type' in tmpChartConfiguration))
		{
			tmpChartConfiguration.type = (typeof (tmpPictform.ChartType) === 'string') ? tmpPictform.ChartType : 'bar';
		}
		this.applyInputParsingConfiguration(pInput, tmpChartConfiguration, this.defaultLabelParsingConfiguration, 'PictForm.ChartLabelsParsingConfigurationOverride');
		this.applyInputParsingConfiguration(pInput, tmpChartConfiguration, this.defaultDataParsingConfiguration, 'PictForm.ChartDataParsingConfigurationOverride');

		// A blank is a MISSING reading, not a zero one. Solver-built series routinely carry "" for
		// "this measure has no value here" -- a control limit the agency does not publish, a sample
		// the lab never ran -- and Chart.js coerces that empty string to 0, drawing a line that dives
		// to the axis and reads as a real measurement of zero. Chart.js's own convention for a gap is
		// null, so blanks are normalized to it and the series simply breaks. Set ChartPlotBlanksAsZero
		// to keep the old coercion for a chart that genuinely means zero.
		if (!tmpPictform.ChartPlotBlanksAsZero)
		{
			const tmpDatasets = tmpChartConfiguration?.data?.datasets;
			if (Array.isArray(tmpDatasets))
			{
				for (let i = 0; i < tmpDatasets.length; i++)
				{
					if (!tmpDatasets[i] || !Array.isArray(tmpDatasets[i].data)) { continue; }
					tmpDatasets[i].data = tmpDatasets[i].data.map(
						(pPoint) => ((pPoint === '') || (pPoint === null) || (typeof (pPoint) === 'undefined')) ? null : pPoint);
				}
			}
		}

		// ChartHeight is one knob with two halves: the template gives the canvas container a min-height,
		// and Chart.js has to be told to stop deriving its own height from the width or it will ignore
		// that box entirely. Requiring a caller to set maintainAspectRatio by hand alongside the height
		// would make a single intent ("make this chart taller") into two coupled settings that are wrong
		// in isolation, so it is derived here. An explicit maintainAspectRatio in the core prototype still
		// wins -- this only fills in the value the caller did not state.
		// The grouped legend replaces Chart.js's own, which is a single wrapped row
		// of identical swatches -- unreadable once a chart carries a reading, a
		// running average and three pairs of control limits.
		if (this.resolveChartLegendConfiguration(pInput))
		{
			if (typeof (tmpChartConfiguration.options) !== 'object' || tmpChartConfiguration.options === null)
			{
				tmpChartConfiguration.options = {};
			}
			if (typeof (tmpChartConfiguration.options.plugins) !== 'object' || tmpChartConfiguration.options.plugins === null)
			{
				tmpChartConfiguration.options.plugins = {};
			}
			tmpChartConfiguration.options.plugins.legend = Object.assign({}, tmpChartConfiguration.options.plugins.legend, { display: false });
		}

		const tmpValueLabelConfiguration = this.resolveChartValueLabelConfiguration(pInput);
		if (tmpValueLabelConfiguration)
		{
			if (!Array.isArray(tmpChartConfiguration.plugins))
			{
				tmpChartConfiguration.plugins = [];
			}
			tmpChartConfiguration.plugins.push(this.createChartValueLabelPlugin(tmpValueLabelConfiguration));
			// Room above the plot for the topmost point's label, so it does not have to flip below its point
			if ((tmpValueLabelConfiguration.Position === 'top') && (typeof (tmpChartConfiguration.options?.layout?.padding) === 'undefined'))
			{
				if (typeof (tmpChartConfiguration.options) !== 'object' || tmpChartConfiguration.options === null)
				{
					tmpChartConfiguration.options = {};
				}
				tmpChartConfiguration.options.layout = Object.assign({}, tmpChartConfiguration.options.layout,
					{ padding: { top: tmpValueLabelConfiguration.FontSize + tmpValueLabelConfiguration.Offset + (2 * tmpValueLabelConfiguration.Padding) } });
			}
		}

		const tmpChartHeight = parseFloat(tmpPictform.ChartHeight);
		if (isFinite(tmpChartHeight) && (tmpChartHeight > 0))
		{
			if (typeof (tmpChartConfiguration.options) !== 'object' || tmpChartConfiguration.options === null)
			{
				tmpChartConfiguration.options = {};
			}
			if (!('maintainAspectRatio' in tmpChartConfiguration.options))
			{
				tmpChartConfiguration.options.maintainAspectRatio = false;
			}
			if (!('responsive' in tmpChartConfiguration.options))
			{
				tmpChartConfiguration.options.responsive = true;
			}
		}

		return tmpChartConfiguration;
	}

	initializeChartVisualization(pView, pGroup, pRow, pInput, pValue, pHTMLSelector)
	{
		// Stuff the config into a hidden element for reference
		let tmpConfigStorageLocation = `#CONFIG-FOR-${pInput.Macro.RawHTMLID}`;
		let tmpChartConfiguration = this.getInputChartConfiguration(pView, pInput, pValue);
		this.pict.ContentAssignment.assignContent(tmpConfigStorageLocation, JSON.stringify(tmpChartConfiguration));

		let tmpChartCanvasElementSelector = `#CANVAS-FOR-${pInput.Macro.RawHTMLID}`;
		let tmpChartCanvasElement = this.pict.ContentAssignment.getElement(tmpChartCanvasElementSelector);
		if ((!Array.isArray(tmpChartCanvasElement)) || (tmpChartCanvasElement.length < 1))
		{
			this.log.warn(`Chart canvas element not found for input ${tmpChartCanvasElementSelector}`);
			return false;
		}
		tmpChartCanvasElement = tmpChartCanvasElement[0]

		// Check if there is a window.Chart which is the Chart.js library
		if (typeof (window.Chart) !== 'function')
		{
			this.log.warn(`Chart.js library not loaded for input ${tmpChartCanvasElementSelector}`);
		}
		else
		{
			// Chart.js writes its resolved defaults back into the options it is given
			const tmpManifestOptions = this._cloneChartConfiguration(tmpChartConfiguration.options || {});
			this.currentChartObjects[`Object-For-${pInput.Macro.RawHTMLID}`] = new window.Chart(tmpChartCanvasElement, tmpChartConfiguration);
			// TODO: Make this invalidation better.
			this.currentChartDataObjects[`Data-For-${pInput.Macro.RawHTMLID}`] = JSON.stringify(tmpChartConfiguration.data);
			this.refreshChartThemeColors(pInput, this.currentChartObjects[`Object-For-${pInput.Macro.RawHTMLID}`], tmpManifestOptions, true);

			const tmpLegendConfiguration = this.resolveChartLegendConfiguration(pInput);
			if (tmpLegendConfiguration)
			{
				this.renderChartLegend(pInput.Macro.RawHTMLID, this.currentChartObjects[`Object-For-${pInput.Macro.RawHTMLID}`], tmpLegendConfiguration);
			}
		}
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
		this.initializeChartVisualization(pView, pGroup, pRow, pInput, pValue, pHTMLSelector);
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
	 * @param {string} pTransactionGUID - The transaction GUID for the event dispatch.
	 * @returns {any} - The result of the super method.
	 */
	onDataChangeTabular(pView, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID)
	{
		return super.onDataChangeTabular(pView, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID);
	}

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
	onDataMarshalToForm(pView, pGroup, pRow, pInput, pValue, pHTMLSelector, pTransactionGUID)
	{
		if (!this.currentChartObjects[`Object-For-${pInput.Macro.RawHTMLID}`])
		{
			this.initializeChartVisualization(pView, pGroup, pRow, pInput, pValue, pHTMLSelector);
		}
		else
		{
			let tmpChartConfiguration = this.getInputChartConfiguration(pView, pInput, pValue);
			let tmpNewChartDataString = JSON.stringify(tmpChartConfiguration.data);
			if (this.currentChartDataObjects[`Data-For-${pInput.Macro.RawHTMLID}`] !== tmpNewChartDataString)
			{
				this.currentChartObjects[`Object-For-${pInput.Macro.RawHTMLID}`].data = tmpChartConfiguration.data;
				this.currentChartObjects[`Object-For-${pInput.Macro.RawHTMLID}`].update();
				const tmpUpdatedLegendConfiguration = this.resolveChartLegendConfiguration(pInput);
				if (tmpUpdatedLegendConfiguration)
				{
					this.renderChartLegend(pInput.Macro.RawHTMLID, this.currentChartObjects[`Object-For-${pInput.Macro.RawHTMLID}`], tmpUpdatedLegendConfiguration);
				}
				this.currentChartDataObjects[`Data-For-${pInput.Macro.RawHTMLID}`] = tmpNewChartDataString;
			}
			this.refreshChartThemeColors(pInput, this.currentChartObjects[`Object-For-${pInput.Macro.RawHTMLID}`], tmpChartConfiguration.options);
		}
		return super.onDataMarshalToForm(pView, pGroup, pRow, pInput, pValue, pHTMLSelector, pTransactionGUID);
	}

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
	onDataMarshalToFormTabular(pView, pGroup, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID)
	{
		return super.onDataMarshalToFormTabular(pView, pGroup, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID);
	}

	/**
	 * Handles the data request event for a select input in the PictProviderInputSelect class.
	 *
	 * @param {Object} pView - The view object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The value object.
	 * @param {string} pHTMLSelector - The HTML selector object.
	 * @returns {any} - The result of the onDataRequest method.
	 */
	onDataRequest(pView, pInput, pValue, pHTMLSelector)
	{
		return super.onDataRequest(pView, pInput, pValue, pHTMLSelector);
	}

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
	onDataRequestTabular(pView, pInput, pValue, pHTMLSelector, pRowIndex)
	{
		return super.onDataRequestTabular(pView, pInput, pValue, pHTMLSelector, pRowIndex);
	}
}

module.exports = CustomInputHandler;
