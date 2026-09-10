/*
	TabSectionSelector twin of the TabGroupSelector tab hash validation. Same two ways in -- a stored
	value naming a section that was later renamed or dropped from the manifest, and a typo'd
	DefaultTabSectionHash -- but two symptoms, because selectTabByViewHash also requires the section's
	view to exist:
	  - no such view: an early return, nothing hidden, every tab section stacked on screen;
	  - a real section outside TabSectionSet: EVERY tab section hidden, and the bad value stored.
*/

const Chai = require('chai');
const Expect = Chai.expect;

const libTabSectionSelector = require('../source/providers/inputs/Pict-Provider-Input-TabSectionSelector.js');

const TAB_SET = [ 'SectionOne', 'SectionTwo' ];

// The provider without its constructor -- it registers CSS on construction, which these tests
// neither need nor want.
function buildProvider(pInput)
{
	const tmpProvider = Object.create(libTabSectionSelector.prototype);
	tmpProvider.cssHideClass = 'pict-tab-section-hidden';
	tmpProvider.cssSelectedTabClass = 'pict-tab-section-selectedtab';
	tmpProvider.warnings = [];
	tmpProvider.added = [];
	tmpProvider.removed = [];
	tmpProvider.written = [];

	const tmpView =
	{
		Hash: 'NavigationView',
		getInputFromHash: () => pInput,
		setDataByInput: (pTheInput, pValue) => tmpProvider.written.push(pValue),
	};

	tmpProvider.pict =
	{
		views:
		{
			NavigationView: tmpView,
			PictFormMetacontroller: { UUID: 'MC' },
			// Every section has a view -- Navigation too, though it is not one of the tabs.
			'PictSectionForm-SectionOne': {},
			'PictSectionForm-SectionTwo': {},
			'PictSectionForm-Navigation': {},
		},
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
		PictForm: Object.assign({ TabSectionSet: TAB_SET.slice() }, pPictFormOverrides || {}),
	};
}

// Which section is visible = the one the hide class was REMOVED from.
function shownSection(pProvider)
{
	const tmpShown = pProvider.removed
		.filter((pEntry) => pEntry.indexOf(`|${pProvider.cssHideClass}`) > -1)
		.map((pEntry) => pEntry.split('|')[0]);
	return tmpShown.length === 1 ? tmpShown[0] : tmpShown;
}

