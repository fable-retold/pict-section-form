const libPictSectionInputExtension = require('../Pict-Provider-InputExtension.js');

/**
 * FacetFilter input provider.
 *
 * Keeps a set of inputs that choose from one shared join list (their `Facet` ListFilterRules name the same
 * `JoinListAddress`) mutually consistent when one of them changes.  In a tabular group the set is the
 * facet inputs in the changed row only; outside a table it is the facet inputs in the same view.
 *
 * On a change it runs, before the form solves:
 *   1. ClearInvalid (default true): walking the siblings in column order, a sibling whose value no longer
 *      appears in any join record agreeing with the changed value (and the siblings already kept) is cleared.
 *   2. AutoFillSingle (default true): an empty sibling left with exactly one allowed value takes it, repeated
 *      until nothing changes.  The changed input itself is never filled, so clearing it sticks.
 *   3. CarryFields ({ "<row address>": "<join record address>" }): on a sibling that holds a value, the join
 *      record its facet set now identifies (exactly one agreeing record) is copied into the row; with no value,
 *      or no single record, those row fields are cleared.
 *
 * It only acts on a user change, never on load or marshal, so a saved value -- carried fields included -- is
 * never rewritten by opening a document or by the join list changing later.  Narrowing the offered options
 * is the `Facet` rule's job in ListDistilling.filterList.
 *
 *   ListFilterRules: [ { FilterType: "Facet", JoinListAddress: "AppData.Graph", JoinListAddressGlobal: true, JoinListValueAddress: "Colour" } ],
 *   Providers: [ "Pict-Input-FacetFilter" ]
 *
 * @class
 * @extends libPictSectionInputExtension
 * @memberof providers.inputs
 */
