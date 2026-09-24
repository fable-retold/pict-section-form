#!/usr/bin/env node
/*
	Injection conformance, browser tier: the node side.

	Bundles the in-page driver with browserify (the bundler quackage builds with) and runs it in headless
	Chrome with --dump-dom, so the tier needs no extra dependency; set CHROME_BIN to pick the browser.

		npm run test:injection [-- --verbose] [-- --rebuild] [-- --keep]

	Prints [ok] / [fail] / [open] per invariant and exits non-zero when a [fail] check fails. `[open]` marks a
	known, reported gap: it is printed but does not fail the run. Without a browser the run exits non-zero
	saying so, rather than passing quietly -- the tier that runs anywhere is the DOM tier, in
	test/PictSectionForm-Injection-Conformance_tests.js.

	It is also a library: require() it and call runPage / runDifferential with any manifest.
*/

const libFS = require('fs');
const libOS = require('os');
const libPath = require('path');
const libURL = require('url');
const libChildProcess = require('child_process');

const PACKAGE_ROOT = libPath.resolve(__dirname, '..', '..');
const DRIVER_ENTRY = libPath.join(__dirname, 'Injection-Conformance-Harness-Driver.js');
const BUNDLE_DIRECTORY = libPath.join(__dirname, 'dist');
const BUNDLE_PATH = libPath.join(BUNDLE_DIRECTORY, 'injection-conformance-harness.js');
const RESULTS_PATTERN = /data-results="([A-Za-z0-9+/=]*)"/;
const DIFFERENTIAL_PHASES = [ 'host', 'pair', 'solo-a', 'solo-b' ];

/**
 * @param {string} pDirectory
 * @param {(pFilePath: string) => boolean} fFilter
 * @return {number} the newest modification time in milliseconds
 */
function newestModifiedTime(pDirectory, fFilter)
{
	let tmpNewest = 0;
	const tmpEntries = libFS.existsSync(pDirectory) ? libFS.readdirSync(pDirectory, { withFileTypes: true }) : [];
	for (const tmpEntry of tmpEntries)
	{
		const tmpEntryPath = libPath.join(pDirectory, tmpEntry.name);
		if (tmpEntry.isDirectory())
		{
			if (tmpEntry.name !== 'dist')
			{
				tmpNewest = Math.max(tmpNewest, newestModifiedTime(tmpEntryPath, fFilter));
			}
			continue;
		}
		if (fFilter(tmpEntryPath))
		{
			tmpNewest = Math.max(tmpNewest, libFS.statSync(tmpEntryPath).mtimeMs);
		}
	}
	return tmpNewest;
}

/**
 * Browserifies the in-page driver, skipping the build when the bundle is newer than every source file.
 *
 * @param {boolean} [pForce]
 * @return {string} the bundle path
 */
