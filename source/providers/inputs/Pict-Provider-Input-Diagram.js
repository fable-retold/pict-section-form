/**
 * Pict-Provider-Input-Diagram.js
 *
 * A pict-section-form input provider that pairs Excalidraw (edit mode) with
 * an inline SVG (view mode). Boots in VIEW mode — the heavy Excalidraw bundle
 * isn't pulled until the host UI calls
 * `provider.setMode(pInputHash, 'edit')`.
 *
 * The stored value is an Excalidraw-exported SVG carrying the embedded scene
 * in its <metadata>. View mode writes that SVG verbatim into the slot. Edit
 * mode parses the embedded scene back out (via the wrapper's loadFromBlob)
 * and seeds Excalidraw with it.
 *
 * Descriptor shape:
 *
 *   {
 *     "Name": "Architecture",
 *     "Hash": "ArchDiagram",
 *     "DataType": "String",
 *     "PictForm": {
 *       "InputType": "Diagram",
 *       "Diagram": {
 *         "ThemeColors":           true,
 *         "Height":                "500px",
 *         "EditorImplementation":  "react",
 *         "EditorOptions":         { ... }
 *       }
 *     }
 *   }
 *
 * Runtime API:
 *
 *   provider.setMode(inputHash, 'edit' | 'view', fCallback)
 *   provider.getMode(inputHash)
 *   provider.toggleMode(inputHash)
 *   provider.commit(inputHash, fCallback)
 */

const libPictSectionInputExtension = require('../Pict-Provider-InputExtension.js');
const libPictSectionExcalidraw     = require('pict-section-excalidraw');

// Form templates live in pict-section-form's default-template set, so no
// runtime template injection is needed here. CSS still needs registering.
const libCSS      = require('./Pict-Provider-Input-Diagram-CSS.js');
const libThemeify = require('./util/Themeify-SVG.js');

const _DefaultProviderConfiguration =
{
	ProviderIdentifier: 'Pict-Input-Diagram',

	AutoInitialize: true,
	AutoInitializeOrdinal: 0,

	AutoSolveWithApp: false
};

/**
 * @typedef {Object} Instance
 * @property {string} mode - 'edit' or 'view'
 * @property {string} slotID - The HTML ID of the content slot for this input
 * @property {string} lastValue - The last known value (SVG string)
 * @property {Object} viewInstance - The editor view instance (if in edit mode)
 * @property {string} viewHash - The hash of the editor view (if in edit mode)
 * @property {Object} input - The input definition object
 */

class PictInputDiagram extends libPictSectionInputExtension
{
	/**
	 * Creates an instance of the PictInputExtensionProvider class.
	 *
	 * @param {import('pict')} pFable - The Pict instance.
	 * @param {Record<string, any>} [pOptions] - The options for the provider.
	 * @param {string} [pServiceHash] - The service hash for the provider.
	 */
	constructor(pFable, pOptions, pServiceHash)
	{
		let tmpOptions = Object.assign({}, JSON.parse(JSON.stringify(_DefaultProviderConfiguration)), pOptions);
		super(pFable, tmpOptions, pServiceHash);

		/** @type {import('pict')} */ this.pict;
		/** @type {any}            */ this.log;

		// inputHash → { mode, slotID, lastValue (SVG string), viewInstance?, viewHash?, input }
		/** @type {Record<String, Instance>} */
		this._instances = {};

		// Register the scoped CSS.
		if (this.pict && this.pict.CSSMap && typeof this.pict.CSSMap.addCSS === 'function')
		{
			this.pict.CSSMap.addCSS('Pict-Input-Diagram-CSS', libCSS, 500);
		}
	}

	// ----------------------------------------------------------------------------
	// Helpers
	// ----------------------------------------------------------------------------

	/**
	 * @param {string} pInputHTMLID - The RawHTMLID of the input.
	 * @returns {string} The HTML ID selector for the content display slot corresponding to the input.
	 */
	getContentDisplayHTMLID(pInputHTMLID)
	{
		return `#DISPLAY-FOR-${pInputHTMLID}`;
	}

