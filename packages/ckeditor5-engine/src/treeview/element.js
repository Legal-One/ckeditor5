/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import ViewText from './text.js';
import Node from './node.js';
import utils from '../utils.js';
import langUtils from '../lib/lodash/lang.js';

export default class Element extends Node {
	constructor( name, attrs, children ) {
		super();

		/**
		 * @readolny
		 */
		this.name = name;

		if ( langUtils.isPlainObject( attrs ) ) {
			this._attrs = utils.objectToMap( attrs );
		} else {
			this._attrs = new Map( attrs );
		}

		this._children = [];

		if ( children ) {
			this.insertChildren( 0, children );
		}

		this._domElement = null;
	}

	appendChildren( nodes ) {
		this.insertChildren( this.getChildCount(), nodes );
	}

	bindDomElement( domElement ) {
		this._domElement = domElement;

		Element._domToViewMapping.set( domElement, this );
	}

	cloneDomAttrs( element ) {
		this.markToSync( 'ATTRIBUTES_NEED_UPDATE' );

		for ( let i = element.attributes.length - 1; i >= 0; i-- ) {
			let attr = element.attributes[ i ];
			this.setAttr( attr.name, attr.value );
		}
	}

	getChild( index ) {
		return this._children[ index ];
	}

	getChildCount() {
		return this._children.length;
	}

	getChildIndex( node ) {
		return this._children.indexOf( node );
	}

	getChildren() {
		return this._children[ Symbol.iterator ]();
	}

	getCorespondingDom() {
		return this._domElement;
	}

	getAttrKeys() {
		return this._attrs.keys();
	}

	getAttr( key ) {
		return this._attrs.get( key );
	}

	hasAttr( key ) {
		return this._attrs.has( key );
	}

	setAttr( key, value ) {
		this.markToSync( 'ATTRIBUTES_NEED_UPDATE' );

		this._attrs.set( key, value );
	}

	insertChildren( index, nodes ) {
		this.markToSync( 'CHILDREN_NEED_UPDATE' );

		if ( !utils.isIterable( nodes ) ) {
			nodes = [ nodes ];
		}

		for ( let node of nodes ) {
			node.parent = this;

			this._children.splice( index, 0, node );
			index++;
		}
	}

	removeAttr( key ) {
		this.markToSync( 'ATTRIBUTES_NEED_UPDATE' );

		return this._attrs.delete( key );
	}

	removeChildren( index, number ) {
		this.markToSync( 'CHILDREN_NEED_UPDATE' );

		for ( let i = index; i < index + number; i++ ) {
			this._children[ i ].parent = null;
		}

		return this._children.splice( index, number );
	}

	// Note that created elements will not have coresponding DOM elements created it these did not exist before.
	static createFromDom( domElement ) {
		let viewElement = this.getCorespondingView( domElement );

		if ( viewElement ) {
			return viewElement;
		}

		if ( domElement instanceof Text ) {
			return new ViewText( domElement.data );
		} else {
			viewElement = new Element( domElement.tagName.toLowerCase() );
			const attrs = domElement.attributes;

			for ( let i = attrs.length - 1; i >= 0; i-- ) {
				viewElement.setAttr( attrs[ i ].name, attrs[ i ].value );
			}

			for ( let i = 0, len = domElement.childNodes.length; i < len; i++ ) {
				let domChild = domElement.childNodes[ i ];

				viewElement.appendChildren( this.createFromDom( domChild ) );
			}

			return viewElement;
		}
	}

	// Coresponding elements exists only for rendered elementes.
	static getCorespondingView( domElement ) {
		return this._domToViewMapping.get( domElement );
	}
}

Element._domToViewMapping = new WeakMap();
