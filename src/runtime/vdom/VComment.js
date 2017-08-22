var VNode = require('./VNode');
var inherit = require('raptor-util/inherit');
var commentNodeLookup = {};

function VComment(value) {
    this.___VNode(-1 /* no children */);
    this.___nodeValue = value;
}

VComment.prototype = {
    ___nodeType: 8,

    ___actualize: function(doc) {
        var nodeValue = this.___nodeValue;
        var realCommentNode = doc.createComment(nodeValue);
        return (commentNodeLookup[nodeValue] = realCommentNode);
    },

    ___cloneNode: function() {
        return new VComment(this.___nodeValue);
    }
};

VComment.___commentNodeLookup = commentNodeLookup;

inherit(VComment, VNode);

module.exports = VComment;