	/**
	 * @param {string} pInputHTMLID - The RawHTMLID of the input.
	 * @param {number} pRowIndex - The row index for tabular inputs.
	 * @returns {string} The HTML ID selector for the content display slot corresponding to the tabular input.
	 */
	getTabularContentDisplayInputID(pInputHTMLID, pRowIndex)
	{
		return `#DISPLAY-FOR-TABULAR-${pInputHTMLID}-${pRowIndex}`;
	}

	/**
	 * Resolve the value to use for display/editing, following this precedence:
	 * 1. The provided pValue (if a non-empty string)
	 * 2. The input's Content property (if a non-empty string)
	 * 3. The input's Default property (if a non-empty string)
	 * 4. An empty string if none of the above are valid
	 *
	 * @param {Object} pInput - The input definition object.
	 * @param {any} pValue - The value provided for the input.
	 * @returns {string} The resolved value to use for display/editing.
	 */
	_resolveValue(pInput, pValue)
	{
		if (typeof pValue === 'string' && pValue.length > 0) return pValue;
		if (pInput && pInput.Content && typeof pInput.Content === 'string') return pInput.Content;
		if (pInput && pInput.Default && typeof pInput.Default === 'string') return pInput.Default;
		return '';
	}

	/**
	 * @param {any} pValue - The value to check.
	 * @return {boolean} True if the value is a string that appears to contain an <svg> element, false otherwise.
	 */
	_isLikelySvg(pValue)
	{
		return (typeof pValue === 'string') && /<svg[\s>]/i.test(pValue);
	}

	/**
	 * @param {string} pSlotID - The HTML ID of the content slot to assign.
	 * @param {string} pHTML - The HTML string to assign to the slot.
	 * @returns {boolean} True if the assignment was successful, false otherwise.
	 */
	_assignSlotContent(pSlotID, pHTML)
	{
		if (this.pict && this.pict.ContentAssignment &&
			typeof this.pict.ContentAssignment.assignContent === 'function')
		{
			this.pict.ContentAssignment.assignContent(pSlotID, pHTML);
			return true;
		}
		return false;
	}

	/**
	 * @param {string} pInputHTMLID - The RawHTMLID of the input whose hidden value field should be updated.
	 * @param {string} pValue - The SVG string to set as the value of the hidden input field.
	 * @returns {boolean} True if the value was successfully written and a change event dispatched, false otherwise.
	 */
	_writeHiddenInputValue(pInputHTMLID, pValue)
	{
		let tmpEl = (typeof document !== 'undefined') ? document.getElementById(pInputHTMLID) : null;
		if (!tmpEl) return false;
		tmpEl.value = (pValue == null) ? '' : String(pValue);
		try { tmpEl.dispatchEvent(new Event('change', { bubbles: true })); }
		catch (pErr) { /* jsdom may lack Event */ }
		return true;
	}

	_resolveVendor()
	{
		if (typeof window === 'undefined') return null;
		return window.PictSectionExcalidrawVendor || null;
	}

	/**
	 * Wrap an SVG string in a thin <div> for the view-mode slot. If the value
	 * is empty or not an SVG, show an "(empty)" placeholder.
	 *
	 * @param {string} pValue - The SVG string to wrap for display.
	 * @returns {string} The HTML string to assign to the view slot.
	 */
	_buildViewHTML(pValue)
	{
		if (this._isLikelySvg(pValue))
		{
			return `<div class="pict-section-form-diagram-view">${pValue}</div>`;
		}
		return `<div class="pict-section-form-diagram-view is-empty">(empty diagram)</div>`;
	}

	/**
	 * @param {Object} pInput - The input definition object.
	 * @param {string} pMode - The mode to set ('edit' or 'view').
	 */
	_setSlotModeClass(pInput, pMode)
	{
		if (typeof document === 'undefined') return;
		let tmpRawHTMLID = pInput.Macro.RawHTMLID;
		let tmpOuter = document.getElementById(tmpRawHTMLID) ||
			document.querySelector(this.getContentDisplayHTMLID(tmpRawHTMLID));
		if (!tmpOuter || !tmpOuter.classList) return;
		tmpOuter.classList.remove('mode-edit', 'mode-view', 'pict-section-form-diagram-edit');
		if (pMode === 'edit')
		{
			tmpOuter.classList.add('mode-edit', 'pict-section-form-diagram-edit');
		}
		else
		{
			tmpOuter.classList.add('mode-view');
		}
	}

