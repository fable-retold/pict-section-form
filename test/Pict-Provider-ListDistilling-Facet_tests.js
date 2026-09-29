/*
	Facet ListFilterRules + the Pict-Input-FacetFilter provider: dropdowns in a tabular row that choose from
	one shared join list, each narrowed by the others in the same row, kept consistent when one changes.
	Also covers the global PickList source (ListSourceAddressGlobal) the facet lists are built from.
*/

const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');
const libPictSectionForm = require('../source/Pict-Section-Form.js');

const _Catalog =
[
	{ IDBook: 1, Genre: 'Mystery', Author: 'Christie', Language: 'EN', InPrintUntil: '2030-12-31T00:00:00.000Z' },
	{ IDBook: 2, Genre: 'Mystery', Author: 'Christie', Language: 'EN', InPrintUntil: '2030-12-31T00:00:00.000Z' },
	{ IDBook: 3, Genre: 'Mystery', Author: 'Simenon', Language: 'FR', InPrintUntil: '2020-06-30T00:00:00.000Z' },
	{ IDBook: 4, Genre: 'Science', Author: 'Sagan', Language: 'EN', InPrintUntil: '2025-01-01T00:00:00.000Z' },
	{ IDBook: 5, Genre: 'Poetry', Author: 'Christie', Language: 'EN', InPrintUntil: '2030-12-31T00:00:00.000Z' },
	{ IDBook: 6, Genre: 'Poetry', Author: 'Rilke', Language: 'DE', InPrintUntil: '2030-12-31T00:00:00.000Z' },
	{ IDBook: 7, Genre: 'History' },
];

function facetRule(pJoinListValueAddress, pExtra)
{
	return Object.assign({ FilterType: 'Facet', JoinListAddress: 'AppData.Catalog', JoinListAddressGlobal: true, JoinListValueAddress: pJoinListValueAddress }, pExtra || {});
}

function makeApplication(pRuleExtra, pRows)
{
	const fColumn = (pKey, pPickList, pJoinListValueAddress) => (
		{
			Hash: `Shelf${pKey}`, Name: pKey, DataAddress: pKey, DataType: 'String', IsTabular: true,
			PictForm:
			{
				Section: 'Library', Group: 'Shelf', InputType: 'Option', SelectOptionsPickList: pPickList,
				ListFilterRules: [ facetRule(pJoinListValueAddress, pRuleExtra) ], Providers: [ 'Pict-Input-FacetFilter' ]
			}
		});
	const tmpManifest =
	{
		Scope: 'FacetTestForm',
		PickLists:
		[
			{ Hash: 'Genres', ListAddress: 'Genres', ListSourceAddress: 'AppData.Catalog', ListSourceAddressGlobal: true, IDTemplate: '{~D:Record.Genre~}', TextTemplate: '{~D:Record.Genre~}', Unique: true, Sorted: true },
			{ Hash: 'Authors', ListAddress: 'Authors', ListSourceAddress: 'AppData.Catalog', ListSourceAddressGlobal: true, IDTemplate: '{~D:Record.Author~}', TextTemplate: '{~D:Record.Author~}', Unique: true, Sorted: true, SkipEmpty: true },
			{ Hash: 'Books', ListAddress: 'Books', ListSourceAddress: 'AppData.Catalog', ListSourceAddressGlobal: true, IDTemplate: '{~D:Record.IDBook~}', TextTemplate: 'Book {~D:Record.IDBook~}' },
		],
		Descriptors: {},
		Sections: [ { Hash: 'Library', Name: 'Library', Groups: [ { Hash: 'Shelf', Name: 'Shelf', Layout: 'Tabular', RecordSetAddress: 'Shelf', RecordManifest: 'ShelfRow' } ] } ],
		ReferenceManifests:
		{
			ShelfRow:
			{
				Scope: 'ShelfRow',
				Descriptors:
				{
					Genre: fColumn('Genre', 'Genres', 'Genre'),
					Author: fColumn('Author', 'Authors', 'Author'),
					Book: fColumn('Book', 'Books', 'IDBook'),
				}
			}
		}
	};
	class TestApp extends libPictSectionForm.PictFormApplication
	{
		set testDone(fDone) { this._testDone = fDone; }
		onAfterInitialize()
		{
			this._testDone && this._testDone();
		}
	}
	TestApp.default_configuration = JSON.parse(JSON.stringify(libPictSectionForm.PictFormApplication.default_configuration));
	TestApp.default_configuration.pict_configuration =
	{
		Product: 'FacetTest',
		DefaultAppData: { Catalog: _Catalog, Shelf: pRows || [ {}, {} ] },
		DefaultFormManifest: tmpManifest
	};
	return TestApp;
}

