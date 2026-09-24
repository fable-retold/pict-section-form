/*
	Injection conformance, browser tier: the in-page driver.

	Boots a pict-section-form application in a real browser, injects manifests through createDistinctManifest
	+ injectManifest (the path a host application takes), drives the DOM and publishes what it saw as base64
	JSON on #PictFormInjectionHarness-Results, for Injection-Conformance-Harness-Runner.js to read back out
	of `chrome --dump-dom`.
*/
/* global Pict */

const libPictSectionForm = require('../../source/Pict-Section-Form.js');

const RESULTS_ELEMENT_ID = 'PictFormInjectionHarness-Results';
const BOOT_TIMEOUT_MS = 20000;

/**
 * @typedef {Object} HarnessCheck
 * @property {string} Label
 * @property {boolean} Passed
 * @property {'fail'|'open'} Severity - 'open' marks a known, reported gap; it is printed but does not fail the run.
 * @property {any} [Detail]
 */

/**
 * @typedef {Object} HarnessBootOptions
 * @property {Record<string, any>} HostManifest - Manifest the application boots with (DefaultFormManifest).
 * @property {string} [MarshalDestination] - Address the form marshals to; defaults to AppData.
 * @property {Record<string, any>} [InitialAppData] - The application data before the first render.
 */

/**
 * @param {any} pValue
 * @return {any}
 */
function cloneData(pValue)
{
	if (pValue === undefined)
	{
		return undefined;
	}
	return JSON.parse(JSON.stringify(pValue));
}

/**
 * Loose equality for solver output: numeric strings and numbers compare by value, arrays element-wise.
 *
 * @param {any} pActual
 * @param {any} pExpected
 * @return {boolean}
 */
function looselyEqual(pActual, pExpected)
{
	if (Array.isArray(pExpected))
	{
		if (!Array.isArray(pActual) || (pActual.length !== pExpected.length))
		{
			return false;
		}
		for (let i = 0; i < pExpected.length; i++)
		{
			if (!looselyEqual(pActual[i], pExpected[i]))
			{
				return false;
			}
		}
		return true;
	}
	if ((typeof pExpected === 'number') || ((typeof pExpected === 'string') && (pExpected.trim() !== '') && !isNaN(Number(pExpected))))
	{
		return (pActual !== null) && (pActual !== undefined) && (String(pActual).trim() !== '') && (Number(pActual) === Number(pExpected));
	}
	return pActual === pExpected;
}

/**
 * Harness state and helpers shared by every scenario.
 */
class HarnessContext
{
	/**
	 * @param {Record<string, any>} pConfig - window.PictFormInjectionHarnessConfig
	 * @param {Record<string, any>} [pHooks] - window.PictFormInjectionHarnessHooks
	 */
	constructor(pConfig, pHooks)
	{
		this.config = pConfig || {};
		this.hooks = pHooks || {};
		/** @type {Array<HarnessCheck>} */
		this.checks = [];
		/** @type {Array<string>} */
		this.errors = [];
		/** @type {Record<string, any>} */
		this.snapshots = {};
		/** @type {Record<string, any>} */
		this.info = {};
		/** @type {any} */
		this.pict = null;
		/** @type {string|null} */
		this.tailSectionHash = null;
	}

	/**
	 * @param {string} pLabel
	 * @param {any} pCondition
	 * @param {any} [pDetail]
	 * @param {'fail'|'open'} [pSeverity]
	 * @return {boolean}
	 */
	check(pLabel, pCondition, pDetail, pSeverity)
	{
		const tmpPassed = Boolean(pCondition);
		this.checks.push({ Label: pLabel, Passed: tmpPassed, Severity: pSeverity || 'fail', Detail: tmpPassed ? undefined : cloneData(pDetail === undefined ? null : pDetail) });
		return tmpPassed;
	}

	/**
	 * @param {string} pLabel
	 * @param {any} pActual
	 * @param {any} pExpected
	 * @param {'fail'|'open'} [pSeverity]
	 * @return {boolean}
	 */
	checkEqual(pLabel, pActual, pExpected, pSeverity)
	{
		return this.check(pLabel, looselyEqual(pActual, pExpected), { Actual: pActual === undefined ? '(undefined)' : pActual, Expected: pExpected }, pSeverity);
	}