	// ----------------------------------------------------------------------------
	// View mode
	// ----------------------------------------------------------------------------

	_mountView(pView, pInput, pValue)
	{
		let tmpRawHTMLID = pInput.Macro.RawHTMLID;
		let tmpSlotID    = this.getContentDisplayHTMLID(tmpRawHTMLID);
		let tmpValue     = this._resolveValue(pInput, pValue);

		this._assignSlotContent(tmpSlotID, this._buildViewHTML(tmpValue));
		this._setSlotModeClass(pInput, 'view');

		let tmpInst = this._instances[pInput.Hash] || {};
		tmpInst.mode         = 'view';
		tmpInst.slotID       = tmpSlotID;
		tmpInst.lastValue    = tmpValue;
		tmpInst.input        = pInput;
		tmpInst.viewInstance = null;
		this._instances[pInput.Hash] = tmpInst;
	}

	// ----------------------------------------------------------------------------
	// Edit mode
	// ----------------------------------------------------------------------------

	_extractSceneFromSvg(pSVG, fCallback)
	{
		// Convert the SVG string into a Blob/File and pass through the wrapper's
		// loadFromBlob, which extracts the embedded scene from the metadata.
		if (!this._isLikelySvg(pSVG))
		{
			return fCallback(null, null);
		}

		let tmpVendor = this._resolveVendor();
		if (!tmpVendor || !tmpVendor.loadFromBlob)
		{
			if (this.log) this.log.warn('[Pict-Input-Diagram] vendor.loadFromBlob unavailable — falling back to empty scene');
			return fCallback(null, null);
		}

		try
		{
			// Browser-side construction of a Blob; pass null/null per the
			// vendor's signature (localAppState, localElements).
			let tmpBlob = new window.Blob([pSVG], { type: 'image/svg+xml' });
			let tmpPromise = tmpVendor.loadFromBlob(tmpBlob, null, null);
			Promise.resolve(tmpPromise).then(
				(pScene) => { fCallback(null, pScene || null); },
				(pErr)   => { fCallback(pErr, null); }
			);
		}
		catch (pErr)
		{
			fCallback(pErr, null);
		}
	}

	_buildEditorOptions(pInput, pValue, pInst)
	{
		let tmpDiagramOpts = (pInput.PictForm && pInput.PictForm.Diagram) || {};
		let tmpEditorOpts  = tmpDiagramOpts.EditorOptions || {};
		let tmpRawHTMLID   = pInput.Macro.RawHTMLID;

		// Per-input AppData stash for the scene (so re-renders don't lose it
		// when the editor unmounts).
		if (!this.pict.AppData._PictInputDiagram) this.pict.AppData._PictInputDiagram = {};
		if (!this.pict.AppData._PictInputDiagram[pInput.Hash])
		{
			this.pict.AppData._PictInputDiagram[pInput.Hash] = { Scene: null };
		}
		let tmpDrawingAddr = `AppData._PictInputDiagram.${pInput.Hash}.Scene`;

		// Pin a Provider to register Excalidraw's resources (icons, etc.) once
		// on the host pict — done by Pict-Section-Excalidraw's own provider.
		let tmpOptions = Object.assign({}, tmpEditorOpts,
		{
			ViewIdentifier:       `Pict-Input-Diagram-Editor-${pInput.Hash}`,
			TargetElementAddress: this.getContentDisplayHTMLID(tmpRawHTMLID),
			DrawingDataAddress:   tmpDrawingAddr,
			EditorImplementation: tmpDiagramOpts.EditorImplementation || 'react'
		});

		return tmpOptions;
	}

