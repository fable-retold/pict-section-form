/*
	Unit tests for PictFormMetacontroller.createDistinctManifest / rewriteSolverExpression.

	Injecting the same manifest more than once salts its hashes and nests its addresses, so every reference
	the manifest makes to itself has to be translated too -- and every reference it makes to something
	outside itself has to be left alone. Exercised against a stub `this` so no form has to be mounted.

	Expressions are compared as token lists so the tests do not depend on recomposition spacing.
*/

// This is temporary, but enables unit tests
const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');

const libMetacontroller = require('../source/views/Pict-View-Form-Metacontroller.js');
const libDynamicFormSolverBehaviors = require('../source/providers/Pict-Provider-DynamicFormSolverBehaviors.js');

const _EdgeCaseManifests = require('./fixtures/injection/Injection-Fixture-Manifest.json');

const SALT = 's';
const MARSHAL_DESTINATION = 'AppData.Orchard';

/**
 * A metacontroller with just enough wiring for manifest salting.
 *
 * @param {string} [pMarshalDestination]
 * @return {any}
 */
function buildMetacontroller(pMarshalDestination)
{
	const tmpPict = new libPict({ Product: 'DistinctManifestTests', LogStreams: [ { streamtype: 'console', level: 'fatal' } ] });
	tmpPict.addProvider('DynamicFormSolverBehaviors', {}, libDynamicFormSolverBehaviors);
	const tmpExpressionParser = tmpPict.instantiateServiceProviderIfNotExists('ExpressionParser');
	tmpPict.providers.DynamicFormSolverBehaviors.injectBehaviors(tmpExpressionParser);
	tmpPict.providers.DataBroker.marshalDestination = pMarshalDestination || 'AppData';

	const tmpMetacontroller = Object.create(libMetacontroller.prototype);
	tmpMetacontroller.pict = tmpPict;
	tmpMetacontroller.fable = tmpPict;
	tmpMetacontroller.log = tmpPict.log;
	tmpMetacontroller.options = {};
	return tmpMetacontroller;
}

/**
 * @param {any} pMetacontroller
 * @param {string} pExpression
 * @return {Array<string>}
 */
function tokensOf(pMetacontroller, pExpression)
{
	const tmpResult = {};
	pMetacontroller.pict.instantiateServiceProviderIfNotExists('ExpressionParser').tokenize(pExpression, tmpResult);
	return Array.from(tmpResult.OriginalRawTokens);
}

