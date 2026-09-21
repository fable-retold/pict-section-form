const libPictProvider = require('pict-provider');

const libDynamicFormSolverBehaviors = require('./Pict-Provider-DynamicFormSolverBehaviors.js');

const libListDistilling = require('./Pict-Provider-ListDistilling.js');
const libDynamicMetaLists = require('./Pict-Provider-MetaLists.js');

const libInputSelect = require('./inputs/Pict-Provider-Input-Select.js');
const libInputDateTime = require('./inputs/Pict-Provider-Input-DateTime.js');
const libInputTabGroupSelector = require('./inputs/Pict-Provider-Input-TabGroupSelector.js');
const libInputTabSectionSelector = require('./inputs/Pict-Provider-Input-TabSectionSelector.js');
const libInputEntityBundleRequest = require('./inputs/Pict-Provider-Input-EntityBundleRequest.js');
const libInputAutofillTriggerGroup = require('./inputs/Pict-Provider-Input-AutofillTriggerGroup.js');
const libInputMarkdown = require('./inputs/Pict-Provider-Input-Markdown.js');
const libInputHTML = require('./inputs/Pict-Provider-Input-HTML.js');
const libInputTemplated = require('./inputs/Pict-Provider-Input-Templated.js');
const libInputPreciseNumber = require('./inputs/Pict-Provider-Input-PreciseNumber.js');
const libInputLink = require('./inputs/Pict-Provider-Input-Link.js');
const libInputTemplatedEntityLookup = require('./inputs/Pict-Provider-Input-TemplatedEntityLookup.js');
const libInputChart = require('./inputs/Pict-Provider-Input-Chart.js');
const libInputTabularTriggerGroup = require('./inputs/Pict-Provider-Input-TabularTriggerGroup.js');
const libInputObjectEditor = require('./inputs/Pict-Provider-Input-ObjectEditor.js');

/** @type {Record<string, any>} */
const _DefaultProviderConfiguration = (
{
	"ProviderIdentifier": "Pict-DynamicForms-Solver",

	"AutoInitialize": true,
	"AutoInitializeOrdinal": 0,

	"AutoSolveWithApp": false
});

/**
 * The PictDynamicSolver class is a provider that solves configuration-generated dynamic views.
 */
class PictDynamicSolver extends libPictProvider
{
	/**
	 * Creates an instance of the PictDynamicSolver class.
	 *
	 * @param {import('pict')} pFable - The Pict instance.
	 * @param {Record<string, any>} [pOptions] - The options for the provider.
	 * @param {string} [pServiceHash] - The service hash for the provider.
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(_DefaultProviderConfiguration)), pOptions);
		super(pFable, tmpOptions, pServiceHash);

		/** @type {import('pict') & { ExpressionParser: any }} */
		this.pict;
		/** @type {import('pict') & { instantiateServiceProviderIfNotExists: (hash: string) => any, ExpressionParser: any }} */
		this.fable;
		/** @type {any} */
		this.log;
		/** @type {string} */
		this.UUID;
		/** @type {string} */
		this.Hash;

		this._RunSolversRegex = /\brunsolvers\b/gi;

		// Initialize the solver service if it isn't up
		this.fable.instantiateServiceProviderIfNotExists('ExpressionParser');

