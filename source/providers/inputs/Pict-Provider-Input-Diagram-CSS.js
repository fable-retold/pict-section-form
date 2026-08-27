/**
 * Pict-Provider-Input-Diagram-CSS.js
 *
 * Scoped CSS for the Diagram form-input slot. Registered via
 * `pict.CSSMap.addCSS('Pict-Input-Diagram-CSS', libCSS, 500)` from the
 * provider's constructor.
 *
 * SVG content rendered into the view-mode slot uses palette CSS variables
 * (`--diagram-ink`, `--diagram-accent`, etc.) emitted by Themeify-SVG. The
 * SVG carries hex fallbacks inline, so the diagram looks correct even when no
 * theme variables are defined.
 *
 * Class names:
 *
 *   .pict-section-form-diagram        the outer slot the form template emits
 *   .pict-section-form-diagram-view   the inline-SVG container (view mode)
 *   .pict-section-form-diagram-edit   the Excalidraw container (edit mode)
 *   .pict-section-form-diagram-toggle "Edit" / "Done" affordance chip
 */

module.exports = /*css*/`
.pict-section-form-diagram
{
	display: block;
	width: 100%;
	min-height: 120px;
	border: 1px solid var(--theme-color-border-primary, #D4C4A8);
	border-radius: 4px;
	background: var(--theme-color-background-primary, #FFFFFF);
	color: var(--theme-color-text-primary, #2A2520);
	box-sizing: border-box;
	position: relative;
}

.pict-section-form-diagram-view
{
	padding: 12px;
	min-height: 96px;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: auto;
}

.pict-section-form-diagram-view.is-empty
{
	color: var(--theme-color-text-muted, #8A7F72);
	font-style: italic;
	font-size: 0.9rem;
}

.pict-section-form-diagram-view svg
{
	display: block;
	max-width: 100%;
	height: auto;
}

/* Open-editor sizing.
 *
 * The height is a variable so the provider can drive it from the descriptor's Diagram.Height (and
 * from a height the user dragged to) without inlining a whole style block. The default clears
 * Excalidraw's own 500px "this is a phone" breakpoint AND leaves the shape-properties island room to
 * render unscrolled — below that the island is clipped to a scrolling sliver and the property
 * buttons become miserable to hit.
 *
 * The resize:vertical rule is the drag grip, the same affordance a textarea has; it needs a
 * non-visible overflow to show up at all. The floor is deliberately a small absolute value rather than the
 * configured height, or the grip could not drag below whatever the field was configured to. */
.pict-section-form-diagram-edit
{
	padding: 0;
	height: var(--pict-diagram-height, 560px);
	min-height: 180px;
	display: flex;
	resize: vertical;
	overflow: hidden;
}

/* The Excalidraw view brings its own chrome inside the slot. Force the wrap and the Excalidraw root
 * to FILL rather than to floor: a min-height in here would fight the grip on the way down and pin
 * the canvas taller than the box the user just dragged. */
.pict-section-form-diagram-edit > .pict-excalidraw-wrap,
.pict-section-form-diagram-edit > .pict-excalidraw-wrap > .pict-excalidraw-mount
{
	flex: 1 1 auto;
	min-height: 0;
	height: 100%;
}

.pict-section-form-diagram-edit .excalidraw
{
	width: 100%;
	height: 100%;
	min-height: 0;
}

.pict-section-form-diagram-toggle
{
	position: absolute;
	top: 6px;
	right: 6px;
	z-index: 2;
	padding: 3px 9px;
	font-size: 0.72rem;
	font-weight: 600;
	color: var(--theme-color-text-secondary, #5A4A3C);
	background: var(--theme-color-background-tertiary, #F4EEE2);
	border: 1px solid var(--theme-color-border-secondary, #D4C4A8);
	border-radius: 3px;
	cursor: pointer;
	user-select: none;
}

.pict-section-form-diagram-toggle:hover
{
	color: var(--theme-color-text-primary, #2A2520);
	background: var(--theme-color-background-primary, #FFFFFF);
	border-color: var(--theme-color-accent, #2E7D74);
}

.pict-section-form-diagram.mode-edit .pict-section-form-diagram-toggle::after { content: 'Done'; }
.pict-section-form-diagram.mode-view .pict-section-form-diagram-toggle::after { content: 'Edit'; }
`;
