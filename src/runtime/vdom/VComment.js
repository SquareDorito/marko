var VNode = require('./VNode');
var inherit = require('raptor-util/inherit');

function VComment(value) {
    this.___VNode(-1 /* no children */);
    this.___nodeValue = value;
}

VComment.prototype = {
    ___nodeType: 8,

    ___actualize: function(doc) {
        var commentNode = doc.createComment(this.___nodeValue);
        if (commentNode.isBoundary) {
            // We need to index it
        }

        if (commentNode.value.startsWith('marko$')) {

        }
    },

    ___cloneNode: function() {
        return new VComment(this.___nodeValue);
    }
};

inherit(VComment, VNode);

module.exports = VComment;