suite('Pict-Section-Form - TabSectionSelector tab hash validation', () =>
{
	suite('isTabInSet', () =>
	{
		test('accepts a member and rejects everything else', () =>
		{
			const tmpProvider = buildProvider();
			const tmpInput = buildInput();
			Expect(tmpProvider.isTabInSet(tmpInput, 'SectionTwo')).to.equal(true);
			Expect(tmpProvider.isTabInSet(tmpInput, 'Navigation')).to.equal(false);
			Expect(tmpProvider.isTabInSet(tmpInput, '')).to.equal(false);
			Expect(tmpProvider.isTabInSet(tmpInput, undefined)).to.equal(false);
		});

		test('rejects when the input has no usable TabSectionSet', () =>
		{
			const tmpProvider = buildProvider();
			Expect(tmpProvider.isTabInSet(undefined, 'SectionOne')).to.equal(false);
			Expect(tmpProvider.isTabInSet({ PictForm: {} }, 'SectionOne')).to.equal(false);
			Expect(tmpProvider.isTabInSet({ PictForm: { TabSectionSet: 'SectionOne' } }, 'SectionOne')).to.equal(false);
		});
	});

	suite('selectTabByViewHash', () =>
	{
		test('selects a hash that is in the set and stores it', () =>
		{
			const tmpInput = buildInput();
			const tmpProvider = buildProvider(tmpInput);
			Expect(tmpProvider.selectTabByViewHash('NavigationView', 'TabInput', 'SectionTwo')).to.equal(true);
			Expect(shownSection(tmpProvider)).to.equal('#Pict-MC-SectionTwo-Wrap');
			Expect(tmpProvider.written).to.deep.equal([ 'SectionTwo' ]);
			Expect(tmpProvider.warnings).to.deep.equal([]);
		});

		test('refuses a real section that is not one of the tabs and changes nothing', () =>
		{
			const tmpInput = buildInput();
			const tmpProvider = buildProvider(tmpInput);
			Expect(tmpProvider.selectTabByViewHash('NavigationView', 'TabInput', 'Navigation')).to.equal(false);
			Expect(tmpProvider.added).to.deep.equal([]);
			Expect(tmpProvider.removed).to.deep.equal([]);
			Expect(tmpProvider.written).to.deep.equal([]);
			Expect(tmpProvider.warnings.length).to.equal(1);
			Expect(tmpProvider.warnings[0]).to.contain('Navigation');
		});

		test('refuses when TabSectionSet is empty', () =>
		{
			const tmpInput = buildInput({ TabSectionSet: [] });
			const tmpProvider = buildProvider(tmpInput);
			Expect(tmpProvider.selectTabByViewHash('NavigationView', 'TabInput', 'SectionOne')).to.equal(false);
			Expect(tmpProvider.written).to.deep.equal([]);
		});
	});

	suite('onInputInitialize tab precedence', () =>
	{
		test('uses the stored value when it is in the set', () =>
		{
			const tmpInput = buildInput({ DefaultTabSectionHash: 'SectionOne' });
			const tmpProvider = buildProvider(tmpInput);
			tmpProvider.onInputInitialize(tmpProvider.view, {}, {}, tmpInput, 'SectionTwo', '#SEL', 'TXN');
			Expect(tmpProvider.written).to.deep.equal([ 'SectionTwo' ]);
		});

		test('skips a stored section dropped from the manifest and uses DefaultTabSectionHash', () =>
		{
			const tmpInput = buildInput({ DefaultTabSectionHash: 'SectionTwo' });
			const tmpProvider = buildProvider(tmpInput);
			tmpProvider.onInputInitialize(tmpProvider.view, {}, {}, tmpInput, 'SectionDroppedLastRelease', '#SEL', 'TXN');
			Expect(shownSection(tmpProvider)).to.equal('#Pict-MC-SectionTwo-Wrap');
			Expect(tmpProvider.written).to.deep.equal([ 'SectionTwo' ]);
		});

		test('skips a stored value naming a section that is not a tab and uses the first tab', () =>
		{
			const tmpInput = buildInput();
			const tmpProvider = buildProvider(tmpInput);
			tmpProvider.onInputInitialize(tmpProvider.view, {}, {}, tmpInput, 'Navigation', '#SEL', 'TXN');
			Expect(shownSection(tmpProvider)).to.equal('#Pict-MC-SectionOne-Wrap');
			Expect(tmpProvider.written).to.deep.equal([ 'SectionOne' ]);
		});

		test('skips a typo in DefaultTabSectionHash and uses the first tab', () =>
		{
			const tmpInput = buildInput({ DefaultTabSectionHash: 'SectoinTwo' });
			const tmpProvider = buildProvider(tmpInput);
			tmpProvider.onInputInitialize(tmpProvider.view, {}, {}, tmpInput, '', '#SEL', 'TXN');
			Expect(shownSection(tmpProvider)).to.equal('#Pict-MC-SectionOne-Wrap');
			Expect(tmpProvider.written).to.deep.equal([ 'SectionOne' ]);
		});

		test('DefaultFromData false still ignores the stored value', () =>
		{
			const tmpInput = buildInput({ DefaultFromData: false, DefaultTabSectionHash: 'SectionTwo' });
			const tmpProvider = buildProvider(tmpInput);
			tmpProvider.onInputInitialize(tmpProvider.view, {}, {}, tmpInput, 'SectionOne', '#SEL', 'TXN');
			Expect(tmpProvider.written).to.deep.equal([ 'SectionTwo' ]);
		});

		test('errors out unchanged when TabSectionSet is missing', () =>
		{
			const tmpInput = { Hash: 'TabInput', Macro: { RawHTMLID: 'RAW1' }, PictForm: {} };
			const tmpProvider = buildProvider(tmpInput);
			Expect(tmpProvider.onInputInitialize(tmpProvider.view, {}, {}, tmpInput, 'SectionOne', '#SEL', 'TXN')).to.equal(false);
			Expect(tmpProvider.written).to.deep.equal([]);
		});
	});
});
