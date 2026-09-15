/*
	A tab group hash that is not in the input's TabGroupSet used to be passed straight through:
	selectTabByViewHash matched nothing, hid EVERY group, and left no tab selected -- a section
	rendering as a tab strip over empty space, with the bad value never repaired.

	Two ways in, both seen in the field: a stored value naming a group that was later renamed or
	dropped from the manifest, and a typo'd DefaultTabGroupHash. These cover both, plus the
	guarantee that a valid hash still wins over the fallback.
*/

const Chai = require('chai');
const Expect = Chai.expect;

const libTabGroupSelector = require('../source/providers/inputs/Pict-Provider-Input-TabGroupSelector.js');

const TAB_SET = [ 'GroupOne', 'GroupTwo' ];

// The provider without its constructor -- it injects CSS on construction, which these tests
// neither need nor want.
function buildProvider(pInput)
{
	const tmpProvider = Object.create(libTabGroupSelector.prototype);
	tmpProvider.cssHideClass = 'pict-tab-group-hidden';
	tmpProvider.cssSelectedTabClass = 'pict-tab-group-selectedtab';
	tmpProvider.warnings = [];
	tmpProvider.added = [];
	tmpProvider.removed = [];
	tmpProvider.written = [];

	const tmpView =
	{
		Hash: 'TestSection',
		formID: 'F1',
		getInputFromHash: () => pInput,
		setDataByInput: (pTheInput, pValue) => tmpProvider.written.push(pValue),
	};

	tmpProvider.pict =
	{
		views: { TestSection: tmpView },
		log:
		{
			warn: (pMessage) => tmpProvider.warnings.push(pMessage),
			error: (pMessage) => tmpProvider.warnings.push(pMessage),
		},
		ContentAssignment:
		{
			addClass: (pSelector, pClass) => tmpProvider.added.push(`${pSelector}|${pClass}`),
			removeClass: (pSelector, pClass) => tmpProvider.removed.push(`${pSelector}|${pClass}`),
			projectContent: () => true,
		},
		providers: { DynamicInput: { getInputTemplateHash: () => 'TabElementTemplate' } },
		parseTemplateByHash: () => '<li></li>',
	};

	tmpProvider.view = tmpView;
	return tmpProvider;
}

function buildInput(pPictFormOverrides)
{
	return {
		Hash: 'TabInput',
		Macro: { RawHTMLID: 'RAW1' },
		PictForm: Object.assign({ TabGroupSet: TAB_SET.slice() }, pPictFormOverrides || {}),
	};
}

// Which group is visible = the one the hide class was REMOVED from.
function shownGroup(pProvider)
{
	const tmpShown = pProvider.removed
		.filter((pEntry) => pEntry.indexOf(`|${pProvider.cssHideClass}`) > -1)
		.map((pEntry) => pEntry.split('|')[0]);
	return tmpShown.length === 1 ? tmpShown[0] : tmpShown;
}

