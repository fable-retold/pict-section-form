const libPictSectionInputExtension = require('../Pict-Provider-InputExtension.js');

/**
 * CustomInputHandler class.
 *
 * @class
 * @extends libPictSectionInputExtension
 * @memberof providers.inputs
 */
class CustomInputHandler extends libPictSectionInputExtension
{
	/**
	 * @param {import('fable')} pFable - The Fable instance.
	 * @param {Record<string, any>} [pOptions] - The options for the provider.
	 * @param {string} [pServiceHash] - The service hash for the provider.
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		super(pFable, pOptions, pServiceHash);

		/** @type {import('pict')} */
		this.pict;
		/** @type {import('pict')} */
		this.fable;
		/** @type {any} */
		this.log;

		/** @type {string} */
		this.cssHideClass = 'pict-tab-section-hidden';
		this.cssSelectedTabClass = 'pict-tab-section-selectedtab';
		this.cssSnippet = '.pict-tab-section-hidden { display: none; } .pict-tab-section-selectedtab { font-weight: bold; }';

		this.setCSSSnippets();
	}

	/**
	 * @param {string} [pCSSHideClass]
	 * @param {string} [pCSSSnippet]
	 */
	setCSSSnippets(pCSSHideClass, pCSSSnippet)
	{
		this.cssHideClass = pCSSHideClass || this.cssHideClass;
		this.cssSnippet = pCSSSnippet || this.cssSnippet;
		this.pict.CSSMap.addCSS('Pict-Section-Form-Input-Section-TabSelector', this.cssSnippet, 1001, 'Pict-Input-TabSelector');
	}

	/**
	 * @param {string} pManifestSectionHash
	 *
	 * @return {string}
	 */
	getViewHash(pManifestSectionHash)
	{
		return `PictSectionForm-${pManifestSectionHash}`;
	}

	/**
	 * @param {string} pTabSectionHash
	 * @param {Object} pInput
	 *
	 * @return {string}
	 */
	getTabSelector(pTabSectionHash, pInput)
	{
		return `#TAB-${pTabSectionHash}-${pInput.Macro.RawHTMLID}`;
	}

	/**
	 * @param {string} pTabViewSectionHash
	 *
	 * @return {string}
	 */
	getSectionSelector(pTabViewSectionHash)
	{
		const metaController = this.pict.views.PictFormMetacontroller;
		return `#Pict-${metaController ? metaController.UUID : this.UUID}-${pTabViewSectionHash}-Wrap`;
	}

	/**
	 * Is this tab section hash actually one of the input's tabs?
	 *
	 * @param {Object} pInput - The input object.
	 * @param {string} pTabSectionHash - The tab section hash to test.
	 *
	 * @return {boolean}
	 */
	isTabInSet(pInput, pTabSectionHash)
	{
		let tmpTabSet = pInput?.PictForm?.TabSectionSet;
		return !!pTabSectionHash && Array.isArray(tmpTabSet) && (tmpTabSet.indexOf(pTabSectionHash) > -1);
	}

	/**
	 * @param {string} pViewHash
	 * @param {string} pInputHash
	 * @param {string} pTabViewHash
	 *
	 * @return {boolean} - true once the section is shown; false (nothing changed) if the view, input or tab hash is not valid.
	 */
	selectTabByViewHash(pViewHash, pInputHash, pTabViewHash)
	{
		// First get the view
		let tmpView = this.pict.views[pViewHash];
		if (!tmpView)
		{
			this.pict.log.error(`TabSelector input provider tried to switch to view [${pViewHash}] input [${pInputHash}] tab [${pTabViewHash}] but the view did not exist!`)
			return false;
		}
		// Then the input
		let tmpInput = tmpView.getInputFromHash(pInputHash)
		if (!tmpInput)
		{
			this.pict.log.error(`TabSelector input provider tried to switch to view [${pViewHash}] input [${pInputHash}] tab [${pTabViewHash}] but the input did not exist!`)
			return false;
		}
		// Now enumerate the tabs and hide the others, then show this one.
		// TODO: This could be made more elegant by testing which ones are shown and swapping them faster.
		if (!(tmpInput?.PictForm?.TabSectionSet) || !Array.isArray(tmpInput.PictForm.TabSectionSet))
		{
			this.pict.log.error(`TabSelector input provider tried to switch to view [${pViewHash}] input [${pInputHash}] tab [${pTabViewHash}] but the input did not have a valid TabSectionSet array in the PictForm object!`)
			return false;
		}
		// A hash that is not in the set matches nothing below, so it would hide EVERY section and leave no
		// tab selected. Refuse it without touching anything; false already means "did not switch".
		if (!this.isTabInSet(tmpInput, pTabViewHash))
		{
			this.pict.log.warn(`TabSelector input provider was asked for tab [${pTabViewHash}] on view [${pViewHash}] input [${pInputHash}] but it is not in the TabSectionSet; leaving the current tab selected.`);
			return false;
		}
		let tmpTabView = this.pict.views[this.getViewHash(pTabViewHash)];
		if (!tmpTabView)
		{
			this.pict.log.error(`TabSelector input provider tried to switch to view [${pViewHash}] input [${pInputHash}] tab [${pTabViewHash}] but the tab view did not exist!`)
			return false;
		}

		for (let i = 0; i < tmpInput.PictForm.TabSectionSet.length; i++)
		{
			let tmpTabSectionHash = tmpInput.PictForm.TabSectionSet[i];
			if (tmpTabSectionHash != pTabViewHash)
			{
				// Hide this tab group if it isn't the "expected to be visible" group
				this.pict.ContentAssignment.addClass(this.getSectionSelector(tmpTabSectionHash), this.cssHideClass);
				this.pict.ContentAssignment.removeClass(this.getTabSelector(tmpTabSectionHash, tmpInput), this.cssSelectedTabClass);
			}
			else
			{
				// Show this tab group if it is the "expected to be visible" group
				this.pict.ContentAssignment.removeClass(this.getSectionSelector(tmpTabSectionHash), this.cssHideClass);
				this.pict.ContentAssignment.addClass(this.getTabSelector(tmpTabSectionHash, tmpInput), this.cssSelectedTabClass);
			}
		}
		tmpView.setDataByInput(tmpInput, pTabViewHash);
		return true;
	}

	/**
	 * Generates the HTML ID for a select input element.
	 *
	 * @param {string} pInputHTMLID - The HTML ID of the input element.
	 *
	 * @return {string} - The generated HTML ID for the select input element.
	 */
	getTabSelectorInputHTMLID(pInputHTMLID)
	{
		return `#TAB-SELECT-FOR-${pInputHTMLID}`;
	}

	/**
	 * Initializes the input element for the Pict provider select input.
	 * @param {Object} pView - The view object.
	 * @param {Object} pGroup - The group object.
	 * @param {Object} pRow - The row object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The input value.
	 * @param {string} pHTMLTabSelector - The HTML selector.
	 * @param {string} pTransactionGUID - The transaction GUID for the event dispatch.
	 * @returns {boolean} - Returns true if the input element is successfully initialized, false otherwise.
	 */
	onInputInitialize(pView, pGroup, pRow, pInput, pValue, pHTMLTabSelector, pTransactionGUID)
	{
		let tmpTabSet = pInput.PictForm?.TabSectionSet;

		if (!tmpTabSet || !Array.isArray(tmpTabSet) || tmpTabSet.length < 1)
		{
			this.pict.log.error(`TabSelector input provider tried to initialize Tab Group Set for HTML ID [${pInput.Macro.RawHTMLID}] but there were no valid entries in the tmpInput.PictForm.TabSectionSet array!`)
			return false;
		}

		let tmpEntryMetatemplateHash = this.pict.providers.DynamicInput.getInputTemplateHash(pView, { PictForm: { InputType: 'TabSectionSelector-TabElement', DataType: 'String' } });

		let tmpTabSectionSetEntries = '';
		// If there are tab group names, use them, otherwise use the hash
		let tempTabSetNames = pInput.PictForm?.TabSectionNames || [];

		for (let i = 0; i < tmpTabSet.length; i++)
		{
			tmpTabSectionSetEntries += this.pict.parseTemplateByHash(tmpEntryMetatemplateHash, pInput, null, [pView, {TabSectionHash: tmpTabSet[i], TabSectionName: (tempTabSetNames[i] || tmpTabSet[i])}]);
		}

		// TODO: Fix typescript types so this function has an optional rather than required fourth parameter.
		this.pict.ContentAssignment.projectContent('replace', this.getTabSelectorInputHTMLID(pInput.Macro.RawHTMLID), tmpTabSectionSetEntries, 'FixTheTypescriptTypes');

		// Now set the default tab (or first one). Take the first candidate that is actually one of this
		// input's tabs, since selectTabByViewHash refuses anything else: a stored value can name a section
		// since renamed or dropped from the manifest, and DefaultTabSectionHash can simply be a typo.
		const tmpTabCandidates = [];
		if (pInput.PictForm?.DefaultFromData !== false)
		{
			tmpTabCandidates.push(pValue);
		}
		tmpTabCandidates.push(pInput.PictForm?.DefaultTabSectionHash);

		let tmpDefaultTabSectionHash = tmpTabSet[0];
		for (let i = 0; i < tmpTabCandidates.length; i++)
		{
			if (this.isTabInSet(pInput, tmpTabCandidates[i]))
			{
				tmpDefaultTabSectionHash = tmpTabCandidates[i];
				break;
			}
		}

		this.selectTabByViewHash(pView.Hash, pInput.Hash, tmpDefaultTabSectionHash);

		return super.onInputInitialize(pView, pGroup, pRow, pInput, pValue, pHTMLTabSelector, pTransactionGUID);
	}
}

module.exports = CustomInputHandler;
