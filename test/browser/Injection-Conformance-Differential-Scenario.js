/*
	Injection conformance, browser tier: the differential scenario.

	Differential scenario: works for any manifest, no expected values needed. One phase per page load; the
	node runner (Injection-Conformance-Harness-Runner.js runDifferential) compares the phases:

		host    no injection -- the unsalted root as the host leaves it
		pair    copy A (seeded numeric data), then copy B (no data)
		solo-a  copy A alone, same data
		solo-b  copy B alone

	A copy that reads or writes anything outside its own subtree computes differently next to a sibling than
	alone, or changes the unsalted root.
*/

const NUMERIC_DATA_TYPES = [ 'Number', 'PreciseNumber', 'Integer', 'Float' ];

/**
 * @param {any} pValue
 * @return {any}
 */
function cloneData(pValue)
{
	return (pValue === undefined) ? undefined : JSON.parse(JSON.stringify(pValue));
}

/**
 * Deterministic value in [1, 91) for an address, so every phase seeds identical data.
 *
 * @param {number} pSeed
 * @param {string} pAddress
 * @return {number}
 */
function seededValue(pSeed, pAddress)
{
	let tmpHash = 2166136261 ^ pSeed;
	const tmpText = `${pSeed}:${pAddress}`;
	for (let i = 0; i < tmpText.length; i++)
	{
		tmpHash ^= tmpText.charCodeAt(i);
		tmpHash = Math.imul(tmpHash, 16777619);
	}
	return 1 + ((tmpHash >>> 0) % 9000) / 100;
}

/**
 * @param {Record<string, any>} pDescriptor
 * @return {boolean}
 */
function isNumericDescriptor(pDescriptor)
{
	return Boolean(pDescriptor) && NUMERIC_DATA_TYPES.includes(pDescriptor.DataType);
}

/**
 * Seed data for a manifest: every rendered numeric input and `RowCount` rows for each record set group.
 *
 * @param {Record<string, any>} pManifest
 * @param {{ Seed?: number, RowCount?: number }} pFill
 * @return {Record<string, any>} address (unsalted) -> value
 */
function buildFill(pManifest, pFill)
{
	const tmpSeed = (pFill && typeof pFill.Seed === 'number') ? pFill.Seed : 1;
	const tmpRowCount = (pFill && typeof pFill.RowCount === 'number') ? pFill.RowCount : 3;
	const tmpValues = {};
	for (const [ tmpKey, tmpDescriptor ] of Object.entries(pManifest.Descriptors || {}))
	{
		if (!tmpDescriptor || !tmpDescriptor.PictForm || !tmpDescriptor.PictForm.Section || !isNumericDescriptor(tmpDescriptor))
		{
			continue;
		}
		const tmpAddress = tmpDescriptor.DataAddress || tmpKey;
		tmpValues[tmpAddress] = seededValue(tmpSeed, tmpAddress);
	}
	for (const tmpSection of pManifest.Sections || [])
	{
		for (const tmpGroup of tmpSection.Groups || [])
		{
			const tmpRowManifest = (pManifest.ReferenceManifests || {})[tmpGroup.RecordManifest];
			if (!tmpGroup.RecordSetAddress || !tmpRowManifest)
			{
				continue;
			}
			const tmpRows = [];
			for (let r = 0; r < tmpRowCount; r++)
			{
				const tmpRow = {};
				for (const [ tmpColumnKey, tmpColumn ] of Object.entries(tmpRowManifest.Descriptors || {}))
				{
					if (isNumericDescriptor(tmpColumn))
					{
						const tmpColumnAddress = tmpColumn.DataAddress || tmpColumnKey;
						setPath(tmpRow, tmpColumnAddress, seededValue(tmpSeed, `${tmpGroup.RecordSetAddress}[${r}].${tmpColumnAddress}`));
					}
				}
				tmpRows.push(tmpRow);
			}
			tmpValues[tmpGroup.RecordSetAddress] = tmpRows;
		}
	}
	return tmpValues;
}

/**
 * Sets a dotted path (no array segments) on a plain object.
 *
 * @param {Record<string, any>} pObject
 * @param {string} pPath
 * @param {any} pValue
 */
