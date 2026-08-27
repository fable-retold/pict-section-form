/*
	Unit tests for source/Pict-Provider-Input-Diagram.js

	Verifies wiring (template injection, CSS, lifecycle guards, helper methods)
	without actually mounting Excalidraw. Deep edit-mode + scene extraction
	is covered by the puppeteer e2e.
*/

const libBrowserEnv = require('browser-env');
libBrowserEnv();

const Chai   = require('chai');
const Expect = Chai.expect;

const libPict = require('pict');

const libFormMain     = require('../source/Pict-Section-Form.js');
const libDiagramInput = libFormMain.DiagramInput;

const _StubInput =
{
	Name:     'ArchDiagram',
	Hash:     'ArchDiagram',
	DataType: 'String',
	Macro:
	{
		RawHTMLID:           'ArchDiagram-input',
		InputFullProperties: '',
		InputChangeHandler:  '',
		ControlAttr:         ''
	},
	PictForm:
	{
		InputType: 'Diagram',
		Diagram:
		{
			ThemeColors:          true,
			EditorImplementation: 'react'
		}
	}
};

function buildPictWithStubs()
{
	return new libPict();
}

/**
 * Swap window.localStorage for an in-memory shim. jsdom runs on an opaque origin where merely
 * READING window.localStorage throws, so a real round-trip can't be exercised without this.
 *
 * @param {Object} pStore - Backing object for the shim.
 * @return {Function} Restores the original descriptor.
 */
function withStubbedStorage(pStore)
{
	let tmpOriginal = Object.getOwnPropertyDescriptor(window, 'localStorage');
	Object.defineProperty(window, 'localStorage',
	{
		configurable: true,
		writable:     true,
		value:
		{
			getItem:    (pKey) => ((pKey in pStore) ? pStore[pKey] : null),
			setItem:    (pKey, pValue) => { pStore[pKey] = String(pValue); },
			removeItem: (pKey) => { delete pStore[pKey]; }
		}
	});
	return () =>
	{
		if (tmpOriginal) Object.defineProperty(window, 'localStorage', tmpOriginal);
		else delete window.localStorage;
	};
}

