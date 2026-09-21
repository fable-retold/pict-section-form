/*
	The injection conformance fixture: what the fixture manifest covers, and what each copy of it should hold
	once it has been injected, filled in and solved.

	Both tiers read this file:
	  - the data tier (test/PictSectionForm-Injection-Conformance_tests.js, part of `npm test`)
	  - the browser tier (test/browser, `npm run test:injection`)

	Adding an input type to the library means adding a case here; the coverage suite fails until you do, and
	its failure message says so. See docs/Injection_Conformance.md.
*/

const MARSHAL_DESTINATION = 'AppData.Orchard';

// Two salts that share a prefix, so a translation that matches on "starts with" rather than on a boundary
// shows up as one copy reading the other.
const SALTS = [ 'alpha', 'alphabeta' ];

// What the host form holds at the unsalted root under the injected manifest's own names. A copy that reads an
// unsalted name picks these up; a copy that writes one changes them.
const ROOT_DECOYS =
{
	HostRate: 3,
	Width: 1000,
	Height: 1000,
	HeightMax: 1000,
	Qty: 1000,
	Count: 1000,
	Label: 'host label',
	Dims: { Depth: 1000 },
	ShowExtras: 1,
	Readings: [ 1000, 1000, 1000, 1000 ],
	Crate: { Items: [ 0, 0, 0, 0, 0 ] },
	Rows: [ { Qty: 100, Price: 100, Line: 100 }, { Qty: 100, Price: 100, Line: 100 }, { Qty: 100, Price: 100, Line: 100 } ],
	QtyList: [ 1000 ],
	Source: 1000,
};

const COPIES =
{
	alpha:
	{
		Seeded:
		{
			HeightMax: 10, Qty: 7, Dims: { Depth: 2 }, ShowExtras: 0, Readings: [ 9, 8, 7 ], Crate: { Items: [ 1, 2, 3 ] },
			Rows: [ { Qty: 2, Price: 3 }, { Qty: 4, Price: 5 } ], Count: 3,
		},
		Entered: { Width: 4, Height: 5 },
		Expected:
		{
			Area: 20, AreaScaled: 60, RowCount: 2, FirstLine: 6, LineTotal: 26, SecondLine: 20, SecondQty: 4, WidthCopy: 4,
			ReadingCount: 3, FirstReading: 9, ItemCount: 3, Volume: 40, QtyList: [ 2, 4 ], Doubled: [ 4, 8 ], Scaled: [ 8, 16 ],
			Steps: [ 4, 8 ], RowCarry: [ 0, 4 ], WideLabel: 'Width', HeightMaxPlus: 15,
		},
		Lines: [ 6, 20 ],
		Chart: { Labels: [ 2, 4 ], Line: [ 6, 20 ], Scaled: [ 8, 16 ] },
		Summary: '4x5',
		ExtrasHidden: true,
		FromScratch: 10,
	},
	alphabeta:
	{
		Seeded:
		{
			HeightMax: 20, Qty: 11, Dims: { Depth: 3 }, ShowExtras: 1, Readings: [ 5 ], Crate: { Items: [ 1 ] },
			Rows: [ { Qty: 1, Price: 1 }, { Qty: 3, Price: 2 } ], Count: 8, Source: 2,
		},
		Entered: { Width: 3, Height: 1 },
		Expected:
		{
			Area: 3, AreaScaled: 9, RowCount: 2, FirstLine: 1, LineTotal: 7, SecondLine: 6, SecondQty: 3, WidthCopy: 3,
			ReadingCount: 1, FirstReading: 5, ItemCount: 1, Volume: 9, QtyList: [ 1, 3 ], Doubled: [ 2, 6 ], Scaled: [ 3, 9 ],
			Steps: [ 3, 6 ], RowCarry: [ 0, 2 ], WideLabel: 'Narrow', HeightMaxPlus: 21,
		},
		Lines: [ 1, 6 ],
		Chart: { Labels: [ 1, 3 ], Line: [ 1, 6 ], Scaled: [ 3, 9 ] },
		Summary: '3x1',
		ExtrasHidden: false,
		FromScratch: 8,
	},
};

/**
 * @typedef {Object} InjectionInputCase
 * @property {string} Registry - 'InputType:<name>' for a type the metatemplates dispatch on, 'Provider:<name>' for an input provider an input opts into.
 * @property {string} Hash - The fixture descriptor's unsalted hash.
 * @property {'data'|'browser'|'expression'} Tier - Where this case's round trip is asserted: 'data' in the always-on tier, 'browser' in the browser tier, 'expression' only as salted configuration.
 * @property {boolean} Marshals - Whether marshalled data reaches the rendered control.
 * @property {boolean} Accepts - Whether typing into the rendered control reaches the data.
 * @property {any} [Value] - The value the round trip writes.
 * @property {string} [Note] - Why a case is not asserted on the data tier.
 */