function setPath(pObject, pPath, pValue)
{
	const tmpParts = pPath.split('.');
	let tmpCursor = pObject;
	for (let i = 0; i < tmpParts.length - 1; i++)
	{
		if ((typeof tmpCursor[tmpParts[i]] !== 'object') || (tmpCursor[tmpParts[i]] === null))
		{
			tmpCursor[tmpParts[i]] = {};
		}
		tmpCursor = tmpCursor[tmpParts[i]];
	}
	tmpCursor[tmpParts[tmpParts.length - 1]] = pValue;
}

/**
 * Section solver assignment targets that no descriptor (or record set address) covers. Solvers write these
 * straight into the marshal destination under their unsalted name.
 *
 * @param {any} pExpressionParser
 * @param {Record<string, any>} pManifest
 * @return {Array<string>} the uncovered top-level names
 */
function findUndeclaredSolverTargets(pExpressionParser, pManifest)
{
	const tmpKnown = new Set();
	for (const [ tmpKey, tmpDescriptor ] of Object.entries(pManifest.Descriptors || {}))
	{
		tmpKnown.add(tmpDescriptor.DataAddress || tmpKey);
		if (tmpDescriptor.Hash)
		{
			tmpKnown.add(tmpDescriptor.Hash);
		}
	}
	for (const tmpSection of pManifest.Sections || [])
	{
		for (const tmpGroup of tmpSection.Groups || [])
		{
			if (tmpGroup.RecordSetAddress)
			{
				tmpKnown.add(tmpGroup.RecordSetAddress);
			}
		}
	}
	const isCovered = (pTarget) =>
	{
		if (tmpKnown.has(pTarget))
		{
			return true;
		}
		for (let i = pTarget.length - 1; i > 0; i--)
		{
			if (((pTarget[i] === '.') || (pTarget[i] === '[')) && tmpKnown.has(pTarget.substring(0, i)))
			{
				return true;
			}
		}
		return false;
	};
	const tmpUndeclared = new Set();
	for (const tmpSection of pManifest.Sections || [])
	{
		for (const tmpSolver of tmpSection.Solvers || [])
		{
			const tmpExpression = (typeof tmpSolver === 'string') ? tmpSolver : (tmpSolver && tmpSolver.Expression);
			if (typeof tmpExpression !== 'string')
			{
				continue;
			}
			const tmpResult = {};
			try
			{
				pExpressionParser.tokenize(tmpExpression, tmpResult);
			}
			catch (pError)
			{
				continue;
			}
			const tmpTokens = tmpResult.OriginalRawTokens || [];
			if ((tmpTokens.length > 1) && ((tmpTokens[1] === '=') || (tmpTokens[1] === '?=')) && !isCovered(tmpTokens[0]))
			{
				tmpUndeclared.add(tmpTokens[0].split(/[.[]/)[0]);
			}
		}
	}
	return Array.from(tmpUndeclared);
}

/**
 * @param {import('./Injection-Conformance-Harness-Driver.js').HarnessContext} pContext
 * @param {Record<string, any>} pSalted - the manifest as injected
 * @param {string} pSalt
 */
function checkInjectedManifest(pContext, pSalted, pSalt)
{
	for (const [ tmpKey, tmpDescriptor ] of Object.entries(pSalted.Descriptors || {}))
	{
		const tmpPictForm = tmpDescriptor.PictForm || {};
		if (Array.isArray(tmpPictForm.TabSectionSet))
		{
			const tmpMissing = tmpPictForm.TabSectionSet.filter((pHash) => !pContext.getSectionView(pHash));
			pContext.check(`${pSalt}: ${tmpKey} TabSectionSet names rendered sections`, tmpMissing.length === 0, tmpMissing);
		}
		if (Array.isArray(tmpPictForm.TabGroupSet))
		{
			const tmpView = pContext.getSectionView(tmpPictForm.Section);
			const tmpGroups = (tmpView && tmpView.sectionDefinition && Array.isArray(tmpView.sectionDefinition.Groups)) ? tmpView.sectionDefinition.Groups.map((pGroup) => pGroup.Hash) : [];
			const tmpMissing = tmpPictForm.TabGroupSet.filter((pHash) => !tmpGroups.includes(pHash));
			pContext.check(`${pSalt}: ${tmpKey} TabGroupSet names groups of its section`, tmpMissing.length === 0, tmpMissing);
		}
	}
}

/**
 * @param {import('./Injection-Conformance-Harness-Driver.js').HarnessContext} pContext
 * @param {Record<string, any>} pOriginal
 * @param {Record<string, any>} pSalted
 * @param {string} pSalt
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
	for (const [ tmpKey, tmpDescriptor ] of Object.entries(pSalted.Descriptors || {}))
	{
		if (tmpDescriptor.PictForm && (tmpDescriptor.PictForm.InputType === 'Chart'))
		{
			tmpCharts[tmpDescriptor.OriginalHash || tmpDescriptor.OriginalDataAddress || tmpKey] = pContext.getChartData(tmpDescriptor.Hash || tmpKey);
		}
	}
	return { Data: cloneData(pContext.marshalDestinationObject[pSalt]), Hidden: tmpHidden, Charts: tmpCharts };
}

/**
 * @param {import('./Injection-Conformance-Harness-Driver.js').HarnessContext} pContext
 * @return {Promise<void>}
 */
async function run(pContext)
{
	const tmpConfig = pContext.config;
	const [ tmpSaltA, tmpSaltB ] = tmpConfig.Salts;
	await pContext.boot({ HostManifest: tmpConfig.HostManifest, MarshalDestination: tmpConfig.MarshalDestination, InitialAppData: tmpConfig.InitialAppData });

	const tmpParser = pContext.pict.instantiateServiceProviderIfNotExists('ExpressionParser');
	let tmpManifest = tmpConfig.Manifest;
	const tmpUndeclared = findUndeclaredSolverTargets(tmpParser, tmpManifest);
	pContext.info.UndeclaredSolverTargets = tmpUndeclared;
	if (tmpConfig.DeclareUndeclaredSolverTargets)
	{
		tmpManifest = cloneData(tmpManifest);
		for (const tmpTarget of tmpUndeclared)
		{
			tmpManifest.Descriptors[tmpTarget] = { Name: tmpTarget, Hash: tmpTarget, DataAddress: tmpTarget };
		}
	}

	const tmpFill = buildFill(tmpManifest, tmpConfig.Fill || {});
	pContext.info.FilledAddresses = Object.keys(tmpFill).length;
	const tmpInjections = { 'host': [], 'pair': [ tmpSaltA, tmpSaltB ], 'solo-a': [ tmpSaltA ], 'solo-b': [ tmpSaltB ] }[tmpConfig.Phase];
	if (!tmpInjections)
	{
		throw new Error(`Unknown differential phase [${tmpConfig.Phase}].`);
	}

	const tmpMarshal = pContext.marshalDestinationObject;
	const tmpCopies = {};
	for (const tmpSalt of tmpInjections)
	{
		if (tmpSalt === tmpSaltA)
		{
			tmpMarshal[tmpSalt] = tmpMarshal[tmpSalt] || {};
			for (const [ tmpAddress, tmpValue ] of Object.entries(tmpFill))
			{
				pContext.pict.manifest.setValueAtAddress(tmpMarshal[tmpSalt], tmpAddress, cloneData(tmpValue));
			}
		}
		const tmpInjection = await pContext.inject(tmpManifest, tmpSalt);
		tmpCopies[tmpSalt] = tmpInjection.Salted;
		if (tmpConfig.Phase === 'pair')
		{
			checkInjectedManifest(pContext, tmpInjection.Salted, tmpSalt);
		}
	}
	await pContext.solve();
	await pContext.solve();

	const tmpRoot = {};
	for (const [ tmpKey, tmpValue ] of Object.entries(tmpMarshal))
	{
		if ((tmpKey !== tmpSaltA) && (tmpKey !== tmpSaltB))
		{
			tmpRoot[tmpKey] = cloneData(tmpValue);
		}
	}
	const tmpSnapshot = { Root: tmpRoot, Copies: {} };
	for (const tmpSalt of tmpInjections)
	{
		tmpSnapshot.Copies[tmpSalt] = snapshotCopy(pContext, tmpManifest, tmpCopies[tmpSalt], tmpSalt);
	}
	pContext.snapshots.Differential = tmpSnapshot;
}

module.exports = { run: run, buildFill: buildFill, findUndeclaredSolverTargets: findUndeclaredSolverTargets, seededValue: seededValue };
