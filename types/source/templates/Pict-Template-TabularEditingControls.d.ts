export = PictTemplateTabularEditingControls;
/**
 * Template tag that renders the editing-controls <td> (del / up / down) for
 * one row of a tabular group when EditingControlsPosition is "left".
 *
 * Usage in a tabular row template:
 *
 *   {~TabularEditingControls:<ViewHash>~}
 *   {~TEC:<ViewHash>~}
 *
 * Reads Record.Group and Record.Key from the MTVS row wrapper, then calls
 * the layout provider's `_renderTabularEditingControlsHTML(view, gi, rk)`.
 *
 * Implemented as a dedicated tag (rather than `{~F:~}`) so it works on the
 * older pict versions some hosts ship with.
 */
declare class PictTemplateTabularEditingControls extends libPictTemplate {
    constructor(pFable: any, pOptions: any, pServiceHash: any);
    /** @type {import('pict')} */
    pict: import("pict");
    /** @type {import('pict')} */
    fable: import("pict");
    render(pTemplateHash: any, pRecord: any, pContextArray: any, pScope: any, pState: any): any;
}
import libPictTemplate = require("pict-template");
//# sourceMappingURL=Pict-Template-TabularEditingControls.d.ts.map