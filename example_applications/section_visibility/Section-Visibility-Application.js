/*
	Regression harness for solver-driven SECTION and GROUP visibility.

	The hide class that setsectionvisibility / setgroupvisibility applies lives on
	#SECTION-<formID> / #GROUP-<formID>-<hash> -- and BOTH of those elements are emitted by the
	section template. So any render() repaints them carrying only their manifest CSSClass and the
	hide is dropped. Renaming a product below is exactly that: it changes a generated column LABEL,
	which re-renders every table whose DynamicColumns are sourced from the Products table.

	Repro (see html/index.html for the same steps in the page):
	  1. Load. "Average Gradation" is hidden -- Show Gradation is unchecked.
	  2. Rename any product in the Products table and tab out.
	  3. BEFORE the fix: "Average Gradation" reappears, still unchecked.
	     AFTER  the fix: it stays hidden, and its column headers still relabel.

	The "Gradation Notes" group inside that section is the group-level equivalent: tick Show
	Gradation so the section is visible, leave Show Notes unchecked, then rename a product.

	"Flag the #200 Row" covers the same defect one layer down: highlighttabularrow puts a class on
	a <tr> that the very same render regenerates. MI-BatchSheetCombined uses that solver with
	"is-hidden" to hide rows inside its CSB tables, so there the symptom is a hidden row coming back.
*/
const libPictSectionForm = require('../../source/Pict-Section-Form.js');

module.exports = libPictSectionForm.PictFormApplication;

module.exports.default_configuration = libPictSectionForm.PictFormApplication.default_configuration;
module.exports.default_configuration.pict_configuration = (
	{
		"Product": "SectionVisibility",

		"DefaultAppData": require('./ProductData.json'),

		"DefaultFormManifest":
		{
			"Scope": "SectionVisibilityForm",

			"Sections":
			[
				{
					"Hash": "Workflow",
					"Name": "Worksheet Selection",

					"Solvers":
					[
						"SetSectionVisibility(\"Gradation\", IF(ShowGradation, \"==\", 1, 1, 0))",
						"SetGroupVisibility(\"Gradation\", \"GradationNotes\", IF(ShowNotes, \"==\", 1, 1, 0))",
						"highlighttabularrow(\"Gradation\", \"Gradation\", 3, IF(FlagFinesRow, \"==\", 1, 1, 0))"
					],

					"Groups": [ { "Hash": "Workflow", "Name": "Show / Hide Worksheets" } ]
				},
				{
					"Hash": "Products",
					"Name": "Aggregate Products",

					"Groups":
					[
						{
							"Hash": "Products",
							"Name": "Products",

							"Layout": "Tabular",

							"RecordSetAddress": "Products",
							"RecordManifest": "ProductEditor"
						}
					]
				},
				{
					"Hash": "Gradation",
					"Name": "Average Gradation",

					"Groups":
					[
						{
							"Hash": "Gradation",
							"Name": "Percent Passing",

							"Layout": "Tabular",

							"RecordSetAddress": "Gradation",
							"RecordManifest": "GradationRowEditor",

							// One generated column per Products row, labeled from that row's name.
							// Renaming a product is a label-only change: the column SET is identical,
							// so this takes the Tabular layout's namesChanged render() path.
							"DynamicColumns":
							[
								{
									"SourceAddress": "Products",
									"HashTemplate": "PassingCol_{~D:Record.IDProduct~}",
									"NameTemplate": "{~D:Record.ProductName~}",
									"InformaryDataAddressTemplate": "Passing.{~D:Record.IDProduct~}",
									"DataType": "Number",
									"PictForm": { "InputType": "Number" }
								}
							]
						},
						{
							"Hash": "GradationNotes",
							"Name": "Gradation Notes"
						}
					]
				}
			],

			"Descriptors":
			{
				"Workflow.ShowGradation":
				{
					"Name": "Show Gradation",
					"Hash": "ShowGradation",
					"DataType": "Boolean",
					"Default": 0,
					"PictForm": { "InputType": "Boolean", "Section": "Workflow", "Group": "Workflow", "Row": 1 }
				},
				"Workflow.FlagFinesRow":
				{
					"Name": "Flag the #200 Row",
					"Hash": "FlagFinesRow",
					"DataType": "Boolean",
					"Default": 0,
					"PictForm": { "InputType": "Boolean", "Section": "Workflow", "Group": "Workflow", "Row": 2 }
				},
				"Workflow.ShowNotes":
				{
					"Name": "Show Product Notes",
					"Hash": "ShowNotes",
					"DataType": "Boolean",
					"Default": 0,
					"PictForm": { "InputType": "Boolean", "Section": "Workflow", "Group": "Workflow", "Row": 1 }
				},

				"Products":
				{
					"Name": "Aggregate Products",
					"Hash": "ProductGrid",
					"DataType": "Array",
					"Default": [],
					"PictForm": { "Section": "Products", "Group": "Products" }
				},
				"Gradation":
				{
					"Name": "Average Gradation",
					"Hash": "GradationGrid",
					"DataType": "Array",
					"Default": [],
					"PictForm": { "Section": "Gradation", "Group": "Gradation" }
				},
				"Workflow.GradationNote":
				{
					"Name": "Note",
					"Hash": "GradationNote",
					"DataType": "String",
					"PictForm": { "Section": "Gradation", "Group": "GradationNotes", "Row": 1 }
				}
			},

			"ReferenceManifests":
			{
				"ProductEditor":
				{
					"Scope": "ProductEditor",
					"Descriptors":
					{
						"IDProduct":
						{
							"Name": "ID",
							"Hash": "IDProduct",
							"DataType": "Number",
							"PictForm": { "Section": "Products", "Group": "Products" }
						},
						"ProductName":
						{
							"Name": "Product Name",
							"Hash": "ProductName",
							"DataType": "String",
							"Default": "(unnamed product)",
							"PictForm": { "Section": "Products", "Group": "Products" }
						}
					}
				},

				"GradationRowEditor":
				{
					"Scope": "GradationRowEditor",
					"Descriptors":
					{
						"SieveSize":
						{
							"Name": "Sieve",
							"Hash": "SieveSize",
							"DataType": "String",
							"PictForm": { "Section": "Gradation", "Group": "Gradation" }
						}
					}
				}
			}
		}
	});
