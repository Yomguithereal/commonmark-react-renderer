'use strict';

var React = require('react');
var assign = require('lodash.assign');
var isPlainObject = require('lodash.isplainobject');

var defaultRenderers = {
    BlockQuote: getDomRenderer('blockquote'),
    Code: getDomRenderer('code'),
    Emph: getDomRenderer('em'),
    Hardbreak: getDomRenderer('br'),
    Image: getDomRenderer('img'),
    Item: getDomRenderer('li'),
    Link: getDomRenderer('a'),
    Paragraph: getDomRenderer('p'),
    Strong: getDomRenderer('strong'),
    ThematicBreak: getDomRenderer('hr'),

    HtmlBlock: HtmlRenderer,
    HtmlInline: HtmlRenderer,

    List: function List(props) {
        var tag = props.type === 'Bullet' ? 'ul' : 'ol';
        return createElement(tag, (
            props.start !== null &&
            props.start !== 1 &&
            { start: props.start.toString() } || null
        ), props.children);
    },
    CodeBlock: function Code(props) {
        var className = props.language && 'language-' + props.language;
        var code = createElement('code', { className: className }, props.literal);
        return createElement('pre', {}, code);
    },
    Heading: function Heading(props) {
        return createElement('h' + props.level, props, props.children);
    },
    Text: function Text(props) {
        return props.literal;
    },
    Softbreak: function Softbreak(props) {
        return props.softBreak;
    }
};

function HtmlRenderer(props) {
    if (props.escapeHtml) {
        return props.literal;
    }

    if (!props.skipHtml) {
        return createElement(props.isBlock ? 'div' : 'span', {
            dangerouslySetInnerHTML: { __html: props.literal }
        });
    }
}

function getDomRenderer(tag) {
    return function domRenderer(props) {
        return createElement(tag, props, props.children);
    };
}

function isGrandChildOfList(node) {
    var grandparent = node.parent.parent;
    return (
        grandparent &&
        grandparent.type === 'List' &&
        grandparent.listTight
    );
}

function addChild(node, child) {
    var parent = node;
    do {
        parent = parent.parent;
    } while (!parent.react);

    parent.react.children.push(child);
}

function createElement(tagName, props, children) {
    var args = [tagName, props].concat(children);
    return React.createElement.apply(React, args);
}

// For some nodes, we want to include more props than for others
function getNodeProps(node, key, opts, undef) {
    var props = { key: key };

    // `sourcePos` is true if the user wants source information (line/column info from markdown source)
    if (opts.sourcePos && node.sourcepos) {
        var pos = node.sourcepos;
        props['data-sourcepos'] = [
            pos[0][0], ':', pos[0][1], '-',
            pos[1][0], ':', pos[1][1]
        ].map(String).join('');
    }

    switch (node.type) {
        case 'HtmlInline':
        case 'HtmlBlock':
            props.isBlock = node.type === 'HtmlBlock';
            props.escapeHtml = opts.escapeHtml;
            props.skipHtml = opts.skipHtml;
            break;
        case 'CodeBlock':
            var codeInfo = node.info ? node.info.split(/ +/) : [];
            if (codeInfo.length > 0 && codeInfo[0].length > 0) {
                props.language = codeInfo[0];
            }
            break;
        case 'Code':
            props.children = node.literal;
            break;
        case 'Heading':
            props.level = node.level;
            break;
        case 'Softbreak':
            props.softBreak = opts.softBreak;
            break;
        case 'Link':
            props.href = node.destination;
            props.title = node.title || undef;
            break;
        case 'Image':
            props.src = node.destination;
            props.title = node.title || undef;

            // Commonmark treats image description as children. We just want the text
            props.alt = node.react.children[0];
            node.react.children = undef;
            break;
        case 'List':
            props.start = node.listStart;
            props.type = node.listType;
            props.tight = node.listTight;
            break;
        default:
    }

    props.children = props.children || (node.react && node.react.children);
    props.literal = node.literal;

    return props;
}

