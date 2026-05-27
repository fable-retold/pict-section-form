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
	tmpManifest.Sections[0].Groups = Array.isArray(pGroupConfig) ? pGroupConfig : [ pGroupConfig ];
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

		test('Pre-seeded row selection re-applies the highlight class on marshal (reload case)', (fDone) =>
		{
			// Simulate a form reload: AppData already contains a selection array (from a prior
			// save) before the table is ever rendered. After the table DOM exists and
			// onDataMarshalToForm fires, every selected row should carry the highlight class.
			let App = makeApplication(
				{
					Hash: 'Students',
					Layout: 'Tabular',
					RecordSetAddress: 'Students',
					RecordManifest: 'StudentEditor',
					RowSelection: true
				},
				{ Students_RowSelection: [ true, false, true, false, false ] });
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];

				// Build the table DOM the reapply will target. Mirrors the real layout's
				// markup -- a group container with rows tagged by data-tabular-row-index.
				let tmpContainer = window.document.createElement('div');
				tmpContainer.id = `GROUP-${tmpView.formID}-Students`;
				tmpContainer.innerHTML = '<table><tbody>'
					+ '<tr data-tabular-row-index="0"><td>a</td></tr>'
					+ '<tr data-tabular-row-index="1"><td>b</td></tr>'
					+ '<tr data-tabular-row-index="2"><td>c</td></tr>'
					+ '<tr data-tabular-row-index="3"><td>d</td></tr>'
					+ '<tr data-tabular-row-index="4"><td>e</td></tr>'
					+ '</tbody></table>';
				window.document.body.appendChild(tmpContainer);
				try
				{
					// Fire the marshal-to-form lifecycle, the same hook a real reload runs through.
					tmpLayout.onDataMarshalToForm(tmpView, tmpGroup);

					let tmpRows = tmpContainer.querySelectorAll('tr[data-tabular-row-index]');
					Expect(tmpRows[0].classList.contains('pict-tabular-row-highlight')).to.equal(true, 'row 0 highlighted from persisted selection');
					Expect(tmpRows[1].classList.contains('pict-tabular-row-highlight')).to.equal(false, 'row 1 not selected, no highlight');
					Expect(tmpRows[2].classList.contains('pict-tabular-row-highlight')).to.equal(true, 'row 2 highlighted from persisted selection');
					Expect(tmpRows[3].classList.contains('pict-tabular-row-highlight')).to.equal(false, 'row 3 not selected, no highlight');
					Expect(tmpRows[4].classList.contains('pict-tabular-row-highlight')).to.equal(false, 'row 4 not selected, no highlight');
				}
				finally
				{
					window.document.body.removeChild(tmpContainer);
				}
			}, fDone);
		});

		test('Pre-seeded column selection re-applies the highlight class on marshal (reload case)', (fDone) =>
		{
			let App = makeApplication(
				{
					Hash: 'Students',
					Layout: 'Tabular',
					RecordSetAddress: 'Students',
					RecordManifest: 'StudentEditor',
					ColumnSelection: true
				},
				{ Students_ColumnSelection: [ false, true ] });
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];

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
					tmpLayout.onDataMarshalToForm(tmpView, tmpGroup);

					let tmpColumn0 = tmpContainer.querySelectorAll('[data-tabular-column-index="0"]');
					let tmpColumn1 = tmpContainer.querySelectorAll('[data-tabular-column-index="1"]');
					for (let i = 0; i < tmpColumn0.length; i++)
					{
						Expect(tmpColumn0[i].classList.contains('pict-tabular-column-highlight')).to.equal(false, 'column 0 not selected, no highlight');
					}
					for (let i = 0; i < tmpColumn1.length; i++)
					{
						Expect(tmpColumn1[i].classList.contains('pict-tabular-column-highlight')).to.equal(true, 'column 1 highlighted from persisted selection');
					}
				}
				finally
				{
					window.document.body.removeChild(tmpContainer);
				}
			}, fDone);
		});

		test('onGroupLayoutInitialize re-applies row highlights so re-renders without a marshal still restore state', (fDone) =>
		{
			// The form-view onAfterRender hook calls runLayoutProviderFunctions('onGroupLayoutInitialize').
			// A render path that does NOT subsequently trigger onDataMarshalToForm (e.g. when a parent
			// re-renders the section after data is already in AppData) would otherwise leave the
			// table without highlights even though the checkbox `checked` attributes are baked in.
			let App = makeApplication(
				{
					Hash: 'Students',
					Layout: 'Tabular',
					RecordSetAddress: 'Students',
					RecordManifest: 'StudentEditor',
					RowSelection: true
				},
				{ Students_RowSelection: [ false, true, false ] });
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];

				let tmpContainer = window.document.createElement('div');
				tmpContainer.id = `GROUP-${tmpView.formID}-Students`;
				tmpContainer.innerHTML = '<table><tbody>'
					+ '<tr data-tabular-row-index="0"><td>a</td></tr>'
					+ '<tr data-tabular-row-index="1"><td>b</td></tr>'
					+ '<tr data-tabular-row-index="2"><td>c</td></tr>'
					+ '</tbody></table>';
				window.document.body.appendChild(tmpContainer);
				try
				{
					Expect(tmpLayout.onGroupLayoutInitialize).to.be.a('function', 'tabular layout exposes onGroupLayoutInitialize so post-render reapply runs');
					tmpLayout.onGroupLayoutInitialize(tmpView, tmpGroup);

					let tmpRows = tmpContainer.querySelectorAll('tr[data-tabular-row-index]');
					Expect(tmpRows[0].classList.contains('pict-tabular-row-highlight')).to.equal(false, 'row 0 not selected, no highlight after layout init');
					Expect(tmpRows[1].classList.contains('pict-tabular-row-highlight')).to.equal(true, 'row 1 highlighted from persisted selection after layout init');
					Expect(tmpRows[2].classList.contains('pict-tabular-row-highlight')).to.equal(false, 'row 2 not selected, no highlight after layout init');
				}
				finally
				{
					window.document.body.removeChild(tmpContainer);
				}
			}, fDone);
		});

		test('runLayoutProviderFunctions dispatches per-group attributes (not always element[0])', (fDone) =>
		{
			// Regression for an indexing bug where the loop body in
			// Pict-View-DynamicForm.runLayoutProviderFunctions read
			// `tmpLayoutProviders[0]` instead of `tmpLayoutProviders[i]`.
			// Symptom: every iteration looked like it was for group 0, so the
			// transaction-tracking dedup at the bottom of the loop treated every
			// iteration as the same event and skipped all but the first one.
			// Net effect: only the first group per section ever got its
			// per-group lifecycle hooks (onDataMarshalToForm, onGroupLayoutInitialize, ...).
			//
			// The test builds a section with three tabular groups, plants the
			// matching `[data-i-pictdynamiclayout="true"]` placeholder DOM, and
			// asserts that runLayoutProviderFunctions reaches each group exactly once
			// with the correct group hash.
			let App = makeApplication([
				{ Hash: 'GroupA', Layout: 'Tabular', RecordSetAddress: 'Students', RecordManifest: 'StudentEditor' },
				{ Hash: 'GroupB', Layout: 'Tabular', RecordSetAddress: 'Students', RecordManifest: 'StudentEditor' },
				{ Hash: 'GroupC', Layout: 'Tabular', RecordSetAddress: 'Students', RecordManifest: 'StudentEditor' }
			]);
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];

				let tmpRoot = window.document.createElement('div');
				tmpRoot.id = tmpView.sectionDefinition.DefaultDestinationAddress.replace(/^#/, '');
				tmpRoot.innerHTML =
					'<div data-i-pictdynamiclayout="true" data-i-pictgroupindex="0" data-i-pictlayout="Tabular" id="layout-0"></div>'
					+ '<div data-i-pictdynamiclayout="true" data-i-pictgroupindex="1" data-i-pictlayout="Tabular" id="layout-1"></div>'
					+ '<div data-i-pictdynamiclayout="true" data-i-pictgroupindex="2" data-i-pictlayout="Tabular" id="layout-2"></div>';
				window.document.body.appendChild(tmpRoot);

				let tmpSeenGroupHashes = [];
				let tmpOriginalHook = tmpLayout.onGroupLayoutInitialize;
				tmpLayout.onGroupLayoutInitialize = function (pView, pGroup)
				{
					tmpSeenGroupHashes.push(pGroup && pGroup.Hash);
					return true;
				};
				try
				{
					tmpView.runLayoutProviderFunctions('onGroupLayoutInitialize');

					Expect(tmpSeenGroupHashes).to.deep.equal(['GroupA', 'GroupB', 'GroupC'], 'hook fires once per group, in DOM order, with the per-element group hash');
				}
				finally
				{
					tmpLayout.onGroupLayoutInitialize = tmpOriginalHook;
					window.document.body.removeChild(tmpRoot);
				}
			}, fDone);
		});

		test('onGroupLayoutInitialize re-applies column highlights too', (fDone) =>
		{
			let App = makeApplication(
				{
					Hash: 'Students',
					Layout: 'Tabular',
					RecordSetAddress: 'Students',
					RecordManifest: 'StudentEditor',
					ColumnSelection: true
				},
				{ Students_ColumnSelection: [ true, false ] });
			bootstrap(App, (_Pict) =>
			{
				let tmpView = _Pict.views['PictSectionForm-Class'];
				let tmpGroup = tmpView.sectionDefinition.Groups[0];
				let tmpLayout = _Pict.providers['Pict-Layout-Tabular'];

				let tmpContainer = window.document.createElement('div');
				tmpContainer.id = `GROUP-${tmpView.formID}-Students`;
				tmpContainer.innerHTML = '<table>'
					+ '<thead><tr><th data-tabular-column-index="0">H0</th><th data-tabular-column-index="1">H1</th></tr></thead>'
					+ '<tbody>'
					+ '<tr data-tabular-row-index="0"><td data-tabular-column-index="0">a</td><td data-tabular-column-index="1">b</td></tr>'
					+ '</tbody></table>';
				window.document.body.appendChild(tmpContainer);
				try
				{
					tmpLayout.onGroupLayoutInitialize(tmpView, tmpGroup);

					let tmpColumn0 = tmpContainer.querySelectorAll('[data-tabular-column-index="0"]');
					let tmpColumn1 = tmpContainer.querySelectorAll('[data-tabular-column-index="1"]');
					for (let i = 0; i < tmpColumn0.length; i++)
					{
						Expect(tmpColumn0[i].classList.contains('pict-tabular-column-highlight')).to.equal(true, 'column 0 highlighted from persisted selection');
					}
					for (let i = 0; i < tmpColumn1.length; i++)
					{
						Expect(tmpColumn1[i].classList.contains('pict-tabular-column-highlight')).to.equal(false, 'column 1 not selected, no highlight');
					}
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
	});
});
