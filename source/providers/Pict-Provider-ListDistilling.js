const libPictProvider = require('pict-provider');

/** @type {Record<string, any>} */
const _DefaultProviderConfiguration = (
{
	"ProviderIdentifier": "Pict-DynamicForms-ListDistilling",

	"AutoInitialize": true,
	"AutoInitializeOrdinal": 0,

	"AutoSolveWithApp": false
});

/**
 * The PictListDistilling class is a provider that filters lists based on input rules.
 */
class PictListDistilling extends libPictProvider
{
	/**
	 *
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
	}

	/*
	  * This is a sidecar just for making filtration simpler.
	  *
	  * Types of Filtration:
	  * 1. Filter by an explicit value list (union of a set of values)
	  *   Example (explicit:
	  *		{ FilterType: "Explicit", FilterList: ["B", "C"] }
	  *   Example (implicit):
	  * 	{ FilterType: "Explicit", FilterListAddress: 'AppData.Bundle.Colors' }
	  * 2. Filter by a cross-map to a "join" list
	  *   Example (explicit):
	  * 	{ FilterType: "CrossMap", FilterValue:10, FilterValueAddress:'IDColor', FilterValueLookupAddress:'AppData.CurrentSelections.IDColor', FilterMap: [{IDColor:10, IDFruit:20}, {IDColor:10, IDFruit:30, {IDColor:20, IDFruit:30}] }
	  *   Example (implicit):
	  * 	{ FilterType: "CrossMap", FilterValue:10, FilterValueAddress:'IDColor', FilterValueLookupAddress:'AppData.CurrentSelections.IDColor', FilterMapAddress: 'AppData.Bundle.ColorFruitJoin' }
	  * 3. Filter by a string match (from an address?!  Would be cool)
	  *   Example:
	  * 	{ FilterType: "StringMatch", StringMatch: '*Apple* }
	  */
	/**
	  * Filter a list of options based on the filtering rules in a dynamic form input.
	  *
	  * Example Configuration:
	  * ...
			"ListFilterRules": [
					{
						"Filter": "Colour Entry Filter",
						"FilterType": "Explicit",
						"FilterValueComparison": "==",
						"FilterValueAddress": "Listopia.Filters.Colour",
						"IgnoreEmptyValue": true
					},
					{
						"Filter": "Colour List Distilling Filter",
						"FilterType": "CrossMap",
						"JoinListAddress": "View.sectionDefinition.Intersections.Colors.FruitSelectionColorsJoin",
						"JoinListAddressGlobal": true,
						"JoinListValueAddress": "GUIDColors",
						"ExternalValueAddress": "GUIDFruitSelection",
						"FilterToValueAddress": "Listopia.Fruit",
						"IgnoreEmpty": true
					}
				],
	  * ...
	  *
	  * @param {Object} pView - The pict view the list is within
	  * @param {*} pInput - The input within the dynamic forms view
	  * @param {*} pList - The raw list of options to filter
	  * @param {number} [pRowIndex] - The tabular row the list is for; Facet rules read sibling values from this row
	  * @returns
	  */
	filterList(pView, pInput, pList, pRowIndex)
	{
		// The list is expected to be an array of objects with "id" and "text" properties.  This is because of Select2.
		if (typeof(pInput) != 'object')
		{
			this.log.warn(`FilterList failed because the input is not an object.`);
			return pList;
		}
		if (!('PictForm' in pInput))
		{
			this.log.warn(`FilterList failed because the input does not have a PictForm stanza object.`);
			return pList;
		}
		if (!Array.isArray(pList))
		{
			this.log.warn(`FilterList for input [${pInput.Hash}] failed because the list is not an array.`);
			return [];
		}
		let tmpFilterRules = pInput.PictForm.ListFilterRules;
		if ((!tmpFilterRules) || (tmpFilterRules.length == 0) || (!Array.isArray(tmpFilterRules)))
		{
			return pList;
		}

		// Facet rules resolve to a set of allowed values once per list build rather than once per option.
		const tmpFacetAllowedValues = tmpFilterRules.map((pRule) => (pRule && (pRule.FilterType === 'Facet')) ? this.getFacetOfferedValues(pView, pInput, pRule, pRowIndex) : null);

		// Make a copy of the incoming list of options
		let tmpFilteredList = pList.slice(0);
		// We walk backwards so we can remove items from the end without breaking this loop.
		for (let h = pList.length - 1; h >= 0; h--)
		{
			let tmpListEntry = pList[h];
			let tmpEntryAllowed = true;
			for (let i = 0; i < tmpFilterRules.length; i++)
			{
				let tmpFilterRule = tmpFilterRules[i];

				// Remember that options are objects with "id" and "text" properties.  Because of Select2.
				// Genericising this with templating.  Most users will not leverage this technology.
				let tmpRecordComparisonValueAddress = ('FilteredRecordComparisonValue' in tmpFilterRule) ? tmpFilterRule.FilteredRecordComparisonValueAddress : false;
				let tmpComparisonValue;
				if (!tmpRecordComparisonValueAddress)
				{
					// Presume it's filtering on 'id'
					tmpComparisonValue = tmpListEntry.id;
				}
				else
				{
					tmpComparisonValue = pView.getValueByHash(tmpRecordComparisonValueAddress);
				}

				switch(tmpFilterRule.FilterType)
				{
					case 'Explicit':
						let tmpExplicitFilterValueAddress = tmpFilterRule.FilterValueAddress;
						let tmpExplicitFilterValueComparison = ('FilterValueComparison' in tmpFilterRule) ? tmpFilterRule.FilterValueComparison : '==';
						let tmpExplicitFilterIgnoreEmpty = ('IgnoreEmptyValue' in tmpFilterRule) ? tmpFilterRule.IgnoreEmptyValue : false;

						// TODO: This can be massively optimized by only solving this when something changes in the data location.
						//       Cache invalidation will be a PITA on this one.
						let tmpExplicitFilterValue = pView.getValueByHash(tmpExplicitFilterValueAddress);

						if (tmpExplicitFilterIgnoreEmpty && ((!tmpExplicitFilterValue) || (tmpExplicitFilterValue == '')))
						{
							// The comparison value is empty, so ignore it.
							break;
						}

						// Now check each value in the list to see if it matches the filter.
						switch(tmpExplicitFilterValueComparison.toLowerCase())
						{
							// Equal To
							case '=':
							case '==':
							case 'eq':
								if (tmpComparisonValue != tmpExplicitFilterValue)
								{
									this.fable.log.debug(`FilterList: ${tmpComparisonValue} != ${tmpExplicitFilterValue}; distilling is removing from the outcome array.`);
									tmpEntryAllowed = false;
								}
								break;

							// Not Equal
							case '!=':
							case 'ne':
								if (tmpComparisonValue == tmpExplicitFilterValue)
								{
									this.fable.log.debug(`FilterList: ${tmpComparisonValue} == ${tmpExplicitFilterValue}; distilling is removing from the outcome array.`);
									tmpEntryAllowed = false;
								}
								break;

							// Approximately Equal
							case '~=':
							case 'ae':
								if (tmpComparisonValue == tmpExplicitFilterValue)
								{
									this.fable.log.debug(`FilterList: ${tmpComparisonValue} == ${tmpExplicitFilterValue}; distilling is removing from the outcome array.`);
									tmpEntryAllowed = false;
								}
								break;
						}
						break;

					case 'CrossMap':
						// Filter based on a list of "join" records, with:
						// A "JoinListAddress" address - where to find the list of joins in the application state
						// A "JoinListAddressGlobal" boolean - if the list is global or not (global means scoped to pict vs appdata/state location)
						// A "JoinListValueAddress" address - the address within the record that maps to the ID of the list value
						// A "ExternalValueAddress" address - the address of the external value we are comparing to
						// A "FilterToValueAddress" address - the external address to use to see if the ExternalValue matches
						// A "IgnoreEmpty" boolean - makes the tech ignore empty ExternalValue (including undefined etc.)
						//
						// So for example, if you had a list of Colors with id: "Red", "Green", "Blue"
						/*
							...And you had a list of joins they would be something like:
							AppData.BrandList [
								{ Brand: "Santa", DominantColor: "Red"},
								{ Brand: "Subaru", DominantColor: "Off White"},
								{ Brand: "Subaru", DominantColor: "Green"},
								{ Brand: "IBM", DominantColor: "Blue"},
								{ .... }
							]

							...And somewhere else we had the following state:

							AppData.SelectedBrand: "Subaru"
						*/
						/*
							The values would be:
								-> JoinListAddress: "AppData.BrandList"
								-> JoinListAddressGlobal: false
								-> JoinListValueAddress: "Record.Color"          <-- (this maps to the id in the select list)
								-> ExternalValueAddress: "Record.Brand"          <-- (this maps to the id for the external lookup)
								-> FilterToValueAddress: "AppData.SelectedBrand"
								-> IgnoreEmpty: true                             <-- Don't filter if the AppData.SelectedBrand is an empty string or such
						*/
						let tmpJoinListAddress = tmpFilterRule.JoinListAddress;
						let tmpJoinListAddressGlobal = ('JoinListAddressGlobal' in tmpFilterRule) ? tmpFilterRule.JoinListAddressGlobal : false;
						let tmpJoinListValueAddress = tmpFilterRule.JoinListValueAddress;
						let tmpExternalValueAddress = tmpFilterRule.ExternalValueAddress;
						let tmpFilterToValueAddress = tmpFilterRule.FilterToValueAddress;
						let tmpIgnoreEmpty = ('IgnoreEmpty' in tmpFilterRule) ? tmpFilterRule.IgnoreEmpty : false;

						let tmpJoinList;

						if (tmpJoinListAddressGlobal)
						{
							const tmpAddressSpace =
							{
								Fable: this.pict,
								Pict: this.pict,
								AppData: this.pict.AppData,
								Bundle: this.pict.Bundle,
								View: pView,
							};

							tmpJoinList = this.pict.manifest.getValueAtAddress(tmpAddressSpace, tmpJoinListAddress);
						}
						else
						{
							tmpJoinList = pView.getValueByHash(tmpJoinListAddress);
						}
						let tmpFilterToValueAddressValue = pView.getValueByHash(tmpFilterToValueAddress);

						if (tmpIgnoreEmpty && ((!tmpFilterToValueAddressValue) || (tmpFilterToValueAddressValue == '')))
						{
							// The comparison value is empty, so ignore it.
							break;
						}
						if ((!Array.isArray(tmpJoinList)) && (tmpJoinList != null) && (typeof(tmpJoinList) == 'object'))
						{
							let tmpJoinListKeys = Object.keys(tmpJoinList);
							let tmpNewJoinList = [];
							for (let i = 0; i < tmpJoinListKeys.length; i++)
							{
								tmpNewJoinList.push(tmpJoinList[tmpJoinListKeys[i]]);
							}
							tmpJoinList = tmpNewJoinList;
						}

						if ((!Array.isArray(tmpJoinList)) || (tmpJoinList.length == 0))
						{
							// The join list is not an array.  We can't filter it.
							break;
						}

						//this.pict.log.trace(`FilterList: CrossMap: JoinListAddress[${tmpJoinListAddress}](${tmpJoinList.length})->${tmpJoinListValueAddress} ExternalValueAddress[${tmpExternalValueAddress}] FilterToValueAddress[${tmpFilterToValueAddress}]`);

						// TODO: This is not industrial grade, yo.  Small lists only please.  O(n^2) is not cool.
						let tmpPossiblyAllowed = false;
						for (let i = 0; i < tmpJoinList.length; i++)
						{
							let tmpJoinListValue = this.pict.manifest.getValueAtAddress(tmpJoinList[i], tmpJoinListValueAddress);
							let tmpExternalValue = this.pict.manifest.getValueAtAddress(tmpJoinList[i], tmpExternalValueAddress);

							if (tmpIgnoreEmpty && ((!tmpJoinListValue) || (tmpJoinListValue == '')))
							{
								// The comparison value is empty, so ignore it.
								continue;
							}

							//this.pict.log.trace(`          CrossMap Test: JoinListValue[${tmpJoinListValue}]<==>ComparisonValue[${tmpComparisonValue}] ExternalValue[${tmpExternalValue}]<==>FilterToValue[${tmpFilterToValueAddressValue}]`);
							if ((tmpFilterToValueAddressValue == tmpExternalValue) && (tmpJoinListValue == tmpComparisonValue))
							{
								//this.pict.log.trace(`   !!! CrossMap: Matched: ${tmpJoinListValue} == ${tmpComparisonValue} && ${tmpExternalValue} == ${tmpFilterToValueAddressValue}`);
								tmpPossiblyAllowed = true;
								break;
							}
						}
						tmpEntryAllowed = tmpPossiblyAllowed && tmpEntryAllowed;

						break;

					case 'Facet':
						if (tmpFacetAllowedValues[i] && !tmpFacetAllowedValues[i].has(String(tmpComparisonValue)))
						{
							tmpEntryAllowed = false;
						}
						break;

					default:
						// See if there is a provider for it
						let tmpProvider = this.pict.providers[tmpFilterRule.FilterType];
						if (tmpProvider)
						{
							// Your provider could do anything here.
							// We may want a second place to bolt one of these on
							tmpEntryAllowed = tmpProvider.filterList(pView, pInput, pList, tmpListEntry);
						}
						break;
				}
			}

			if (!tmpEntryAllowed)
			{
				tmpFilteredList.splice(h,1);
			}
		}

		//this.log.trace(`FilterList: Input [${pInput.Hash}] has [${pList.length}] options to filter with [${tmpFilterRules.length}] rules.`);

		return tmpFilteredList;
	}

