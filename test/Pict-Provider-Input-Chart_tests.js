/*
	Unit tests for source/providers/inputs/Pict-Provider-Input-Chart.js

	Covers the two chart-shaping behaviours a dashboard depends on and that
	nothing else guards: how a blank data point is plotted, and how an
	explicit ChartHeight reaches Chart.js. Both were defects found on a live
	control chart -- blanks drew a line diving to zero (reading as a real
	measurement), and a taller canvas was simply not expressible.
*/

const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai   = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');

const libChartInput = require('../source/providers/inputs/Pict-Provider-Input-Chart.js');

/**
 * Build a chart input provider and drive getInputChartConfiguration() with a
 * pre-baked datasets prototype, which is the same shape the solver-driven
 * parsing steps deposit at data.datasets.
 *
 * @param {Object} pPictForm - The input's PictForm block.
 * @param {Array} pDatasets - Datasets to seed into the core prototype.
 * @return {Object} The resolved Chart.js configuration.
 */
function resolveChartConfiguration(pPictForm, pDatasets)
{
	const tmpPict = new libPict();
	const tmpProvider = new libChartInput(tmpPict, {});
	const tmpInput =
	{
		Name: 'ControlChart',
		Hash: 'ControlChart',
		DataType: 'Object',
		Macro: { RawHTMLID: 'ControlChart-input', InputFullProperties: '', InputChangeHandler: '', ControlAttr: '' },
		PictForm: Object.assign(
			{
				InputType: 'Chart',
				ChartType: 'line',
				ChartConfigCorePrototypeRaw: { data: { datasets: pDatasets || [] } },
			}, pPictForm || {}),
	};
	return tmpProvider.getInputChartConfiguration({ }, tmpInput, {});
}

