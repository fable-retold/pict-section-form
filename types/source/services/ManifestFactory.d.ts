export = ManifestFactory;
declare class ManifestFactory extends libFableServiceProviderBase {
    constructor(pFable: any, pOptions: any, pServiceHash: any);
    /** @type {import('pict') & { instantiateServiceProviderWithoutRegistration: (hash: string, options?: any, uuid?: string) => any, newManyfest: () => import('manyfest') }} */
    fable: import("pict") & {
        instantiateServiceProviderWithoutRegistration: (hash: string, options?: any, uuid?: string) => any;
        newManyfest: () => import("manyfest");
    };
    manifest: any;
    referenceManifestFactories: {};
    sectionHashLookup: {};
    groupHashLookup: {};
    defaultHashCounter: number;
    _SanitizeObjectKeyRegex: RegExp;
    _SanitizeObjectKeyReplacement: string;
    _SanitizeObjectKeyInvalid: string;
    /**
     * Clean a string of any characters to create a consistent object key.
     *
     * @param {string} pString = The string to clean.
     * @return {string} the cleaned string, or a placeholder if the input is invalid
     */
    sanitizeObjectKey(pString: string): string;
    /**
     * Initialize the form groups.
     *
     * This function will initialize the form groups of a view based on the manifest.
     *
     * TODO: Figure out if this is the best place for this.  It *is* pretty useful for
     * inferring manifests, so has uses outside of the view lifecycle.
     *
     * @param {Object} pView - The view to initialize form groups for
     */
    initializeFormGroups(pView: any): void;
    /**
     * Resolve a single template string against a record context.
     *
     * @param {string} pTemplate - The template string to resolve.
     * @param {Object} pRecord - The record context to resolve against.
     * @returns {string} The resolved string, or '' on failure.
     */
    _parseDynamicColumnTemplate(pTemplate: string, pRecord: any): string;
    /**
     * Resolve a Tabular Group's DynamicColumns generators into descriptors on its supportingManifest.
     *
     * NON-DESTRUCTIVE: descriptor pruning is structural only -- row record data at
     * removed InformaryDataAddresses is never touched, so hidden data persists for
     * later restoration if the source row reappears.
     *
     * InformaryDataAddressTemplate is resolved ONCE at descriptor generation time
     * (Informary itself is a pure string concat at marshal time -- see
     * Pict-Provider-Informary.getComposedContainerAddress).
     *
     * @param {Object} pView - The view containing the group.
     * @param {Object} pGroup - The group object (must already have supportingManifest).
     * @returns {{added: Array<string>, removed: Array<string>, unchanged: Array<string>, changed: boolean, namesChanged: boolean}}
     */
    _resolveDynamicColumns(pView: any, pGroup: any): {
        added: Array<string>;
        removed: Array<string>;
        unchanged: Array<string>;
        changed: boolean;
        namesChanged: boolean;
    };
    /**
     * Adds a manifest descriptor to the manifest.
     *
     * @param {Object} pManifestDescriptor - The manifest descriptor to add.
     */
    addDescriptor(pManifestDescriptor: any): void;
    /**
     * Get a section from the manifest.
     *
     * @param {string} pSectionHash - The section Hash
     *
     * @return {Object} The manifest section object
     */
    getManifestSection(pSectionHash: string): any;
    /**
     * Get a group from a section.
     *
     * @param {string|Object} pManifestSection - The manifest Section -- either a Hash string or the object itself
     * @param {string} pGroupHash - The group Hash
     *
     * @return {Object} The group object
     */
    getManifestGroup(pManifestSection: string | any, pGroupHash: string): any;
    /**
     * Lints a manifest record row.
     * @param {Object} pRecord - The record to be linted.
     * @returns {boolean} - Returns true if the record is valid, false otherwise.
     */
    tabularRowLint(pRecord: any): boolean;
    decorateChartDescriptorFromTabularRow(pRecord: any, pDescriptor: any, pPostfix: any): void;
    /**
     * Add a manifest descriptor from a tabular row.
     *
     * @param {Object} pManifestFactory - The manifest factory
     * @param {Object} pRecord - The tabular row record -- expected to have at least a 'Form'
     *
     * @return {Object} the descriptor
     */
    tabularRowAddDescriptor(pManifestFactory: any, pRecord: any): any;
    /**
     * Add a validation solver to a manifest from a tabular row.
     *
     * @param {Record<string, any>} pManifest - The manifest being built
     * @param {Record<string, any>} pRecord - The tabular row record -- expected to have at least a 'Form'
     */
    tabularRowAddValidator(pManifest: Record<string, any>, pRecord: Record<string, any>): void;
    /**
     * This fires whenever a Tabular Row is adding a Descriptor to the Manifest.
     *
     * If you want to extend how descriptors are built, the code belongs in here.
     *
     * @param {Object} pIncomingDescriptor - The record for the descriptor being added (from a CSV or other source)
     * @param {Object} pSection - The section object
     * @param {Object} pGroup - The group object
     * @param {Object} pNewDescriptor - The descriptor object
     */
    onTabularRowAddDescriptor(pIncomingDescriptor: any, pSection: any, pGroup: any, pNewDescriptor: any): void;
    migrateAutofillTriggerGroupSolvers(pManifests: any): void;
    /**
     * Helper function to determine if a value is "truthy" in the context of dynamic configuration.
     *
     * @param {any} pValue - The value to be evaluated
     *
     * @return {boolean} whether the value is considered true
     */
    _isTrue(pValue: any): boolean;
    /**
     * Create some manifests with a "factory" pattern.
     *
     * @param {any} pRecords - The records as an array of objects
     *
     * @return {any} the manifests
     */
    createManifestsFromTabularArray(pRecords: any): any;
}
declare namespace ManifestFactory {
    let default_configuration: Record<string, any>;
}
import libFableServiceProviderBase = require("fable-serviceproviderbase");
//# sourceMappingURL=ManifestFactory.d.ts.map