	/**
	 * @param {Record<string, any>} pInput
	 * @return {Record<string, any>|null} the input's Facet rule, if it has one
	 */
	getFacetRule(pInput)
	{
		const tmpRules = pInput && pInput.PictForm && pInput.PictForm.ListFilterRules;
		if (!Array.isArray(tmpRules))
		{
			return null;
		}
		return tmpRules.find((pRule) => pRule && (pRule.FilterType === 'Facet')) || null;
	}

	/**
	 * @param {Object} pView
	 * @param {Record<string, any>} pRule
	 * @return {Array<any>} the join list a Facet rule distills, as an array
	 */
	getFacetJoinList(pView, pRule)
	{
		let tmpJoinList;
		if (pRule.JoinListAddressGlobal)
		{
			const tmpAddressSpace = { Fable: this.pict, Pict: this.pict, AppData: this.pict.AppData, Bundle: this.pict.Bundle, View: pView };
			tmpJoinList = this.pict.manifest.getValueAtAddress(tmpAddressSpace, pRule.JoinListAddress);
		}
		else
		{
			tmpJoinList = pView.getValueByHash(pRule.JoinListAddress);
		}
		if (Array.isArray(tmpJoinList))
		{
			return tmpJoinList;
		}
		if (tmpJoinList && (typeof(tmpJoinList) === 'object'))
		{
			return Object.values(tmpJoinList);
		}
		return [];
	}

