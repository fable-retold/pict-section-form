/*
	Unit tests for the Record layout's row width math: PictForm.Width / WidthOffset quantized to
	QuantizedWidth / QuantizedWidthOffset, and inputs excluded from row width by a registered check.
	Exercised against a stub `this` so we don't need to mount a full form.
*/

const Chai   = require('chai');
const Expect = Chai.expect;

const libRecordLayout = require('../source/providers/layouts/Pict-Layout-Record.js');

function buildLayout()
{
	const tmpLayout = Object.create(libRecordLayout.prototype);
	tmpLayout.layoutExcludedInputChecks = [];
	tmpLayout.pict =
	{
		PictApplication: { options: {} },
		providers:
		{
			MetatemplateGenerator:
			{
				getMetatemplateTemplateReference: () => '',
				getInputMetatemplateTemplateReference: () => ''
			}
		}
	};
	return tmpLayout;
}

function buildGroup(pInputs, pWidthQuantization)
{
	const tmpGroup = { GroupIndex: 0, Rows: [ { Hash: 'Row_1', RowNumber: 1, Inputs: pInputs } ] };
	if (pWidthQuantization)
	{
		tmpGroup.WidthQuantization = pWidthQuantization;
	}
	return tmpGroup;
}

function input(pHash, pPictForm)
{
	return { Hash: pHash, DataType: 'String', PictForm: Object.assign({}, pPictForm) };
}

function widths(pGroup)
{
	return pGroup.Rows[0].Inputs.map((pInput) => [ pInput.PictForm.QuantizedWidth, pInput.PictForm.QuantizedWidthOffset ]);
}

suite('Record layout row widths', () =>
{
	test('widths without offsets quantize as before (default 95)', () =>
	{
		const tmpGroup = buildGroup([ input('A', { Width: 1 }), input('B', { Width: 3 }) ]);
		buildLayout().generateGroupLayoutTemplate({}, tmpGroup);
		Expect(widths(tmpGroup)).to.deep.equal([ [ 24, 0 ], [ 71, 0 ] ]);
	});

	test('offsets count toward the row total and quantize to QuantizedWidthOffset', () =>
	{
		const tmpGroup = buildGroup([ input('A', { Width: 2, WidthOffset: 1 }), input('B', { Width: 3 }) ], 100);
		buildLayout().generateGroupLayoutTemplate({}, tmpGroup);
		Expect(widths(tmpGroup)).to.deep.equal([ [ 33, 17 ], [ 50, 0 ] ]);
	});

	test('a row authored to 12 with offsets keeps its proportions', () =>
	{
		const tmpGroup = buildGroup([ input('A', { Width: 3, WidthOffset: 3 }), input('B', { Width: '6' }) ], 100);
		buildLayout().generateGroupLayoutTemplate({}, tmpGroup);
		Expect(widths(tmpGroup)).to.deep.equal([ [ 25, 25 ], [ 50, 0 ] ]);
	});

	test('zero, missing and unparseable widths count as 1; bad offsets count as 0', () =>
	{
		const tmpGroup = buildGroup([ input('A', { Width: 0 }), input('B', {}), input('C', { Width: 'wide', WidthOffset: 'x' }), input('D', { Width: 1 }) ], 100);
		buildLayout().generateGroupLayoutTemplate({}, tmpGroup);
		Expect(widths(tmpGroup)).to.deep.equal([ [ 25, 0 ], [ 25, 0 ], [ 25, 0 ], [ 25, 0 ] ]);
	});

	test('an input excluded by a registered check takes no width and the rest share the row', () =>
	{
		const tmpLayout = buildLayout();
		tmpLayout.registerLayoutExcludedInputCheck((pInput) => pInput.PictForm.InputType === 'Invisible');
		const tmpGroup = buildGroup([ input('A', { Width: 6, WidthOffset: 2, InputType: 'Invisible' }), input('B', { Width: 1 }), input('C', { Width: 1 }) ], 100);
		tmpLayout.generateGroupLayoutTemplate({}, tmpGroup);
		Expect(widths(tmpGroup)).to.deep.equal([ [ 0, 0 ], [ 50, 0 ], [ 50, 0 ] ]);
		Expect(tmpGroup.Rows[0].Inputs.map((pInput) => pInput.PictForm.LayoutExcluded)).to.deep.equal([ true, false, false ]);
	});

	test('a row where every input is excluded gets zero widths, not NaN', () =>
	{
		const tmpLayout = buildLayout();
		tmpLayout.registerLayoutExcludedInputCheck(() => true);
		const tmpGroup = buildGroup([ input('A', { Width: 2 }), input('B', {}) ], 100);
		tmpLayout.generateGroupLayoutTemplate({}, tmpGroup);
		Expect(widths(tmpGroup)).to.deep.equal([ [ 0, 0 ], [ 0, 0 ] ]);
	});

	test('registering ignores non-functions and the same check twice', () =>
	{
		const tmpLayout = buildLayout();
		const fCheck = () => false;
		tmpLayout.registerLayoutExcludedInputCheck(fCheck);
		tmpLayout.registerLayoutExcludedInputCheck(fCheck);
		tmpLayout.registerLayoutExcludedInputCheck('not a function');
		Expect(tmpLayout.layoutExcludedInputChecks).to.have.length(1);
		Expect(tmpLayout.isLayoutExcludedInput(input('A', {}))).to.equal(false);
	});
});
