'use strict';
var specialElHandlers = require('./specialElHandlers');

var morphAttrs = require('../runtime/vdom/VElement').___morphAttrs;

var ELEMENT_NODE = 1;
var TEXT_NODE = 3;
var COMMENT_NODE = 8;

// var FLAG_IS_SVG = 1;
// var FLAG_IS_TEXTAREA = 2;
// var FLAG_SIMPLE_ATTRS = 4;
var FLAG_PRESERVE = 8;
var FLAG_COMPONENT_START_NODE = 16;
var FLAG_COMPONENT_END_NODE = 32;

function compareNodeNames(fromEl, toEl) {
    return fromEl.nodeName === toEl.___nodeName;
}

function getElementById(doc, id) {
    return doc.getElementById(id);
}

function morphdom(
        startNode,
        endNode,
        toNode,
        doc,
        context,
        onNodeAdded,
        onBeforeNodeDiscarded,
        onNodeDiscarded,
        onBeforeElChildrenUpdated
    ) {

    // This object is used as a lookup to quickly find all keyed elements in the original DOM tree.
    var removalList = [];
    var foundKeys = {};

    function walkDiscardedChildNodes(node) {
        onNodeDiscarded(node);
        var curChild = node.firstChild;

        while (curChild) {
            walkDiscardedChildNodes(curChild);
            curChild = curChild.nextSibling;
        }
    }


    function insertVirtualNodeBefore(vNode, referenceEl, parentEl) {
        var realEl = vNode.___actualize(doc);
        parentEl.insertBefore(realEl, referenceEl);

        onNodeAdded(realEl, context);

        var vCurChild = vNode.___firstChild;
        while (vCurChild) {
            var flags = vCurChild.___flags;
            if (flags & FLAG_PRESERVE) {
                if (flags & FLAG_COMPONENT_START_NODE) {
                    var fromComponent = context.___existingComponentLookup[vCurChild.id];
                    fromComponent.appendTo(realEl);
                } else {
                    realEl.appendChild(getElementById(doc, vCurChild.id));
                }
            } else {
                insertVirtualNodeBefore(vCurChild, null, realEl);
            }

            vCurChild = vCurChild.___nextSibling;
        }
    }

    function insertVirtualComponentBefore(vNode, componentId, referenceNode, referenceNodeParentEl) {
        var curComponentId;

        do {
            insertVirtualNodeBefore(vNode, referenceNode, referenceNodeParentEl);
            var nodeType = vNode.___nodeType;
            if (nodeType === ELEMENT_NODE) {
                curComponentId = (vNode.___flags & FLAG_COMPONENT_END_NODE) !== 0 && vNode.___properties.c;
                if (curComponentId === true) {
                    curComponentId = vNode.id;
                }
            } else if (nodeType === COMMENT_NODE) {
                var commentValue = vNode.___nodeValue;
                if (commentValue[0] === '$') {
                    curComponentId = commentValue.substring(1);
                }
            }
            vNode = vNode.___nextSibling;
        } while(curComponentId !== componentId);

        return vNode;
    }

    function morphEl(fromEl, toEl, childrenOnly) {
        var toElKey = toEl.id;
        var nodeName = toEl.___nodeName;

        if (childrenOnly === false) {
            if (toElKey) {
                // If an element with an ID is being morphed then it is will be in the final
                // DOM so clear it out of the saved elements collection
                foundKeys[toElKey] = true;
            }

            var constId = toEl.___constId;
            if (constId !== undefined) {
                var otherProps = fromEl._vprops;
                if (otherProps !== undefined && constId === otherProps.i) {
                    return;
                }
            }

            morphAttrs(fromEl, toEl);
        }


        if (onBeforeElChildrenUpdated(fromEl, toElKey, context) === true) {
            return;
        }

        if (nodeName !== 'TEXTAREA') {
            var curToNodeChild = toEl.___firstChild;
            var curFromNodeChild = childrenOnly === true ? startNode : fromEl.firstChild;
            var curToNodeKey;
            var curFromNodeKey;
            var curToNodeType;

            var fromNextSibling;
            var toNextSibling;
            var matchingFromEl;
            var fromComponent;
            var toComponent;
            var toComponentId;
            var isComponentPaired;
            var toNodeFlags;

            outer: while (curToNodeChild) {
                toNextSibling = curToNodeChild.___nextSibling;
                curToNodeKey = curToNodeChild.id;
                curToNodeType = curToNodeChild.___nodeType;
                isComponentPaired = false;
                toComponentId = undefined;

                if (curToNodeType === ELEMENT_NODE) {
                    toNodeFlags = curToNodeChild.___flags;

                    toComponentId = (toNodeFlags & FLAG_COMPONENT_START_NODE) !== 0 && curToNodeChild.___properties.c;
                    if (toComponentId === true) {
                        toComponentId = curToNodeChild.id;
                    }
                } else if (curToNodeType === COMMENT_NODE) {
                    var commentValue = curToNodeChild.___nodeValue;
                    if (commentValue[0] === '^') {
                        toComponentId = commentValue.substring(1);
                    }
                }

                if (toComponentId && (toComponent = context.___componentsById[toComponentId])) {
                    // The target element is the start node for a UI component.
                    // We take a look at the target node to see if it is also
                    // associated with a UI component.
                    if (curFromNodeChild) {
                        fromComponent = context.___existingComponentLookup[toComponentId];
                        if (fromComponent) {
                            if (fromComponent.___type === toComponent.___type) {
                                if (fromComponent.___startNode !== curFromNodeChild) {
                                    // The "to" component does not match the "from" component,
                                    // but we found the matching from component elsewhere
                                    // in the DOM so let's move into place, but we first
                                    // make sure the types match
                                    fromEl.insertBefore(fromComponent.___detach(), curFromNodeChild);
                                    curFromNodeChild = fromComponent.___startNode;
                                }

                                isComponentPaired = true;
                            } else {
                                if (fromComponent.___startNode !== curFromNodeChild) {
                                    curFromNodeChild = fromComponent.___endNode.nextSibling;
                                }

                                curToNodeChild = insertVirtualComponentBefore(curToNodeChild, toComponentId, curFromNodeChild, fromEl);
                                fromComponent.destroy();
                                continue;
                            }
                        } else {
                            curToNodeChild = insertVirtualComponentBefore(curToNodeChild, toComponentId, curFromNodeChild, fromEl);
                            continue;
                        }
                    }
                } else if (curToNodeKey && toNodeFlags & FLAG_PRESERVE) {
                    curToNodeChild = toNextSibling; // Skip over the preserve marker

                    if (toNodeFlags & FLAG_COMPONENT_START_NODE) {
                        // We have found a marker that indicates that a component
                        // at the current location in the target VDOM is to be
                        // preserved. If the current DOM node in the original tree
                        // happens to be the start boundary for the preserved UI
                        // component then we just need to skip over those nodes.
                        // If not, then we need to move the component's nodes into
                        // this location
                        fromComponent = context.___existingComponentLookup[curToNodeKey];

                        if (fromComponent.___startNode === curFromNodeChild) {
                            // Perfect match! Now just need to skip over all of the
                            // nodes associated with the component. We have already
                            // skipped over the target node
                            curFromNodeChild = fromComponent.___endNode.nextSibling;
                        } else {
                            // We move the matching component's nodes into the proper
                            // location
                            fromEl.insertBefore(fromComponent.___detach(), curFromNodeChild);
                        }
                    } else {
                        // We are just preserving the HTML element
                        if (curFromNodeChild && curFromNodeChild.id === curToNodeKey) {
                            // Perfect match for the preserved element so continue
                            curFromNodeChild = curFromNodeChild.nextSibling;
                        } else {
                            // We need to move the preserved DOM node into this position
                            fromEl.insertBefore(getElementById(doc, curToNodeKey), curFromNodeChild);
                        }
                    }

                    continue;
                }

                while (curFromNodeChild) {
                    if (childrenOnly === true && curFromNodeChild === endNode) {
                        break;
                    }
                    if (!isComponentPaired && (fromComponent = curFromNodeChild._c)) {
                        // The current "to" element is not associated with a component,
                        // but the current "from" element is associated with a component

                        // Even if we destroy the current component in the original
                        // DOM or not, we still need to skip over it since it is
                        // not compatible with the current "to" node
                        curFromNodeChild = fromComponent.___endNode.nextSibling;

                        if (context.___preservedComponents[fromComponent.id] ||
                            ((toComponent = context.___componentsById[fromComponent.id]) && fromComponent.___type === toComponent.___type)) {
                            // A compatible UI component was rendered to the VDOM so we will just
                            // ignore this UI component in the original DOM by skipping
                            // over its DOM nodes
                            continue;
                        } else {
                            // Let's just destroy this component and remove it from the
                            // original DOM since it is not in the rendered VDOM
                            fromComponent.destroy();
                        }

                        continue; // Move to the next "from" node
                    }

                    fromNextSibling = curFromNodeChild.nextSibling;

                    curFromNodeKey = curFromNodeChild.id;

                    var curFromNodeType = curFromNodeChild.nodeType;

                    var isCompatible = undefined;

                    if (curFromNodeType === curToNodeType) {
                        if (curFromNodeType === ELEMENT_NODE) {
                            // Both nodes being compared are Element nodes

                            if (curToNodeKey) {
                                // The target node has a key so we want to match it up with the correct element
                                // in the original DOM tree
                                if (curToNodeKey !== curFromNodeKey) {
                                    // The current element in the original DOM tree does not have a matching key so
                                    // let's check our lookup to see if there is a matching element in the original
                                    // DOM tree
                                    if ((matchingFromEl = getElementById(doc, curToNodeKey))) {
                                        if (curFromNodeChild.nextSibling === matchingFromEl) {
                                            // Special case for single element removals. To avoid removing the original
                                            // DOM node out of the tree (since that can break CSS transitions, etc.),
                                            // we will instead discard the current node and wait until the next
                                            // iteration to properly match up the keyed target element with its matching
                                            // element in the original tree
                                            isCompatible = false;
                                        } else {
                                            // We found a matching keyed element somewhere in the original DOM tree.
                                            // Let's moving the original DOM node into the current position and morph
                                            // it.

                                            // NOTE: We use insertBefore instead of replaceChild because we want to go through
                                            // the `removeNode()` function for the node that is being discarded so that
                                            // all lifecycle hooks are correctly invoked
                                            fromEl.insertBefore(matchingFromEl, curFromNodeChild);

                                            removalList.push(curFromNodeChild);

                                            curFromNodeChild = matchingFromEl;
                                        }
                                    } else {
                                        // The nodes are not compatible since the "to" node has a key and there
                                        // is no matching keyed node in the source tree
                                        isCompatible = false;
                                    }
                                }
                            } else if (curFromNodeKey) {
                                // The original has a key
                                isCompatible = false;
                            }

                            isCompatible = isCompatible !== false && compareNodeNames(curFromNodeChild, curToNodeChild) === true;

                            if (isCompatible === true) {
                                // We found compatible DOM elements so transform
                                // the current "from" node to match the current
                                // target DOM node.
                                morphEl(curFromNodeChild, curToNodeChild, false);
                            }

                        } else if (curFromNodeType === TEXT_NODE) {
                            // Both nodes being compared are Text or Comment nodes
                            isCompatible = true;
                            // Simply update nodeValue on the original node to
                            // change the text value
                            if (curFromNodeChild.nodeValue !== curToNodeChild.___nodeValue) {
                                curFromNodeChild.nodeValue = curToNodeChild.___nodeValue;
                            }
                        } else if (curFromNodeType === COMMENT_NODE) {
                            // Both nodes being compared are comment nodes
                            // We don't want to mutate comment nodes since we
                            // attach metadata to them, including the component
                            // that is bound to the comment node (if any)
                            isCompatible = curFromNodeChild.nodeValue === curToNodeChild.___nodeValue;
                        }
                    }

                    if (isCompatible === true) {
                        // Advance both the "to" child and the "from" child since we found a match
                        curToNodeChild = toNextSibling;
                        curFromNodeChild = fromNextSibling;
                        continue outer;
                    }

                    if (!context.___preserved[curFromNodeKey]) {
                        // We wait to the end to remove any nodes
                        removalList.push(curFromNodeChild);
                    }

                    curFromNodeChild = fromNextSibling;
                }

                // If we got this far then we did not find a candidate match for
                // our "to node" and we exhausted all of the children "from"
                // nodes. Therefore, we will just append the current "to" node
                // to the end
                if (curToNodeKey && (matchingFromEl = getElementById(doc, curToNodeKey)) && compareNodeNames(matchingFromEl, curToNodeChild)) {
                    fromEl.appendChild(matchingFromEl);
                    morphEl(matchingFromEl, curToNodeChild, false);
                } else {
                    insertVirtualNodeBefore(curToNodeChild, fromNextSibling, fromEl);
                }

                curToNodeChild = toNextSibling;
                curFromNodeChild = fromNextSibling;
            }

            if (childrenOnly === false || endNode === null || curFromNodeChild !== endNode) {
                // We have processed all of the "to nodes". If curFromNodeChild is
                // non-null then we still have some from nodes left over that need
                // to be removed
                while (curFromNodeChild) {
                    removalList.push(curFromNodeChild);
                    curFromNodeChild = curFromNodeChild.nextSibling;
                }
            }
        }

        var specialElHandler = specialElHandlers[nodeName];
        if (specialElHandler) {
            specialElHandler(fromEl, toEl);
        }
    } // END: morphEl(...)

    morphEl(startNode.parentNode, toNode, true);

    // We now need to loop over any nodes that might need to be
    // removed. We only do the removal if we know that the keyed node
    // never found a match. When a keyed node is matched up we remove
    // it out of fromNodesLookup and we use fromNodesLookup to determine
    // if a keyed node has been matched up or not
    for (var i=0, len=removalList.length; i<len; i++) {
        var node = removalList[i];
        var key = node.id;
        if (!key || foundKeys[key] === undefined) {
            var parentNode = node.parentNode;
            if (parentNode !== null) {
                if (onBeforeNodeDiscarded(node) == false) {
                    continue;
                }

                if (parentNode !== null) {
                    parentNode.removeChild(node);
                }

                walkDiscardedChildNodes(node);
            }
        }
    }
}

module.exports = morphdom;
