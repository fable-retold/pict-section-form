/*
	Injection conformance, browser tier: the edge case scenario.

	Two salted copies of the fixture manifest in one page, next to a host form that already holds same-named
	data at the unsalted root. Each copy must compute from, show, hide, chart and render only its own data,
	including after it is re-rendered from what was saved.

	The fixture, the data each copy is given and what each copy should end up holding all come from
	test/fixtures/injection/Injection-Fixture-Cases.js, which the DOM tier reads too.
*/

const _Fixture = require('../fixtures/injection/Injection-Fixture-Manifest.json');
const _Cases = require('../fixtures/injection/Injection-Fixture-Cases.js');

/**
 * @param {any} pValue
 * @return {any}
 */
function cloneData(pValue)
{
	return (pValue === undefined) ? undefined : JSON.parse(JSON.stringify(pValue));
}

/**
 * @param {Record<string, any>} pMarshalDestinationObject
 * @return {Record<string, any>} the marshal destination without the salted copies
 */
function rootWithoutCopies(pMarshalDestinationObject)
{
	const tmpRoot = {};
	for (const [ tmpKey, tmpValue ] of Object.entries(pMarshalDestinationObject))
	{
		if (!_Cases.SALTS.includes(tmpKey))
		{
			tmpRoot[tmpKey] = cloneData(tmpValue);
		}
	}
	return tmpRoot;
}

/**
 * @param {import('./Injection-Conformance-Harness-Driver.js').HarnessContext} pContext
 * @return {Promise<void>}
 */
