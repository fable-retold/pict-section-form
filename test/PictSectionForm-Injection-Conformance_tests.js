/*
	Injection conformance, data tier.

	A manifest can be injected into a running form more than once, each copy salted so that it owns its own
	data. This suite is the tier that runs anywhere, as part of `npm test`:

	  - fixture coverage, measured against the library's own registries: every input type, every construct
	    createDistinctManifest translates, every solver directive and every reference shape
	  - a salted copy refers to nothing of its own by its unsalted name
	  - data round trip through two injected copies: data in, solve, read back, write through the view, and
	    re-render from what was saved -- all through the view data API, which is what browser-env can drive

	The browser tier (test/browser, `npm run test:injection`) covers what needs a painted page: charts, tab
	switching, templated rendering, trigger groups driven by real events and the DOM controls themselves.

	Adding an input type to the library fails the coverage suite until a fixture case is declared in
	test/fixtures/injection/Injection-Fixture-Cases.js. See docs/Injection_Conformance.md.
*/

// This is temporary, but enables unit tests
const libBrowserEnv = require('browser-env');
libBrowserEnv();

const libFS = require('fs');
const libPath = require('path');

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');

const libPictSectionForm = require('../source/Pict-Section-Form.js');
const libMetacontroller = require('../source/views/Pict-View-Form-Metacontroller.js');
const libDynamicFormSolverBehaviors = require('../source/providers/Pict-Provider-DynamicFormSolverBehaviors.js');
const libDefaultFormTemplates = require('../source/providers/dynamictemplates/Pict-DynamicTemplates-DefaultFormTemplates.js');
const libReadOnlyFormTemplates = require('../source/providers/dynamictemplates/Pict-DynamicTemplates-DefaultFormTemplates-ReadOnly.js');

const _Fixture = require('./fixtures/injection/Injection-Fixture-Manifest.json');
const _Cases = require('./fixtures/injection/Injection-Fixture-Cases.js');

const _CasesFile = 'test/fixtures/injection/Injection-Fixture-Cases.js';
const _ManifestFile = 'test/fixtures/injection/Injection-Fixture-Manifest.json';

// Properties whose strings are solver expressions, so they are read with the expression parser rather than
// scanned as text. Driven by the injector's own checklist, plus the manifest level solver arrays.
const _SolverProperties = [ 'Solvers', 'ValidationSolvers' ]
	.concat(libMetacontroller.InjectionTranslation.InputSolverProperties)
	.concat(libMetacontroller.InjectionTranslation.TriggerGroupSolverProperties)
	.concat(libMetacontroller.InjectionTranslation.InputSolverSetProperties.map((pEntry) => pEntry.SolverProperty));
const _RecordRelativeSolverProperties = [ 'RecordSetSolvers' ];

/**
 * Every input type the metatemplates dispatch on, and every input provider in the library.
 *
 * @return {Set<string>} registry keys, in the `InputType:<name>` / `Provider:<name>` form the cases use
 */
function enumerateInputRegistry()
{
	const tmpRegistry = new Set();
	for (const tmpTemplateSet of [ libDefaultFormTemplates, libReadOnlyFormTemplates ])
	{
		for (const tmpTemplate of (tmpTemplateSet.Templates || []))
		{
			const tmpMatch = /-Input-(?:InputType|DataType)-([A-Za-z0-9]+)$/.exec(tmpTemplate.HashPostfix || '');
			if (tmpMatch)
			{
				tmpRegistry.add(`InputType:${tmpMatch[1]}`);
			}
		}
	}
	for (const tmpFileName of libFS.readdirSync(libPath.join(__dirname, '..', 'source', 'providers', 'inputs')))
	{
		const tmpMatch = /^Pict-Provider-Input-(.+)\.js$/.exec(tmpFileName);
		if (tmpMatch && !tmpMatch[1].endsWith('-CSS'))
		{
			tmpRegistry.add(`Provider:Pict-Input-${tmpMatch[1]}`);
		}
	}
	return tmpRegistry;
}

/**
 * @param {string} pMarshalDestination
 * @return {any} a metacontroller with just enough wiring to salt a manifest
 */
function buildMetacontroller(pMarshalDestination)
{
	const tmpPict = new libPict({ Product: 'InjectionConformance', LogStreams: [ { streamtype: 'console', level: 'fatal' } ] });
	tmpPict.addProvider('DynamicFormSolverBehaviors', {}, libDynamicFormSolverBehaviors);
	tmpPict.providers.DynamicFormSolverBehaviors.injectBehaviors(tmpPict.instantiateServiceProviderIfNotExists('ExpressionParser'));
	tmpPict.providers.DataBroker.marshalDestination = pMarshalDestination;
	const tmpMetacontroller = Object.create(libMetacontroller.prototype);
	tmpMetacontroller.pict = tmpPict;
	tmpMetacontroller.fable = tmpPict;
	tmpMetacontroller.log = tmpPict.log;
	tmpMetacontroller.options = {};
	return tmpMetacontroller;
}

