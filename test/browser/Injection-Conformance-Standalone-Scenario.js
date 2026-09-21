/*
	Standalone scenario: boots a manifest as the form itself (no injection), seeds data, solves and reports
	the resulting data, hidden sections and any `Expect` mismatches. For checking solver behavior of a
	manifest outside a host form.

	Config: { Scenario: 'Standalone', Manifest, MarshalDestination?, Data?, Fill?: { Seed, RowCount }, Expect?: { address: value } }
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
 * Evaluates the expectations a caller configured.
 *
 * `Expect` is either an address to value map, or an array of entries:
 *   { Kind: 'Value', Address, Value }
 *   { Kind: 'SectionVisible', Section, Visible }
 *   { Kind: 'GroupVisible', Section, Group, Visible }
 *
 * @param {import('./Injection-Conformance-Harness-Driver.js').HarnessContext} pContext
 * @param {any} pExpect
 */
function checkExpectations(pContext, pExpect)
{
	if (!pExpect)
	{
		return;
	}
	if (!Array.isArray(pExpect))
	{
		for (const [ tmpAddress, tmpExpected ] of Object.entries(pExpect))
		{
			pContext.checkEqual(`${tmpAddress} = ${JSON.stringify(tmpExpected)}`, pContext.getValue(tmpAddress), tmpExpected);
		}
		return;
	}
	for (const tmpExpectation of pExpect)
	{
		if (!tmpExpectation || (typeof(tmpExpectation) !== 'object'))
		{
			continue;
		}
		switch (tmpExpectation.Kind)
		{
			case 'SectionVisible':
				pContext.checkEqual(`section ${tmpExpectation.Section} is ${tmpExpectation.Visible ? 'visible' : 'hidden'}`, pContext.isSectionHidden(tmpExpectation.Section), !tmpExpectation.Visible);
				break;

			case 'GroupVisible':
				pContext.checkEqual(`group ${tmpExpectation.Section}/${tmpExpectation.Group} is ${tmpExpectation.Visible ? 'visible' : 'hidden'}`, pContext.isGroupHidden(tmpExpectation.Section, tmpExpectation.Group), !tmpExpectation.Visible);
				break;

			case 'Value':
			default:
				pContext.checkEqual(`${tmpExpectation.Address} = ${JSON.stringify(tmpExpectation.Value)}`, pContext.getValue(tmpExpectation.Address), tmpExpectation.Value);
				break;
		}
	}
}

/**
 * @param {import('./Injection-Conformance-Harness-Driver.js').HarnessContext} pContext
 * @return {Promise<void>}
 */
async function run(pContext)
{
	const tmpConfig = pContext.config;
	const tmpManifest = cloneData(tmpConfig.Manifest);
	if (!tmpManifest.ReferenceManifests)
	{
		tmpManifest.ReferenceManifests = {};
	}
	await pContext.boot({ HostManifest: tmpManifest, MarshalDestination: tmpConfig.MarshalDestination, InitialAppData: tmpConfig.InitialAppData });

	const tmpMarshal = pContext.marshalDestinationObject;
	if (tmpConfig.Fill)
	{
		for (const [ tmpAddress, tmpValue ] of Object.entries(libDifferential.buildFill(tmpManifest, tmpConfig.Fill)))
		{
			pContext.pict.manifest.setValueAtAddress(tmpMarshal, tmpAddress, tmpValue);
		}
	}
	for (const [ tmpAddress, tmpValue ] of Object.entries(tmpConfig.Data || {}))
	{
		pContext.pict.manifest.setValueAtAddress(tmpMarshal, tmpAddress, cloneData(tmpValue));
	}
	for (const tmpView of pContext.getSectionViews())
	{
		tmpView.render();
	}
	pContext.metacontroller.marshalToView();
	await pContext.wait(20);
	await pContext.solve();
	await pContext.solve();

	const tmpHidden = {};
	for (const tmpSection of tmpManifest.Sections || [])
	{
		tmpHidden[tmpSection.Hash] = pContext.isSectionHidden(tmpSection.Hash);
	}
	pContext.snapshots.Standalone = { Data: cloneData(tmpMarshal), Hidden: tmpHidden };
	checkExpectations(pContext, tmpConfig.Expect);
	pContext.check('solve completed', true);
}

module.exports = { run: run };