suite('Pict-Provider-Input-Chart', () =>
{
	suite('blank data points', () =>
	{
		test('a blank reading becomes a null gap rather than plotting as zero', () =>
		{
			// The live case: an agency publishes no upper binder limit, so the band
			// column is "" on most samples. Coerced to 0 it drew a line along the
			// axis that looked like a real limit of zero.
			const tmpConfiguration = resolveChartConfiguration({}, [ { label: 'Band', data: [ '5.55', '', '5.75', '' ] } ]);
			Expect(tmpConfiguration.data.datasets[0].data).to.deep.equal([ '5.55', null, '5.75', null ]);
		});

		test('null and undefined points are normalized to null as well', () =>
		{
			const tmpConfiguration = resolveChartConfiguration({}, [ { label: 'Band', data: [ null, undefined, '3' ] } ]);
			Expect(tmpConfiguration.data.datasets[0].data).to.deep.equal([ null, null, '3' ]);
		});

		test('a real zero is left alone — it is a measurement, not a blank', () =>
		{
			const tmpConfiguration = resolveChartConfiguration({}, [ { label: 'QC', data: [ 0, '0', '0.0' ] } ]);
			Expect(tmpConfiguration.data.datasets[0].data).to.deep.equal([ 0, '0', '0.0' ]);
		});

		test('ChartPlotBlanksAsZero opts back into the old coercion', () =>
		{
			const tmpConfiguration = resolveChartConfiguration({ ChartPlotBlanksAsZero: true }, [ { label: 'Band', data: [ '5.55', '' ] } ]);
			Expect(tmpConfiguration.data.datasets[0].data).to.deep.equal([ '5.55', '' ]);
		});

		test('every dataset is normalized, not only the first', () =>
		{
			const tmpConfiguration = resolveChartConfiguration({},
				[ { label: 'A', data: [ '1', '' ] }, { label: 'B', data: [ '', '2' ] } ]);
			Expect(tmpConfiguration.data.datasets[0].data).to.deep.equal([ '1', null ]);
			Expect(tmpConfiguration.data.datasets[1].data).to.deep.equal([ null, '2' ]);
		});

		test('a dataset without a data array is left untouched', () =>
		{
			const tmpConfiguration = resolveChartConfiguration({}, [ { label: 'Empty' } ]);
			Expect(tmpConfiguration.data.datasets[0]).to.not.have.property('data');
		});
	});

	suite('ChartHeight', () =>
	{
		test('setting a height turns maintainAspectRatio off so the canvas fills its box', () =>
		{
			// Without this the container height the template emits is ignored --
			// Chart.js keeps deriving height from width and the chart stays squat.
			const tmpConfiguration = resolveChartConfiguration({ ChartHeight: 420 }, []);
			Expect(tmpConfiguration.options.maintainAspectRatio).to.equal(false);
			Expect(tmpConfiguration.options.responsive).to.equal(true);
		});

		test('an explicitly configured maintainAspectRatio still wins', () =>
		{
			const tmpConfiguration = resolveChartConfiguration(
				{
					ChartHeight: 420,
					ChartConfigCorePrototypeRaw: { data: { datasets: [] }, options: { maintainAspectRatio: true } },
				}, []);
			Expect(tmpConfiguration.options.maintainAspectRatio).to.equal(true);
		});

		test('no ChartHeight leaves the options block alone (unchanged default sizing)', () =>
		{
			const tmpConfiguration = resolveChartConfiguration({}, []);
			Expect(tmpConfiguration.options === undefined || !('maintainAspectRatio' in tmpConfiguration.options)).to.equal(true);
		});

		test('a zero or non-numeric height is ignored rather than half-applied', () =>
		{
			for (const tmpHeight of [ 0, -10, 'tall', null ])
			{
				const tmpConfiguration = resolveChartConfiguration({ ChartHeight: tmpHeight }, []);
				Expect(tmpConfiguration.options === undefined || !('maintainAspectRatio' in tmpConfiguration.options),
					`height ${JSON.stringify(tmpHeight)} should not apply`).to.equal(true);
			}
		});
	});

	suite('DatasetOptions', () =>
	{
		// The provider copies a fixed allowlist of properties onto each dataset
		// (ChartType / CustomYAxisID / CustomXAxisID / Tension / PointRadius /
		// StackGroup). Anything else was dropped, so a series could not be given a
		// colour or a dash pattern from configuration at all.
		const solverDataset = (pEntry) =>
		{
			const tmpPict = new libPict();
			const tmpProvider = new libChartInput(tmpPict, {});
			tmpPict.providers.DynamicSolver = { runSolver: () => [ 1, 2, 3 ] };
			const tmpInput =
			{
				Name: 'C', Hash: 'C', DataType: 'Object',
				Macro: { RawHTMLID: 'C-input', InputFullProperties: '', InputChangeHandler: '', ControlAttr: '' },
				PictForm: { InputType: 'Chart', ChartType: 'line', ChartDatasetsSolvers: [ pEntry ] },
			};
			const tmpConfiguration = tmpProvider.getInputChartConfiguration({ }, tmpInput, {});
			return tmpConfiguration.data.datasets[0];
		};

		test('arbitrary Chart.js dataset properties reach the dataset', () =>
		{
			const tmpDataset = solverDataset({ Label: 'Limit', DataSolver: 'x',
				DatasetOptions: { borderColor: '#E03131', borderDash: [ 2, 3 ], showLine: false } });
			Expect(tmpDataset.borderColor).to.equal('#E03131');
			Expect(tmpDataset.borderDash).to.deep.equal([ 2, 3 ]);
			Expect(tmpDataset.showLine).to.equal(false);
		});

		test('label and data still come from Label / DataSolver', () =>
		{
			const tmpDataset = solverDataset({ Label: 'Limit', DataSolver: 'x', DatasetOptions: { borderColor: '#000' } });
			Expect(tmpDataset.label).to.equal('Limit');
			Expect(tmpDataset.data).to.deep.equal([ 1, 2, 3 ]);
		});

		test('it wins over the named options, being applied last', () =>
		{
			const tmpDataset = solverDataset({ Label: 'L', DataSolver: 'x', PointRadius: 9, DatasetOptions: { pointRadius: 2 } });
			Expect(tmpDataset.pointRadius).to.equal(2);
		});

		test('a dataset without DatasetOptions is unchanged', () =>
		{
			const tmpDataset = solverDataset({ Label: 'L', DataSolver: 'x' });
			Expect(tmpDataset).to.not.have.property('borderColor');
			Expect(Object.keys(tmpDataset)).to.deep.equal([ 'label', 'data' ]);
		});

		test('a non-object DatasetOptions is ignored rather than throwing', () =>
		{
			for (const tmpBad of [ 'nope', 42, null ])
			{
				const tmpDataset = solverDataset({ Label: 'L', DataSolver: 'x', DatasetOptions: tmpBad });
				Expect(tmpDataset.label, `DatasetOptions ${JSON.stringify(tmpBad)}`).to.equal('L');
			}
		});
	});

	suite('parsing steps', () =>
	{
		const buildChart = (pPictForm) =>
		{
			const tmpPict = new libPict();
			const tmpProvider = new libChartInput(tmpPict, {});
			tmpPict.providers.DynamicSolver = { runSolver: () => [ 1, 2, 3 ] };
			const tmpInput =
			{
				Name: 'C', Hash: 'C', DataType: 'Object',
				Macro: { RawHTMLID: 'C-input', InputFullProperties: '', InputChangeHandler: '', ControlAttr: '' },
				PictForm: Object.assign({ InputType: 'Chart', ChartType: 'line' }, pPictForm),
			};
			return { Pict: tmpPict, Provider: tmpProvider, Input: tmpInput, resolve: () => tmpProvider.getInputChartConfiguration({ }, tmpInput, {}) };
		};

		test('ChartLabelsAddress reads the labels from application state', () =>
		{
			const tmpChart = buildChart({ ChartLabelsAddress: 'AppData.Shelf.Labels' });
			tmpChart.Pict.AppData.Shelf = { Labels: [ 'Fiction', 'Poetry' ] };
			Expect(tmpChart.resolve().data.labels).to.deep.equal([ 'Fiction', 'Poetry' ]);
		});

		test('ChartDatasetsAddress reads the datasets from application state', () =>
		{
			const tmpChart = buildChart({ ChartDatasetsAddress: 'AppData.Shelf.Datasets' });
			tmpChart.Pict.AppData.Shelf = { Datasets: [ { label: 'Copies', data: [ 4, 7 ] } ] };
			Expect(tmpChart.resolve().data.datasets).to.deep.equal([ { label: 'Copies', data: [ 4, 7 ] } ]);
		});

		test('ChartConfigCorePrototypeAddress merges a core configuration from application state', () =>
		{
			const tmpChart = buildChart({ ChartConfigCorePrototypeAddress: 'AppData.Shelf.Core' });
			tmpChart.Pict.AppData.Shelf = { Core: { type: 'radar', options: { animation: false } } };
			const tmpConfiguration = tmpChart.resolve();
			Expect(tmpConfiguration.type).to.equal('radar');
			Expect(tmpConfiguration.options.animation).to.equal(false);
		});

		test('solver datasets are added after the Raw datasets rather than replacing them', () =>
		{
			const tmpChart = buildChart(
				{
					ChartDatasetsRaw: [ { label: 'Target', data: [ 5, 5, 5 ] } ],
					ChartDatasetsSolvers: [ { Label: 'Sold', DataSolver: 'x' } ],
				});
			Expect(tmpChart.resolve().data.datasets.map((pDataset) => pDataset.label)).to.deep.equal([ 'Target', 'Sold' ]);
		});

		test('solver datasets are added after the Address datasets rather than replacing them', () =>
		{
			const tmpChart = buildChart(
				{
					ChartDatasetsAddress: 'AppData.Shelf.Datasets',
					ChartDatasetsSolvers: [ { Label: 'Sold', DataSolver: 'x' } ],
				});
			tmpChart.Pict.AppData.Shelf = { Datasets: [ { label: 'Target', data: [ 5, 5, 5 ] } ] };
			Expect(tmpChart.resolve().data.datasets.map((pDataset) => pDataset.label)).to.deep.equal([ 'Target', 'Sold' ]);
		});

		test('resolving again does not pile datasets onto ChartJSOptionsCorePrototype', () =>
		{
			// Every data refresh resolves the configuration again; the solver
			// datasets were pushed onto the manifest's own object each time.
			const tmpChart = buildChart(
				{
					ChartJSOptionsCorePrototype: { type: 'bar' },
					ChartDatasetsSolvers: [ { Label: 'Sold', DataSolver: 'x' } ],
				});
			tmpChart.resolve();
			tmpChart.resolve();
			Expect(tmpChart.resolve().data.datasets.length).to.equal(1);
			Expect(tmpChart.Input.PictForm.ChartJSOptionsCorePrototype).to.deep.equal({ type: 'bar' });
		});

		test('resolving again does not pile datasets onto ChartConfigCorePrototypeRaw', () =>
		{
			const tmpChart = buildChart(
				{
					ChartConfigCorePrototypeRaw: { data: { datasets: [ { label: 'Target', data: [ 5 ] } ] } },
					ChartDatasetsSolvers: [ { Label: 'Sold', DataSolver: 'x' } ],
				});
			tmpChart.resolve();
			tmpChart.resolve();
			Expect(tmpChart.resolve().data.datasets.map((pDataset) => pDataset.label)).to.deep.equal([ 'Target', 'Sold' ]);
			Expect(tmpChart.Input.PictForm.ChartConfigCorePrototypeRaw).to.deep.equal({ data: { datasets: [ { label: 'Target', data: [ 5 ] } ] } });
		});

		test('Raw and Address sources are left unmodified by the solver step', () =>
		{
			const tmpRawChart = buildChart(
				{
					ChartDatasetsRaw: [ { label: 'Target', data: [ 5, '' ] } ],
					ChartDatasetsSolvers: [ { Label: 'Sold', DataSolver: 'x' } ],
				});
			tmpRawChart.resolve();
			Expect(tmpRawChart.Input.PictForm.ChartDatasetsRaw).to.deep.equal([ { label: 'Target', data: [ 5, '' ] } ]);

			const tmpAddressChart = buildChart(
				{
					ChartDatasetsAddress: 'AppData.Shelf.Datasets',
					ChartDatasetsSolvers: [ { Label: 'Sold', DataSolver: 'x' } ],
				});
			tmpAddressChart.Pict.AppData.Shelf = { Datasets: [ { label: 'Target', data: [ 5 ] } ] };
			tmpAddressChart.resolve();
			Expect(tmpAddressChart.Pict.AppData.Shelf.Datasets).to.deep.equal([ { label: 'Target', data: [ 5 ] } ]);
		});

		test('function-valued options in a prototype are kept, not dropped by the copy', () =>
		{
			const fLabel = () => 'label';
			const tmpChart = buildChart({ ChartJSOptionsCorePrototype: { options: { plugins: { tooltip: { callbacks: { label: fLabel } } } } } });
			Expect(tmpChart.resolve().options.plugins.tooltip.callbacks.label).to.equal(fLabel);
		});

		test('a parsing configuration override applies to its own input only', () =>
		{
			const tmpPict = new libPict();
			const tmpProvider = new libChartInput(tmpPict, {});
			const tmpInput = (pHash, pPictForm) => (
				{
					Name: pHash, Hash: pHash, DataType: 'Object',
					Macro: { RawHTMLID: `${pHash}-input`, InputFullProperties: '', InputChangeHandler: '', ControlAttr: '' },
					PictForm: Object.assign({ InputType: 'Chart', ChartType: 'line' }, pPictForm),
				});
			tmpProvider.getInputChartConfiguration({ }, tmpInput('First',
				{
					ChartLabelsRaw: [ 'a' ],
					ChartLabelsParsingConfigurationOverride: { AddressInObject: 'data.xLabels' },
				}), {});
			const tmpSecond = tmpProvider.getInputChartConfiguration({ }, tmpInput('Second', { ChartLabelsRaw: [ 'b' ] }), {});
			Expect(tmpSecond.data.labels).to.deep.equal([ 'b' ]);
			Expect(tmpSecond.data).to.not.have.property('xLabels');
			Expect(tmpProvider.defaultLabelParsingConfiguration.AddressInObject).to.equal('data.labels');
		});

		test('a Tension or PointRadius of 0 reaches the dataset', () =>
		{
			const tmpChart = buildChart({ ChartDatasetsSolvers: [ { Label: 'Sold', DataSolver: 'x', Tension: 0, PointRadius: 0 } ] });
			const tmpDataset = tmpChart.resolve().data.datasets[0];
			Expect(tmpDataset.tension).to.equal(0);
			Expect(tmpDataset.pointRadius).to.equal(0);
		});
	});

	suite('theme colours', () =>
	{
		// The jsdom used here computes neither inherited colours nor custom
		// properties, so the computed style a browser would report is stubbed.
		const stubComputedStyle = (pValues) =>
		{
			const fOriginal = window.getComputedStyle;
			window.getComputedStyle = () => (
				{
					color: pValues.color || '',
					getPropertyValue: (pName) => pValues[pName] || '',
				});
			return () => { window.getComputedStyle = fOriginal; };
		};

		const addCanvas = (pRawHTMLID) =>
		{
			const tmpCanvas = document.createElement('canvas');
			tmpCanvas.id = `CANVAS-FOR-${pRawHTMLID}`;
			document.body.appendChild(tmpCanvas);
			return tmpCanvas;
		};

		const fakeChart = (pScales) => (
			{
				options: {},
				scales: pScales || { x: { options: {} }, y: { options: {} } },
				updates: 0,
				update() { this.updates++; },
			});

		test('the text colour is the canvas\'s inherited CSS color, and the grid is that colour faded', () =>
		{
			const tmpProvider = new libChartInput(new libPict(), {});
			addCanvas('ThemeRead-input');
			const fRestore = stubComputedStyle({ color: 'rgb(230, 231, 232)' });
			try
			{
				Expect(tmpProvider.resolveChartThemeColors({ Macro: { RawHTMLID: 'ThemeRead-input' } }))
					.to.deep.equal({ Text: 'rgb(230, 231, 232)', Grid: 'rgba(230, 231, 232, 0.15)' });
			}
			finally
			{
				fRestore();
			}
		});

		test('--pict-chart-text-color and --pict-chart-grid-color win over the inherited colour', () =>
		{
			const tmpProvider = new libChartInput(new libPict(), {});
			addCanvas('ThemeVariables-input');
			const fRestore = stubComputedStyle({ 'color': 'rgb(0, 0, 0)', '--pict-chart-text-color': ' #eeeeee', '--pict-chart-grid-color': '#333333 ' });
			try
			{
				Expect(tmpProvider.resolveChartThemeColors({ Macro: { RawHTMLID: 'ThemeVariables-input' } }))
					.to.deep.equal({ Text: '#eeeeee', Grid: '#333333' });
			}
			finally
			{
				fRestore();
			}
		});

		test('a text colour that is not rgb() still themes the text and leaves the grid to Chart.js', () =>
		{
			const tmpProvider = new libChartInput(new libPict(), {});
			addCanvas('ThemeNotation-input');
			const fRestore = stubComputedStyle({ color: 'oklch(0.9 0 0)' });
			try
			{
				Expect(tmpProvider.resolveChartThemeColors({ Macro: { RawHTMLID: 'ThemeNotation-input' } }))
					.to.deep.equal({ Text: 'oklch(0.9 0 0)', Grid: null });
			}
			finally
			{
				fRestore();
			}
		});

		test('an input with no rendered canvas resolves to no colours', () =>
		{
			const tmpProvider = new libChartInput(new libPict(), {});
			Expect(tmpProvider.resolveChartThemeColors({ Macro: { RawHTMLID: 'NeverRendered-input' } })).to.equal(null);
		});

		test('every scale the chart drew is coloured, along with the chart, title and subtitle text', () =>
		{
			const tmpProvider = new libChartInput(new libPict(), {});
			const tmpChart = fakeChart();
			const tmpChanged = tmpProvider.applyChartThemeColors(tmpChart, {}, { Text: '#eee', Grid: 'rgba(238, 238, 238, 0.15)' });
			Expect(tmpChanged).to.equal(true);
			Expect(tmpChart.updates).to.equal(1);
			Expect(tmpChart.options.color).to.equal('#eee');
			Expect(tmpChart.options.plugins.title.color).to.equal('#eee');
			Expect(tmpChart.options.plugins.subtitle.color).to.equal('#eee');
			for (const tmpID of [ 'x', 'y' ])
			{
				Expect(tmpChart.options.scales[tmpID].ticks.color, tmpID).to.equal('#eee');
				Expect(tmpChart.options.scales[tmpID].title.color, tmpID).to.equal('#eee');
				Expect(tmpChart.options.scales[tmpID].grid.color, tmpID).to.equal('rgba(238, 238, 238, 0.15)');
				Expect(tmpChart.options.scales[tmpID].border.color, tmpID).to.equal('rgba(238, 238, 238, 0.15)');
			}
			Expect(tmpChart.options.scales.x).to.not.have.property('pointLabels');
		});

		test('an explicit colour in the manifest wins over the theme', () =>
		{
			const tmpProvider = new libChartInput(new libPict(), {});
			const tmpChart = fakeChart();
			tmpChart.options = { scales: { y: { ticks: { color: 'green' } } }, plugins: { title: { color: 'purple' } } };
			tmpProvider.applyChartThemeColors(tmpChart,
				{ scales: { y: { ticks: { color: 'green' } } }, plugins: { title: { color: 'purple' } } },
				{ Text: '#eee', Grid: null });
			Expect(tmpChart.options.scales.y.ticks.color).to.equal('green');
			Expect(tmpChart.options.plugins.title.color).to.equal('purple');
			Expect(tmpChart.options.scales.x.ticks.color).to.equal('#eee');
			Expect(tmpChart.options.scales.x).to.not.have.property('grid');
		});

		test('a radial scale also gets point labels, angle lines and a transparent tick backdrop', () =>
		{
			const tmpProvider = new libChartInput(new libPict(), {});
			const tmpChart = fakeChart({ r: { options: { pointLabels: {} } } });
			tmpProvider.applyChartThemeColors(tmpChart, {}, { Text: '#eee', Grid: '#444' });
			Expect(tmpChart.options.scales.r.pointLabels.color).to.equal('#eee');
			Expect(tmpChart.options.scales.r.angleLines.color).to.equal('#444');
			Expect(tmpChart.options.scales.r.ticks.backdropColor).to.equal('transparent');
		});

		test('applying the same colours again changes nothing and does not redraw', () =>
		{
			const tmpProvider = new libChartInput(new libPict(), {});
			const tmpChart = fakeChart();
			const tmpColors = { Text: '#eee', Grid: '#444' };
			tmpProvider.applyChartThemeColors(tmpChart, {}, tmpColors);
			Expect(tmpProvider.applyChartThemeColors(tmpChart, {}, tmpColors)).to.equal(false);
			Expect(tmpChart.updates).to.equal(1);
		});

		test('a theme change reaches a drawn chart on its next marshal, even when its data has not changed', () =>
		{
			const tmpPict = new libPict();
			const tmpProvider = new libChartInput(tmpPict, {});
			tmpPict.providers.DynamicSolver = { runSolver: () => [ 1, 2, 3 ] };
			const tmpInput =
			{
				Name: 'Themed', Hash: 'Themed', DataType: 'Object',
				Macro: { RawHTMLID: 'Themed-input', InputFullProperties: '', InputChangeHandler: '', ControlAttr: '' },
				PictForm: { InputType: 'Chart', ChartType: 'line', ChartDatasetsSolvers: [ { Label: 'Sold', DataSolver: 'x' } ] },
			};
			addCanvas('Themed-input');
			const tmpChart = fakeChart();
			tmpProvider.currentChartObjects['Object-For-Themed-input'] = tmpChart;
			tmpProvider.currentChartDataObjects['Data-For-Themed-input'] = JSON.stringify(tmpProvider.getInputChartConfiguration({ }, tmpInput, {}).data);

			let fRestore = stubComputedStyle({ color: 'rgb(20, 20, 20)' });
			try
			{
				tmpProvider.onDataMarshalToForm({ }, { }, { }, tmpInput, null, '', 'T1');
				Expect(tmpChart.options.scales.x.ticks.color).to.equal('rgb(20, 20, 20)');
			}
			finally
			{
				fRestore();
			}

			fRestore = stubComputedStyle({ color: 'rgb(240, 240, 240)' });
			try
			{
				tmpProvider.onDataMarshalToForm({ }, { }, { }, tmpInput, null, '', 'T2');
				Expect(tmpChart.options.scales.x.ticks.color).to.equal('rgb(240, 240, 240)');
				Expect(tmpChart.options.scales.x.grid.color).to.equal('rgba(240, 240, 240, 0.15)');
				const tmpUpdates = tmpChart.updates;
				tmpProvider.onDataMarshalToForm({ }, { }, { }, tmpInput, null, '', 'T3');
				Expect(tmpChart.updates, 'no redraw when nothing changed').to.equal(tmpUpdates);
				Expect(tmpChart.data, 'data left alone').to.equal(undefined);
			}
			finally
			{
				fRestore();
			}
		});
	});

	suite('grouped legend', () =>
	{
		const provider = () => new libChartInput(new libPict(), {});

		test('ChartLegend is off unless configured, leaving Chart.js\'s own legend alone', () =>
		{
			const tmpProvider = provider();
			Expect(tmpProvider.resolveChartLegendConfiguration({ PictForm: {} })).to.equal(null);
			Expect(tmpProvider.resolveChartLegendConfiguration({ PictForm: { ChartLegend: { Enabled: false } } })).to.equal(null);
		});

		test('ChartLegend: true is shorthand for a right-hand legend', () =>
		{
			Expect(provider().resolveChartLegendConfiguration({ PictForm: { ChartLegend: true } })).to.deep.equal({ Position: 'right' });
		});

		test('configuring it disables the built-in legend', () =>
		{
			const tmpPict = new libPict();
			const tmpProvider = new libChartInput(tmpPict, {});
			tmpPict.providers.DynamicSolver = { runSolver: () => [ 1, 2 ] };
			const tmpConfiguration = tmpProvider.getInputChartConfiguration({ }, {
				Name: 'C', Hash: 'C', DataType: 'Object',
				Macro: { RawHTMLID: 'C', InputFullProperties: '', InputChangeHandler: '', ControlAttr: '' },
				PictForm: { InputType: 'Chart', ChartType: 'line', ChartLegend: true, ChartDatasetsSolvers: [ { Label: 'A', DataSolver: 'x' } ] },
			}, {});
			Expect(tmpConfiguration.options.plugins.legend.display).to.equal(false);
		});

		test('LegendGroup lands on the dataset as pictLegendGroup', () =>
		{
			const tmpPict = new libPict();
			const tmpProvider = new libChartInput(tmpPict, {});
			tmpPict.providers.DynamicSolver = { runSolver: () => [ 1 ] };
			const tmpConfiguration = tmpProvider.getInputChartConfiguration({ }, {
				Name: 'C', Hash: 'C', DataType: 'Object',
				Macro: { RawHTMLID: 'C', InputFullProperties: '', InputChangeHandler: '', ControlAttr: '' },
				PictForm: { InputType: 'Chart', ChartType: 'line', ChartDatasetsSolvers: [
					{ Label: 'Reading', DataSolver: 'x' },
					{ Label: 'Limit', DataSolver: 'y', LegendGroup: 'Limits' } ] },
			}, {});
			Expect(tmpConfiguration.data.datasets[0].pictLegendGroup).to.equal(undefined);
			Expect(tmpConfiguration.data.datasets[1].pictLegendGroup).to.equal('Limits');
		});

		test('datasets group by LegendGroup, ungrouped ones falling under Data, in configuration order', () =>
		{
			const tmpChart = { data: { datasets: [
				{ label: 'Reading' },
				{ label: 'Upper', pictLegendGroup: 'Limits' },
				{ label: 'Average' },
				{ label: 'Lower', pictLegendGroup: 'Limits' } ] } };
			const tmpGroups = provider()._legendGroups(tmpChart);
			Expect(tmpGroups.map((pGroup) => pGroup.Key)).to.deep.equal([ 'Data', 'Limits' ]);
			Expect(tmpGroups[0].Items.map((pItem) => pItem.Index)).to.deep.equal([ 0, 2 ]);
			Expect(tmpGroups[1].Items.map((pItem) => pItem.Index)).to.deep.equal([ 1, 3 ]);
		});

		test('the swatch distinguishes solid, dashed, dotted and marker-only series', () =>
		{
			const tmpProvider = provider();
			Expect(tmpProvider._legendSwatchClass({}), 'solid').to.equal('');
			Expect(tmpProvider._legendSwatchClass({ borderDash: [ 6, 4 ] }), 'dashed').to.equal('pict-swatch-dashed');
			Expect(tmpProvider._legendSwatchClass({ borderDash: [ 2, 3 ] }), 'dotted').to.equal('pict-swatch-dotted');
			Expect(tmpProvider._legendSwatchClass({ showLine: false }), 'markers').to.equal('pict-swatch-markers');
		});

		test('a marker-only series wins over its dash pattern', () =>
		{
			Expect(provider()._legendSwatchClass({ showLine: false, borderDash: [ 6, 4 ] })).to.equal('pict-swatch-markers');
		});

		test('legend state is per input, so one chart\'s toggles do not move another\'s', () =>
		{
			const tmpProvider = provider();
			tmpProvider.currentChartLegendState['ChartA'] = { Hidden: true, Collapsed: { Limits: true } };
			tmpProvider.currentChartLegendState['ChartB'] = { Hidden: false, Collapsed: {} };
			Expect(tmpProvider.currentChartLegendState['ChartA'].Hidden).to.equal(true);
			Expect(tmpProvider.currentChartLegendState['ChartB'].Hidden).to.equal(false);
		});
	});

	suite('legend re-entrancy', () =>
	{
		// renderChartLegend runs again on every data refresh and on every toggle.
		// It must reuse the wrapper it already built. It did not: after the first
		// wrap the container's parent is the canvas AREA rather than the shell, so
		// the guard never matched and each call nested another shell — 14 shells and
		// 14 legends for 3 charts in the browser.
		const buildChart = () =>
		{
			const tmpCanvas = document.createElement('canvas');
			const tmpContainer = document.createElement('div');
			tmpContainer.appendChild(tmpCanvas);
			document.body.appendChild(tmpContainer);
			return {
				canvas: tmpCanvas,
				data: { datasets: [ { label: 'Reading' }, { label: 'Limit', pictLegendGroup: 'Limits' } ] },
				getDatasetMeta: () => ({ hidden: false }),
				update: () => {},
			};
		};

		test('re-rendering reuses the shell instead of nesting another', () =>
		{
			const tmpProvider = new libChartInput(new libPict(), {});
			const tmpChart = buildChart();
			for (let i = 0; i < 5; i++)
			{
				tmpProvider.renderChartLegend('ReentrantChart', tmpChart, { Position: 'right' });
			}
			Expect(document.querySelectorAll('.pict-chart-shell').length, 'shells').to.equal(1);
			Expect(document.querySelectorAll('.pict-chart-legend').length, 'legend panels').to.equal(1);
			Expect(document.querySelectorAll('.pict-chart-shell .pict-chart-shell').length, 'nested shells').to.equal(0);
			// Two datasets in two groups → two items, not ten.
			Expect(document.querySelectorAll('.pict-chart-legend-item').length, 'items').to.equal(2);
			Expect(tmpChart.canvas.closest('.pict-chart-canvas-area'), 'canvas still inside the area').to.be.ok;
		});

		test('the canvas is never detached from the document by a re-render', () =>
		{
			const tmpProvider = new libChartInput(new libPict(), {});
			const tmpChart = buildChart();
			tmpProvider.renderChartLegend('AttachedChart', tmpChart, { Position: 'right' });
			tmpProvider.renderChartLegend('AttachedChart', tmpChart, { Position: 'right' });
			Expect(document.body.contains(tmpChart.canvas)).to.equal(true);
		});
	});

	suite('template', () =>
	{
		test('the chart canvas container carries the ChartHeight min-height', () =>
		{
			const tmpDefaults = require('../source/providers/dynamictemplates/Pict-DynamicTemplates-DefaultFormTemplates.js');
			const tmpChartTemplate = tmpDefaults.Templates.find((pTemplate) => pTemplate.HashPostfix === '-Template-Input-InputType-Chart');
			Expect(tmpChartTemplate).to.be.an('object');
			// Defaults to 0, which is a no-op min-height for every chart that never sets it.
			Expect(tmpChartTemplate.Template).to.contain('min-height:{~DWAF:Record.PictForm.ChartHeight:0~}px');
		});
	});
});
