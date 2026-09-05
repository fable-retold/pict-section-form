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