/** @type {Array<InjectionInputCase>} */
const INPUT_CASES =
[
	{ Registry: 'InputType:String', Hash: 'Label', Tier: 'data', Marshals: true, Accepts: true, Value: 'crate label' },
	{ Registry: 'InputType:Number', Hash: 'Count', Tier: 'data', Marshals: true, Accepts: true, Value: 12 },
	{ Registry: 'InputType:PreciseNumber', Hash: 'Precise', Tier: 'data', Marshals: true, Accepts: true, Value: '3.25' },
	{ Registry: 'InputType:PreciseNumberReadOnly', Hash: 'PreciseDisplay', Tier: 'data', Marshals: true, Accepts: false, Value: '8.50' },
	{ Registry: 'InputType:TextArea', Hash: 'NoteText', Tier: 'data', Marshals: true, Accepts: true, Value: 'a crate note' },
	{ Registry: 'InputType:Boolean', Hash: 'Ready', Tier: 'data', Marshals: true, Accepts: false, Value: true, Note: 'checkbox state is set through the control, not a typed value' },
	{ Registry: 'InputType:Color', Hash: 'Shade', Tier: 'data', Marshals: true, Accepts: true, Value: '#336699' },
	{ Registry: 'InputType:ReadOnly', Hash: 'Reference', Tier: 'data', Marshals: true, Accepts: false, Value: 'read only value' },
	{ Registry: 'InputType:DisplayOnly', Hash: 'Shown', Tier: 'data', Marshals: true, Accepts: false, Value: 'shown value' },
	{ Registry: 'InputType:Hidden', Hash: 'Concealed', Tier: 'data', Marshals: false, Accepts: false, Value: 'concealed value', Note: 'the hidden type renders no control' },
	{ Registry: 'InputType:Markdown', Hash: 'Notes', Tier: 'data', Marshals: true, Accepts: false, Value: '# heading' },
	{ Registry: 'InputType:HTML', Hash: 'Blurb', Tier: 'data', Marshals: true, Accepts: false, Value: '<b>bold</b>' },
	{ Registry: 'InputType:Link', Hash: 'Site', Tier: 'data', Marshals: true, Accepts: false, Value: 'https://example.com/crate' },
	{ Registry: 'InputType:Option', Hash: 'Grade', Tier: 'data', Marshals: true, Accepts: true, Value: 'second' },
	{ Registry: 'InputType:DateTime', Hash: 'Picked', Tier: 'data', Marshals: true, Accepts: true, Value: '2024-03-04T05:06' },
	{ Registry: 'InputType:Templated', Hash: 'Summary', Tier: 'browser', Marshals: true, Accepts: false, Note: 'renders its template against the marshalled data; asserted in the browser tier after a re-render' },
	{ Registry: 'InputType:TemplatedEntityLookup', Hash: 'Lookup', Tier: 'expression', Marshals: false, Accepts: false, Note: 'gathers its entity from a server; only its salted configuration is asserted' },
	{ Registry: 'InputType:Chart', Hash: 'LineChart', Tier: 'browser', Marshals: true, Accepts: false, Note: 'needs a canvas and the charting library' },
	{ Registry: 'InputType:RichText', Hash: 'Story', Tier: 'expression', Marshals: false, Accepts: false, Note: 'needs a real editor surface' },
	{ Registry: 'InputType:Diagram', Hash: 'Sketch', Tier: 'expression', Marshals: false, Accepts: false, Note: 'needs a real drawing surface' },
	{ Registry: 'InputType:ObjectEditor', Hash: 'Payload', Tier: 'expression', Marshals: false, Accepts: false, Note: 'needs a real editor surface' },
	{ Registry: 'InputType:TabSectionSelector', Hash: 'TabPicker', Tier: 'browser', Marshals: true, Accepts: false, Note: 'switching tabs is a DOM interaction across section views' },
	{ Registry: 'InputType:TabGroupSelector', Hash: 'GroupPicker', Tier: 'browser', Marshals: true, Accepts: false, Note: 'switching tabs is a DOM interaction across groups' },
	{ Registry: 'Provider:Pict-Input-AutofillTriggerGroup', Hash: 'Source', Tier: 'browser', Marshals: true, Accepts: true, Value: 6, Note: 'the trigger fires on a real change event' },
	{ Registry: 'Provider:Pict-Input-EntityBundleRequest', Hash: 'Bundled', Tier: 'expression', Marshals: false, Accepts: false, Note: 'gathers its bundle from a server; only its salted configuration is asserted' },
	{ Registry: 'Provider:Pict-Input-TabularTriggerGroup', Hash: 'Tally', Tier: 'expression', Marshals: false, Accepts: false, Note: 'a record set column; its trigger group configuration is asserted on the salted manifest' },
];

