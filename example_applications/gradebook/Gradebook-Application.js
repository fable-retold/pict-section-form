/*
	Gradebook example application — exercises the pict-section-form tabular
	features purely via manifest configuration:

	  1. Stacked / clustered headers via Group.Headers
	  2. Row-label columns (template / row-number / pre-slotted) via Group.RowLabels
	  3. Dynamic columns derived from another array via Group.DynamicColumns
	  4. The column chooser via Group.ColumnChooser — a "Columns" menu of
	     checkboxes above the table; the hidden set lives in the form data
	     (<GroupHash>_HiddenColumns) so it survives a save/reload.
	  5. ONE record set, many tabular projections. The Students roster, the Grade
	     Book, the Performance breakdown and the Commentary grid ALL bind the same
	     "Students" array (each tab is just a different column projection of it via
	     its own RecordManifest). Because pict-section-form re-renders every tabular
	     group that shares a RecordSetAddress when a row is added / removed / moved,
	     adding a student on the roster tab makes that student appear on every other
	     tab automatically — no glue code, no sync solver. This is the "tabular rows
	     automatically map to a shared array" behavior. Per-assignment grades live at
	     Students[i].Grades.<IDAssignment> and notes at Students[i].Notes.<IDAssignment>,
	     so the dynamic Assignment columns hang off the same row object.

	The host code itself does nothing interesting — it just wires a TabSectionSelector
	for navigation, then defines five tabular sections. All the behavior comes from
	the manifest JSON below.
*/

const libPictSectionForm = require('../../source/Pict-Section-Form.js');

module.exports = libPictSectionForm.PictFormApplication;