	_mountEdit(pView, pInput, pValue, fCallback)
	{
		let tmpRawHTMLID = pInput.Macro.RawHTMLID;
		let tmpSlotID    = this.getContentDisplayHTMLID(tmpRawHTMLID);
		let tmpValue     = this._resolveValue(pInput, pValue);
		let tmpInst      = this._instances[pInput.Hash] || {};
		tmpInst.input    = pInput;
		let tmpDiagramOpts = (pInput.PictForm && pInput.PictForm.Diagram) || {};
		let tmpThemeColors = (tmpDiagramOpts.ThemeColors !== false);

		// Clear view-mode content.
		this._assignSlotContent(tmpSlotID, '');

		this._extractSceneFromSvg(tmpValue, (pExtractErr, pScene) =>
		{
			let tmpEditorOpts  = this._buildEditorOptions(pInput, tmpValue, tmpInst);
			let tmpViewHash    = tmpEditorOpts.ViewIdentifier;
			let tmpProvider    = this;

			// Inject the parsed scene into the per-input AppData stash so the
			// editor's _resolveInitialData picks it up.
			if (pScene && this.pict.AppData._PictInputDiagram &&
				this.pict.AppData._PictInputDiagram[pInput.Hash])
			{
				this.pict.AppData._PictInputDiagram[pInput.Hash].Scene =
				{
					elements: pScene.elements || [],
					appState: pScene.appState || {},
					files:    pScene.files    || {}
				};
			}

			// OnChange handler — debounced inside the editor view itself; we
			// just trigger an SVG export and stamp into the form-data input.
			tmpEditorOpts.OnChange = (pEditorView, pSceneSnap) =>
			{
				try
				{
					let tmpExportPromise = pEditorView.exportSvg({ exportEmbedScene: true, exportBackground: false });
					Promise.resolve(tmpExportPromise).then(
						(pSvgEl) =>
						{
							let tmpSvgStr = (pSvgEl && typeof pSvgEl.outerHTML === 'string') ? pSvgEl.outerHTML :
								(typeof pSvgEl === 'string') ? pSvgEl : null;
							if (!tmpSvgStr) return;

							if (tmpThemeColors)
							{
								tmpSvgStr = libThemeify.themeifySVG(tmpSvgStr);
							}

							tmpProvider._writeHiddenInputValue(tmpRawHTMLID, tmpSvgStr);
							let tmpLatest = tmpProvider._instances[pInput.Hash];
							if (tmpLatest) tmpLatest.lastValue = tmpSvgStr;
						},
						(pExpErr) =>
						{
							if (tmpProvider.log)
							{
								tmpProvider.log.warn('[Pict-Input-Diagram] exportSvg failed in OnChange',
									{ error: pExpErr.message, inputHash: pInput.Hash });
							}
						}
					);
				}
				catch (pErr)
				{
					if (tmpProvider.log)
					{
						tmpProvider.log.warn('[Pict-Input-Diagram] OnChange handler threw',
							{ error: pErr.message, inputHash: pInput.Hash });
					}
				}
			};

			this.pict.addView(tmpViewHash, tmpEditorOpts, libPictSectionExcalidraw);
			let tmpEditorView = this.pict.views[tmpViewHash];
			if (!tmpEditorView)
			{
				let tmpErr = new Error('Failed to instantiate Diagram editor view ' + tmpViewHash);
				if (this.log) this.log.error('[Pict-Input-Diagram] addView returned nothing', { viewHash: tmpViewHash });
				if (typeof fCallback === 'function') fCallback(tmpErr);
				return;
			}

			this._setSlotModeClass(pInput, 'edit');

			tmpInst.mode         = 'edit';
			tmpInst.slotID       = tmpSlotID;
			tmpInst.lastValue    = tmpValue;
			tmpInst.viewInstance = tmpEditorView;
			tmpInst.viewHash     = tmpViewHash;
			tmpInst.themeColors  = tmpThemeColors;
			this._instances[pInput.Hash] = tmpInst;

			try
			{
				let tmpResult = tmpEditorView.render();
				if (tmpResult && typeof tmpResult.then === 'function')
				{
					tmpResult.then(
						() => { if (typeof fCallback === 'function') fCallback(null); },
						(pRenderErr) => { if (typeof fCallback === 'function') fCallback(pRenderErr); }
					);
				}
				else
				{
					if (typeof fCallback === 'function') fCallback(null);
				}
			}
			catch (pErr)
			{
				if (this.log) this.log.error('[Pict-Input-Diagram] editor.render threw', { error: pErr.message });
				if (typeof fCallback === 'function') fCallback(pErr);
			}
		});
	}