	/**
	 * Every input that shares a Facet rule's join list with pInput, in the same tabular row (or the same
	 * view, outside a table), with the value it currently holds.  pInput itself is included.
	 *
	 * @param {Object} pView
	 * @param {Record<string, any>} pInput
	 * @param {number} [pRowIndex]
	 * @return {Array<{ Input: Record<string, any>, Rule: Record<string, any>, Value: any }>}
	 */
	getFacetSiblings(pView, pInput, pRowIndex)
	{
		const tmpRule = this.getFacetRule(pInput);
		if (!tmpRule)
		{
			return [];
		}
		const tmpSiblings = [];
		const fAdd = (pSiblingInput, fGetValue) =>
		{
			const tmpSiblingRule = this.getFacetRule(pSiblingInput);
			if (tmpSiblingRule && (tmpSiblingRule.JoinListAddress === tmpRule.JoinListAddress))
			{
				tmpSiblings.push({ Input: pSiblingInput, Rule: tmpSiblingRule, Value: fGetValue(pSiblingInput) });
			}
		};
		const tmpIsTabular = (typeof(pRowIndex) === 'number') || ((typeof(pRowIndex) === 'string') && (pRowIndex !== ''));
		if (tmpIsTabular)
		{
			const tmpGroupIndex = pInput.PictForm.GroupIndex;
			const tmpGroup = pView.getGroup(tmpGroupIndex);
			const tmpRecord = pView.getTabularRecordData(tmpGroupIndex, pRowIndex) || {};
			const tmpAddresses = (tmpGroup && tmpGroup.supportingManifest) ? tmpGroup.supportingManifest.elementAddresses : [];
			for (let i = 0; i < tmpAddresses.length; i++)
			{
				const tmpSiblingInput = pView.getTabularRecordInput(tmpGroupIndex, i);
				if (tmpSiblingInput)
				{
					fAdd(tmpSiblingInput, (pSibling) => tmpGroup.supportingManifest.getValueByHash(tmpRecord, pSibling.DataAddress || tmpAddresses[i]));
				}
			}
			return tmpSiblings;
		}
		const tmpDescriptors = (pView.sectionManifest && pView.sectionManifest.elementDescriptors) ? pView.sectionManifest.elementDescriptors : {};
		for (const tmpAddress of Object.keys(tmpDescriptors))
		{
			const tmpSiblingInput = tmpDescriptors[tmpAddress];
			if (tmpSiblingInput && tmpSiblingInput.PictForm && !tmpSiblingInput.IsTabular)
			{
				fAdd(tmpSiblingInput, (pSibling) => pView.getValueByHash(pSibling.Hash));
			}
		}
		return tmpSiblings;
	}

