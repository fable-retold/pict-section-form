#!/usr/bin/env node
/*
	A small meadow-endpoints stand-in for the Facet Filter example: serves the built app from ./dist and the
	catalog in FacetFilterData.json over the read routes the pict EntityProvider uses, logging every request.

		node Facet-Filter-Server.js [--port 8086] [--latency 0]

	Routes (all GET, under /1.0/):
		<Entity>/Schema                                   capability probe; answers with no Query support
		<Entity>/<ID>                                     one record
		<Entity>s[/FilteredTo/<filter>][/<begin>/<cap>]   a page of records
		<Entity>s/Count[/FilteredTo/<filter>]             { Count }

	Filters are meadow FilteredTo stanzas joined by "~": FBV~Field~Operator~Value (EQ, NE, LT, LE, GT, GE, LK)
	and FBL~Field~INN~a,b,c. Anything else answers 400, so a malformed filter is visible rather than ignored.
	Deleted records are left out the way meadow-endpoints leaves them out.
*/

const libHTTP = require('http');
const libFS = require('fs');
const libPath = require('path');

const DIST_DIRECTORY = libPath.join(__dirname, 'dist');
const DATA = JSON.parse(libFS.readFileSync(libPath.join(__dirname, 'FacetFilterData.json'), 'utf8'));
const CONTENT_TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.map': 'application/json', '.css': 'text/css', '.json': 'application/json' };

/**
 * @param {Array<string>} pArguments
 * @return {{ Port: number, Latency: number }}
 */
function parseArguments(pArguments)
{
	const tmpOptions = { Port: 8086, Latency: 0 };
	for (let i = 0; i < pArguments.length; i++)
	{
		if (pArguments[i] === '--port')
		{
			tmpOptions.Port = parseInt(pArguments[++i], 10);
		}
		else if (pArguments[i] === '--latency')
		{
			tmpOptions.Latency = parseInt(pArguments[++i], 10);
		}
	}
	return tmpOptions;
}

/**
 * @param {any} pLeft - the record's value
 * @param {string} pOperator
 * @param {string} pRight - the filter's value
 * @return {boolean}
 */
