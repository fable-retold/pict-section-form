/*
	Reconstitution scenario: does a form built by injecting copies and filling them in match the same form
	rebuilt from nothing but the data it saved?

	A host application saves the marshalled data and, when the form is opened again, boots with that data and
	injects the same manifests under the same salts. Nothing re-enters the values. So the two runs have to
	agree, or a saved form reads back differently from the one that was filled in -- data landing outside the
	copy it belongs to, a solver overwriting a saved value with a default, an input that cannot marshal its own
	saved value back.

	Two phases, run by the node side, which compares their snapshots:
		live    inject the copies, seed data, solve, and publish both the snapshot and the data to save
		rest    boot with that saved data, inject the same copies, solve, and publish the snapshot

	Config: { Scenario: 'Reconstitution', Phase, Manifest, HostManifest, MarshalDestination?, InitialAppData?,
	          Salts, Fill?, SavedData? (rest only), DeclareUndeclaredSolverTargets? }
*/

const libDifferential = require('./Injection-Conformance-Differential-Scenario.js');

/**
 * @param {any} pValue
 * @return {any}
 */
function cloneData(pValue)
{
	return (pValue === undefined) ? undefined : JSON.parse(JSON.stringify(pValue));
}

/**
 * Saved data is relative to the form's marshal destination, and an application boots from its AppData root,
 * so the saved document has to be nested back under the destination on the way in.
 *
 * @param {Record<string, any>} pInitialAppData - What the application would boot with anyway.
 * @param {any} pSavedData - The marshalled data the live phase published.
 * @param {string} [pMarshalDestination] - e.g. `AppData.Orchard`; defaults to the AppData root.
 *
 * @return {Record<string, any>} The AppData to boot with.
 */
function nestSavedData(pInitialAppData, pSavedData, pMarshalDestination)
{
	const tmpSaved = (pSavedData === undefined) ? {} : cloneData(pSavedData);
	const tmpDestination = pMarshalDestination || 'AppData';
	const tmpRelative = (tmpDestination === 'AppData') ? '' : tmpDestination.replace(/^AppData\./, '');
	if (tmpRelative.length < 1)
	{
		return tmpSaved;
	}
	const tmpAppData = pInitialAppData || {};
	const tmpSegments = tmpRelative.split('.');
	let tmpCursor = tmpAppData;
	for (let i = 0; i < (tmpSegments.length - 1); i++)
	{
		if (!tmpCursor[tmpSegments[i]] || (typeof(tmpCursor[tmpSegments[i]]) !== 'object'))
		{
			tmpCursor[tmpSegments[i]] = {};
		}
		tmpCursor = tmpCursor[tmpSegments[i]];
	}
	tmpCursor[tmpSegments[tmpSegments.length - 1]] = tmpSaved;
	return tmpAppData;
}

/**
 * The state a reopened form has to reproduce: every copy's data, what is hidden, what the charts hold, and
 * what the inputs actually display.
 *
 * @param {import('./Injection-Conformance-Harness-Driver.js').HarnessContext} pContext
 * @param {Record<string, any>} pOriginal - The manifest as authored, before salting.
 * @param {Record<string, any>} pSalted - The salted copy.
 * @param {string} pSalt
 *
 * @return {Record<string, any>}
 */
function snapshotCopy(pContext, pOriginal, pSalted, pSalt)
{
	const tmpHidden = {};
	for (const tmpSection of pOriginal.Sections || [])
	{
		tmpHidden[tmpSection.Hash] = pContext.isSectionHidden(`${tmpSection.Hash}_${pSalt}`);
		for (const tmpGroup of tmpSection.Groups || [])
		{
			tmpHidden[`${tmpSection.Hash}/${tmpGroup.Hash}`] = pContext.isGroupHidden(`${tmpSection.Hash}_${pSalt}`, `${tmpGroup.Hash}_${pSalt}`);
		}
	}
	const tmpCharts = {};
	const tmpDisplayed = {};
	for (const [ tmpKey, tmpDescriptor ] of Object.entries(pSalted.Descriptors || {}))
	{
		const tmpOriginalKey = tmpDescriptor.OriginalHash || tmpDescriptor.OriginalDataAddress || tmpKey;
		if (tmpDescriptor.PictForm && (tmpDescriptor.PictForm.InputType === 'Chart'))
		{
			tmpCharts[tmpOriginalKey] = pContext.getChartData(tmpDescriptor.Hash || tmpKey);
			continue;
		}
		const tmpElement = pContext.getInputElement(tmpDescriptor.Hash || tmpKey);
		if (tmpElement && ('value' in tmpElement))
		{
			tmpDisplayed[tmpOriginalKey] = tmpElement.value;
		}
	}
	return { Data: cloneData(pContext.marshalDestinationObject[pSalt]), Hidden: tmpHidden, Charts: tmpCharts, Displayed: tmpDisplayed };
}

