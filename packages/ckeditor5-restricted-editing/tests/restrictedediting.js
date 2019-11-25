/**
 * @license Copyright (c) 2003-2019, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* global document */

import testUtils from '@ckeditor/ckeditor5-core/tests/_utils/utils';
import ClassicTestEditor from '@ckeditor/ckeditor5-core/tests/_utils/classictesteditor';

import RestrictedEditing from './../src/restrictedediting';
import RestrictedEditingUI from './../src/restrictededitingui';
import RestrictedEditingEditing from './../src/restrictededitingediting';

describe( 'RestrictedEditing', () => {
	let editor, element;

	testUtils.createSinonSandbox();

	beforeEach( async () => {
		element = document.createElement( 'div' );
		document.body.appendChild( element );

		editor = await ClassicTestEditor.create( element, { plugins: [ RestrictedEditing ] } );
	} );

	afterEach( () => {
		element.remove();

		return editor.destroy();
	} );

	it( 'should be named', () => {
		expect( RestrictedEditing.pluginName ).to.equal( 'RestrictedEditing' );
	} );

	it( 'should load the RestrictedEditingEditing plugin', () => {
		expect( editor.plugins.get( RestrictedEditingEditing ) ).to.be.instanceOf( RestrictedEditingEditing );
	} );

	it( 'should load the RestrictedEditingUI plugin', () => {
		expect( editor.plugins.get( RestrictedEditingUI ) ).to.be.instanceOf( RestrictedEditingUI );
	} );
} );
