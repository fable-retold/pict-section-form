/*
	Unit tests for PictFormMetacontroller.marshalSectionToView / marshalInputToView.

	Both take a primitive (hash) or an array of hashes, look up the owning view, and marshal — the
	scoped, solver-friendly alternatives to the global marshalToView(). Exercised against a stub `this`
	so we don't need to mount a full form. Used by trigger-group `MarshalOnComplete` after PostSolvers
	that ran outside the normal solve -> marshal cycle.
*/

const Chai   = require('chai');
const Expect = Chai.expect;

const libMetacontroller   = require('../source/views/Pict-View-Form-Metacontroller.js');
const marshalSectionToView = libMetacontroller.prototype.marshalSectionToView;
const marshalInputToView   = libMetacontroller.prototype.marshalInputToView;

suite('PictFormMetacontroller marshal scoping', () =>
{
	suite('marshalSectionToView', () =>
	{
		function buildStub()
		{
			const tmpMarshaled = [];
			const tmpStub =
			{
				getSectionViewFromHash: (pHash) => (pHash === 'missing' ? false : { marshalToView: () => { tmpMarshaled.push(pHash); } }),
			};
			return { stub: tmpStub, marshaled: tmpMarshaled };
		}

		test('a single hash marshals that section view', () =>
		{
			const { stub, marshaled } = buildStub();
			marshalSectionToView.call(stub, 'H');
			Expect(marshaled).to.deep.equal([ 'H' ]);
		});

		test('an array marshals each section view', () =>
		{
			const { stub, marshaled } = buildStub();
			marshalSectionToView.call(stub, [ 'A', 'B' ]);
			Expect(marshaled).to.deep.equal([ 'A', 'B' ]);
		});

		test('non-string / empty hashes are filtered; a missing view is skipped without throwing', () =>
		{
			const { stub, marshaled } = buildStub();
			Expect(() => marshalSectionToView.call(stub, [ 'A', '', null, 7, 'missing' ])).to.not.throw();
			Expect(marshaled).to.deep.equal([ 'A' ]);
		});

		test('undefined is a no-op', () =>
		{
			const { stub, marshaled } = buildStub();
			marshalSectionToView.call(stub, undefined);
			Expect(marshaled).to.have.length(0);
		});
	});

	suite('marshalInputToView', () =>
	{
		function buildStub()
		{
			const tmpMarshaled = [];
			const tmpStub =
			{
				_views:
				[
					{ getInputFromHash: () => null, manualMarshalDataToViewByInput: () => { throw new Error('non-owner view should not marshal'); } },
					{ getInputFromHash: (pHash) => (pHash === 'X' ? { Hash: 'X' } : null), manualMarshalDataToViewByInput: (pInput) => { tmpMarshaled.push(pInput.Hash); } },
				],
				filterViews: () => tmpStub._views,
			};
			return { stub: tmpStub, marshaled: tmpMarshaled };
		}

		test('marshals the input on its owning section view only', () =>
		{
			const { stub, marshaled } = buildStub();
			marshalInputToView.call(stub, 'X');
			Expect(marshaled).to.deep.equal([ 'X' ]);
		});

		test('an input that lives nowhere is a no-op', () =>
		{
			const { stub, marshaled } = buildStub();
			marshalInputToView.call(stub, 'Nope');
			Expect(marshaled).to.have.length(0);
		});

		test('undefined / empty does not even enumerate views', () =>
		{
			let tmpEnumerated = false;
			const tmpStub = { filterViews: () => { tmpEnumerated = true; return []; } };
			marshalInputToView.call(tmpStub, undefined);
			marshalInputToView.call(tmpStub, [ '', null ]);
			Expect(tmpEnumerated).to.equal(false);
		});
	});
});
