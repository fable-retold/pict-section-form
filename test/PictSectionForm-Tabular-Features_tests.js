/*
	Unit tests for the three new tabular features:
	  - Multi-row stacked/clustered headers (Group.Headers)
	  - Row label columns (Group.RowLabels) with Cluster (rowspan) support
	  - Dynamic columns derived from another array (Group.DynamicColumns), non-destructive
*/

const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');
const libPictSectionForm = require('../source/Pict-Section-Form.js');

const _ReferenceManifests =
{
	StudentEditor:
	{
		Scope: 'StudentEditor',
		Descriptors:
		{
			Section:
			{
				Name: 'Section',
				Hash: 'Section',
				DataType: 'String',
				Default: 'A',
				PictForm: { Section: 'Class', Group: 'Students' }
			},
			StudentName:
			{
				Name: 'Student',
				Hash: 'StudentName',
				DataType: 'String',
				Default: '(unnamed)',
				PictForm: { Section: 'Class', Group: 'Students' }
			}
		}
	},
	GradeRowEditor:
	{
		Scope: 'GradeRowEditor',
		Descriptors:
		{
			Section:
			{
				Name: 'Section',
				Hash: 'Section',
				DataType: 'String',
				PictForm: { Section: 'Class', Group: 'Grades' }
			},
			StudentName:
			{
				Name: 'Student',
				Hash: 'StudentName',
				DataType: 'String',
				PictForm: { Section: 'Class', Group: 'Grades' }
			}
		}
	}
};

const _BaseManifest =
{
	Scope: 'TabularFeaturesTestForm',
	Descriptors: {},
	Sections:
	[
		{
			Hash: 'Class',
			Name: 'Class',
			Groups:
			[]
		}
	],
	ReferenceManifests: _ReferenceManifests
};

const _SeedAppData =
{
	Students:
	[
		{ Section: 'A', StudentName: 'Alice' },
		{ Section: 'A', StudentName: 'Bob' },
		{ Section: 'B', StudentName: 'Carol' },
		{ Section: 'B', StudentName: 'Dan' },
		{ Section: 'C', StudentName: 'Eve' }
	],
	Assignments:
	[
		{ IDAssignment: 1, Title: 'Addition',       Topic: 'Math'    },
		{ IDAssignment: 2, Title: 'Photosynthesis', Topic: 'Science' },
		{ IDAssignment: 3, Title: 'Reading 1',      Topic: 'Reading' }
	],
	Grades:
	[
		{ Section: 'A', StudentName: 'Alice', Grades: { '1': 95, '2': 88, '3': 70 } },
		{ Section: 'A', StudentName: 'Bob',   Grades: { '1': 80, '2': 72 } },
		{ Section: 'B', StudentName: 'Carol', Grades: { '1': 60, '2': 75, '3': 90 } }
	]
};

function makeApplication(pGroupConfig, pExtraAppData)
{
	class TestApp extends libPictSectionForm.PictFormApplication
	{
		set testDone(fDone)  { this._testDone = fDone; }
		onAfterInitialize()
		{
			this.solve();
			this._testDone && this._testDone();
		}
	}
	let tmpManifest = JSON.parse(JSON.stringify(_BaseManifest));
	tmpManifest.Sections[0].Groups = [ pGroupConfig ];
	TestApp.default_configuration = JSON.parse(JSON.stringify(libPictSectionForm.PictFormApplication.default_configuration));
	TestApp.default_configuration.pict_configuration =
	{
		Product: 'TabularFeaturesTest',
		DefaultAppData: Object.assign({}, _SeedAppData, pExtraAppData || {}),
		DefaultFormManifest: tmpManifest
	};
	return TestApp;
}

function bootstrap(pAppClass, fCheck, fDone)
{
	let _Pict = new libPict(pAppClass.default_configuration.pict_configuration);
	_Pict.LogNoisiness = 0;
	_Pict.addApplication('TabularFeaturesTest', pAppClass.default_configuration, pAppClass);
	_Pict.PictApplication.testDone = () =>
	{
		try
		{
			// Force layout-template generation so ExpandedHeaders / RowLabelMetadata are populated
			// (in a real browser context the metacontroller's onAfterRender triggers this, but
			// browser-env doesn't drive a real render cycle on init).
			let tmpFormViews = Object.keys(_Pict.views)
				.map((pHash) => _Pict.views[pHash])
				.filter((pView) => pView && pView.isPictSectionForm && pView !== _Pict.views.PictFormMetacontroller);
			for (let i = 0; i < tmpFormViews.length; i++)
			{
				tmpFormViews[i].rebuildCustomTemplate();
			}
			fCheck(_Pict);
			fDone();
		}
		catch (pError) { return fDone(pError); }
	};
	_Pict.PictApplication.initializeAsync(() => { });
}