async function run(pContext)
{
	await pContext.boot({ HostManifest: _Fixture.HostManifest, MarshalDestination: _Cases.MARSHAL_DESTINATION, InitialAppData: { Orchard: cloneData(_Cases.ROOT_DECOYS) } });
	const tmpMarshalDestinationObject = pContext.marshalDestinationObject;
	const tmpRootBefore = rootWithoutCopies(tmpMarshalDestinationObject);
	pContext.checkEqual('host: boots with its own Width at the unsalted root', pContext.getValue('Width'), 1000);

	for (const tmpSalt of _Cases.SALTS)
	{
		const tmpCopy = _Cases.COPIES[tmpSalt];
		// Seeded before injection, the way a form is opened on data that was saved earlier.
		tmpMarshalDestinationObject[tmpSalt] = cloneData(tmpCopy.Seeded);
		const tmpInjection = await pContext.inject(_Fixture.InjectableManifest, tmpSalt);
		pContext.check(`${tmpSalt}: every section of the manifest rendered`, tmpInjection.Views.length === _Fixture.InjectableManifest.Sections.length, tmpInjection.Views.map((pView) => pView.Hash));
	}
	for (const tmpSalt of _Cases.SALTS)
	{
		for (const [ tmpHash, tmpValue ] of Object.entries(_Cases.COPIES[tmpSalt].Entered))
		{
			pContext.check(`${tmpSalt}: typed ${tmpHash} into its own input`, pContext.enterValue(`${tmpHash}_${tmpSalt}`, tmpValue), `no element for ${tmpHash}_${tmpSalt}`);
		}
	}
	await pContext.solve();
	await pContext.solve();

	for (const tmpSalt of _Cases.SALTS)
	{
		const tmpCopy = _Cases.COPIES[tmpSalt];
		for (const [ tmpKey, tmpExpected ] of Object.entries(tmpCopy.Expected))
		{
			pContext.checkEqual(`${tmpSalt}: ${tmpKey}`, pContext.getValue(`${tmpSalt}.${tmpKey}`), tmpExpected);
		}
		pContext.checkEqual(`${tmpSalt}: a record set solver uses its own row rather than the same-named input`, (pContext.getValue(`${tmpSalt}.Rows`) || []).map((pRow) => pRow.Line), tmpCopy.Lines);
		pContext.checkEqual(`${tmpSalt}: FromScratch reads its own undeclared solver target`, pContext.getValue(`${tmpSalt}.FromScratch`), tmpCopy.FromScratch, 'open');
		pContext.check(`${tmpSalt}: an injected manifest's ValidationSolvers run`, pContext.getValue(`${tmpSalt}.CheckedTotal`) != null, _Cases.KNOWN_OPEN.ValidationSolvers, 'open');
	}

	// Section visibility driven by a solver
	for (const tmpSalt of _Cases.SALTS)
	{
		pContext.checkEqual(`${tmpSalt}: SetSectionVisibility acts on its own Extras section`, pContext.isSectionHidden(`Extras_${tmpSalt}`), _Cases.COPIES[tmpSalt].ExtrasHidden);
	}

	// Tab section and tab group selectors: defaults, then a switch in one copy only
	for (const tmpSalt of _Cases.SALTS)
	{
		pContext.checkEqual(`${tmpSalt}: the default tab shows its own TabTwo`, pContext.isSectionHidden(`TabTwo_${tmpSalt}`), false);
		pContext.checkEqual(`${tmpSalt}: the default tab hides its own TabOne`, pContext.isSectionHidden(`TabOne_${tmpSalt}`), true);
		pContext.checkEqual(`${tmpSalt}: the default group tab shows its own GroupB`, pContext.isGroupHidden(`Grouped_${tmpSalt}`, `GroupB_${tmpSalt}`), false);
		pContext.checkEqual(`${tmpSalt}: the default group tab hides its own GroupA`, pContext.isGroupHidden(`Grouped_${tmpSalt}`, `GroupA_${tmpSalt}`), true);
	}
	const [ tmpFirstSalt, tmpSecondSalt ] = _Cases.SALTS;
	pContext.check(`${tmpFirstSalt}: its TabOne tab is in the DOM`, pContext.clickTab(`TabPicker_${tmpFirstSalt}`, `TabOne_${tmpFirstSalt}`));
	pContext.check(`${tmpFirstSalt}: its GroupA tab is in the DOM`, pContext.clickTab(`GroupPicker_${tmpFirstSalt}`, `GroupA_${tmpFirstSalt}`));
	await pContext.wait(20);
	pContext.checkEqual(`${tmpFirstSalt}: switching tabs shows its own TabOne`, pContext.isSectionHidden(`TabOne_${tmpFirstSalt}`), false);
	pContext.checkEqual(`${tmpFirstSalt}: switching tabs hides its own TabTwo`, pContext.isSectionHidden(`TabTwo_${tmpFirstSalt}`), true);
	pContext.checkEqual(`${tmpFirstSalt}: the tab selector stores its own section hash`, pContext.getValue(`${tmpFirstSalt}.TabPicker`), `TabOne_${tmpFirstSalt}`);
	pContext.checkEqual(`${tmpSecondSalt}: its TabOne stays hidden when the other copy switches tabs`, pContext.isSectionHidden(`TabOne_${tmpSecondSalt}`), true);
	pContext.checkEqual(`${tmpSecondSalt}: its TabTwo stays shown when the other copy switches tabs`, pContext.isSectionHidden(`TabTwo_${tmpSecondSalt}`), false);
	pContext.checkEqual(`${tmpFirstSalt}: switching group tabs shows its own GroupA`, pContext.isGroupHidden(`Grouped_${tmpFirstSalt}`, `GroupA_${tmpFirstSalt}`), false);
	pContext.checkEqual(`${tmpFirstSalt}: switching group tabs hides its own GroupB`, pContext.isGroupHidden(`Grouped_${tmpFirstSalt}`, `GroupB_${tmpFirstSalt}`), true);
	pContext.checkEqual(`${tmpSecondSalt}: its GroupA stays hidden when the other copy switches group tabs`, pContext.isGroupHidden(`Grouped_${tmpSecondSalt}`, `GroupA_${tmpSecondSalt}`), true);
	pContext.checkEqual(`${tmpSecondSalt}: its GroupB stays shown when the other copy switches group tabs`, pContext.isGroupHidden(`Grouped_${tmpSecondSalt}`, `GroupB_${tmpSecondSalt}`), false);

	// Charts
	for (const tmpSalt of _Cases.SALTS)
	{
		const tmpChart = pContext.getChartData(`LineChart_${tmpSalt}`);
		if (pContext.check(`${tmpSalt}: its chart rendered`, tmpChart !== null))
		{
			const tmpExpected = _Cases.COPIES[tmpSalt].Chart;
			pContext.checkEqual(`${tmpSalt}: chart labels come from its own rows`, tmpChart.Labels, tmpExpected.Labels);
			pContext.checkEqual(`${tmpSalt}: the first chart dataset comes from its own rows`, (tmpChart.Datasets[0] || {}).Data, tmpExpected.Line);
			pContext.checkEqual(`${tmpSalt}: the second chart dataset comes from its own solved values`, (tmpChart.Datasets[1] || {}).Data, tmpExpected.Scaled);
		}
	}

	// A templated input renders its template when the section renders, so this is the read-back-from-saved
	// -data path: re-render the copy and the template has to show that copy's values.
	for (const tmpSalt of _Cases.SALTS)
	{
		pContext.rerenderSection(`Composed_${tmpSalt}`);
	}
	await pContext.wait(20);
	for (const tmpSalt of _Cases.SALTS)
	{
		const tmpSummary = pContext.querySection(`Composed_${tmpSalt}`, '.crate-summary');
		pContext.checkEqual(`${tmpSalt}: its templated input re-renders from its own saved data`, tmpSummary ? tmpSummary.textContent.trim() : null, _Cases.COPIES[tmpSalt].Summary);
	}

	// A trigger group, driven by a real change event in one copy only
	const tmpSiblingEchoBefore = pContext.getValue(`${tmpSecondSalt}.Echo`);
	pContext.check(`${tmpFirstSalt}: typed Source into its own input`, pContext.enterValue(`Source_${tmpFirstSalt}`, 6));
	await pContext.wait(100);
	pContext.checkEqual(`${tmpFirstSalt}: its trigger group PostSolvers write Echo inside its own copy`, pContext.getValue(`${tmpFirstSalt}.Echo`), 60);
	pContext.checkEqual(`${tmpFirstSalt}: its trigger group PreSolvers run inside its own copy`, pContext.getValue(`${tmpFirstSalt}.EchoStamp`), 6);
	pContext.checkEqual(`${tmpFirstSalt}: its TriggerAddress autofills Mirror from its own Source`, pContext.getValue(`${tmpFirstSalt}.Mirror`), 6);
	const tmpEchoElement = pContext.getInputElement(`Echo_${tmpFirstSalt}`);
	pContext.checkEqual(`${tmpFirstSalt}: MarshalOnComplete re-marshals its own section`, tmpEchoElement ? tmpEchoElement.value : null, 60);
	const tmpSiblingMirror = pContext.getValue(`${tmpSecondSalt}.Mirror`);
	pContext.check(`${tmpSecondSalt}: Mirror is only ever autofilled from its own Source`, (tmpSiblingMirror == null) || (tmpSiblingMirror === '') || (Number(tmpSiblingMirror) === 2), { Actual: tmpSiblingMirror });
	const tmpSiblingEcho = pContext.getValue(`${tmpSecondSalt}.Echo`);
	pContext.check(`${tmpSecondSalt}: Echo is only ever computed from its own Source`, (tmpSiblingEcho == null) || (tmpSiblingEcho === '') || (Number(tmpSiblingEcho) === 20), { Actual: tmpSiblingEcho });
	pContext.check(`${tmpSecondSalt}: its trigger group does not run when the other copy changes`, String(tmpSiblingEcho) === String(tmpSiblingEchoBefore), _Cases.KNOWN_OPEN.SharedTriggerGroupHash, 'open');

	// The unsalted root
	const tmpRootAfter = rootWithoutCopies(tmpMarshalDestinationObject);
	for (const [ tmpKey, tmpValue ] of Object.entries(tmpRootBefore))
	{
		pContext.check(`unsalted root: ${tmpKey} is unchanged`, JSON.stringify(tmpRootAfter[tmpKey]) === JSON.stringify(tmpValue), { Before: tmpValue, After: tmpRootAfter[tmpKey] });
	}
	const tmpNewKeys = Object.keys(tmpRootAfter).filter((pKey) => !(pKey in tmpRootBefore));
	const tmpUndeclaredKeys = tmpNewKeys.filter((pKey) => (pKey in _Cases.KNOWN_ROOT_KEYS) && (_Cases.KNOWN_ROOT_KEYS[pKey].Severity === 'open'));
	const tmpBenignKeys = tmpNewKeys.filter((pKey) => (pKey in _Cases.KNOWN_ROOT_KEYS) && (_Cases.KNOWN_ROOT_KEYS[pKey].Severity === 'benign'));
	const tmpUnexpectedKeys = tmpNewKeys.filter((pKey) => !(pKey in _Cases.KNOWN_ROOT_KEYS) && (pKey !== 'Scratch'));
	pContext.check('unsalted root: an injected copy adds no keys of its own', tmpUnexpectedKeys.length === 0, tmpUnexpectedKeys.map((pKey) => `${pKey}=${JSON.stringify(tmpRootAfter[pKey])}`));
	pContext.check('unsalted root: an undeclared solver target stays inside its copy', (tmpUndeclaredKeys.length === 0) && !tmpNewKeys.includes('Scratch'), { Keys: tmpUndeclaredKeys.concat(tmpNewKeys.includes('Scratch') ? [ 'Scratch' ] : []), Reason: _Cases.KNOWN_OPEN.UndeclaredSolverTargets }, 'open');
	pContext.info.BenignRootKeys = tmpBenignKeys;
}

module.exports = { run: run };
