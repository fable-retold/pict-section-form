'use strict';
/**
 * Scoped CSS for the chart input's grouped legend. Registered once by
 * Pict-Provider-Input-Chart via
 * `pict.CSSMap.addCSS('Pict-Input-Chart-CSS', libCSS, 500)`.
 *
 * Chart.js's own legend is a single flow-wrapped row of swatches. On a control
 * chart that is eight entries of near-identical colour, with the limit lines
 * indistinguishable from the readings, wrapping into an unreadable block. This
 * legend is a vertical list, grouped, with each group toggleable as a unit.
 *
 * Everything is themeable through the --theme-color-* tokens; the hardcoded
 * values are fallbacks.
 */
const libCSS = /*css*/`
.pict-chart-shell { display: flex; align-items: stretch; gap: 0.75rem; width: 100%; }
.pict-chart-shell.pict-chart-legend-top { flex-direction: column-reverse; }
.pict-chart-shell.pict-chart-legend-bottom { flex-direction: column; }
.pict-chart-shell .pict-chart-canvas-area { flex: 1 1 auto; min-width: 0; position: relative; }

.pict-chart-legend { flex: 0 0 auto; max-width: 15rem; font-size: 0.78rem; line-height: 1.35;
	color: var(--theme-color-text-primary, #1f2733); user-select: none; }
.pict-chart-legend-top .pict-chart-legend,
.pict-chart-legend-bottom .pict-chart-legend { max-width: none; }

.pict-chart-legend-group + .pict-chart-legend-group { margin-top: 0.5rem; }
.pict-chart-legend-group-header { display: flex; align-items: center; gap: 0.35rem; cursor: pointer;
	font-size: 0.68rem; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
	color: var(--theme-color-text-muted, #6b7686); padding: 0.15rem 0; }
.pict-chart-legend-group-header:hover { color: var(--theme-color-text-primary, #1f2733); }
.pict-chart-legend-group-caret { font-size: 0.6rem; transition: transform 0.12s ease; }
.pict-chart-legend-group.pict-collapsed .pict-chart-legend-group-caret { transform: rotate(-90deg); }
.pict-chart-legend-group.pict-collapsed .pict-chart-legend-items { display: none; }
/* A group whose series are ALL hidden is dimmed as a whole, so the group toggle
   reads as a control rather than decoration. */
.pict-chart-legend-group.pict-group-off .pict-chart-legend-group-header { opacity: 0.45; }

.pict-chart-legend-items { display: flex; flex-direction: column; gap: 0.1rem; }
.pict-chart-legend-top .pict-chart-legend-items,
.pict-chart-legend-bottom .pict-chart-legend-items { flex-direction: row; flex-wrap: wrap; gap: 0.1rem 0.75rem; }

.pict-chart-legend-item { display: flex; align-items: center; gap: 0.4rem; cursor: pointer;
	padding: 0.1rem 0.2rem; border-radius: 4px; }
.pict-chart-legend-item:hover { background: var(--theme-color-background-hover, rgba(0,0,0,0.04)); }
.pict-chart-legend-item.pict-hidden { opacity: 0.4; }
.pict-chart-legend-item.pict-hidden .pict-chart-legend-label { text-decoration: line-through; }
.pict-chart-legend-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* The swatch carries the series' identity: colour, and whether it is a solid
   line, a dashed one, or unconnected markers. A legend that shows every entry
   as the same solid block cannot distinguish a reading from its control limit. */
.pict-chart-legend-swatch { flex: 0 0 auto; width: 1.4rem; height: 0.7rem; position: relative; }
.pict-chart-legend-swatch::before { content: ''; position: absolute; left: 0; right: 0; top: 50%;
	transform: translateY(-50%); height: 0.15rem; border-radius: 1px; background: currentColor; }
.pict-chart-legend-swatch.pict-swatch-dashed::before {
	background: repeating-linear-gradient(to right, currentColor 0 0.28rem, transparent 0.28rem 0.5rem); }
.pict-chart-legend-swatch.pict-swatch-dotted::before {
	background: repeating-linear-gradient(to right, currentColor 0 0.12rem, transparent 0.12rem 0.28rem); }
.pict-chart-legend-swatch.pict-swatch-markers::before { display: none; }
.pict-chart-legend-swatch.pict-swatch-markers::after { content: ''; position: absolute; left: 50%; top: 50%;
	transform: translate(-50%, -50%); width: 0.45rem; height: 0.45rem; border-radius: 50%; background: currentColor; }

.pict-chart-legend-toggle { display: inline-flex; align-items: center; gap: 0.3rem; cursor: pointer;
	font-size: 0.68rem; color: var(--theme-color-text-muted, #6b7686);
	background: none; border: 1px solid var(--theme-color-border-light, #e8ebf0);
	border-radius: 5px; padding: 0.1rem 0.4rem; margin-bottom: 0.35rem; }
.pict-chart-legend-toggle:hover { color: var(--theme-color-text-primary, #1f2733);
	border-color: var(--theme-color-border-strong, #c2c9d2); }
`;

module.exports = libCSS;
