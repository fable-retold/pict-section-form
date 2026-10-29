/**
 * Fruit Nutrition Analysis Lab
 *
 * Demonstrates dynamic section injection with solver rewriting,
 * advanced math, Chart.js visualizations, and histograms.
 *
 * Injectable modules:
 *   CalorieAnalysis  — calorie distribution stats, bar histogram, polar area chart
 *   MacroBreakdown   — macronutrient composition, multi-dataset bar, polar chart
 *
 * Each module can be injected multiple times; createDistinctManifest
 * rewrites solver expressions so every copy is independently scoped.
 *
 * @license MIT
 * @author  Steven Velozo <steven@velozo.com>
 */
const libPictSectionForm = require('../../source/Pict-Section-Form.js');

class DynamicAnalysisApplication extends libPictSectionForm.PictFormApplication
{
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);
		this._injectionCounter = 0;
	}
}

module.exports = DynamicAnalysisApplication;

module.exports.default_configuration = libPictSectionForm.PictFormApplication.default_configuration;
module.exports.default_configuration.pict_configuration =
{
	Product: "FruitNutritionAnalysisLab",

	DefaultAppData: Object.assign({}, require("./FruitData.json")),

	DefaultFormManifest:
	{
		Scope: "FruitAnalysisLab",

		Sections:
		[
			{
				Hash: "OverviewCharts",
				Name: "Nutrition Overview",
				Groups:
				[
					{ Hash: "OverviewCharts", Name: "Overview Charts" }
				]
			},
			{
				Hash: "FruitGrid",
				Name: "Fruit Data Explorer",

				Solvers:
				[
					"TotalDatasetCalories = SUM(FruitCalories)",
					"AverageDatasetCalories = MEAN(FruitCalories)",
					"DatasetFruitCount = COUNT(FruitCalories)",
				],

				Groups:
				[
					{
						Hash: "FruitSummary",
						Name: "Dataset Summary"
					},
					{
						Hash: "FruitGrid",
						Name: "All Fruits",

						Layout: "Tabular",

						RecordSetSolvers:
						[
							{
								Ordinal: 0,
								Expression: "CaloriesFromFat = Fat * 9",
							},
							{
								Ordinal: 1,
								Expression: "CalorieDensity = Calories / (Fat + Carbohydrates + Protein + 0.001) * 100",
							},
							{
								Ordinal: 2,
								Expression: "SugarRatio = Sugar / (Carbohydrates + 0.001) * 100",
							},
						],

						RecordSetAddress: "FruitData.FruityVice",
						RecordManifest: "FruitEditor",
					}
				]
			},
		],

		Descriptors:
		{
			// ── Array hash for the full dataset ─────────────────────────
			"FruitData.FruityVice":
			{
				Name: "Fruit Dataset",
				Hash: "FruitGrid",
				DataType: "Array",
				Default: []
			},

			// ── Array-element hashes used by SUM/MEAN/etc. ──────────────
			"FruitData.FruityVice[].nutritions.calories": { Hash: "FruitCalories" },
			"FruitData.FruityVice[].nutritions.fat":      { Hash: "FruitFat" },
			"FruitData.FruityVice[].nutritions.sugar":    { Hash: "FruitSugar" },
			"FruitData.FruityVice[].nutritions.carbohydrates": { Hash: "FruitCarbs" },
			"FruitData.FruityVice[].nutritions.protein":  { Hash: "FruitProtein" },

			// ── Dataset summary (read-only computed fields) ─────────────
			"DatasetSummary.TotalCalories":
			{
				Name: "Total Calories (All Fruits)",
				Hash: "TotalDatasetCalories",
				DataType: "PreciseNumber",
				PictForm:
				{
					Section: "FruitGrid", Group: "FruitSummary",
					Row: 1, Width: 4,
					InputType: "PreciseNumberReadOnly",
					DecimalPrecision: 0
				}
			},
			"DatasetSummary.AverageCalories":
			{
				Name: "Average Calories per Fruit",
				Hash: "AverageDatasetCalories",
				DataType: "PreciseNumber",
				PictForm:
				{
					Section: "FruitGrid", Group: "FruitSummary",
					Row: 1, Width: 4,
					InputType: "PreciseNumberReadOnly",
					DecimalPrecision: 2
				}
			},
			"DatasetSummary.FruitCount":
			{
				Name: "Fruit Count",
				Hash: "DatasetFruitCount",
				DataType: "PreciseNumber",
				PictForm:
				{
					Section: "FruitGrid", Group: "FruitSummary",
					Row: 1, Width: 4,
					InputType: "PreciseNumberReadOnly",
					DecimalPrecision: 0
				}
			},

			// ── Overview charts ─────────────────────────────────────────
			"OverviewChart.CalorieHistogram":
			{
				Name: "Calorie Distribution (All Fruits)",
				Hash: "OverviewCalorieHistogram",
				DataType: "Object",
				PictForm:
				{
					Section: "OverviewCharts", Group: "OverviewCharts",
					Row: 1, Width: 8,
					InputType: "Chart",
					ChartType: "bar",
					ChartLabelsSolver: `objectkeystoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.calories"))`,
					ChartDatasetsSolvers:
					[
						{
							Label: 'Calories per Fruit',
							DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.calories"))`
						}
					]
				}
			},
			"OverviewChart.FamilyComposition":
			{
				Name: "Fruit Families (by Calorie Contribution)",
				Hash: "OverviewFamilyChart",
				DataType: "Object",
				PictForm:
				{
					Section: "OverviewCharts", Group: "OverviewCharts",
					Row: 1, Width: 4,
					InputType: "Chart",
					ChartType: "polarArea",
					ChartLabelsSolver: `objectkeystoarray(aggregationhistogrambyobject(FruitGrid, "family", "nutritions.calories"))`,
					ChartDatasetsSolvers:
					[
						{
							Label: 'Total Calories by Family',
							DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "family", "nutritions.calories"))`
						}
					]
				}
			},
			"OverviewChart.SugarAndCarbohydrates":
			{
				Name: "Sugar vs Carbohydrates (values on the points; crowded labels move or hide)",
				Hash: "OverviewSugarCarbChart",
				DataType: "Object",
				PictForm:
				{
					Section: "OverviewCharts", Group: "OverviewCharts",
					Row: 2, Width: 12,
					InputType: "Chart",
					ChartType: "line",
					ChartHeight: 320,
					ChartValueLabels: { Decimals: 1, Color: "Dataset" },
					ChartLabelsSolver: `objectkeystoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.sugar"))`,
					ChartDatasetsSolvers:
					[
						{
							Label: 'Carbohydrates (g)',
							DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.carbohydrates"))`,
							DatasetOptions: { borderColor: '#1971C2', backgroundColor: '#1971C2' }
						},
						{
							Label: 'Sugar (g)',
							DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.sugar"))`,
							DatasetOptions: { borderColor: '#E8590C', backgroundColor: '#E8590C' }
						},
						{
							Label: 'Protein (g, unlabelled)',
							DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.protein"))`,
							ValueLabels: false,
							DatasetOptions: { borderColor: '#868E96', backgroundColor: '#868E96', borderDash: [ 4, 4 ] }
						}
					]
				}
			},
		},

		// ════════════════════════════════════════════════════════════
		//  Reference Manifests (FruitEditor + two injectable modules)
		// ════════════════════════════════════════════════════════════
		ReferenceManifests:
		{
			// ── Fruit grid row editor ───────────────────────────────
			FruitEditor:
			{
				Scope: "FruitEditor",
				Descriptors:
				{
					name:
					{
						Name: "Fruit",
						Hash: "Name",
						DataType: "String",
						Default: "(unnamed fruit)",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" }
					},
					family:
					{
						Name: "Family",
						Hash: "Family",
						DataType: "String",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" }
					},
					"nutritions.calories":
					{
						Name: "Cal",
						Hash: "Calories",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" }
					},
					"nutritions.fat":
					{
						Name: "Fat",
						Hash: "Fat",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" }
					},
					"nutritions.sugar":
					{
						Name: "Sugar",
						Hash: "Sugar",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" }
					},
					"nutritions.carbohydrates":
					{
						Name: "Carbs",
						Hash: "Carbohydrates",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" }
					},
					"nutritions.protein":
					{
						Name: "Protein",
						Hash: "Protein",
						DataType: "Number",
						PictForm: { Section: "FruitGrid", Group: "FruitGrid" }
					},
					"nutritions.calories_from_fat":
					{
						Name: "Cal from Fat",
						Hash: "CaloriesFromFat",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "FruitGrid", Group: "FruitGrid",
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 1
						}
					},
					"nutritions.calorie_density":
					{
						Name: "Density",
						Hash: "CalorieDensity",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "FruitGrid", Group: "FruitGrid",
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 2
						}
					},
					"nutritions.sugar_ratio":
					{
						Name: "Sugar %",
						Hash: "SugarRatio",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "FruitGrid", Group: "FruitGrid",
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 1
						}
					},
				}
			},

			// ═══════════════════════════════════════════════════════
			//  Injectable Module 1 — Calorie Distribution Analysis
			// ═══════════════════════════════════════════════════════
			CalorieAnalysis:
			{
				Scope: "CalorieAnalysis",

				Sections:
				[
					{
						Hash: "CalorieAnalysis",
						Name: "Calorie Distribution Analysis",

						Solvers:
						[
							// ── Aggregate statistics (ordinal 0-5) ──
							{ Ordinal: 0,  Expression: "TotalCalories = SUM(FruitCalories)" },
							{ Ordinal: 1,  Expression: "AverageCalories = MEAN(FruitCalories)" },
							{ Ordinal: 2,  Expression: "MinCalories = MIN(FruitCalories)" },
							{ Ordinal: 3,  Expression: "MaxCalories = MAX(FruitCalories)" },
							{ Ordinal: 4,  Expression: "MedianCalories = MEDIAN(FruitCalories)" },
							{ Ordinal: 5,  Expression: "CalorieFruitCount = COUNT(FruitCalories)" },

							// ── Derived metrics (ordinal 10-14) — advanced math ──
							{ Ordinal: 10, Expression: "CalorieRange = MaxCalories - MinCalories" },
							{ Ordinal: 11, Expression: "CaloriesPerFruit = TotalCalories / CalorieFruitCount" },
							// Energy Index:  √(Total) × Average / 100
							{ Ordinal: 12, Expression: "EnergyIndex = sqrt(TotalCalories) * AverageCalories / 100" },
							// Distribution Skew Proxy:  (Mean − Median) / Range × 100
							{ Ordinal: 13, Expression: "SkewProxy = (AverageCalories - MedianCalories) / (CalorieRange + 0.001) * 100" },
							// User-adjustable weighted energy
							{ Ordinal: 14, Expression: "WeightedEnergy = EnergyIndex * AnalysisWeight" },
							// Coefficient of variation proxy:  Range / Mean × 100
							{ Ordinal: 15, Expression: "CoeffOfVariation = CalorieRange / (AverageCalories + 0.001) * 100" },
							// Log-scale calorie spread:  √(Range × Mean)
							{ Ordinal: 16, Expression: "LogCalorieSpread = sqrt(CalorieRange * AverageCalories)" },

							// ── AppData-prefixed getvalue — demonstrates mid-address rewriting ──
							// Each injected copy gets its own UUID-scoped addresses in AppData.
							// getvalue("AppData.Analysis.TotalCalories") becomes
							// getvalue("AppData.<UUID>.Analysis.TotalCalories") after injection.
							{ Ordinal: 30, Expression: 'GlobalTotalCalories = getvalue("AppData.Analysis.TotalCalories")' },
							// Verify the global read matches the locally-computed value
							{ Ordinal: 31, Expression: 'CalorieReadbackDelta = GlobalTotalCalories - TotalCalories' },
							// Use AppData state address in a computation — {AppData.Analysis.X} also gets rewritten
							{ Ordinal: 32, Expression: 'EnergyDensityFromGlobal = {AppData.Analysis.TotalCalories} / (CalorieFruitCount + 0.001)' },
							// setvalue to write a computed result back to a different AppData address
							{ Ordinal: 33, Expression: 'setvalue("AppData.Analysis.NormalizedEnergy", EnergyDensityFromGlobal / 100)' },

							// ── Conditional visibility via annotated function ──
							// hidesections / setsectionvisibility have AddressParameterIndices
							// so "CalorieDetail" gets rewritten to "CalorieDetail_<UUID>"
							{ Ordinal: 50, Expression: 'hidesections("CalorieDetail")' },
							{ Ordinal: 51, Expression: 'setsectionvisibility("CalorieDetail", IF(AverageCalories, ">", 50, 1, 0))' },
						],

						Groups:
						[
							{ Hash: "CalorieStats", Name: "Statistical Summary" },
							{ Hash: "CalorieGlobalState", Name: "Global State Cross-Reference (AppData)" },
							{ Hash: "CalorieCharts", Name: "Calorie Visualizations" },
						]
					},
					{
						Hash: "CalorieDetail",
						Name: "Calorie Deep Dive (auto-shown when average > 50)",
						Groups:
						[
							{ Hash: "CalorieDetailInfo", Name: "Extended Analysis" }
						]
					}
				],

				Descriptors:
				{
					// ── Aggregate stats ──
					"Analysis.TotalCalories":
					{
						Name: "Total Calories",
						Hash: "TotalCalories",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 1, Width: 2,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 0
						}
					},
					"Analysis.AverageCalories":
					{
						Name: "Mean",
						Hash: "AverageCalories",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 1, Width: 2,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 2
						}
					},
					"Analysis.MedianCalories":
					{
						Name: "Median",
						Hash: "MedianCalories",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 1, Width: 2,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 2
						}
					},
					"Analysis.MinCalories":
					{
						Name: "Min",
						Hash: "MinCalories",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 1, Width: 2,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 0
						}
					},
					"Analysis.MaxCalories":
					{
						Name: "Max",
						Hash: "MaxCalories",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 1, Width: 2,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 0
						}
					},
					"Analysis.CalorieFruitCount":
					{
						Name: "Count",
						Hash: "CalorieFruitCount",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 1, Width: 2,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 0
						}
					},

					// ── Derived metrics ──
					"Analysis.CalorieRange":
					{
						Name: "Range (Max − Min)",
						Hash: "CalorieRange",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 2, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 0
						}
					},
					"Analysis.CaloriesPerFruit":
					{
						Name: "Cal / Fruit",
						Hash: "CaloriesPerFruit",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 2, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 2
						}
					},
					"Analysis.EnergyIndex":
					{
						Name: "Energy Index (√Total × Avg / 100)",
						Hash: "EnergyIndex",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 2, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 3
						}
					},
					"Analysis.SkewProxy":
					{
						Name: "Skew Proxy ((Avg − Med) / Range × 100)",
						Hash: "SkewProxy",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 2, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 3
						}
					},

					// ── Third row: CV, log spread, weight ──
					"Analysis.CoeffOfVariation":
					{
						Name: "CV Proxy (Range / Mean × 100)",
						Hash: "CoeffOfVariation",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 3, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 2
						}
					},
					"Analysis.LogCalorieSpread":
					{
						Name: "Log Spread (√(Range × Mean))",
						Hash: "LogCalorieSpread",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 3, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 3
						}
					},
					"Analysis.AnalysisWeight":
					{
						Name: "Weight Factor",
						Hash: "AnalysisWeight",
						DataType: "Number",
						Default: "1",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 3, Width: 3
						}
					},
					"Analysis.WeightedEnergy":
					{
						Name: "Weighted Energy (Index × Weight)",
						Hash: "WeightedEnergy",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieStats",
							Row: 3, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 3
						}
					},

					// ── Global state cross-reference (AppData-prefixed getvalue) ──
					"Analysis.GlobalTotalCalories":
					{
						Name: "Global Total (via getvalue AppData)",
						Hash: "GlobalTotalCalories",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieGlobalState",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 0
						}
					},
					"Analysis.CalorieReadbackDelta":
					{
						Name: "Readback Delta (should be 0)",
						Hash: "CalorieReadbackDelta",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieGlobalState",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 6
						}
					},
					"Analysis.EnergyDensityFromGlobal":
					{
						Name: "Energy Density (from {AppData} state address)",
						Hash: "EnergyDensityFromGlobal",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieGlobalState",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 3
						}
					},
					"Analysis.NormalizedEnergy":
					{
						Name: "Normalized Energy (via setvalue AppData)",
						Hash: "NormalizedEnergy",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieGlobalState",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 5
						}
					},

					// ── Detail section (conditionally visible) ──
					"Analysis.DetailNote":
					{
						Name: "Analysis Note",
						Hash: "DetailNote",
						DataType: "String",
						Default: "Average calories exceed 50 kcal — this is a high-energy dataset.",
						PictForm:
						{
							Section: "CalorieDetail", Group: "CalorieDetailInfo",
							Row: 1, Width: 12,
							InputType: "ReadOnly"
						}
					},

					// ── Charts ──
					"Analysis.CalorieBarChart":
					{
						Name: "Calorie Histogram",
						Hash: "CalorieBarChart",
						DataType: "Object",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieCharts",
							Row: 1, Width: 8,
							InputType: "Chart",
							ChartType: "bar",
							ChartLabelsSolver: `objectkeystoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.calories"))`,
							ChartDatasetsSolvers:
							[
								{
									Label: 'Calories (kcal)',
									DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.calories"))`
								}
							]
						}
					},
					"Analysis.CalorieFamilyChart":
					{
						Name: "Calories by Botanical Family",
						Hash: "CalorieFamilyChart",
						DataType: "Object",
						PictForm:
						{
							Section: "CalorieAnalysis", Group: "CalorieCharts",
							Row: 1, Width: 4,
							InputType: "Chart",
							ChartType: "polarArea",
							ChartLabelsSolver: `objectkeystoarray(aggregationhistogrambyobject(FruitGrid, "family", "nutritions.calories"))`,
							ChartDatasetsSolvers:
							[
								{
									Label: 'Total Calories by Family',
									DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "family", "nutritions.calories"))`
								}
							]
						}
					},
				}
			},

			// ═══════════════════════════════════════════════════════
			//  Injectable Module 2 — Macronutrient Composition
			// ═══════════════════════════════════════════════════════
			MacroBreakdown:
			{
				Scope: "MacroBreakdown",

				Sections:
				[
					{
						Hash: "MacroBreakdown",
						Name: "Macronutrient Composition Analysis",

						Solvers:
						[
							// ── Aggregate totals (ordinal 0-3) ──
							{ Ordinal: 0,  Expression: "TotalFat = SUM(FruitFat)" },
							{ Ordinal: 1,  Expression: "TotalProtein = SUM(FruitProtein)" },
							{ Ordinal: 2,  Expression: "TotalCarbs = SUM(FruitCarbs)" },
							{ Ordinal: 3,  Expression: "TotalSugar = SUM(FruitSugar)" },

							// ── Composition percentages (ordinal 10-14) ──
							{ Ordinal: 10, Expression: "MacroTotal = TotalFat + TotalProtein + TotalCarbs" },
							{ Ordinal: 11, Expression: "FatPercent = TotalFat / (MacroTotal + 0.001) * 100" },
							{ Ordinal: 12, Expression: "ProteinPercent = TotalProtein / (MacroTotal + 0.001) * 100" },
							{ Ordinal: 13, Expression: "CarbPercent = TotalCarbs / (MacroTotal + 0.001) * 100" },
							{ Ordinal: 14, Expression: "SugarToCarbRatio = TotalSugar / (TotalCarbs + 0.001) * 100" },

							// ── Advanced indices (ordinal 20-22) ──
							// Geometric mean of macros  (cube root)
							{ Ordinal: 20, Expression: "MacroGeometricMean = ((TotalFat * TotalProtein * TotalCarbs) + 1) ^ (1 / 3)" },
							// Fat/Protein balance  √(Fat / Protein) × 100
							{ Ordinal: 21, Expression: "FatProteinBalance = sqrt(TotalFat / (TotalProtein + 0.001)) * 100" },
							// Nutrient Diversity Index  (4th root of product)
							{ Ordinal: 22, Expression: "NutrientDiversityIndex = ((TotalFat * TotalProtein * TotalCarbs * TotalSugar) + 1) ^ 0.25" },
							// Caloric contribution from fat vs protein
							{ Ordinal: 23, Expression: "FatCalorieContribution = TotalFat * 9" },
							{ Ordinal: 24, Expression: "ProteinCalorieContribution = TotalProtein * 4" },
							{ Ordinal: 25, Expression: "CarbCalorieContribution = TotalCarbs * 4" },
							{ Ordinal: 26, Expression: "TotalMacroCalories = FatCalorieContribution + ProteinCalorieContribution + CarbCalorieContribution" },
							{ Ordinal: 27, Expression: "FatCaloriePercent = FatCalorieContribution / (TotalMacroCalories + 0.001) * 100" },
						],

						Groups:
						[
							{ Hash: "MacroStats", Name: "Macronutrient Statistics" },
							{ Hash: "MacroCaloric", Name: "Caloric Contribution by Macro" },
							{ Hash: "MacroCharts", Name: "Macronutrient Visualizations" },
						]
					}
				],

				Descriptors:
				{
					// ── Aggregate totals ──
					"Macro.TotalFat":
					{
						Name: "Total Fat (g)",
						Hash: "TotalFat",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 2
						}
					},
					"Macro.TotalProtein":
					{
						Name: "Total Protein (g)",
						Hash: "TotalProtein",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 2
						}
					},
					"Macro.TotalCarbs":
					{
						Name: "Total Carbohydrates (g)",
						Hash: "TotalCarbs",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 2
						}
					},
					"Macro.TotalSugar":
					{
						Name: "Total Sugar (g)",
						Hash: "TotalSugar",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 2
						}
					},

					// ── Percentages ──
					"Macro.MacroTotal":
					{
						Name: "Total Macros (g)",
						Hash: "MacroTotal",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 2, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 2
						}
					},
					"Macro.FatPercent":
					{
						Name: "Fat %",
						Hash: "FatPercent",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 2, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 1,
							DigitsPostfix: "%"
						}
					},
					"Macro.ProteinPercent":
					{
						Name: "Protein %",
						Hash: "ProteinPercent",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 2, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 1,
							DigitsPostfix: "%"
						}
					},
					"Macro.CarbPercent":
					{
						Name: "Carb %",
						Hash: "CarbPercent",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 2, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 1,
							DigitsPostfix: "%"
						}
					},

					// ── Advanced indices ──
					"Macro.SugarToCarbRatio":
					{
						Name: "Sugar / Carb Ratio",
						Hash: "SugarToCarbRatio",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 3, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 1,
							DigitsPostfix: "%"
						}
					},
					"Macro.MacroGeometricMean":
					{
						Name: "Geometric Mean of Macros (∛(F×P×C))",
						Hash: "MacroGeometricMean",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 3, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 3
						}
					},
					"Macro.FatProteinBalance":
					{
						Name: "Fat/Protein Balance (√(F/P) × 100)",
						Hash: "FatProteinBalance",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 3, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 3
						}
					},
					"Macro.NutrientDiversityIndex":
					{
						Name: "Diversity Index (⁴√(F×P×C×S))",
						Hash: "NutrientDiversityIndex",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroStats",
							Row: 3, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 4
						}
					},

					// ── Caloric contribution ──
					"Macro.FatCalorieContribution":
					{
						Name: "Fat Calories (g × 9)",
						Hash: "FatCalorieContribution",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroCaloric",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 1,
							DigitsPostfix: " kcal"
						}
					},
					"Macro.ProteinCalorieContribution":
					{
						Name: "Protein Calories (g × 4)",
						Hash: "ProteinCalorieContribution",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroCaloric",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 1,
							DigitsPostfix: " kcal"
						}
					},
					"Macro.CarbCalorieContribution":
					{
						Name: "Carb Calories (g × 4)",
						Hash: "CarbCalorieContribution",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroCaloric",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 1,
							DigitsPostfix: " kcal"
						}
					},
					"Macro.FatCaloriePercent":
					{
						Name: "Fat Calorie %",
						Hash: "FatCaloriePercent",
						DataType: "PreciseNumber",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroCaloric",
							Row: 1, Width: 3,
							InputType: "PreciseNumberReadOnly",
							DecimalPrecision: 1,
							DigitsPostfix: "%"
						}
					},

					// ── Charts ──
					"Macro.MacroStackedBar":
					{
						Name: "Macronutrient Breakdown by Fruit",
						Hash: "MacroStackedBar",
						DataType: "Object",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroCharts",
							Row: 1, Width: 8,
							InputType: "Chart",
							ChartType: "bar",
							ChartLabelsSolver: `objectkeystoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.fat"))`,
							ChartDatasetsSolvers:
							[
								{
									Label: 'Fat (g)',
									DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.fat"))`
								},
								{
									Label: 'Carbohydrates (g)',
									DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.carbohydrates"))`
								},
								{
									Label: 'Protein (g)',
									DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.protein"))`
								},
								{
									Label: 'Sugar (g)',
									DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "name", "nutritions.sugar"))`
								},
							]
						}
					},
					"Macro.MacroFamilyPolar":
					{
						Name: "Protein by Botanical Family",
						Hash: "MacroFamilyPolar",
						DataType: "Object",
						PictForm:
						{
							Section: "MacroBreakdown", Group: "MacroCharts",
							Row: 1, Width: 4,
							InputType: "Chart",
							ChartType: "polarArea",
							ChartLabelsSolver: `objectkeystoarray(aggregationhistogrambyobject(FruitGrid, "family", "nutritions.protein"))`,
							ChartDatasetsSolvers:
							[
								{
									Label: 'Total Protein by Family (g)',
									DataSolver: `objectvaluestoarray(aggregationhistogrambyobject(FruitGrid, "family", "nutritions.protein"))`
								}
							]
						}
					},
				}
			},
		},
	},
};
