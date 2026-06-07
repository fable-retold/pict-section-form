export = PictTemplateTabularRowLabels;
/**
 * Template tag that renders the left-side row-label <td> cells for one row
 * of a tabular group with `RowLabels` configured.
 *
 * Usage in a tabular row template:
 *
 *   {~TabularRowLabels:<ViewHash>~}
 *   {~TRL:<ViewHash>~}
 *
 * The current Record context is expected to be the MTVS wrapper
 * (`{ Value, Key, Group }`); the tag reads `Record.Group` and `Record.Key`
 * to look up the group's precomputed `RowLabelMetadata[Record.Key].Cells`
 * and renders one `<td rowspan>` per non-skipped cell.
 *
 * This is implemented as a dedicated tag (rather than `{~F:~}`) so it works
 * on the older pict versions some hosts ship with.
 */
declare class PictTemplateTabularRowLabels extends libPictTemplate {
    constructor(pFable: any, pOptions: any, pServiceHash: any);
    /** @type {import('pict')} */
    pict: import("pict");
    /** @type {import('pict')} */
    fable: import("pict");
    render(pTemplateHash: any, pRecord: any, pContextArray: any, pScope: any, pState: any): any;
}
import libPictTemplate = require("pict-template");
//# sourceMappingURL=Pict-Template-TabularRowLabels.d.ts.map