function compare(pLeft, pOperator, pRight)
{
	if ((pLeft === undefined) || (pLeft === null))
	{
		return pOperator === 'NE';
	}
	const tmpNumeric = (pRight !== '') && !isNaN(Number(pRight)) && !isNaN(Number(pLeft));
	let tmpLeft = tmpNumeric ? Number(pLeft) : String(pLeft);
	const tmpRight = tmpNumeric ? Number(pRight) : pRight;
	// A bare date compares against the date part of a timestamp, as the database does.
	if (!tmpNumeric && /^\d{4}-\d{2}-\d{2}$/.test(pRight) && /^\d{4}-\d{2}-\d{2}T/.test(tmpLeft))
	{
		tmpLeft = tmpLeft.substring(0, 10);
	}
	switch (pOperator)
	{
		case 'EQ':
			return tmpLeft === tmpRight;
		case 'NE':
			return tmpLeft !== tmpRight;
		case 'LT':
			return tmpLeft < tmpRight;
		case 'LE':
			return tmpLeft <= tmpRight;
		case 'GT':
			return tmpLeft > tmpRight;
		case 'GE':
			return tmpLeft >= tmpRight;
		case 'LK':
			return new RegExp(`^${String(tmpRight).split('%').map((pPart) => pPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i').test(String(tmpLeft));
		default:
			throw new Error(`Unsupported operator [${pOperator}]`);
	}
}

/**
 * @param {string} pFilter - decoded FilteredTo expression
 * @return {(pRecord: Record<string, any>) => boolean}
 */
function buildPredicate(pFilter)
{
	const tmpParts = pFilter.split('~');
	if ((tmpParts.length % 4) !== 0)
	{
		throw new Error(`Filter [${pFilter}] is not a list of Type~Field~Operator~Value stanzas`);
	}
	const tmpClauses = [];
	for (let i = 0; i < tmpParts.length; i += 4)
	{
		const [ tmpType, tmpField, tmpOperator, tmpValue ] = tmpParts.slice(i, i + 4);
		if (tmpType === 'FSF')
		{
			continue;
		}
		if ((tmpType === 'FBL') && (tmpOperator === 'INN'))
		{
			const tmpSet = new Set(tmpValue.split(',').filter((pEntry) => pEntry !== ''));
			tmpClauses.push((pRecord) => tmpSet.has(String(pRecord[tmpField])));
			continue;
		}
		if ((tmpType === 'FBV') && [ 'EQ', 'NE', 'LT', 'LE', 'GT', 'GE', 'LK' ].includes(tmpOperator))
		{
			tmpClauses.push((pRecord) => compare(pRecord[tmpField], tmpOperator, tmpValue));
			continue;
		}
		throw new Error(`Unsupported filter stanza [${tmpType}~${tmpField}~${tmpOperator}]`);
	}
	return (pRecord) => tmpClauses.every((fClause) => fClause(pRecord));
}

/**
 * @param {string} pPath - the path after /1.0/
 * @return {{ Status: number, Body: any }}
 */
function answerAPI(pPath)
{
	const tmpSegments = pPath.split('/').filter((pSegment) => pSegment !== '').map((pSegment) => decodeURIComponent(pSegment));
	const tmpHead = tmpSegments[0] || '';
	if (DATA[tmpHead] && (tmpSegments[1] === 'Schema'))
	{
		return { Status: 200, Body: { Entity: tmpHead } };
	}
	if (DATA[tmpHead] && /^\d+$/.test(tmpSegments[1] || ''))
	{
		const tmpRecord = DATA[tmpHead].find((pRecord) => String(pRecord[`ID${tmpHead}`]) === tmpSegments[1] && !pRecord.Deleted);
		return tmpRecord ? { Status: 200, Body: tmpRecord } : { Status: 404, Body: { Error: 'Record not found' } };
	}
	const tmpEntity = tmpHead.endsWith('s') ? tmpHead.slice(0, -1) : '';
	if (!DATA[tmpEntity])
	{
		return { Status: 404, Body: { Error: `No route for [${pPath}]` } };
	}
	let tmpRest = tmpSegments.slice(1);
	const tmpCount = (tmpRest[0] === 'Count');
	if (tmpCount)
	{
		tmpRest = tmpRest.slice(1);
	}
	let tmpPredicate = () => true;
	if (tmpRest[0] === 'FilteredTo')
	{
		tmpPredicate = buildPredicate(tmpRest[1] || '');
		tmpRest = tmpRest.slice(2);
	}
	const tmpRecords = DATA[tmpEntity].filter((pRecord) => !pRecord.Deleted && tmpPredicate(pRecord));
	if (tmpCount)
	{
		return { Status: 200, Body: { Count: tmpRecords.length } };
	}
	const tmpBegin = (tmpRest.length >= 2) ? parseInt(tmpRest[0], 10) : 0;
	const tmpCap = (tmpRest.length >= 2) ? parseInt(tmpRest[1], 10) : tmpRecords.length;
	return { Status: 200, Body: tmpRecords.slice(tmpBegin, tmpBegin + tmpCap) };
}

/**
 * @param {import('http').ServerResponse} pResponse
 * @param {string} pURLPath
 */
function serveStatic(pResponse, pURLPath)
{
	const tmpRelative = (pURLPath === '/') ? 'index.html' : decodeURIComponent(pURLPath).replace(/^\/+/, '');
	const tmpPath = libPath.join(DIST_DIRECTORY, tmpRelative);
	if (!tmpPath.startsWith(DIST_DIRECTORY) || !libFS.existsSync(tmpPath) || !libFS.statSync(tmpPath).isFile())
	{
		pResponse.writeHead(404, { 'Content-Type': 'text/plain' });
		pResponse.end(libFS.existsSync(DIST_DIRECTORY) ? 'Not found' : 'No dist/ yet -- run `npm run build` first.');
		return;
	}
	pResponse.writeHead(200, { 'Content-Type': CONTENT_TYPES[libPath.extname(tmpPath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
	libFS.createReadStream(tmpPath).pipe(pResponse);
}

function main()
{
	const tmpOptions = parseArguments(process.argv.slice(2));
	const tmpServer = libHTTP.createServer((pRequest, pResponse) =>
	{
		const tmpURL = new URL(pRequest.url, 'http://localhost');
		if (!tmpURL.pathname.startsWith('/1.0/'))
		{
			return serveStatic(pResponse, tmpURL.pathname);
		}
		const tmpStart = Date.now();
		let tmpAnswer;
		if (pRequest.method !== 'GET')
		{
			tmpAnswer = { Status: 405, Body: { Error: `${pRequest.method} is not served by this example` } };
		}
		else
		{
			try
			{
				tmpAnswer = answerAPI(tmpURL.pathname.substring('/1.0/'.length));
			}
			catch (pError)
			{
				tmpAnswer = { Status: 400, Body: { Error: pError.message } };
			}
		}
		setTimeout(() =>
		{
			const tmpBody = JSON.stringify(tmpAnswer.Body);
			pResponse.writeHead(tmpAnswer.Status, { 'Content-Type': 'application/json' });
			pResponse.end(tmpBody);
			const tmpSummary = Array.isArray(tmpAnswer.Body) ? `${tmpAnswer.Body.length} record(s)` : (tmpAnswer.Body.Error || JSON.stringify(tmpAnswer.Body));
			console.log(`${new Date().toISOString()} ${pRequest.method} ${decodeURIComponent(tmpURL.pathname)} -> ${tmpAnswer.Status} ${tmpSummary} (${Date.now() - tmpStart} ms)`);
		}, tmpOptions.Latency);
	});
	tmpServer.listen(tmpOptions.Port, () =>
	{
		console.log(`Facet Filter example: http://localhost:${tmpOptions.Port}/  (API latency ${tmpOptions.Latency} ms)`);
	});
}

if (require.main === module)
{
	main();
}

module.exports = { answerAPI, buildPredicate };