function bootstrap(pAppClass, fCheck, fDone)
{
	const tmpPict = new libPict(pAppClass.default_configuration.pict_configuration);
	tmpPict.LogNoisiness = 0;
	tmpPict.addApplication('FacetTest', pAppClass.default_configuration, pAppClass);
	tmpPict.PictApplication.testDone = () =>
	{
		try
		{
			// Rendering is what stamps each input's GroupIndex / Macro, which the row-scoped paths read.
			document.body.innerHTML = '<div id="Pict-Form-Container"></div>';
			tmpPict.views.PictFormMetacontroller.render();
			const tmpView = tmpPict.views['PictSectionForm-Library'];
			fCheck(tmpPict, tmpView);
			fDone();
		}
		catch (pError)
		{
			fDone(pError);
		}
	};
	tmpPict.PictApplication.initializeAsync(() => { });
}

/** @return {{ Input: any, InputIndex: number }} */
function column(pView, pKey)
{
	const tmpAddresses = pView.getGroup(0).supportingManifest.elementAddresses;
	const tmpIndex = tmpAddresses.indexOf(pKey);
	return { Input: pView.getTabularRecordInput(0, tmpIndex), InputIndex: tmpIndex };
}

/** The ids a row's dropdown for pKey would offer. */
function offered(pPict, pView, pKey, pRowIndex)
{
	const tmpColumn = column(pView, pKey);
	const tmpList = pPict.providers.DynamicMetaLists.getList(tmpColumn.Input.PictForm.SelectOptionsPickList);
	return pPict.providers.ListDistilling.filterList(pView, tmpColumn.Input, tmpList, pRowIndex).map((pEntry) => pEntry.id);
}

/** A user change: setDataTabularByHash writes the cell and runs the input's change providers, as dataChangedTabular does. */
function change(pPict, pView, pKey, pRowIndex, pValue)
{
	pView.setDataTabularByHash(0, column(pView, pKey).Input.Hash, pRowIndex, pValue);
}

suite('ListDistilling Facet rules', () =>
{
	test('a global PickList source reads application state rather than the form data', (fDone) =>
	{
		bootstrap(makeApplication(), (pPict) =>
		{
			Expect(pPict.providers.DynamicMetaLists.getList('Genres').map((pEntry) => pEntry.id)).to.deep.equal([ 'History', 'Mystery', 'Poetry', 'Science' ]);
			Expect(pPict.providers.DynamicMetaLists.getList('Books').length).to.equal(7);
		}, fDone);
	});

	test('with nothing chosen every value is offered (records missing a value are skipped)', (fDone) =>
	{
		bootstrap(makeApplication(), (pPict, pView) =>
		{
			Expect(offered(pPict, pView, 'Author', 0)).to.deep.equal([ 'Christie', 'Rilke', 'Sagan', 'Simenon' ]);
		}, fDone);
	});

	test('a SkipEmpty PickList skips records without the value and does not log them', (fDone) =>
	{
		bootstrap(makeApplication(), (pPict) =>
		{
			const tmpErrors = [];
			const tmpOriginalError = pPict.log.error;
			pPict.log.error = (pMessage) => tmpErrors.push(pMessage);
			pPict.providers.DynamicMetaLists.rebuildListByHash('Authors');
			pPict.providers.DynamicMetaLists.rebuildListByHash('Genres');
			pPict.log.error = tmpOriginalError;
			Expect(pPict.providers.DynamicMetaLists.getList('Authors').length).to.equal(4);
			Expect(tmpErrors.filter((pMessage) => String(pMessage).includes('[Authors]'))).to.deep.equal([]);
		}, fDone);
	});

	test('a row\'s list is narrowed by the other choices in that row only', (fDone) =>
	{
		bootstrap(makeApplication(), (pPict, pView) =>
		{
			change(pPict, pView, 'Genre', 0, 'Mystery');
			Expect(offered(pPict, pView, 'Author', 0)).to.deep.equal([ 'Christie', 'Simenon' ]);
			Expect(offered(pPict, pView, 'Book', 0)).to.deep.equal([ '1', '2', '3' ]);
			Expect(offered(pPict, pView, 'Author', 1)).to.deep.equal([ 'Christie', 'Rilke', 'Sagan', 'Simenon' ]);
		}, fDone);
	});

	test('narrowing is joint: one join record must agree with every constraint', (fDone) =>
	{
		bootstrap(makeApplication({ AutoFillSingle: false }), (pPict, pView) =>
		{
			change(pPict, pView, 'Author', 0, 'Christie');
			change(pPict, pView, 'Genre', 0, 'Poetry');
			Expect(offered(pPict, pView, 'Book', 0)).to.deep.equal([ '5' ]);
		}, fDone);
	});

	test('explicit Facets add constraints that are not columns of the row', (fDone) =>
	{
		bootstrap(makeApplication({ Facets: [ { JoinListValueAddress: 'Language', Value: 'EN' } ] }), (pPict, pView) =>
		{
			Expect(offered(pPict, pView, 'Author', 0)).to.deep.equal([ 'Christie', 'Sagan' ]);
		}, fDone);
	});

	test('explicit Facets compare with an Operator; a bare date compares against the date part', (fDone) =>
	{
		bootstrap(makeApplication({ Facets: [ { JoinListValueAddress: 'InPrintUntil', Operator: 'GE', Value: '2025-01-01' } ] }), (pPict, pView) =>
		{
			Expect(offered(pPict, pView, 'Book', 0)).to.deep.equal([ '1', '2', '4', '5', '6' ]);
		}, fDone);
	});

	test('a stored value outside the facets is still offered in its own row (KeepCurrentValue)', (fDone) =>
	{
		bootstrap(makeApplication({ Facets: [ { JoinListValueAddress: 'InPrintUntil', Operator: 'GE', Value: '2026-01-01' } ] }, [ { Book: '3' }, {} ]), (pPict, pView) =>
		{
			Expect(offered(pPict, pView, 'Book', 0)).to.include('3');
			Expect(offered(pPict, pView, 'Book', 1)).to.not.include('3');
		}, fDone);
	});

	test('KeepCurrentValue:false filters a stored value like any other', (fDone) =>
	{
		bootstrap(makeApplication({ KeepCurrentValue: false, Facets: [ { JoinListValueAddress: 'InPrintUntil', Operator: 'GE', Value: '2026-01-01' } ] }, [ { Book: '3' }, {} ]), (pPict, pView) =>
		{
			Expect(offered(pPict, pView, 'Book', 0)).to.not.include('3');
		}, fDone);
	});

	test('NarrowBy Preceding narrows a list by the columns before it only', (fDone) =>
	{
		bootstrap(makeApplication({ NarrowBy: 'Preceding' }), (pPict, pView) =>
		{
			change(pPict, pView, 'Book', 0, '4');
			Expect(offered(pPict, pView, 'Genre', 0)).to.deep.equal([ 'History', 'Mystery', 'Poetry', 'Science' ]);
			Expect(offered(pPict, pView, 'Author', 0)).to.deep.equal([ 'Sagan' ]);
		}, fDone);
	});
});

