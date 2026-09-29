#!/usr/bin/env node
/*
	Starts the example server, loads http://localhost:<port>/?smoke=1 in jsdom -- which fetches the page and
	its scripts from the server and makes the app's reads over real HTTP -- and prints the walkthrough's
	[ok] / [fail] checks with the server's request log. Build first (npm run build).

		node Facet-Filter-Smoke-Runner.js [--port 8087]
*/

const libChildProcess = require('child_process');
const libFS = require('fs');
const libPath = require('path');

const libJSDOM = require('jsdom');

const TIMEOUT_MS = 30000;

/**
 * @param {number} pMilliseconds
 * @return {Promise<void>}
 */
function wait(pMilliseconds)
{
	return new Promise((fResolve) => setTimeout(fResolve, pMilliseconds));
}

async function main()
{
	const tmpPortIndex = process.argv.indexOf('--port');
	const tmpPort = (tmpPortIndex > 0) ? process.argv[tmpPortIndex + 1] : '8087';
	if (!libFS.existsSync(libPath.join(__dirname, 'dist', 'index.html')))
	{
		console.error('No dist/ -- run `npm run build` first.');
		return 2;
	}
	const tmpServer = libChildProcess.spawn(process.execPath, [ libPath.join(__dirname, 'Facet-Filter-Server.js'), '--port', tmpPort ], { stdio: [ 'ignore', 'pipe', 'inherit' ] });
	const tmpServerLog = [];
	try
	{
		await new Promise((fResolve, fReject) =>
		{
			tmpServer.on('exit', (pCode) => fReject(new Error(`The server exited (${pCode}); is port ${tmpPort} free?`)));
			tmpServer.stdout.on('data', (pChunk) =>
			{
				tmpServerLog.push(String(pChunk));
				if (String(pChunk).includes('Facet Filter example:'))
				{
					fResolve();
				}
			});
		});

		const tmpConsole = new libJSDOM.VirtualConsole();
		const tmpPageErrors = [];
		tmpConsole.on('jsdomError', (pError) => tmpPageErrors.push(String(pError && pError.message ? pError.message : pError)));
		const tmpDOM = await libJSDOM.JSDOM.fromURL(`http://localhost:${tmpPort}/?smoke=1`, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: tmpConsole });

		const tmpStart = Date.now();
		let tmpResults = null;
		while (!tmpResults && ((Date.now() - tmpStart) < TIMEOUT_MS))
		{
			const tmpElement = tmpDOM.window.document.getElementById('Facet-Filter-Smoke-Results');
			if (tmpElement)
			{
				tmpResults = JSON.parse(Buffer.from(tmpElement.getAttribute('data-results'), 'base64').toString('utf8'));
			}
			await wait(100);
		}
		tmpDOM.window.close();

		console.log('Server requests:');
		for (const tmpLine of tmpServerLog.join('').split('\n').filter((pLine) => pLine.includes(' GET ')))
		{
			console.log(`  ${tmpLine}`);
		}
		if (tmpPageErrors.length)
		{
			console.log(`Page errors:\n  ${tmpPageErrors.slice(0, 10).join('\n  ')}`);
		}
		if (!tmpResults)
		{
			console.error(`The walkthrough published no results within ${TIMEOUT_MS} ms.`);
			return 1;
		}
		let tmpFailures = 0;
		console.log('Walkthrough:');
		for (const tmpCheck of tmpResults)
		{
			tmpFailures += tmpCheck.Passed ? 0 : 1;
			console.log(`  [${tmpCheck.Passed ? 'ok' : 'fail'}] ${tmpCheck.Label}${tmpCheck.Passed ? '' : '  -- ' + JSON.stringify(tmpCheck.Detail)}`);
		}
		console.log(`${tmpResults.length - tmpFailures} of ${tmpResults.length} passed.`);
		return tmpFailures ? 1 : 0;
	}
	finally
	{
		tmpServer.kill();
	}
}

main().then((pCode) => { process.exitCode = pCode; }, (pError) => { console.error(pError); process.exitCode = 2; });