		this.pict.addProviderSingleton('DynamicFormSolverBehaviors', libDynamicFormSolverBehaviors.default_configuration, libDynamicFormSolverBehaviors);
		this.pict.providers.DynamicFormSolverBehaviors.injectBehaviors(this.fable.ExpressionParser);
		this.pict.addProviderSingleton('DynamicMetaLists', libDynamicMetaLists.default_configuration, libDynamicMetaLists);
		this.pict.addProviderSingleton('ListDistilling', libListDistilling.default_configuration, libListDistilling);
		this.pict.addProviderSingleton('Pict-Input-Select', libInputSelect.default_configuration, libInputSelect);
		this.pict.addProviderSingleton('Pict-Input-DateTime', libInputDateTime.default_configuration, libInputDateTime);
		this.pict.addProviderSingleton('Pict-Input-TabGroupSelector', libInputTabGroupSelector.default_configuration, libInputTabGroupSelector);
		this.pict.addProviderSingleton('Pict-Input-TabSectionSelector', libInputTabSectionSelector.default_configuration, libInputTabSectionSelector);
		this.pict.addProviderSingleton('Pict-Input-EntityBundleRequest', libInputEntityBundleRequest.default_configuration, libInputEntityBundleRequest);
		this.pict.addProviderSingleton('Pict-Input-AutofillTriggerGroup', libInputAutofillTriggerGroup.default_configuration, libInputAutofillTriggerGroup);
		this.pict.addProviderSingleton('Pict-Input-Markdown', libInputMarkdown.default_configuration, libInputMarkdown);
		this.pict.addProviderSingleton('Pict-Input-HTML', libInputHTML.default_configuration, libInputHTML);
		this.pict.addProviderSingleton('Pict-Input-Templated', libInputTemplated.default_configuration, libInputTemplated);
		this.pict.addProviderSingleton('Pict-Input-PreciseNumber', libInputPreciseNumber.default_configuration, libInputPreciseNumber);
		this.pict.addProviderSingleton('Pict-Input-TemplatedEntityLookup', libInputTemplatedEntityLookup.default_configuration, libInputTemplatedEntityLookup);
		this.pict.addProviderSingleton('Pict-Input-Link', libInputLink.default_configuration, libInputLink);
		this.pict.addProviderSingleton('Pict-Input-Chart', libInputChart.default_configuration, libInputChart);
		this.pict.addProviderSingleton('Pict-Input-TabularTriggerGroup', libInputTabularTriggerGroup.default_configuration, libInputTabularTriggerGroup);
		this.pict.addProviderSingleton('Pict-Input-ObjectEditor', libInputObjectEditor.default_configuration, libInputObjectEditor);
	}

	logSolveOutcome(pSolveOutcome)
	{
		let tmpSolveOutcome = pSolveOutcome;
		if (typeof(tmpSolveOutcome) !== 'object' || tmpSolveOutcome === null)
		{
			tmpSolveOutcome = this.lastSolveOutcome;
		}
		if (typeof(tmpSolveOutcome) !== 'object' || tmpSolveOutcome === null)
		{
			this.log.error(`DynamicSolver [${this.UUID}]::[${this.Hash}] No solve outcome available to log.`);
			return;
		}

		let tmpSolversRun = tmpSolveOutcome.SolverResultsMap.ExecutedSolvers.length;

		this.log.info(`DynamicSolver completed solving ${tmpSolversRun} solvers in ${tmpSolveOutcome.EndTimeStamp - tmpSolveOutcome.StartTimeStamp} ms.`);

		for (let i = 0; i < tmpSolveOutcome.SolverResultsMap.ExecutedSolvers.length; i++)
		{
			let tmpSolver = tmpSolveOutcome.SolverResultsMap.ExecutedSolvers[i];
			this.log.info(`  Solver [${tmpSolver.Hash}] Ordinal ${tmpSolver.Ordinal} executed in ${tmpSolver.EndTimeStamp - tmpSolver.StartTimeStamp}ms solving for [${tmpSolver?.ResultsObject?.PostfixedAssignmentAddress}] expression [${tmpSolver.Expression}]`);
		}
	}

	/**
	 * Prepares the solver results map by ensuring it has the necessary structure.
	 *
	 * @param {Object} pSolverResultsMap - The solver results map to prepare.
	 * @returns {Object} - The prepared solver results map.
	*/
	prepareSolverResultsMap(pSolverResultsMap)
	{
		let tmpSolverResultsMap = pSolverResultsMap;
		if (typeof(tmpSolverResultsMap) !== 'object' || tmpSolverResultsMap === null)
		{
			tmpSolverResultsMap = {};
		}
		if (!('ExecutedSolvers' in tmpSolverResultsMap))
		{
			tmpSolverResultsMap.ExecutedSolvers = [];
		}
		if (!('SolverResolutionMap' in tmpSolverResultsMap))
		{
			tmpSolverResultsMap.SolverResolutionMap = {};
		}
		return tmpSolverResultsMap;
	}

	/**
	 * Backfills solver dependencies into the solve outcome.
	 *
	 * @param {Object} pSolveOutcome - The solve outcome object.
	 * @returns {Object} - The updated solve outcome with backfilled dependencies.
	 */
	backfillSolverDependencies(pSolveOutcome)
	{
		let tmpSolveOutcome = pSolveOutcome;

		if (typeof(tmpSolveOutcome) !== 'object' || tmpSolveOutcome === null)
		{
			tmpSolveOutcome = this.lastSolveOutcome;
		}

		if (typeof(tmpSolveOutcome) !== 'object' || tmpSolveOutcome === null)
		{
			this.log.error(`DynamicSolver [${this.UUID}]::[${this.Hash}] No solve outcome available to backfill solver dependencies.`);
			return;
		}

		for (let i = 0; i < tmpSolveOutcome.SolverResultsMap.ExecutedSolvers.length; i++)
		{
			let tmpSolver = tmpSolveOutcome.SolverResultsMap.ExecutedSolvers[i];
			if (('ResultsObject' in tmpSolver) && (typeof(tmpSolver.ResultsObject) === 'object') && (tmpSolver.ResultsObject !== null))
			{
				// Now fill any dependencies from the results object
				// If the Postfixed Assignment Address is "Result" it hasn't been set and we will ignore it.
				if (tmpSolver.ResultsObject.PostfixedAssignmentAddress && (tmpSolver.ResultsObject.PostfixedAssignmentAddress != 'Result'))
				{
					if (typeof(tmpSolveOutcome.SolverResultsMap.SolverResolutionMap[tmpSolver.ResultsObject.PostfixedAssignmentAddress]) !== 'object')
					{
						tmpSolveOutcome.SolverResultsMap.SolverResolutionMap[tmpSolver.ResultsObject.PostfixedAssignmentAddress] = {};
					}
					// Go through the postfixed list and pull out any symbols being assigned
					for (let j = 0; j < tmpSolver.ResultsObject.PostfixTokenObjects.length; j++)
					{
						let tmpTokenObject = tmpSolver.ResultsObject.PostfixTokenObjects[j];
						if (tmpTokenObject.Type == 'Token.Symbol')
						{
							if (!(tmpTokenObject.Token in tmpSolveOutcome.SolverResultsMap.SolverResolutionMap[tmpSolver.ResultsObject.PostfixedAssignmentAddress]))
							{
								tmpSolveOutcome.SolverResultsMap.SolverResolutionMap[tmpSolver.ResultsObject.PostfixedAssignmentAddress][tmpTokenObject.Token] = 0;
							}
							tmpSolveOutcome.SolverResultsMap.SolverResolutionMap[tmpSolver.ResultsObject.PostfixedAssignmentAddress][tmpTokenObject.Token] = tmpSolveOutcome.SolverResultsMap.SolverResolutionMap[tmpSolver.ResultsObject.PostfixedAssignmentAddress][tmpTokenObject.Token] + 1;
						}
					}
				}
			}
		}

		return tmpSolveOutcome;
	}

	/**
	 * Runs a manual solver expression against the dynamic view marshal destination or the application data.
	 *
	 * @param {string} pSolverExpression - The solver expression to run.
	 * @param {boolean} [pSilent=false] - Whether to suppress debug logging output.
	 * @returns {any} - The result of the solver expression.
	 */
	runSolver(pSolverExpression, pSilent = false)
	{
		let tmpViewMarshalDestinationObject = this.pict.resolveStateFromAddress(this.pict.views.PictFormMetacontroller.viewMarshalDestination);

		if ((typeof(tmpViewMarshalDestinationObject) !== 'object') || (tmpViewMarshalDestinationObject === null))
		{
			tmpViewMarshalDestinationObject = this.pict.AppData;
		}

		let tmpResultsObject = {};
		let tmpSolutionValue = this.fable.ExpressionParser.solve(pSolverExpression, tmpViewMarshalDestinationObject, tmpResultsObject, this.pict.manifest);

		if (tmpResultsObject.fable)
		{
			delete tmpResultsObject.fable;
		}

		if (!pSilent)
		{
			this.pict.log.trace(`Manual solve executed for expression: ${pSolverExpression}`, tmpResultsObject);
		}

		return tmpSolutionValue;
	}

	/**
	 * Checks the solver and returns the solver object if it passes the checks.
	 *
	 * Automatically converts string solvers to have an Ordinal of 1.
	 *
	 * @param {string|object} pSolver - The solver to be checked. It can be either a string or an object.
	 * @param {boolean} [pFiltered=false] - Indicates whether the solvers should be filtered.
	 * @param {number} [pOrdinal] - The ordinal value to compare with the solver's ordinal value when filtered.
	 * @returns {object|undefined} - The solver object if it passes the checks, otherwise undefined.
	 */
	checkSolver(pSolver, pFiltered, pOrdinal)
	{
		let tmpSolver = pSolver;
		if (tmpSolver === undefined)
		{
			return;
		}
		if (typeof(tmpSolver) === 'string')
		{
			tmpSolver = {Expression:tmpSolver, Ordinal:1};
		}
		if (!('Expression' in tmpSolver))
		{
			this.log.error(`Dynamic View solver ${pOrdinal} is missing the Expression property.`, { Solver: pSolver });
			return;
		}
		if (!(`Ordinal` in tmpSolver))
		{
			tmpSolver.Ordinal = 1;
		}

		// This filters the solvers
		if (pFiltered && (tmpSolver.Ordinal != pOrdinal))
		{
			return;
		}

		return tmpSolver;
	}

	/** @typedef {{ Ordinal: number, Expression: string } | string} Solver */

	/**
	 * Execute a set of adhoc solvers.
	 *
	 * @param {import('../views/Pict-View-DynamicForm.js')} pView - The dynamic view to execute the solvers against.
	 * @param {Array<Solver>} pSolvers - An array of solvers to execute.
	 * @param {string} pReason - The reason for executing the solvers.
	 */
	executeSolvers(pView, pSolvers, pReason)
	{
		const tmpSolvers = Array.isArray(pSolvers) ? pSolvers : [];
		let tmpSolveOutcome = {};
		tmpSolveOutcome.SolverResultsMap = {};
		tmpSolveOutcome.StartTimeStamp = +new Date();

		let tmpOrdinalsToSolve = {};
		tmpSolveOutcome.SolveOrdinals = tmpOrdinalsToSolve;
		for (let i = 0; i < tmpSolvers.length; i++)
		{
			const tmpSolver = this.checkSolver(tmpSolvers[i]);
			if (tmpSolver)
			{
				let tmpOrdinalContainer = this.checkAutoSolveOrdinal(tmpSolver.Ordinal, tmpOrdinalsToSolve);
				tmpOrdinalContainer.AdhocSolvers.push(tmpSolver);
			}
		}

		// Now sort the ordinal container keys
		let tmpOrdinalKeys = Object.keys(tmpOrdinalsToSolve);
		tmpOrdinalKeys.sort((a, b) =>
		{
			if (isNaN(Number(a)) || isNaN(Number(b)))
			{
				return a.localeCompare(b);
			}
			return Number(a) - Number(b);
		});

		// Now enumerate the keys and solve each layer of the solution set
		for (let i = 0; i < tmpOrdinalKeys.length; i++)
		{
			if (this.pict.LogNoisiness > 1)
			{
				this.log.trace(`DynamicSolver [${this.UUID}]::[${this.Hash}] [${pReason}] Solving ordinal ${tmpOrdinalKeys[i]}`);
			}
			let tmpOrdinalContainer = tmpOrdinalsToSolve[tmpOrdinalKeys[i]];
			let tmpExecuteOrdinal = this.pict.providers.DynamicFormSolverBehaviors.checkSolverOrdinalEnabled(tmpOrdinalKeys[i]);
			if (tmpExecuteOrdinal)
			{
				this.executeAdhocSolvers(pView, tmpOrdinalContainer.AdhocSolvers, pReason, Number(tmpOrdinalKeys[i]), tmpSolveOutcome.SolverResultsMap);
			}
		}

		tmpSolveOutcome.EndTimeStamp = +new Date();

		// It's up to the developer to decide if they want to use this information somewhere.
		this.lastAdhocSolveOutcome = tmpSolveOutcome;
	}

	/**
	 * Runs each Adhoc solver formulae for a dynamic view group at a given ordinal.
	 *
	 * Or for all ordinals if no ordinal is passed.
	 *
	 * @param {import('../views/Pict-View-DynamicForm.js')} pView - The dynamic view to execute the solvers against.
	 * @param {Array<string>} pAdhocSolverArray - An array of Solvers from the groups to solve.
	 * @param {string} pReason - The reason for executing the solvers.
	 * @param {number} pOrdinal - The ordinal value to filter to.  Optional.
	 * @param {Object} pSolverResultsMap - The solver results map.
	 * @param {boolean} [pPreventSolverCycles=false] - Whether to prevent solver cycles.
	 */
	executeAdhocSolvers(pView, pAdhocSolverArray, pReason, pOrdinal, pSolverResultsMap, pPreventSolverCycles = false)
	{
		let tmpFiltered = (typeof(pOrdinal) === 'undefined') ? false : true;
		let tmpSolverReultsMap = this.prepareSolverResultsMap(pSolverResultsMap);

		for (let i = 0; i < pAdhocSolverArray.length; i++)
		{
			let tmpSolver = this.checkSolver(pAdhocSolverArray[i], tmpFiltered, pOrdinal);
			if (typeof(tmpSolver) === 'undefined')
			{
				continue;
			}

			if (pPreventSolverCycles && tmpSolver.Expression.match(this._RunSolversRegex))
			{
				if (this.pict.LogNoisiness > 0)
				{
					pView.log.warn(`Dynamic View [${pView.UUID}]::[${pView.Hash}] [${pReason}] skipping RecordSet ordinal ${tmpSolver.Ordinal} [${tmpSolver.Expression}] due to solver cycle prevention.`);
				}
				continue;
			}

			tmpSolver.StartTimeStamp = +new Date();
			tmpSolver.Hash = `AdhocSolver-${i}`;

			// TODO: Precompile the solvers (it's super easy)
			if (this.pict.LogNoisiness > 1)
			{
				this.pict.log.trace(`Dynamic View [${pView.UUID}]::[${pView.Hash}] [${pReason}] solving equation ${i} ordinal ${tmpSolver.Ordinal} [${pView.options.Solvers[i]}]`);
			}
			tmpSolver.ResultsObject = {};
			let tmpSolutionValue = this.fable.ExpressionParser.solve(tmpSolver.Expression, pView.getMarshalDestinationObject(), tmpSolver.ResultsObject, this.pict.manifest, pView.getMarshalDestinationObject());
			if (this.pict.LogNoisiness > 1)
			{
				this.pict.log.trace(`[${tmpSolver.Expression}] [${pReason}] result was ${tmpSolutionValue}`);
			}
			tmpSolverReultsMap.ExecutedSolvers.push(tmpSolver);
			tmpSolver.EndTimeStamp = +new Date();
		}
	}

	/**
	 * Runs each RecordSet solver formulae for a dynamic view group at a given ordinal.
	 *
	 * Or for all ordinals if no ordinal is passed.
	 *
	 * @param {array} pGroupSolverArray - An array of Solvers from the groups to solve.
	 * @param {number} pOrdinal - The ordinal value to filter to.  Optional.
	 * @param {Object} pSolverResultsMap - The solver results map.
	 * @param {boolean} [pPreventSolverCycles=false] - Whether to prevent solver cycles.
	 */
	executeGroupSolvers(pGroupSolverArray, pOrdinal, pSolverResultsMap, pPreventSolverCycles = false)
	{
		// This is purely for readability of the code below ... uglify optimizes it out.
		let tmpFiltered = (typeof(pOrdinal) === 'undefined') ? false : true;
		let tmpSolverReultsMap = this.prepareSolverResultsMap(pSolverResultsMap);

		// Solve the group RecordSet solvers first
		for (let j = 0; j < pGroupSolverArray.length; j++)
		{
			let tmpView = this.pict.views[pGroupSolverArray[j].ViewHash];
			let tmpGroup = tmpView.getGroup(pGroupSolverArray[j].GroupIndex);
			let tmpSolver = this.checkSolver(pGroupSolverArray[j].Solver, tmpFiltered, pOrdinal);
			if (typeof(tmpSolver) === 'undefined')
			{
				continue;
			}

			if (pPreventSolverCycles && tmpSolver.Expression.match(this._RunSolversRegex))
			{
				if (this.pict.LogNoisiness > 0)
				{
					tmpView.log.warn(`Dynamic View [${tmpView.UUID}]::[${tmpView.Hash}] skipping RecordSet ordinal ${tmpSolver.Ordinal} [${tmpSolver.Expression}] due to solver cycle prevention.`);
				}
				continue;
			}

			tmpSolver.StartTimeStamp = Date.now();
			tmpSolver.Hash = `${pGroupSolverArray[j].ViewHash}-GroupSolver-${j}`;

			if (this.pict.LogNoisiness > 1)
			{
				tmpView.log.trace(`Dynamic View [${tmpView.UUID}]::[${tmpView.Hash}] solving RecordSet ordinal ${tmpSolver.Ordinal} [${tmpSolver.Expression}]`);
			}

			let tmpRecordSet = tmpView.getTabularRecordSet(tmpGroup.GroupIndex);

			if (Array.isArray(tmpRecordSet))
			{
				for (let l = 0; l < tmpRecordSet.length; l++)
				{
					let tmpRecord = tmpRecordSet[l];
					tmpSolver.ResultsObject = {};
					let tmpSolutionValue = tmpView.fable.ExpressionParser.solve(tmpSolver.Expression, tmpRecord, tmpSolver.ResultsObject, tmpGroup.supportingManifest, tmpRecord);
					if (this.pict.LogNoisiness > 1)
					{
						tmpView.log.trace(`Group ${tmpGroup.Hash} [${tmpSolver.Expression}] record ${l} result was ${tmpSolutionValue}`);
					}
				}
			}
			else if (typeof(tmpRecordSet) == 'object')
			{
				let tmpRecordSetKeys = Object.keys(tmpRecordSet);
				for (let l = 0; l < tmpRecordSetKeys.length; l++)
				{
					let tmpRecord = tmpRecordSet[tmpRecordSetKeys[l]];
					tmpSolver.ResultsObject = {};
					let tmpSolutionValue = tmpView.fable.ExpressionParser.solve(tmpSolver.Expression, tmpRecord, tmpSolver.ResultsObject, tmpGroup.supportingManifest, tmpRecord);
					if (this.pict.LogNoisiness > 1)
					{
						tmpView.log.trace(`Group ${tmpGroup.Hash} [${tmpSolver.Expression}] record ${l} result was ${tmpSolutionValue}`);
					}
				}
			}
			tmpSolverReultsMap.ExecutedSolvers.push(tmpSolver);
			tmpSolver.EndTimeStamp = Date.now();
		}
	}

	/**
	 * Executes the section solvers at a given ordinal (or all if no ordinal is passed).
	 *
	 * @param {Array} pViewSectionSolverArray - The array of view section solvers.
	 * @param {number} pOrdinal - The ordinal value.
	 * @param {Object} pSolverResultsMap - The solver results map.
	 * @param {boolean} [pPreventSolverCycles=false] - Whether to prevent solver cycles.
	 */
	executeSectionSolvers(pViewSectionSolverArray, pOrdinal, pSolverResultsMap, pPreventSolverCycles = false)
	{
		let tmpFiltered = (typeof(pOrdinal) === 'undefined') ? false : true;
		let tmpSolverReultsMap = this.prepareSolverResultsMap(pSolverResultsMap);

		for (let i = 0; i < pViewSectionSolverArray.length; i++)
		{
			let tmpView = this.pict.views[pViewSectionSolverArray[i].ViewHash];
			let tmpSolver = this.checkSolver(pViewSectionSolverArray[i].Solver, tmpFiltered, pOrdinal);
			if (typeof(tmpSolver) === 'undefined')
			{
				continue;
			}

			if (pPreventSolverCycles && tmpSolver.Expression.match(this._RunSolversRegex))
			{
				if (this.pict.LogNoisiness > 0)
				{
					tmpView.log.warn(`Dynamic View [${tmpView.UUID}]::[${tmpView.Hash}] skipping RecordSet ordinal ${tmpSolver.Ordinal} [${tmpSolver.Expression}] due to solver cycle prevention.`);
				}
				continue;
			}

			tmpSolver.StartTimeStamp = +new Date();
			tmpSolver.Hash = `${pViewSectionSolverArray[i].ViewHash}-SectionSolver-${i}`;

			// TODO: Precompile the solvers (it's super easy)
			if (this.pict.LogNoisiness > 1)
			{
				tmpView.log.trace(`Dynamic View [${tmpView.UUID}]::[${tmpView.Hash}] solving equation ${i} ordinal ${tmpSolver.Ordinal} [${tmpView.options.Solvers[i]}]`);
			}
			tmpSolver.ResultsObject = {};
			let tmpSolutionValue = tmpView.fable.ExpressionParser.solve(tmpSolver.Expression, tmpView.getMarshalDestinationObject(), tmpSolver.ResultsObject, this.pict.manifest, tmpView.getMarshalDestinationObject());
			if (this.pict.LogNoisiness > 1)
			{
				tmpView.log.trace(`[${tmpSolver.Expression}] result was ${tmpSolutionValue}`);
			}
			tmpSolverReultsMap.ExecutedSolvers.push(tmpSolver);
			tmpSolver.EndTimeStamp = +new Date();
		}
	}

	/**
	 * Executes the view solvers for the given array of view hashes.
	 *
	 * @param {Array} pViewSolverArray - The array of view solvers to execute.
	 * @param {number} pOrdinal - The ordinal value.
	 * @param {Object} pSolverResultsMap - The solver results map.
	 */
	executeViewSolvers(pViewSolverArray, pOrdinal, pSolverResultsMap)
	{
		let tmpFiltered = (typeof(pOrdinal) === 'undefined') ? false : true;
		let tmpSolverReultsMap = this.prepareSolverResultsMap(pSolverResultsMap);

		for (let i = 0; i < pViewSolverArray.length; i++)
		{
			let tmpSolver = this.checkSolver(pViewSolverArray[i].Solver, tmpFiltered, pOrdinal);
			if (typeof(tmpSolver) === 'undefined')
			{
				continue;
			}
			tmpSolver.Hash = `${pViewSolverArray[i].ViewHash}-ViewSolve-${i}`;
			tmpSolver.StartTimeStamp = +new Date();
			let tmpView = this.pict.views[pViewSolverArray[i].ViewHash];
			if (this.pict.LogNoisiness > 1)
			{
				tmpView.log.trace(`Dynamic View [${tmpView.UUID}]::[${tmpView.Hash}] running solve() on view [${pViewSolverArray[i].ViewHash}`);
			}
			// Solve with the normal view solve() pipeline
			tmpView.solve();
			tmpSolverReultsMap.ExecutedSolvers.push(tmpSolver);
			tmpSolver.EndTimeStamp = +new Date();
		}
	}

	/**
	 * Executes any validation solvers defined in the form manifest.
	 *
	 * @param {Object} pSolverResultsMap - The solver results map to use for executing validation solvers.
	 * @param {boolean} [pPreventSolverCycles=false] - Whether to prevent solver cycles when executing validation solvers.
	 */
	executeValidationSolvers(pSolverResultsMap, pPreventSolverCycles = false)
	{
		const tmpValidationSolvers = this.pict.views.PictFormMetacontroller?.manifestDescription?.ValidationSolvers;
		if (!Array.isArray(tmpValidationSolvers))
		{
			return;
		}
		const tmpMarshalDestination = this.pict.views.PictFormMetacontroller && this.pict.resolveStateFromAddress(this.pict.views.PictFormMetacontroller.viewMarshalDestination) || this.pict.AppData;
		for (let i = 0; i < tmpValidationSolvers.length; i++)
		{
			const tmpSolver = this.checkSolver(tmpValidationSolvers[i]);
			if (typeof(tmpSolver) === 'undefined')
			{
				continue;
			}

			if (pPreventSolverCycles && tmpSolver.Expression.match(this._RunSolversRegex))
			{
				if (this.pict.LogNoisiness > 0)
				{
					this.pict.log.warn(`Skipping Validation Solver ordinal ${tmpSolver.Ordinal} [${tmpSolver.Expression}] due to solver cycle prevention.`);
				}
				continue;
			}

			if (this.pict.LogNoisiness > 1)
			{
				this.pict.log.trace(`Running validation solver ordinal ${tmpSolver.Ordinal} [${tmpSolver.Expression}]`);
			}
			this.pict.ExpressionParser.solve(tmpSolver.Expression, tmpMarshalDestination, pSolverResultsMap, this.pict.manifest, tmpMarshalDestination);
		}
	}

	/**
	 * Checks if the given ordinal exists in the provided ordinal set.
	 *
	 * If not, it adds the ordinal to the set.
	 *
	 * @param {number} pOrdinal - The ordinal to check.
	 * @param {Object} pOrdinalSet - The ordinal set to check against.
	 * @returns {Object} - The ordinal object from the ordinal set.
	 */
	checkAutoSolveOrdinal (pOrdinal, pOrdinalSet)
	{
		if (!(pOrdinal.toString() in pOrdinalSet))
		{
			pOrdinalSet[pOrdinal.toString()] = { ViewSolvers:[], SectionSolvers:[], GroupSolvers:[], AdhocSolvers:[] };
		}
		return pOrdinalSet[pOrdinal];
	}

	/**
	 * Solves the views based on the provided view hashes or all views in pict.
	 *
	 * If non-dynamic views are also passed in, they are solved as well.
	 *
	 * This algorithm is particularly complex because it solves views in
	 * order across two dimensions:
	 *
	 * 1. The order of the views in the view hash array.
	 * 2. Precedence order (based on Ordinal)
	 *
	 * The way it manages the precedence order solving is by enumerating the
	 * view hash array multiple times until it exhausts the solution set.
	 *
	 * In dynamic views, when there are collisions in precedence order between
	 * Section Solvers and Group RecordSet Solvers, it prefers the RecordSet
	 * solvers first.  The thinking behind this is that a RecordSet solver is
	 * a "tier down" from the core Section it resides within.  These are
	 * leaves on the tree.

	 * @param {Array|string[]} [pViewHashes] - An optional array of view hashes to solve. If not provided, all views in the fable will be solved.
	 * @param {boolean} [pPreventSolverCycles] - An optional context string for the solve operation.
	 * TODO: make sure you can't cycle with the same solve context - new solver method to invoke this
	 *
	 * @return {Array<string>} - An array of view hashes that were solved.
	 */
	solveViews(pViewHashes, pPreventSolverCycles)
	{
		//this.log.trace(`Dynamic View Provider [${this.UUID}]::[${this.Hash}] solving views.`);
		let tmpViewHashes = Array.isArray(pViewHashes) ? pViewHashes : Object.keys(this.fable.views);
		const tmpPreventSolverCycles = pPreventSolverCycles === true;

		let tmpSolveOutcome = {};
		tmpSolveOutcome.SolverResultsMap = {};
		tmpSolveOutcome.StartTimeStamp = +new Date();
		tmpSolveOutcome.ViewHashes = tmpViewHashes;

		let tmpOrdinalsToSolve = {};
		tmpSolveOutcome.SolveOrdinals = tmpOrdinalsToSolve;
		for (let i = 0; i < tmpViewHashes.length; i++)
		{
			let tmpView = this.fable.views[tmpViewHashes[i]];
			if (tmpView.isPictView && !tmpView.isPictSectionForm && !tmpView.isPictMetacontroller)
			{
				// This is just a normal view.  We will solve it at the appropriate ordinal.
				let tmpOrdinalContainer = this.checkAutoSolveOrdinal(tmpView.options.AutoSolveOrdinal, tmpOrdinalsToSolve);
				tmpOrdinalContainer.ViewSolvers.push({ViewHash:tmpViewHashes[i]});
			}
			else if (tmpView.isPictSectionForm)
			{
				// These guards are here because the metacontroller view masquerades as a section form view but isn't one.
				for (let j = 0; j < tmpView.sectionDefinition.Groups.length; j++)
				{
					let tmpGroup = tmpView.getGroup(j);
					if (`RecordSetSolvers` in tmpGroup)
					{
						for (let k = 0; k < tmpGroup.RecordSetSolvers.length; k++)
						{
							let tmpSolver = this.checkSolver(tmpGroup.RecordSetSolvers[k]);
							if (tmpSolver)
							{
								let tmpOrdinalContainer = this.checkAutoSolveOrdinal(tmpSolver.Ordinal, tmpOrdinalsToSolve);
								tmpOrdinalContainer.GroupSolvers.push({ViewHash:tmpViewHashes[i], GroupIndex:j, Solver:tmpSolver});
							}
						}
					}
				}
				if (Array.isArray(tmpView.options.Solvers))
				{
					// Add thje section solver(s)
					for (let j = 0; j < tmpView.options.Solvers.length; j++)
					{
						let tmpSolver = this.checkSolver(tmpView.options.Solvers[j]);
						if (tmpSolver)
						{
							let tmpOrdinalContainer = this.checkAutoSolveOrdinal(tmpSolver.Ordinal, tmpOrdinalsToSolve);
							tmpOrdinalContainer.SectionSolvers.push({ViewHash:tmpViewHashes[i], Solver:tmpSolver});
						}
					}
				}
			}
		}

		// Now sort the ordinal container keys
		let tmpOrdinalKeys = Object.keys(tmpOrdinalsToSolve);
		tmpOrdinalKeys.sort((a, b) =>
		{
			if (isNaN(Number(a)) || isNaN(Number(b)))
			{
				return a.localeCompare(b);
			}
			return Number(a) - Number(b);
		});

		// Now enumerate the keys and solve each layer of the solution set
		for (let i = 0; i < tmpOrdinalKeys.length; i++)
		{
			if (this.pict.LogNoisiness > 1)
			{
				this.log.trace(`DynamicSolver [${this.UUID}]::[${this.Hash}] Solving ordinal ${tmpOrdinalKeys[i]}`);
			}
			let tmpOrdinalContainer = tmpOrdinalsToSolve[tmpOrdinalKeys[i]];
			let tmpExecuteOrdinal = this.pict.providers.DynamicFormSolverBehaviors.checkSolverOrdinalEnabled(tmpOrdinalKeys[i]);
			if (tmpExecuteOrdinal)
			{
				this.executeGroupSolvers(tmpOrdinalContainer.GroupSolvers, Number(tmpOrdinalKeys[i]), tmpSolveOutcome.SolverResultsMap, tmpPreventSolverCycles);
				this.executeSectionSolvers(tmpOrdinalContainer.SectionSolvers, Number(tmpOrdinalKeys[i]), tmpSolveOutcome.SolverResultsMap, tmpPreventSolverCycles);
				this.executeViewSolvers(tmpOrdinalContainer.ViewSolvers, Number(tmpOrdinalKeys[i]), tmpSolveOutcome.SolverResultsMap);
			}
		}

		this.executeValidationSolvers(tmpSolveOutcome.SolverResultsMap, tmpPreventSolverCycles);

		// Now regenerate the metalists .. after the solve has happened.
		this.pict.providers.DynamicMetaLists.buildViewSpecificLists(tmpViewHashes);

		tmpSolveOutcome.EndTimeStamp = +new Date();

		// It's up to the developer to decide if they want to use this information somewhere.
		this.lastSolveOutcome = tmpSolveOutcome;
		return tmpViewHashes;
	}
}

module.exports = PictDynamicSolver;
module.exports.default_configuration = _DefaultProviderConfiguration;