// Registry entries with no fixture case, and why. Anything else missing fails the coverage suite.
const EXCLUDED_REGISTRY_ENTRIES =
{
	'Provider:Pict-Input-Select': 'exercised through InputType:Option, which dispatches to it',
	'Provider:Pict-Input-PreciseNumber': 'exercised through DataType PreciseNumber and InputType:PreciseNumberReadOnly',
	'Provider:Pict-Input-DateTime': 'exercised through DataType DateTime',
	'Provider:Pict-Input-Link': 'exercised through InputType:Link',
	'Provider:Pict-Input-Markdown': 'exercised through InputType:Markdown',
	'Provider:Pict-Input-HTML': 'exercised through InputType:HTML',
	'Provider:Pict-Input-Chart': 'exercised through InputType:Chart',
	'Provider:Pict-Input-Diagram': 'exercised through InputType:Diagram',
	'Provider:Pict-Input-RichText': 'exercised through InputType:RichText',
	'Provider:Pict-Input-ObjectEditor': 'exercised through InputType:ObjectEditor',
	'Provider:Pict-Input-Templated': 'exercised through InputType:Templated',
	'Provider:Pict-Input-TemplatedEntityLookup': 'exercised through InputType:TemplatedEntityLookup',
	'Provider:Pict-Input-TabGroupSelector': 'exercised through InputType:TabGroupSelector',
	'Provider:Pict-Input-TabSectionSelector': 'exercised through InputType:TabSectionSelector',
};

// Solver directives the fixture manifest does not use, and why. The rest must appear in a fixture solver.
const EXCLUDED_SOLVER_DIRECTIVES =
{
	MONTECARLO: 'samples at random, so it cannot be compared between two injections; asserted at the expression level in Pict-View-Form-Metacontroller-DistinctManifest_tests.js',
};

// The shapes a solver can name something of its own in. Each must appear somewhere in the fixture manifest.
const REFERENCE_SHAPES =
{
	'exact symbol': /(^|[^A-Za-z0-9_$.])Width([^A-Za-z0-9_$.]|$)/,
	'state address': /\{Rows\[1\]\.Line\}/,
	'dotted length': /Rows\.length/,
	'indexed element': /Readings\[0\]/,
	'indexed property': /Rows\[0\]\.Line/,
	'set property': /Rows\[\]\.Line/,
	'nested property of an object': /Crate\.Items\.length/,
	'marshal destination prefixed string': /GETVALUE\("AppData\.Orchard\.Width"\)/,
	'marshal destination prefixed partial': /GETVALUE\("AppData\.Orchard\.Rows\[1\]\.Qty"\)/,
	'hash string parameter': /SetSectionVisibility\("Extras"/,
	'string literal that matches a hash': /"Width", "Narrow"/,
	'reference outside the manifest': /HostRate/,
	'record set solver column': /Line = Qty \* Price/,
};

// Properties that hold prose or presentation rather than a reference, so the unsalted-reference scan skips
// them. Add to this list only when a property genuinely cannot name a section, group, input or address.
const LABEL_PROPERTIES =
[
	'Name', 'Description', 'Label', 'Hint', 'Placeholder', 'CSSClass', 'CSSClasses', 'Scope', 'DataType', 'InputType',
	'TabSectionNames', 'TabGroupNames', 'Layout', 'Row', 'Width', 'InputExtra', 'ChartType', 'Entity', 'Providers',
	'TriggerGroupHash', 'EntityBundleTriggerGroup', 'RecordManifest', 'SelectOptions', 'OriginalHash', 'OriginalDataAddress',
];

// What the fixture demonstrates rather than asserts, because it is a property of injection itself rather
// than of the translation. Each is reported; the suites print them instead of failing on them.
const KNOWN_OPEN =
{
	UndeclaredSolverTargets: 'a solver can assign to a name no descriptor declares (Scratch), and the expression parser assigns an expression with no assignment of its own to Result; neither is nested into the copy, so the copies share them',
	SharedTriggerGroupHash: 'a trigger group hash is not salted, so a change in one copy also runs the matching trigger group in the other; each copy still reads and writes only its own data',
};

// Keys an injected copy leaves at the unsalted root that are not copy data.
const KNOWN_ROOT_KEYS =
{
	Result: { Severity: 'open', Reason: 'the expression parser assigns a solver with no assignment to Result, which no manifest rewrite can reach' },
	MetaTemplate: { Severity: 'benign', Reason: 'a container the metatemplate manifest defaults into the marshal destination, holding no copy data' },
};

module.exports = {
	MARSHAL_DESTINATION,
	SALTS,
	ROOT_DECOYS,
	COPIES,
	INPUT_CASES,
	EXCLUDED_REGISTRY_ENTRIES,
	EXCLUDED_SOLVER_DIRECTIVES,
	REFERENCE_SHAPES,
	LABEL_PROPERTIES,
	KNOWN_ROOT_KEYS,
	KNOWN_OPEN,
};
