const libPictSectionForm = require('../../source/Pict-Section-Form.js');

const libCustomDataProvider = require('./Complex-Tabular-CustomDataProvider.js');

const SelectInputProvider = require('../../source/providers/inputs/Pict-Provider-Input-Select.js');

class CustomSelectInputProvider extends SelectInputProvider
{
	/**
	 * Handles events for the Pict-Provider-InputExtension.
	 *
	 * @param {Object} pView - The view object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The value from AppData.
	 * @param {string} pHTMLSelector - The HTML selector.
	 * @param {string} pEvent - The event hash that is expected to be triggered.
	 * @param {string} pTransactionGUID - The transaction GUID, if any.
	 * @returns {boolean} - Returns true.
	 */
	onEvent(pView, pInput, pValue, pHTMLSelector, pEvent, pTransactionGUID)
	{
		const tmpResult = super.onEvent(pView, pInput, pValue, pHTMLSelector, pEvent, pTransactionGUID);
		if (typeof pEvent !== "string")
		{
			return tmpResult;
		}
		const tmpEventParts = pEvent.split(':');
		const tmpEventHash = tmpEventParts[0];
		if (tmpEventHash !== 'GetPickList')
		{
			return tmpResult;
		}
		const tmpListHash = tmpEventParts[1];
		if (tmpListHash !== pInput.PictForm.SelectOptionsPickList)
		{
			return tmpResult;
		}
		const tmpListDataAddress = tmpEventParts[2];
		const tmpEventOptions = JSON.parse(tmpEventParts.slice(3).join(':'));
		this.pict.log.info(`CustomSelectInputProvider received event: ${pEvent} for list ${tmpListHash} with options:`, { tmpEventHash, tmpListHash, tmpListDataAddress, tmpEventOptions });
		const tmpListData = this.pict.manifest.getValueByHash(this.pict, tmpListDataAddress);
		if (!Array.isArray(tmpListData))
		{
			this.pict.log.error(`CustomSelectInputProvider expected array data at address ${tmpListDataAddress} but found:`, { tmpListData });
			return tmpResult;
		}
		if (tmpListData.length > 0)
		{
			return tmpResult;
		}
		for (let i = 0; i < 10; ++i)
		{
			const tmpRandomNumber = Math.floor(Math.random() * 1000);
			tmpListData.push({ id: `random-${tmpRandomNumber}`, text: `${tmpRandomNumber}` });
		}

		return tmpResult;
	}
}

class ComplexTabularApplication extends libPictSectionForm.PictFormApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		if (!this.pict.AppData.UI)
		{
			this.pict.AppData.UI = {};
		}
		// test defaulting to alternate tab
		this.pict.AppData.UI.StatisticsTabState = "FruitStatistics";
		this.pict.addProvider('CustomDataProvider', libCustomDataProvider.default_configuration, libCustomDataProvider);

		// Demonstrate a customized comprehension destination -- comprehensions emitted by the
		// addComprehensionEntity solver will land at AppData.RecipeWorkflowComprehensions instead
		// of the default AppData.FormEntityComprehensions.  The Recipe section's solvers below
		// populate OnSave / OnApprovalAction.{Submit,Approve} contexts that a downstream
		// workflow can read directly.
		this.pict.views.PictFormMetacontroller.comprehensionDestinationAddress = 'AppData.RecipeWorkflowComprehensions';
	}

	onInitialize()
	{
		this.pict.addProvider('Pict-Input-Select', CustomSelectInputProvider.default_configuration, CustomSelectInputProvider);
		return super.onInitialize();
	}
}

module.exports = ComplexTabularApplication;