function renderNodes(block) {
    var walker = block.walker();

    // Softbreaks are usually treated as newlines, but in HTML we might want explicit linebreaks
    var softBreak = (
        this.softBreak === 'br' ?
        React.createElement('br') :
        this.softBreak
    );

    var propOptions = {
        sourcePos: this.sourcePos,
        escapeHtml: this.escapeHtml,
        skipHtml: this.skipHtml,
        softBreak: softBreak
    };

    var e, node, entering, leaving, doc, key, nodeProps;
    while ((e = walker.next())) {
        entering = e.entering;
        leaving = !entering;
        node = e.node;
        key = !e.node.prev ? 0 : e.node.prev.reactKey + 1;
        nodeProps = null;

        // Assigning a key to the node
        node.reactKey = key;

        // If we have not assigned a document yet, assume the current node is just that
        if (!doc) {
            doc = node;
            node.react = { children: [] };
            continue;
        } else if (node === doc) {
            // When we're leaving...
            continue;
        }

        // In HTML, we don't want paragraphs inside of list items
        if (node.type === 'Paragraph' && isGrandChildOfList(node)) {
            continue;
        }

        // `allowNode` is validated to be a function if it exists
        var isDocument = node === doc;
        var disallowedByConfig = this.allowedTypes.indexOf(node.type) === -1;
        var disallowedByUser = false;

        // Do we have a user-defined function?
        var isCompleteParent = node.isContainer && leaving;
        if (this.allowNode && (isCompleteParent || !node.isContainer)) {
            var nodeChildren = isCompleteParent ? node.react.children : [];

            nodeProps = getNodeProps(node, key, propOptions);
            disallowedByUser = !this.allowNode({
                type: node.type,
                renderer: this.renderers[node.type],
                props: nodeProps,
                children: nodeChildren
            });
        }

        if (!isDocument && (disallowedByUser || disallowedByConfig)) {
            if (!this.unwrapDisallowed && entering && node.isContainer) {
                walker.resumeAt(node, false);
            }

            continue;
        }

        var renderer = this.renderers[node.type];
        if (typeof renderer !== 'function') {
            throw new Error(
                'Renderer for type `' + node.type + '` not defined or is not a function'
            );
        }

        if (node.isContainer && entering) {
            node.react = {
                component: renderer,
                props: {},
                children: []
            };
        } else {
            addChild(node, renderer(nodeProps || getNodeProps(node, key, propOptions)));
        }
    }

    return doc.react.children;
}

function ReactRenderer(options) {
    var opts = options || {};

    if (opts.allowedTypes && opts.disallowedTypes) {
        throw new Error('Only one of `allowedTypes` and `disallowedTypes` should be defined');
    }

    if (opts.allowedTypes && !Array.isArray(opts.allowedTypes)) {
        throw new Error('`allowedTypes` must be an array');
    }

    if (opts.disallowedTypes && !Array.isArray(opts.disallowedTypes)) {
        throw new Error('`disallowedTypes` must be an array');
    }

    if (opts.allowNode && typeof opts.allowNode !== 'function') {
        throw new Error('`allowNode` must be a function');
    }

    if (opts.renderers && !isPlainObject(opts.renderers)) {
        throw new Error('`renderers` must be a plain object of `Type`: `Renderer` pairs');
    }

    var allowedTypes = opts.allowedTypes || ReactRenderer.types;
    if (opts.disallowedTypes) {
        allowedTypes = allowedTypes.filter(function filterDisallowed(type) {
            return opts.disallowedTypes.indexOf(type) === -1;
        });
    }

    return {
        sourcePos: Boolean(opts.sourcePos),
        softBreak: opts.softBreak || '\n',
        renderers: assign({}, defaultRenderers, opts.renderers),
        escapeHtml: Boolean(opts.escapeHtml),
        skipHtml: Boolean(opts.skipHtml),
        allowNode: opts.allowNode,
        allowedTypes: allowedTypes,
        unwrapDisallowed: Boolean(opts.unwrapDisallowed),
        render: renderNodes
    };
}

ReactRenderer.types = Object.keys(defaultRenderers);
ReactRenderer.renderers = defaultRenderers;

module.exports = ReactRenderer;