suite('Pict-Input-FacetFilter', () =>
{
	test('a value with exactly one consistent choice is filled in', (fDone) =>
	{
		bootstrap(makeApplication(), (pPict, pView) =>
		{
			change(pPict, pView, 'Book', 1, '4');
			const tmpRow = pView.getTabularRecordData(0, 1);
			Expect(tmpRow.Genre).to.equal('Science');
			Expect(tmpRow.Author).to.equal('Sagan');
			Expect(pView.getTabularRecordData(0, 0).Genre).to.equal(undefined);
		}, fDone);
	});

	test('an ambiguous choice is left blank', (fDone) =>
	{
		bootstrap(makeApplication(), (pPict, pView) =>
		{
			change(pPict, pView, 'Author', 0, 'Christie');
			const tmpRow = pView.getTabularRecordData(0, 0);
			Expect(tmpRow.Genre || '').to.equal('');
			Expect(tmpRow.Book || '').to.equal('');
		}, fDone);
	});

	test('fills cascade until nothing is left to infer', (fDone) =>
	{
		bootstrap(makeApplication(), (pPict, pView) =>
		{
			change(pPict, pView, 'Author', 0, 'Simenon');
			const tmpRow = pView.getTabularRecordData(0, 0);
			Expect(tmpRow.Genre).to.equal('Mystery');
			Expect(tmpRow.Book).to.equal('3');
		}, fDone);
	});

	test('a change keeps the changed value and clears siblings it contradicts', (fDone) =>
	{
		bootstrap(makeApplication({ NarrowBy: 'Preceding' }), (pPict, pView) =>
		{
			change(pPict, pView, 'Book', 0, '4');
			change(pPict, pView, 'Genre', 0, 'Poetry');
			const tmpRow = pView.getTabularRecordData(0, 0);
			Expect(tmpRow.Genre).to.equal('Poetry');
			Expect(tmpRow.Author || '').to.equal('');
			Expect(tmpRow.Book || '').to.equal('');
		}, fDone);
	});

	test('a sibling still consistent with the change is kept', (fDone) =>
	{
		bootstrap(makeApplication({ NarrowBy: 'Preceding' }), (pPict, pView) =>
		{
			change(pPict, pView, 'Book', 0, '1');
			change(pPict, pView, 'Genre', 0, 'Poetry');
			const tmpRow = pView.getTabularRecordData(0, 0);
			Expect(tmpRow.Author).to.equal('Christie');
			Expect(tmpRow.Book).to.equal('5');
		}, fDone);
	});

	test('ClearInvalid:false and AutoFillSingle:false leave siblings alone', (fDone) =>
	{
		bootstrap(makeApplication({ ClearInvalid: false, AutoFillSingle: false }), (pPict, pView) =>
		{
			change(pPict, pView, 'Book', 0, '4');
			Expect(pView.getTabularRecordData(0, 0).Genre || '').to.equal('');
			change(pPict, pView, 'Genre', 0, 'Poetry');
			Expect(pView.getTabularRecordData(0, 0).Book).to.equal('4');
		}, fDone);
	});

	test('CarryFields copies the identified record into the row on a change, and clears with it', (fDone) =>
	{
		bootstrap(makeApplication({ CarryFields: { Lang: 'Language' } }), (pPict, pView) =>
		{
			change(pPict, pView, 'Book', 0, '3');
			Expect(pView.getTabularRecordData(0, 0).Lang).to.equal('FR');
			change(pPict, pView, 'Book', 0, '');
			Expect(pView.getTabularRecordData(0, 0).Lang).to.equal('');
		}, fDone);
	});

	test('clearing a value the rest of the row still pins down stays cleared', (fDone) =>
	{
		bootstrap(makeApplication(), (pPict, pView) =>
		{
			change(pPict, pView, 'Book', 0, '4');
			change(pPict, pView, 'Book', 0, '');
			const tmpRow = pView.getTabularRecordData(0, 0);
			Expect(tmpRow.Book).to.equal('');
			Expect(tmpRow.Genre).to.equal('Science');
		}, fDone);
	});

	test('CarryFields leaves a value it cannot pin to one record blank', (fDone) =>
	{
		bootstrap(makeApplication({ CarryFields: { Lang: 'Language' }, AutoFillSingle: false }), (pPict, pView) =>
		{
			change(pPict, pView, 'Author', 0, 'Christie');
			Expect(pView.getTabularRecordData(0, 0).Lang).to.equal('');
		}, fDone);
	});

	test('carried values on a saved row are kept when the form opens', (fDone) =>
	{
		bootstrap(makeApplication({ CarryFields: { Lang: 'Language' } }, [ { Genre: 'Mystery', Author: 'Simenon', Book: '3', Lang: 'saved' } ]), (pPict, pView) =>
		{
			Expect(pView.getTabularRecordData(0, 0).Lang).to.equal('saved');
		}, fDone);
	});

	test('opening a form with saved values does not rewrite them', (fDone) =>
	{
		bootstrap(makeApplication(null, [ { Genre: 'Poetry', Author: 'Sagan', Book: '4' } ]), (pPict, pView) =>
		{
			Expect(pView.getTabularRecordData(0, 0)).to.deep.equal({ Genre: 'Poetry', Author: 'Sagan', Book: '4' });
		}, fDone);
	});
});

