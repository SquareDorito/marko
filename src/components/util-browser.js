
var markoUID = window.$MUID || (window.$MUID = { i: 0 });
var runtimeId = markoUID.i++;

var componentLookup = {};

var defaultDocument = document;
var EMPTY_OBJECT = {};

function getComponentForEl(el, doc) {
    if (el) {
        var node = typeof el == 'string' ? (doc || defaultDocument).getElementById(el) : el;
        if (node) {
            var component = node._c;

            while(component) {
                var rootFor = component.___rootFor;
                if (rootFor)  {
                    component = rootFor;
                } else {
                    break;
                }
            }

            return component;
        }
    }
}

var lifecycleEventMethods = {};

[
    'create',
    'render',
    'update',
    'mount',
    'destroy'
].forEach(function(eventName) {
    lifecycleEventMethods[eventName] = 'on' + eventName[0].toUpperCase() + eventName.substring(1);
});

/**
 * This method handles invoking a component's event handler method
 * (if present) while also emitting the event through
 * the standard EventEmitter.prototype.emit method.
 *
 * Special events and their corresponding handler methods
 * include the following:
 *
 * beforeDestroy --> onBeforeDestroy
 * destroy       --> onDestroy
 * beforeUpdate  --> onBeforeUpdate
 * update        --> onUpdate
 * render        --> onRender
 */
function emitLifecycleEvent(component, eventType, eventArg1, eventArg2) {
    var listenerMethod = component[lifecycleEventMethods[eventType]];

    if (listenerMethod !== undefined) {
        listenerMethod.call(component, eventArg1, eventArg2);
    }

    component.emit(eventType, eventArg1, eventArg2);
}

function destroyComponentForNode(el) {
    var componentToDestroy = el._c;
    if (componentToDestroy) {
        componentToDestroy.___destroyShallow();
        el._c = null;
    }
}
function destroyElRecursive(el) {
    var curChild = el.firstChild;
    while(curChild) {
        destroyComponentForNode(curChild);
        destroyElRecursive(curChild);
        curChild = curChild.nextSibling;
    }
}

function nextComponentId() {
    // Each component will get an ID that is unique across all loaded
    // marko runtimes. This allows multiple instances of marko to be
    // loaded in the same window and they should all place nice
    // together
    return 'b' + (markoUID.i++);
}

function nextComponentIdProvider(out) {
    return nextComponentId;
}

function getElementById(doc, id) {
    return doc.getElementById(id);
}

function attachBubblingEvent(componentDef, handlerMethodName, extraArgs) {
    if (handlerMethodName) {
        var id = componentDef.id;
        if (extraArgs) {
            var isRerenderInBrowser = componentDef.___globalComponentsContext.___isRerenderInBrowser;

            if (isRerenderInBrowser === true) {
                // If we are bootstrapping a page rendered on the server
                // we need to put the actual event args on the UI component
                // since we will not actually be updating the DOM
                var component = componentDef.___component;

                var bubblingDomEvents = component.___bubblingDomEvents ||
                    ( component.___bubblingDomEvents = [] );

                bubblingDomEvents.push(extraArgs);

                return;
            } else {
                return [handlerMethodName, id, extraArgs];
            }
        } else {
            return [handlerMethodName, id];
        }
    }
}

function getMarkoPropsFromEl(el) {
    var virtualProps = el._vprops;
    if (virtualProps === undefined) {
        virtualProps = el.getAttribute('data-marko');
        if (virtualProps) {
            virtualProps = JSON.parse(virtualProps);
        }
        el._vprops = virtualProps = virtualProps || EMPTY_OBJECT;
    }

    return virtualProps;
}

exports.___runtimeId = runtimeId;
exports.___componentLookup = componentLookup;
exports.___getComponentForEl = getComponentForEl;
exports.___emitLifecycleEvent = emitLifecycleEvent;
exports.___destroyComponentForNode = destroyComponentForNode;
exports.___destroyElRecursive = destroyElRecursive;
exports.___nextComponentIdProvider = nextComponentIdProvider;
exports.___getElementById = getElementById;
exports.___attachBubblingEvent = attachBubblingEvent;
exports.___getMarkoPropsFromEl = getMarkoPropsFromEl;