	/**
	 * @param {any} pValue
	 * @return {boolean}
	 */
	isEmptyFacetValue(pValue)
	{
		return (pValue === undefined) || (pValue === null) || (pValue === '');
	}

	/**
	 * The values a Facet rule's dropdown offers: the allowed values (narrowed per the rule's NarrowBy), plus
	 * the input's own current value unless KeepCurrentValue is false, so a filter never hides what the row
	 * already stores (a saved choice that has since fallen out of scope still shows).
	 *
	 * @param {Object} pView
	 * @param {Record<string, any>} pInput
	 * @param {Record<string, any>} pRule - the input's Facet rule
	 * @param {number} [pRowIndex]
	 * @return {Set<string>}
	 */
	getFacetOfferedValues(pView, pInput, pRule, pRowIndex)
	{
		const tmpSiblings = this.getFacetSiblings(pView, pInput, pRowIndex);
		const tmpOffered = this.getFacetAllowedValues(pView, pInput, pRule, pRowIndex, tmpSiblings, pRule.NarrowBy);
		const tmpSelf = tmpSiblings.find((pSibling) => pSibling.Input === pInput);
		if ((pRule.KeepCurrentValue !== false) && tmpSelf && !this.isEmptyFacetValue(tmpSelf.Value))
		{
			tmpOffered.add(String(tmpSelf.Value));
		}
		return tmpOffered;
	}

