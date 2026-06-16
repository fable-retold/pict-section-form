/*
	Unit tests for the Informary provider's element marshal.

	Focus: marshalSpecificElementDataToForm must assign content straight to the form
	element it is handed, NOT re-resolve a selector built from that element's own
	attributes (a full-document scan per cell -> O(n^2) across a large tabular marshal).
*/

const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');
const libInformary = require('../source/providers/Pict-Provider-Informary.js');

suite(
	'Pict Provider Informary',
	() =>
	{
		suite(
			'marshalSpecificElementDataToForm assigns to the element in hand',
			() =>
			{
				const buildHarness = () =>
				{
					const tmpPict = new libPict({ Product: 'MockInformary', ProductVersion: '1.0.0' });
					tmpPict.addProviderSingleton('Informary', libInformary.default_configuration, libInformary);
					const tmpAssignCalls = [];
					// Capture what assignContent is handed.
					tmpPict.ContentAssignment.assignContent = (pAddress, pContent) =>
					{
						tmpAssignCalls.push({ Address: pAddress, Content: pContent });
					};
					// The whole point of the fix: the marshal must NOT resolve a selector.
					tmpPict.ContentAssignment.getElement = (pAddress) =>
					{
						throw new Error(`getElement must not be called during the element marshal; got [${pAddress}]`);
					};
					return { pict: tmpPict, informary: tmpPict.providers.Informary, assigns: tmpAssignCalls };
				};

				const buildElement = (pAttributes) =>
				{
					return { getAttribute: (pName) => (pName in pAttributes ? pAttributes[pName] : null) };
				};

				const tmpManifest = { getValueAtAddress: (pData, pAddress) => pData[pAddress] };

				test(
					'non-container datum: assigns the value straight to the passed element',
					(fDone) =>
					{
						const tmpHarness = buildHarness();
						const tmpElement = buildElement({ 'data-i-datum': 'Greeting', 'data-i-container': null, 'data-i-index': '0' });
						tmpHarness.informary.marshalSpecificElementDataToForm(tmpElement, tmpManifest, { Greeting: 'hello' });
						Expect(tmpHarness.assigns.length).to.equal(1);
						// The ELEMENT itself, never a string selector.
						Expect(tmpHarness.assigns[0].Address).to.equal(tmpElement);
						Expect(typeof tmpHarness.assigns[0].Address).to.not.equal('string');
						Expect(tmpHarness.assigns[0].Content).to.equal('hello');
						fDone();
					}
				);

				test(
					'container datum: assigns the composed-address value straight to the passed element',
					(fDone) =>
					{
						const tmpHarness = buildHarness();
						const tmpElement = buildElement({ 'data-i-datum': 'Score', 'data-i-container': 'Grades', 'data-i-index': '2' });
						const tmpKey = tmpHarness.informary.getComposedContainerAddress('Grades', 2, 'Score');
						const tmpData = {};
						tmpData[tmpKey] = 99;
						tmpHarness.informary.marshalSpecificElementDataToForm(tmpElement, tmpManifest, tmpData);
						Expect(tmpHarness.assigns.length).to.equal(1);
						Expect(tmpHarness.assigns[0].Address).to.equal(tmpElement);
						Expect(tmpHarness.assigns[0].Content).to.equal(99);
						fDone();
					}
				);

				test(
					'element with no datum address is skipped (returns false, no assignment)',
					(fDone) =>
					{
						const tmpHarness = buildHarness();
						const tmpElement = buildElement({});
						const tmpResult = tmpHarness.informary.marshalSpecificElementDataToForm(tmpElement, tmpManifest, {});
						Expect(tmpResult).to.equal(false);
						Expect(tmpHarness.assigns.length).to.equal(0);
						fDone();
					}
				);

				test(
					'a null app-state value does not assign (no spurious blank write)',
					(fDone) =>
					{
						const tmpHarness = buildHarness();
						const tmpElement = buildElement({ 'data-i-datum': 'Missing', 'data-i-container': null, 'data-i-index': '0' });
						tmpHarness.informary.marshalSpecificElementDataToForm(tmpElement, tmpManifest, {});
						Expect(tmpHarness.assigns.length).to.equal(0);
						fDone();
					}
				);
			}
		);
	}
);