class FacetFilterInputHandler extends libPictSectionInputExtension
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
		/** @type {any} */
		this.log;

		// Writing a sibling runs that sibling's change providers (this one included); only the user's change reconciles.
		this.reconciling = false;
	}

	/**
	 * @param {Object} pView
	 * @param {Record<string, any>} pInput
	 * @param {number|undefined} pRowIndex - undefined outside a table
	 * @param {any} pValue
	 */
	setFacetValue(pView, pInput, pRowIndex, pValue)
	{
		if ((typeof(pRowIndex) === 'number') || ((typeof(pRowIndex) === 'string') && (pRowIndex !== '')))
		{
			pView.setDataTabularByHash(pInput.PictForm.GroupIndex, pInput.Hash, pRowIndex, pValue);
			return;
		}
		pView.setDataByInput(pInput, pValue);
	}

	/**
	 * Reconciles the changed input's facet siblings; see the class description.
	 *
	 * @param {Object} pView
	 * @param {Record<string, any>} pInput - the input the user changed
	 * @param {number} [pRowIndex]
	 * @return {Array<string>} hashes of the siblings whose value was changed
	 */
	reconcileFacets(pView, pInput, pRowIndex)
	{
		if (this.reconciling)
		{
			return [];
		}
		this.reconciling = true;
		try
		{
			return this.reconcileFacetSiblings(pView, pInput, pRowIndex);
		}
		finally
		{
			this.reconciling = false;
		}
	}

	/**
	 * @param {Object} pView
	 * @param {Record<string, any>} pInput - the input the user changed
	 * @param {number} [pRowIndex]
	 * @return {Array<string>} hashes of the siblings whose value was changed
	 */
	reconcileFacetSiblings(pView, pInput, pRowIndex)
	{
		const tmpDistilling = this.pict.providers.ListDistilling;
		const tmpSiblings = tmpDistilling.getFacetSiblings(pView, pInput, pRowIndex);
		const tmpChanged = [];
		if (tmpSiblings.length < 2)
		{
			return tmpChanged;
		}

		const tmpKept = tmpSiblings.map((pSibling) => (pSibling.Input === pInput));
		for (let i = 0; i < tmpSiblings.length; i++)
		{
			const tmpSibling = tmpSiblings[i];
			if (tmpKept[i] || tmpDistilling.isEmptyFacetValue(tmpSibling.Value))
			{
				tmpKept[i] = true;
				continue;
			}
			const tmpConstraining = tmpSiblings.map((pOther, pIndex) => ({ Input: pOther.Input, Rule: pOther.Rule, Value: tmpKept[pIndex] ? pOther.Value : '' }));
			const tmpAllowed = tmpDistilling.getFacetAllowedValues(pView, tmpSibling.Input, tmpSibling.Rule, pRowIndex, tmpConstraining);
			if (tmpAllowed.has(String(tmpSibling.Value)) || (tmpSibling.Rule.ClearInvalid === false))
			{
				tmpKept[i] = true;
				continue;
			}
			tmpSibling.Value = '';
			this.setFacetValue(pView, tmpSibling.Input, pRowIndex, '');
			tmpChanged.push(tmpSibling.Input.Hash);
			tmpKept[i] = true;
		}

		for (let tmpPass = 0; tmpPass < tmpSiblings.length; tmpPass++)
		{
			let tmpFilled = false;
			for (const tmpSibling of tmpSiblings)
			{
				if ((tmpSibling.Input === pInput) || !tmpDistilling.isEmptyFacetValue(tmpSibling.Value) || (tmpSibling.Rule.AutoFillSingle === false))
				{
					continue;
				}
				const tmpAllowed = tmpDistilling.getFacetAllowedValues(pView, tmpSibling.Input, tmpSibling.Rule, pRowIndex, tmpSiblings);
				if (tmpAllowed.size === 1)
				{
					tmpSibling.Value = tmpAllowed.values().next().value;
					this.setFacetValue(pView, tmpSibling.Input, pRowIndex, tmpSibling.Value);
					tmpChanged.push(tmpSibling.Input.Hash);
					tmpFilled = true;
				}
			}
			if (!tmpFilled)
			{
				break;
			}
		}

		for (const tmpSibling of tmpSiblings)
		{
			if (tmpSibling.Rule.CarryFields && (typeof(tmpSibling.Rule.CarryFields) === 'object'))
			{
				this.carryFields(pView, tmpSibling, pRowIndex, tmpSiblings);
			}
		}
		return tmpChanged;
	}

	/**
	 * Copies a sibling's CarryFields from the one join record its facet set identifies, or clears them.
	 *
	 * @param {Object} pView
	 * @param {{ Input: Record<string, any>, Rule: Record<string, any>, Value: any }} pSibling
	 * @param {number|undefined} pRowIndex
	 * @param {Array<{ Input: Record<string, any>, Rule: Record<string, any>, Value: any }>} pSiblings
	 */
	carryFields(pView, pSibling, pRowIndex, pSiblings)
	{
		const tmpDistilling = this.pict.providers.ListDistilling;
		let tmpRecord = null;
		if (!tmpDistilling.isEmptyFacetValue(pSibling.Value))
		{
			const tmpMatches = tmpDistilling.getFacetMatchingRecords(pView, pSibling.Input, pSibling.Rule, pRowIndex, pSiblings)
				.filter((pJoinRecord) => String(this.pict.manifest.getValueAtAddress(pJoinRecord, pSibling.Rule.JoinListValueAddress)) === String(pSibling.Value));
			tmpRecord = (tmpMatches.length === 1) ? tmpMatches[0] : null;
		}
		const tmpIsTabular = (typeof(pRowIndex) === 'number') || ((typeof(pRowIndex) === 'string') && (pRowIndex !== ''));
		const tmpTarget = tmpIsTabular ? pView.getTabularRecordData(pSibling.Input.PictForm.GroupIndex, pRowIndex) : pView.getMarshalDestinationObject();
		if (!tmpTarget)
		{
			return;
		}
		for (const tmpRowAddress of Object.keys(pSibling.Rule.CarryFields))
		{
			const tmpValue = tmpRecord ? this.pict.manifest.getValueAtAddress(tmpRecord, pSibling.Rule.CarryFields[tmpRowAddress]) : '';
			this.pict.manifest.setValueAtAddress(tmpTarget, tmpRowAddress, (tmpValue === undefined) ? '' : tmpValue);
		}
	}

	/**
	 * @param {Object} pView - The view object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The new value.
	 * @param {string} pHTMLSelector - The HTML selector.
	 * @param {string} pTransactionGUID - The transaction GUID, if any.
	 * @returns {any}
	 */
	onDataChange(pView, pInput, pValue, pHTMLSelector, pTransactionGUID)
	{
		this.reconcileFacets(pView, pInput);
		return super.onDataChange(pView, pInput, pValue, pHTMLSelector, pTransactionGUID);
	}

	/**
	 * @param {Object} pView - The view object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The new value.
	 * @param {string} pHTMLSelector - The HTML selector.
	 * @param {number} pRowIndex - The index of the row.
	 * @param {string} pTransactionGUID - The transaction GUID, if any.
	 * @returns {any}
	 */
	onDataChangeTabular(pView, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID)
	{
		this.reconcileFacets(pView, pInput, pRowIndex);
		return super.onDataChangeTabular(pView, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID);
	}
}

module.exports = FacetFilterInputHandler;

module.exports.default_configuration = (
{
	"ProviderIdentifier": "Pict-Input-FacetFilter",
	"AutoInitialize": true,
	"AutoInitializeOrdinal": 0,
	"AutoSolveWithApp": false
});
