/*
	Unit tests for PictSectionForm Basic

*/

// This is temporary, but enables unit tests
const libBrowserEnv = require('browser-env')
libBrowserEnv();

const libPictView = require('pict-view');

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');

const libPictSectionForm = require('../source/Pict-Section-Form.js');

const manifestPostcard = require('../example_applications/postcard_example/providers/PictProvider-Dynamic-Sections-MockServerResponse.json');

class DoNothingApplication extends libPictSectionForm.PictFormApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.pict.addView('DoNothingView', {}, DoNothingView);
	}

	/**
	 * @param {function} fDone - Callback that finishes the test
	 */
	set testDone(fDone)
	{
		this._testDone = fDone;
	}

	onAfterInitialize()
	{
		this.solve();
		this._testDone();
		return true;
	}
}

class DoNothingView extends libPictView
{
	constructor(pict, configuration)
	{
		super(pict, configuration);
	}
}

class OrderedSolverApplication extends DoNothingApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		this.pict.AppData.A = '5';
		this.pict.AppData.B = '3';
	}

	onAfterSolve()
	{
		super.onAfterSolve();
		this.pict.log.info('OrderedSolverApplication onAfterSolve called.');
		this._testDone?.();
		return true;
	}

	onAfterInitialize()
	{
		return true;
	}
}

OrderedSolverApplication.default_configuration.pict_configuration.DefaultFormManifest =
{
	Scope: 'OrderedSolverApplicationForm',
	Descriptors: {},
	Sections:
	[
		{
			Name: 'Ordered Solver Section',
			Hash: 'OrderedSolverSection',
			Solvers:
			[
				{ Ordinal: 5, Expression: 'C = A + B' },
				{ Ordinal: 40, Expression: 'D = C - B' },
				'hidesections("OrderedSolverSection")',
			],
		},
	],
};

class CrossScopeSolverApplication extends DoNothingApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
	}

	onAfterSolve()
	{
		super.onAfterSolve();
		this._testDone?.();
	}

	onAfterInitialize()
	{
	}
}

CrossScopeSolverApplication.default_configuration = JSON.parse(JSON.stringify(CrossScopeSolverApplication.default_configuration));
CrossScopeSolverApplication.default_configuration.pict_configuration.DefaultFormManifest =
{
	Scope: 'CrossScopeSolverForm',
	Sections:
	[
		{
			Hash: 'Config',
			Name: 'Configuration',
		},
		{
			Hash: 'Items',
			Name: 'Line Items',
			Groups:
			[
				{
					Hash: 'ItemList',
					Name: 'Item List',
					Layout: 'Tabular',
					RecordSetAddress: 'Items.ItemList',
					RecordManifest: 'ItemEditor',
					RecordSetSolvers:
					[
						'LineTotal = Qty * Price',
					],
				},
			],
			Solvers:
			[
				{ Ordinal: 2, Expression: 'Summary.TotalCost = SUM(ItemLineTotals)' },
				{ Ordinal: 2, Expression: 'Summary.ItemCount = COUNT(ItemList)' },
			],
		},
		{
			Hash: 'Results',
			Name: 'Cross-Scope Results',
			Solvers:
			[
				// Happy path: all 4 cross-scope functions
				{ Ordinal: 3, Expression: 'Results.GlobalTaxRate = getGlobalFormData("TaxRate")' },
				{ Ordinal: 3, Expression: 'Results.GlobalTotalCost = resolveGlobalFormData("Summary.TotalCost")' },
				{ Ordinal: 3, Expression: 'Results.SectionTotalCost = getSectionFormData("Items", "TotalCost")' },
				{ Ordinal: 3, Expression: 'Results.FirstItemName = getSectionTabularFormData("Items", "ItemList", 0, "ItemName")' },
				{ Ordinal: 3, Expression: 'Results.FirstItemTotal = getSectionTabularFormData("Items", "ItemList", 0, "LineTotal")' },
				// Undefined guards with IF: invalid lookups
				{ Ordinal: 3, Expression: 'Results.BadSectionGuard = IF(getSectionFormData("NonExistent", "TotalCost"), "==", 0, 1, 0)' },
				{ Ordinal: 3, Expression: 'Results.BadTabularGuard = IF(getSectionTabularFormData("Items", "ItemList", 99, "ItemName"), "==", 0, 1, 0)' },
				{ Ordinal: 3, Expression: 'Results.BadGroupGuard = IF(getSectionTabularFormData("Items", "FakeGroup", 0, "ItemName"), "==", 0, 1, 0)' },
				// Undefined guard with IF: valid lookup
				{ Ordinal: 3, Expression: 'Results.GoodValueGuard = IF(getGlobalFormData("TaxRate"), ">", 0, 1, 0)' },
			],
		},
		{
			Hash: 'Summary',
			Name: 'Summary',
		},
	],
	Descriptors:
	{
		'TaxRate':
		{
			Name: 'Tax Rate',
			Hash: 'TaxRate',
			DataType: 'Number',
			Default: 10,
			PictForm: { Section: 'Config' },
		},
		'Items.ItemList':
		{
			Name: 'Item List',
			Hash: 'ItemList',
			DataType: 'Array',
			Default:
			[
				{ ItemName: 'Alpha', Qty: 5, Price: 10, LineTotal: 50 },
				{ ItemName: 'Beta', Qty: 3, Price: 20, LineTotal: 60 },
				{ ItemName: 'Gamma', Qty: 10, Price: 5, LineTotal: 50 },
			],
			PictForm: { Section: 'Items', Group: 'ItemList' },
		},
		'Items.ItemList[].LineTotal':
		{
			Hash: 'ItemLineTotals',
		},
		'Summary.TotalCost':
		{
			Name: 'Total Cost',
			Hash: 'TotalCost',
			DataType: 'Number',
			PictForm: { Section: 'Summary' },
		},
		'Summary.ItemCount':
		{
			Name: 'Item Count',
			Hash: 'ItemCount',
			DataType: 'Number',
			PictForm: { Section: 'Summary' },
		},
		'Results.GlobalTaxRate':
		{
			Name: 'Global Tax Rate',
			Hash: 'GlobalTaxRate',
			DataType: 'Number',
			PictForm: { Section: 'Results' },
		},
		'Results.GlobalTotalCost':
		{
			Name: 'Global Total Cost',
			Hash: 'GlobalTotalCost',
			DataType: 'Number',
			PictForm: { Section: 'Results' },
		},
		'Results.SectionTotalCost':
		{
			Name: 'Section Total Cost',
			Hash: 'SectionTotalCost',
			DataType: 'Number',
			PictForm: { Section: 'Results' },
		},
		'Results.FirstItemName':
		{
			Name: 'First Item Name',
			Hash: 'FirstItemName',
			DataType: 'String',
			PictForm: { Section: 'Results' },
		},
		'Results.FirstItemTotal':
		{
			Name: 'First Item Total',
			Hash: 'FirstItemTotal',
			DataType: 'Number',
			PictForm: { Section: 'Results' },
		},
		'Results.BadSectionGuard':
		{
			Name: 'Bad Section Guard',
			Hash: 'BadSectionGuard',
			DataType: 'Number',
			PictForm: { Section: 'Results' },
		},
		'Results.BadTabularGuard':
		{
			Name: 'Bad Tabular Guard',
			Hash: 'BadTabularGuard',
			DataType: 'Number',
			PictForm: { Section: 'Results' },
		},
		'Results.BadGroupGuard':
		{
			Name: 'Bad Group Guard',
			Hash: 'BadGroupGuard',
			DataType: 'Number',
			PictForm: { Section: 'Results' },
		},
		'Results.GoodValueGuard':
		{
			Name: 'Good Value Guard',
			Hash: 'GoodValueGuard',
			DataType: 'Number',
			PictForm: { Section: 'Results' },
		},
	},
	ReferenceManifests:
	{
		ItemEditor:
		{
			Scope: 'ItemEditor',
			Descriptors:
			{
				'ItemName':
				{
					Name: 'Item Name',
					Hash: 'ItemName',
					DataType: 'String',
					Default: '(new item)',
					PictForm: { Section: 'Items', Group: 'ItemList' },
				},
				'Qty':
				{
					Name: 'Qty',
					Hash: 'Qty',
					DataType: 'Number',
					Default: 1,
					PictForm: { Section: 'Items', Group: 'ItemList' },
				},
				'Price':
				{
					Name: 'Price',
					Hash: 'Price',
					DataType: 'Number',
					Default: 0,
					PictForm: { Section: 'Items', Group: 'ItemList' },
				},
				'LineTotal':
				{
					Name: 'Line Total',
					Hash: 'LineTotal',
					DataType: 'Number',
					PictForm: { Section: 'Items', Group: 'ItemList' },
				},
			},
		},
	},
};