	/**
	 * @param {number} pMilliseconds
	 * @return {Promise<void>}
	 */
	wait(pMilliseconds)
	{
		return new Promise((fResolve) => setTimeout(fResolve, pMilliseconds));
	}

	get metacontroller()
	{
		return this.pict.views.PictFormMetacontroller;
	}

	get marshalDestinationObject()
	{
		return this.pict.providers.DataBroker.marshalDestinationObject;
	}

	/**
	 * Boots the form application and resolves after its first render and solve.
	 *
	 * @param {HarnessBootOptions} pOptions
	 * @return {Promise<void>}
	 */
	async boot(pOptions)
	{
		const tmpMarshalDestination = pOptions.MarshalDestination;

		class HarnessApplication extends libPictSectionForm.PictFormApplication
		{
			constructor(pFable, pAppOptions, pServiceHash)
			{
				super(pFable, pAppOptions, pServiceHash);
				if (tmpMarshalDestination)
				{
					this.pict.providers.DataBroker.marshalDestination = tmpMarshalDestination;
				}
			}
		}
		HarnessApplication.default_configuration = Object.assign({}, libPictSectionForm.PictFormApplication.default_configuration,
			{
				Name: 'Injection Conformance Harness',
				Hash: 'InjectionConformanceHarness',
				pict_configuration:
				{
					Product: 'InjectionConformanceHarness',
					DefaultFormManifest: cloneData(pOptions.HostManifest),
					DefaultAppData: cloneData(pOptions.InitialAppData || {}),
				},
			});

		Pict.safeLoadPictApplication(HarnessApplication, 0);

		const tmpStart = Date.now();
		while (!(window._Pict && window._Pict.views && window._Pict.views.PictFormMetacontroller && window._Pict.views.PictFormMetacontroller.FirstRenderCompleted))
		{
			if ((Date.now() - tmpStart) > BOOT_TIMEOUT_MS)
			{
				throw new Error('The form application did not finish its first render.');
			}
			await this.wait(20);
		}
		this.pict = window._Pict;
		this.captureErrors();
		await this.wait(20);
	}

	/**
	 * Records error-level log lines so the runner can show them next to the checks.
	 */
	captureErrors()
	{
		const tmpLog = this.pict.log;
		const tmpOriginalError = tmpLog.error.bind(tmpLog);
		tmpLog.error = (pMessage, pData) =>
		{
			this.errors.push(String(pMessage));
			return tmpOriginalError(pMessage, pData);
		};
	}

	/**
	 * Salts a manifest, applies the optional PostSalt hook, injects it after the previous injection and
	 * renders and marshals the new sections, the sequence a host application runs.
	 *
	 * @param {Record<string, any>} pManifest
	 * @param {string} pSalt
	 * @return {Promise<{ Salted: Record<string, any>, Views: Array<any> }>}
	 */
	async inject(pManifest, pSalt)
	{
		let tmpSalted = this.metacontroller.createDistinctManifest(pManifest, pSalt);
		if (typeof this.hooks.PostSalt === 'function')
		{
			tmpSalted = this.hooks.PostSalt(pManifest, tmpSalted, pSalt) || tmpSalted;
		}
		const tmpViews = this.metacontroller.injectManifest(tmpSalted, this.tailSectionHash || undefined);
		this.metacontroller.updateMetatemplateInDOM();
		if (tmpViews.length > 0)
		{
			this.tailSectionHash = tmpViews[tmpViews.length - 1].Hash;
		}
		await this.wait(0);
		for (const tmpView of tmpViews)
		{
			tmpView.render();
		}
		for (const tmpView of tmpViews)
		{
			tmpView.marshalToView();
		}
		await this.wait(20);
		return { Salted: tmpSalted, Views: tmpViews };
	}

	/**
	 * Runs every solver in every view, then marshals the results to the DOM.
	 *
	 * @return {Promise<void>}
	 */
	async solve()
	{
		this.pict.providers.DynamicSolver.solveViews();
		this.metacontroller.marshalToView();
		await this.wait(20);
	}

