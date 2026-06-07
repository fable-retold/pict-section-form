/**
 * Rewrite the palette colors in an SVG to CSS variables with hex fallbacks.
 *
 * @param {string} pSVG - The exported SVG string.
 * @param {object} [pPaletteOrProfile] - Either a flat palette
 *   `{ink, paper, accent, ...}` OR a style profile carrying `.Palette`. When
 *   omitted, the standard notebook palette is used.
 * @returns {string} The SVG with palette colors rewritten to CSS variables.
 */
export function themeifySVG(pSVG: string, pPaletteOrProfile?: object): string;
/**
 * Themeify-SVG.js
 *
 * Rewrite an exported Excalidraw SVG so its palette colors become CSS custom
 * properties with hex fallbacks:
 *
 *     stroke="#1B1F23"  ->  stroke="var(--diagram-ink, #1B1F23)"
 *
 * With no variables set, the hex fallback renders the original look, so the
 * SVG is correct standalone (in an <img>, a file viewer, etc.). When an
 * embedder that inlines the SVG sets `--diagram-ink` and the other tokens
 * per active theme, the same single SVG adapts live, light/dark.
 *
 * The embedded <metadata> block (base64 Excalidraw scene) is protected and
 * left byte-for-byte intact so the scene still round-trips into
 * pict-section-excalidraw for hand-editing.
 *
 * Token names (all under the --diagram- namespace):
 *   ink, paper, accent, highlight, deemphasis, link
 *
 * This file mirrors the canonical implementation at
 * `pict-renderer-graph/source/Pict-Renderer-Graph-Theme-SVG.js`. The two are
 * kept in sync by hand. If you edit the regex pass here, update the other.
 * The reason for the duplication: this section module renders directly into
 * a browser DOM, and we don't want to pull pict-renderer-graph (which spins
 * up Chromium) in as a runtime dependency.
 */
declare const _PaletteTokens: string[];
declare namespace _DefaultPalette {
    let ink: string;
    let paper: string;
    let accent: string;
    let highlight: string;
    let deemphasis: string;
    let link: string;
}
export { _PaletteTokens as paletteTokens, _DefaultPalette as defaultPalette };
//# sourceMappingURL=Themeify-SVG.d.ts.map