/**
 * @param {import('./Injection-Conformance-Harness-Driver.js').HarnessContext} pContext
 *
 * @return {Promise<void>}
 */
async function run(pContext)
{
	const tmpConfig = pContext.config;
	const tmpSalts = tmpConfig.Salts;
	const tmpAtRest = (tmpConfig.Phase === 'rest');
	if (!tmpAtRest && (tmpConfig.Phase !== 'live'))
	{
		throw new Error(`Unknown reconstitution phase [${tmpConfig.Phase}].`);
	}

	// The saved data stands in for the document a host application reopens, so it seeds the application
	// rather than being written in after the form is up.
	const tmpInitialAppData = tmpAtRest
		? nestSavedData(cloneData(tmpConfig.InitialAppData || {}), tmpConfig.SavedData, tmpConfig.MarshalDestination)
		: cloneData(tmpConfig.InitialAppData || {});
	await pContext.boot({ HostManifest: tmpConfig.HostManifest, MarshalDestination: tmpConfig.MarshalDestination, InitialAppData: tmpInitialAppData });

	const tmpParser = pContext.pict.instantiateServiceProviderIfNotExists('ExpressionParser');
	// Each salt can carry a manifest of its own, so a form holding several different tests round trips the
	// same way one holding two copies of a single test does.
	const tmpManifests = {};
	const tmpUndeclared = [];
	for (let i = 0; i < tmpSalts.length; i++)
	{
		const tmpSalt = tmpSalts[i];
		let tmpSaltManifest = Array.isArray(tmpConfig.Manifests) ? tmpConfig.Manifests[i] : tmpConfig.Manifest;
		const tmpUndeclaredForSalt = libDifferential.findUndeclaredSolverTargets(tmpParser, tmpSaltManifest);
		for (const tmpTarget of tmpUndeclaredForSalt)
		{
			if (!tmpUndeclared.includes(tmpTarget))
			{
				tmpUndeclared.push(tmpTarget);
			}
		}
		if (tmpConfig.DeclareUndeclaredSolverTargets)
		{
			tmpSaltManifest = cloneData(tmpSaltManifest);
			for (const tmpTarget of tmpUndeclaredForSalt)
			{
				tmpSaltManifest.Descriptors[tmpTarget] = { Name: tmpTarget, Hash: tmpTarget, DataAddress: tmpTarget };
			}
		}
		tmpManifests[tmpSalt] = tmpSaltManifest;
	}
	pContext.info.UndeclaredSolverTargets = tmpUndeclared;

	const tmpMarshal = pContext.marshalDestinationObject;
	let tmpFilledAddresses = 0;
	const tmpCopies = {};
	for (const tmpSalt of tmpSalts)
	{
		if (!tmpAtRest)
		{
			const tmpFill = libDifferential.buildFill(tmpManifests[tmpSalt], tmpConfig.Fill || {});
			tmpFilledAddresses += Object.keys(tmpFill).length;
			tmpMarshal[tmpSalt] = tmpMarshal[tmpSalt] || {};
			for (const [ tmpAddress, tmpValue ] of Object.entries(tmpFill))
			{
				pContext.pict.manifest.setValueAtAddress(tmpMarshal[tmpSalt], tmpAddress, cloneData(tmpValue));
			}
		}
		const tmpInjection = await pContext.inject(tmpManifests[tmpSalt], tmpSalt);
		tmpCopies[tmpSalt] = tmpInjection.Salted;
	}
	pContext.info.FilledAddresses = tmpFilledAddresses;
	await pContext.solve();
	await pContext.solve();

	const tmpSnapshot = { Copies: {} };
	for (const tmpSalt of tmpSalts)
	{
		tmpSnapshot.Copies[tmpSalt] = snapshotCopy(pContext, tmpManifests[tmpSalt], tmpCopies[tmpSalt], tmpSalt);
	}
	pContext.snapshots.Reconstitution = tmpSnapshot;
	if (!tmpAtRest)
	{
		// What the host would persist, and what the rest phase boots from.
		pContext.snapshots.SavedData = cloneData(tmpMarshal);
	}
}

module.exports = { run: run, snapshotCopy: snapshotCopy, nestSavedData: nestSavedData };
