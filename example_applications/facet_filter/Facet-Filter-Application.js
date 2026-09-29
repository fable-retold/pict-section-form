const libPictSectionForm = require('../../source/Pict-Section-Form.js');

/*
	Facet Filter example: order lines that pick Genre -> Author -> Book from one shared catalog, each dropdown
	narrowed by the others in the same row (a `Facet` ListFilterRule), kept consistent on change and carrying
	the chosen book's price and format into the row (the `Pict-Input-FacetFilter` provider).

	The catalog is loaded once by the form-level InitialBundle from the example's REST server
	(Facet-Filter-Server.js): active publishers, then their books, then a ProjectDataset step that flattens
	each book's nested Details into one graph row per book.  Nothing is fetched when a dropdown changes.
*/

const GRAPH_ADDRESS = 'AppData.Catalog.Graph';

/**
 * The Facet rule every dropdown in a table shares; only JoinListValueAddress differs per column.
 *
 * @param {string} pJoinListValueAddress - the graph field this column holds
 * @param {string} pNarrowBy - 'Preceding' or 'All'
 * @param {Record<string, string>} [pCarryFields]
 * @return {Record<string, any>}
 */
function facetColumn(pJoinListValueAddress, pNarrowBy, pCarryFields)
{
	const tmpRule =
	{
		Filter: 'Catalog graph',
		FilterType: 'Facet',
		JoinListAddress: GRAPH_ADDRESS,
		JoinListAddressGlobal: true,
		JoinListValueAddress: pJoinListValueAddress,
		NarrowBy: pNarrowBy,
		Facets:
		[
			{ JoinListValueAddress: 'Language', ValueAddress: 'OrderLanguage' },
			{ JoinListValueAddress: 'InPrintFrom', Operator: 'LE', ValueAddress: 'OrderInPrintOn' },
			{ JoinListValueAddress: 'InPrintUntil', Operator: 'GE', ValueAddress: 'OrderInPrintOn' }
		]
	};
	if (pCarryFields)
	{
		tmpRule.CarryFields = pCarryFields;
	}
	return { ListFilterRules: [ tmpRule ], Providers: [ 'Pict-Input-FacetFilter' ] };
}

/**
 * One order-line row manifest; the two tables differ only in how their lists narrow.
 *
 * @param {string} pScope
 * @param {string} pGroup
 * @param {string} pNarrowBy
 * @return {Record<string, any>}
 */
function orderLineManifest(pScope, pGroup, pNarrowBy)
{
	const fColumn = (pKey, pName, pDataType, pPictForm) => (
		{
			Name: pName, Hash: `${pScope}${pKey}`, DataAddress: pKey, DataType: pDataType,
			PictForm: Object.assign({ Section: 'Order', Group: pGroup }, pPictForm)
		});
	return (
		{
			Scope: pScope,
			Descriptors:
			{
				Genre: fColumn('Genre', 'Genre', 'String', Object.assign({ InputType: 'Option', SelectOptionsPickList: 'Genres' }, facetColumn('Genre', pNarrowBy))),
				Author: fColumn('Author', 'Author', 'String', Object.assign({ InputType: 'Option', SelectOptionsPickList: 'Authors' }, facetColumn('Author', pNarrowBy))),
				Book: fColumn('Book', 'Book', 'String', Object.assign({ InputType: 'Option', SelectOptionsPickList: 'Books' }, facetColumn('IDBook', pNarrowBy, { Price: 'Price', Format: 'Format' }))),
				Quantity: Object.assign(fColumn('Quantity', 'Qty', 'Number', {}), { Default: 1 }),
				Price: fColumn('Price', 'Price', 'PreciseNumber', { InputType: 'ReadOnly' }),
				Format: fColumn('Format', 'Format', 'String', { InputType: 'ReadOnly' }),
				LineTotal: fColumn('LineTotal', 'Line Total', 'PreciseNumber', { InputType: 'ReadOnly' })
			}
		});
}

const _LineSolvers =
[
	'LineTotal = IF(Book, "==", "", 0, Price * Quantity)'
];

module.exports = libPictSectionForm.PictFormApplication;

