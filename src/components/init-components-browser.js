'use strict';
var warp10Finalize = require('warp10/finalize');
var eventDelegation = require('./event-delegation');
var win = window;
var defaultDocument = document;
var componentsUtil = require('./util');
var componentLookup = componentsUtil.___componentLookup;
var commentNodeLookup = componentsUtil.___commentNodeLookup;
var getElementById = componentsUtil.___getElementById;
var ComponentDef = require('./ComponentDef');
var registry = require('./registry');
var serverRenderedGlobals = {};
var isArray = Array.isArray;

function invokeComponentEventHandler(component, targetMethodName, args) {
    var method = component[targetMethodName];
    if (!method) {
        throw Error('Method not found: ' + targetMethodName);
    }

    method.apply(component, args);
}

function addEventListenerHelper(el, eventType, listener) {
    el.addEventListener(eventType, listener, false);
    return function remove() {
        el.removeEventListener(eventType, listener);
    };
}

function addDOMEventListeners(component, el, eventType, targetMethodName, extraArgs, handles) {
    var removeListener = addEventListenerHelper(el, eventType, function(event) {
        var args = [event, el];
        if (extraArgs) {
            args = extraArgs.concat(args);
        }

        invokeComponentEventHandler(component, targetMethodName, args);
    });
    handles.push(removeListener);
}

function indexCommentNodes(root) {
    var treeWalker = document.createTreeWalker(
        root,
        128);

    var node;
    while((node = treeWalker.nextNode())) {
        var commentValue = node.nodeValue;
        if (commentValue[0] === '^' || commentValue[0] === '$') {
            commentNodeLookup[commentValue] = node;
        }
    }
}

function resolveBoundaryNode(componentId, target, doc, prefix) {
    if (target) {
        var type = target[0];
        var targetId = target.substring(1);

        if (type === '@') {
            targetId = targetId ? componentId + '-' + targetId : componentId;
        }

        return doc.getElementById(targetId);
    } else {
        var commentNode = commentNodeLookup[prefix + componentId];
        if (!commentNode && !doc.___commendNodesIndexed) {
            doc.___commendNodesIndexed = 1;
            indexCommentNodes(doc.body);
            commentNode = commentNodeLookup[prefix + componentId];
            // We might need to index
        }
        return commentNode;
    }
}

function initComponent(componentDef, doc) {
    var component = componentDef.___component;

    if (!component || !component.___isComponent) {
        return; // legacy
    }

    component.___reset();
    component.___document = doc;

    var isExisting = componentDef.___isExisting;
    var id = component.id;

    var boundary = componentDef.___boundary;
    var startNode;
    var endNode;

    if (boundary) {
        if (isArray(boundary)) {
            startNode = resolveBoundaryNode(id, boundary[0], doc, '^');
            endNode = resolveBoundaryNode(id, boundary[1], doc, '$');
        } else {
            startNode = resolveBoundaryNode(id, boundary, doc);
        }
    } else {
        // If no boundary is provided then that means that there is a single
        // HTML element that will server as the node for the UI component
        startNode = endNode = getElementById(doc, id);
    }

    if (!endNode) {
        endNode = startNode;
    }

    component.el = startNode;

    startNode._c = componentLookup[id] = component;

    component.___startNode = startNode;
    component.___endNode = endNode;

    if (componentDef.___willRerenderInBrowser) {
        component.___rerender(true);
        return;
    }

    if (isExisting) {
        component.___removeDOMEventListeners();
    }

    var domEvents = componentDef.___domEvents;
    if (domEvents) {
        var eventListenerHandles = [];

        domEvents.forEach(function(domEventArgs) {
            // The event mapping is for a direct DOM event (not a custom event and not for bubblign dom events)

            var eventType = domEventArgs[0];
            var targetMethodName = domEventArgs[1];
            var eventEl = getElementById(doc, domEventArgs[2]);
            var extraArgs = domEventArgs[3];

            addDOMEventListeners(component, eventEl, eventType, targetMethodName, extraArgs, eventListenerHandles);
        });

        if (eventListenerHandles.length) {
            component.___domEventListenerHandles = eventListenerHandles;
        }
    }

    if (component.___mounted) {
        component.___emitLifecycleEvent('update');
    } else {
        component.___mounted = true;
        component.___emitLifecycleEvent('mount');
    }
}

/**
 * This method is used to initialized components associated with UI components
 * rendered in the browser. While rendering UI components a "components context"
 * is added to the rendering context to keep up with which components are rendered.
 * When ready, the components can then be initialized by walking the component tree
 * in the components context (nested components are initialized before ancestor components).
 * @param  {Array<marko-components/lib/ComponentDef>} componentDefs An array of ComponentDef instances
 */
function initClientRendered(componentDefs, doc) {
    // Ensure that event handlers to handle delegating events are
    // always attached before initializing any components
    eventDelegation.___init(doc);

    doc = doc || defaultDocument;
    for (var i=0,len=componentDefs.length; i<len; i++) {
        var componentDef = componentDefs[i];

        if (componentDef.___children) {
            initClientRendered(componentDef.___children, doc);
        }

        initComponent(
            componentDef,
            doc);
    }
}

/**
 * This method initializes all components that were rendered on the server by iterating over all
 * of the component IDs.
 */
function initServerRendered(renderedComponents, doc) {
    if (!renderedComponents) {
        renderedComponents = win.$components;

        if (renderedComponents && renderedComponents.forEach) {
            renderedComponents.forEach(function(renderedComponent) {
                initServerRendered(renderedComponent, doc);
            });
        }

        win.$components = {
            concat: initServerRendered
        };

        return;
    }
    // Ensure that event handlers to handle delegating events are
    // always attached before initializing any components
    eventDelegation.___init(doc || defaultDocument);

    renderedComponents = warp10Finalize(renderedComponents);

    var componentDefs = renderedComponents.w;
    var typesArray = renderedComponents.t;
    var globals = window.$MG;
    if (globals) {
        serverRenderedGlobals = warp10Finalize(globals);
        delete window.$MG;
    }

    componentDefs.forEach(function(componentDef) {
        componentDef = ComponentDef.___deserialize(componentDef, typesArray, serverRenderedGlobals, registry);
        initComponent(componentDef, doc || defaultDocument);
    });
}

exports.___initClientRendered = initClientRendered;
exports.___initServerRendered = initServerRendered;
