declare global {
	export interface Window {
		Chart: typeof import('chart.js').Chart;
	}
	var Chart: typeof import('chart.js').Chart;
	var PictSectionExcalidrawVendor: any; //TODO: add types for: import('pict-section-excalidraw');
}

export {}