/**
 * Everything the manifest calls its own, by its unsalted name.
 *
 * @param {Record<string, any>} pManifest
 * @return {Array<string>}
 */
function localNames(pManifest)
{
	const tmpNames = new Set();
	for (const tmpSection of pManifest.Sections || [])
	{
		tmpNames.add(tmpSection.Hash);
		for (const tmpGroup of tmpSection.Groups || [])
		{
			tmpNames.add(tmpGroup.Hash);
			if (tmpGroup.RecordSetAddress)
			{
				tmpNames.add(tmpGroup.RecordSetAddress);
			}
		}
	}
	for (const [ tmpKey, tmpDescriptor ] of Object.entries(pManifest.Descriptors || {}))
	{
		tmpNames.add(tmpDescriptor.DataAddress || tmpKey);
		if (tmpDescriptor.Hash)
		{
			tmpNames.add(tmpDescriptor.Hash);
		}
	}
	return Array.from(tmpNames);
}

/**
 * Every solver expression the fixture manifest holds, as written.
 *
 * @param {Record<string, any>} pManifest
 * @return {Array<string>}
 */
function solverExpressions(pManifest)
{
	const tmpExpressions = [];
	const collect = (pValue, pKey) =>
	{
		if (Array.isArray(pValue))
		{
			for (const tmpEntry of pValue)
			{
				collect(tmpEntry, pKey);
			}
			return;
		}
		if (typeof(pValue) === 'string')
		{
			tmpExpressions.push(pValue);
			return;
		}
		if (pValue && (typeof(pValue) === 'object') && (typeof(pValue.Expression) === 'string'))
		{
			tmpExpressions.push(pValue.Expression);
		}
	};
	const walk = (pNode) =>
	{
		if (Array.isArray(pNode))
		{
			pNode.forEach(walk);
			return;
		}
		if (!pNode || (typeof(pNode) !== 'object'))
		{
			return;
		}
		for (const [ tmpKey, tmpChild ] of Object.entries(pNode))
		{
			if (_SolverProperties.includes(tmpKey) || _RecordRelativeSolverProperties.includes(tmpKey))
			{
				collect(tmpChild, tmpKey);
			}
			walk(tmpChild);
		}
	};
	walk(pManifest);
	return tmpExpressions;
}

/**
 * Reads a salted solver expression with the expression parser and reports references to the manifest that
 * were left unsalted. Iteration variables a directive declares, string literals that are not address
 * parameters, and -- in a record set solver -- the columns of a record, are all names of something other
 * than the manifest, so they are not reported.
 *
 * @param {any} pMetacontroller
 * @param {string} pExpression
 * @param {Array<string>} pLocalNames
 * @param {boolean} pRecordRelative
 * @return {Array<string>} the untranslated references
 */