	/**
	 * @param {any} pJoinValue - the value on the join record
	 * @param {string} pOperator - EQ (default), NE, LT, LE, GT or GE
	 * @param {string} pValue - the constraint value
	 * @return {boolean}
	 */
	compareFacetValue(pJoinValue, pOperator, pValue)
	{
		if (!pOperator || (pOperator === 'EQ'))
		{
			return String(pJoinValue) === pValue;
		}
		if (pOperator === 'NE')
		{
			return String(pJoinValue) !== pValue;
		}
		if (this.isEmptyFacetValue(pJoinValue))
		{
			return false;
		}
		// Numbers compare as numbers; anything else compares as text, and a bare YYYY-MM-DD compares against
		// only the date part of an ISO timestamp so a record dated that day is on the day, not after it.
		const tmpNumeric = (pJoinValue !== '') && (pValue !== '') && !isNaN(Number(pJoinValue)) && !isNaN(Number(pValue));
		let tmpLeft = tmpNumeric ? Number(pJoinValue) : String(pJoinValue);
		if (!tmpNumeric && /^\d{4}-\d{2}-\d{2}$/.test(pValue) && /^\d{4}-\d{2}-\d{2}T/.test(tmpLeft))
		{
			tmpLeft = tmpLeft.substring(0, 10);
		}
		const tmpRight = tmpNumeric ? Number(pValue) : pValue;
		switch (pOperator)
		{
			case 'LT':
				return tmpLeft < tmpRight;
			case 'LE':
				return tmpLeft <= tmpRight;
			case 'GT':
				return tmpLeft > tmpRight;
			case 'GE':
				return tmpLeft >= tmpRight;
			default:
				this.log.warn(`Facet constraint operator [${pOperator}] is not supported; the constraint is ignored.`);
				return true;
		}
	}

