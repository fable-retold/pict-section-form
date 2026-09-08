/*
	Unit tests for source/providers/inputs/Pict-Provider-Input-PreciseNumber.js

	The case that mattered: a blank value in a formatted numeric column. A running
	average is legitimately empty until its trailing window fills, so a dashboard
	table has blanks in the same column as real numbers. Formatting those produced
	"NaN" in the rendered cell (roundValue returned null) and "0.00" from
	undefined — both of which read as measurements that were never taken.
*/

const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai   = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');
const libPreciseNumber = require('../source/providers/inputs/Pict-Provider-Input-PreciseNumber.js');

/**
 * @param {object} [pPictForm] - The input's PictForm block.
 * @return {{ provider: object, input: object }}
 */
function build(pPictForm)
{
	const tmpPict = new libPict();
	const tmpProvider = new libPreciseNumber(tmpPict, {});
	return { provider: tmpProvider, input: { Hash: 'Measure', PictForm: Object.assign({ DecimalPrecision: 2 }, pPictForm || {}) } };
}

suite('Pict-Provider-Input-PreciseNumber', () =>
{
	suite('blank values', () =>
	{
		test('an empty string renders blank, not NaN', () =>
		{
			const { provider, input } = build();
			Expect(provider.roundValue(input, '')).to.equal('');
		});

		test('null renders blank', () =>
		{
			const { provider, input } = build();
			Expect(provider.roundValue(input, null)).to.equal('');
		});

		test('undefined renders blank, not 0.00', () =>
		{
			const { provider, input } = build();
			Expect(provider.roundValue(input, undefined)).to.equal('');
		});

		test('whitespace renders blank', () =>
		{
			const { provider, input } = build();
			Expect(provider.roundValue(input, '   ')).to.equal('');
		});

		test('a blank is blank even with a prefix/postfix configured — no bare "%" in an empty cell', () =>
		{
			const { provider, input } = build({ DigitsPostfix: '%', DigitsPrefix: '$' });
			Expect(provider.roundValue(input, '')).to.equal('');
		});
	});

	suite('real values still format', () =>
	{
		test('zero-fills to the configured precision', () =>
		{
			const { provider, input } = build({ DecimalPrecision: 2 });
			Expect(provider.roundValue(input, '5.5')).to.equal('5.50');
		});

		test('a value at full solver precision is rounded down to the column width', () =>
		{
			const { provider, input } = build({ DecimalPrecision: 5 });
			Expect(provider.roundValue(input, '2.47770392749244712991')).to.equal('2.47770');
		});

		test('a real zero still renders as a number', () =>
		{
			const { provider, input } = build({ DecimalPrecision: 2 });
			Expect(provider.roundValue(input, 0)).to.equal('0.00');
			Expect(provider.roundValue(input, '0')).to.equal('0.00');
		});

		test('postfix is still applied to a real value', () =>
		{
			const { provider, input } = build({ DecimalPrecision: 1, DigitsPostfix: '%' });
			Expect(provider.roundValue(input, '2.91')).to.equal('2.9%');
		});
	});
});