suite('PictSectionForm Tabular Features', () =>
{
	suite('Regression: existing tabular tables work unchanged', () =>
	{
		test('Bare tabular group has no RowLabelMetadata cells and no ExpandedHeaders rows', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor'
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				Expect(tmpGroup.ExpandedHeaders).to.be.an('array').with.length(0, 'no Headers config => no extra header rows');
				Expect(tmpGroup.RowLabelMetadata).to.be.an('array').with.length(0, 'no RowLabels config => no metadata');
				Expect(tmpGroup.supportingManifest.elementAddresses.length).to.equal(2, 'static descriptors only');
			}, fDone);
		});
	});

	suite('Multi-row clustered headers (Group.Headers)', () =>
	{
		test('Headers config produces ExpandedHeaders array with correct ColumnSpan totals', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				Headers:
				[
					[ { Label: 'Roster', ColumnSpan: 2 } ]
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				Expect(tmpGroup.ExpandedHeaders).to.be.an('array').with.length(1, 'one extra header row');
				Expect(tmpGroup.ExpandedHeaders[0][0].Label).to.equal('Roster');
				Expect(tmpGroup.ExpandedHeaders[0][0].ColumnSpan).to.equal(2);
			}, fDone);
		});

		test('Multiple stacked header rows preserved in order', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				Headers:
				[
					[ { Label: 'Top',    ColumnSpan: 2 } ],
					[ { Label: 'Middle', ColumnSpan: 1 }, { Label: 'Middle2', ColumnSpan: 1 } ]
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				Expect(tmpGroup.ExpandedHeaders).to.be.an('array').with.length(2);
				Expect(tmpGroup.ExpandedHeaders[0][0].Label).to.equal('Top');
				Expect(tmpGroup.ExpandedHeaders[1][0].Label).to.equal('Middle');
				Expect(tmpGroup.ExpandedHeaders[1][1].Label).to.equal('Middle2');
			}, fDone);
		});
	});

	suite('Row label columns (Group.RowLabels)', () =>
	{
		test('Template-driven row labels resolve against record data', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				RowLabels:
				[
					{ Name: 'Section', Template: '{~D:Record.Value.Section~}' }
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				Expect(tmpGroup.RowLabelMetadata).to.be.an('array').with.length(5, 'one metadata entry per row');
				Expect(tmpGroup.RowLabelMetadata[0].Cells[0].RenderedLabel).to.equal('A');
				Expect(tmpGroup.RowLabelMetadata[2].Cells[0].RenderedLabel).to.equal('B');
				Expect(tmpGroup.RowLabelMetadata[4].Cells[0].RenderedLabel).to.equal('C');
				// No clustering by default -> RowSpan 1 everywhere, Skip false everywhere
				for (let i = 0; i < tmpGroup.RowLabelMetadata.length; i++)
				{
					Expect(tmpGroup.RowLabelMetadata[i].Cells[0].RowSpan).to.equal(1);
					Expect(tmpGroup.RowLabelMetadata[i].Cells[0].Skip).to.equal(false);
				}
			}, fDone);
		});

		test('Cluster: true collapses consecutive equal values into rowspan', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				RowLabels:
				[
					{ Name: 'Section', Template: '{~D:Record.Value.Section~}', Cluster: true }
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				// Students: A, A, B, B, C
				let tmpCells = tmpGroup.RowLabelMetadata.map((pRow) => pRow.Cells[0]);
				Expect(tmpCells[0].RenderedLabel).to.equal('A');
				Expect(tmpCells[0].RowSpan).to.equal(2, 'A run length 2');
				Expect(tmpCells[0].Skip).to.equal(false);
				Expect(tmpCells[1].Skip).to.equal(true, 'second A is collapsed into rowspan');
				Expect(tmpCells[2].RenderedLabel).to.equal('B');
				Expect(tmpCells[2].RowSpan).to.equal(2);
				Expect(tmpCells[3].Skip).to.equal(true);
				Expect(tmpCells[4].RenderedLabel).to.equal('C');
				Expect(tmpCells[4].RowSpan).to.equal(1);
				Expect(tmpCells[4].Skip).to.equal(false);
			}, fDone);
		});

		test('RowNumber: true produces 1-based row numbers', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				RowLabels:
				[
					{ Name: '#', RowNumber: true }
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				Expect(tmpGroup.RowLabelMetadata[0].Cells[0].RenderedLabel).to.equal('1');
				Expect(tmpGroup.RowLabelMetadata[4].Cells[0].RenderedLabel).to.equal('5');
			}, fDone);
		});

		test('Multiple row label columns are independent', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				RowLabels:
				[
					{ Name: 'Section', Template: '{~D:Record.Value.Section~}', Cluster: true },
					{ Name: 'Student', Template: '{~D:Record.Value.StudentName~}' },
					{ Name: '#',       RowNumber: true }
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				Expect(tmpGroup.RowLabelMetadata[0].Cells.length).to.equal(3, 'three label columns');
				Expect(tmpGroup.RowLabelMetadata[0].Cells[0].RenderedLabel).to.equal('A');
				Expect(tmpGroup.RowLabelMetadata[0].Cells[1].RenderedLabel).to.equal('Alice');
				Expect(tmpGroup.RowLabelMetadata[0].Cells[2].RenderedLabel).to.equal('1');
			}, fDone);
		});
	});

	suite('Dynamic columns (Group.DynamicColumns)', () =>
	{
		test('Generator produces one descriptor per source row at init', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						HashTemplate: 'Grade_{~D:Record.IDAssignment~}',
						NameTemplate: '{~D:Record.Title~}',
						InformaryDataAddressTemplate: 'Grades.{~D:Record.IDAssignment~}',
						DataType: 'Number',
						PictForm: { InputType: 'Number' }
					}
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpDescAddrs = tmpGroup.supportingManifest.elementAddresses;
				Expect(tmpDescAddrs.indexOf('Grade_1')).to.be.greaterThan(-1, 'Grade_1 descriptor was added');
				Expect(tmpDescAddrs.indexOf('Grade_2')).to.be.greaterThan(-1);
				Expect(tmpDescAddrs.indexOf('Grade_3')).to.be.greaterThan(-1);

				let tmpDesc = tmpGroup.supportingManifest.elementDescriptors['Grade_1'];
				Expect(tmpDesc.Name).to.equal('Addition', 'NameTemplate resolved against source row');
				Expect(tmpDesc.PictForm.InformaryDataAddress).to.equal('Grades.1', 'InformaryDataAddressTemplate resolved once');
				Expect(tmpDesc.PictForm.InformaryContainerAddress).to.equal('Grades', 'container = group RecordSetAddress');
			}, fDone);
		});

		test('HeaderGroupTemplate auto-extends Headers with a clustered super-header row', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						HashTemplate: 'Grade_{~D:Record.IDAssignment~}',
						NameTemplate: '{~D:Record.Title~}',
						InformaryDataAddressTemplate: 'Grades.{~D:Record.IDAssignment~}',
						HeaderGroupTemplate: '{~D:Record.Topic~}',
						DataType: 'Number',
						PictForm: { InputType: 'Number' }
					}
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				Expect(tmpGroup.ExpandedHeaders.length).to.be.greaterThan(0, 'synthesized header row added');
				let tmpSynthRow = tmpGroup.ExpandedHeaders[0];
				// Static descriptors (Section, StudentName) each get one spacer cell (ColumnSpan 1).
				// Then one cluster per Topic. Assignments are Math, Science, Reading — three distinct topics.
				let tmpDynamicCells = tmpSynthRow.filter((pCell) => pCell.CSSClass === 'pict-tabular-dynamic-header-group');
				Expect(tmpDynamicCells.length).to.equal(3, 'three topic clusters');
				let tmpTopicLabels = tmpDynamicCells.map((pCell) => pCell.Label);
				Expect(tmpTopicLabels).to.include('Math');
				Expect(tmpTopicLabels).to.include('Science');
				Expect(tmpTopicLabels).to.include('Reading');
			}, fDone);
		});

		test('Non-destructive: removing a source row preserves data at the InformaryDataAddress', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						HashTemplate: 'Grade_{~D:Record.IDAssignment~}',
						NameTemplate: '{~D:Record.Title~}',
						InformaryDataAddressTemplate: 'Grades.{~D:Record.IDAssignment~}',
						DataType: 'Number',
						PictForm: { InputType: 'Number' }
					}
				]
			});
			bootstrap(App, (_Pict) =>
			{
				// Confirm initial seed data: row 0 has grade for assignment 3 = 70.
				Expect(_Pict.AppData.Grades[0].Grades['3']).to.equal(70);

				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpManifestFactory = _Pict.ManifestFactory;
				Expect(tmpGroup.supportingManifest.elementAddresses.indexOf('Grade_3')).to.be.greaterThan(-1, 'Grade_3 descriptor exists before removal');

				// Remove assignment 3.
				_Pict.AppData.Assignments.splice(2, 1);
				let tmpResult = tmpManifestFactory._resolveDynamicColumns(tmpView, tmpGroup);
				Expect(tmpResult.changed).to.equal(true, 'change detected');
				Expect(tmpResult.removed).to.include('Grade_3', 'descriptor removed');
				Expect(tmpGroup.supportingManifest.elementAddresses.indexOf('Grade_3')).to.equal(-1, 'Grade_3 descriptor gone after removal');

				// CRITICAL: the row data at Grades.3 is still there.
				Expect(_Pict.AppData.Grades[0].Grades['3']).to.equal(70, 'row data preserved (non-destructive)');

				// Re-add assignment 3 with same IDAssignment — descriptor reappears AND data is intact.
				_Pict.AppData.Assignments.push({ IDAssignment: 3, Title: 'Reading 1 (restored)', Topic: 'Reading' });
				let tmpResult2 = tmpManifestFactory._resolveDynamicColumns(tmpView, tmpGroup);
				Expect(tmpResult2.changed).to.equal(true);
				Expect(tmpResult2.added).to.include('Grade_3');
				Expect(tmpGroup.supportingManifest.elementAddresses.indexOf('Grade_3')).to.be.greaterThan(-1);
				Expect(_Pict.AppData.Grades[0].Grades['3']).to.equal(70, 'data still there after re-add');
			}, fDone);
		});

		test('Steady-state re-run is a no-op (no false changes)', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						HashTemplate: 'Grade_{~D:Record.IDAssignment~}',
						NameTemplate: '{~D:Record.Title~}',
						InformaryDataAddressTemplate: 'Grades.{~D:Record.IDAssignment~}',
						DataType: 'Number',
						PictForm: { InputType: 'Number' }
					}
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpResult = _Pict.ManifestFactory._resolveDynamicColumns(tmpView, tmpGroup);
				Expect(tmpResult.changed).to.equal(false, 'no source change -> no descriptor change');
				Expect(tmpResult.added).to.have.length(0);
				Expect(tmpResult.removed).to.have.length(0);
			}, fDone);
		});

		test('Re-resolving preserves the descriptor object and its Macro (row move / add / delete safe)', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						HashTemplate: 'Grade_{~D:Record.IDAssignment~}',
						NameTemplate: '{~D:Record.Title~}',
						InformaryDataAddressTemplate: 'Grades.{~D:Record.IDAssignment~}',
						DataType: 'Number',
						PictForm: { InputType: 'Number' }
					}
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpDescriptorBefore = tmpGroup.supportingManifest.elementDescriptors['Grade_1'];
				Expect(tmpDescriptorBefore).to.be.an('object', 'Grade_1 descriptor exists');

				// The template build stamps a generated Macro (informary HTML bindings) onto
				// the descriptor. A re-resolve triggered by a row move / add / delete must NOT
				// drop it -- otherwise the next render() emits inputs with no name and the
				// cells marshal empty.
				tmpDescriptorBefore.Macro = { HTMLName: 'name="Grade_1"' };
				tmpDescriptorBefore.PictForm.InputIndex = 2;

				_Pict.ManifestFactory._resolveDynamicColumns(tmpView, tmpGroup);

				let tmpDescriptorAfter = tmpGroup.supportingManifest.elementDescriptors['Grade_1'];
				Expect(tmpDescriptorAfter).to.equal(tmpDescriptorBefore, 'same descriptor object preserved across re-resolve');
				Expect(tmpDescriptorAfter.Macro).to.be.an('object', 'generated Macro preserved');
				Expect(tmpDescriptorAfter.Macro.HTMLName).to.equal('name="Grade_1"', 'Macro contents intact');
				Expect(tmpDescriptorAfter.PictForm.InputIndex).to.equal(2, 'stamped InputIndex preserved');
				// Data-derived fields are still refreshed in place.
				Expect(tmpDescriptorAfter.Name).to.equal('Addition', 'Name refreshed from the source row');
			}, fDone);
		});

		test('Adding a source row rebuilds dependent dynamic-column views in the render phase (no blank-out)', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						HashTemplate: 'Grade_{~D:Record.IDAssignment~}',
						NameTemplate: '{~D:Record.Title~}',
						InformaryDataAddressTemplate: 'Grades.{~D:Record.IDAssignment~}',
						DataType: 'Number',
						PictForm: { InputType: 'Number' }
					}
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				Expect(tmpGroup.supportingManifest.elementAddresses.indexOf('Grade_99')).to.equal(-1, 'no Grade_99 column before the source row is added');

				// Simulate the source array growing the way createDynamicTableRow pushes a new
				// row, then run the render-phase rebuild that Fix A performs BEFORE marshaling.
				// The dependent view must re-resolve + rebuild its columns here -- not mid-marshal.
				_Pict.AppData.Assignments.push({ IDAssignment: 99, Title: 'Pop Quiz', Topic: 'Math' });
				_Pict.providers.DynamicTabularData._rebuildDependentDynamicColumnViews('Assignments');

				Expect(tmpGroup.supportingManifest.elementAddresses.indexOf('Grade_99')).to.be.greaterThan(-1,
					'dependent view re-resolved + rebuilt its columns when the source array grew');
				Expect(tmpGroup.supportingManifest.elementDescriptors['Grade_99'].Name).to.equal('Pop Quiz',
					'new column header resolved from the newly added source row');
			}, fDone);
		});

		test('Moving a source row reorders dependent position-keyed cells (data follows the column)', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						KeyBy: 'Position',
						HashTemplate: 'PassingCol_{~D:Record.__Index~}',
						NameTemplate: '{~D:Record.Title~}',
						InformaryDataAddressTemplate: 'PassingCol_{~D:Record.__Index~}',
						DataType: 'String',
						PictForm: { InputType: 'Text' }
					}
				]
			},
			{
				// Each dependent row carries user-entered positional cells (one per source column).
				Grades:
				[
					{ Section: 'A', StudentName: 'Alice', PassingCol_0: 'a0', PassingCol_1: 'a1', PassingCol_2: 'a2' },
					{ Section: 'A', StudentName: 'Bob',   PassingCol_0: 'b0', PassingCol_1: 'b1', PassingCol_2: 'b2' }
				]
			});
			bootstrap(App, (_Pict) =>
			{
				// Source order is [Addition(0), Photosynthesis(1), Reading 1(2)]. Move row 0 -> 2,
				// the way moveDynamicTableRowDown twice / setDynamicTableRowIndex(0,2) would, then
				// apply the SAME permutation to every dependent row's positional cells.
				_Pict.providers.DynamicTabularData._moveDependentPositionalColumns('Assignments', 0, 2, 3);

				let tmpRow0 = _Pict.AppData.Grades[0];
				let tmpRow1 = _Pict.AppData.Grades[1];
				// [a0,a1,a2] with source 0->2 becomes [a1,a2,a0] -- the value under each column
				// moved with its source position, so data stays attached to its column.
				Expect(tmpRow0.PassingCol_0).to.equal('a1', 'row 0 col 0 took the value from old position 1');
				Expect(tmpRow0.PassingCol_1).to.equal('a2', 'row 0 col 1 took the value from old position 2');
				Expect(tmpRow0.PassingCol_2).to.equal('a0', 'row 0 col 2 took the moved value from old position 0');
				Expect(tmpRow1.PassingCol_0).to.equal('b1', 'row 1 permuted identically');
				Expect(tmpRow1.PassingCol_1).to.equal('b2', 'row 1 permuted identically');
				Expect(tmpRow1.PassingCol_2).to.equal('b0', 'row 1 permuted identically');
			}, fDone);
		});

		test('Reordering a source row re-labels dependent columns in the render phase (no blank-out on move)', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						KeyBy: 'Position',
						HashTemplate: 'PassingCol_{~D:Record.__Index~}',
						NameTemplate: '{~D:Record.Title~}',
						InformaryDataAddressTemplate: 'PassingCol_{~D:Record.__Index~}',
						DataType: 'String',
						PictForm: { InputType: 'Text' }
					}
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				Expect(tmpGroup.supportingManifest.elementDescriptors['PassingCol_0'].Name).to.equal('Addition', 'col 0 header before move');
				Expect(tmpGroup.supportingManifest.elementDescriptors['PassingCol_2'].Name).to.equal('Reading 1', 'col 2 header before move');

				// Reorder the source the way the move handler splices it (move index 0 -> 2), then
				// run the render-phase rebuild the move handler now performs BEFORE marshaling.
				let tmpMoved = _Pict.AppData.Assignments.splice(0, 1);
				_Pict.AppData.Assignments.splice(2, 0, tmpMoved[0]);
				_Pict.providers.DynamicTabularData._rebuildDependentDynamicColumnViews('Assignments');

				// Column hashes are position-keyed (stable), but their labels must re-resolve to the
				// NEW source order here in the render phase -- not mid-marshal, which would blank the
				// freshly filled cells until the next edit.
				Expect(tmpGroup.supportingManifest.elementDescriptors['PassingCol_0'].Name).to.equal('Photosynthesis', 'col 0 re-labeled to new position 0');
				Expect(tmpGroup.supportingManifest.elementDescriptors['PassingCol_1'].Name).to.equal('Reading 1', 'col 1 re-labeled to new position 1');
				Expect(tmpGroup.supportingManifest.elementDescriptors['PassingCol_2'].Name).to.equal('Addition', 'col 2 re-labeled to the moved row');
			}, fDone);
		});

		test('Renaming a source row reports namesChanged and refreshes the column header in place', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						HashTemplate: 'Grade_{~D:Record.IDAssignment~}',
						NameTemplate: '{~D:Record.Title~}',
						InformaryDataAddressTemplate: 'Grades.{~D:Record.IDAssignment~}',
						DataType: 'Number',
						PictForm: { InputType: 'Number' }
					}
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				Expect(tmpGroup.supportingManifest.elementDescriptors['Grade_1'].Name).to.equal('Addition', 'baseline header label');

				// Rename the source row's name-driving field -- no add / remove / reorder, so the
				// column hash set is identical. The header label must still be flagged as changed.
				_Pict.AppData.Assignments[0].Title = 'Renamed';
				let tmpResult = _Pict.ManifestFactory._resolveDynamicColumns(tmpView, tmpGroup);

				Expect(tmpResult.changed).to.equal(false, 'the column SET did not change (no add/remove/reorder)');
				Expect(tmpResult.namesChanged).to.equal(true, 'an existing column label changed');
				Expect(tmpGroup.supportingManifest.elementDescriptors['Grade_1'].Name).to.equal('Renamed',
					'descriptor header label refreshed in place so a render() re-bakes it live');
			}, fDone);
		});

		test('Steady-state re-run reports neither changed nor namesChanged', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						HashTemplate: 'Grade_{~D:Record.IDAssignment~}',
						NameTemplate: '{~D:Record.Title~}',
						InformaryDataAddressTemplate: 'Grades.{~D:Record.IDAssignment~}',
						DataType: 'Number',
						PictForm: { InputType: 'Number' }
					}
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpResult = _Pict.ManifestFactory._resolveDynamicColumns(tmpView, tmpGroup);
				Expect(tmpResult.changed).to.equal(false, 'no structural change on a steady-state re-run');
				Expect(tmpResult.namesChanged).to.equal(false, 'no false label change on a steady-state re-run');
			}, fDone);
		});
	});

	suite('Position-keyed dynamic columns (KeyBy: Position)', () =>
	{
		function makePositionApp()
		{
			return makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						KeyBy: 'Position',
						HashTemplate: 'PosCol_{~D:Record.__Index~}',
						NameTemplate: 'Product {~D:Record.__RowNumber~}',
						InformaryDataAddressTemplate: 'PosCol_{~D:Record.__Index~}',
						DataType: 'String',
						PictForm: { InputType: 'Text' }
					}
				]
			});
		}

		test('Columns are keyed by source-row position; names use the 1-based __RowNumber', (fDone) =>
		{
			bootstrap(makePositionApp(), (_Pict) =>
			{
				let tmpGroup = _Pict.views['PictSectionForm-Class'].sectionDefinition.Groups[0];
				let tmpAddrs = tmpGroup.supportingManifest.elementAddresses;
				Expect(tmpAddrs.indexOf('PosCol_0')).to.be.greaterThan(-1, 'index 0 column');
				Expect(tmpAddrs.indexOf('PosCol_1')).to.be.greaterThan(-1, 'index 1 column');
				Expect(tmpAddrs.indexOf('PosCol_2')).to.be.greaterThan(-1, 'index 2 column');
				Expect(tmpGroup.supportingManifest.elementDescriptors['PosCol_0'].Name).to.equal('Product 1');
				Expect(tmpGroup.supportingManifest.elementDescriptors['PosCol_2'].Name).to.equal('Product 3');
			}, fDone);
		});

		test('Duplicate identity values in the source do NOT produce a duplicate column (2.3)', (fDone) =>
		{
			bootstrap(makePositionApp(), (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				// Add a source row whose stored identity (IDAssignment/Title) duplicates an existing
				// row -- the exact "DefaultRows[length] re-use" shape. Position-keying must still
				// give it a distinct column, since identity comes from the index, not the value.
				_Pict.AppData.Assignments.push({ IDAssignment: 2, Title: 'Photosynthesis', Topic: 'Science' });
				_Pict.ManifestFactory._resolveDynamicColumns(tmpView, tmpGroup);
				let tmpAddrs = tmpGroup.supportingManifest.elementAddresses;
				Expect(tmpAddrs.indexOf('PosCol_3')).to.be.greaterThan(-1, 'a distinct 4th column despite the duplicate value');
				let tmpPosColCount = tmpAddrs.filter((pAddr) => pAddr.indexOf('PosCol_') === 0).length;
				Expect(tmpPosColCount).to.equal(4, 'exactly four distinct positional columns, no duplicate');
			}, fDone);
		});

		test('Deleting a middle source row shifts dependent positional cells down (delete-splice)', (fDone) =>
		{
			bootstrap(makePositionApp(), (_Pict) =>
			{
				let tmpRow = _Pict.AppData.Grades[0];
				// User-entered values across the three positional columns.
				tmpRow.PosCol_0 = 'A0';
				tmpRow.PosCol_1 = 'A1';
				tmpRow.PosCol_2 = 'A2';

				// Remove the middle source row (index 1) -- as deleteDynamicTableRow does -- then
				// run the dependent-cell splice it would trigger (originalLength was 3).
				_Pict.AppData.Assignments.splice(1, 1);
				_Pict.providers.DynamicTabularData._spliceDependentPositionalColumns('Assignments', 1, 3);

				Expect(tmpRow.PosCol_0).to.equal('A0', 'cell before the deleted index is unchanged');
				Expect(tmpRow.PosCol_1).to.equal('A2', 'cell after the deleted index shifted down into its place');
				Expect(tmpRow.PosCol_2).to.equal(undefined, 'the now-orphaned last cell was cleared');
			}, fDone);
		});
	});

	suite('Tabular highlight / color solvers', () =>
	{
		test('The four tabular solver behaviors are available on the provider', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor'
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpBehaviors = _Pict.providers.DynamicFormSolverBehaviors;
				Expect(tmpBehaviors).to.be.an('object', 'DynamicFormSolverBehaviors provider exists');
				Expect(tmpBehaviors.highlightTabularRow).to.be.a('function');
				Expect(tmpBehaviors.highlightTabularColumn).to.be.a('function');
				Expect(tmpBehaviors.colorTabularRow).to.be.a('function');
				Expect(tmpBehaviors.colorTabularColumn).to.be.a('function');
			}, fDone);
		});

		test('isSolverFlagEnabled treats 0/"0"/false/""/null as off and everything else as on', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor'
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpBehaviors = _Pict.providers.DynamicFormSolverBehaviors;
				Expect(tmpBehaviors.isSolverFlagEnabled(0)).to.equal(false);
				Expect(tmpBehaviors.isSolverFlagEnabled('0')).to.equal(false);
				Expect(tmpBehaviors.isSolverFlagEnabled(false)).to.equal(false);
				Expect(tmpBehaviors.isSolverFlagEnabled('')).to.equal(false);
				Expect(tmpBehaviors.isSolverFlagEnabled(null)).to.equal(false);
				Expect(tmpBehaviors.isSolverFlagEnabled('false')).to.equal(false);
				Expect(tmpBehaviors.isSolverFlagEnabled(1)).to.equal(true);
				Expect(tmpBehaviors.isSolverFlagEnabled('1')).to.equal(true);
				Expect(tmpBehaviors.isSolverFlagEnabled(true)).to.equal(true);
				Expect(tmpBehaviors.isSolverFlagEnabled('#FF0000')).to.equal(true);
			}, fDone);
		});

		test('highlightTabularRow adds and removes the row highlight class', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor'
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				// Build a minimal group DOM the solver can target.
				let tmpGroupID = `GROUP-${tmpView.formID}-Students`;
				let tmpContainer = window.document.createElement('div');
				tmpContainer.id = tmpGroupID;
				tmpContainer.innerHTML = '<table><tbody>'
					+ '<tr data-tabular-row-index="0"><td data-tabular-column-index="0">a</td><td data-tabular-column-index="1">b</td></tr>'
					+ '<tr data-tabular-row-index="1"><td data-tabular-column-index="0">c</td><td data-tabular-column-index="1">d</td></tr>'
					+ '</tbody></table>';
				window.document.body.appendChild(tmpContainer);
				try
				{
					let tmpBehaviors = _Pict.providers.DynamicFormSolverBehaviors;
					let tmpRow0 = tmpContainer.querySelector('tr[data-tabular-row-index="0"]');
					let tmpRow1 = tmpContainer.querySelector('tr[data-tabular-row-index="1"]');

					tmpBehaviors.highlightTabularRow('Class', 'Students', 0, 1);
					Expect(tmpRow0.classList.contains('pict-tabular-row-highlight')).to.equal(true, 'row 0 highlighted');
					Expect(tmpRow1.classList.contains('pict-tabular-row-highlight')).to.equal(false, 'row 1 untouched');

					tmpBehaviors.highlightTabularRow('Class', 'Students', 0, 0);
					Expect(tmpRow0.classList.contains('pict-tabular-row-highlight')).to.equal(false, 'row 0 un-highlighted with flag 0');
				}
				finally
				{
					window.document.body.removeChild(tmpContainer);
				}
			}, fDone);
		});

		test('highlightTabularColumn toggles the class on every cell of a column', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor'
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpContainer = window.document.createElement('div');
				tmpContainer.id = `GROUP-${tmpView.formID}-Students`;
				tmpContainer.innerHTML = '<table>'
					+ '<thead><tr><th data-tabular-column-index="0">H0</th><th data-tabular-column-index="1">H1</th></tr></thead>'
					+ '<tbody>'
					+ '<tr data-tabular-row-index="0"><td data-tabular-column-index="0">a</td><td data-tabular-column-index="1">b</td></tr>'
					+ '<tr data-tabular-row-index="1"><td data-tabular-column-index="0">c</td><td data-tabular-column-index="1">d</td></tr>'
					+ '</tbody></table>';
				window.document.body.appendChild(tmpContainer);
				try
				{
					let tmpBehaviors = _Pict.providers.DynamicFormSolverBehaviors;
					tmpBehaviors.highlightTabularColumn('Class', 'Students', 1, 1);
					let tmpColumn1 = tmpContainer.querySelectorAll('[data-tabular-column-index="1"]');
					Expect(tmpColumn1.length).to.equal(3, 'header + two body cells');
					for (let i = 0; i < tmpColumn1.length; i++)
					{
						Expect(tmpColumn1[i].classList.contains('pict-tabular-column-highlight')).to.equal(true, 'every column-1 cell highlighted');
					}
					let tmpColumn0 = tmpContainer.querySelectorAll('[data-tabular-column-index="0"]');
					for (let i = 0; i < tmpColumn0.length; i++)
					{
						Expect(tmpColumn0[i].classList.contains('pict-tabular-column-highlight')).to.equal(false, 'column 0 untouched');
					}

					tmpBehaviors.highlightTabularColumn('Class', 'Students', 1, 0);
					for (let i = 0; i < tmpColumn1.length; i++)
					{
						Expect(tmpColumn1[i].classList.contains('pict-tabular-column-highlight')).to.equal(false, 'column 1 cleared with flag 0');
					}
				}
				finally
				{
					window.document.body.removeChild(tmpContainer);
				}
			}, fDone);
		});

		test('colorTabularRow / colorTabularColumn set and clear inline background', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor'
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpContainer = window.document.createElement('div');
				tmpContainer.id = `GROUP-${tmpView.formID}-Students`;
				tmpContainer.innerHTML = '<table><tbody>'
					+ '<tr data-tabular-row-index="0"><td data-tabular-column-index="0">a</td><td data-tabular-column-index="1">b</td></tr>'
					+ '<tr data-tabular-row-index="1"><td data-tabular-column-index="0">c</td><td data-tabular-column-index="1">d</td></tr>'
					+ '</tbody></table>';
				window.document.body.appendChild(tmpContainer);
				try
				{
					let tmpBehaviors = _Pict.providers.DynamicFormSolverBehaviors;

					tmpBehaviors.colorTabularRow('Class', 'Students', 0, '#FF0000', 1);
					let tmpRow0Cells = tmpContainer.querySelectorAll('tr[data-tabular-row-index="0"] td');
					for (let i = 0; i < tmpRow0Cells.length; i++)
					{
						Expect(tmpRow0Cells[i].style.backgroundColor.length).to.be.greaterThan(0, 'row 0 cell colored');
					}
					tmpBehaviors.colorTabularRow('Class', 'Students', 0, '#FF0000', 0);
					for (let i = 0; i < tmpRow0Cells.length; i++)
					{
						Expect(tmpRow0Cells[i].style.backgroundColor).to.equal('', 'row 0 cell cleared with flag 0');
					}

					tmpBehaviors.colorTabularColumn('Class', 'Students', 1, '#00FF00', 1);
					let tmpColumn1 = tmpContainer.querySelectorAll('[data-tabular-column-index="1"]');
					for (let i = 0; i < tmpColumn1.length; i++)
					{
						Expect(tmpColumn1[i].style.backgroundColor.length).to.be.greaterThan(0, 'column 1 cell colored');
					}
				}
				finally
				{
					window.document.body.removeChild(tmpContainer);
				}
			}, fDone);
		});

		test('Solvers return false (no throw) when the section can not be resolved', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor'
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpBehaviors = _Pict.providers.DynamicFormSolverBehaviors;
				Expect(tmpBehaviors.highlightTabularRow('NoSuchSection', 'NoGroup', 0, 1)).to.equal(false);
				Expect(tmpBehaviors.colorTabularColumn('NoSuchSection', 'NoGroup', 0, '#FFF', 1)).to.equal(false);
			}, fDone);
		});
	});

	suite('Tabular row / column selection', () =>
	{
		test('_normalizeSelectionConfig honors true, objects, and disabled', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor'
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				let tmpDefault = tmpLayout._normalizeSelectionConfig(true, 'Default_Addr', 'default-class');
				Expect(tmpDefault).to.be.an('object');
				Expect(tmpDefault.DataAddress).to.equal('Default_Addr');
				Expect(tmpDefault.HighlightClass).to.equal('default-class');

				let tmpCustom = tmpLayout._normalizeSelectionConfig({ DataAddress: 'Custom', HighlightClass: '' }, 'Default_Addr', 'default-class');
				Expect(tmpCustom.DataAddress).to.equal('Custom', 'explicit DataAddress used');
				Expect(tmpCustom.HighlightClass).to.equal('', 'empty HighlightClass disables auto-highlight');

				Expect(tmpLayout._normalizeSelectionConfig(false, 'A', 'B')).to.equal(null, 'false disables');
				Expect(tmpLayout._normalizeSelectionConfig(undefined, 'A', 'B')).to.equal(null, 'undefined disables');
				Expect(tmpLayout._normalizeSelectionConfig({ Enabled: false }, 'A', 'B')).to.equal(null, 'Enabled:false disables');
			}, fDone);
		});

		test('A group with RowSelection / ColumnSelection gets normalized config', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				RowSelection: true,
				ColumnSelection: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpGroup = _Pict.views['PictSectionForm-Class'].sectionDefinition.Groups[0];
				Expect(tmpGroup._RowSelectionConfig).to.be.an('object', 'row selection config present');
				Expect(tmpGroup._RowSelectionConfig.DataAddress).to.equal('Students_RowSelection', 'default row data address');
				Expect(tmpGroup._ColumnSelectionConfig).to.be.an('object', 'column selection config present');
				Expect(tmpGroup._ColumnSelectionConfig.DataAddress).to.equal('Students_ColumnSelection', 'default column data address');
			}, fDone);
		});

		test('A group without selection config has null selection configs', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor'
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpGroup = _Pict.views['PictSectionForm-Class'].sectionDefinition.Groups[0];
				Expect(tmpGroup._RowSelectionConfig).to.equal(null);
				Expect(tmpGroup._ColumnSelectionConfig).to.equal(null);
			}, fDone);
		});

		test('toggleTabularRowSelection writes the selection array into the form data', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				RowSelection: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				// Nothing selected yet.
				Expect(_Pict.AppData.Students_RowSelection == null
					|| _Pict.AppData.Students_RowSelection.length === 0).to.equal(true, 'no selection initially');

				tmpLayout.toggleTabularRowSelection('PictSectionForm-Class', 0, 2, true);
				Expect(Array.isArray(_Pict.AppData.Students_RowSelection)).to.equal(true, 'selection array created in form data');
				Expect(_Pict.AppData.Students_RowSelection[2]).to.equal(true, 'row 2 marked selected');

				tmpLayout.toggleTabularRowSelection('PictSectionForm-Class', 0, 2, false);
				Expect(_Pict.AppData.Students_RowSelection[2]).to.equal(false, 'row 2 deselected');
			}, fDone);
		});

		test('toggleTabularColumnSelection writes the selection array into the form data', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnSelection: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				tmpLayout.toggleTabularColumnSelection('PictSectionForm-Class', 0, 1, true);
				Expect(Array.isArray(_Pict.AppData.Students_ColumnSelection)).to.equal(true, 'column selection array created');
				Expect(_Pict.AppData.Students_ColumnSelection[1]).to.equal(true, 'column 1 marked selected');

				tmpLayout.toggleTabularColumnSelection('PictSectionForm-Class', 0, 1, false);
				Expect(_Pict.AppData.Students_ColumnSelection[1]).to.equal(false, 'column 1 deselected');
			}, fDone);
		});

		test('Custom selection DataAddress is honored', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				RowSelection: { DataAddress: 'MyRowPicks' }
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				tmpLayout.toggleTabularRowSelection('PictSectionForm-Class', 0, 0, true);
				Expect(Array.isArray(_Pict.AppData.MyRowPicks)).to.equal(true, 'selection stored at the custom address');
				Expect(_Pict.AppData.MyRowPicks[0]).to.equal(true);
			}, fDone);
		});

		test('onGroupLayoutInitialize re-applies saved selection highlights after render WITHOUT a solve', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				RowSelection: true,
				ColumnSelection: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];

				// Simulate a loaded/saved form: selection state lives in the form data
				// (row 1 and column 1 checked) but nothing has highlighted the DOM yet.
				_Pict.AppData.Students_RowSelection = [ false, true, false ];
				_Pict.AppData.Students_ColumnSelection = [ false, true ];

				// Build the freshly-rendered table DOM the layout would have produced --
				// no highlight classes on it yet (a render rebuilds the cells from scratch).
				let tmpContainer = window.document.createElement('div');
				tmpContainer.id = `GROUP-${tmpView.formID}-Students`;
				tmpContainer.innerHTML = '<table>'
					+ '<thead><tr><th data-tabular-column-index="0">H0</th><th data-tabular-column-index="1">H1</th></tr></thead>'
					+ '<tbody>'
					+ '<tr data-tabular-row-index="0"><td data-tabular-column-index="0">a</td><td data-tabular-column-index="1">b</td></tr>'
					+ '<tr data-tabular-row-index="1"><td data-tabular-column-index="0">c</td><td data-tabular-column-index="1">d</td></tr>'
					+ '<tr data-tabular-row-index="2"><td data-tabular-column-index="0">e</td><td data-tabular-column-index="1">f</td></tr>'
					+ '</tbody></table>';
				window.document.body.appendChild(tmpContainer);
				try
				{
					// Nothing highlighted before the render-completion hook runs.
					Expect(tmpContainer.querySelectorAll('.pict-tabular-row-highlight').length).to.equal(0, 'no row highlight before init');
					Expect(tmpContainer.querySelectorAll('.pict-tabular-column-highlight').length).to.equal(0, 'no column highlight before init');

					// The view's onAfterRender drives this hook on every render; calling it
					// directly proves highlights are restored by render alone -- no solve, no marshal.
					tmpLayout.onGroupLayoutInitialize(tmpView, tmpGroup);

					let tmpRow1 = tmpContainer.querySelector('tr[data-tabular-row-index="1"]');
					Expect(tmpRow1.classList.contains('pict-tabular-row-highlight')).to.equal(true, 'checked row 1 highlighted after init');
					Expect(tmpContainer.querySelector('tr[data-tabular-row-index="0"]').classList.contains('pict-tabular-row-highlight')).to.equal(false, 'unchecked row 0 not highlighted');
					Expect(tmpContainer.querySelector('tr[data-tabular-row-index="2"]').classList.contains('pict-tabular-row-highlight')).to.equal(false, 'unchecked row 2 not highlighted');

					// Column 1 highlighted across the header and every body cell; column 0 untouched.
					let tmpColumn1 = tmpContainer.querySelectorAll('[data-tabular-column-index="1"].pict-tabular-column-highlight');
					Expect(tmpColumn1.length).to.equal(4, 'header + three body cells of checked column 1 highlighted');
					Expect(tmpContainer.querySelectorAll('[data-tabular-column-index="0"].pict-tabular-column-highlight').length).to.equal(0, 'unchecked column 0 not highlighted');
				}
				finally
				{
					window.document.body.removeChild(tmpContainer);
				}
			}, fDone);
		});
	});

	suite('Tabular column sorting (ColumnSorting)', () =>
	{
		test('ColumnSorting is off by default - no sort state, plain header cell', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor'
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpGroup = _Pict.views['PictSectionForm-Class'].sectionDefinition.Groups[0];
				Expect(tmpGroup._SortState).to.equal(undefined, 'no sort state when ColumnSorting is off');
			}, fDone);
		});

		test('ColumnSorting:true initializes sort state and bakes a sort control into headers', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnSorting: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				Expect(tmpGroup._SortState).to.be.an('object', 'sort state initialized');
				Expect(tmpGroup._SortState.Direction).to.equal('none', 'starts unsorted');

				// The baked prime header carries a clickable sort-control span with a glyph.
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				let tmpDescriptor = tmpGroup.supportingManifest.elementDescriptors[tmpGroup.supportingManifest.elementAddresses[0]];
				let tmpHeaderHTML = tmpLayout._buildSortableHeaderCell(tmpView, tmpGroup, tmpDescriptor, 0);
				Expect(tmpHeaderHTML).to.contain('pict-tabular-sort-control', 'sort control span injected');
				Expect(tmpHeaderHTML).to.contain('sortTabularColumn', 'click handler wired');
				Expect(tmpHeaderHTML).to.contain('<svg', 'svg glyph injected via the icon provider');
			}, fDone);
		});

		test('sortTabularColumn sorts the record set ascending then descending', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnSorting: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				// Column index of the StudentName descriptor.
				let tmpNameIndex = tmpGroup.supportingManifest.elementAddresses.indexOf('StudentName');
				Expect(tmpNameIndex).to.be.greaterThan(-1, 'StudentName column found');

				tmpLayout.sortTabularColumn('PictSectionForm-Class', 0, tmpNameIndex);
				Expect(tmpGroup._SortState.Direction).to.equal('asc', 'first click sorts ascending');
				let tmpNamesAsc = _Pict.AppData.Students.map((pRow) => pRow.StudentName);
				let tmpExpectedAsc = tmpNamesAsc.slice().sort((a, b) => a.localeCompare(b));
				Expect(tmpNamesAsc).to.deep.equal(tmpExpectedAsc, 'records sorted ascending by name');

				tmpLayout.sortTabularColumn('PictSectionForm-Class', 0, tmpNameIndex);
				Expect(tmpGroup._SortState.Direction).to.equal('desc', 'second click toggles to descending');
				let tmpNamesDesc = _Pict.AppData.Students.map((pRow) => pRow.StudentName);
				Expect(tmpNamesDesc).to.deep.equal(tmpExpectedAsc.slice().reverse(), 'records sorted descending by name');
			}, fDone);
		});

		test('_compareTabularValues sorts numbers numerically and strings lexically', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnSorting: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				// Numeric: 9 sorts before 10 (not lexically).
				Expect(tmpLayout._compareTabularValues(9, 10)).to.be.lessThan(0);
				Expect(tmpLayout._compareTabularValues('9', '10')).to.be.lessThan(0);
				Expect(tmpLayout._compareTabularValues(10, 9)).to.be.greaterThan(0);
				// String comparison.
				Expect(tmpLayout._compareTabularValues('apple', 'banana')).to.be.lessThan(0);
				// Null sorts as empty string.
				Expect(tmpLayout._compareTabularValues(null, 'a')).to.be.lessThan(0);
			}, fDone);
		});

		// Regression: a ColumnSorting header must keep its label in lock-step with the
		// descriptor Name. Before the fix, _buildSortableHeaderCell baked the resolved
		// Name as a static string, so a label change applied by a render-only refresh
		// (e.g. DynamicColumns recomputed via refreshtabularsection) never reached the
		// visible header -- only a full rebuildCustomTemplate would. The label is now a
		// metatemplate reference that re-resolves on every render, matching the default
		// (non-sorting) header.
		test('ColumnSorting header label is a dynamic metatemplate reference, not a baked literal', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnSorting: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				let tmpNameIndex = tmpGroup.supportingManifest.elementAddresses.indexOf('StudentName');
				let tmpDescriptor = tmpGroup.supportingManifest.elementDescriptors['StudentName'];
				Expect(tmpDescriptor.Name).to.equal('Student', 'baseline descriptor name');

				let tmpHeaderHTML = tmpLayout._buildSortableHeaderCell(tmpView, tmpGroup, tmpDescriptor, tmpNameIndex);
				// The label is emitted as a metatemplate reference bound to the live descriptor...
				Expect(tmpHeaderHTML).to.contain('-TabularTemplate-HeaderCellLabel', 'label rendered via the dynamic label template');
				Expect(tmpHeaderHTML).to.contain(`getTabularRecordInput("${tmpGroup.GroupIndex}","${tmpNameIndex}")`, 'reference bound to this column descriptor');
				// ...NOT baked as the literal name (which is what caused the stale header).
				Expect(tmpHeaderHTML).to.not.contain('>Student ', 'descriptor name is not inlined as a static literal');
				// The sort control is still baked (it only changes on a sort click, which rebuilds).
				Expect(tmpHeaderHTML).to.contain('pict-tabular-sort-control', 'sort control still present');
				Expect(tmpHeaderHTML).to.contain('sortTabularColumn', 'sort click handler still wired');
			}, fDone);
		});

		test('-TabularTemplate-HeaderCellLabel is registered and resolves the descriptor Name (parity with the default header)', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnSorting: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				// The label template exists under the view's theme prefix and resolves the
				// same {~D:Record.Name~} data tag the default (non-sorting) HeaderCell uses.
				let tmpTemplateHash = tmpView.getThemeSpecificTemplateHash('-TabularTemplate-HeaderCellLabel');
				Expect(tmpTemplateHash in _Pict.TemplateProvider.templates).to.equal(true, 'label template registered');
				// Template entries are stored as raw template strings.
				Expect(_Pict.TemplateProvider.templates[tmpTemplateHash]).to.contain('{~D:Record.Name~}', 'label resolves the descriptor Name dynamically');
			}, fDone);
		});

		test('ColumnSorting header reflects a descriptor Name change on render() without a rebuildCustomTemplate', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnSorting: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				// Target the StudentName column specifically (the StudentEditor manifest
				// also has a Section column at index 0).
				let tmpNameIndex = tmpGroup.supportingManifest.elementAddresses.indexOf('StudentName');
				let tmpHeaderSelector = `th[data-tabular-column-index="${tmpNameIndex}"]`;

				// Render the section into its real destination so we can read the baked header.
				let tmpContainerId = String(tmpView.sectionDefinition.DefaultDestinationAddress || '').replace('#', '');
				let tmpContainer = window.document.createElement('div');
				tmpContainer.id = tmpContainerId;
				window.document.body.appendChild(tmpContainer);
				try
				{
					tmpView.render();
					let tmpHeader = tmpContainer.querySelector(tmpHeaderSelector);
					Expect(tmpHeader).to.not.equal(null, 'a sortable header cell rendered');
					Expect(tmpHeader.textContent).to.contain('Student', 'header shows the original descriptor name');

					// Simulate what a render-only refresh (refreshtabularsection / DynamicColumns
					// name recompute) does: the live descriptor's Name changes, then render() runs
					// WITHOUT rebuildCustomTemplate(). The header must follow.
					tmpGroup.supportingManifest.elementDescriptors['StudentName'].Name = 'Aggregate Base';
					tmpView.render();

					let tmpHeaderAfter = tmpContainer.querySelector(tmpHeaderSelector);
					Expect(tmpHeaderAfter.textContent).to.contain('Aggregate Base', 'header updated to the new name on render alone');
					Expect(tmpHeaderAfter.textContent).to.not.contain('Student', 'stale label no longer shown');
				}
				finally
				{
					window.document.body.removeChild(tmpContainer);
				}
			}, fDone);
		});
	});

	suite('Tabular column chooser (ColumnChooser)', () =>
	{
		test('ColumnChooser is off by default - no config, no chooser markup in the baked template', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor'
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				Expect(tmpGroup._ColumnChooserConfig).to.equal(null, 'no chooser config when not opted in');
				let tmpTemplate = tmpLayout.generateGroupLayoutTemplate(tmpView, tmpGroup);
				Expect(tmpTemplate).to.not.contain('pict-tabular-colchooser', 'no chooser markup baked');
			}, fDone);
		});

		test('ColumnChooser:true normalizes config and bakes the trigger bar above the table', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnChooser: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				Expect(tmpGroup._ColumnChooserConfig).to.be.an('object', 'chooser config normalized');
				Expect(tmpGroup._ColumnChooserConfig.DataAddress).to.equal('Students_HiddenColumns', 'default data address');
				Expect(tmpGroup._ColumnChooserConfig.ButtonLabel).to.equal('Columns', 'default button label');
				let tmpTemplate = tmpLayout.generateGroupLayoutTemplate(tmpView, tmpGroup);
				Expect(tmpTemplate).to.contain('pict-tabular-colchooser-trigger', 'trigger button baked');
				Expect(tmpTemplate).to.contain('toggleTabularColumnChooser', 'open handler wired');
				Expect(tmpTemplate.indexOf('pict-tabular-colchooser-bar')).to.be.lessThan(tmpTemplate.indexOf('TabularTemplate'), 'bar baked above the table container');
			}, fDone);
		});

		test('_getTabularChoosableColumns lists static columns with visibility, skipping TabularHidden', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnChooser: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				let tmpColumns = tmpLayout._getTabularChoosableColumns(tmpView, tmpGroup);
				Expect(tmpColumns).to.be.an('array').with.length(2, 'both static columns choosable');
				Expect(tmpColumns[0].Key).to.equal('Section');
				Expect(tmpColumns[0].Name).to.equal('Section');
				Expect(tmpColumns[0].Visible).to.equal(true, 'nothing hidden initially');
				Expect(tmpColumns[1].ColumnIndex).to.equal(1, 'manifest index carried');
			}, fDone);
		});

		test('toggleTabularColumnVisibility hides a column: form data written, template re-baked without it, record data untouched', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnChooser: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];

				// StudentName is manifest index 1; cell/header references address it as ("0","1").
				let tmpNameIndex = tmpGroup.supportingManifest.elementAddresses.indexOf('StudentName');
				Expect(tmpNameIndex).to.equal(1);
				Expect(tmpLayout.generateGroupLayoutTemplate(tmpView, tmpGroup)).to.contain(`getTabularRecordInput("0","1")`, 'column baked before hiding');

				tmpLayout.toggleTabularColumnVisibility('PictSectionForm-Class', 0, tmpNameIndex, false);
				Expect(_Pict.AppData.Students_HiddenColumns).to.deep.equal(['StudentName'], 'hidden hash persisted in the form data');
				Expect(tmpLayout.generateGroupLayoutTemplate(tmpView, tmpGroup)).to.not.contain(`getTabularRecordInput("0","1")`, 'hidden column not baked');
				Expect(_Pict.AppData.Students[0].StudentName).to.equal('Alice', 'hiding never touches record data');

				tmpLayout.toggleTabularColumnVisibility('PictSectionForm-Class', 0, tmpNameIndex, true);
				Expect(_Pict.AppData.Students_HiddenColumns).to.deep.equal([], 'showing removes the hash');
				Expect(tmpLayout.generateGroupLayoutTemplate(tmpView, tmpGroup)).to.contain(`getTabularRecordInput("0","1")`, 'column baked again');
			}, fDone);
		});

		test('The last visible column cannot be hidden', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnChooser: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				Expect(tmpLayout.toggleTabularColumnVisibility('PictSectionForm-Class', 0, 0, false)).to.equal(true, 'first column hides fine');
				Expect(tmpLayout.toggleTabularColumnVisibility('PictSectionForm-Class', 0, 1, false)).to.equal(false, 'last visible column refused');
				Expect(_Pict.AppData.Students_HiddenColumns).to.deep.equal(['Section'], 'refused hide not persisted');
			}, fDone);
		});

		test('TabularDefaultHidden starts a column hidden WITHOUT writing form data; showing it writes explicit state', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnChooser: true
			});
			// Flag StudentName as hidden-by-default in the reference manifest.
			App.default_configuration.pict_configuration.DefaultFormManifest.ReferenceManifests.StudentEditor.Descriptors.StudentName.PictForm.TabularDefaultHidden = true;
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];

				Expect(_Pict.AppData.Students_HiddenColumns).to.equal(undefined, 'defaults do not pollute the form data');
				let tmpColumns = tmpLayout._getTabularChoosableColumns(tmpView, tmpGroup);
				Expect(tmpColumns[1].Visible).to.equal(false, 'StudentName hidden by default');
				Expect(tmpLayout.generateGroupLayoutTemplate(tmpView, tmpGroup)).to.not.contain(`getTabularRecordInput("0","1")`, 'default-hidden column not baked');
				Expect(tmpLayout._buildTabularColumnChooserBarHTML(tmpView, tmpGroup)).to.contain('(1 hidden)', 'trigger hints at hidden columns');

				tmpLayout.toggleTabularColumnVisibility('PictSectionForm-Class', 0, 1, true);
				Expect(_Pict.AppData.Students_HiddenColumns).to.deep.equal([], 'user interaction writes explicit (empty) hidden state');
				Expect(tmpLayout._getTabularChoosableColumns(tmpView, tmpGroup)[1].Visible).to.equal(true, 'column shown');
			}, fDone);
		});

		test('Group-level DefaultHiddenColumns + reset restores the configured defaults', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnChooser: { DefaultHiddenColumns: ['Section'] }
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];

				Expect(tmpLayout._getTabularChoosableColumns(tmpView, tmpGroup)[0].Visible).to.equal(false, 'Section hidden by config default');

				// User shows Section and hides StudentName, then resets.
				tmpLayout.toggleTabularColumnVisibility('PictSectionForm-Class', 0, 0, true);
				tmpLayout.toggleTabularColumnVisibility('PictSectionForm-Class', 0, 1, false);
				Expect(_Pict.AppData.Students_HiddenColumns).to.deep.equal(['StudentName']);

				tmpLayout.resetTabularColumnVisibility('PictSectionForm-Class', 0);
				Expect(_Pict.AppData.Students_HiddenColumns).to.deep.equal(['Section'], 'reset writes the configured default set');
				Expect(tmpLayout._getTabularChoosableColumns(tmpView, tmpGroup)[0].Visible).to.equal(false, 'Section hidden again');
			}, fDone);
		});

		test('Custom chooser DataAddress is honored', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnChooser: { DataAddress: 'MyColumnPrefs', ButtonLabel: 'Pick Columns' }
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				tmpLayout.toggleTabularColumnVisibility('PictSectionForm-Class', 0, 0, false);
				Expect(_Pict.AppData.MyColumnPrefs).to.deep.equal(['Section'], 'hidden set stored at the custom address');
				Expect(tmpLayout._buildTabularColumnChooserBarHTML(tmpView, tmpGroup)).to.contain('Pick Columns', 'custom button label baked');
			}, fDone);
		});

		test('Loaded form data with a different hidden set triggers a rebuild on marshal (reload restoration)', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnChooser: true
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];

				Expect(tmpGroup._ColumnChooserBakedStateKey).to.equal('', 'baked with nothing hidden');

				// Simulate the host loading saved form data that carries hidden-column state.
				_Pict.AppData.Students_HiddenColumns = ['StudentName'];
				tmpLayout.onDataMarshalToForm(tmpView, tmpGroup);

				Expect(tmpGroup._ColumnChooserBakedStateKey).to.equal('StudentName', 'marshal detected the difference and re-baked');
				Expect(tmpLayout.generateGroupLayoutTemplate(tmpView, tmpGroup)).to.not.contain(`getTabularRecordInput("0","1")`, 'loaded hidden state applied to the table');

				// Steady state: marshalling again with unchanged data must not flag a rebuild.
				let tmpBakedKeyBefore = tmpGroup._ColumnChooserBakedStateKey;
				tmpLayout.onDataMarshalToForm(tmpView, tmpGroup);
				Expect(tmpGroup._ColumnChooserBakedStateKey).to.equal(tmpBakedKeyBefore, 'no rebuild churn in steady state');
			}, fDone);
		});

		test('Stacked header ColumnSpans shrink to cover only visible columns', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Students',
				Layout: 'Tabular',
				RecordSetAddress: 'Students',
				RecordManifest: 'StudentEditor',
				ColumnChooser: true,
				Headers:
				[
					[ { Label: 'Roster', ColumnSpan: 2 } ]
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];
				Expect(tmpGroup.ExpandedHeaders[0][0].ColumnSpan).to.equal(2, 'full span with everything visible');

				tmpLayout.toggleTabularColumnVisibility('PictSectionForm-Class', 0, 1, false);
				Expect(tmpGroup.ExpandedHeaders[0][0].ColumnSpan).to.equal(1, 'span shrinks past the hidden column');

				tmpLayout.toggleTabularColumnVisibility('PictSectionForm-Class', 0, 1, true);
				Expect(tmpGroup.ExpandedHeaders[0][0].ColumnSpan).to.equal(2, 'span restored when the column returns');
			}, fDone);
		});

		test('Dynamic columns are choosable and persist by their generated hash', (fDone) =>
		{
			let App = makeApplication({
				Hash: 'Grades',
				Layout: 'Tabular',
				RecordSetAddress: 'Grades',
				RecordManifest: 'GradeRowEditor',
				ColumnChooser: true,
				DynamicColumns:
				[
					{
						SourceAddress: 'Assignments',
						HashTemplate: 'Grade_{~D:Record.IDAssignment~}',
						NameTemplate: '{~D:Record.Title~}',
						InformaryDataAddressTemplate: 'Grades.{~D:Record.IDAssignment~}',
						DataType: 'Number',
						PictForm: { InputType: 'Number' }
					}
				]
			});
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];

				// Resolve the dynamic columns (the marshal cycle does this in a live app).
				tmpLayout.onDataMarshalToForm(tmpView, tmpGroup);
				let tmpColumns = tmpLayout._getTabularChoosableColumns(tmpView, tmpGroup);
				let tmpDynamicColumn = tmpColumns.find((pColumn) => pColumn.Key === 'Grade_2');
				Expect(tmpDynamicColumn).to.be.an('object', 'generated column is choosable');
				Expect(tmpDynamicColumn.Name).to.equal('Photosynthesis', 'display name from NameTemplate');

				tmpLayout.toggleTabularColumnVisibility('PictSectionForm-Class', 0, tmpDynamicColumn.ColumnIndex, false);
				Expect(_Pict.AppData.Grades_HiddenColumns).to.deep.equal(['Grade_2'], 'dynamic column persisted by generated hash');
				Expect(_Pict.AppData.Grades[0].Grades['2']).to.equal(88, 'hidden dynamic column data untouched');
			}, fDone);
		});
	});
});