	_destroyEdit(pInput)
	{
		let tmpInst = this._instances[pInput.Hash];
		if (!tmpInst || !tmpInst.viewInstance) return;

		let tmpView = tmpInst.viewInstance;
		try
		{
			if (typeof tmpView.destroy === 'function') tmpView.destroy();
		}
		catch (pErr)
		{
			if (this.log) this.log.warn('[Pict-Input-Diagram] editor.destroy threw', { error: pErr.message });
		}

		if (this.pict.AppData._PictInputDiagram &&
			this.pict.AppData._PictInputDiagram[pInput.Hash])
		{
			delete this.pict.AppData._PictInputDiagram[pInput.Hash];
		}

		if (tmpInst.viewHash && this.pict.views && this.pict.views[tmpInst.viewHash])
		{
			try { delete this.pict.views[tmpInst.viewHash]; }
			catch (pErr) { /* not all envs allow delete */ }
		}

		tmpInst.viewInstance = null;
		tmpInst.viewHash     = null;
	}

	// ----------------------------------------------------------------------------
	// Public runtime API
	// ----------------------------------------------------------------------------

	getMode(pInputHash)
	{
		let tmpInst = this._instances[pInputHash];
		return tmpInst ? tmpInst.mode : null;
	}

	setMode(pInputHash, pMode, fCallback)
	{
		let tmpInst = this._instances[pInputHash];
		if (!tmpInst)
		{
			let tmpErr = new Error('Cannot setMode — input is not mounted: ' + pInputHash);
			if (typeof fCallback === 'function') fCallback(tmpErr);
			return;
		}
		if (pMode !== 'edit' && pMode !== 'view')
		{
			let tmpErr = new Error('setMode: unknown mode "' + pMode + '" (use "edit" or "view")');
			if (typeof fCallback === 'function') fCallback(tmpErr);
			return;
		}
		if (tmpInst.mode === pMode)
		{
			if (typeof fCallback === 'function') fCallback(null);
			return;
		}

		if (pMode === 'edit')
		{
			this._mountEdit(null, tmpInst.input, tmpInst.lastValue, fCallback);
			return;
		}

		this._destroyEdit(tmpInst.input);
		this._mountView(null, tmpInst.input, tmpInst.lastValue);
		if (typeof fCallback === 'function') fCallback(null);
	}

	toggleMode(pInputHash, fCallback)
	{
		let tmpMode = this.getMode(pInputHash);
		let tmpNext = (tmpMode === 'edit') ? 'view' : 'edit';
		this.setMode(pInputHash, tmpNext, fCallback);
	}

	commit(pInputHash, fCallback)
	{
		let tmpInst = this._instances[pInputHash];
		if (!tmpInst || tmpInst.mode !== 'edit' || !tmpInst.viewInstance)
		{
			if (typeof fCallback === 'function') fCallback(null);
			return;
		}
		// Force a synchronous export so the form value reflects the latest
		// scene even if the throttled OnChange hasn't fired yet.
		let tmpThemeColors = tmpInst.themeColors !== false;
		let tmpProvider    = this;
		let tmpRawHTMLID   = tmpInst.input.Macro.RawHTMLID;
		try
		{
			let tmpExportPromise = tmpInst.viewInstance.exportSvg({ exportEmbedScene: true, exportBackground: false });
			Promise.resolve(tmpExportPromise).then(
				(pSvgEl) =>
				{
					let tmpSvgStr = (pSvgEl && typeof pSvgEl.outerHTML === 'string') ? pSvgEl.outerHTML : null;
					if (tmpSvgStr)
					{
						if (tmpThemeColors) tmpSvgStr = libThemeify.themeifySVG(tmpSvgStr);
						tmpProvider._writeHiddenInputValue(tmpRawHTMLID, tmpSvgStr);
						tmpInst.lastValue = tmpSvgStr;
					}
					if (typeof fCallback === 'function') fCallback(null);
				},
				(pErr) =>
				{
					if (typeof fCallback === 'function') fCallback(pErr);
				}
			);
		}
		catch (pErr)
		{
			if (typeof fCallback === 'function') fCallback(pErr);
		}
	}