suite('Pict-Section-Form - TabGroupSelector tab hash validation', () =>
{
	suite('isTabInSet', () =>
	{
		test('accepts a member and rejects everything else', () =>
		{
			const tmpProvider = buildProvider();
			const tmpInput = buildInput();
			Expect(tmpProvider.isTabInSet(tmpInput, 'GroupTwo')).to.equal(true);
			Expect(tmpProvider.isTabInSet(tmpInput, 'GroupGone')).to.equal(false);
			Expect(tmpProvider.isTabInSet(tmpInput, '')).to.equal(false);
			Expect(tmpProvider.isTabInSet(tmpInput, undefined)).to.equal(false);
		});

		test('rejects when the input has no usable TabGroupSet', () =>
		{
			const tmpProvider = buildProvider();
			Expect(tmpProvider.isTabInSet(undefined, 'GroupOne')).to.equal(false);
			Expect(tmpProvider.isTabInSet({ PictForm: {} }, 'GroupOne')).to.equal(false);
			Expect(tmpProvider.isTabInSet({ PictForm: { TabGroupSet: 'GroupOne' } }, 'GroupOne')).to.equal(false);
		});
	});

	suite('selectTabByViewHash', () =>
	{
		test('selects a hash that is in the set and stores it', () =>
		{
			const tmpInput = buildInput();
			const tmpProvider = buildProvider(tmpInput);
			Expect(tmpProvider.selectTabByViewHash('TestSection', 'TabInput', 'GroupTwo')).to.equal(true);
			Expect(shownGroup(tmpProvider)).to.equal('#GROUP-F1-GroupTwo');
			Expect(tmpProvider.written).to.deep.equal([ 'GroupTwo' ]);
			Expect(tmpProvider.warnings).to.deep.equal([]);
		});

		test('refuses a hash that is not in the set and changes nothing', () =>
		{
			const tmpInput = buildInput();
			const tmpProvider = buildProvider(tmpInput);
			Expect(tmpProvider.selectTabByViewHash('TestSection', 'TabInput', 'GroupGone')).to.equal(false);
			Expect(tmpProvider.added).to.deep.equal([]);
			Expect(tmpProvider.removed).to.deep.equal([]);
			Expect(tmpProvider.written).to.deep.equal([]);
			Expect(tmpProvider.warnings.length).to.equal(1);
			Expect(tmpProvider.warnings[0]).to.contain('GroupGone');
		});

		test('refuses when TabGroupSet is empty', () =>
		{
			const tmpInput = buildInput({ TabGroupSet: [] });
			const tmpProvider = buildProvider(tmpInput);
			Expect(tmpProvider.selectTabByViewHash('TestSection', 'TabInput', 'GroupOne')).to.equal(false);
			Expect(tmpProvider.written).to.deep.equal([]);
		});
	});

	suite('onInputInitialize tab precedence', () =>
	{
		test('uses the stored value when it is in the set', () =>
		{
			const tmpInput = buildInput({ DefaultTabGroupHash: 'GroupOne' });
			const tmpProvider = buildProvider(tmpInput);
			tmpProvider.onInputInitialize(tmpProvider.view, {}, {}, tmpInput, 'GroupTwo', '#SEL', 'TXN');
			Expect(tmpProvider.written).to.deep.equal([ 'GroupTwo' ]);
		});

		test('skips a stored value that is no longer a tab and uses DefaultTabGroupHash', () =>
		{
			const tmpInput = buildInput({ DefaultTabGroupHash: 'GroupTwo' });
			const tmpProvider = buildProvider(tmpInput);
			tmpProvider.onInputInitialize(tmpProvider.view, {}, {}, tmpInput, 'GroupRenamedAwayLastRelease', '#SEL', 'TXN');
			Expect(shownGroup(tmpProvider)).to.equal('#GROUP-F1-GroupTwo');
			Expect(tmpProvider.written).to.deep.equal([ 'GroupTwo' ]);
		});

		test('skips a typo in DefaultTabGroupHash and uses the first tab', () =>
		{
			const tmpInput = buildInput({ DefaultTabGroupHash: 'GruopTwo' });
			const tmpProvider = buildProvider(tmpInput);
			tmpProvider.onInputInitialize(tmpProvider.view, {}, {}, tmpInput, '', '#SEL', 'TXN');
			Expect(shownGroup(tmpProvider)).to.equal('#GROUP-F1-GroupOne');
			Expect(tmpProvider.written).to.deep.equal([ 'GroupOne' ]);
		});

		test('DefaultFromData false still ignores the stored value', () =>
		{
			const tmpInput = buildInput({ DefaultFromData: false, DefaultTabGroupHash: 'GroupTwo' });
			const tmpProvider = buildProvider(tmpInput);
			tmpProvider.onInputInitialize(tmpProvider.view, {}, {}, tmpInput, 'GroupOne', '#SEL', 'TXN');
			Expect(tmpProvider.written).to.deep.equal([ 'GroupTwo' ]);
		});

		test('errors out unchanged when TabGroupSet is missing', () =>
		{
			const tmpInput = { Hash: 'TabInput', Macro: { RawHTMLID: 'RAW1' }, PictForm: {} };
			const tmpProvider = buildProvider(tmpInput);
			Expect(tmpProvider.onInputInitialize(tmpProvider.view, {}, {}, tmpInput, 'GroupOne', '#SEL', 'TXN')).to.equal(false);
			Expect(tmpProvider.written).to.deep.equal([]);
		});
	});
});
