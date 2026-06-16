/*
	Regression guard for the Informary "assign straight to the element" marshal optimization
	(marshalSpecificElementDataToForm assigns to pFormElement directly instead of re-resolving a
	selector built from that element's own data-i-* attributes — a per-cell full-document scan).

	That optimization is only correct because the selector getContentBrowserAddress() builds is
	UNIQUE — it resolves to exactly the one element being marshalled. This test renders a real form
	(non-tabular fields + a multi-row tabular group) into a jsdom DOM and asserts, for EVERY
	datum-bound cell, that the actual getContentBrowserAddress() output resolves to exactly that
	element. If a future template change makes the (form, datum, container, index) tuple non-unique,
	the marshal would write to the wrong/extra element — and this test fails.
*/

const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');
const libPictSectionForm = require('../source/Pict-Section-Form.js');

/**
 * @param {(pict: libPict) => void} fOnReady
 */
function buildRenderedForm(fOnReady)
{
	const tmpManifest =
	{
		Scope: 'InformarySelectorForm',
		Descriptors:
		{
			Title: { Name: 'Title', Hash: 'Title', DataType: 'String', PictForm: { Section: 'Sheet', Group: 'Meta', InputType: 'Text' } },
			Teacher: { Name: 'Teacher', Hash: 'Teacher', DataType: 'String', PictForm: { Section: 'Sheet', Group: 'Meta', InputType: 'Text' } }
		},
		Sections:
		[
			{
				Hash: 'Sheet', Name: 'Sheet', Groups:
				[
					{ Hash: 'Meta', Name: 'Meta' },
					{ Hash: 'Grades', Name: 'Grades', Layout: 'Tabular', RecordSetAddress: 'Grades', RecordManifest: 'GradeRow' }
				]
			}
		],
		ReferenceManifests:
		{
			GradeRow:
			{
				Scope: 'GradeRow',
				Descriptors:
				{
					StudentName: { Name: 'Student', Hash: 'StudentName', DataType: 'String', PictForm: { Section: 'Sheet', Group: 'Grades', InputType: 'Text' } },
					Score: { Name: 'Score', Hash: 'Score', DataType: 'Number', PictForm: { Section: 'Sheet', Group: 'Grades', InputType: 'Text' } }
				}
			}
		}
	};
	const tmpAppData =
	{
		Title: 'Term 1', Teacher: 'Ms. Frizzle',
		Grades:
		[
			{ StudentName: 'Alice', Score: 95 },
			{ StudentName: 'Bob', Score: 80 },
			{ StudentName: 'Carol', Score: 60 },
			{ StudentName: 'Dan', Score: 72 }
		]
	};

	class TestApp extends libPictSectionForm.PictFormApplication
	{
		onAfterInitialize() { this.solve(); return super.onAfterInitialize(); }
	}
	TestApp.default_configuration = JSON.parse(JSON.stringify(libPictSectionForm.PictFormApplication.default_configuration));
	TestApp.default_configuration.pict_configuration =
	{
		Product: 'InformarySelectorTest',
		DefaultAppData: tmpAppData,
		DefaultFormManifest: tmpManifest
	};

	document.body.innerHTML = '<div id="Pict-Form-Container"></div>';
	const _Pict = new libPict(TestApp.default_configuration.pict_configuration);
	_Pict.LogNoisiness = 0;
	_Pict.addApplication('InformarySelectorTest', TestApp.default_configuration, TestApp);
	_Pict.PictApplication.initializeAsync(() =>
	{
		// browser-env doesn't drive the render cycle on init; render the form views explicitly so
		// the data-i-* cells land in the DOM.
		Object.keys(_Pict.views).forEach((pHash) =>
		{
			const tmpView = _Pict.views[pHash];
			if (tmpView && tmpView.isPictSectionForm)
			{
				try { tmpView.render(); }
				catch (pError) { /* a view that can't render in jsdom is fine; we assert on what did */ }
			}
		});
		fOnReady(_Pict);
	});
}

suite('Pict Provider Informary — render-time selector uniqueness', () =>
{
	test('getContentBrowserAddress resolves to EXACTLY its own element for every datum cell', (fDone) =>
	{
		buildRenderedForm((_Pict) =>
		{
			try
			{
				const tmpInformary = _Pict.providers.Informary;
				const tmpElements = document.querySelectorAll('[data-i-form][data-i-datum]');
				// Guard against a vacuous pass (render produced no cells).
				Expect(tmpElements.length).to.be.greaterThan(6, 'the form rendered its datum cells to the DOM');

				let tmpTabularChecked = 0;
				let tmpNonTabularChecked = 0;
				tmpElements.forEach((pElement) =>
				{
					const tmpForm = pElement.getAttribute('data-i-form');
					const tmpDatum = pElement.getAttribute('data-i-datum');
					const tmpContainer = pElement.getAttribute('data-i-container');
					const tmpIndexRaw = pElement.getAttribute('data-i-index');
					// Mirror the marshal: tmpIndex = Number(getAttribute('data-i-index')).
					const tmpIndex = (tmpIndexRaw == null) ? tmpIndexRaw : Number(tmpIndexRaw);
					if (tmpContainer) { tmpTabularChecked++; } else { tmpNonTabularChecked++; }

					// The ACTUAL selector the old marshal re-resolved, from the element's own attributes.
					const tmpSelector = tmpInformary.getContentBrowserAddress(tmpForm, tmpDatum, tmpContainer, tmpIndex);
					const tmpMatches = document.querySelectorAll(tmpSelector);
					Expect(tmpMatches.length).to.equal(1, `selector [${tmpSelector}] must match exactly one element`);
					Expect(tmpMatches[0]).to.equal(pElement, `selector [${tmpSelector}] must resolve to its own element`);
				});

				// Make sure we exercised BOTH selector shapes — the 4-part container/index (tabular)
				// AND the 2-part (non-tabular) path through getContentBrowserAddress.
				Expect(tmpTabularChecked).to.be.greaterThan(0, 'exercised tabular container/index cells');
				Expect(tmpNonTabularChecked).to.be.greaterThan(0, 'exercised non-tabular cells');
				fDone();
			}
			catch (pError) { fDone(pError); }
		});
	});
});