	/**
	 * Renders a section again from the data as it stands, the way opening a saved form does.
	 *
	 * @param {string} pSectionHash
	 * @return {boolean} false when the section is not rendered
	 */
	rerenderSection(pSectionHash)
	{
		const tmpView = this.getSectionView(pSectionHash);
		if (!tmpView)
		{
			return false;
		}
		tmpView.render();
		tmpView.marshalToView();
		return true;
	}

	/**
	 * @param {string} pAddress - Address relative to the marshal destination.
	 * @return {any}
	 */
	getValue(pAddress)
	{
		return this.pict.manifest.getValueAtAddress(this.marshalDestinationObject, pAddress);
	}

	/**
	 * @param {string} pSectionHash
	 * @return {any} the section view, or undefined
	 */
	getSectionView(pSectionHash)
	{
		return this.pict.views[`PictSectionForm-${pSectionHash}`];
	}

	/**
	 * @return {Array<any>} every dynamic form section view
	 */
	getSectionViews()
	{
		return Object.values(this.pict.views).filter((pView) => pView && pView.isPictSectionForm);
	}

	/**
	 * @param {string} pInputHash
	 * @return {{ View: any, Input: any } | null}
	 */
	findInput(pInputHash)
	{
		for (const tmpView of this.getSectionViews())
		{
			const tmpInput = tmpView.getInputFromHash(pInputHash);
			if (tmpInput)
			{
				return { View: tmpView, Input: tmpInput };
			}
		}
		return null;
	}

	/**
	 * @param {string} pInputHash
	 * @return {HTMLInputElement|null}
	 */
	getInputElement(pInputHash)
	{
		const tmpFound = this.findInput(pInputHash);
		if (!tmpFound || !tmpFound.Input.Macro || !tmpFound.Input.Macro.HTMLSelector)
		{
			return null;
		}
		return document.querySelector(tmpFound.Input.Macro.HTMLSelector);
	}

	/**
	 * Types a value into an input and fires its change event, as a person would.
	 *
	 * @param {string} pInputHash
	 * @param {any} pValue
	 * @return {boolean} false when the input element is not in the DOM
	 */
	enterValue(pInputHash, pValue)
	{
		const tmpElement = this.getInputElement(pInputHash);
		if (!tmpElement)
		{
			return false;
		}
		tmpElement.value = String(pValue);
		tmpElement.dispatchEvent(new Event('input', { bubbles: true }));
		tmpElement.dispatchEvent(new Event('change', { bubbles: true }));
		return true;
	}

	/**
	 * @param {Element|null} pElement
	 * @return {boolean|null} null when the element does not exist
	 */
	isElementHidden(pElement)
	{
		if (!pElement)
		{
			return null;
		}
		const tmpHideClasses =
		[
			'pict-section-form-hidden-section',
			'pict-section-form-hidden-group',
			this.pict.providers['Pict-Input-TabSectionSelector'] ? this.pict.providers['Pict-Input-TabSectionSelector'].cssHideClass : null,
			this.pict.providers['Pict-Input-TabGroupSelector'] ? this.pict.providers['Pict-Input-TabGroupSelector'].cssHideClass : null,
		].filter(Boolean);
		let tmpElement = pElement;
		while (tmpElement && (tmpElement !== document.body))
		{
			if (tmpHideClasses.some((pClass) => tmpElement.classList.contains(pClass)))
			{
				return true;
			}
			if (window.getComputedStyle(tmpElement).display === 'none')
			{
				return true;
			}
			tmpElement = tmpElement.parentElement;
		}
		return false;
	}

	/**
	 * @param {string} pSectionHash
	 * @return {boolean|null} null when the section is not rendered
	 */
	isSectionHidden(pSectionHash)
	{
		const tmpView = this.getSectionView(pSectionHash);
		if (!tmpView)
		{
			return null;
		}
		return this.isElementHidden(document.getElementById(`SECTION-${tmpView.formID}`));
	}

	/**
	 * @param {string} pSectionHash
	 * @param {string} pGroupHash
	 * @return {boolean|null} null when the group is not rendered
	 */
	isGroupHidden(pSectionHash, pGroupHash)
	{
		const tmpView = this.getSectionView(pSectionHash);
		if (!tmpView)
		{
			return null;
		}
		return this.isElementHidden(document.getElementById(`GROUP-${tmpView.formID}-${pGroupHash}`));
	}