module.exports.default_configuration = libPictSectionForm.PictFormApplication.default_configuration;
module.exports.default_configuration.pict_configuration = {
	Product: "ComplexTable",

	DefaultAppData: Object.assign({}, require("./FruitData.json"),
		{
			SourceArray:
			[
				{
					"ItemID": 1,
					"Value": "First",
					"HiddenValue": "HiddenOne",
				},
				{
					"ItemID": 2,
					"Value": "Second",
					"HiddenValue": "HiddenTwo",
				},
				{
					"ItemID": 3,
					"Value": "Third",
					"HiddenValue": "HiddenThree",
				},
			],
			// Read by the Chart section's Address and layered examples
			ChartExamples:
			{
				Labels: ['Spring', 'Summer', 'Autumn', 'Winter'],
				Datasets:
				[
					{ label: 'Apples', data: [12, 30, 44, 9] },
					{ label: 'Pears', data: [8, 21, 35, 6] }
				],
				CoreConfiguration:
				{
					type: 'line',
					options: { plugins: { title: { display: true, text: 'Labels, datasets and core configuration read from AppData' } } }
				},
				Harvest:
				[
					{ Fruit: 'Apples', Picked: 14, Sold: 11 },
					{ Fruit: 'Pears', Picked: 9, Sold: 9 },
					{ Fruit: 'Plums', Picked: 6, Sold: 4 },
					{ Fruit: 'Figs', Picked: 11, Sold: 7 }
				]
			},
		}),

	DefaultFormManifest: {
		Scope: "SuperComplexTabularForm",

		PickLists:
			[
				{
					Hash: "Families",
					ListAddress: "AppData.FruitMetaLists.Families",
					ListSourceAddress: "FruitData.FruityVice[]",
					TextTemplate: "{~D:Record.family~}",
					IDTemplate: "{~D:Record.family~}",
					Unique: true,
					Sorted: true,
					UpdateFrequency: "Once",
				},
				{
					Hash: "Orders",
					ListAddress: "AppData.FruitMetaLists.Orders",
					ListSourceAddress: "FruitData.FruityVice[]",
					TextTemplate: "{~D:Record.order~}",
					IDTemplate: "{~D:Record.order~}",
					Unique: true,
					UpdateFrequency: "Once",
				},
				{
					Hash: "Genuses",
					ListAddress: "AppData.FruitMetaLists.Genuses",
					ListSourceAddress: "FruitData.FruityVice[]",
					TextTemplate: "{~D:Record.genus~}",
					IDTemplate: "{~D:Record.genus~}",
					Sorted: true,
					UpdateFrequency: "Always",
				},
				{
					Hash: "Books",
					ListAddress: "AppData.AuthorsBooks",
					ListSourceAddress: "Books[]",
					TextTemplate: "{~D:Record.Title~}",
					IDTemplate: "{~D:Record.IDBook~}",
					Sorted: true,
					UpdateFrequency: "Always",
				},
				{
					Hash: "RandomNumbers",
					Dynamic: true,
				},
			],

		Sections: [
			{
				Hash: "Recipe",
				Name: "Fruit-based Recipe",

				Solvers:
					[
						"TotalFruitCalories = SUM(FruitNutritionCalories)",
						"AverageFruitCalories = MEAN(FruitNutritionCalories)",
						{
							Ordinal: 99,
							Expression: "AverageFatPercent = MEAN(FruitPercentTotalFat)",
						},
						"RecipeCounterSurfaceArea = RecipeCounterWidth * RecipeCounterDepth",
						"RecipeCounterVolume = RecipeCounterSurfaceArea * RecipeVerticalClearance",
						`InspirationLink = CONCAT("https://www.google.com/search?q=", RecipeName, " recipe")`,
						'cumulativeSummationResult = cumulativeSummation(getvalue("AppData.FruitData.FruityVice"), "nutritions.calories", "SummedCalories")',
						`MAP VAR row FROM FruitData.FruityVice : ColorInputBackgroundTabular("FruitGrid", "FruitGrid", "PercentTotalFat", stepIndex, "#FFCCCC", IF(row.nutritions.percent_total_fat, ">", 0.25, 1, 0))`,

						// Comprehension generation -- builds AppData.RecipeWorkflowComprehensions.
						// The OnSave context captures the current recipe-level facts; later solvers below
						// branch into OnApprovalAction.{Submit,Approve} based on the Proprietary flag.
						{ Ordinal: 200, Expression: `addComprehensionEntity("OnSave", "Recipe", RecipeName, "Name", RecipeName)` },
						{ Ordinal: 200, Expression: `addComprehensionEntity("OnSave", "Recipe", RecipeName, "Type", RecipeType)` },
						{ Ordinal: 200, Expression: `addComprehensionEntity("OnSave", "Recipe", RecipeName, "Description", RecipeDescription)` },
						{ Ordinal: 200, Expression: `addComprehensionEntity("OnSave", "Recipe", RecipeName, "Inventor", Inventor)` },
						{ Ordinal: 200, Expression: `addComprehensionEntity("OnSave", "Recipe", RecipeName, "TotalCalories", TotalFruitCalories)` },
						{ Ordinal: 200, Expression: `addComprehensionEntity("OnSave", "Recipe", RecipeName, "AverageFatPercent", AverageFatPercent)` },

						// Per-fruit OnSave entries built off the FruitGrid -- one addComprehensionEntity
						// call per (fruit, property).  Demonstrates how MAP VAR fans a single solver
						// expression across every row of a recordset.
						{ Ordinal: 210, Expression: `MAP VAR row FROM FruitData.FruityVice : addComprehensionEntity("OnSave", "Fruit", row.name, "Family", row.family)` },
						{ Ordinal: 210, Expression: `MAP VAR row FROM FruitData.FruityVice : addComprehensionEntity("OnSave", "Fruit", row.name, "Order", row.order)` },
						{ Ordinal: 210, Expression: `MAP VAR row FROM FruitData.FruityVice : addComprehensionEntity("OnSave", "Fruit", row.name, "Calories", row.nutritions.calories)` },

						// Approval workflow -- nested OnApprovalAction context.  When Proprietary is true the
						// recipe lands in OnApprovalAction.Submit (still pending review); otherwise it goes
						// straight to OnApprovalAction.Approve.  Both branches share the same Recipe entity
						// shape, just under different sub-contexts of OnApprovalAction.
						{ Ordinal: 220, Expression: `addComprehensionEntity(IF(Proprietary, "==", 1, "OnApprovalAction.Submit", "OnApprovalAction.Approve"), "Recipe", RecipeName, "Status", IF(Proprietary, "==", 1, "Submitted", "Approved"))` },
						{ Ordinal: 220, Expression: `addComprehensionEntity(IF(Proprietary, "==", 1, "OnApprovalAction.Submit", "OnApprovalAction.Approve"), "Recipe", RecipeName, "Reviewer", Inventor)` },
					],

				MetaTemplates:
					[
						{
							//onclick="{~D:Record.Macro.DataRequestFunction~}"
							"HashPostfix": "-Template-Wrap-Prefix",
							"Template": "<h1>Rectangular Area Solver Micro-app</h1><div><a href=\"#\" onclick=\"{~Pict~}.PictApplication.solve()\">[ solve ]</a> <a href=\"#\" onclick=\"{~P~}.views.PictFormMetacontroller.showSupportViewInlineEditor()\">[ debug ]</a></div><hr />"
						}
					],

				Groups: [
					{
						Hash: "Recipe",
						Name: "Recipe",
						//CSSClass: "FancyGroupTitle"
					},
					{
						Hash: "StatisticsTabs",
						Name: "Select a Statistics Section",
						//						ShowTitle: true
					},
					{
						Hash: "Statistics",
						Name: "Statistics",
						Layout: "Vertical",
						//						ShowTitle: true
					},
					{
						Hash: "FruitStatistics",
						Name: "Statistics About the Fruit",
					},
				],
			},
			{
				Hash: "Book",
				Name: "Books about Tables",
				CSSClass: "HasFancyHeaders",
				Groups: [
					{
						Hash: "Author",
						Name: "Author",
						CSSClass: "FancyCustomGroupTitleOverride",
					},
					{
						Hash: "Book",
						Hash: "Book"
					}
				]
			},
			{
				Hash: "FruitGrid",
				Name: "Fruits of the World",
				Groups: [
					{
						Hash: "FruitGrid",
						Name: "FruitGrid",

						Layout: "Tabular",

						RecordSetSolvers: [
							{
								Ordinal: 0,
								Expression: "PercentTotalFat = (Fat * 9) / Calories",
							},
							{
								Ordinal: 1,
								Expression: "ProteinFatRatio = Protein / Fat * 100",
							},
							{
								Ordinal: 2,
								Expression: `HealthInfoLink = CONCAT("https://www.google.com/search?q=", Family, " health information")`,
							},
						],

						PickLists:
							[
								{
									Hash: "Families",
									ListAddress: "AppData.FruitMetaLists.Families",
									ListSourceAddress: "FruitData.FruityVice[]",
									TextTemplate: "{~D:Record.family~}",
									IDTemplate: "{~D:Record.family~}",
									Unique: true,
									Sorted: true,
									UpdateFrequency: "Once",
								},
							],
						RecordSetAddress: "FruitData.FruityVice",
						RecordManifest: "FruitEditor",

						// Opt-in column chooser (the wide fruit grid is the table that
						// earns one). Hidden columns persist in the form data at
						// FruitGrid_HiddenColumns and never lose their cell data.
						ColumnChooser: true,
					},
				],
			},
			{
				Hash: "BookGrid",
				Name: "Books of the World",
				Groups: [
					{
						Hash: "BookGrid",
						Name: "BookGrid",

						Layout: "Tabular",

						RecordSetAddress: "Books",
						RecordManifest: "BookEditor",
					},
				],
			},
			{
				Hash: "ExtraFormSections",
				Name: "Extra Form Sections"
			},
			{
				Hash: "Survey",
				Name: "Food Approval Survey",
			},
			{
				Hash: "DeliveryDestination",
				Name: "Delivery Destination",
			},
			{
				Hash: "Documentation",
				Name: "Preparation Documentation",
			},
			{
				"Name": "Array Marshalling Test",
				"Hash": "ArrayTest",
				"Solvers": [],
				"Groups": [
					{
						"Name": "",
						"Hash": "ItemTablePre"
					},
					{
						"Name": "Item Table",
						"Hash": "ItemTable",
						"Rows": [],
						"RecordSetSolvers": [],
						"Layout": "Tabular",
						"RecordSetAddress": "ItemArray",
						"RecordManifest": "ItemManifest"
					}
				]
			}
		],

		Descriptors: {
			RandomNumber: {
				Name: "Pick a Random Number",
				Hash: "PickRandomNumber",
				DataType: "String",
				PictForm:
				{
					Section: "Recipe",
					Group: "Recipe",
					Row: 1,
					InputType: "Option",
					SelectOptionsPickList: "RandomNumbers",
				},
			},
			RecipeName: {
				Name: "Recipe Name",
				Hash: "RecipeName",
				DataType: "String",
				PictForm: { Section: "Recipe", Group: "Recipe", Row: 1 },
			},
			InspirationLink: {
				Name: "Inspiration",
				Hash: "InspirationLink",
				DataType: "String",
				PictForm: { Section: "Recipe", Group: "Recipe", Row: 1, InputType: "Link" },
			},
			RecipeType: {
				Name: "Recipe Type",
				Hash: "RecipeType",
				DataType: "String",
				PictForm:
				{
					Section: "Recipe",
					Group: "Recipe",
					Row: 1
				},
			},
			RecipeDescription: {
				Name: "Description",
				Hash: "RecipeDescription",
				DataType: "String",
				PictForm: { Section: "Recipe", Group: "Recipe", Row: 2 },
			},
			Inventor: {
				Name: "Inventor",
				Hash: "Inventor",
				DataType: "String",
				PictForm: { Section: "Recipe", Group: "Recipe", Row: 3 },
			},
			Proprietary: {
				Name: "Proprietary",
				Hash: "Proprietary",
				DataType: "Boolean",
				PictForm: { InputType: "Boolean", Section: "Recipe", Group: "Recipe", Row: 3 },
			},
			"MetaFruit.Information.FavoriteGenus": {
				Name: "Favorite Genus",
				Hash: "FavoriteGenus",
				DataType: "String",
				PictForm: { Section: "Recipe", Group: "Recipe", Row: 4 },
			},
			"MetaFruit.Information.LastPrepared": {
				Name: "Last Prepared",
				Hash: "LastPrepared",
				DataType: "DateTime",
				PictForm: {
					Section: "Recipe", Group: "Recipe", Row: 4,
					"Providers": ["Pict-Input-DateTime"]
				},
			},

			"Author.IDAuthor": {
				Name: "Author ID",
				Hash: "IDAuthor",
				DataType: "Number",
				PictForm: {
					Section: "Book", Group: "Author", Row: 1, Width: 1,
					// This performs an entity bundle request whenever a value is selected.
					Providers: ["Pict-Input-EntityBundleRequest", "Pict-Input-AutofillTriggerGroup"],
					EntitiesBundle: [
						{
							"Entity": "Author",
							"Filter": "FBV~IDAuthor~EQ~{~D:Record.Value~}",
							"Destination": "AppData.CurrentAuthor",
							// This marshals a single record
							"SingleRecord": true
						},
						{
							"Entity": "BookAuthorJoin",
							"Filter": "FBV~IDAuthor~EQ~{~D:AppData.CurrentAuthor.IDAuthor~}",
							"Destination": "AppData.BookAuthorJoins"
						},
						{
							"Entity": "Book",
							"Filter": "FBL~IDBook~INN~{~PJU:,^IDBook^AppData.BookAuthorJoins~}",
							"Destination": "AppData.Books"
						}
					],
					EntityBundleTriggerGroup: "BookTriggerGroup",
					AutofillTriggerGroup:
					{
						TriggerGroupHash: "BookTriggerGroup",
						PostSolvers: [ 'refreshTabularSection("BookGrid", "BookGrid")`' ],
					},
				}
			},
			"Author.Name": {
				Name: "Author Name",
				Hash: "AuthorName",
				DataType: "String",
				PictForm: {
					Section: "Book", Group: "Author", Row: 1, Width: 1,
					// This performs an entity bundle request whenever a value is selected.
					Providers: ["Pict-Input-AutofillTriggerGroup"],
					AutofillTriggerGroup:
					{
						TriggerGroupHash: "BookTriggerGroup",
						TriggerAddress: "AppData.CurrentAuthor.Name",
						MarshalEmptyValues: true,
					}
				}
			},

			"Books": {
				Name: "Authors Book List",
				Hash: "Books",
				DataType: "Array",
				Default: []
			},
			"Books.length": {
				Name: "Number of Books",
				Hash: "NumBooks",
				DataType: "PreciseNumber",
				Default: "0"
			},
			"Book.IDBook": {
				Name: "Specific Book",
				Hash: "SpecificIDBook",
				DataType: "Number",
				PictForm: {
					Section: "Book",
					Group: "Book",
					Row: 1, Width: 1,
					InputType: "Option",
					SelectOptionsPickList: "Books",
					// This performs an entity bundle request whenever a value is selected.
					Providers: ["Pict-Input-Select", "Pict-Input-AutofillTriggerGroup"],
					AutofillTriggerGroup:
					{
						TriggerGroupHash: "BookTriggerGroup",
						SelectOptionsRefresh: true
					}
				}
			},

			"SimpleGraphExampleRawDataOne":
			{
				Name: "SimpleGraphExampleOne",
				Hash: "SimpleGraphExampleOne",

				DataType: "Object",
				PictForm:
				{
					Section: "Chart",
					Group: "SimpleChart",

					Row: 1,
					Width: 3,

					InputType: "Chart",

					ChartLabelsRaw: ['Red', 'Green', 'Yellow', 'Grey', 'Blue'],

					ChartDatasetsRaw: [{
						label: 'My First Dataset',
						data: [11, 16, 7, 3, 14],
						backgroundColor: 
						[
							'rgb(255, 99, 132)',
							'rgb(75, 192, 192)',
							'rgb(255, 205, 86)',
							'rgb(201, 203, 207)',
							'rgb(54, 162, 235)'
						]
					}],

					ChartConfigCorePrototypeRaw:
					{
						type: 'polarArea'
					}
				}
			},

			"SimpleGraphExampleRawDataTwo":
			{
				Name: "SimpleGraphExampleTwo",
				Hash: "SimpleGraphExampleTwo",

				DataType: "Object",
				PictForm:
				{
					Section: "Chart",
					Group: "SimpleChart",

					Row: 2,
					Width: 6,

					InputType: "Chart",

					ChartType: "bar",
					ChartLabelsSolver: `objectkeystoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.calories"))`,
					ChartDatasetsSolvers:
						[
							{
								Label: 'Calories',
								DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.calories"))` 
							}
						]
				}
			},
			
			"SimpleGraphExampleRawDataThree":
			{
				Name: "SimpleGraphExampleThree",
				Hash: "SimpleGraphExampleThree",

				DataType: "Object",
				PictForm:
				{
					Section: "Chart",
					Group: "SimpleChart",

					Row: 2,
					Width: 6,

					InputType: "Chart",

					ChartType: "bar",
					ChartLabelsSolver: `objectkeystoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.fat"))`,
					ChartDatasetsSolvers: 
						[
							{
								Label: 'Fat',
								DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.fat"))` 
							},
							{
								Label: 'Carbohydrates',
								DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.carbohydrates"))` 
							},
							{
								Label: 'Protein',
								DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.protein"))` 
							},
							{
								Label: 'Sugars',
								DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.sugar"))` 
							}
						]
				}
			},

			"WideGraphExample": {
				Name: "WideGraphExample",
				Hash: "WideGraphExample",
				DataType: "Object",
				PictForm:
				{
					Section: "Chart",
					Group: "SimpleChart",
					Row: 3,
					Width: 12,
					InputType: "Chart",

					ChartLabelsRaw: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],

					ChartDatasetsRaw: [
						{
							label: 'Awesomeness',
							data: [1500, 1200, 800, 1700, 900, 2000]
						}],

					// Do anything you want here!!
					ChartConfigCorePrototypeRaw:
					{
						type: 'bar',
						options: {
							scales: {
								y: {
									beginAtZero: true
								}
							}
						}
					}
				}
			},

			"AddressGraphExample": {
				Name: "AddressGraphExample",
				Hash: "AddressGraphExample",
				DataType: "Object",
				PictForm:
				{
					Section: "Chart",
					Group: "SimpleChart",
					Row: 4,
					Width: 6,
					InputType: "Chart",

					// All three Address keys resolve against the app state
					ChartLabelsAddress: "AppData.ChartExamples.Labels",
					ChartDatasetsAddress: "AppData.ChartExamples.Datasets",
					ChartConfigCorePrototypeAddress: "AppData.ChartExamples.CoreConfiguration"
				}
			},

			"LayeredGraphExample": {
				Name: "LayeredGraphExample",
				Hash: "LayeredGraphExample",
				DataType: "Object",
				PictForm:
				{
					Section: "Chart",
					Group: "SimpleChart",
					Row: 4,
					Width: 6,
					InputType: "Chart",

					ChartType: "bar",
					ChartLabelsSolver: `flatten(ChartExamples.Harvest[].Fruit)`,

					// The Raw datasets come first; the solver datasets are added after them
					ChartDatasetsRaw: [
						{
							type: 'line',
							label: 'Goal',
							data: [10, 10, 10, 10]
						}],
					ChartDatasetsSolvers:
						[
							{
								Label: 'Picked',
								DataSolver: `flatten(ChartExamples.Harvest[].Picked)`
							}
						],

					ChartConfigCorePrototypeRaw:
					{
						options: { plugins: { title: { display: true, text: 'Raw Goal line plus a solver Picked series' } } }
					}
				}
			},

			"LineStyleGraphExample": {
				Name: "LineStyleGraphExample",
				Hash: "LineStyleGraphExample",
				DataType: "Object",
				PictForm:
				{
					Section: "Chart",
					Group: "SimpleChart",
					Row: 5,
					Width: 12,
					InputType: "Chart",

					ChartType: "line",
					ChartLabelsSolver: `flatten(ChartExamples.Harvest[].Fruit)`,
					ChartDatasetsSolvers:
						[
							{
								Label: 'Picked (chart default curve and points)',
								DataSolver: `flatten(ChartExamples.Harvest[].Picked)`
							},
							{
								Label: 'Sold (Tension 0, PointRadius 0)',
								DataSolver: `flatten(ChartExamples.Harvest[].Sold)`,
								Tension: 0,
								PointRadius: 0
							}
						],

					// A curve and large points by default, so a 0 on the dataset is visible
					ChartJSOptionsCorePrototype:
					{
						options: {
							elements: {
								line: { tension: 0.4 },
								point: { radius: 6 }
							},
							plugins: { title: { display: true, text: 'Tension 0 and PointRadius 0 override the chart defaults' } }
						}
					},

					ChartLegend: true
				}
			},

			"UI.StatisticsTabState": {
				Name: "Statistics Tab State",
				Hash: "StatisticsTabState",
				DataType: "String",
				PictForm: {
					Section: "Recipe",
					Group: "StatisticsTabs",
					InputType: "TabGroupSelector",
					// The default when there is no state is the first entry here.
					// If you want to set a default, you can just do it in the state address though.
					TabGroupSet: ["Statistics", "FruitStatistics"],
					TabGroupNames: ["Statistics", "Fruit Statistics"],
				}
			},

			"UI.ExtraSectionSelection": {
				Name: "Extra Form Sections",
				Hash: "ExtraFormSectionSelection",
				DataType: "String",
				PictForm: {
					Section: "ExtraFormSections",
					InputType: "TabSectionSelector",
					// The default when there is no state is the first entry here.
					// If you want to set a default, you can just do it in the state address though.
					TabSectionSet: ["Survey", "DeliveryDestination", "Documentation"],
					TabSectionNames: ["Survey", "Delivery Destination", "Documentation"]
				}
			},

			"Recipe.Feeds": {
				Name: "Feeds",
				Hash: "RecipeFeeds",
				DataType: "PreciseNumber",
				Default: "1",
				PictForm: {
					Section: "Recipe", Group: "Statistics", Row: 1, Width: 1,
					"ExtraDescription": "How many people does this recipe feed?",
					"InputType": "Option",
					"Providers": ["CustomDataProvider", "Pict-Input-Select"],
					"SelectOptions": [{ "id": "few", "text": "Few" }, { "id": "some", "text": "Some" }, { "id": "many", "text": "Many" }]
				},
			},
			"Recipe.TotalCalories": {
				Name: "Calories in the Fruits",
				Hash: "RecipeCalories",
				DataType: "PreciseNumber",
				Default: "1",
				PictForm: {
					Section: "Recipe",
					Group: "Statistics",
					Row: 1,
					Width: 1
				},
			},

			"Recipe.CounterWidth": {
				Name: "Counter Prep Width Requirements",
				Hash: "RecipeCounterWidth",
				DataType: "Number",
				Default: "10",
				PictForm: { Section: "Recipe", Group: "Statistics", Row: 2, Width: 1 },
			},
			"Recipe.CounterDepth": {
				Name: "Counter Prep Depth Requirements",
				Hash: "RecipeCounterDepth",
				DataType: "Number",
				Default: "5",
				PictForm: { Section: "Recipe", Group: "Statistics", Row: 2, Width: 1 },
			},
			"Recipe.CounterSurfaceArea": {
				Name: "Required Counter Surface Area",
				Hash: "RecipeCounterSurfaceArea",
				DataType: "PreciseNumber",
				PictForm: { Section: "Recipe", Group: "Statistics", Row: 2, Width: 1, "InputType": "PreciseNumberReadOnly", "DecimalPrecision": 3, "DigitsPostfix": " sq. in." },
			},

			"Recipe.VerticalClearance": {
				Name: "Prep Vertical Clearance",
				Hash: "RecipeVerticalClearance",
				DataType: "Number",
				Default: "12",
				PictForm: { Section: "Recipe", Group: "Statistics", Row: 3, Width: 1 },
			},
			"Recipe.PrepVolume": {
				Name: "Preparation Volume Requirements",
				Hash: "RecipeCounterVolume",
				DataType: "PreciseNumber",
				PictForm: { Section: "Recipe", Group: "Statistics", Row: 3, Width: 1 },
			},
			"Recipe.MoistureContent": {
				Name: "Required Moisture Content",
				Hash: "RecipeMoistureContent",
				DataType: "PreciseNumber",
				PictForm: { Section: "Recipe", Group: "Statistics", Row: 3, Width: 1 },
			},

			"FruitStats.TotalCalories": {
				Name: "Total Calories in All Fruits",
				Hash: "TotalFruitCalories",
				DataType: "PreciseNumber",
				PictForm: {
					DecimalPrecision: 3,
					RoundingMethod: 0,
					Section: "Recipe",
					Group: "FruitStatistics",
					Row: 1,
					Width: 1,
				},
			},
			"FruitStats.AverageCalories": {
				Name: "Average (mean) Calories in All Fruits",
				Hash: "AverageFruitCalories",
				DataType: "PreciseNumber",
				PictForm: {
					Section: "Recipe",
					Group: "FruitStatistics",
					Row: 1,
					Width: 1,
				},
			},
			"FruitStats.AverageFatPercent": {
				Name: "Average (mean) Fat Percentage in All Fruits",
				Hash: "AverageFatPercent",
				DataType: "PreciseNumber",
				PictForm: {
					Section: "Recipe",
					Group: "FruitStatistics",
					Row: 1,
					Width: 1,
				},
			},

			"FruitData.FruityVice": {
				Name: "Fruits of the Earth",
				Hash: "FruitGrid",
				DataType: "Array",
				Default: []
			},

			"FruitData.FruityVice[].nutritions.calories": {
				Hash: "FruitNutritionCalories",
			},
			"FruitData.FruityVice[].health_info": {
				Hash: "FruitHealthInfo",
			},
			"FruitData.FruityVice[].nutritions.percent_total_fat": {
				Hash: "FruitPercentTotalFat",
			},


			"Survey.Subject": {
				Name: "Subject",
				Hash: "SurveySubject",
				DataType: "String",
				PictForm: {
					Section: "Survey",
					Group: "SurveyContent",
					Row: 1,
					Width: 1,
				},
			},
			"Survey.Content": {
				Name: "Content",
				Hash: "SurveyContent",
				DataType: "String",
				PictForm: {
					Section: "Survey",
					InputType: "TextArea",
					Group: "SurveyContent",
					Row: 2,
					Width: 1,
				},
			},

			"Distribution.Address": {
				Name: "Address",
				Hash: "DistributionAddress",
				DataType: "String",
				PictForm: {
					Section: "DeliveryDestination",
					InputType: "TextArea",
					Group: "DeliveryDestinationAddress",
					Row: 1,
					Width: 1,
				},
			},
			"Distribution.City": {
				Name: "City",
				Hash: "DistributionAddressCity",
				DataType: "String",
				PictForm: {
					Section: "DeliveryDestination",
					Group: "DeliveryDestinationAddress",
					Row: 2,
					Width: 1,
				},
			},
			"Distribution.State": {
				Name: "State",
				Hash: "DistributionAddressState",
				DataType: "String",
				PictForm: {
					Section: "DeliveryDestination",
					Group: "DeliveryDestinationAddress",
					Row: 2,
					Width: 1,
				},
			},
			"Distribution.Zip": {
				Name: "Zip",
				Hash: "DistributionAddressZip",
				DataType: "String",
				PictForm: {
					Section: "DeliveryDestination",
					Group: "DeliveryDestinationAddress",
					Row: 2,
					Width: 1,
				},
			},

			"Documentation.Title": {
				Name: "Title",
				Hash: "DocumentationTitle",
				DataType: "String",
				PictForm: {
					Section: "Documentation",
					Group: "Documentation",
					Row: 1,
					Width: 1,
				},
			},
			"Documentation.Body": {
				Name: "Body",
				Hash: "DocumentationBody",
				DataType: "String",
				PictForm: {
					Section: "Documentation",
					InputType: "TextArea",
					Group: "Documentation",
					Row: 2,
					Width: 1,
				},
			},
			"Placeholder": {
				"Hash": "Placeholder",
				"Name": "Placeholder",
				"PictForm":
				{
					"Section": "Recipe",
					"Group": "Recipe",
					/*
					 * NOTE: This input creates an infinite loop if in the ArrayTest section
					 *       Uncomment this to test the infinite loop protection
					"Section": "ArrayTest",
					"Group": "ItemTablePre",
					 */
					"InputType": "Hidden",
					"Providers": [ "Pict-Input-EntityBundleRequest" ],
					"EntityBundleTriggerGroup": "SourceDataChange",
					"EntityBundleTriggerWithoutValue": true,
					"EntityBundleTriggerOnInitialize": true,
					"EntitiesBundle": [],
				}
			},
			"ItemArray": {
				"Hash": "ItemArray",
				"Name": "Item Array",
				"DataAddress": "ItemArray",
				"DataType": "Array",
				"PictForm": {
					"Row": "0",
					"Width": "0",
					"InputType": "Hidden",
					"Providers": [
						"Pict-Input-AutofillTriggerGroup"
					],
					"AutofillTriggerGroup": [
						{
							"TriggerGroupHash": "SourceDataChange",
							"MarshalEmptyValues": true,
							"TriggerAddress": "AppData.SourceArray",
							"PostSolvers": [
								'refreshtabularsection("ArrayTest","ItemTable")'
							]
						}
					],
					"Section": "ArrayTest",
					"Group": "ItemTablePre"
				}
			},
		},

		ReferenceManifests: {
			DynamicSection1: {
				Scope: "DynamicSection1",
				Descriptors: {
					DynamicField1: {
						Name: "Dynamic Field 1",
						Hash: "DynamicField1",
						DataType: "String",
						PictForm: { Section: "DynamicSection1", Group: "DynamicGroup1", Row: 1 },
					},
					DynamicField2: {
						Name: "Dynamic Field 2",
						Hash: "DynamicField2",
						DataType: "String",
						PictForm: { Section: "DynamicSection1", Group: "DynamicGroup2", Row: 1 },
					},
				},
				Sections: [
					{
						Hash: "DynamicSection1",
						Name: "Dynamic Section 1",
						Groups: [
							{
								Hash: "DynamicGroup1",
								Name: "Dynamic Group 1",
							},
							{
								Hash: "DynamicGroup2",
								Name: "Dynamic Group 2",
							}
						]
					}
				]
			},
			FruitEditor: {
				Scope: "FruitEditor",

				Descriptors: {
					name: {
						Name: "Fruit Name",
						Hash: "Name",
						DataType: "String",
						Default: "(unnamed fruit)",
						PictForm: { Row: "1", Section: "FruitGrid", Group: "FruitGrid" },
					},
					health_info: {
						Name: "Health Info.",
						Hash: "HealthInfoLink",
						DataType: "String",
						Default: "",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid", "InputType": "Link" },
					},
					family: {
						Name: "Family",
						Hash: "Family",
						DataType: "String",
						PictForm: {
							Section: "FruitGrid", Group: "FruitGrid", "InputType": "Option",
							"Providers": ["Pict-Input-Select"],
							"SelectOptionsPickList": "Families"
						}
					},
					order: {
						Name: "Order",
						Hash: "Order",
						DataType: "String",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" },
					},
					genus: {
						Name: "Genus",
						Hash: "Genus",
						DataType: "String",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" },
					},
					lastWatered: {
						Name: "Last Watered",
						Hash: "LastWatered",
						DataType: "DateTime",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid", "InputType": "DateTime", "Providers": ["Pict-Input-DateTime"] },
					},
					"nutritions.calories": {
						Name: "Calories",
						Hash: "Calories",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" },
					},
					"SummedCalories": {
						Name: "Summed Calories (cumulative)",
						Hash: "SummedCalories",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" },
					},
					"nutritions.fat": {
						Name: "Fat",
						Hash: "Fat",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" },
					},
					"nutritions.carbohydrates": {
						Name: "Carbohydrates",
						Hash: "Carbs",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" },
					},
					"nutritions.protein": {
						Name: "Protein",
						Hash: "Protein",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" },
					},
					"nutritions.protein_fat_ratio": {
						Name: "Protein Fat Ratio",
						Hash: "ProteinFatRatio",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid", TabularHidden: true },
					},
					"nutritions.percent_total_fat": {
						Name: "PercentTotalFat",
						Hash: "PercentTotalFat",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid", "InputType": "PreciseNumberReadOnly", "DecimalPrecision": 4 },
					},
					"Author.Name": {
						Name: "Author Name",
						Hash: "AuthorNameTabular",
						DataType: "String",
						PictForm: {
							Row: "1",
							Section: "FruitGrid", Group: "FruitGrid",
							// This performs an entity bundle request whenever a value is selected.
							Providers: ["Pict-Input-AutofillTriggerGroup"],
							AutofillTriggerGroup:
							{
								TriggerGroupHash: "BookTriggerGroup",
								TriggerAddress: "AppData.CurrentAuthor.Name",
								MarshalEmptyValues: true
							}
						}
					},
				},
			},
			BookEditor: {
				Scope: "BookEditor",

				Descriptors: {
					Title: {
						Name: "Book Title",
						Hash: "Title",
						DataType: "String",
						Default: "(unnamed book)",
						PictForm: { Row: "1", Section: "BookGrid", Group: "BookGrid" },
					},
				},
			},
			"ItemManifest": {
				"Scope": "ItemManifest",
				"Descriptors": {
					"ItemID": {
						"Hash": "ItemID",
						"Name": "Item ID",
						"DataAddress": "ItemID",
						"DataType": "Number",
						"PictForm": {
							"Row": "1",
							"Width": "8",
							"InputType": "ReadOnly"
						}
					},
					"HiddenValue": {
						"Hash": "HiddenValue",
						"Name": "Hidden Value",
						"DataAddress": "HiddenValue",
						"DataType": "String",
						"PictForm": {
							"Row": "1",
							"Width": "8",
							"InputType": "Hidden",
							"TabularHidden": true
						}
					},
					"Value": {
						"Hash": "Value",
						"Name": "Value",
						"DataAddress": "Value",
						"DataType": "String",
						"PictForm": {
							"Row": "1",
							"Width": "8"
						}
					}
				},
				"Sections": [],
				"ReferenceManifests": {}
			}
		},
	},
};