suite('Form-level InitialBundle from settings.DefaultFormManifest', () =>
{
	test('runs before the form bootstraps, so form-level PickLists see its data', (fDone) =>
	{
		const tmpApp = makeApplication();
		const tmpConfiguration = tmpApp.default_configuration.pict_configuration;
		tmpConfiguration.DefaultFormManifest.InitialBundle =
		[
			{
				Type: 'ProjectDataset',
				InputRecordsetAddress: 'AppData.Catalog',
				OutputRecordsetAddress: 'AppData.Projected',
				RecordPrototypeAddress: 'OutputRecordset[]<<~?IDBook,==,{~D:InputRecord.IDBook~}?~>>',
				RecordFieldMapping: { Default: { 'InputRecord.IDBook': 'OutputRecord.IDBook', 'InputRecord.Author': 'OutputRecord.Writer' } }
			}
		];
		tmpConfiguration.DefaultFormManifest.PickLists.push({ Hash: 'Writers', ListAddress: 'Writers', ListSourceAddress: 'AppData.Projected', ListSourceAddressGlobal: true, IDTemplate: '{~D:Record.Writer~}', TextTemplate: '{~D:Record.Writer~}', Unique: true, Sorted: true });
		bootstrap(tmpApp, (pPict) =>
		{
			Expect(pPict.AppData.Projected.length).to.equal(7);
			Expect(pPict.providers.DynamicMetaLists.getList('Writers').map((pEntry) => pEntry.id)).to.deep.equal([ 'Christie', 'Rilke', 'Sagan', 'Simenon' ]);
		}, fDone);
	});
});
