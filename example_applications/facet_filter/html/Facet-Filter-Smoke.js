/*
	Scripted walkthrough of the Facet Filter example, run only when the page is opened with ?smoke=1.
	It drives the real dropdowns the way a user does and writes its checks to #Facet-Filter-Smoke-Results
	(data-results, base64 JSON) for Facet-Filter-Smoke-Runner.js; the same checks print to the console.
*/
(function ()
{
	if (!/[?&]smoke=1\b/.test(window.location.search))
	{
		return;
	}

	var tmpChecks = [];
	var fWait = function (pMilliseconds)
	{
		return new Promise(function (fResolve) { setTimeout(fResolve, pMilliseconds); });
	};
	var fCheck = function (pLabel, pPassed, pDetail)
	{
		tmpChecks.push({ Label: pLabel, Passed: !!pPassed, Detail: pPassed ? undefined : pDetail });
		console.log((pPassed ? '[ok] ' : '[fail] ') + pLabel + (pPassed ? '' : ' -- ' + JSON.stringify(pDetail)));
	};
	var fSame = function (pLeft, pRight)
	{
		return JSON.stringify((pLeft || []).slice().sort()) === JSON.stringify((pRight || []).slice().sort());
	};
	var fPublish = function ()
	{
		var tmpElement = document.createElement('div');
		tmpElement.id = 'Facet-Filter-Smoke-Results';
		tmpElement.setAttribute('data-results', window.btoa(unescape(encodeURIComponent(JSON.stringify(tmpChecks)))));
		document.body.appendChild(tmpElement);
		document.title = 'FacetFilterSmoke:done';
	};

	var fView = function () { return window._Pict.views['PictSectionForm-Order']; };
	var fColumn = function (pGroupHash, pKey)
	{
		var tmpView = fView();
		var tmpGroupIndex = tmpView.getGroupIndexFromHash(pGroupHash);
		var tmpInputIndex = tmpView.getGroup(tmpGroupIndex).supportingManifest.elementAddresses.indexOf(pKey);
		return { GroupIndex: tmpGroupIndex, InputIndex: tmpInputIndex, Input: tmpView.getTabularRecordInput(tmpGroupIndex, tmpInputIndex) };
	};
	var fSelect = function (pGroupHash, pKey, pRow)
	{
		return document.getElementById('SELECT-TABULAR-DROPDOWN-' + fColumn(pGroupHash, pKey).Input.Macro.RawHTMLID + '-' + pRow);
	};
	var fOffered = function (pGroupHash, pKey, pRow)
	{
		return Array.prototype.map.call(fSelect(pGroupHash, pKey, pRow).options, function (pOption) { return pOption.value; });
	};
	var fRow = function (pGroupHash, pRow)
	{
		var tmpColumn = fColumn(pGroupHash, 'Book');
		return fView().getTabularRecordData(tmpColumn.GroupIndex, pRow) || {};
	};
	var fChoose = function (pGroupHash, pKey, pRow, pValue)
	{
		var tmpColumn = fColumn(pGroupHash, pKey);
		fSelect(pGroupHash, pKey, pRow).value = pValue;
		fView().inputDataRequestTabular(String(tmpColumn.GroupIndex), String(tmpColumn.InputIndex), String(pRow));
	};

	var fRun = async function ()
	{
		var tmpStart = Date.now();
		while (!(window._Pict && window._Pict.views.PictFormMetacontroller && window._Pict.views.PictFormMetacontroller.FirstRenderCompleted && fView()))
		{
			if ((Date.now() - tmpStart) > 20000)
			{
				fCheck('the form rendered', false, 'timed out');
				return fPublish();
			}
			await fWait(50);
		}
		await fWait(200);
		var tmpOrder = window._Pict.AppData.Order;

		fCheck('the catalog graph loaded once, active publishers only', (window._Pict.AppData.Catalog.Graph || []).length === 15, (window._Pict.AppData.Catalog.Graph || []).length);
		fCheck('the Genre list skips the book without a genre (SkipEmpty)', fSame(fOffered('Lines', 'Genre', 1), [ 'History', 'Mystery', 'Poetry', 'Science' ]), fOffered('Lines', 'Genre', 1));
		fCheck('the saved out-of-print book still shows on its own row (KeepCurrentValue)', fSelect('Lines', 'Book', 0).value === '109', fSelect('Lines', 'Book', 0).value);
		fCheck('...but is not offered on another row', fOffered('Lines', 'Book', 1).indexOf('109') < 0, fOffered('Lines', 'Book', 1));
		fCheck('the saved line keeps the price carried when it was picked', tmpOrder.Lines[0].Price === 18, tmpOrder.Lines[0].Price);

		fChoose('Lines', 'Genre', 1, 'History');
		await fWait(50);
		fCheck('picking History fills its only author', fRow('Lines', 1).Author === 'M. Petrov', fRow('Lines', 1));
		fCheck('...narrows Book to that author\'s in-print books at active publishers', fSame(fOffered('Lines', 'Book', 1), [ '111', '112' ]), fOffered('Lines', 'Book', 1));
		fCheck('...and leaves Book blank because two remain', !fRow('Lines', 1).Book, fRow('Lines', 1));

		fChoose('Lines', 'Book', 1, '112');
		await fWait(50);
		fCheck('picking a book carries its price and format', (fRow('Lines', 1).Price === 25) && (fRow('Lines', 1).Format === 'Paperback'), fRow('Lines', 1));
		fCheck('the order total sees it in the same solve', Number(tmpOrder.Total) === 61, { Total: tmpOrder.Total, Lines: tmpOrder.Lines });

		fChoose('Lines', 'Author', 2, 'R. Okafor');
		await fWait(50);
		fCheck('picking an author with one in-print book fills genre and book', (fRow('Lines', 2).Genre === 'Science') && (fRow('Lines', 2).Book === '108') && (fRow('Lines', 2).Price === 24), fRow('Lines', 2));

		fChoose('Lines', 'Genre', 2, 'Poetry');
		await fWait(50);
		fCheck('changing the genre keeps it and clears the author and book it contradicts', (fRow('Lines', 2).Genre === 'Poetry') && !fRow('Lines', 2).Author && !fRow('Lines', 2).Book && !fRow('Lines', 2).Price, fRow('Lines', 2));
		fCheck('the Author list narrows to the new genre', fSame(fOffered('Lines', 'Author', 2), [ 'A. Marlowe', 'E. Sato' ]), fOffered('Lines', 'Author', 2));
		fCheck('other rows are untouched', fRow('Lines', 1).Book === '112', fRow('Lines', 1));

		fChoose('CompareLines', 'Book', 0, '104');
		await fWait(50);
		fCheck('symmetric table: picking a book fills its genre and author', (fRow('CompareLines', 0).Genre === 'Mystery') && (fRow('CompareLines', 0).Author === 'C. Duval'), fRow('CompareLines', 0));
		fCheck('symmetric table: that row\'s Genre list now holds only the book\'s genre', fSame(fOffered('CompareLines', 'Genre', 0), [ 'Mystery' ]), fOffered('CompareLines', 'Genre', 0));
		fCheck('left-narrowing table: its Genre list stays whole', fSame(fOffered('Lines', 'Genre', 2), [ 'History', 'Mystery', 'Poetry', 'Science' ]), fOffered('Lines', 'Genre', 2));

		var tmpLanguageSelect = document.getElementById('SELECT-FOR-' + fView().getInputFromHash('OrderLanguage').Macro.RawHTMLID);
		tmpLanguageSelect.value = 'FR';
		fView().inputDataRequest('OrderLanguage');
		await fWait(50);
		fCheck('a form-level Language narrows every row\'s lists', fSame(fOffered('CompareLines', 'Author', 1), [ 'C. Duval' ]), fOffered('CompareLines', 'Author', 1));
		fCheck('...but a row keeps offering the value it already holds (Poetry stays next to French Mystery)', fSame(fOffered('Lines', 'Genre', 2), [ 'Mystery', 'Poetry' ]), fOffered('Lines', 'Genre', 2));
		fCheck('...without rewriting rows already chosen', fRow('Lines', 1).Book === '112', fRow('Lines', 1));

		fPublish();
	};

	fRun().catch(function (pError)
	{
		fCheck('the walkthrough ran', false, String(pError && pError.stack ? pError.stack : pError));
		fPublish();
	});
})();
