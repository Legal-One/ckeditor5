/**
 * @license Copyright (c) 2003-2020, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-oss-license
 */

/* globals document, Event */

import WidgetResize from '../src/widgetresize';

// ClassicTestEditor can't be used, as it doesn't handle the focus, which is needed to test resizer visual cues.
import ClassicEditor from '@ckeditor/ckeditor5-editor-classic/src/classiceditor';
import ArticlePluginSet from '@ckeditor/ckeditor5-core/tests/_utils/articlepluginset';

import { toWidget } from '../src/utils';
import { setData as setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model';

import Rect from '@ckeditor/ckeditor5-utils/src/dom/rect';
import { mouseMock, Point } from './widgetresize/_utils/utils';

describe( 'WidgetResize', () => {
	let editor, editorElement, widget, mouseListenerSpies;

	const commitStub = sinon.stub();

	before( () => {
		mouseListenerSpies = {
			down: sinon.spy( WidgetResize.prototype, '_mouseDownListener' ),
			move: sinon.spy( WidgetResize.prototype, '_mouseMoveListener' ),
			up: sinon.spy( WidgetResize.prototype, '_mouseUpListener' )
		};
	} );

	after( () => {
		for ( const stub of Object.values( mouseListenerSpies ) ) {
			stub.restore();
		}
	} );

	beforeEach( async () => {
		editorElement = createEditorElement();
		editor = await createEditor( editorElement );

		setModelData( editor.model, '[<widget></widget>]' );

		focusEditor( editor );

		widget = editor.editing.view.document.getRoot().getChild( 0 );

		for ( const stub of Object.values( mouseListenerSpies ) ) {
			stub.resetHistory();
		}
		commitStub.resetHistory();

		// It's crucial to have a precisely defined editor size for this test suite.
		editor.editing.view.change( writer => {
			const viewEditableRoot = editor.editing.view.document.getRoot();
			writer.setAttribute( 'style', 'width: 400px; padding: 0px; overflow: hidden', viewEditableRoot );
		} );
	} );

	afterEach( () => {
		editorElement.remove();

		if ( editor ) {
			return editor.destroy();
		}
	} );

	describe( 'plugin', () => {
		it( 'is loaded', () => {
			expect( editor.plugins.get( WidgetResize ) ).to.be.instanceOf( WidgetResize );
		} );
	} );

	describe( 'mouse listeners', () => {
		beforeEach( () => {
			createResizer();
		} );

		it( 'don\'t break when called with unexpected element', () => {
			const unrelatedElement = document.createElement( 'div' );

			editor.plugins.get( WidgetResize )._mouseDownListener( {}, {
				target: unrelatedElement
			} );
		} );

		it( 'passes new width to the options.onCommit()', () => {
			const usedResizer = 'top-right';
			const domParts = getWidgetDomParts( widget, usedResizer );
			const initialPointerPosition = getHandleCenterPoint( domParts.widget, usedResizer );
			const finalPointerPosition = initialPointerPosition.clone().moveBy( 20, 0 );

			mouseMock.dragTo( editor, domParts.resizeHandle, finalPointerPosition );

			expect( commitStub.callCount ).to.be.equal( 1 );
			sinon.assert.calledWithExactly( commitStub, '120px' );
		} );
	} );

	it( 'are detached when plugin is destroyed', async () => {
		await editor.destroy();
		const plugin = editor.plugins.get( WidgetResize );
		editor = null;

		const event = new Event( 'mousedown', { bubbles: true } );
		document.body.dispatchEvent( event );

		// Ensure nothing got called.
		expect( plugin._mouseDownListener.callCount ).to.be.equal( 0 );
	} );

	it( 'nothing bad happens if activeResizer got unset', () => {
		createResizer( {
			isCentered: () => true
		} );

		const usedResizer = 'top-right';
		const domParts = getWidgetDomParts( widget, usedResizer );
		const initialPointerPosition = getHandleCenterPoint( domParts.widget, usedResizer );

		editor.plugins.get( WidgetResize )._getResizerByHandle = sinon.stub().returns( null );

		mouseMock.dragTo( editor, domParts.resizeHandle, initialPointerPosition );
		// No exception should be thrown.
	} );

	describe( 'Integration (pixels)', () => {
		describe( 'aligned widget', () => {
			beforeEach( () => {
				createResizer();
			} );

			it( 'properly sets the state for subsequent resizes', () => {
				const usedResizer = 'top-right';
				const domParts = getWidgetDomParts( widget, usedResizer );
				const initialPointerPosition = getHandleCenterPoint( domParts.widget, usedResizer );

				const intermediatePointerPosition = initialPointerPosition.clone().moveBy( 50, 0 );
				mouseMock.dragTo( editor, domParts.resizeHandle, intermediatePointerPosition );
				sinon.assert.calledWithExactly( commitStub.firstCall, '150px' );

				const finalPointerPosition = intermediatePointerPosition.clone().moveBy( 50, 0 );
				mouseMock.dragTo( editor, domParts.resizeHandle, finalPointerPosition );
				sinon.assert.calledWithExactly( commitStub.secondCall, '200px' );

				expect( commitStub.callCount ).to.be.equal( 2 );
			} );

			it( 'shrinks correctly with left-bottom handler', generateResizeTest( {
				usedHandle: 'bottom-left',
				movePointerBy: { x: 20, y: -10 },
				expectedWidth: '80px'
			} ) );

			it( 'shrinks correctly with right-bottom handler', generateResizeTest( {
				usedHandle: 'bottom-right',
				movePointerBy: { x: -20, y: -10 },
				expectedWidth: '80px'
			} ) );

			it( 'shrinks correctly with left-top handler', generateResizeTest( {
				usedHandle: 'top-left',
				movePointerBy: { x: 20, y: 10 },
				expectedWidth: '80px'
			} ) );

			it( 'shrinks correctly with right-top handler', generateResizeTest( {
				usedHandle: 'top-right',
				movePointerBy: { x: -20, y: 10 },
				expectedWidth: '80px'
			} ) );

			it( 'enlarges correctly with left-bottom handler', generateResizeTest( {
				usedHandle: 'bottom-left',
				movePointerBy: { x: -10, y: 10 },
				expectedWidth: '120px'
			} ) );

			it( 'enlarges correctly with right-bottom handler', generateResizeTest( {
				usedHandle: 'bottom-right',
				movePointerBy: { x: 10, y: 10 },
				expectedWidth: '120px'
			} ) );

			it( 'enlarges correctly with right-bottom handler, y axis only', generateResizeTest( {
				usedHandle: 'bottom-right',
				movePointerBy: { x: 0, y: 20 },
				expectedWidth: '140px'
			} ) );

			it( 'enlarges correctly with right-bottom handler, x axis only', generateResizeTest( {
				usedHandle: 'bottom-right',
				movePointerBy: { x: 40, y: 0 },
				expectedWidth: '140px'
			} ) );

			it( 'enlarges correctly with left-top handler', generateResizeTest( {
				usedHandle: 'top-left',
				movePointerBy: { x: -20, y: -10 },
				expectedWidth: '120px'
			} ) );

			it( 'enlarges correctly with right-top handler', generateResizeTest( {
				usedHandle: 'top-right',
				movePointerBy: { x: 20, y: 10 },
				expectedWidth: '120px'
			} ) );
		} );

		describe( 'centered widget', () => {
			beforeEach( () => {
				createResizer( {
					isCentered: () => true
				} );
			} );

			it( 'shrinks correctly with left-bottom handler', generateResizeTest( {
				usedHandle: 'bottom-left',
				movePointerBy: { x: 10, y: -10 },
				expectedWidth: '80px'
			} ) );

			it( 'shrinks correctly with right-bottom handler', generateResizeTest( {
				usedHandle: 'bottom-right',
				movePointerBy: { x: -10, y: -10 },
				expectedWidth: '80px'
			} ) );

			it( 'enlarges correctly with right-bottom handler, x axis only', generateResizeTest( {
				usedHandle: 'bottom-right',
				movePointerBy: { x: 10, y: 0 },
				expectedWidth: '120px'
			} ) );

			it( 'enlarges correctly with right-bottom handler, y axis only', generateResizeTest( {
				usedHandle: 'bottom-right',
				movePointerBy: { x: 0, y: 10 },
				expectedWidth: '120px'
			} ) );

			it( 'enlarges correctly with left-bottom handler, x axis only', generateResizeTest( {
				usedHandle: 'bottom-left',
				movePointerBy: { x: -10, y: 0 },
				expectedWidth: '120px'
			} ) );

			it( 'enlarges correctly with left-bottom handler, y axis only', generateResizeTest( {
				usedHandle: 'bottom-left',
				movePointerBy: { x: 0, y: 10 },
				expectedWidth: '120px'
			} ) );

			// --- top handlers ---

			it( 'enlarges correctly with left-top handler', generateResizeTest( {
				usedHandle: 'top-left',
				movePointerBy: { x: -10, y: -10 },
				expectedWidth: '120px'
			} ) );

			it( 'enlarges correctly with left-top handler, y axis only', generateResizeTest( {
				usedHandle: 'top-left',
				movePointerBy: { x: 0, y: -10 },
				expectedWidth: '120px'
			} ) );

			it( 'enlarges correctly with right-top handler', generateResizeTest( {
				usedHandle: 'top-right',
				movePointerBy: { x: 10, y: -10 },
				expectedWidth: '120px'
			} ) );

			it( 'enlarges correctly with right-top handler, y axis only', generateResizeTest( {
				usedHandle: 'top-right',
				movePointerBy: { x: 0, y: -10 },
				expectedWidth: '120px'
			} ) );
		} );

		/**
		 * @param {Object} options
		 * @param {String} options.usedHandle Handle that should be used for resize, e.g. 'bottom-right'.
		 * @param {Object} options.movePointerBy How much should the pointer move during the drag compared to the initial position.
		 * @param {String} options.expectedWidth
		 */
		function generateResizeTest( options ) {
			return () => {
				options = options || {};

				const usedHandle = options.usedHandle;
				const domParts = getWidgetDomParts( widget, usedHandle );
				const initialPointerPosition = getHandleCenterPoint( domParts.widget, usedHandle );
				const pointerDifference = options.movePointerBy;
				const finalPointerPosition = initialPointerPosition.moveBy( pointerDifference.x, pointerDifference.y );

				mouseMock.dragTo( editor, domParts.resizeHandle, finalPointerPosition );
				expect( commitStub.args[ 0 ][ 0 ] ).to.be.equal( options.expectedWidth );
				sinon.assert.calledOnce( commitStub );
			};
		}
	} );

	describe( 'Integration (percents)', () => {
		beforeEach( () => {
			createResizer( {
				unit: undefined
			} );
		} );

		it( 'properly sets the state for subsequent resizes', () => {
			const usedResizer = 'top-right';
			const domParts = getWidgetDomParts( widget, usedResizer );
			const initialPointerPosition = getHandleCenterPoint( domParts.widget, usedResizer );

			const intermediatePointerPosition = initialPointerPosition.clone().moveBy( 100, 0 );
			mouseMock.dragTo( editor, domParts.resizeHandle, intermediatePointerPosition );
			sinon.assert.calledWithExactly( commitStub.firstCall, '50%' );

			const finalPointerPosition = intermediatePointerPosition.clone().moveBy( 100, 0 );
			mouseMock.dragTo( editor, domParts.resizeHandle, finalPointerPosition );
			sinon.assert.calledWithExactly( commitStub.secondCall, '75%' );

			expect( commitStub.callCount ).to.be.equal( 2 );
		} );
	} );

	function createEditor( element ) {
		return ClassicEditor
			.create( element, {
				plugins: [
					ArticlePluginSet, WidgetResize, simpleWidgetPlugin
				]
			} );

		function simpleWidgetPlugin( editor ) {
			editor.model.schema.register( 'widget', {
				inheritAllFrom: '$block',
				isObject: true
			} );

			editor.conversion.for( 'downcast' )
				.elementToElement( {
					model: 'widget',
					view: ( modelItem, viewWriter ) => {
						const div = viewWriter.createContainerElement( 'div' );
						viewWriter.setStyle( 'height', '50px', div );
						viewWriter.setStyle( 'width', '25%', div ); // It evaluates to 100px.

						return toWidget( div, viewWriter, {
							label: 'element label'
						} );
					}
				} );
		}
	}

	function createEditorElement() {
		const element = document.createElement( 'div' );
		document.body.appendChild( element );
		return element;
	}

	function createResizer( resizerOptions ) {
		const widgetModel = editor.model.document.getRoot().getChild( 0 );

		const defaultOptions = {
			unit: 'px',

			modelElement: widgetModel,
			viewElement: widget,
			editor,

			isCentered: () => false,
			getHandleHost( domWidgetElement ) {
				return domWidgetElement;
			},
			getResizeHost( domWidgetElement ) {
				return domWidgetElement;
			},

			onCommit: commitStub
		};

		return editor.plugins.get( WidgetResize ).attachTo( Object.assign( defaultOptions, resizerOptions ) );
	}

	function getWidgetDomParts( widget, resizerPosition ) {
		const view = editor.editing.view;
		const resizeWrapper = view.domConverter.mapViewToDom( widget.getChild( 0 ) );

		return {
			resizeWrapper,
			resizeHandle: resizeWrapper.querySelector( `.ck-widget__resizer__handle-${ resizerPosition }` ),
			widget: view.domConverter.mapViewToDom( widget )
		};
	}

	/**
	 * Returns a center point for a given handle.
	 *
	 * @param {HTMLElement} domWrapper Wrapper of an element that contains the resizer.
	 * @param {String} [handlePosition='top-left']
	 * @returns {Point}
	 */
	function getHandleCenterPoint( domWrapper, handlePosition ) {
		const wrapperRect = new Rect( domWrapper );
		const returnValue = new Point( wrapperRect.left, wrapperRect.top );
		const cornerPositionParts = handlePosition.split( '-' );

		if ( cornerPositionParts.includes( 'right' ) ) {
			returnValue.x = wrapperRect.right;
		}

		if ( cornerPositionParts.includes( 'bottom' ) ) {
			returnValue.y = wrapperRect.bottom;
		}

		return returnValue;
	}

	function focusEditor( editor ) {
		editor.editing.view.focus();
		editor.ui.focusTracker.isFocused = true;
	}
} );