function buildBundle(pForce)
{
	const fFilter = (pFilePath) => pFilePath.endsWith('.js') || pFilePath.endsWith('.json');
	const tmpNewestSource = Math.max(
		newestModifiedTime(libPath.join(PACKAGE_ROOT, 'source'), fFilter),
		newestModifiedTime(__dirname, fFilter),
		newestModifiedTime(libPath.join(PACKAGE_ROOT, 'test', 'fixtures'), fFilter));
	if (!pForce && libFS.existsSync(BUNDLE_PATH) && (libFS.statSync(BUNDLE_PATH).mtimeMs > tmpNewestSource))
	{
		return BUNDLE_PATH;
	}
	libFS.mkdirSync(BUNDLE_DIRECTORY, { recursive: true });
	const tmpBrowserify = require.resolve('browserify/bin/cmd.js', { paths: [ PACKAGE_ROOT ] });
	const tmpBuild = libChildProcess.spawnSync(process.execPath, [ tmpBrowserify, DRIVER_ENTRY, '-s', 'PictFormInjectionHarness', '-o', BUNDLE_PATH ], { cwd: PACKAGE_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
	if ((tmpBuild.status !== 0) || !libFS.existsSync(BUNDLE_PATH))
	{
		throw new Error(`Bundling the harness driver failed: ${tmpBuild.stderr || tmpBuild.error || 'unknown error'}`);
	}
	return BUNDLE_PATH;
}

/**
 * @param {string} pModuleName
 * @return {string} the module directory
 */
function findModuleDirectory(pModuleName)
{
	let tmpDirectory = PACKAGE_ROOT;
	while (tmpDirectory)
	{
		const tmpCandidate = libPath.join(tmpDirectory, 'node_modules', pModuleName);
		if (libFS.existsSync(tmpCandidate))
		{
			return tmpCandidate;
		}
		const tmpParent = libPath.dirname(tmpDirectory);
		if (tmpParent === tmpDirectory)
		{
			break;
		}
		tmpDirectory = tmpParent;
	}
	throw new Error(`Could not find the [${pModuleName}] module from ${PACKAGE_ROOT}.`);
}

/**
 * @return {string|null} path to a chrome-family browser binary, or null when there is none
 */
function findChrome()
{
	const tmpCandidates = [ process.env.CHROME_BIN, '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ];
	const tmpCacheDirectory = libPath.join(libOS.homedir(), '.cache', 'puppeteer', 'chrome');
	if (libFS.existsSync(tmpCacheDirectory))
	{
		for (const tmpVersion of libFS.readdirSync(tmpCacheDirectory))
		{
			tmpCandidates.push(libPath.join(tmpCacheDirectory, tmpVersion, 'chrome-linux64', 'chrome'));
			tmpCandidates.push(libPath.join(tmpCacheDirectory, tmpVersion, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'));
		}
	}
	for (const tmpCandidate of tmpCandidates)
	{
		if (tmpCandidate && libFS.existsSync(tmpCandidate))
		{
			return tmpCandidate;
		}
	}
	return null;
}

/**
 * @param {string} pFilePath
 * @return {string}
 */
function toFileURL(pFilePath)
{
	return libURL.pathToFileURL(pFilePath).href;
}

/**
 * Runs one page load of the harness and returns what the driver published.
 *
 * @param {Object} pOptions
 * @param {Record<string, any>} pOptions.Config - window.PictFormInjectionHarnessConfig for the page.
 * @param {string} [pOptions.HooksSource] - JavaScript appended to the config script (window.PictFormInjectionHarnessHooks).
 * @param {string} [pOptions.Label] - Names the generated files.
 * @param {string} [pOptions.WorkDirectory] - Where the generated page and config land.
 * @param {number} [pOptions.VirtualTimeBudgetMs]
 * @param {number} [pOptions.TimeoutMs]
 * @return {Record<string, any>} the parsed harness results
 */
function runPage(pOptions)
{
	const tmpChrome = findChrome();
	if (!tmpChrome)
	{
		throw new Error('No chrome-family browser found; set CHROME_BIN to one. The tier that runs without a browser is test/PictSectionForm-Injection-Conformance_tests.js.');
	}
	const tmpLabel = pOptions.Label || 'harness';
	const tmpWorkDirectory = pOptions.WorkDirectory || libFS.mkdtempSync(libPath.join(libOS.tmpdir(), 'pict-form-harness-'));
	libFS.mkdirSync(tmpWorkDirectory, { recursive: true });
	const tmpBundle = buildBundle(false);
	const tmpPictDist = libPath.join(findModuleDirectory('pict'), 'dist', 'pict.js');
	const tmpChartDist = libPath.join(findModuleDirectory('chart.js'), 'dist', 'chart.umd.js');

	const tmpConfigPath = libPath.join(tmpWorkDirectory, `${tmpLabel}-config.js`);
	libFS.writeFileSync(tmpConfigPath, `window.PictFormInjectionHarnessConfig = ${JSON.stringify(pOptions.Config)};\n${pOptions.HooksSource || ''}\n`);

	const tmpPagePath = libPath.join(tmpWorkDirectory, `${tmpLabel}.html`);
	libFS.writeFileSync(tmpPagePath, `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>Injection Conformance Harness</title>
		<style id="PICT-CSS"></style>
		<script src="${toFileURL(tmpConfigPath)}"></script>
		<script src="${toFileURL(tmpPictDist)}"></script>
		<script src="${toFileURL(tmpChartDist)}"></script>
		<script src="${toFileURL(tmpBundle)}"></script>
	</head>
	<body>
		<div id="Pict-Form-Container"></div>
		<div id="PictFormInjectionHarness-Results"></div>
		<script>Pict.safeOnDocumentReady(function () { PictFormInjectionHarness.run(); });</script>
	</body>
</html>
`);

	const tmpProfileDirectory = libFS.mkdtempSync(libPath.join(libOS.tmpdir(), 'pict-form-harness-profile-'));
	const tmpBrowser = libChildProcess.spawnSync(tmpChrome,
		[
			'--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--no-default-browser-check',
			'--allow-file-access-from-files', `--virtual-time-budget=${pOptions.VirtualTimeBudgetMs || 120000}`,
			`--user-data-dir=${tmpProfileDirectory}`, '--dump-dom', toFileURL(tmpPagePath),
		],
		{ encoding: 'utf8', maxBuffer: 512 * 1024 * 1024, timeout: pOptions.TimeoutMs || 180000 });
	libFS.rmSync(tmpProfileDirectory, { recursive: true, force: true });

	const tmpMatch = RESULTS_PATTERN.exec(tmpBrowser.stdout || '');
	if (!tmpMatch)
	{
		throw new Error(`The harness page published no results (${tmpPagePath}). Browser stderr: ${String(tmpBrowser.stderr || '').split('\n').slice(-12).join('\n')}`);
	}
	return JSON.parse(Buffer.from(tmpMatch[1], 'base64').toString('utf8'));
}

/**
 * @param {any} pLeft
 * @param {any} pRight
 * @param {string} [pPath]
 * @param {Array<string>} [pDifferences]
 * @param {Array<string>} [pIgnoreKeys]
 * @return {Array<string>} addresses that differ
 */
function deepDifferences(pLeft, pRight, pPath, pDifferences, pIgnoreKeys)
{
	const tmpPath = pPath || '';
	const tmpDifferences = pDifferences || [];
	const tmpIgnoreKeys = pIgnoreKeys || [];
	if (tmpDifferences.length > 40)
	{
		return tmpDifferences;
	}
	const tmpLeftIsObject = (pLeft !== null) && (typeof pLeft === 'object');
	const tmpRightIsObject = (pRight !== null) && (typeof pRight === 'object');
	if (tmpLeftIsObject && tmpRightIsObject)
	{
		const tmpKeys = Array.from(new Set(Object.keys(pLeft).concat(Object.keys(pRight))));
		for (const tmpKey of tmpKeys)
		{
			if (!tmpPath && tmpIgnoreKeys.includes(tmpKey))
			{
				continue;
			}
			deepDifferences(pLeft[tmpKey], pRight[tmpKey], tmpPath ? `${tmpPath}.${tmpKey}` : tmpKey, tmpDifferences, tmpIgnoreKeys);
		}
		return tmpDifferences;
	}
	if (String(pLeft) !== String(pRight))
	{
		tmpDifferences.push(`${tmpPath || '(root)'}: ${JSON.stringify(pLeft)} vs ${JSON.stringify(pRight)}`);
	}
	return tmpDifferences;
}

/**
 * @param {Record<string, any>} pPhases - phase name -> harness results
 * @param {Array<string>} pSalts
 * @param {Array<string>} [pIgnoreRootKeys] - keys at the unsalted root that hold no copy data
 * @return {Array<Record<string, any>>} checks
 */
function compareDifferential(pPhases, pSalts, pIgnoreRootKeys)
{
	const [ tmpSaltA, tmpSaltB ] = pSalts;
	const tmpChecks = [];
	const addCheck = (pLabel, pDifferences, pSeverity) =>
	{
		tmpChecks.push({ Label: pLabel, Passed: pDifferences.length === 0, Severity: pSeverity || 'fail', Detail: pDifferences.slice(0, 12) });
	};
	const tmpPair = pPhases['pair'].Snapshots.Differential;
	const tmpSoloA = pPhases['solo-a'].Snapshots.Differential;
	const tmpSoloB = pPhases['solo-b'].Snapshots.Differential;
	const tmpHost = pPhases['host'].Snapshots.Differential;
	const tmpIgnoreKeys = (pIgnoreRootKeys || []).concat(pPhases['pair'].Info ? (pPhases['pair'].Info.UndeclaredSolverTargets || []) : []);

	addCheck(`copy ${tmpSaltA}: data is the same next to a sibling copy as it is alone`, deepDifferences(tmpPair.Copies[tmpSaltA].Data, tmpSoloA.Copies[tmpSaltA].Data));
	addCheck(`copy ${tmpSaltB}: data is unaffected by the sibling copy's data`, deepDifferences(tmpPair.Copies[tmpSaltB].Data, tmpSoloB.Copies[tmpSaltB].Data));
	addCheck('unsalted root: injected copies leave it as the host had it', deepDifferences(tmpHost.Root, tmpPair.Root, '', [], tmpIgnoreKeys));
	addCheck(`copy ${tmpSaltA}: section and group visibility matches the copy alone`, deepDifferences(tmpPair.Copies[tmpSaltA].Hidden, tmpSoloA.Copies[tmpSaltA].Hidden));
	addCheck(`copy ${tmpSaltB}: section and group visibility is unaffected by the sibling copy`, deepDifferences(tmpPair.Copies[tmpSaltB].Hidden, tmpSoloB.Copies[tmpSaltB].Hidden));
	addCheck(`copy ${tmpSaltA}: chart data matches the copy alone`, deepDifferences(tmpPair.Copies[tmpSaltA].Charts, tmpSoloA.Copies[tmpSaltA].Charts));
	addCheck(`copy ${tmpSaltB}: chart data is unaffected by the sibling copy`, deepDifferences(tmpPair.Copies[tmpSaltB].Charts, tmpSoloB.Copies[tmpSaltB].Charts));
	return tmpChecks;
}

/**
 * Runs the four differential phases for a manifest and returns the scenario checks plus the comparisons.
 *
 * @param {Object} pOptions - see runPage; plus Manifest, HostManifest, MarshalDestination, InitialAppData, Salts, Fill, DeclareUndeclaredSolverTargets, IgnoreRootKeys.
 * @return {{ Checks: Array<Record<string, any>>, Phases: Record<string, any>, Info: Record<string, any> }}
 */
function runDifferential(pOptions)
{
	const tmpSalts = pOptions.Salts || [ 'alpha', 'beta' ];
	const tmpPhases = {};
	let tmpChecks = [];
	for (const tmpPhase of DIFFERENTIAL_PHASES)
	{
		const tmpResults = runPage(Object.assign({}, pOptions,
			{
				Label: `${pOptions.Label || 'differential'}-${tmpPhase}`,
				Config:
				{
					Scenario: 'Differential',
					Phase: tmpPhase,
					Manifest: pOptions.Manifest,
					Manifests: pOptions.Manifests,
					HostManifest: pOptions.HostManifest,
					MarshalDestination: pOptions.MarshalDestination,
					InitialAppData: pOptions.InitialAppData,
					Salts: tmpSalts,
					Fill: pOptions.Fill,
					DeclareUndeclaredSolverTargets: Boolean(pOptions.DeclareUndeclaredSolverTargets),
				},
			}));
		tmpPhases[tmpPhase] = tmpResults;
		tmpChecks = tmpChecks.concat(tmpResults.Checks.map((pCheck) => Object.assign({}, pCheck, { Label: `${tmpPhase}: ${pCheck.Label}` })));
	}
	tmpChecks = tmpChecks.concat(compareDifferential(tmpPhases, tmpSalts, pOptions.IgnoreRootKeys));
	return { Checks: tmpChecks, Phases: tmpPhases, Info: tmpPhases['pair'].Info || {} };
}

/**
 * Runs a manifest live and then again from nothing but the data the live run saved, and compares.
 *
 * @param {Object} pOptions - see runDifferential; the same manifest, host, salts and fill drive both phases.
 *
 * @return {{ Checks: Array<Record<string, any>>, Phases: Record<string, any>, Info: Record<string, any> }}
 */
function runReconstitution(pOptions)
{
	const tmpSalts = pOptions.Salts || [ 'alpha', 'beta' ];
	const tmpBaseConfig =
	{
		Scenario: 'Reconstitution',
		Manifest: pOptions.Manifest,
		Manifests: pOptions.Manifests,
		HostManifest: pOptions.HostManifest,
		MarshalDestination: pOptions.MarshalDestination,
		InitialAppData: pOptions.InitialAppData,
		Salts: tmpSalts,
		Fill: pOptions.Fill,
		DeclareUndeclaredSolverTargets: Boolean(pOptions.DeclareUndeclaredSolverTargets),
	};
	const tmpLive = runPage(Object.assign({}, pOptions, { Label: `${pOptions.Label || 'reconstitution'}-live`, Config: Object.assign({}, tmpBaseConfig, { Phase: 'live' }) }));
	let tmpChecks = tmpLive.Checks.map((pCheck) => Object.assign({}, pCheck, { Label: `live: ${pCheck.Label}` }));
	const tmpSavedData = tmpLive.Snapshots ? tmpLive.Snapshots.SavedData : null;
	if (!tmpSavedData)
	{
		tmpChecks.push({ Label: 'the live phase produced data to save', Passed: false, Severity: 'fail', Detail: [ 'no SavedData snapshot; the live phase did not complete' ] });
		return { Checks: tmpChecks, Phases: { live: tmpLive }, Info: tmpLive.Info || {} };
	}
	const tmpRest = runPage(Object.assign({}, pOptions, { Label: `${pOptions.Label || 'reconstitution'}-rest`, Config: Object.assign({}, tmpBaseConfig, { Phase: 'rest', SavedData: tmpSavedData }) }));
	tmpChecks = tmpChecks.concat(tmpRest.Checks.map((pCheck) => Object.assign({}, pCheck, { Label: `rest: ${pCheck.Label}` })));

	const tmpLiveSnapshot = tmpLive.Snapshots.Reconstitution;
	const tmpRestSnapshot = tmpRest.Snapshots ? tmpRest.Snapshots.Reconstitution : null;
	const addCheck = (pLabel, pDifferences) =>
	{
		tmpChecks.push({ Label: pLabel, Passed: pDifferences.length === 0, Severity: 'fail', Detail: pDifferences.slice(0, 12) });
	};
	if (!tmpRestSnapshot)
	{
		addCheck('the form rebuilt from its saved data', [ 'no Reconstitution snapshot; the rest phase did not complete' ]);
		return { Checks: tmpChecks, Phases: { live: tmpLive, rest: tmpRest }, Info: tmpLive.Info || {} };
	}
	for (const tmpSalt of tmpSalts)
	{
		const tmpLiveCopy = tmpLiveSnapshot.Copies[tmpSalt] || {};
		const tmpRestCopy = tmpRestSnapshot.Copies[tmpSalt] || {};
		addCheck(`copy ${tmpSalt}: data read back from the saved form matches the form that was filled in`, deepDifferences(tmpLiveCopy.Data, tmpRestCopy.Data));
		addCheck(`copy ${tmpSalt}: section and group visibility survives the round trip`, deepDifferences(tmpLiveCopy.Hidden, tmpRestCopy.Hidden));
		addCheck(`copy ${tmpSalt}: chart data survives the round trip`, deepDifferences(tmpLiveCopy.Charts, tmpRestCopy.Charts));
		addCheck(`copy ${tmpSalt}: every input displays what it displayed before the round trip`, deepDifferences(tmpLiveCopy.Displayed, tmpRestCopy.Displayed));
	}
	return { Checks: tmpChecks, Phases: { live: tmpLive, rest: tmpRest }, Info: tmpLive.Info || {} };
}

/**
 * @param {string} pTitle
 * @param {{ Checks: Array<Record<string, any>>, Errors?: Array<string>, Info?: Record<string, any> }} pResults
 * @param {{ Verbose?: boolean }} [pOptions]
 * @return {{ Failures: number, Open: number, Passed: number }}
 */
function printResults(pTitle, pResults, pOptions)
{
	const tmpOptions = pOptions || {};
	let tmpFailures = 0;
	let tmpOpen = 0;
	let tmpPassed = 0;
	console.log(`\n# ${pTitle}`);
	for (const tmpCheck of pResults.Checks || [])
	{
		if (tmpCheck.Passed)
		{
			tmpPassed++;
			console.log(`[ok] ${tmpCheck.Label}`);
			continue;
		}
		const tmpDetail = (tmpCheck.Detail === undefined) ? '' : ` -- ${typeof tmpCheck.Detail === 'string' ? tmpCheck.Detail : JSON.stringify(tmpCheck.Detail)}`;
		if (tmpCheck.Severity === 'open')
		{
			tmpOpen++;
			console.log(`[open] ${tmpCheck.Label}${tmpDetail}`);
			continue;
		}
		tmpFailures++;
		console.log(`[fail] ${tmpCheck.Label}${tmpDetail}`);
	}
	if (tmpOptions.Verbose && Array.isArray(pResults.Errors) && (pResults.Errors.length > 0))
	{
		console.log(`\n  error-level log lines (${pResults.Errors.length}):`);
		for (const tmpError of Array.from(new Set(pResults.Errors)).slice(0, 25))
		{
			console.log(`  - ${tmpError}`);
		}
	}
	if (tmpOptions.Verbose && pResults.Info && (Object.keys(pResults.Info).length > 0))
	{
		console.log(`  info: ${JSON.stringify(pResults.Info)}`);
	}
	return { Failures: tmpFailures, Open: tmpOpen, Passed: tmpPassed };
}

/**
 * @return {number} the process exit code
 */
function main()
{
	const tmpVerbose = process.argv.includes('--verbose');
	const tmpWorkDirectory = process.argv.includes('--keep') ? libPath.join(BUNDLE_DIRECTORY, 'pages') : undefined;
	if (!findChrome())
	{
		console.log('No chrome-family browser found; set CHROME_BIN to one.');
		console.log('The injection conformance tier that runs without a browser is part of `npm test` (test/PictSectionForm-Injection-Conformance_tests.js).');
		return 2;
	}
	buildBundle(process.argv.includes('--rebuild'));
	const tmpFixture = require('../fixtures/injection/Injection-Fixture-Manifest.json');
	const tmpCases = require('../fixtures/injection/Injection-Fixture-Cases.js');

	let tmpFailures = 0;
	let tmpOpen = 0;
	let tmpPassed = 0;
	const tmpTally = (pCounts) =>
	{
		tmpFailures += pCounts.Failures;
		tmpOpen += pCounts.Open;
		tmpPassed += pCounts.Passed;
	};

	const tmpEdgeResults = runPage({ Config: { Scenario: 'EdgeCase' }, Label: 'edge-case', WorkDirectory: tmpWorkDirectory });
	tmpTally(printResults('two salted copies of the fixture manifest and a host form in one page', tmpEdgeResults, { Verbose: tmpVerbose }));

	const tmpDifferential = runDifferential(
		{
			Manifest: tmpFixture.InjectableManifest,
			HostManifest: tmpFixture.HostManifest,
			MarshalDestination: tmpCases.MARSHAL_DESTINATION,
			InitialAppData: { Orchard: { HostRate: 3 } },
			Salts: tmpCases.SALTS,
			Fill: { Seed: 7, RowCount: 3 },
			DeclareUndeclaredSolverTargets: true,
			IgnoreRootKeys: Object.keys(tmpCases.KNOWN_ROOT_KEYS),
			Label: 'differential',
			WorkDirectory: tmpWorkDirectory,
		});
	tmpTally(printResults('a copy alone against a copy next to a sibling (any manifest, no expected values)', tmpDifferential, { Verbose: tmpVerbose }));

	const tmpReconstitution = runReconstitution(
		{
			Manifest: tmpFixture.InjectableManifest,
			HostManifest: tmpFixture.HostManifest,
			MarshalDestination: tmpCases.MARSHAL_DESTINATION,
			InitialAppData: { Orchard: { HostRate: 3 } },
			Salts: tmpCases.SALTS,
			Fill: { Seed: 7, RowCount: 3 },
			DeclareUndeclaredSolverTargets: true,
			Label: 'reconstitution',
			WorkDirectory: tmpWorkDirectory,
		});
	tmpTally(printResults('a filled-in form against the same form rebuilt from the data it saved', tmpReconstitution, { Verbose: tmpVerbose }));

	console.log(`\n${tmpPassed} passing, ${tmpFailures} failing, ${tmpOpen} open check(s)`);
	return (tmpFailures > 0) ? 1 : 0;
}

module.exports = { buildBundle, findChrome, runPage, runDifferential, runReconstitution, compareDifferential, deepDifferences, printResults };

if (require.main === module)
{
	process.exitCode = main();
}
