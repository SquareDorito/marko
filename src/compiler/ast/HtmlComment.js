'use strict';

var Node = require('./Node');

function isStaticProperties(properties) {
    for (var k in properties) {
        var v = properties[k];
        if (v.type !== 'Literal') {
            return false;
        }

        if (typeof v.value === 'object') {
            return false;
        }
    }

    return true;
}

class HtmlComment extends Node {
    constructor(def) {
        super('HtmlComment');
        this.comment = def.comment;
        this._properties = def.properties;
    }

    generateHTMLCode(codegen) {
        var comment = this.comment;
        var builder = codegen.builder;

        return [
            builder.htmlLiteral('<!--'),
            builder.html(comment),
            builder.htmlLiteral('-->')
        ];
    }

    generateVDOMCode(codegen) {
        var comment = this.comment;
        var builder = codegen.builder;

        if (Array.isArray(comment)) {
            comment = builder.concat(comment);
        }
        let properties = this._properties;
        const commentArgs = [comment];

        if (properties) {
            if (isStaticProperties(properties)) {
                properties = codegen.context.addStaticVar('props', builder.literal(properties));
            } else {
                properties = builder.literal(properties);
            }

            commentArgs.push(properties);
        }

        return builder.functionCall(
            builder.memberExpression(
                builder.identifierOut(),
                builder.identifier('comment')),
            commentArgs);
    }

    walk(walker) {
        this.comment = walker.walk(this.comment);
    }

    setPropertyValue(name, value) {
        if (!this._properties) {
            this._properties = {};
        }
        this._properties[name] = value;
    }
}

module.exports = HtmlComment;