suite('Pict-Provider-Input-Diagram', () =>
{
	test('module loads — class + default_configuration exposed', () =>
	{
		Expect(typeof libDiagramInput).to.equal('function');
		Expect(libDiagramInput.default_configuration).to.be.an('object');
		Expect(libDiagramInput.default_configuration.ProviderIdentifier).to.equal('Pict-Input-Diagram');
	});

	test('canonical Diagram template hashes ship in the default template set', () =>
	{
		let tmpDefaults  = require('../source/providers/dynamictemplates/Pict-DynamicTemplates-DefaultFormTemplates.js');
		let tmpPostfixes = tmpDefaults.Templates.map((t) => t.HashPostfix);
		Expect(tmpPostfixes).to.include('-Template-Input-InputType-Diagram');
		Expect(tmpPostfixes).to.include('-VerticalTemplate-Input-InputType-Diagram');
	});

	test('every shipped Diagram template declares Pict-Input-Diagram as a DefaultInputExtension', () =>
	{
		let tmpDefaults = require('../source/providers/dynamictemplates/Pict-DynamicTemplates-DefaultFormTemplates.js');
		let tmpDiag     = tmpDefaults.Templates.filter((t) => /-InputType-Diagram$/.test(t.HashPostfix));
		Expect(tmpDiag.length).to.be.greaterThan(0);
		for (let i = 0; i < tmpDiag.length; i++)
		{
			Expect(tmpDiag[i].DefaultInputExtensions, 'entry ' + i).to.deep.equal(['Pict-Input-Diagram']);
		}
	});

	test('constructor registers CSS at priority 500', () =>
	{
		let tmpPict = buildPictWithStubs();
		tmpPict.addProvider('Pict-Input-Diagram',
			libDiagramInput.default_configuration, libDiagramInput);
		Expect(tmpPict.CSSMap.inlineCSSMap['Pict-Input-Diagram-CSS']).to.exist;
		Expect(tmpPict.CSSMap.inlineCSSMap['Pict-Input-Diagram-CSS'].Priority).to.equal(500);
	});

	test('onInputInitializeTabular throws with a helpful message', () =>
	{
		let tmpPict = buildPictWithStubs();
		tmpPict.addProvider('Pict-Input-Diagram',
			libDiagramInput.default_configuration, libDiagramInput);
		let tmpProvider = tmpPict.providers['Pict-Input-Diagram'];
		Expect(() => { tmpProvider.onInputInitializeTabular({}, {}, _StubInput, '', '#sel', 0, 'tx'); })
			.to.throw(/not supported inside Tabular rows/);
	});

	test('_isLikelySvg recognises an svg, rejects markdown / empty', () =>
	{
		let tmpPict = buildPictWithStubs();
		tmpPict.addProvider('Pict-Input-Diagram',
			libDiagramInput.default_configuration, libDiagramInput);
		let tmpProvider = tmpPict.providers['Pict-Input-Diagram'];
		Expect(tmpProvider._isLikelySvg('<svg xmlns="x"></svg>')).to.equal(true);
		Expect(tmpProvider._isLikelySvg('<svg>\nfoo')).to.equal(true);
		Expect(tmpProvider._isLikelySvg('## markdown')).to.equal(false);
		Expect(tmpProvider._isLikelySvg('')).to.equal(false);
		Expect(tmpProvider._isLikelySvg(null)).to.equal(false);
	});

	test('_buildViewHTML wraps an SVG, shows placeholder for empty', () =>
	{
		let tmpPict = buildPictWithStubs();
		tmpPict.addProvider('Pict-Input-Diagram',
			libDiagramInput.default_configuration, libDiagramInput);
		let tmpProvider = tmpPict.providers['Pict-Input-Diagram'];

		let tmpHTML = tmpProvider._buildViewHTML('<svg viewBox="0 0 10 10"><rect/></svg>');
		Expect(tmpHTML).to.include('class="pict-section-form-diagram-view"');
		Expect(tmpHTML).to.include('<svg viewBox="0 0 10 10">');

		let tmpEmpty = tmpProvider._buildViewHTML('');
		Expect(tmpEmpty).to.include('is-empty');
		Expect(tmpEmpty).to.include('empty diagram');
	});

	test('getMode returns null before mount', () =>
	{
		let tmpPict = buildPictWithStubs();
		tmpPict.addProvider('Pict-Input-Diagram',
			libDiagramInput.default_configuration, libDiagramInput);
		Expect(tmpPict.providers['Pict-Input-Diagram'].getMode('ArchDiagram')).to.equal(null);
	});

	test('setMode errors when input is not mounted', (done) =>
	{
		let tmpPict = buildPictWithStubs();
		tmpPict.addProvider('Pict-Input-Diagram',
			libDiagramInput.default_configuration, libDiagramInput);
		tmpPict.providers['Pict-Input-Diagram'].setMode('Unknown', 'edit', (pErr) =>
		{
			Expect(pErr).to.be.an('error');
			Expect(pErr.message).to.include('not mounted');
			done();
		});
	});

	test('setMode rejects unknown mode names', (done) =>
	{
		let tmpPict = buildPictWithStubs();
		tmpPict.addProvider('Pict-Input-Diagram',
			libDiagramInput.default_configuration, libDiagramInput);
		let tmpProvider = tmpPict.providers['Pict-Input-Diagram'];
		tmpProvider._instances['ArchDiagram'] = { mode: 'view', input: _StubInput, lastValue: '' };
		tmpProvider.setMode('ArchDiagram', 'preview', (pErr) =>
		{
			Expect(pErr).to.be.an('error');
			Expect(pErr.message).to.match(/unknown mode/);
			done();
		});
	});

	test('setMode is a no-op when already in the requested mode', (done) =>
	{
		let tmpPict = buildPictWithStubs();
		tmpPict.addProvider('Pict-Input-Diagram',
			libDiagramInput.default_configuration, libDiagramInput);
		let tmpProvider = tmpPict.providers['Pict-Input-Diagram'];
		tmpProvider._instances['ArchDiagram'] = { mode: 'view', input: _StubInput, lastValue: '<svg/>' };
		tmpProvider.setMode('ArchDiagram', 'view', (pErr) =>
		{
			Expect(pErr).to.equal(null);
			Expect(tmpProvider.getMode('ArchDiagram')).to.equal('view');
			done();
		});
	});

	// --- slot targeting -------------------------------------------------------------------------
	// A host template that gives the hidden <input> id="{RawHTMLID}" (it has to, if it wants the
	// provider's value write-back to find it) used to steal every mode class off the display slot,
	// which silently killed the open editor's sizing. The slot must win.

	test('_setSlotModeClass flags the DISPLAY SLOT, not a same-id hidden input', () =>
	{
		let tmpPict     = buildPictWithStubs();
		let tmpProvider = new libDiagramInput(tmpPict, {}, 'Pict-Input-Diagram');

		document.body.innerHTML =
			'<input type="hidden" id="ArchDiagram-input">' +
			'<div id="DISPLAY-FOR-ArchDiagram-input" class="pict-section-form-diagram"></div>';

		tmpProvider._setSlotModeClass(_StubInput, 'edit');

		let tmpSlot   = document.getElementById('DISPLAY-FOR-ArchDiagram-input');
		let tmpHidden = document.getElementById('ArchDiagram-input');
		Expect(tmpSlot.classList.contains('pict-section-form-diagram-edit')).to.equal(true);
		Expect(tmpSlot.classList.contains('mode-edit')).to.equal(true);
		Expect(tmpHidden.classList.contains('pict-section-form-diagram-edit')).to.equal(false);

		tmpProvider._setSlotModeClass(_StubInput, 'view');
		Expect(tmpSlot.classList.contains('mode-view')).to.equal(true);
		Expect(tmpSlot.classList.contains('pict-section-form-diagram-edit')).to.equal(false);
		document.body.innerHTML = '';
	});

	// --- editor height --------------------------------------------------------------------------

	test('_normalizeHeight coerces numbers and numeric strings to px, passes CSS lengths through', () =>
	{
		let tmpProvider = new libDiagramInput(buildPictWithStubs(), {}, 'Pict-Input-Diagram');
		Expect(tmpProvider._normalizeHeight(640)).to.equal('640px');
		Expect(tmpProvider._normalizeHeight('640')).to.equal('640px');
		Expect(tmpProvider._normalizeHeight('640px')).to.equal('640px');
		Expect(tmpProvider._normalizeHeight(' 40rem ')).to.equal('40rem');
		Expect(tmpProvider._normalizeHeight('')).to.equal('');
		Expect(tmpProvider._normalizeHeight(null)).to.equal('');
		Expect(tmpProvider._normalizeHeight(0)).to.equal('');
	});

	test('storage access that throws degrades to the descriptor Height', () =>
	{
		// jsdom serves an opaque origin, so even READING window.localStorage throws a SecurityError —
		// the same shape as Safari private mode. Nothing here may propagate that.
		let tmpProvider = new libDiagramInput(buildPictWithStubs(), {}, 'Pict-Input-Diagram');
		let tmpInput    = JSON.parse(JSON.stringify(_StubInput));
		tmpInput.PictForm.Diagram.Height = '480px';

		Expect(tmpProvider._readStoredHeight(tmpInput)).to.equal('');
		Expect(tmpProvider._writeStoredHeight(tmpInput, '720px')).to.equal(false);
		Expect(tmpProvider._resolveEditorHeight(tmpInput)).to.equal('480px');
	});

	test('_resolveEditorHeight prefers a stored height over the descriptor Height', () =>
	{
		let tmpProvider = new libDiagramInput(buildPictWithStubs(), {}, 'Pict-Input-Diagram');
		let tmpInput    = JSON.parse(JSON.stringify(_StubInput));
		tmpInput.PictForm.Diagram.Height = '480px';

		let tmpStore = {};
		let tmpRestore = withStubbedStorage(tmpStore);
		try
		{
			Expect(tmpProvider._resolveEditorHeight(tmpInput)).to.equal('480px');

			tmpProvider._writeStoredHeight(tmpInput, '720px');
			Expect(tmpProvider._resolveEditorHeight(tmpInput)).to.equal('720px');

			// and with neither, the stylesheet stays in charge
			delete tmpInput.PictForm.Diagram.Height;
			window.localStorage.removeItem(tmpProvider._heightStorageKey(tmpInput));
			Expect(tmpProvider._resolveEditorHeight(tmpInput)).to.equal('');
		}
		finally { tmpRestore(); }
	});

	test('_applyEditorHeight sets the CSS variable and _clearEditorHeight strips edit sizing', () =>
	{
		let tmpProvider = new libDiagramInput(buildPictWithStubs(), {}, 'Pict-Input-Diagram');
		let tmpInput    = JSON.parse(JSON.stringify(_StubInput));
		tmpInput.PictForm.Diagram.Height = '600px';

		document.body.innerHTML = '<div id="DISPLAY-FOR-ArchDiagram-input"></div>';
		let tmpSlot = document.getElementById('DISPLAY-FOR-ArchDiagram-input');

		// jsdom's CSSStyleDeclaration silently DROPS custom properties, so read them off a spy rather
		// than off the element — the assertion is about what the provider asks for.
		let tmpSet = [];
		let tmpRemoved = [];
		tmpSlot.style.setProperty    = (pName, pValue) => tmpSet.push([pName, pValue]);
		tmpSlot.style.removeProperty = (pName) => tmpRemoved.push(pName);

		tmpProvider._applyEditorHeight(tmpInput);
		Expect(tmpSet).to.deep.equal([['--pict-diagram-height', '600px']]);
		// any inline height left by an earlier drag has to go, or the variable never applies
		Expect(tmpRemoved).to.deep.equal(['height']);

		// dropping to view must not leave the static view pinned to the dragged size
		tmpRemoved.length = 0;
		tmpProvider._clearEditorHeight(tmpInput);
		Expect(tmpRemoved).to.deep.equal(['height', 'width', '--pict-diagram-height']);
		document.body.innerHTML = '';
	});

	test('_captureEditorHeight remembers a dragged height, and ONLY a dragged one', () =>
	{
		let tmpProvider = new libDiagramInput(buildPictWithStubs(), {}, 'Pict-Input-Diagram');
		let tmpInput    = JSON.parse(JSON.stringify(_StubInput));
		tmpInput.PictForm.Diagram.Height = '480px';

		document.body.innerHTML = '<div id="DISPLAY-FOR-ArchDiagram-input"></div>';
		let tmpSlot = document.getElementById('DISPLAY-FOR-ArchDiagram-input');

		let tmpStore = {};
		let tmpRestore = withStubbedStorage(tmpStore);
		try
		{
			// No inline height — the descriptor's value is not the user's decision and must not stick.
			Expect(tmpProvider._captureEditorHeight(tmpInput)).to.equal(false);
			Expect(tmpProvider._resolveEditorHeight(tmpInput)).to.equal('480px');

			// The grip writes an inline height; that IS a decision.
			tmpSlot.style.height = '820px';
			Expect(tmpProvider._captureEditorHeight(tmpInput)).to.equal(true);
			Expect(tmpProvider._resolveEditorHeight(tmpInput)).to.equal('820px');
		}
		finally { tmpRestore(); document.body.innerHTML = ''; }
	});

	test('_buildEditorOptions defaults FormFactor to pointer and honours a descriptor override', () =>
	{
		let tmpPict     = buildPictWithStubs();
		let tmpProvider = new libDiagramInput(tmpPict, {}, 'Pict-Input-Diagram');
		let tmpInput    = JSON.parse(JSON.stringify(_StubInput));

		Expect(tmpProvider._buildEditorOptions(tmpInput, '', {}).FormFactor).to.equal('pointer');

		tmpInput.PictForm.Diagram.FormFactor = 'auto';
		Expect(tmpProvider._buildEditorOptions(tmpInput, '', {}).FormFactor).to.equal('auto');
	});

	test('the open-editor CSS drives height from a variable and ships the resize grip', () =>
	{
		let tmpCSS = require('../source/providers/inputs/Pict-Provider-Input-Diagram-CSS.js');
		Expect(tmpCSS).to.contain('--pict-diagram-height');
		Expect(tmpCSS).to.contain('resize: vertical');
		// a min-height on the inner chain would fight the grip on the way down
		Expect(/\.pict-section-form-diagram-edit[^{]*\{[^}]*min-height:\s*420px/.test(tmpCSS)).to.equal(false);
	});

	test('themeifySVG re-export is callable from the main module entry', () =>
	{
		Expect(typeof libFormMain.themeifySVG).to.equal('function');
		let tmpOut = libFormMain.themeifySVG('<svg><rect stroke="#1B1F23"/></svg>');
		Expect(tmpOut).to.include('var(--diagram-ink, #1B1F23)');
	});
});
