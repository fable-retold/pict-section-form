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