suite
(
	'PictSectionForm Basic',
	() =>
	{
		setup(() => { });

		suite
			(
				'Basic Basic Tests',
				() =>
				{
					test(
							'Basic Initialization',
							(fDone) =>
							{
								let _Pict = new libPict();
								_Pict.LogNoisiness = 1;
								let _PictEnvironment = new libPict.EnvironmentObject(_Pict);


								// The pict view hash
								let tmpViewHash = `PictSectionForm-${manifestPostcard.Sections[0].Hash}`;
								// The configuration is generally pulled from tne manyfest manifest Section array
								let tmpViewConfiguration = JSON.parse(JSON.stringify(manifestPostcard.Sections[0]));

								tmpViewConfiguration.Manifests = { Section: manifestPostcard };

								_Pict.addAndInstantiateSingletonService('PictDynamicFormDependencyManager', libPictSectionForm.PictDynamicFormDependencyManager.default_configuration, libPictSectionForm.PictDynamicFormDependencyManager);

								let _PictSectionForm = _Pict.addView(tmpViewHash, tmpViewConfiguration, libPictSectionForm);

								Expect(_PictSectionForm).to.be.an('object');

								// Test package anthropology
								Expect(_PictSectionForm._PackageFableServiceProvider).to.be.an('object', 'Fable should have a _PackageFableServiceProvider object.');
								Expect(_PictSectionForm._PackageFableServiceProvider.name).equal('fable-serviceproviderbase', 'Fable _PackageFableServiceProvider.package.name should be set.');
								Expect(_PictSectionForm._PackagePictView).to.be.an('object', 'Should have a _PackagePictView object.');
								Expect(_PictSectionForm._PackagePictView.name).to.equal('pict-view', '_PackagePictView.package.name should be set.');
								Expect(_PictSectionForm._Package).to.be.an('object', 'Should have a _Package object.');
								Expect(_PictSectionForm._Package.name).to.equal('pict-section-form', '_Package.package.name should be set.');

								return fDone();
							}
						);
					});
		suite
			(
				'Solver Tests',
				() =>
				{
					test(
							'No-Op Solve',
							(fDone) =>
							{
								//NOTE: code is a clone of Pict.safeLoadPictApplication
								let _Pict;
								if (DoNothingApplication && ('default_configuration' in DoNothingApplication) && ('pict_configuration' in DoNothingApplication.default_configuration))
								{
									_Pict = new libPict(DoNothingApplication.default_configuration.pict_configuration);
								}
								else
								{
									_Pict = new libPict();
								}

								_Pict.LogNoisiness = 1;

								let tmpApplicationHash = 'DefaultApplication';
								let tmpDefaultConfiguration = {};

								if ('default_configuration' in DoNothingApplication)
								{
									tmpDefaultConfiguration = DoNothingApplication.default_configuration;

									if ('Hash' in DoNothingApplication.default_configuration)
									{
										tmpDefaultConfiguration = DoNothingApplication.default_configuration;
										tmpApplicationHash = DoNothingApplication.default_configuration.Hash;
									}
								}
								_Pict.log.info(`Loading the pict application [${tmpApplicationHash}] and associated views.`);

								_Pict.addApplication(tmpApplicationHash, tmpDefaultConfiguration, DoNothingApplication);

								_Pict.PictApplication.testDone = fDone;

								_Pict.PictApplication.initializeAsync(
									function (pError)
									{
										if (pError)
										{
											console.log('Error initializing the pict application: '+pError)
										}
										_Pict.log.info('Loading the Application and associated views.');
									});
							}
						);
					test(
							'Distinct Array Test',
							(fDone) =>
							{
								//NOTE: code is a clone of Pict.safeLoadPictApplication
								let _Pict;
								const tmpApplicationClass = OrderedSolverApplication;
								if (tmpApplicationClass && ('default_configuration' in tmpApplicationClass) && ('pict_configuration' in tmpApplicationClass.default_configuration))
								{
									_Pict = new libPict(tmpApplicationClass.default_configuration.pict_configuration);
								}
								else
								{
									_Pict = new libPict();
								}

								//_Pict.LogNoisiness = 0;

								let tmpApplicationHash = 'DefaultApplication';
								let tmpDefaultConfiguration = {};

								if ('default_configuration' in tmpApplicationClass)
								{
									tmpDefaultConfiguration = tmpApplicationClass.default_configuration;

									if ('Hash' in tmpApplicationClass.default_configuration)
									{
										tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
										tmpApplicationHash = tmpApplicationClass.default_configuration.Hash;
									}
								}
								_Pict.log.info(`Loading the pict application [${tmpApplicationHash}] and associated views.`);

								_Pict.addApplication(tmpApplicationHash, tmpDefaultConfiguration, tmpApplicationClass);

								// Add the pict form service
								_Pict.addServiceType('PictSectionForm', libPictSectionForm);

								// Add the pict form metacontroller service, which provides programmaatic view construction from manifests and render/marshal methods.
								_Pict.addView('PictFormMetacontroller', {}, libPictSectionForm.PictFormMetacontroller);

								const tmpManifest =
								{
									Scope: 'OrderedSolverApplicationForm',
									Descriptors:
									{
										DataTableAddress:
										{
											Hash: 'DataTable',
											Name: 'Data Table',
											DataAddress: 'DataTableAddress',
											DataType: 'Array',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										'DataTableAddress[].ValueAddress':
										{
											Hash: 'ValueArray',
											Name: 'Data Value',
											DataAddress: 'DataTableAddress[].ValueAddress',
											DataType: 'Array',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										AggregateValueAddress:
										{
											Hash: 'AggregateValue',
											Name: 'Aggregate Value',
											DataAddress: 'AggregateValueAddress',
											DataType: 'PreciseNumber',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										AggregateValueAddress2:
										{
											Hash: 'AggregateValue2',
											Name: 'Aggregate Value 2',
											DataAddress: 'AggregateValueAddress2',
											DataType: 'PreciseNumber',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
									},
									Sections:
									[
										{
											Name: 'Ordered Solver Section',
											Hash: 'OrderedSolverSection',
											Solvers:
											[
												{ Ordinal: 5, Expression: 'AggregateValue = SUM(ValueArray)' },
												{ Ordinal: 40, Expression: 'AggregateValue2 = SUM(DataTableAddress[].ValueAddress)' },
												'hidesections("OrderedSolverSection")',
											],
										},
									],
								};

								let tmpHashedAggregateValue = null;
								let tmpHashedAggregateValue2 = null;
								_Pict.PictApplication.initializeAsync(
									function (pError)
									{
										if (pError)
										{
											_Pict.log.info('Error initializing the pict application: '+pError)
										}

										try
										{
											_Pict.log.info('Loading the Application and associated views.');
											const tmpDistinctManifest = _Pict.views.PictFormMetacontroller.createDistinctManifest(tmpManifest);
											_Pict.log.info('Distinct Manifest:', tmpDistinctManifest);
											Expect(tmpDistinctManifest.Sections[0].OriginalHash).to.equal(tmpManifest.Sections[0].Hash, 'Original section hash should be recorded in distinct manifest.');
											Expect(tmpDistinctManifest.Sections[0].Hash).to.not.equal(tmpManifest.Sections[0].Hash, 'Section hash should be different in distinct manifest.');
											Expect(tmpDistinctManifest.Sections[0].Solvers[2]).to.not.equal(tmpManifest.Sections[0].Solvers[2], 'Solver expression should be different in distinct manifest.');
											Expect(tmpDistinctManifest.Sections[0].Solvers[2]).to.equal(`hidesections("${tmpDistinctManifest.Sections[0].Hash}")`, 'Solver expression should be updated to reflect new section hash in distinct manifest.');
											tmpHashedAggregateValue = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pValue]) => pValue.OriginalHash == 'AggregateValue')[0];
											tmpHashedAggregateValue2 = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pValue]) => pValue.OriginalHash == 'AggregateValue2')[0];
											const tmpInjectedSecionViews = _Pict.views.PictFormMetacontroller.injectManifest(tmpDistinctManifest);
											_Pict.log.info('Injected Section Views:', tmpInjectedSecionViews.length);
											_Pict.views.PictFormMetacontroller.updateMetatemplateInDOM();
											setTimeout(() =>
											{
												for (const tmpView of tmpInjectedSecionViews)
												{
													tmpView.render();
												}
												for (const tmpView of tmpInjectedSecionViews)
												{
													tmpView.marshalToView();
												}
												//TODO: do we need to trigger a solve here?
											}, 0);
											_Pict.PictApplication.testDone = () =>
											{
												try
												{
													_Pict.log.info(`AppData after`, { AppData: _Pict.AppData, tmpHashedAggregateValue, tmpHashedAggregateValue2 });
													Expect(_Pict.manifest.getValueByHash(_Pict.AppData, tmpHashedAggregateValue)).to.equal('15', 'AggregateValue should equal 15 (SUM of ValueArray via hash)');
													Expect(_Pict.manifest.getValueByHash(_Pict.AppData, tmpHashedAggregateValue2)).to.equal('15', 'AggregateValue should equal 15 (SUM of ValueArray via address)');
												}
												catch (pError)
												{
													return fDone(pError);
												}
												fDone();
											};
											const [ tmpValueArrayKey, tmpValueArrayDescriptor ] = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pDescriptor]) => pDescriptor.OriginalHash == 'ValueArray');
											const tmpAddress = tmpValueArrayDescriptor.DataAddress;
											_Pict.log.info('Setting up Distinct Array Test with address:', { tmpValueArrayKey, tmpValueArrayDescriptor, tmpAddress });
											const tmpArrayAddress = tmpAddress.substring(0, tmpAddress.indexOf('[]'));
											const tmpPropertyAddress = tmpAddress.substring(tmpAddress.indexOf('[]') + 3);
											_Pict.manifest.setValueByHash(_Pict.AppData, tmpArrayAddress,
												[
													{ [tmpPropertyAddress]: '1' },
													{ [tmpPropertyAddress]: '2' },
													{ [tmpPropertyAddress]: '3' },
													{ [tmpPropertyAddress]: '4' },
													{ [tmpPropertyAddress]: '5' },
												]);
											_Pict.PictApplication.solve();
										}
										catch (pError)
										{
											_Pict.log.error('Error during Distinct Array Test:', pError);
											return fDone(pError);
										}
									});
							}
						);
					test(
							'Distinct Array Test 2',
							(fDone) =>
							{
								//NOTE: code is a clone of Pict.safeLoadPictApplication
								let _Pict;
								const tmpApplicationClass = OrderedSolverApplication;
								if (tmpApplicationClass && ('default_configuration' in tmpApplicationClass) && ('pict_configuration' in tmpApplicationClass.default_configuration))
								{
									_Pict = new libPict(tmpApplicationClass.default_configuration.pict_configuration);
								}
								else
								{
									_Pict = new libPict();
								}

								//_Pict.LogNoisiness = 0;

								let tmpApplicationHash = 'DefaultApplication';
								let tmpDefaultConfiguration = {};

								if ('default_configuration' in tmpApplicationClass)
								{
									tmpDefaultConfiguration = tmpApplicationClass.default_configuration;

									if ('Hash' in tmpApplicationClass.default_configuration)
									{
										tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
										tmpApplicationHash = tmpApplicationClass.default_configuration.Hash;
									}
								}
								_Pict.log.info(`Loading the pict application [${tmpApplicationHash}] and associated views.`);

								_Pict.addApplication(tmpApplicationHash, tmpDefaultConfiguration, tmpApplicationClass);

								// Add the pict form service
								_Pict.addServiceType('PictSectionForm', libPictSectionForm);

								// Add the pict form metacontroller service, which provides programmaatic view construction from manifests and render/marshal methods.
								_Pict.addView('PictFormMetacontroller', {}, libPictSectionForm.PictFormMetacontroller);

								const tmpManifest =
								{
									Scope: 'OrderedSolverApplicationForm',
									Descriptors:
									{
										'DataTableAddress[].ValueAddress':
										{
											Hash: 'ValueArray',
											Name: 'Data Value',
											DataAddress: 'DataTableAddress[].ValueAddress',
											DataType: 'Array',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										AggregateValueAddress:
										{
											Hash: 'AggregateValue',
											Name: 'Aggregate Value',
											DataAddress: 'AggregateValueAddress',
											DataType: 'PreciseNumber',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										AggregateValueAddress2:
										{
											Hash: 'AggregateValue2',
											Name: 'Aggregate Value 2',
											DataAddress: 'AggregateValueAddress2',
											DataType: 'PreciseNumber',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
									},
									Sections:
									[
										{
											Name: 'Ordered Solver Section',
											Hash: 'OrderedSolverSection',
											Solvers:
											[
												{ Ordinal: 5, Expression: 'AggregateValue = SUM(ValueArray)' },
												{ Ordinal: 40, Expression: 'AggregateValue2 = SUM(DataTableAddress[].ValueAddress)' },
											],
										},
									],
								};

								let tmpHashedAggregateValue = null;
								let tmpHashedAggregateValue2 = null;
								_Pict.PictApplication.initializeAsync(
									function (pError)
									{
										if (pError)
										{
											_Pict.log.info('Error initializing the pict application: '+pError)
										}

										try
										{
											_Pict.log.info('Loading the Application and associated views.');
											const tmpDistinctManifest = _Pict.views.PictFormMetacontroller.createDistinctManifest(tmpManifest);
											_Pict.log.info('Distinct Manifest:', tmpDistinctManifest);
											tmpHashedAggregateValue = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pValue]) => pValue.OriginalHash == 'AggregateValue')[0];
											tmpHashedAggregateValue2 = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pValue]) => pValue.OriginalHash == 'AggregateValue2')[0];
											const tmpInjectedSecionViews = _Pict.views.PictFormMetacontroller.injectManifest(tmpDistinctManifest);
											_Pict.log.info('Injected Section Views:', tmpInjectedSecionViews.length);
											_Pict.views.PictFormMetacontroller.updateMetatemplateInDOM();
											setTimeout(() =>
											{
												for (const tmpView of tmpInjectedSecionViews)
												{
													tmpView.render();
												}
												for (const tmpView of tmpInjectedSecionViews)
												{
													tmpView.marshalToView();
												}
												//TODO: do we need to trigger a solve here?
											}, 0);
											_Pict.PictApplication.testDone = () =>
											{
												try
												{
													_Pict.log.info(`AppData after`, { AppData: _Pict.AppData, tmpHashedAggregateValue, tmpHashedAggregateValue2 });
													Expect(_Pict.manifest.getValueByHash(_Pict.AppData, tmpHashedAggregateValue)).to.equal('15', 'AggregateValue should equal 15 (SUM of ValueArray via hash)');
													Expect(_Pict.manifest.getValueByHash(_Pict.AppData, tmpHashedAggregateValue2)).to.equal('15', 'AggregateValue should equal 15 (SUM of ValueArray via address)');
												}
												catch (pError)
												{
													return fDone(pError);
												}
												fDone();
											};
											const [ tmpValueArrayKey, tmpValueArrayDescriptor ] = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pDescriptor]) => pDescriptor.OriginalHash == 'ValueArray');
											const tmpAddress = tmpValueArrayDescriptor.DataAddress;
											_Pict.log.info('Setting up Distinct Array Test with address:', { tmpValueArrayKey, tmpValueArrayDescriptor, tmpAddress });
											const tmpArrayAddress = tmpAddress.substring(0, tmpAddress.indexOf('[]'));
											const tmpPropertyAddress = tmpAddress.substring(tmpAddress.indexOf('[]') + 3);
											_Pict.manifest.setValueByHash(_Pict.AppData, tmpArrayAddress,
												[
													{ [tmpPropertyAddress]: '1' },
													{ [tmpPropertyAddress]: '2' },
													{ [tmpPropertyAddress]: '3' },
													{ [tmpPropertyAddress]: '4' },
													{ [tmpPropertyAddress]: '5' },
												]);
											_Pict.PictApplication.solve();
										}
										catch (pError)
										{
											_Pict.log.error('Error during Distinct Array Test:', pError);
											return fDone(pError);
										}
									});
							}
						);
					test(
							'Distinct Array Test 3',
							(fDone) =>
							{
								//NOTE: code is a clone of Pict.safeLoadPictApplication
								let _Pict;
								const tmpApplicationClass = OrderedSolverApplication;
								if (tmpApplicationClass && ('default_configuration' in tmpApplicationClass) && ('pict_configuration' in tmpApplicationClass.default_configuration))
								{
									_Pict = new libPict(tmpApplicationClass.default_configuration.pict_configuration);
								}
								else
								{
									_Pict = new libPict();
								}

								//_Pict.LogNoisiness = 0;

								let tmpApplicationHash = 'DefaultApplication';
								let tmpDefaultConfiguration = {};

								if ('default_configuration' in tmpApplicationClass)
								{
									tmpDefaultConfiguration = tmpApplicationClass.default_configuration;

									if ('Hash' in tmpApplicationClass.default_configuration)
									{
										tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
										tmpApplicationHash = tmpApplicationClass.default_configuration.Hash;
									}
								}
								_Pict.log.info(`Loading the pict application [${tmpApplicationHash}] and associated views.`);

								_Pict.addApplication(tmpApplicationHash, tmpDefaultConfiguration, tmpApplicationClass);

								// Add the pict form service
								_Pict.addServiceType('PictSectionForm', libPictSectionForm);

								// Add the pict form metacontroller service, which provides programmaatic view construction from manifests and render/marshal methods.
								_Pict.addView('PictFormMetacontroller', {}, libPictSectionForm.PictFormMetacontroller);

								const tmpManifest =
								{
									Scope: 'OrderedSolverApplicationForm',
									Descriptors:
									{
										'LevelOfIndirection.AggregateValueAddress':
										{
											Hash: 'IndirectAggregateValue',
											Name: 'Indirect Aggregate Value',
											DataAddress: 'LevelOfIndirection.AggregateValueAddress',
											DataType: 'PreciseNumber',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										'LevelOfIndirection.DataTableAddress[].ValueAddress':
										{
											Hash: 'ValueArray',
											Name: 'Data Value',
											DataAddress: 'LevelOfIndirection.DataTableAddress[].ValueAddress',
											DataType: 'Array',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										AggregateValueAddress:
										{
											Hash: 'AggregateValue',
											Name: 'Aggregate Value',
											DataAddress: 'AggregateValueAddress',
											DataType: 'PreciseNumber',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										AggregateValueAddress2:
										{
											Hash: 'AggregateValue2',
											Name: 'Aggregate Value 2',
											DataAddress: 'AggregateValueAddress2',
											DataType: 'PreciseNumber',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
									},
									Sections:
									[
										{
											Name: 'Ordered Solver Section',
											Hash: 'OrderedSolverSection',
											Groups:
											[
												{
													Name: 'Group Name',
													Hash: 'GroupHash',
													RecordSetAddress: 'LevelOfIndirection.DataTableAddress',
												},
											],
											Solvers:
											[
												{ Ordinal: 5, Expression: 'AggregateValue = SUM(ValueArray)' },
												{ Ordinal: 40, Expression: 'AggregateValue2 = SUM(LevelOfIndirection.DataTableAddress[].ValueAddress)' },
												{ Ordinal: 60, Expression: 'IndirectAggregateValue = AggregateValue' },
											],
										},
									],
								};

								let tmpHashedAggregateValue = null;
								let tmpHashedAggregateValue2 = null;
								let tmpHashedAggregateValue3 = null;
								_Pict.PictApplication.initializeAsync(
									function (pError)
									{
										if (pError)
										{
											_Pict.log.info('Error initializing the pict application: '+pError)
										}

										try
										{
											_Pict.log.info('Loading the Application and associated views.');
											const tmpUUID = _Pict.getUUID().substring(0, 8);
											const tmpDistinctManifest = _Pict.views.PictFormMetacontroller.createDistinctManifest(tmpManifest, tmpUUID);
											_Pict.log.info('Distinct Manifest:', tmpDistinctManifest);
											Expect(tmpDistinctManifest.Sections[0].Groups[0].RecordSetAddress).to.equal(`${tmpUUID}.LevelOfIndirection.DataTableAddress`, 'Group RecordSetAddress should be preserved in distinct manifest.');
											tmpHashedAggregateValue = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pValue]) => pValue.OriginalHash == 'AggregateValue')[0];
											tmpHashedAggregateValue2 = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pValue]) => pValue.OriginalHash == 'AggregateValue2')[0];
											tmpHashedAggregateValue3 = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pValue]) => pValue.OriginalHash == 'IndirectAggregateValue')[0];
											const tmpInjectedSecionViews = _Pict.views.PictFormMetacontroller.injectManifest(tmpDistinctManifest);
											_Pict.log.info('Injected Section Views:', tmpInjectedSecionViews.length);
											_Pict.views.PictFormMetacontroller.updateMetatemplateInDOM();
											setTimeout(() =>
											{
												for (const tmpView of tmpInjectedSecionViews)
												{
													tmpView.render();
												}
												for (const tmpView of tmpInjectedSecionViews)
												{
													tmpView.marshalToView();
												}
												//TODO: do we need to trigger a solve here?
											}, 0);
											_Pict.PictApplication.testDone = () =>
											{
												try
												{
													_Pict.log.info(`AppData after`, { AppData: _Pict.AppData, tmpHashedAggregateValue, tmpHashedAggregateValue2, tmpHashedAggregateValue3 });
													Expect(_Pict.manifest.getValueByHash(_Pict.AppData, tmpHashedAggregateValue)).to.equal('15', 'AggregateValue should equal 15 (SUM of ValueArray via hash)');
													Expect(_Pict.manifest.getValueByHash(_Pict.AppData, tmpHashedAggregateValue2)).to.equal('15', 'AggregateValue should equal 15 (SUM of ValueArray via address)');
													Expect(_Pict.manifest.getValueByHash(_Pict.AppData, tmpHashedAggregateValue3)).to.equal('15', 'IndirectAggregateValue should equal 15 (via indirection) using manifest method');
												}
												catch (pError)
												{
													return fDone(pError);
												}
												fDone();
											};
											const [ tmpValueArrayKey, tmpValueArrayDescriptor ] = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pDescriptor]) => pDescriptor.OriginalHash == 'ValueArray');
											const tmpAddress = tmpValueArrayDescriptor.DataAddress;
											_Pict.log.info('Setting up Distinct Array Test with address:', { tmpValueArrayKey, tmpValueArrayDescriptor, tmpAddress });
											const tmpArrayAddress = tmpAddress.substring(0, tmpAddress.indexOf('[]'));
											const tmpPropertyAddress = tmpAddress.substring(tmpAddress.indexOf('[]') + 3);
											_Pict.manifest.setValueByHash(_Pict.AppData, tmpArrayAddress,
												[
													{ [tmpPropertyAddress]: '1' },
													{ [tmpPropertyAddress]: '2' },
													{ [tmpPropertyAddress]: '3' },
													{ [tmpPropertyAddress]: '4' },
													{ [tmpPropertyAddress]: '5' },
												]);
											_Pict.PictApplication.solve();
										}
										catch (pError)
										{
											_Pict.log.error('Error during Distinct Array Test:', pError);
											return fDone(pError);
										}
									});
							}
						);
					test(
							'Distinct Array Test 4',
							(fDone) =>
							{
								//NOTE: code is a clone of Pict.safeLoadPictApplication
								let _Pict;
								const tmpApplicationClass = OrderedSolverApplication;
								if (tmpApplicationClass && ('default_configuration' in tmpApplicationClass) && ('pict_configuration' in tmpApplicationClass.default_configuration))
								{
									_Pict = new libPict(tmpApplicationClass.default_configuration.pict_configuration);
								}
								else
								{
									_Pict = new libPict();
								}

								//_Pict.LogNoisiness = 0;

								let tmpApplicationHash = 'DefaultApplication';
								let tmpDefaultConfiguration = {};

								if ('default_configuration' in tmpApplicationClass)
								{
									tmpDefaultConfiguration = tmpApplicationClass.default_configuration;

									if ('Hash' in tmpApplicationClass.default_configuration)
									{
										tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
										tmpApplicationHash = tmpApplicationClass.default_configuration.Hash;
									}
								}
								_Pict.log.info(`Loading the pict application [${tmpApplicationHash}] and associated views.`);

								_Pict.addApplication(tmpApplicationHash, tmpDefaultConfiguration, tmpApplicationClass);

								// Add the pict form service
								_Pict.addServiceType('PictSectionForm', libPictSectionForm);

								// Add the pict form metacontroller service, which provides programmaatic view construction from manifests and render/marshal methods.
								_Pict.addView('PictFormMetacontroller', {}, libPictSectionForm.PictFormMetacontroller);

								const tmpManifest =
								{
									Scope: 'OrderedSolverApplicationForm',
									Descriptors:
									{
										'LevelOfIndirection.DataTableAddress':
										{
											Hash: 'NestedDataTable',
											Name: 'Nested Data Table',
											DataAddress: 'LevelOfIndirection.DataTableAddress',
											DataType: 'Array',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										'LevelOfIndirection.AggregateValueAddress':
										{
											Hash: 'IndirectAggregateValue',
											Name: 'Indirect Aggregate Value',
											DataAddress: 'LevelOfIndirection.AggregateValueAddress',
											DataType: 'PreciseNumber',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										'LevelOfIndirection.DataTableAddress[].ValueAddress':
										{
											Hash: 'ValueArray',
											Name: 'Data Value',
											DataAddress: 'LevelOfIndirection.DataTableAddress[].ValueAddress',
											DataType: 'Array',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										AggregateValue:
										{
											Hash: 'AggregateValue',
											Name: 'Aggregate Value',
											DataAddress: 'AggregateValue',
											DataType: 'PreciseNumber',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
										AggregateValue2:
										{
											Hash: 'AggregateValue2',
											Name: 'Aggregate Value 2',
											DataAddress: 'AggregateValue2',
											DataType: 'PreciseNumber',
											FormGroup: 'DataTableGroup',
											FormSection: 'DataTableSection',
										},
									},
									Sections:
									[
										{
											Name: 'Ordered Solver Section',
											Hash: 'OrderedSolverSection',
											Groups:
											[
												{
													Name: 'Group Name',
													Hash: 'GroupHash',
													RecordSetAddress: 'LevelOfIndirection.DataTableAddress',
												},
											],
											Solvers:
											[
												{ Ordinal: 5, Expression: 'AggregateValue = SUM(ValueArray)' },
												{ Ordinal: 40, Expression: 'AggregateValue2 = SUM(LevelOfIndirection.DataTableAddress[].ValueAddress)' },
												{ Ordinal: 60, Expression: 'IndirectAggregateValue = AggregateValue' },
											],
										},
									],
								};

								let tmpHashedAggregateValue = null;
								let tmpHashedAggregateValue2 = null;
								let tmpHashedAggregateValue3 = null;
								_Pict.PictApplication.initializeAsync(
									function (pError)
									{
										if (pError)
										{
											_Pict.log.info('Error initializing the pict application: '+pError)
										}

										try
										{
											_Pict.log.info('Loading the Application and associated views.');
											const tmpUUID = _Pict.getUUID().substring(0, 8);
											const tmpDistinctManifest = _Pict.views.PictFormMetacontroller.createDistinctManifest(tmpManifest, tmpUUID);
											_Pict.log.info('Distinct Manifest:', tmpDistinctManifest);
											Expect(tmpDistinctManifest.Sections[0].Groups[0].RecordSetAddress).to.equal(`${tmpUUID}.LevelOfIndirection.DataTableAddress`, 'Group RecordSetAddress should be preserved in distinct manifest.');
											tmpHashedAggregateValue = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pValue]) => pValue.OriginalHash == 'AggregateValue')[0];
											tmpHashedAggregateValue2 = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pValue]) => pValue.OriginalHash == 'AggregateValue2')[0];
											tmpHashedAggregateValue3 = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pValue]) => pValue.OriginalHash == 'IndirectAggregateValue')[0];
											const tmpInjectedSecionViews = _Pict.views.PictFormMetacontroller.injectManifest(tmpDistinctManifest);
											_Pict.log.info('Injected Section Views:', tmpInjectedSecionViews.length);
											_Pict.views.PictFormMetacontroller.updateMetatemplateInDOM();
											setTimeout(() =>
											{
												for (const tmpView of tmpInjectedSecionViews)
												{
													tmpView.render();
												}
												for (const tmpView of tmpInjectedSecionViews)
												{
													tmpView.marshalToView();
												}
												//TODO: do we need to trigger a solve here?
											}, 0);
											_Pict.PictApplication.testDone = () =>
											{
												try
												{
													_Pict.log.info(`AppData after`, { AppData: _Pict.AppData, tmpHashedAggregateValue, tmpHashedAggregateValue2, tmpHashedAggregateValue3 });
													Expect(_Pict.manifest.getValueByHash(_Pict.AppData, tmpHashedAggregateValue)).to.equal('15', 'AggregateValue should equal 15 (SUM of ValueArray via hash)');
													Expect(_Pict.manifest.getValueByHash(_Pict.AppData, tmpHashedAggregateValue2)).to.equal('15', 'AggregateValue should equal 15 (SUM of ValueArray via address)');
													Expect(_Pict.manifest.getValueByHash(_Pict.AppData, tmpHashedAggregateValue3)).to.equal('15', 'IndirectAggregateValue should equal 15 (via indirection) using manifest method');
												}
												catch (pError)
												{
													return fDone(pError);
												}
												fDone();
											};
											const [ tmpValueArrayKey, tmpValueArrayDescriptor ] = Object.entries(tmpDistinctManifest.Descriptors).find(([pKey, pDescriptor]) => pDescriptor.OriginalHash == 'ValueArray');
											const tmpAddress = tmpValueArrayDescriptor.DataAddress;
											_Pict.log.info('Setting up Distinct Array Test with address:', { tmpValueArrayKey, tmpValueArrayDescriptor, tmpAddress });
											const tmpArrayAddress = tmpAddress.substring(0, tmpAddress.indexOf('[]'));
											const tmpPropertyAddress = tmpAddress.substring(tmpAddress.indexOf('[]') + 3);
											_Pict.manifest.setValueByHash(_Pict.AppData, tmpArrayAddress,
												[
													{ [tmpPropertyAddress]: '1' },
													{ [tmpPropertyAddress]: '2' },
													{ [tmpPropertyAddress]: '3' },
													{ [tmpPropertyAddress]: '4' },
													{ [tmpPropertyAddress]: '5' },
												]);
											_Pict.PictApplication.solve();
										}
										catch (pError)
										{
											_Pict.log.error('Error during Distinct Array Test:', pError);
											return fDone(pError);
										}
									});
							}
						);
					test(
							'Distinct Manifest - Hash Equals Address Edge Case',
							(fDone) =>
							{
								let _Pict;
								const tmpApplicationClass = OrderedSolverApplication;
								if (tmpApplicationClass && ('default_configuration' in tmpApplicationClass) && ('pict_configuration' in tmpApplicationClass.default_configuration))
								{
									_Pict = new libPict(tmpApplicationClass.default_configuration.pict_configuration);
								}
								else
								{
									_Pict = new libPict();
								}

								let tmpApplicationHash = 'DefaultApplication';
								let tmpDefaultConfiguration = {};
								if ('default_configuration' in tmpApplicationClass)
								{
									tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
									if ('Hash' in tmpApplicationClass.default_configuration)
									{
										tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
										tmpApplicationHash = tmpApplicationClass.default_configuration.Hash;
									}
								}
								_Pict.log.info(`Loading the pict application [${tmpApplicationHash}] and associated views.`);
								_Pict.addApplication(tmpApplicationHash, tmpDefaultConfiguration, tmpApplicationClass);
								_Pict.addServiceType('PictSectionForm', libPictSectionForm);
								_Pict.addView('PictFormMetacontroller', {}, libPictSectionForm.PictFormMetacontroller);

								// Manifest where Hash is explicitly set equal to DataAddress (the tricky edge case)
								const tmpManifest =
								{
									Scope: 'HashEqualsAddress',
									Descriptors:
									{
										// Hash explicitly set equal to address
										'TotalCost':
										{
											Hash: 'TotalCost',
											Name: 'Total Cost',
											DataAddress: 'TotalCost',
											DataType: 'PreciseNumber',
										},
										'Quantity':
										{
											Hash: 'Quantity',
											Name: 'Quantity',
											DataAddress: 'Quantity',
											DataType: 'PreciseNumber',
										},
										'UnitPrice':
										{
											Hash: 'UnitPrice',
											Name: 'Unit Price',
											DataAddress: 'UnitPrice',
											DataType: 'PreciseNumber',
										},
									},
									Sections:
									[
										{
											Name: 'Cost Section',
											Hash: 'CostSection',
											Solvers:
											[
												{ Ordinal: 5, Expression: 'TotalCost = Quantity * UnitPrice' },
												'hidesections("CostSection")',
											],
										},
									],
									ValidationSolvers:
									[
										{ Ordinal: 1, Expression: 'TotalCost = Quantity + UnitPrice' },
									],
								};

								_Pict.PictApplication.initializeAsync(
									function (pError)
									{
										if (pError)
										{
											_Pict.log.info('Error initializing the pict application: '+pError)
										}
										try
										{
											const tmpUUID = 'abc12345';
											const tmpDistinctManifest = _Pict.views.PictFormMetacontroller.createDistinctManifest(tmpManifest, tmpUUID);

											// Verify section hash was updated
											Expect(tmpDistinctManifest.Sections[0].OriginalHash).to.equal('CostSection');
											Expect(tmpDistinctManifest.Sections[0].Hash).to.equal('CostSection_abc12345');

											// When Hash is explicitly set equal to address, hash translation takes precedence
											// so symbols get hash-style rewriting (appended UUID)
											const tmpSolver0 = tmpDistinctManifest.Sections[0].Solvers[0];
											Expect(tmpSolver0.Expression).to.equal('TotalCost_abc12345 = Quantity_abc12345 * UnitPrice_abc12345');

											// Verify hidesections string parameter was updated via address translation
											const tmpSolver1 = tmpDistinctManifest.Sections[0].Solvers[1];
											Expect(tmpSolver1).to.equal('hidesections("CostSection_abc12345")');

											// Verify validation solvers were also updated
											const tmpValSolver = tmpDistinctManifest.ValidationSolvers[0];
											Expect(tmpValSolver.Expression).to.equal('TotalCost_abc12345 = Quantity_abc12345 + UnitPrice_abc12345');

											_Pict.log.info('Hash-equals-address edge case test passed.');
											fDone();
										}
										catch (pError)
										{
											_Pict.log.error('Error during Hash Equals Address test:', pError);
											return fDone(pError);
										}
									});
							}
						);
					test(
							'Distinct Manifest - getvalue/setvalue Address Rewriting',
							(fDone) =>
							{
								let _Pict;
								const tmpApplicationClass = OrderedSolverApplication;
								if (tmpApplicationClass && ('default_configuration' in tmpApplicationClass) && ('pict_configuration' in tmpApplicationClass.default_configuration))
								{
									_Pict = new libPict(tmpApplicationClass.default_configuration.pict_configuration);
								}
								else
								{
									_Pict = new libPict();
								}

								let tmpApplicationHash = 'DefaultApplication';
								let tmpDefaultConfiguration = {};
								if ('default_configuration' in tmpApplicationClass)
								{
									tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
									if ('Hash' in tmpApplicationClass.default_configuration)
									{
										tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
										tmpApplicationHash = tmpApplicationClass.default_configuration.Hash;
									}
								}
								_Pict.addApplication(tmpApplicationHash, tmpDefaultConfiguration, tmpApplicationClass);
								_Pict.addServiceType('PictSectionForm', libPictSectionForm);
								_Pict.addView('PictFormMetacontroller', {}, libPictSectionForm.PictFormMetacontroller);

								const tmpManifest =
								{
									Scope: 'GetValueSetValue',
									Descriptors:
									{
										'Score':
										{
											Hash: 'Score',
											Name: 'Score',
											DataAddress: 'Score',
											DataType: 'PreciseNumber',
										},
										'DoubleScore':
										{
											Hash: 'DoubleScore',
											Name: 'Double Score',
											DataAddress: 'DoubleScore',
											DataType: 'PreciseNumber',
										},
									},
									Sections:
									[
										{
											Name: 'Score Section',
											Hash: 'ScoreSection',
											Solvers:
											[
												// Test getvalue with a string address parameter
												{ Ordinal: 5, Expression: 'TmpVal = getvalue("Score")' },
												// Test setvalue with a string address parameter
												{ Ordinal: 10, Expression: 'setvalue("DoubleScore", TmpVal * 2)' },
												// Test state address rewriting
												{ Ordinal: 15, Expression: 'Result = {Score} + {DoubleScore}' },
												// Test findfirstvaluebyexactmatch with address params at 0, 1, 3
												{ Ordinal: 20, Expression: 'Found = findfirstvaluebyexactmatch("Score", "DoubleScore", "test", "Score")' },
											],
										},
									],
								};

								_Pict.PictApplication.initializeAsync(
									function (pError)
									{
										if (pError)
										{
											_Pict.log.info('Error initializing the pict application: '+pError)
										}
										try
										{
											const tmpUUID = 'xyz98765';
											const tmpDistinctManifest = _Pict.views.PictFormMetacontroller.createDistinctManifest(tmpManifest, tmpUUID);

											// Verify getvalue string parameter was rewritten (param 0 is an address)
											const tmpSolver0 = tmpDistinctManifest.Sections[0].Solvers[0];
											Expect(tmpSolver0.Expression).to.equal('TmpVal = getvalue("Score_xyz98765")');

											// Verify setvalue string parameter was rewritten (param 0 is an address)
											const tmpSolver1 = tmpDistinctManifest.Sections[0].Solvers[1];
											Expect(tmpSolver1.Expression).to.equal('setvalue("DoubleScore_xyz98765", TmpVal * 2)');

											// Verify state addresses were rewritten
											const tmpSolver2 = tmpDistinctManifest.Sections[0].Solvers[2];
											Expect(tmpSolver2.Expression).to.equal('Result = {xyz98765.Score} + {xyz98765.DoubleScore}');

											// Verify findfirstvaluebyexactmatch: params 0, 1, 3 are addresses, param 2 is not
											const tmpSolver3 = tmpDistinctManifest.Sections[0].Solvers[3];
											Expect(tmpSolver3.Expression).to.equal('Found = findfirstvaluebyexactmatch("Score_xyz98765", "DoubleScore_xyz98765", "test", "Score_xyz98765")');

											const { HashTranslation, AddressTranslation } = _Pict.views.PictFormMetacontroller.buildManifestTranslations(tmpDistinctManifest);
											const tmpSolver4 = 'Tmp = getvalue("Score") + {DoubleScore} + findfirstvaluebyexactmatch("Score", "DoubleScore", "test", "Score")';
											const tmpRewrittenSolver4 = _Pict.views.PictFormMetacontroller.rewriteSolverExpression(tmpSolver4, HashTranslation, AddressTranslation);
											Expect(tmpRewrittenSolver4).to.equal('Tmp = getvalue("Score_xyz98765") + {xyz98765.DoubleScore} + findfirstvaluebyexactmatch("Score_xyz98765", "DoubleScore_xyz98765", "test", "Score_xyz98765")');

											_Pict.log.info('getvalue/setvalue address rewriting test passed.');
											fDone();
										}
										catch (pError)
										{
											_Pict.log.error('Error during getvalue/setvalue test:', pError);
											return fDone(pError);
										}
									});
							}
						);
					test(
							'Distinct Manifest - AppData-Prefixed getvalue Address Rewriting',
							(fDone) =>
							{
								let _Pict;
								const tmpApplicationClass = OrderedSolverApplication;
								if (tmpApplicationClass && ('default_configuration' in tmpApplicationClass) && ('pict_configuration' in tmpApplicationClass.default_configuration))
								{
									_Pict = new libPict(tmpApplicationClass.default_configuration.pict_configuration);
								}
								else
								{
									_Pict = new libPict();
								}

								let tmpApplicationHash = 'DefaultApplication';
								let tmpDefaultConfiguration = {};
								if ('default_configuration' in tmpApplicationClass)
								{
									tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
									if ('Hash' in tmpApplicationClass.default_configuration)
									{
										tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
										tmpApplicationHash = tmpApplicationClass.default_configuration.Hash;
									}
								}
								_Pict.addApplication(tmpApplicationHash, tmpDefaultConfiguration, tmpApplicationClass);
								_Pict.addServiceType('PictSectionForm', libPictSectionForm);
								_Pict.addView('PictFormMetacontroller', {}, libPictSectionForm.PictFormMetacontroller);

								const tmpManifest =
								{
									Scope: 'AppDataPrefixTest',
									Descriptors:
									{
										'Analysis.TotalCalories':
										{
											Hash: 'TotalCalories',
											Name: 'Total Calories',
											DataAddress: 'Analysis.TotalCalories',
											DataType: 'PreciseNumber',
										},
										'Analysis.AverageCalories':
										{
											Hash: 'AverageCalories',
											Name: 'Average Calories',
											DataAddress: 'Analysis.AverageCalories',
											DataType: 'PreciseNumber',
										},
										'Analysis.NormalizedTotal':
										{
											Hash: 'NormalizedTotal',
											Name: 'Normalized Total',
											DataAddress: 'Analysis.NormalizedTotal',
											DataType: 'PreciseNumber',
										},
									},
									Sections:
									[
										{
											Name: 'AppData Prefix Section',
											Hash: 'AppDataPrefixSection',
											Solvers:
											[
												// Test getvalue with AppData-prefixed address (Token.String with marshal prefix)
												{ Ordinal: 5, Expression: 'TmpTotal = getvalue("AppData.Analysis.TotalCalories")' },
												// Test setvalue with AppData-prefixed address
												{ Ordinal: 10, Expression: 'setvalue("AppData.Analysis.NormalizedTotal", TmpTotal / 100)' },
												// Test Token.StateAddress with AppData prefix
												{ Ordinal: 15, Expression: 'Combined = {AppData.Analysis.TotalCalories} + {AppData.Analysis.AverageCalories}' },
												// Test mixed: getvalue AppData prefix + bare hash + state address prefix
												{ Ordinal: 20, Expression: 'Mixed = getvalue("AppData.Analysis.TotalCalories") + AverageCalories + {AppData.Analysis.NormalizedTotal}' },
												// Test findfirstvaluebyexactmatch with AppData prefix in address params
												{ Ordinal: 25, Expression: 'Found = findfirstvaluebyexactmatch("AppData.Analysis.TotalCalories", "AppData.Analysis.AverageCalories", "test", "AppData.Analysis.NormalizedTotal")' },
											],
										},
									],
								};

								_Pict.PictApplication.initializeAsync(
									function (pError)
									{
										if (pError)
										{
											_Pict.log.info('Error initializing the pict application: '+pError)
										}
										try
										{
											const tmpUUID = 'abc12345';
											const tmpDistinctManifest = _Pict.views.PictFormMetacontroller.createDistinctManifest(tmpManifest, tmpUUID);

											// Verify getvalue with AppData-prefixed address was rewritten
											// "AppData.Analysis.TotalCalories" → strip "AppData." → "Analysis.TotalCalories"
											// → found in address translation → "abc12345.Analysis.TotalCalories"
											// → reconstruct → "AppData.abc12345.Analysis.TotalCalories"
											const tmpSolver0 = tmpDistinctManifest.Sections[0].Solvers[0];
											Expect(tmpSolver0.Expression).to.equal('TmpTotal = getvalue("AppData.abc12345.Analysis.TotalCalories")');

											// Verify setvalue with AppData-prefixed address was rewritten
											const tmpSolver1 = tmpDistinctManifest.Sections[0].Solvers[1];
											Expect(tmpSolver1.Expression).to.equal('setvalue("AppData.abc12345.Analysis.NormalizedTotal", TmpTotal / 100)');

											// Verify state addresses with AppData prefix were rewritten
											const tmpSolver2 = tmpDistinctManifest.Sections[0].Solvers[2];
											Expect(tmpSolver2.Expression).to.equal('Combined = {AppData.abc12345.Analysis.TotalCalories} + {AppData.abc12345.Analysis.AverageCalories}');

											// Verify mixed expression: AppData-prefixed getvalue + bare hash + AppData state address
											const tmpSolver3 = tmpDistinctManifest.Sections[0].Solvers[3];
											Expect(tmpSolver3.Expression).to.equal('Mixed = getvalue("AppData.abc12345.Analysis.TotalCalories") + AverageCalories_abc12345 + {AppData.abc12345.Analysis.NormalizedTotal}');

											// Verify findfirstvaluebyexactmatch: params 0, 1, 3 are addresses, param 2 is not
											// All three address params have AppData prefix
											const tmpSolver4 = tmpDistinctManifest.Sections[0].Solvers[4];
											Expect(tmpSolver4.Expression).to.equal('Found = findfirstvaluebyexactmatch("AppData.abc12345.Analysis.TotalCalories", "AppData.abc12345.Analysis.AverageCalories", "test", "AppData.abc12345.Analysis.NormalizedTotal")');

											// Verify descriptor addresses were rewritten
											Expect(tmpDistinctManifest.Descriptors).to.have.property('abc12345.Analysis.TotalCalories');
											Expect(tmpDistinctManifest.Descriptors['abc12345.Analysis.TotalCalories'].Hash).to.equal('TotalCalories_abc12345');

											// Verify section hash was rewritten
											Expect(tmpDistinctManifest.Sections[0].Hash).to.equal('AppDataPrefixSection_abc12345');

											_Pict.log.info('AppData-prefixed getvalue address rewriting test passed.');
											fDone();
										}
										catch (pError)
										{
											_Pict.log.error('Error during AppData prefix test:', pError);
											return fDone(pError);
										}
									});
							}
						);
					test(
							'Solve Ordinals',
							(fDone) =>
							{
								//NOTE: code is a clone of Pict.safeLoadPictApplication
								let _Pict;
								const tmpApplicationClass = OrderedSolverApplication;
								if (tmpApplicationClass && ('default_configuration' in tmpApplicationClass) && ('pict_configuration' in tmpApplicationClass.default_configuration))
								{
									_Pict = new libPict(tmpApplicationClass.default_configuration.pict_configuration);
								}
								else
								{
									_Pict = new libPict();
								}

								//_Pict.LogNoisiness = 0;

								let tmpApplicationHash = 'DefaultApplication';
								let tmpDefaultConfiguration = {};

								if ('default_configuration' in tmpApplicationClass)
								{
									tmpDefaultConfiguration = tmpApplicationClass.default_configuration;

									if ('Hash' in tmpApplicationClass.default_configuration)
									{
										tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
										tmpApplicationHash = tmpApplicationClass.default_configuration.Hash;
									}
								}
								_Pict.log.info(`Loading the pict application [${tmpApplicationHash}] and associated views.`);

								_Pict.addApplication(tmpApplicationHash, tmpDefaultConfiguration, tmpApplicationClass);

								_Pict.PictApplication.testDone = () =>
								{
									try
									{
										Expect(_Pict.AppData.C).to.equal('8', 'C should equal 8 (A + B)');
										Expect(_Pict.AppData.D).to.equal('5', 'D should equal 5 (C - B)');
									}
									catch (pError)
									{
										return fDone(pError);
									}
									fDone();
								};

								_Pict.PictApplication.initializeAsync(
									function (pError)
									{
										if (pError)
										{
											_Pict.log.info('Error initializing the pict application: '+pError)
										}
										_Pict.log.info('Loading the Application and associated views.');
									});

								// This needs to be explicitly called now that we turned off auto solve
								_Pict.PictApplication.solve();
							}
						);
					test(
							'Disable Solve Ordinals',
							(fDone) =>
							{
								//NOTE: code is a clone of Pict.safeLoadPictApplication
								let _Pict;
								const tmpApplicationClass = OrderedSolverApplication;
								OrderedSolverApplication.default_configuration.pict_configuration.DefaultFormManifest.Sections[0].Solvers.splice(1, 0, { Ordinal: 15, Expression: 'setSolverOrdinalEnabled(40, 0)' });
								if (tmpApplicationClass && ('default_configuration' in tmpApplicationClass) && ('pict_configuration' in tmpApplicationClass.default_configuration))
								{
									_Pict = new libPict(tmpApplicationClass.default_configuration.pict_configuration);
								}
								else
								{
									_Pict = new libPict();
								}

								//_Pict.LogNoisiness = 0;

								let tmpApplicationHash = 'DefaultApplication';
								let tmpDefaultConfiguration = {};

								if ('default_configuration' in tmpApplicationClass)
								{
									tmpDefaultConfiguration = tmpApplicationClass.default_configuration;

									if ('Hash' in tmpApplicationClass.default_configuration)
									{
										tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
										tmpApplicationHash = tmpApplicationClass.default_configuration.Hash;
									}
								}
								_Pict.log.info(`Loading the pict application [${tmpApplicationHash}] and associated views.`);

								_Pict.addApplication(tmpApplicationHash, tmpDefaultConfiguration, tmpApplicationClass);

								_Pict.PictApplication.testDone = () =>
								{
									try
									{
										Expect(_Pict.AppData.C).to.equal('8', 'C should equal 8 (A + B)');
										Expect(_Pict.AppData.D).to.not.exist;
									}
									catch (pError)
									{
										return fDone(pError);
									}
									fDone();
								};

								_Pict.PictApplication.initializeAsync(
									function (pError)
									{
										if (pError)
										{
											_Pict.log.info('Error initializing the pict application: '+pError)
										}
										_Pict.log.info('Loading the Application and associated views.');
									});

								// This needs to be explicitly called now that we turned off auto solve
								_Pict.PictApplication.solve();
							}
						);
				}
			);
		suite
			(
				'Cross-Scope Solver Functions',
				() =>
				{
					test(
							'Cross-scope data access and undefined guards',
							(fDone) =>
							{
								let _Pict;
								const tmpApplicationClass = CrossScopeSolverApplication;
								if (tmpApplicationClass && ('default_configuration' in tmpApplicationClass) && ('pict_configuration' in tmpApplicationClass.default_configuration))
								{
									_Pict = new libPict(tmpApplicationClass.default_configuration.pict_configuration);
								}
								else
								{
									_Pict = new libPict();
								}

								let tmpApplicationHash = 'DefaultApplication';
								let tmpDefaultConfiguration = {};

								if ('default_configuration' in tmpApplicationClass)
								{
									tmpDefaultConfiguration = tmpApplicationClass.default_configuration;

									if ('Hash' in tmpApplicationClass.default_configuration)
									{
										tmpDefaultConfiguration = tmpApplicationClass.default_configuration;
										tmpApplicationHash = tmpApplicationClass.default_configuration.Hash;
									}
								}
								_Pict.log.info(`Loading the pict application [${tmpApplicationHash}] and associated views.`);

								_Pict.addApplication(tmpApplicationHash, tmpDefaultConfiguration, tmpApplicationClass);

								_Pict.PictApplication.testDone = () =>
								{
									try
									{
										// Ordinal 2: SUM and COUNT aggregation
										Expect(_Pict.AppData.Summary.TotalCost).to.equal('160', 'TotalCost should be 160 (SUM of 50+60+50)');
										Expect(parseInt(_Pict.AppData.Summary.ItemCount)).to.equal(3, 'ItemCount should be 3');

										// Ordinal 3: getGlobalFormData
										Expect(_Pict.AppData.Results.GlobalTaxRate).to.equal(10, 'GlobalTaxRate should be 10 via getGlobalFormData');

										// Ordinal 3: resolveGlobalFormData
										Expect(_Pict.AppData.Results.GlobalTotalCost).to.equal('160', 'GlobalTotalCost should be 160 via resolveGlobalFormData');

										// Ordinal 3: getSectionFormData
										Expect(_Pict.AppData.Results.SectionTotalCost).to.equal('160', 'SectionTotalCost should be 160 via getSectionFormData');

										// Ordinal 3: getSectionTabularFormData
										Expect(_Pict.AppData.Results.FirstItemName).to.equal('Alpha', 'FirstItemName should be Alpha via getSectionTabularFormData');
										Expect(_Pict.AppData.Results.FirstItemTotal).to.equal('50', 'FirstItemTotal should be 50 via getSectionTabularFormData');

										// Undefined guards: bad lookups return undefined, which is != 0 in IF, so result is 0 (the onFalse branch)
										Expect(_Pict.AppData.Results.BadSectionGuard).to.equal('0', 'BadSectionGuard: non-existent section returns undefined (not equal to 0)');
										Expect(_Pict.AppData.Results.BadTabularGuard).to.equal('0', 'BadTabularGuard: out-of-bounds row returns undefined (not equal to 0)');
										Expect(_Pict.AppData.Results.BadGroupGuard).to.equal('0', 'BadGroupGuard: non-existent group returns undefined (not equal to 0)');

										// Good value guard: valid lookup should pass IF check
										Expect(_Pict.AppData.Results.GoodValueGuard).to.equal('1', 'GoodValueGuard: valid getGlobalFormData should be > 0');
									}
									catch (pError)
									{
										return fDone(pError);
									}
									fDone();
								};

								_Pict.PictApplication.initializeAsync(
									function (pError)
									{
										if (pError)
										{
											_Pict.log.info('Error initializing the pict application: '+pError)
										}
										_Pict.log.info('Loading the Application and associated views.');
									});

								_Pict.PictApplication.solve();
							}
						);
				}
			);

		suite
			(
				'Comprehension Generation',
				() =>
				{
					test(
							'addComprehensionEntity writes nested structure at default destination',
							(fDone) =>
							{
								let _Pict = new libPict(DoNothingApplication.default_configuration.pict_configuration);
								_Pict.LogNoisiness = 1;
								_Pict.addApplication('DefaultApplication', DoNothingApplication.default_configuration, DoNothingApplication);

								_Pict.PictApplication.testDone = () =>
								{
									try
									{
										// Drive the solver once via runSolver to populate the comprehension.
										_Pict.providers.DynamicSolver.runSolver('addComprehensionEntity("OnSave", "Book", "0x73278432987", "Title", "The Giving Tree")', true);
										_Pict.providers.DynamicSolver.runSolver('addComprehensionEntity("OnSave", "Book", "0x73278432987", "Author", "Shel Silverstein")', true);
										_Pict.providers.DynamicSolver.runSolver('addComprehensionEntity("OnSave", "Book", "0x73278432987", "ISBN", "8675309")', true);

										const tmpComprehensions = _Pict.AppData.FormEntityComprehensions;
										Expect(tmpComprehensions).to.be.an('object', 'Default comprehension destination should be materialized at AppData.FormEntityComprehensions');
										Expect(tmpComprehensions.OnSave).to.be.an('object', 'OnSave context branch should exist');
										Expect(tmpComprehensions.OnSave.Book).to.be.an('object', 'Book entity bucket should exist under OnSave');
										Expect(tmpComprehensions.OnSave.Book['0x73278432987']).to.deep.equal(
											{ Title: 'The Giving Tree', Author: 'Shel Silverstein', ISBN: '8675309' },
											'Successive writes should accumulate on the same record');
									}
									catch (pError)
									{
										return fDone(pError);
									}
									fDone();
								};

								_Pict.PictApplication.initializeAsync(() => { });
							}
						);

					test(
							'addComprehensionEntity supports nested context addresses like OnApprovalAction.Approve',
							(fDone) =>
							{
								let _Pict = new libPict(DoNothingApplication.default_configuration.pict_configuration);
								_Pict.LogNoisiness = 1;
								_Pict.addApplication('DefaultApplication', DoNothingApplication.default_configuration, DoNothingApplication);

								_Pict.PictApplication.testDone = () =>
								{
									try
									{
										_Pict.providers.DynamicSolver.runSolver('addComprehensionEntity("OnApprovalAction.Submit", "Book", "0x111", "Status", "Submitted")', true);
										_Pict.providers.DynamicSolver.runSolver('addComprehensionEntity("OnApprovalAction.Approve", "Book", "0x111", "Status", "Approved")', true);

										const tmpRoot = _Pict.AppData.FormEntityComprehensions;
										Expect(tmpRoot.OnApprovalAction).to.be.an('object', 'Nested context root must be an object');
										Expect(tmpRoot.OnApprovalAction.Submit.Book['0x111'].Status).to.equal('Submitted');
										Expect(tmpRoot.OnApprovalAction.Approve.Book['0x111'].Status).to.equal('Approved');
									}
									catch (pError)
									{
										return fDone(pError);
									}
									fDone();
								};

								_Pict.PictApplication.initializeAsync(() => { });
							}
						);

					test(
							'addComprehensionEntity honors a customized comprehensionDestinationAddress',
							(fDone) =>
							{
								let _Pict = new libPict(DoNothingApplication.default_configuration.pict_configuration);
								_Pict.LogNoisiness = 1;
								_Pict.addApplication('DefaultApplication', DoNothingApplication.default_configuration, DoNothingApplication);

								_Pict.PictApplication.testDone = () =>
								{
									try
									{
										_Pict.views.PictFormMetacontroller.comprehensionDestinationAddress = 'AppData.MyCustomComprehensions';
										_Pict.providers.DynamicSolver.runSolver('addComprehensionEntity("OnSave", "Recipe", "Recipe_1", "Name", "Pancakes")', true);

										Expect(_Pict.AppData.FormEntityComprehensions).to.equal(undefined, 'Default destination should remain untouched');
										Expect(_Pict.AppData.MyCustomComprehensions.OnSave.Recipe.Recipe_1.Name).to.equal('Pancakes',
											'Comprehension should land at the customized destination');
									}
									catch (pError)
									{
										return fDone(pError);
									}
									fDone();
								};

								_Pict.PictApplication.initializeAsync(() => { });
							}
						);

					test(
							'addComprehensionEntity ignores empty/null parts and never throws',
							(fDone) =>
							{
								let _Pict = new libPict(DoNothingApplication.default_configuration.pict_configuration);
								_Pict.LogNoisiness = 1;
								_Pict.addApplication('DefaultApplication', DoNothingApplication.default_configuration, DoNothingApplication);

								_Pict.PictApplication.testDone = () =>
								{
									try
									{
										// Direct call against the provider, since exercising null/undefined through the
										// solver string syntax is awkward.
										const tmpBehaviors = _Pict.providers.DynamicFormSolverBehaviors;
										Expect(tmpBehaviors.addComprehensionEntity(null, 'Book', 'G1', 'P', 'V')).to.equal(undefined, 'null Context bails');
										Expect(tmpBehaviors.addComprehensionEntity('OnSave', '', 'G1', 'P', 'V')).to.equal(undefined, 'empty Entity bails');
										Expect(tmpBehaviors.addComprehensionEntity('OnSave', 'Book', undefined, 'P', 'V')).to.equal(undefined, 'undefined GUID bails');
										Expect(tmpBehaviors.addComprehensionEntity('OnSave', 'Book', 'G1', '', 'V')).to.equal(undefined, 'empty Property bails');
										// Successful call still works after the bad ones.
										Expect(tmpBehaviors.addComprehensionEntity('OnSave', 'Book', 'G1', 'Title', 'OK')).to.equal('OK');
										Expect(_Pict.AppData.FormEntityComprehensions.OnSave.Book.G1.Title).to.equal('OK');
									}
									catch (pError)
									{
										return fDone(pError);
									}
									fDone();
								};

								_Pict.PictApplication.initializeAsync(() => { });
							}
						);
				}
			);
	}
);
