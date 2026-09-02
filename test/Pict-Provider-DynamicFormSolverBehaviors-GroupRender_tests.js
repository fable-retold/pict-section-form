/*
	`refreshtabularsection` used to re-render the WHOLE section, rebuilding every group's DOM --
	which destroys any widget the user is mid-interaction with. Measured in a Headlight form: a
	select2 picker in a sibling group was torn down and rebuilt on every tabular refresh, blanking
	its tags for ~700ms, and the section's active tab reset with it.

	renderGroupInPlace re-renders only the group that changed. These tests cover the SAFETY
	contract rather than the happy path: every reason the scoped path cannot run must return false
	-- never throw -- so refreshTabularSection falls back to the original full-section render and
	behaviour is unchanged for anything it cannot handle.
*/

const Chai = require('chai');
const Expect = Chai.expect;

const libDynamicFormSolverBehaviors = require('../source/providers/Pict-Provider-DynamicFormSolverBehaviors.js');

// The provider without its constructor -- these tests exercise one pure-ish method and only
// need the few collaborators it touches.
function buildProvider(pOverrides)
{
	const tmpProvider = Object.create(libDynamicFormSolverBehaviors.prototype);
	tmpProvider.warnings = [];
	tmpProvider.log = { warn: (pMessage) => tmpProvider.warnings.push(pMessage), error: () => {} };
	tmpProvider.pict = Object.assign(
		{
			providers: { MetatemplateGenerator: { getGroupLayoutProvider: () => ({ generateGroupLayoutTemplate: () => '<div></div>' }) } },
			ContentAssignment: { getElement: () => [ { outerHTML: '<div></div>' } ] },
			TemplateProvider: { addTemplate: () => {} },
			DataProvider: { getDataByAddress: () => ({}) },
			parseTemplateByHash: () => '<div id="GROUP-F1-Grid"></div>',
		},
		pOverrides || {});
	return tmpProvider;
}

function buildView(pOverrides)
{
	return Object.assign(
		{
			formID: 'F1',
			options: { Hash: 'TestSection', DefaultTemplateRecordAddress: 'AppData.Form' },
			getGroupIndexFromHash: () => 0,
			getGroup: () => ({ Hash: 'Grid', GroupIndex: 0 }),
			onAfterRender: () => true,
		},
		pOverrides || {});
}

suite('Pict-Section-Form - DynamicFormSolverBehaviors group-scoped render', () =>
{
	test('renders the group in place when everything resolves', () =>
	{
		let tmpRenderedInPlace = false;
		const tmpProvider = buildProvider();
		const tmpView = buildView({ onAfterRender: () => { tmpRenderedInPlace = true; return true; } });
		Expect(tmpProvider.renderGroupInPlace(tmpView, 'Grid')).to.equal(true);
		Expect(tmpRenderedInPlace).to.equal(true);
	});

	test('falls back when the view is missing or has no formID', () =>
	{
		const tmpProvider = buildProvider();
		Expect(tmpProvider.renderGroupInPlace(null, 'Grid')).to.equal(false);
		Expect(tmpProvider.renderGroupInPlace(buildView({ formID: undefined }), 'Grid')).to.equal(false);
	});

	test('falls back when the group hash is not in the section', () =>
	{
		const tmpProvider = buildProvider();
		Expect(tmpProvider.renderGroupInPlace(buildView({ getGroupIndexFromHash: () => -1 }), 'Nope')).to.equal(false);
	});

	test('falls back when the layout provider cannot generate a template', () =>
	{
		const tmpProvider = buildProvider({ providers: { MetatemplateGenerator: { getGroupLayoutProvider: () => ({}) } } });
		Expect(tmpProvider.renderGroupInPlace(buildView(), 'Grid')).to.equal(false);
	});

	test('falls back when the group element is not in the DOM', () =>
	{
		const tmpProvider = buildProvider({ ContentAssignment: { getElement: () => [] } });
		Expect(tmpProvider.renderGroupInPlace(buildView(), 'Grid')).to.equal(false);
	});

	test('falls back when the template parses to nothing', () =>
	{
		const tmpProvider = buildProvider({ parseTemplateByHash: () => '' });
		Expect(tmpProvider.renderGroupInPlace(buildView(), 'Grid')).to.equal(false);
	});

	test('a throwing collaborator is caught, warned, and falls back', () =>
	{
		const tmpProvider = buildProvider({ parseTemplateByHash: () => { throw new Error('boom'); } });
		Expect(tmpProvider.renderGroupInPlace(buildView(), 'Grid')).to.equal(false);
		Expect(tmpProvider.warnings.length).to.equal(1);
		Expect(tmpProvider.warnings[0]).to.contain('falling back');
	});
});