suite('PictFormMetacontroller distinct manifests', () =>
{
	suite('rewriteSolverExpression', () =>
	{
		const _HashTranslation = { Width: `Width_${SALT}`, Depth: `Depth_${SALT}` };
		const _AddressTranslation = { Width: `${SALT}.Width`, Height: `${SALT}.Height`, Rows: `${SALT}.Rows`, QtyList: `${SALT}.QtyList`, RowCount: `${SALT}.RowCount`, Crate: `${SALT}.Crate`, Measure: `Measure_${SALT}`, Slopes: `${SALT}.Slopes` };
		const _PrefixTranslation = { Width: `${SALT}.Width`, Height: `${SALT}.Height`, Rows: `${SALT}.Rows`, QtyList: `${SALT}.QtyList`, RowCount: `${SALT}.RowCount`, Crate: `${SALT}.Crate`, Slopes: `${SALT}.Slopes` };

		/**
		 * @param {any} pMetacontroller
		 * @param {string} pExpression
		 * @param {Record<string, any>} [pOptions]
		 * @return {string}
		 */
		function rewrite(pMetacontroller, pExpression, pOptions)
		{
			return pMetacontroller.rewriteSolverExpression(pExpression, _HashTranslation, _AddressTranslation, Object.assign({ PrefixAddressTranslation: _PrefixTranslation }, pOptions));
		}

		/**
		 * @param {any} pMetacontroller
		 * @param {string} pExpression
		 * @param {string} pExpected
		 * @param {Record<string, any>} [pOptions]
		 */
		function expectRewrite(pMetacontroller, pExpression, pExpected, pOptions)
		{
			Expect(tokensOf(pMetacontroller, rewrite(pMetacontroller, pExpression, pOptions))).to.deep.equal(tokensOf(pMetacontroller, pExpected), pExpression);
		}

		test('translates exact symbol and state address references (unchanged behavior)', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			expectRewrite(tmpMetacontroller, 'Area = Width * Height', `Area = Width_${SALT} * ${SALT}.Height`);
			expectRewrite(tmpMetacontroller, 'Area = {Width} + 1', `Area = {${SALT}.Width} + 1`);
		});

		test('translates a reference that only starts with a local address', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			expectRewrite(tmpMetacontroller, 'A = Rows.length', `A = ${SALT}.Rows.length`);
			expectRewrite(tmpMetacontroller, 'A = Rows[0].Line', `A = ${SALT}.Rows[0].Line`);
			expectRewrite(tmpMetacontroller, 'A = SUM(Rows[].Line)', `A = SUM(${SALT}.Rows[].Line)`);
			expectRewrite(tmpMetacontroller, 'A = {Rows[1].Line}', `A = {${SALT}.Rows[1].Line}`);
			expectRewrite(tmpMetacontroller, 'A = Crate.Items.length', `A = ${SALT}.Crate.Items.length`);
		});

		test('leaves a longer name that merely starts with a local name alone', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			expectRewrite(tmpMetacontroller, 'A = WidthMaximum + HeightMax', 'A = WidthMaximum + HeightMax');
			expectRewrite(tmpMetacontroller, 'A = RowsTotal.length', 'A = RowsTotal.length');
		});

		test('translates marshal-destination-prefixed addresses, including partial references', () =>
		{
			const tmpMetacontroller = buildMetacontroller(MARSHAL_DESTINATION);
			expectRewrite(tmpMetacontroller, 'A = GETVALUE("AppData.Orchard.Width")', `A = GETVALUE("AppData.Orchard.${SALT}.Width")`);
			expectRewrite(tmpMetacontroller, 'A = GETVALUE("AppData.Orchard.Rows[1].Qty")', `A = GETVALUE("AppData.Orchard.${SALT}.Rows[1].Qty")`);
			expectRewrite(tmpMetacontroller, 'A = {AppData.Orchard.Height}', `A = {AppData.Orchard.${SALT}.Height}`);
		});

		test('translates string parameters that name a section or an input', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			expectRewrite(tmpMetacontroller, 'SetSectionVisibility("Measure", 1)', `SetSectionVisibility("Measure_${SALT}", 1)`);
		});

		test('leaves string literals that are not address parameters alone', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			expectRewrite(tmpMetacontroller, 'L = IF(Width, ">", 3.5, "Width", "Narrow")', `L = IF(Width_${SALT}, ">", 3.5, "Width", "Narrow")`);
		});

		test('leaves references that are not local to the manifest alone', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			expectRewrite(tmpMetacontroller, 'A = Width * HostRate', `A = Width_${SALT} * HostRate`);
			expectRewrite(tmpMetacontroller, 'SetSectionVisibility("Overview", 1)', 'SetSectionVisibility("Overview", 1)');
		});

		test('leaves MAP iteration variables alone and translates what they iterate over', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			expectRewrite(tmpMetacontroller, 'D = MAP VAR Qty FROM QtyList : Qty * 2', `D = MAP VAR Qty FROM ${SALT}.QtyList : Qty * 2`);
			expectRewrite(tmpMetacontroller, 'S = MAP VAR r FROM Rows : r.Qty * Width', `S = MAP VAR r FROM ${SALT}.Rows : r.Qty * Width_${SALT}`);
		});

		test('leaves a MAP iteration variable alone even when a local address shares its name', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			expectRewrite(tmpMetacontroller, 'D = MAP VAR Width FROM QtyList : Width * 2', `D = MAP VAR Width FROM ${SALT}.QtyList : Width * 2`);
		});

		test('leaves the MAP prev_ variable alone', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			expectRewrite(tmpMetacontroller, 'P = MAP VAR Slopes FROM Slopes : Slopes - prev_Slopes', `P = MAP VAR Slopes FROM ${SALT}.Slopes : Slopes - prev_Slopes`);
		});

		test('leaves SERIES loop variables alone and translates the range', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			expectRewrite(tmpMetacontroller, 'T = SERIES FROM 1 TO RowCount : n * Width', `T = SERIES FROM 1 TO ${SALT}.RowCount : n * Width_${SALT}`);
		});

		test('translates the MULTIROWMAP row set but not the per-row property it reads', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			expectRewrite(tmpMetacontroller, 'M = MULTIROWMAP ROWS FROM Rows VAR Width FROM Width OFFSET 1 : Width * 2', `M = MULTIROWMAP ROWS FROM ${SALT}.Rows VAR Width FROM Width OFFSET 1 : Width * 2`);
		});

		test('a record set solver reads its row, so only absolute references are translated', () =>
		{
			const tmpMetacontroller = buildMetacontroller(MARSHAL_DESTINATION);
			expectRewrite(tmpMetacontroller, 'Line = Width * Height', 'Line = Width * Height', { RowRelative: true });
			expectRewrite(tmpMetacontroller, 'Line = GETVALUE("AppData.Orchard.Width")', `Line = GETVALUE("AppData.Orchard.${SALT}.Width")`, { RowRelative: true });
		});

		test('returns the original expression when nothing is translated', () =>
		{
			const tmpMetacontroller = buildMetacontroller();
			Expect(rewrite(tmpMetacontroller, 'A = B + C')).to.equal('A = B + C');
			Expect(rewrite(tmpMetacontroller, '')).to.equal('');
		});
	});

	suite('createDistinctManifest', () =>
	{
		/**
		 * @return {{ Metacontroller: any, Manifest: Record<string, any>, Salted: Record<string, any> }}
		 */
		function saltEdgeCaseManifest()
		{
			const tmpMetacontroller = buildMetacontroller(MARSHAL_DESTINATION);
			const tmpManifest = JSON.parse(JSON.stringify(_EdgeCaseManifests.InjectableManifest));
			const tmpSalted = tmpMetacontroller.createDistinctManifest(tmpManifest, SALT);
			return { Metacontroller: tmpMetacontroller, Manifest: tmpManifest, Salted: tmpSalted };
		}

		/**
		 * @param {Record<string, any>} pSalted
		 * @param {string} pOriginalHash
		 * @return {Record<string, any>}
		 */
		function descriptorByOriginalHash(pSalted, pOriginalHash)
		{
			return Object.values(pSalted.Descriptors).find((pDescriptor) => pDescriptor.OriginalHash === pOriginalHash);
		}

		/**
		 * @param {Record<string, any>} pSalted
		 * @param {string} pSectionHash
		 * @return {Record<string, any>}
		 */
		function sectionByOriginalHash(pSalted, pSectionHash)
		{
			return pSalted.Sections.find((pSection) => pSection.OriginalHash === pSectionHash);
		}

		test('salts section, group and input hashes and nests data addresses (unchanged behavior)', () =>
		{
			const { Salted } = saltEdgeCaseManifest();
			Expect(sectionByOriginalHash(Salted, 'Measure').Hash).to.equal(`Measure_${SALT}`);
			Expect(sectionByOriginalHash(Salted, 'Measure').Groups[0].Hash).to.equal(`MeasureGroup_${SALT}`);
			Expect(Salted.Descriptors[`${SALT}.Width`]).to.be.an('object');
			Expect(Salted.Descriptors[`${SALT}.Width`].Hash).to.equal(`Width_${SALT}`);
			Expect(Salted.Descriptors[`${SALT}.Width`].PictForm.Section).to.equal(`Measure_${SALT}`);
			Expect(sectionByOriginalHash(Salted, 'Measure').Groups[1].RecordSetAddress).to.equal(`${SALT}.Rows`);
		});

		test('does not modify the manifest it was given', () =>
		{
			const { Manifest } = saltEdgeCaseManifest();
			Expect(Manifest).to.deep.equal(_EdgeCaseManifests.InjectableManifest);
		});

		test('translates tab section sets and their default tab', () =>
		{
			const { Salted } = saltEdgeCaseManifest();
			const tmpTabPicker = descriptorByOriginalHash(Salted, 'TabPicker');
			Expect(tmpTabPicker.PictForm.TabSectionSet).to.deep.equal([ `TabOne_${SALT}`, `TabTwo_${SALT}` ]);
			Expect(tmpTabPicker.PictForm.DefaultTabSectionHash).to.equal(`TabTwo_${SALT}`);
			Expect(tmpTabPicker.PictForm.TabSectionNames).to.deep.equal([ 'One', 'Two' ]);
		});

		test('translates tab group sets and their default tab', () =>
		{
			const { Salted } = saltEdgeCaseManifest();
			const tmpGroupPicker = descriptorByOriginalHash(Salted, 'GroupPicker');
			Expect(tmpGroupPicker.PictForm.TabGroupSet).to.deep.equal([ `GroupA_${SALT}`, `GroupB_${SALT}` ]);
			Expect(tmpGroupPicker.PictForm.DefaultTabGroupHash).to.equal(`GroupB_${SALT}`);
		});

		test('leaves a tab that names a section outside the manifest alone', () =>
		{
			const tmpMetacontroller = buildMetacontroller(MARSHAL_DESTINATION);
			const tmpManifest = JSON.parse(JSON.stringify(_EdgeCaseManifests.InjectableManifest));
			tmpManifest.Descriptors.TabPicker.PictForm.TabSectionSet = [ 'TabOne', 'Overview' ];
			const tmpSalted = tmpMetacontroller.createDistinctManifest(tmpManifest, SALT);
			Expect(descriptorByOriginalHash(tmpSalted, 'TabPicker').PictForm.TabSectionSet).to.deep.equal([ `TabOne_${SALT}`, 'Overview' ]);
		});

		test('translates chart label and dataset solvers', () =>
		{
			const { Metacontroller, Salted } = saltEdgeCaseManifest();
			const tmpChart = descriptorByOriginalHash(Salted, 'LineChart');
			Expect(tokensOf(Metacontroller, tmpChart.PictForm.ChartLabelsSolver)).to.deep.equal(tokensOf(Metacontroller, `flatten(${SALT}.Rows[].Qty)`));
			Expect(tokensOf(Metacontroller, tmpChart.PictForm.ChartDatasetsSolvers[0].DataSolver)).to.deep.equal(tokensOf(Metacontroller, `flatten(${SALT}.Rows[].Line)`));
			Expect(tokensOf(Metacontroller, tmpChart.PictForm.ChartDatasetsSolvers[1].DataSolver)).to.deep.equal(tokensOf(Metacontroller, `flatten(Scaled_${SALT})`));
			Expect(tmpChart.PictForm.ChartDatasetsSolvers[1].Label).to.equal('Scaled');
		});

		test('translates trigger group solvers, trigger addresses and marshal targets', () =>
		{
			const { Metacontroller, Salted } = saltEdgeCaseManifest();
			const tmpSource = descriptorByOriginalHash(Salted, 'Source');
			const tmpTriggerGroup = tmpSource.PictForm.AutofillTriggerGroup[0];
			Expect(tokensOf(Metacontroller, tmpTriggerGroup.PostSolvers[0])).to.deep.equal(tokensOf(Metacontroller, `Echo_${SALT} = Source_${SALT} * 10`));
			Expect(tmpTriggerGroup.MarshalOnComplete.Section).to.equal(`Composed_${SALT}`);
			Expect(tmpTriggerGroup.MarshalOnComplete.Input).to.equal(`Echo_${SALT}`);
			Expect(tmpTriggerGroup.TriggerGroupHash).to.equal(`CrateEcho_${SALT}`);
			const tmpMirror = descriptorByOriginalHash(Salted, 'Mirror');
			Expect(tmpMirror.PictForm.AutofillTriggerGroup[0].TriggerAddress).to.equal(`AppData.Orchard.${SALT}.Source`);
		});

		test('translates local addresses inside templated input templates', () =>
		{
			const { Salted } = saltEdgeCaseManifest();
			const tmpSummary = descriptorByOriginalHash(Salted, 'Summary');
			Expect(tmpSummary.PictForm.Template).to.contain(`{~D:Record.Data.${SALT}.Width~}`);
			Expect(tmpSummary.PictForm.Template).to.contain(`{~D:AppData.Orchard.${SALT}.Height~}`);
		});

		test('leaves record set solvers relative to their row', () =>
		{
			const { Salted } = saltEdgeCaseManifest();
			const tmpGroup = sectionByOriginalHash(Salted, 'Measure').Groups[1];
			Expect(tmpGroup.RecordSetSolvers[0]).to.equal('Line = Qty * Price');
		});

		test('translates section solvers in both string and object form, keeping ordinals', () =>
		{
			const { Metacontroller, Salted } = saltEdgeCaseManifest();
			const tmpSolvers = sectionByOriginalHash(Salted, 'Measure').Solvers;
			Expect(typeof tmpSolvers[0]).to.equal('string');
			Expect(tokensOf(Metacontroller, tmpSolvers[0])).to.deep.equal(tokensOf(Metacontroller, `Area_${SALT} = Width_${SALT} * Height_${SALT}`));
			Expect(tmpSolvers[1].Ordinal).to.equal(3);
			Expect(tokensOf(Metacontroller, tmpSolvers[1].Expression)).to.deep.equal(tokensOf(Metacontroller, `AreaScaled_${SALT} = Area_${SALT} * HostRate`));
		});

		test('salts every trigger group hash the manifest declares, in each carrier', () =>
		{
			const { Salted } = saltEdgeCaseManifest();
			Expect(descriptorByOriginalHash(Salted, 'Source').PictForm.AutofillTriggerGroup[0].TriggerGroupHash).to.equal(`CrateEcho_${SALT}`);
			Expect(descriptorByOriginalHash(Salted, 'Mirror').PictForm.AutofillTriggerGroup[0].TriggerGroupHash).to.equal(`CrateEcho_${SALT}`);
			Expect(descriptorByOriginalHash(Salted, 'Lookup').PictForm.TemplatedEntityLookup.TriggerGroupHash).to.equal(`CrateEcho_${SALT}`);
			Expect(descriptorByOriginalHash(Salted, 'Bundled').PictForm.EntityBundleTriggerGroup).to.equal(`CrateEcho_${SALT}`);
			Expect(Salted.ReferenceManifests.CrateRow.Descriptors.Tally.PictForm.TabularTriggerGroup[0].TriggerGroupHash).to.equal(`CrateRowTally_${SALT}`);
		});

		test('leaves a trigger group the manifest declares shared alone, salting the rest', () =>
		{
			const tmpMetacontroller = buildMetacontroller(MARSHAL_DESTINATION);
			const tmpManifest = JSON.parse(JSON.stringify(_EdgeCaseManifests.InjectableManifest));
			tmpManifest.SharedTriggerGroups = [ 'CrateEcho' ];
			const tmpSalted = tmpMetacontroller.createDistinctManifest(tmpManifest, SALT);
			Expect(descriptorByOriginalHash(tmpSalted, 'Source').PictForm.AutofillTriggerGroup[0].TriggerGroupHash).to.equal('CrateEcho');
			Expect(descriptorByOriginalHash(tmpSalted, 'Bundled').PictForm.EntityBundleTriggerGroup).to.equal('CrateEcho');
			Expect(tmpSalted.ReferenceManifests.CrateRow.Descriptors.Tally.PictForm.TabularTriggerGroup[0].TriggerGroupHash).to.equal(`CrateRowTally_${SALT}`);
		});

		test('two salts of the same manifest share no addresses or hashes', () =>
		{
			const tmpMetacontroller = buildMetacontroller(MARSHAL_DESTINATION);
			const tmpFirst = tmpMetacontroller.createDistinctManifest(_EdgeCaseManifests.InjectableManifest, 'alpha');
			const tmpSecond = tmpMetacontroller.createDistinctManifest(_EdgeCaseManifests.InjectableManifest, 'alphabeta');
			const tmpFirstAddresses = new Set(Object.keys(tmpFirst.Descriptors));
			const tmpShared = Object.keys(tmpSecond.Descriptors).filter((pAddress) => tmpFirstAddresses.has(pAddress));
			Expect(tmpShared).to.deep.equal([]);
			const tmpFirstHashes = new Set(Object.values(tmpFirst.Descriptors).map((pDescriptor) => pDescriptor.Hash));
			const tmpSharedHashes = Object.values(tmpSecond.Descriptors).map((pDescriptor) => pDescriptor.Hash).filter((pHash) => tmpFirstHashes.has(pHash));
			Expect(tmpSharedHashes).to.deep.equal([]);
		});
	});

	suite('buildManifestTranslations', () =>
	{
		test('translates one salted copy', () =>
		{
			const tmpMetacontroller = buildMetacontroller(MARSHAL_DESTINATION);
			const tmpSalted = tmpMetacontroller.createDistinctManifest(_EdgeCaseManifests.InjectableManifest, 'alpha');
			const { HashTranslation, AddressTranslation } = tmpMetacontroller.buildManifestTranslations(tmpSalted);
			Expect(HashTranslation.Width).to.equal('Width_alpha');
			Expect(AddressTranslation.Width).to.equal('alpha.Width');
		});

		test('warns when handed a manifest holding more than one copy, rather than collapsing silently', () =>
		{
			const tmpMetacontroller = buildMetacontroller(MARSHAL_DESTINATION);
			const tmpFirst = tmpMetacontroller.createDistinctManifest(_EdgeCaseManifests.InjectableManifest, 'alpha');
			const tmpSecond = tmpMetacontroller.createDistinctManifest(_EdgeCaseManifests.InjectableManifest, 'beta');
			const tmpMerged = { Sections: tmpFirst.Sections.concat(tmpSecond.Sections), Descriptors: Object.assign({}, tmpFirst.Descriptors, tmpSecond.Descriptors) };
			const tmpWarnings = [];
			tmpMetacontroller.pict.log.warn = (pMessage) =>
			{
				tmpWarnings.push(pMessage);
			};
			const { HashTranslation } = tmpMetacontroller.buildManifestTranslations(tmpMerged);
			Expect(tmpWarnings.length, 'a merged manifest cannot say what a name became').to.equal(1);
			Expect(tmpWarnings[0]).to.contain('more than one injected copy');
			Expect(HashTranslation.Width).to.equal('Width_beta');
		});
	});

	suite('mergeValidationSolvers', () =>
	{
		test('appends the validation solvers of each salted copy after the form\'s own, in order', () =>
		{
			const tmpMetacontroller = buildMetacontroller(MARSHAL_DESTINATION);
			const tmpForm = { ValidationSolvers: [ 'CrateCount = 1' ] };
			const tmpFirst = tmpMetacontroller.createDistinctManifest(_EdgeCaseManifests.InjectableManifest, 'alpha');
			const tmpSecond = tmpMetacontroller.createDistinctManifest(_EdgeCaseManifests.InjectableManifest, 'alphabeta');
			Expect(tmpMetacontroller.mergeValidationSolvers(tmpForm, tmpFirst)).to.equal(1);
			Expect(tmpMetacontroller.mergeValidationSolvers(tmpForm, tmpSecond)).to.equal(1);
			Expect(tmpForm.ValidationSolvers).to.deep.equal([ 'CrateCount = 1' ].concat(tmpFirst.ValidationSolvers, tmpSecond.ValidationSolvers));
		});

		test('adding the same copy again does not add its validation solvers twice', () =>
		{
			const tmpMetacontroller = buildMetacontroller(MARSHAL_DESTINATION);
			const tmpForm = { };
			const tmpSalted = tmpMetacontroller.createDistinctManifest(_EdgeCaseManifests.InjectableManifest, SALT);
			tmpSalted.ValidationSolvers.push({ Ordinal: 2, Expression: 'Checked = 1' });
			Expect(tmpMetacontroller.mergeValidationSolvers(tmpForm, tmpSalted)).to.equal(2);
			Expect(tmpMetacontroller.mergeValidationSolvers(tmpForm, tmpSalted)).to.equal(0);
			Expect(tmpForm.ValidationSolvers).to.deep.equal(tmpSalted.ValidationSolvers);
			Expect(tmpForm.ValidationSolvers[1]).to.not.equal(tmpSalted.ValidationSolvers[1]);
		});

		test('leaves the form alone when the added manifest has no validation solvers', () =>
		{
			const tmpMetacontroller = buildMetacontroller(MARSHAL_DESTINATION);
			const tmpForm = { };
			Expect(tmpMetacontroller.mergeValidationSolvers(tmpForm, { Descriptors: { } })).to.equal(0);
			Expect(tmpForm).to.deep.equal({ });
		});
	});
});