	// ----------------------------------------------------------------------------
	// Lifecycle hooks
	// ----------------------------------------------------------------------------

	onInputInitialize(pView, pGroup, pRow, pInput, pValue, pHTMLSelector, pTransactionGUID)
	{
		this._mountView(pView, pInput, pValue);
		return super.onInputInitialize(pView, pGroup, pRow, pInput, pValue, pHTMLSelector, pTransactionGUID);
	}

	/**
	 * A tabular input has been initialized (rendered into the DOM)
	 *
	 * Called when an input has this Provider hash in its 'Providers' array.
	 *
	 * @param {Object} pView - The view object.
	 * @param {Object} pGroup - The group definition object.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The value of the input object
	 * @param {string} pHTMLSelector - The HTML selector for the input object (it will return an array).
	 * @param {string} pTransactionGUID - The transaction GUID for the event dispatch.
	 * @param {number} pRowIndex - The row index of the tabular data
	 *
	 * @return {boolean}
	 */
	onInputInitializeTabular(pView, pGroup, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID)
	{
		super.onInputInitializeTabular(pView, pGroup, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID);
		let tmpErr = new Error('Diagram InputType is not supported inside Tabular rows in Phase 1.');
		if (this.log) this.log.warn('[Pict-Input-Diagram] tabular not supported', { inputHash: pInput && pInput.Hash });
		throw tmpErr;
	}

	/**
	 * Fires when data is marshaled to the form for this input.
	 *
	 * @param {Object} pView - The view object.
	 * @param {Object} pGroup - The group definition object.
	 * @param {number} pRow - The Row index.
	 * @param {Object} pInput - The input object.
	 * @param {any} pValue - The value to marshal.
	 * @param {string} pHTMLSelector - The HTML selector.
	 * @param {string} pTransactionGUID - The transaction GUID for the event dispatch.
	 * @returns {boolean} - Returns true if the data was successfully marshaled to the form.
	 */
	onDataMarshalToForm(pView, pGroup, pRow, pInput, pValue, pHTMLSelector, pTransactionGUID)
	{
		let tmpInst = this._instances[pInput.Hash];
		if (!tmpInst)
		{
			this._mountView(pView, pInput, pValue);
		}
		else if (tmpInst.mode === 'view')
		{
			this._mountView(pView, pInput, pValue);
		}
		else
		{
			// Edit mode: hot-replace the editor's scene.
			tmpInst.lastValue = (typeof pValue === 'string') ? pValue : tmpInst.lastValue;
			this._extractSceneFromSvg(tmpInst.lastValue, (pErr, pScene) =>
			{
				if (pErr || !pScene) return;
				if (tmpInst.viewInstance && typeof tmpInst.viewInstance.setScene === 'function')
				{
					try { tmpInst.viewInstance.setScene(pScene); }
					catch (pSetErr)
					{
						if (this.log) this.log.warn('[Pict-Input-Diagram] setScene threw after marshal',
							{ error: pSetErr.message });
					}
				}
			});
		}
		return super.onDataMarshalToForm(pView, pGroup, pRow, pInput, pValue, pHTMLSelector, pTransactionGUID);
	}

	onDataMarshalToFormTabular(pView, pGroup, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID)
	{
		return super.onDataMarshalToFormTabular(pView, pGroup, pInput, pValue, pHTMLSelector, pRowIndex, pTransactionGUID);
	}
}

module.exports = PictInputDiagram;
module.exports.default_configuration = _DefaultProviderConfiguration;