	/**
	 * The values a Facet rule's input may hold, given what its siblings hold: the distinct
	 * JoinListValueAddress values of the join records that agree with every constraining non-empty sibling
	 * value and every explicit facet.  Empty siblings do not constrain.
	 *
	 * pNarrowBy picks the constraining siblings: 'All' (default) is every sibling; 'Preceding' is only the
	 * siblings before this input (column order in a table), so a list offers every value its upstream
	 * choices allow and picking one never needs a downstream value cleared first.
	 *
	 * @param {Object} pView
	 * @param {Record<string, any>} pInput
	 * @param {Record<string, any>} pRule - the input's Facet rule
	 * @param {number} [pRowIndex]
	 * @param {Array<{ Input: Record<string, any>, Rule: Record<string, any>, Value: any }>} [pSiblings] - precomputed siblings (values may be overridden by the caller)
	 * @param {string} [pNarrowBy] - 'All' or 'Preceding'
	 * @return {Set<string>}
	 */
	getFacetAllowedValues(pView, pInput, pRule, pRowIndex, pSiblings, pNarrowBy)
	{
		const tmpAllowed = new Set();
		for (const tmpJoinRecord of this.getFacetMatchingRecords(pView, pInput, pRule, pRowIndex, pSiblings, pNarrowBy))
		{
			const tmpCandidate = this.pict.manifest.getValueAtAddress(tmpJoinRecord, pRule.JoinListValueAddress);
			if (!this.isEmptyFacetValue(tmpCandidate))
			{
				tmpAllowed.add(String(tmpCandidate));
			}
		}
		return tmpAllowed;
	}

	/**
	 * The join records that agree with every constraining non-empty sibling value and every explicit facet;
	 * see getFacetAllowedValues for pNarrowBy.  pInput's own value does not constrain.
	 *
	 * @param {Object} pView
	 * @param {Record<string, any>} pInput
	 * @param {Record<string, any>} pRule - the input's Facet rule
	 * @param {number} [pRowIndex]
	 * @param {Array<{ Input: Record<string, any>, Rule: Record<string, any>, Value: any }>} [pSiblings]
	 * @param {string} [pNarrowBy] - 'All' or 'Preceding'
	 * @return {Array<Record<string, any>>}
	 */
	getFacetMatchingRecords(pView, pInput, pRule, pRowIndex, pSiblings, pNarrowBy)
	{
		const tmpConstraints = [];
		const tmpSiblings = pSiblings || this.getFacetSiblings(pView, pInput, pRowIndex);
		const tmpOwnIndex = tmpSiblings.findIndex((pSibling) => pSibling.Input === pInput);
		for (let i = 0; i < tmpSiblings.length; i++)
		{
			const tmpSibling = tmpSiblings[i];
			if ((pNarrowBy === 'Preceding') && (tmpOwnIndex >= 0) && (i > tmpOwnIndex))
			{
				continue;
			}
			if ((tmpSibling.Input !== pInput) && !this.isEmptyFacetValue(tmpSibling.Value))
			{
				tmpConstraints.push({ Address: tmpSibling.Rule.JoinListValueAddress, Value: String(tmpSibling.Value) });
			}
		}
		for (const tmpFacet of (Array.isArray(pRule.Facets) ? pRule.Facets : []))
		{
			const tmpValue = ('ValueAddress' in tmpFacet) ? pView.getValueByHash(tmpFacet.ValueAddress) : tmpFacet.Value;
			if (!this.isEmptyFacetValue(tmpValue))
			{
				tmpConstraints.push({ Address: tmpFacet.JoinListValueAddress, Value: String(tmpValue), Operator: tmpFacet.Operator });
			}
		}
		return this.getFacetJoinList(pView, pRule).filter((pJoinRecord) =>
		{
			for (const tmpConstraint of tmpConstraints)
			{
				if (!this.compareFacetValue(this.pict.manifest.getValueAtAddress(pJoinRecord, tmpConstraint.Address), tmpConstraint.Operator, tmpConstraint.Value))
				{
					return false;
				}
			}
			return true;
		});
	}
}

module.exports = PictListDistilling;
module.exports.default_configuration = _DefaultProviderConfiguration;