	/**
	 * Clicks one tab of a TabSectionSelector / TabGroupSelector input.
	 *
	 * @param {string} pInputHash
	 * @param {string} pTabHash
	 * @return {boolean} false when the tab element is not in the DOM
	 */
	clickTab(pInputHash, pTabHash)
	{
		const tmpFound = this.findInput(pInputHash);
		if (!tmpFound || !tmpFound.Input.Macro)
		{
			return false;
		}
		const tmpTab = document.getElementById(`TAB-${pTabHash}-${tmpFound.Input.Macro.RawHTMLID}`);
		if (!tmpTab)
		{
			return false;
		}
		tmpTab.click();
		return true;
	}

	/**
	 * @param {string} pInputHash - hash of a Chart input
	 * @return {{ Labels: Array<any>, Datasets: Array<{ Label: string, Data: Array<any> }> } | null}
	 */
	getChartData(pInputHash)
	{
		const tmpFound = this.findInput(pInputHash);
		const tmpProvider = this.pict.providers['Pict-Input-Chart'];
		if (!tmpFound || !tmpFound.Input.Macro || !tmpProvider)
		{
			return null;
		}
		const tmpChart = tmpProvider.currentChartObjects[`Object-For-${tmpFound.Input.Macro.RawHTMLID}`];
		if (!tmpChart || !tmpChart.data)
		{
			return null;
		}
		return (
			{
				Labels: cloneData(tmpChart.data.labels || []),
				Datasets: (tmpChart.data.datasets || []).map((pSet) => ({ Label: pSet.label, Data: cloneData(pSet.data || []) })),
			});
	}

	/**
	 * @param {string} pSectionHash
	 * @param {string} pSelector
	 * @return {Element|null}
	 */
	querySection(pSectionHash, pSelector)
	{
		const tmpView = this.getSectionView(pSectionHash);
		if (!tmpView)
		{
			return null;
		}
		const tmpSection = document.getElementById(`SECTION-${tmpView.formID}`);
		return tmpSection ? tmpSection.querySelector(pSelector) : null;
	}

	/**
	 * Writes the results where the node runner can find them in the dumped DOM.
	 */
	publish()
	{
		const tmpResults =
		{
			Checks: this.checks,
			Errors: this.errors.slice(0, 200),
			ErrorCount: this.errors.length,
			Snapshots: this.snapshots,
			Info: this.info,
		};
		const tmpEncoded = window.btoa(unescape(encodeURIComponent(JSON.stringify(tmpResults))));
		let tmpElement = document.getElementById(RESULTS_ELEMENT_ID);
		if (!tmpElement)
		{
			tmpElement = document.createElement('div');
			tmpElement.id = RESULTS_ELEMENT_ID;
			document.body.appendChild(tmpElement);
		}
		tmpElement.setAttribute('data-results', tmpEncoded);
		document.title = 'PictFormInjectionHarness:done';
	}
}

const _Scenarios =
{
	EdgeCase: require('./Injection-Conformance-EdgeCase-Scenario.js'),
	Differential: require('./Injection-Conformance-Differential-Scenario.js'),
	Standalone: require('./Injection-Conformance-Standalone-Scenario.js'),
	Reconstitution: require('./Injection-Conformance-Reconstitution-Scenario.js'),
};

/**
 * Runs the scenario named by window.PictFormInjectionHarnessConfig.Scenario and publishes the results.
 *
 * @return {Promise<void>}
 */
async function run()
{
	const tmpContext = new HarnessContext(window.PictFormInjectionHarnessConfig, window.PictFormInjectionHarnessHooks);
	window.addEventListener('error', (pEvent) =>
	{
		tmpContext.errors.push(`window.onerror: ${pEvent.message}`);
	});
	try
	{
		const tmpScenario = _Scenarios[tmpContext.config.Scenario];
		if (!tmpScenario)
		{
			throw new Error(`Unknown scenario [${tmpContext.config.Scenario}].`);
		}
		await tmpScenario.run(tmpContext);
	}
	catch (pError)
	{
		tmpContext.check('scenario ran to completion', false, (pError && pError.stack) ? pError.stack : String(pError));
	}
	tmpContext.publish();
}

module.exports = { run: run, HarnessContext: HarnessContext, looselyEqual: looselyEqual, cloneData: cloneData };