function findUntranslatedSolverReferences(pMetacontroller, pExpression, pLocalNames, pRecordRelative)
{
	const tmpExpressionParser = pMetacontroller.pict.instantiateServiceProviderIfNotExists('ExpressionParser');
	const tmpLocalNameSet = new Set(pLocalNames);
	const tmpResultObject = {};
	tmpExpressionParser.tokenize(pExpression, tmpResultObject);
	const tmpTokens = Array.from(tmpResultObject.OriginalRawTokens || []);
	const tmpDirectiveScope = pMetacontroller.parseSolverDirectiveScope(tmpTokens);
	const tmpFindings = [];
	const tmpFunctionStack = [];
	let tmpParenDepth = 0;
	for (let i = 0; i < tmpTokens.length; i++)
	{
		const tmpToken = String(tmpTokens[i]);
		if (tmpToken === '(')
		{
			if ((i > 0) && (tmpTokens[i - 1].toLowerCase() in tmpExpressionParser.functionMap))
			{
				tmpFunctionStack.push({ name: tmpTokens[i - 1].toLowerCase(), paramIndex: 0, depth: tmpParenDepth });
			}
			tmpParenDepth++;
			continue;
		}
		if (tmpToken === ')')
		{
			tmpParenDepth--;
			if ((tmpFunctionStack.length > 0) && (tmpFunctionStack[tmpFunctionStack.length - 1].depth === tmpParenDepth))
			{
				tmpFunctionStack.pop();
			}
			continue;
		}
		if (tmpToken === ',')
		{
			if ((tmpFunctionStack.length > 0) && (tmpFunctionStack[tmpFunctionStack.length - 1].depth === (tmpParenDepth - 1)))
			{
				tmpFunctionStack[tmpFunctionStack.length - 1].paramIndex++;
			}
			continue;
		}
		if (tmpDirectiveScope)
		{
			if ((i >= tmpDirectiveScope.HeaderStart) && (i <= tmpDirectiveScope.HeaderEnd) && !tmpDirectiveScope.TranslateIndices.has(i))
			{
				continue;
			}
			if ((i > tmpDirectiveScope.HeaderEnd) && tmpDirectiveScope.Locals.has(tmpToken.replace(/^\{|\}$/g, '').split(/[.[]/)[0]))
			{
				continue;
			}
		}
		const tmpTokenType = tmpExpressionParser.Tokenizer.getTokenType(tmpToken);
		let tmpReference = null;
		if ((tmpTokenType === 'Token.Symbol') && !pRecordRelative)
		{
			tmpReference = tmpToken;
		}
		else if ((tmpTokenType === 'Token.StateAddress') && !pRecordRelative)
		{
			tmpReference = tmpToken.substring(1, tmpToken.length - 1);
		}
		else if (tmpTokenType === 'Token.String')
		{
			const tmpFunction = tmpFunctionStack[tmpFunctionStack.length - 1];
			const tmpFunctionEntry = tmpFunction ? tmpExpressionParser.functionMap[tmpFunction.name] : null;
			if (tmpFunctionEntry && Array.isArray(tmpFunctionEntry.AddressParameterIndices) && tmpFunctionEntry.AddressParameterIndices.includes(tmpFunction.paramIndex))
			{
				tmpReference = tmpToken.substring(1, tmpToken.length - 1);
			}
		}
		if (tmpReference === null)
		{
			continue;
		}
		const tmpBase = tmpReference.split(/[.[]/)[0];
		if (tmpLocalNameSet.has(tmpReference) || tmpLocalNameSet.has(tmpBase))
		{
			tmpFindings.push(tmpReference);
		}
	}
	return tmpFindings;
}

/**
 * Finds names of the manifest that a salted copy still refers to by their unsalted name. Salted references
 * are removed from the text first, so what is left is what was missed.
 *
 * @param {any} pMetacontroller
 * @param {any} pValue - The salted node to scan.
 * @param {Array<string>} pLocalNames
 * @param {string} pSalt
 * @param {string} [pPath]
 * @param {Array<string>} [pFindings]
 * @param {string} [pSolverProperty] - Set while walking the contents of a solver property.
 * @return {Array<string>} `path: name` for each reference that was not translated
 */
function findUntranslatedReferences(pMetacontroller, pValue, pLocalNames, pSalt, pPath, pFindings, pSolverProperty)
{
	const tmpPath = pPath || '';
	const tmpFindings = pFindings || [];
	if (Array.isArray(pValue))
	{
		for (let i = 0; i < pValue.length; i++)
		{
			findUntranslatedReferences(pMetacontroller, pValue[i], pLocalNames, pSalt, `${tmpPath}[${i}]`, tmpFindings, pSolverProperty);
		}
		return tmpFindings;
	}
	if (pValue && (typeof(pValue) === 'object'))
	{
		for (const [ tmpKey, tmpChild ] of Object.entries(pValue))
		{
			if (_Cases.LABEL_PROPERTIES.includes(tmpKey))
			{
				continue;
			}
			const tmpChildSolverProperty = (_SolverProperties.includes(tmpKey) || _RecordRelativeSolverProperties.includes(tmpKey)) ? tmpKey : ((tmpKey === 'Expression') ? pSolverProperty : null);
			findUntranslatedReferences(pMetacontroller, tmpChild, pLocalNames, pSalt, tmpPath ? `${tmpPath}.${tmpKey}` : tmpKey, tmpFindings, tmpChildSolverProperty);
		}
		return tmpFindings;
	}
	if (typeof(pValue) !== 'string')
	{
		return tmpFindings;
	}
	if (pSolverProperty)
	{
		for (const tmpReference of findUntranslatedSolverReferences(pMetacontroller, pValue, pLocalNames, _RecordRelativeSolverProperties.includes(pSolverProperty)))
		{
			tmpFindings.push(`${tmpPath}: ${tmpReference}`);
		}
		return tmpFindings;
	}
	const tmpRemainder = pValue
		.replace(new RegExp(`${pSalt}\\.[A-Za-z0-9_$.[\\]]+`, 'g'), ' ')
		.replace(new RegExp(`[A-Za-z0-9_$]+_${pSalt}`, 'g'), ' ');
	for (const tmpName of pLocalNames)
	{
		const tmpPattern = new RegExp(`(^|[^A-Za-z0-9_$])${tmpName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_$]|$)`);
		if (tmpPattern.test(tmpRemainder))
		{
			tmpFindings.push(`${tmpPath}: ${tmpName}`);
		}
	}
	return tmpFindings;
}

suite('PictSectionForm injection conformance', () =>
{
	suite('fixture coverage', () =>
	{
		test('every input type and input provider in the library has a fixture case', () =>
		{
			const tmpCovered = new Set(_Cases.INPUT_CASES.map((pCase) => pCase.Registry));
			const tmpMissing = Array.from(enumerateInputRegistry()).filter((pEntry) => !tmpCovered.has(pEntry) && !(pEntry in _Cases.EXCLUDED_REGISTRY_ENTRIES));
			Expect(tmpMissing, `Add a fixture case (or an explained exclusion) in ${_CasesFile} for: ${tmpMissing.join(', ')}`).to.deep.equal([]);
		});

		test('every fixture case names an input that is in the fixture manifest', () =>
		{
			const tmpHashes = new Set();
			for (const [ tmpKey, tmpDescriptor ] of Object.entries(_Fixture.InjectableManifest.Descriptors))
			{
				tmpHashes.add(tmpDescriptor.Hash || tmpKey);
			}
			for (const tmpReferenceManifest of Object.values(_Fixture.InjectableManifest.ReferenceManifests || {}))
			{
				for (const [ tmpKey, tmpDescriptor ] of Object.entries(tmpReferenceManifest.Descriptors || {}))
				{
					tmpHashes.add(tmpDescriptor.Hash || tmpKey);
				}
			}
			const tmpMissing = _Cases.INPUT_CASES.filter((pCase) => !tmpHashes.has(pCase.Hash)).map((pCase) => `${pCase.Registry} -> ${pCase.Hash}`);
			Expect(tmpMissing, `Fixture cases naming an input ${_ManifestFile} does not define`).to.deep.equal([]);
		});

		test('every construct the injector translates appears in the fixture manifest', () =>
		{
			const tmpTranslation = libMetacontroller.InjectionTranslation;
			const tmpProperties = []
				.concat(tmpTranslation.InputSectionHashProperties, tmpTranslation.InputGroupHashProperties, tmpTranslation.InputSolverProperties,
					tmpTranslation.InputAddressProperties, tmpTranslation.InputTriggerGroupProperties, tmpTranslation.InputTemplateProperties,
					tmpTranslation.InputEntityBundleProperties, tmpTranslation.EntityBundleAddressProperties, tmpTranslation.EntityBundleTemplateProperties,
					tmpTranslation.TriggerGroupSolverProperties, tmpTranslation.InputSolverSetProperties.map((pEntry) => pEntry.Property));
			const tmpFixtureText = JSON.stringify(_Fixture.InjectableManifest);
			const tmpMissing = tmpProperties.filter((pProperty) => !tmpFixtureText.includes(`"${pProperty}"`));
			Expect(tmpMissing, `The injector translates these, so the fixture manifest has to use them; add them in ${_ManifestFile}: ${tmpMissing.join(', ')}`).to.deep.equal([]);
		});

		test('every manifest construct the injector translates is exercised by the fixture manifest', () =>
		{
			const tmpManifest = _Fixture.InjectableManifest;
			const tmpGroups = (tmpManifest.Sections || []).reduce((pGroups, pSection) => pGroups.concat(pSection.Groups || []), []);
			const tmpExercised =
			{
				'Sections.Solvers': (tmpManifest.Sections || []).some((pSection) => Array.isArray(pSection.Solvers) && (pSection.Solvers.length > 0)),
				'Sections.Groups.RecordSetAddress': tmpGroups.some((pGroup) => Boolean(pGroup.RecordSetAddress)),
				'Sections.Groups.RecordSetSolvers': tmpGroups.some((pGroup) => Array.isArray(pGroup.RecordSetSolvers) && (pGroup.RecordSetSolvers.length > 0)),
				'ReferenceManifests': Object.keys(tmpManifest.ReferenceManifests || {}).length > 0,
				'ValidationSolvers': Array.isArray(tmpManifest.ValidationSolvers) && (tmpManifest.ValidationSolvers.length > 0),
				'Descriptors.DataAddress': Object.keys(tmpManifest.Descriptors || {}).length > 0,
				'Descriptors.Hash': Object.values(tmpManifest.Descriptors || {}).some((pDescriptor) => Boolean(pDescriptor.Hash)),
				'Descriptors.PictForm.Section': Object.values(tmpManifest.Descriptors || {}).some((pDescriptor) => Boolean(pDescriptor.PictForm && pDescriptor.PictForm.Section)),
				'Descriptors.PictForm.Group': Object.values(tmpManifest.Descriptors || {}).some((pDescriptor) => Boolean(pDescriptor.PictForm && pDescriptor.PictForm.Group)),
			};
			const tmpMissing = libMetacontroller.InjectionTranslation.ManifestConstructs.filter((pConstruct) => !tmpExercised[pConstruct]);
			Expect(tmpMissing, 'Manifest constructs the injector translates with no fixture coverage').to.deep.equal([]);
		});

		test('every solver directive is used by the fixture manifest', () =>
		{
			const tmpSolverText = solverExpressions(_Fixture.InjectableManifest).join('\n');
			const tmpMissing = libMetacontroller.InjectionTranslation.SolverDirectiveCodes
				.filter((pCode) => !(pCode in _Cases.EXCLUDED_SOLVER_DIRECTIVES))
				.filter((pCode) => !tmpSolverText.includes(pCode));
			Expect(tmpMissing, `Add a fixture solver using each directive, or explain the exclusion in ${_CasesFile}: ${tmpMissing.join(', ')}`).to.deep.equal([]);
		});

		test('every reference shape a solver can name something of its own in appears in the fixture manifest', () =>
		{
			const tmpSolverText = solverExpressions(_Fixture.InjectableManifest).join('\n');
			const tmpMissing = Object.entries(_Cases.REFERENCE_SHAPES).filter(([ , pPattern ]) => !pPattern.test(tmpSolverText)).map(([ pShape ]) => pShape);
			Expect(tmpMissing, `Reference shapes with no fixture coverage; add a solver using them in ${_ManifestFile}`).to.deep.equal([]);
		});
	});

	suite('a salted copy refers to nothing of its own by its unsalted name', () =>
	{
		test('no section, group or input of an injected copy holds an untranslated reference', () =>
		{
			const tmpMetacontroller = buildMetacontroller(_Cases.MARSHAL_DESTINATION);
			const tmpNames = localNames(_Fixture.InjectableManifest);
			for (const tmpSalt of _Cases.SALTS)
			{
				const tmpSalted = tmpMetacontroller.createDistinctManifest(_Fixture.InjectableManifest, tmpSalt);
				const tmpFindings = findUntranslatedReferences(tmpMetacontroller, { Sections: tmpSalted.Sections, Descriptors: tmpSalted.Descriptors }, tmpNames, tmpSalt);
				Expect(tmpFindings, `Untranslated references in the [${tmpSalt}] copy. Either translate the construct in createDistinctManifest, or -- if the property cannot name anything of the manifest -- add it to LABEL_PROPERTIES in ${_CasesFile}.`).to.deep.equal([]);
			}
		});

		test('a record set column keeps its own name, but its trigger group is translated', () =>
		{
			const tmpMetacontroller = buildMetacontroller(_Cases.MARSHAL_DESTINATION);
			const tmpSalted = tmpMetacontroller.createDistinctManifest(_Fixture.InjectableManifest, 'alpha');
			const tmpColumn = tmpSalted.ReferenceManifests.CrateRow.Descriptors.Tally;
			Expect(tmpColumn.Hash, 'a record set column is relative to a record, so its hash is untouched').to.equal('Tally');
			Expect(tmpColumn.PictForm.TabularTriggerGroup[0].PostSolvers[0], 'a column trigger group solver runs against the section view').to.contain('alpha.Rows[].Tally');
			Expect(tmpColumn.PictForm.TabularTriggerGroup[0].TriggerGroupHash, 'a column trigger group is salted with the rest of the copy').to.equal('CrateRowTally_alpha');
		});

		test('a Facet column\'s join list is shared application state, so injection leaves its rule alone', () =>
		{
			const tmpMetacontroller = buildMetacontroller(_Cases.MARSHAL_DESTINATION);
			const tmpSalted = tmpMetacontroller.createDistinctManifest(_Fixture.InjectableManifest, 'alpha');
			const tmpColumn = tmpSalted.ReferenceManifests.CrateRow.Descriptors.Bin;
			Expect(tmpColumn.Hash).to.equal('Bin');
			Expect(tmpColumn.PictForm.Providers).to.deep.equal([ 'Pict-Input-FacetFilter' ]);
			Expect(tmpColumn.PictForm.ListFilterRules[0].JoinListAddress, 'the join list is global, not part of the copy').to.equal('AppData.BinCatalog');
			Expect(tmpColumn.PictForm.ListFilterRules[0].JoinListValueAddress, 'addresses inside join records are untouched').to.equal('Bin');
		});

		test('every input of the fixture is reachable by its salted hash', () =>
		{
			const tmpMetacontroller = buildMetacontroller(_Cases.MARSHAL_DESTINATION);
			const tmpSalted = tmpMetacontroller.createDistinctManifest(_Fixture.InjectableManifest, 'alpha');
			const tmpHashes = new Set(Object.values(tmpSalted.Descriptors).map((pDescriptor) => pDescriptor.Hash));
			for (const tmpReferenceManifest of Object.values(tmpSalted.ReferenceManifests || {}))
			{
				for (const [ tmpKey, tmpDescriptor ] of Object.entries(tmpReferenceManifest.Descriptors || {}))
				{
					tmpHashes.add(tmpDescriptor.Hash || tmpKey);
				}
			}
			const tmpMissing = _Cases.INPUT_CASES.filter((pCase) => !tmpHashes.has(`${pCase.Hash}_alpha`) && !tmpHashes.has(pCase.Hash)).map((pCase) => pCase.Hash);
			Expect(tmpMissing, 'Fixture inputs missing from the salted copy').to.deep.equal([]);
		});

		test('two copies of the manifest share no address, hash or record set', () =>
		{
			const tmpMetacontroller = buildMetacontroller(_Cases.MARSHAL_DESTINATION);
			const tmpFirst = tmpMetacontroller.createDistinctManifest(_Fixture.InjectableManifest, _Cases.SALTS[0]);
			const tmpSecond = tmpMetacontroller.createDistinctManifest(_Fixture.InjectableManifest, _Cases.SALTS[1]);
			const tmpFirstAddresses = new Set(Object.keys(tmpFirst.Descriptors));
			Expect(Object.keys(tmpSecond.Descriptors).filter((pAddress) => tmpFirstAddresses.has(pAddress))).to.deep.equal([]);
			const tmpFirstRecordSets = new Set(tmpFirst.Sections.reduce((pSet, pSection) => pSet.concat((pSection.Groups || []).map((pGroup) => pGroup.RecordSetAddress)), []).filter(Boolean));
			const tmpSecondRecordSets = tmpSecond.Sections.reduce((pSet, pSection) => pSet.concat((pSection.Groups || []).map((pGroup) => pGroup.RecordSetAddress)), []).filter(Boolean);
			Expect(tmpSecondRecordSets.filter((pAddress) => tmpFirstRecordSets.has(pAddress))).to.deep.equal([]);
		});
	});

	suite('data round trip through two injected copies', () =>
	{
		let _BootedPict = null;

		/**
		 * @param {string} pInputHash
		 * @return {{ View: any, Input: any }|null}
		 */
		function findInput(pInputHash)
		{
			for (const tmpViewHash of Object.keys(_BootedPict.views))
			{
				const tmpView = _BootedPict.views[tmpViewHash];
				if (!tmpView || !tmpView.isPictSectionForm)
				{
					continue;
				}
				const tmpInput = tmpView.getInputFromHash(pInputHash);
				if (tmpInput)
				{
					return { View: tmpView, Input: tmpInput };
				}
			}
			return null;
		}

		/**
		 * @param {string} pAddress - relative to the marshal destination
		 * @return {any}
		 */
		function getValue(pAddress)
		{
			return _BootedPict.manifest.getValueAtAddress(_BootedPict.providers.DataBroker.marshalDestinationObject, pAddress);
		}

		suiteSetup((fDone) =>
		{
			document.body.innerHTML = '<div id="Pict-Form-Container"></div>';

			class InjectionConformanceApplication extends libPictSectionForm.PictFormApplication
			{
				constructor(pFable, pOptions, pServiceHash)
				{
					super(pFable, pOptions, pServiceHash);
					this.pict.providers.DataBroker.marshalDestination = _Cases.MARSHAL_DESTINATION;
				}

				set testDone(fTestDone)
				{
					this._testDone = fTestDone;
				}

				onAfterInitialize()
				{
					this._testDone();
					return true;
				}
			}
			InjectionConformanceApplication.default_configuration = JSON.parse(JSON.stringify(libPictSectionForm.PictFormApplication.default_configuration));
			InjectionConformanceApplication.default_configuration.pict_configuration =
			{
				Product: 'InjectionConformance',
				DefaultAppData: { Orchard: JSON.parse(JSON.stringify(_Cases.ROOT_DECOYS)) },
				DefaultFormManifest: JSON.parse(JSON.stringify(_Fixture.HostManifest)),
			};

			const tmpPict = new libPict(InjectionConformanceApplication.default_configuration.pict_configuration);
			tmpPict.LogNoisiness = 0;
			tmpPict.addApplication('InjectionConformance', InjectionConformanceApplication.default_configuration, InjectionConformanceApplication);
			tmpPict.PictApplication.testDone = () =>
			{
				try
				{
					_BootedPict = tmpPict;
					const tmpMetacontroller = tmpPict.views.PictFormMetacontroller;
					const tmpMarshalDestinationObject = tmpPict.providers.DataBroker.marshalDestinationObject;
					for (const tmpSalt of _Cases.SALTS)
					{
						const tmpCopy = _Cases.COPIES[tmpSalt];
						tmpMarshalDestinationObject[tmpSalt] = Object.assign(JSON.parse(JSON.stringify(tmpCopy.Seeded)), JSON.parse(JSON.stringify(tmpCopy.Entered)));
						for (const tmpCase of _Cases.INPUT_CASES)
						{
							if ((tmpCase.Tier === 'data') && (tmpCase.Value !== undefined))
							{
								tmpMarshalDestinationObject[tmpSalt][tmpCase.Hash] = tmpCase.Value;
							}
						}
						const tmpSalted = tmpMetacontroller.createDistinctManifest(_Fixture.InjectableManifest, tmpSalt);
						const tmpViews = tmpMetacontroller.injectManifest(tmpSalted);
						for (const tmpView of tmpViews)
						{
							tmpView.render();
							tmpView.marshalToView();
						}
					}
					tmpPict.providers.DynamicSolver.solveViews();
					tmpPict.providers.DynamicSolver.solveViews();
					tmpMetacontroller.marshalToView();
					return fDone();
				}
				catch (pError)
				{
					return fDone(pError);
				}
			};
			tmpPict.PictApplication.initializeAsync(() => { });
		});

		test('each copy solves from its own data', () =>
		{
			for (const tmpSalt of _Cases.SALTS)
			{
				for (const [ tmpKey, tmpExpected ] of Object.entries(_Cases.COPIES[tmpSalt].Expected))
				{
					const tmpActual = getValue(`${tmpSalt}.${tmpKey}`);
					if (Array.isArray(tmpExpected))
					{
						Expect((tmpActual || []).map((pValue) => Number(pValue)), `${tmpSalt}.${tmpKey}`).to.deep.equal(tmpExpected.map((pValue) => Number(pValue)));
					}
					else if (typeof(tmpExpected) === 'number')
					{
						Expect(Number(tmpActual), `${tmpSalt}.${tmpKey}`).to.equal(tmpExpected);
					}
					else
					{
						Expect(tmpActual, `${tmpSalt}.${tmpKey}`).to.equal(tmpExpected);
					}
				}
			}
		});

		test('a record set solver uses its own row rather than a same-named input', () =>
		{
			for (const tmpSalt of _Cases.SALTS)
			{
				const tmpLines = (getValue(`${tmpSalt}.Rows`) || []).map((pRow) => Number(pRow.Line));
				Expect(tmpLines, `${tmpSalt} record set lines`).to.deep.equal(_Cases.COPIES[tmpSalt].Lines);
			}
		});

		test('each copy runs its own validation solvers against its own data', () =>
		{
			for (const tmpSalt of _Cases.SALTS)
			{
				const tmpExpected = Number(getValue(`${tmpSalt}.Area`)) + Number(getValue(`${tmpSalt}.Count`));
				Expect(Number(getValue(`${tmpSalt}.CheckedTotal`)), `${tmpSalt}.CheckedTotal`).to.equal(tmpExpected);
			}
			Expect(getValue('CheckedTotal'), 'unsalted CheckedTotal').to.equal(undefined);
		});

		test('the form holds each copy\'s validation solvers once', () =>
		{
			const tmpExpressions = (_BootedPict.views.PictFormMetacontroller.manifestDescription.ValidationSolvers || [])
				.map((pSolver) => (typeof(pSolver) === 'string') ? pSolver : pSolver.Expression);
			for (const tmpSalt of _Cases.SALTS)
			{
				const tmpOwnExpressions = tmpExpressions.filter((pExpression) => new RegExp(`\\bCheckedTotal_${tmpSalt}\\b`).test(pExpression));
				Expect(tmpOwnExpressions, `${tmpSalt} validation solvers`).to.have.length(1);
			}
		});

		test('the unsalted root keeps the values the host put there', () =>
		{
			for (const [ tmpKey, tmpValue ] of Object.entries(_Cases.ROOT_DECOYS))
			{
				Expect(JSON.stringify(getValue(tmpKey)), `unsalted root ${tmpKey}`).to.equal(JSON.stringify(tmpValue));
			}
		});

		test('an injected copy writes nothing of its own to the unsalted root', () =>
		{
			const tmpUndeclaredTargets = solverExpressions(_Fixture.InjectableManifest)
				.map((pExpression) => /^\s*([A-Za-z0-9_$.[\]]+)\s*\??=/.exec(pExpression))
				.filter(Boolean)
				.map((pMatch) => pMatch[1].split(/[.[]/)[0])
				.filter((pName) => !localNames(_Fixture.InjectableManifest).includes(pName));
			const tmpRootKeys = Object.keys(_BootedPict.providers.DataBroker.marshalDestinationObject)
				.filter((pKey) => !_Cases.SALTS.includes(pKey))
				.filter((pKey) => !(pKey in _Cases.ROOT_DECOYS))
				.filter((pKey) => !(pKey in _Cases.KNOWN_ROOT_KEYS))
				.filter((pKey) => !tmpUndeclaredTargets.includes(pKey));
			Expect(tmpRootKeys, `Keys an injected copy left at the unsalted root, beyond the known ones (${_Cases.KNOWN_OPEN.UndeclaredSolverTargets})`).to.deep.equal([]);
		});

		test('every data tier input holds the data of its own copy', () =>
		{
			const tmpFindings = [];
			for (const tmpCase of _Cases.INPUT_CASES)
			{
				if ((tmpCase.Tier !== 'data') || !tmpCase.Marshals)
				{
					continue;
				}
				for (const tmpSalt of _Cases.SALTS)
				{
					if (!findInput(`${tmpCase.Hash}_${tmpSalt}`))
					{
						tmpFindings.push(`${tmpCase.Registry}: no input for ${tmpCase.Hash}_${tmpSalt}`);
						continue;
					}
					const tmpValue = getValue(`${tmpSalt}.${tmpCase.Hash}`);
					if (String(tmpValue) !== String(tmpCase.Value))
					{
						tmpFindings.push(`${tmpCase.Registry}: ${tmpSalt}.${tmpCase.Hash} holds ${JSON.stringify(tmpValue)}, expected ${JSON.stringify(tmpCase.Value)}`);
					}
				}
			}
			Expect(tmpFindings).to.deep.equal([]);
		});

		test('writing through the view lands in its own copy and leaves the sibling copy alone', () =>
		{
			const tmpFindings = [];
			const [ tmpSalt, tmpSiblingSalt ] = _Cases.SALTS;
			for (const tmpCase of _Cases.INPUT_CASES)
			{
				if ((tmpCase.Tier !== 'data') || !tmpCase.Accepts)
				{
					continue;
				}
				const tmpFound = findInput(`${tmpCase.Hash}_${tmpSalt}`);
				if (!tmpFound)
				{
					tmpFindings.push(`${tmpCase.Registry}: no input for ${tmpCase.Hash}_${tmpSalt}`);
					continue;
				}
				const tmpSiblingBefore = getValue(`${tmpSiblingSalt}.${tmpCase.Hash}`);
				const tmpWrittenValue = (typeof(tmpCase.Value) === 'number') ? (tmpCase.Value + 1) : `${tmpCase.Value}-written`;
				tmpFound.View.setDataByInput(tmpFound.Input, tmpWrittenValue);
				if (String(getValue(`${tmpSalt}.${tmpCase.Hash}`)) !== String(tmpWrittenValue))
				{
					tmpFindings.push(`${tmpCase.Registry}: the write did not reach ${tmpSalt}.${tmpCase.Hash} (${JSON.stringify(getValue(`${tmpSalt}.${tmpCase.Hash}`))})`);
				}
				if (String(getValue(`${tmpSiblingSalt}.${tmpCase.Hash}`)) !== String(tmpSiblingBefore))
				{
					tmpFindings.push(`${tmpCase.Registry}: writing to ${tmpSalt} changed ${tmpSiblingSalt}.${tmpCase.Hash}`);
				}
			}
			Expect(tmpFindings).to.deep.equal([]);
		});

		test('a copy re-rendered from its saved data keeps that data', () =>
		{
			const tmpFindings = [];
			const tmpSalt = _Cases.SALTS[0];
			const tmpBefore = JSON.stringify(_BootedPict.providers.DataBroker.marshalDestinationObject[tmpSalt]);
			for (const tmpViewHash of Object.keys(_BootedPict.views))
			{
				const tmpView = _BootedPict.views[tmpViewHash];
				if (tmpView && tmpView.isPictSectionForm && tmpViewHash.endsWith(`_${tmpSalt}`))
				{
					tmpView.render();
					tmpView.marshalToView();
				}
			}
			const tmpAfter = JSON.stringify(_BootedPict.providers.DataBroker.marshalDestinationObject[tmpSalt]);
			if (tmpBefore !== tmpAfter)
			{
				tmpFindings.push('a re-render changed the data of the copy');
			}
			for (const tmpCase of _Cases.INPUT_CASES)
			{
				if ((tmpCase.Tier !== 'data') || !tmpCase.Marshals)
				{
					continue;
				}
				const tmpValue = getValue(`${tmpSalt}.${tmpCase.Hash}`);
				if ((tmpValue === undefined) || (tmpValue === null))
				{
					tmpFindings.push(`${tmpCase.Registry}: ${tmpSalt}.${tmpCase.Hash} was lost by a re-render`);
				}
			}
			Expect(tmpFindings).to.deep.equal([]);
		});
	});
});