module.exports.default_configuration.pict_configuration = (
	{
		Product: 'FacetFilterExample',
		DefaultAppData:
		{
			Order:
			{
				Language: '',
				InPrintOn: '',
				// A line saved earlier: its book has since gone out of print, and its price was carried when it
				// was picked (the catalog lists it higher now). Opening the form rewrites neither.
				Lines: [ { Genre: 'Science', Author: 'L. Brandt', Book: '109', Quantity: 2, Price: 18, Format: 'Hardcover' }, { Quantity: 1 }, { Quantity: 1 } ],
				CompareLines: [ { Quantity: 1 }, { Quantity: 1 }, { Quantity: 1 } ]
			}
		},
		DefaultFormManifest:
		{
			Scope: 'FacetFilterExample',

			InitialBundle:
			[
				{ Entity: 'Publisher', Filter: 'FBV~Active~EQ~1', Destination: 'AppData.Catalog.Publishers' },
				// The leading 0 keeps the IN list valid when no publisher is active.
				{ Entity: 'Book', Filter: 'FBL~IDPublisher~INN~0,{~PJU:,^IDPublisher^AppData.Catalog.Publishers~}', Destination: 'AppData.Catalog.Books' },
				{
					Type: 'ProjectDataset',
					InputRecordsetAddress: 'AppData.Catalog.Books',
					OutputRecordsetAddress: GRAPH_ADDRESS,
					RecordPrototypeAddress: 'OutputRecordset[]<<~?IDBook,==,{~D:InputRecord.IDBook~}?~>>',
					RecordFieldMapping:
					{
						Default:
						{
							'InputRecord.IDBook': 'OutputRecord.IDBook',
							'InputRecord.Title': 'OutputRecord.Title',
							'InputRecord.IDPublisher': 'OutputRecord.IDPublisher',
							'InputRecord.InPrintFrom': 'OutputRecord.InPrintFrom',
							'InputRecord.InPrintUntil': 'OutputRecord.InPrintUntil',
							'InputRecord.Details.Genre': 'OutputRecord.Genre',
							'InputRecord.Details.Author': 'OutputRecord.Author',
							'InputRecord.Details.Language': 'OutputRecord.Language',
							'InputRecord.Details.Current.Price': 'OutputRecord.Price',
							'InputRecord.Details.Current.Format': 'OutputRecord.Format'
						}
					}
				}
			],

			PickLists:
			[
				{ Hash: 'Genres', ListAddress: 'Genres', ListSourceAddress: GRAPH_ADDRESS, ListSourceAddressGlobal: true, IDTemplate: '{~D:Record.Genre~}', TextTemplate: '{~D:Record.Genre~}', Unique: true, Sorted: true, SkipEmpty: true },
				{ Hash: 'Authors', ListAddress: 'Authors', ListSourceAddress: GRAPH_ADDRESS, ListSourceAddressGlobal: true, IDTemplate: '{~D:Record.Author~}', TextTemplate: '{~D:Record.Author~}', Unique: true, Sorted: true, SkipEmpty: true },
				{ Hash: 'Books', ListAddress: 'Books', ListSourceAddress: GRAPH_ADDRESS, ListSourceAddressGlobal: true, IDTemplate: '{~D:Record.IDBook~}', TextTemplate: '{~D:Record.Title~} ({~D:Record.Language~})', Sorted: true }
			],

			Descriptors:
			{
				'Order.Language':
				{
					Name: 'Language', Hash: 'OrderLanguage', DataType: 'String',
					PictForm:
					{
						Section: 'Order', Group: 'Header', Row: 1, Width: 3, InputType: 'Option',
						SelectOptions: [ { id: '', text: 'Any language' }, { id: 'EN', text: 'English' }, { id: 'FR', text: 'French' }, { id: 'DE', text: 'German' } ]
					}
				},
				'Order.InPrintOn':
				{
					Name: 'In print on (YYYY-MM-DD)', Hash: 'OrderInPrintOn', DataType: 'String',
					PictForm: { Section: 'Order', Group: 'Header', Row: 1, Width: 3 }
				},
				'Order.Total':
				{
					Name: 'Order total (left-narrowing table)', Hash: 'OrderTotal', DataType: 'PreciseNumber',
					PictForm: { Section: 'Order', Group: 'Header', Row: 1, Width: 3, InputType: 'ReadOnly' }
				},
				'Order.CompareTotal':
				{
					Name: 'Order total (symmetric table)', Hash: 'OrderCompareTotal', DataType: 'PreciseNumber',
					PictForm: { Section: 'Order', Group: 'Header', Row: 1, Width: 3, InputType: 'ReadOnly' }
				}
			},

			Sections:
			[
				{
					Name: 'Book Club Order',
					Hash: 'Order',
					Solvers:
					[
						'OrderInPrintOn = WHEN(OrderInPrintOn, OrderInPrintOn, DATEFORMAT(NULL, "YYYY-MM-DD"))',
						'OrderTotal = SUM(Order.Lines[].LineTotal)',
						'OrderCompareTotal = SUM(Order.CompareLines[].LineTotal)'
					],
					Groups:
					[
						{ Name: 'Order', Hash: 'Header', Rows: [] },
						{
							Name: 'Order lines -- each list narrowed by the columns to its left (NarrowBy: Preceding)',
							Hash: 'Lines',
							Layout: 'Tabular',
							RecordSetAddress: 'Order.Lines',
							RecordManifest: 'OrderLine',
							MinimumRowCount: 3,
							RecordSetSolvers: _LineSolvers
						},
						{
							Name: 'The same, narrowed symmetrically -- each list by every other choice (NarrowBy: All)',
							Hash: 'CompareLines',
							Layout: 'Tabular',
							RecordSetAddress: 'Order.CompareLines',
							RecordManifest: 'CompareLine',
							MinimumRowCount: 3,
							RecordSetSolvers: _LineSolvers
						}
					]
				}
			],

			ReferenceManifests:
			{
				OrderLine: orderLineManifest('OrderLine', 'Lines', 'Preceding'),
				CompareLine: orderLineManifest('CompareLine', 'CompareLines', 'All')
			}
		}
	});