module.exports.default_configuration = libPictSectionForm.PictFormApplication.default_configuration;
module.exports.default_configuration.pict_configuration = (
	{
		"Product": "Gradebook",

		"DefaultAppData": require('./GradebookData.json'),

		"DefaultFormManifest":
		{
			"Scope": "GradebookForm",

			"Sections":
			[
				/*
				 * Top-of-page tab navigation. The selector lives in its own section
				 * so it doesn't get swapped out when the user switches tabs.
				 */
				{
					"Hash": "Navigation",
					"Name": "Gradebook"
				},

				/*
				 * Tab 1 — Students roster. Tabular group with one clustered row-label
				 * column ("Section") and one extra header row labeling the table.
				 */
				{
					"Hash": "Students",
					"Name": "Students",
					"Groups":
					[
						{
							"Hash": "StudentList",
							"Name": "Student Roster",
							"Layout": "Tabular",
							"RecordSetAddress": "Students",
							"RecordManifest": "StudentEditor",
							"ColumnSorting": true,
							"Headers":
							[
								[
									{ "Label": "Class Roster", "ColumnSpan": 3 }
								]
							],
							"RowLabels":
							[
								{ "Name": "Section", "Template": "{~D:Record.Value.Section~}", "Cluster": true }
							]
						}
					]
				},

				/*
				 * Tab 2 — Assignment catalog. Tabular group clustered by Topic.
				 * Carries a column chooser; the Weight column is hidden by default
				 * (TabularDefaultHidden on its descriptor) until shown via the menu.
				 */
				{
					"Hash": "Assignments",
					"Name": "Assignments",
					"Groups":
					[
						{
							"Hash": "AssignmentList",
							"Name": "Assignment Catalog",
							"Layout": "Tabular",
							"RecordSetAddress": "Assignments",
							"RecordManifest": "AssignmentEditor",
							"ColumnSorting": true,
							"ColumnChooser": true,
							"Headers":
							[
								[
									{ "Label": "Assignment Catalog", "ColumnSpan": 5 }
								]
							],
							"RowLabels":
							[
								{ "Name": "Topic", "Template": "{~D:Record.Value.Topic~}", "Cluster": true }
							]
						}
					]
				},

				/*
				 * Tab 3 — Grade book grid. Exercises ALL the tabular features at once.
				 *   - Multiple row labels (Section + Student) with clustering on Section.
				 *   - Extra header row (the "Assignments" banner) above the auto super-header.
				 *   - Dynamic columns: one column per row of `Assignments`, with each
				 *     descriptor's Name = the assignment title and the data stored at
				 *     `Students[rowIndex].Grades.<IDAssignment>` (preserved on hide).
				 *   - HeaderGroupTemplate auto-extends Headers with a topic super-header
				 *     row clustering consecutive same-topic columns.
				 *   - RowSelection / ColumnSelection: check a row and/or a column to
				 *     highlight every cell across and down. The checked state is stored
				 *     in the form data (GradebookGrid_RowSelection / ...ColumnSelection)
				 *     so it persists with a save.
				 *   - ColumnChooser: the "Columns" menu above the table shows/hides
				 *     the per-assignment columns. The hidden set is stored in the form
				 *     data (GradebookGrid_HiddenColumns) so it also persists with a
				 *     save — and a hidden assignment's grades are never deleted, just
				 *     not rendered. The "Assignments" banner span and the topic
				 *     super-headers shrink to match the visible columns.
				 */
				{
					"Hash": "Gradebook",
					"Name": "Grade Book",
					"Groups":
					[
						{
							"Hash": "GradebookGrid",
							"Name": "Grade Book",
							"Layout": "Tabular",
							"RecordSetAddress": "Students",
							"RecordManifest": "GradeRowEditor",
							"RowSelection": true,
							"ColumnSelection": true,
							"ColumnChooser": true,
							"Headers":
							[
								[
									{ "Label": "Assignments", "ColumnSpan": 7, "CSSClass": "gradebook-banner" }
								]
							],
							"RowLabels":
							[
								{ "Name": "Section", "Template": "{~D:Record.Value.Section~}", "Cluster": true },
								{ "Name": "Student", "Template": "{~D:Record.Value.StudentName~}" }
							],
							"DynamicColumns":
							[
								{
									"SourceAddress": "Assignments",
									"HashTemplate": "Grade_{~D:Record.IDAssignment~}",
									"NameTemplate": "{~D:Record.Title~}",
									"InformaryDataAddressTemplate": "Grades.{~D:Record.IDAssignment~}",
									"HeaderGroupTemplate": "{~D:Record.Topic~}",
									"DataType": "Number",
									"PictForm": { "InputType": "Number" }
								}
							]
						}
					]
				},

				/*
				 * Tab 4 — Performance breakdown. A projection of the same Grades array
				 * with editing controls hidden. Demonstrates the tabular color solvers:
				 * a RecordSetSolver computes each student's `Average`, then the section
				 * solvers call `colortabularrow` to tint each student row green / amber /
				 * red by performance band -- "different colors based on performance".
				 */
				{
					"Hash": "Performance",
					"Name": "Performance",
					"Groups":
					[
						{
							"Hash": "PerformanceGrid",
							"Name": "Student Performance Breakdown",
							"Layout": "Tabular",
							"RecordSetAddress": "Students",
							"RecordManifest": "GradeRowEditor",
							"EditingControlsPosition": "hidden",
							// Recomputes each row's average across its grade values whenever
							// the grades change, so the performance coloring stays live.
							"RecordSetSolvers":
							[
								"Average = avg(objectvaluestoarray(Grades))"
							],
							"Headers":
							[
								[
									{ "Label": "Student Performance", "ColumnSpan": 7 }
								]
							],
							"RowLabels":
							[
								{ "Name": "Section", "Template": "{~D:Record.Value.Section~}", "Cluster": true },
								{ "Name": "Student", "Template": "{~D:Record.Value.StudentName~}" },
								{ "Name": "#",        "RowNumber": true }
							],
							"DynamicColumns":
							[
								{
									"SourceAddress": "Assignments",
									"HashTemplate": "Perf_{~D:Record.IDAssignment~}",
									"NameTemplate": "{~D:Record.Title~}",
									"InformaryDataAddressTemplate": "Grades.{~D:Record.IDAssignment~}",
									"HeaderGroupTemplate": "{~D:Record.Topic~}",
									"DataType": "Number",
									"PictForm": { "InputType": "Number" }
								}
							]
						}
					],
					/*
					 * One colortabularrow() call per student row. Each reads the row's
					 * `Average` and maps it to a band color: >=85 green, >=75 amber,
					 * else red. These presentational solvers are keyed by row index and
					 * cover the eight seeded students. Adding a student still makes the
					 * new row appear on every tab (the shared "Students" record set does
					 * that automatically) — it just won't be color-banded until a matching
					 * row-index solver exists. A real app would generate one per row; the
					 * example keeps them explicit so the mechanism stays visible. Out-of-
					 * range solvers are a safe no-op, so extra rows simply render unbanded.
					 */
					"Solvers":
					[
						{ "Ordinal": 5, "Expression": "colortabularrow(\"Performance\", \"PerformanceGrid\", 0, IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 0, \"Average\"), \">=\", 85, \"#BFE3BF\", IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 0, \"Average\"), \">=\", 75, \"#F5DFA8\", \"#EBB8B8\")), 1)" },
						{ "Ordinal": 5, "Expression": "colortabularrow(\"Performance\", \"PerformanceGrid\", 1, IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 1, \"Average\"), \">=\", 85, \"#BFE3BF\", IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 1, \"Average\"), \">=\", 75, \"#F5DFA8\", \"#EBB8B8\")), 1)" },
						{ "Ordinal": 5, "Expression": "colortabularrow(\"Performance\", \"PerformanceGrid\", 2, IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 2, \"Average\"), \">=\", 85, \"#BFE3BF\", IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 2, \"Average\"), \">=\", 75, \"#F5DFA8\", \"#EBB8B8\")), 1)" },
						{ "Ordinal": 5, "Expression": "colortabularrow(\"Performance\", \"PerformanceGrid\", 3, IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 3, \"Average\"), \">=\", 85, \"#BFE3BF\", IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 3, \"Average\"), \">=\", 75, \"#F5DFA8\", \"#EBB8B8\")), 1)" },
						{ "Ordinal": 5, "Expression": "colortabularrow(\"Performance\", \"PerformanceGrid\", 4, IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 4, \"Average\"), \">=\", 85, \"#BFE3BF\", IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 4, \"Average\"), \">=\", 75, \"#F5DFA8\", \"#EBB8B8\")), 1)" },
						{ "Ordinal": 5, "Expression": "colortabularrow(\"Performance\", \"PerformanceGrid\", 5, IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 5, \"Average\"), \">=\", 85, \"#BFE3BF\", IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 5, \"Average\"), \">=\", 75, \"#F5DFA8\", \"#EBB8B8\")), 1)" },
						{ "Ordinal": 5, "Expression": "colortabularrow(\"Performance\", \"PerformanceGrid\", 6, IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 6, \"Average\"), \">=\", 85, \"#BFE3BF\", IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 6, \"Average\"), \">=\", 75, \"#F5DFA8\", \"#EBB8B8\")), 1)" },
						{ "Ordinal": 5, "Expression": "colortabularrow(\"Performance\", \"PerformanceGrid\", 7, IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 7, \"Average\"), \">=\", 85, \"#BFE3BF\", IF(getSectionTabularFormData(\"Performance\", \"PerformanceGrid\", 7, \"Average\"), \">=\", 75, \"#F5DFA8\", \"#EBB8B8\")), 1)" }
					]
				},

				/*
				 * Tab 5 — Teacher commentary. Another projection of the shared
				 * `Students` array; the data store is `Students[].Notes[<IDAssignment>]`.
				 * Same DynamicColumns shape as the Grade Book, different
				 * InformaryDataAddress (Notes vs Grades) so the two grids hang their
				 * per-assignment cells off the same row object without colliding.
				 */
				{
					"Hash": "Commentary",
					"Name": "Commentary",
					"Groups":
					[
						{
							"Hash": "CommentaryGrid",
							"Name": "Teacher Commentary",
							"Layout": "Tabular",
							"RecordSetAddress": "Students",
							"RecordManifest": "CommentaryRowEditor",
							"Headers":
							[
								[
									{ "Label": "Per-Assignment Teacher Notes", "ColumnSpan": 7 }
								]
							],
							"RowLabels":
							[
								{ "Name": "Section", "Template": "{~D:Record.Value.Section~}", "Cluster": true },
								{ "Name": "Student", "Template": "{~D:Record.Value.StudentName~}" }
							],
							"DynamicColumns":
							[
								{
									"SourceAddress": "Assignments",
									"HashTemplate": "Note_{~D:Record.IDAssignment~}",
									"NameTemplate": "{~D:Record.Title~}",
									"InformaryDataAddressTemplate": "Notes.{~D:Record.IDAssignment~}",
									"HeaderGroupTemplate": "{~D:Record.Topic~}",
									"DataType": "String",
									"PictForm": { "InputType": "TextArea" }
								}
							]
						}
					]
				}
			],

			"Descriptors":
			{
				"UI.GradebookTab":
				{
					"Name": "Section",
					"Hash": "GradebookTab",
					"DataType": "String",
					"PictForm":
					{
						"Section": "Navigation",
						"InputType": "TabSectionSelector",
						"TabSectionSet":   ["Students", "Assignments", "Gradebook", "Performance", "Commentary"],
						"TabSectionNames": ["Students", "Assignments", "Grade Book", "Performance", "Commentary"]
					}
				}
			},

			"ReferenceManifests":
			{
				"StudentEditor":
				{
					"Scope": "StudentEditor",
					"Descriptors":
					{
						"StudentID":
						{
							"Name": "Student ID",
							"Hash": "StudentID",
							"DataType": "String",
							"Default": "S-???",
							"PictForm": { "Section": "Students", "Group": "StudentList" }
						},
						"StudentName":
						{
							"Name": "Name",
							"Hash": "StudentName",
							"DataType": "String",
							"Default": "(unnamed student)",
							"PictForm": { "Section": "Students", "Group": "StudentList" }
						},
						"Section":
						{
							"Name": "Section",
							"Hash": "Section",
							"DataType": "String",
							"Default": "A",
							"PictForm": { "Section": "Students", "Group": "StudentList" }
						}
					}
				},

				"AssignmentEditor":
				{
					"Scope": "AssignmentEditor",
					"Descriptors":
					{
						"IDAssignment":
						{
							"Name": "ID",
							"Hash": "IDAssignment",
							"DataType": "Number",
							"Default": 0,
							"PictForm": { "Section": "Assignments", "Group": "AssignmentList" }
						},
						"Title":
						{
							"Name": "Title",
							"Hash": "Title",
							"DataType": "String",
							"Default": "(new assignment)",
							"PictForm": { "Section": "Assignments", "Group": "AssignmentList" }
						},
						"Topic":
						{
							"Name": "Topic",
							"Hash": "Topic",
							"DataType": "String",
							"Default": "Math",
							"PictForm": { "Section": "Assignments", "Group": "AssignmentList" }
						},
						"Points":
						{
							"Name": "Points",
							"Hash": "Points",
							"DataType": "Number",
							"Default": 100,
							"PictForm": { "Section": "Assignments", "Group": "AssignmentList" }
						},
						"Weight":
						{
							"Name": "Weight",
							"Hash": "Weight",
							"DataType": "Number",
							"Default": 1.0,
							// Hidden until shown via the column chooser menu (the
							// chooser's "(1 hidden)" hint points the user at it).
							"PictForm": { "Section": "Assignments", "Group": "AssignmentList", "TabularDefaultHidden": true }
						}
					}
				},

				/*
				 * GradeRowEditor has only the IDENTITY descriptors -- the per-assignment
				 * grade columns are injected at runtime by the Gradebook section's
				 * DynamicColumns generator. Identity fields are read-only context
				 * so the user can see WHICH row they are looking at.
				 */
				"GradeRowEditor":
				{
					"Scope": "GradeRowEditor",
					"Descriptors":
					{
						"Section":
						{
							"Name": "Section",
							"Hash": "Section",
							"DataType": "String",
							"PictForm":
							{
								"Section": "Gradebook",
								"Group": "GradebookGrid",
								"TabularHidden": true
							}
						},
						"StudentName":
						{
							"Name": "Student",
							"Hash": "StudentName",
							"DataType": "String",
							"PictForm":
							{
								"Section": "Gradebook",
								"Group": "GradebookGrid",
								"TabularHidden": true
							}
						}
					}
				},

				/*
				 * Same identity shape for the Commentary table.
				 */
				"CommentaryRowEditor":
				{
					"Scope": "CommentaryRowEditor",
					"Descriptors":
					{
						"Section":
						{
							"Name": "Section",
							"Hash": "Section",
							"DataType": "String",
							"PictForm":
							{
								"Section": "Commentary",
								"Group": "CommentaryGrid",
								"TabularHidden": true
							}
						},
						"StudentName":
						{
							"Name": "Student",
							"Hash": "StudentName",
							"DataType": "String",
							"PictForm":
							{
								"Section": "Commentary",
								"Group": "CommentaryGrid",
								"TabularHidden": true
							}
						}
					}
				}
			}
		}
	});
