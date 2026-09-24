/*
	Solver ordinal gates are per copy.

	`setsolverordinalenabled` / `enablesolverordinal` / `disablesolverordinal` gate solvers by ordinal number,
	and ordinals are small integers that every manifest uses from 1. So a gate an injected copy sets has to
	stay inside that copy, or it silences whatever a sibling copy happens to have at the same ordinal.

	A gate the form itself sets stays global: a form that gates its own ordinals has always been able to, and
	the sections it declares carry no salt to scope by.
*/

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');
const libDynamicFormSolverBehaviors = require('../source/providers/Pict-Provider-DynamicFormSolverBehaviors.js');

/**
 * @return {any} the behaviors provider, wired to a pict instance and nothing else
 */
function buildBehaviors()
{
	const tmpPict = new libPict({ Product: 'OrdinalScopeTests', LogStreams: [ { streamtype: 'console', level: 'fatal' } ] });
	tmpPict.addProvider('DynamicFormSolverBehaviors', {}, libDynamicFormSolverBehaviors);
	return tmpPict.providers.DynamicFormSolverBehaviors;
}

/**
 * @param {string} pSectionHash - The section hash as the view holds it.
 * @param {string} [pOriginalHash] - What the section was called before it was salted, when it is a copy.
 *
 * @return {any} a view stub carrying just the section definition the scope is read from
 */
function buildView(pSectionHash, pOriginalHash)
{
	const tmpSection = { Hash: pSectionHash };
	if (pOriginalHash)
	{
		tmpSection.OriginalHash = pOriginalHash;
	}
	return { sectionDefinition: tmpSection };
}

suite('Dynamic form solver behaviors ordinal scope', () =>
{
	suite('getViewSolverScope', () =>
	{
		test('a section the form declares itself has no scope', () =>
		{
			const tmpBehaviors = buildBehaviors();
			Expect(tmpBehaviors.getViewSolverScope(buildView('Measure'))).to.equal('');
			Expect(tmpBehaviors.getViewSolverScope(undefined)).to.equal('');
		});

		test('an injected section is scoped by the salt it carries', () =>
		{
			const tmpBehaviors = buildBehaviors();
			Expect(tmpBehaviors.getViewSolverScope(buildView('Measure_alpha', 'Measure'))).to.equal('alpha');
			Expect(tmpBehaviors.getViewSolverScope(buildView('Measure_alphabeta', 'Measure'))).to.equal('alphabeta');
		});
	});

	suite('gates', () =>
	{
		test('a gate one copy sets does not silence a sibling copy at the same ordinal', () =>
		{
			const tmpBehaviors = buildBehaviors();
			tmpBehaviors.setActiveSolverScope('alpha');
			tmpBehaviors.disableSolverOrdinal(5);
			tmpBehaviors.setActiveSolverScope('');

			Expect(tmpBehaviors.checkSolverOrdinalEnabled(5, 'alpha'), 'the copy that set it is gated').to.equal(false);
			Expect(tmpBehaviors.checkSolverOrdinalEnabled(5, 'beta'), 'a sibling copy is not').to.equal(true);
			Expect(tmpBehaviors.checkSolverOrdinalEnabled(5, ''), 'the form itself is not').to.equal(true);
		});

		test('a gate the form sets applies everywhere, as it always has', () =>
		{
			const tmpBehaviors = buildBehaviors();
			tmpBehaviors.disableSolverOrdinal(7);

			Expect(tmpBehaviors.checkSolverOrdinalEnabled(7, '')).to.equal(false);
			Expect(tmpBehaviors.checkSolverOrdinalEnabled(7, 'alpha')).to.equal(false);
		});

		test('an ordinal nothing has gated runs', () =>
		{
			const tmpBehaviors = buildBehaviors();
			Expect(tmpBehaviors.checkSolverOrdinalEnabled(3, 'alpha')).to.equal(true);
			Expect(tmpBehaviors.checkSolverOrdinalEnabled(3)).to.equal(true);
		});

		test('re-enabling inside a copy only re-enables that copy', () =>
		{
			const tmpBehaviors = buildBehaviors();
			tmpBehaviors.setActiveSolverScope('alpha');
			tmpBehaviors.setSolverOrdinalEnabled(9, false);
			tmpBehaviors.setSolverOrdinalEnabled(9, '1');
			tmpBehaviors.setActiveSolverScope('');

			Expect(tmpBehaviors.checkSolverOrdinalEnabled(9, 'alpha')).to.equal(true);
			Expect(tmpBehaviors.checkSolverOrdinalEnabled(9, 'beta')).to.equal(true);
		});
	});
});
