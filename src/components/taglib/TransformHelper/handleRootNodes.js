'use strict';

let path = require('path');
let getComponentFiles = require('./getComponentFiles');

const esprima = require('esprima');
const escodegen = require('escodegen');
const FLAG_COMPONENT_STYLE = Symbol('COMPONENT_STYLE');

function handleStyleElement(styleEl, transformHelper) {
    if (styleEl.bodyText) {
        return;
    }

    let attrs = styleEl.attributes;

    let styleCode;
    let lang = 'css';

    let hasStyleBlock = false;

    for (let i=attrs.length-1; i>=0; i--) {
        let attr = attrs[i];
        let name = attr.name;
        if (name.startsWith('{')) {
            hasStyleBlock = true;

            styleCode = name.slice(1, -1).trim();
        } else if (name === 'class') {
            if (attr.value.type !== 'Literal' || typeof attr.value.value !== 'string') {
                return;
            }

            lang = attr.value.value;
        } else {
            if (hasStyleBlock) {
                transformHelper.context.addError(styleEl, 'Unsupported attribute on the component style tag: ' + attr.name);
                return;
            }
        }
    }

    if (!hasStyleBlock) {
        return;
    }

    styleEl.setFlag(FLAG_COMPONENT_STYLE);

    if (styleCode) {
        let context = transformHelper.context;
        context.addDependency({
            type: lang,
            code: styleCode,
            virtualPath: './'+path.basename(context.filename)+'.'+lang,
            path: './'+path.basename(context.filename)
        });
    }

    styleEl.detach();
}

function methodToProperty(method) {
    return {
        type: 'Property',
        key: method.key,
        computed: false,
        value: method.value,
        kind: 'init',
        method: false,
        shorthand: false
    };
}

function classToObject(cls, el, transformHelper) {
    return {
        type: 'ObjectExpression',
        properties: cls.body.body.map((method) => {
            if(method.type != 'MethodDefinition') {
                throw Error('Only methods are allowed on single file component class definitions.');
            }

            if (method.kind === 'method') {
                return methodToProperty(method);
            } else if (method.kind === 'constructor') {
                transformHelper.context.deprecate('The constructor method should not be used for a component, use onCreate instead', el);
                let converted = methodToProperty(method);
                converted.key.name = 'onCreate';
                return converted;
            } else {
                return method;
            }
        })
    };
}

function handleClassDeclaration(classEl, transformHelper) {
    let tree;
    let wrappedSrc = '('+classEl.tagString+'\n)';

    try {
        tree = esprima.parse(wrappedSrc);
    } catch(err) {
        let message = 'Unable to parse JavaScript for component class. ' + err;

        if (err.index != null) {
            let errorIndex = err.index;
            // message += '\n' + err.description;
            if (errorIndex != null && errorIndex >= 0) {
                transformHelper.context.addError({
                    pos: classEl.pos + errorIndex,
                    message: message
                });
                return;
            }
        }

        transformHelper.context.addError(classEl, message);
        return;
    }
    let expression = tree.body[0].expression;

    if (expression.superClass && expression.superClass.name) {
        transformHelper.context.addError(classEl, 'A component class is not allowed to use `extends`. See: https://github.com/marko-js/marko/wiki/Error:-Component-class-with-extends');
        return;
    }

    let object = classToObject(expression, classEl, transformHelper);
    let componentVar = transformHelper.context.addStaticVar('marko_component', escodegen.generate(object));

    if (transformHelper.getRendererModule() != null) {
        transformHelper.context.addError(classEl, 'The component has both an inline component `class` and a separate `component.js`. This is not allowed. See: https://github.com/marko-js/marko/wiki/Error:-Component-inline-and-external');
        return;
    }

    let moduleInfo = {
        inlineId: componentVar,
        filename: transformHelper.filename,
        requirePath: './' + path.basename(transformHelper.filename)
    };

    if (transformHelper.getComponentModule() == null) {
        transformHelper.setComponentModule(moduleInfo);
    }

    transformHelper.setRendererModule(moduleInfo);

    classEl.detach();
}

module.exports = function handleRootNodes() {
    let context = this.context;
    let builder = this.builder;

    let componentFiles = getComponentFiles(context.filename);
    if (!componentFiles) {
        return;
    }

    let dirname = context.dirname;

    if (componentFiles.package) {
        context.addDependency('package: ./' + componentFiles.package);
    }

    componentFiles.styles.forEach((styleFile) => {
        context.addDependency('./' + styleFile);
    });

    if (componentFiles.file) {
        let file = componentFiles.file;

        let moduleInfo = {
            filename: path.join(dirname, file),
            requirePath: './'+file.slice(0, file.lastIndexOf('.'))
        };

        this.setComponentModule(moduleInfo);
        this.setRendererModule(moduleInfo);
    }

    if (componentFiles.browserFile) {
        let file = componentFiles.browserFile;
        this.setComponentModule({
            filename: path.join(dirname, file),
            requirePath: './' + file.slice(
                0, file.lastIndexOf('.'))
        });
    }

    let templateRoot = this.el;

    let rootNodes = [];
    let hasLegacyExplicitBind = false;
    let hasIdCount = 0;
    let nodeWithAssignedId;
    let assignedId;
    let transformHelper = this;

    let walker = context.createWalker({
        enter(node) {
            let tagName = node.tagName && node.tagName.toLowerCase();

            if (node.type === 'TemplateRoot' || !node.type) {
                // Don't worry about the TemplateRoot or an Container node
            } else if (node.type === 'HtmlElement') {
                if (node.hasAttribute('w-bind')) {
                    transformHelper.setHasBoundComponentForTemplate();
                    hasLegacyExplicitBind = true;
                } else {
                    if (node.hasAttribute('id')) {
                        hasIdCount++;
                        nodeWithAssignedId = node;
                        assignedId = node.getAttributeValue('id');
                    }

                    if (tagName === 'style') {
                        handleStyleElement(node, transformHelper);
                    }

                    if (!node.isFlagSet(FLAG_COMPONENT_STYLE)) {
                        rootNodes.push(node);
                    }
                }
                walker.skip();

                return;
            } else if (node.type === 'CustomTag') {
                let tag = context.taglibLookup.getTag(node.tagName);

                if (!tag.noOutput) {
                    rootNodes.push(node);
                }

                walker.skip();
                return;
            } else {
                if (tagName === 'class') {
                    handleClassDeclaration(node, transformHelper);
                }

                walker.skip();
                return;
            }
        }
    });

    walker.walk(templateRoot);

    if (hasLegacyExplicitBind) {
        //There is an explicit bind so nothing to do
        return;
    }

    if (!this.hasBoundComponentForTemplate()) {
        return;
    }

    if (rootNodes.length === 0) {
        return;
    }

    if (rootNodes.length > 1 && hasIdCount > 0) {
        // We can only bind a component to multiple top-level elements if we can assign
        // all of the IDs
        return;
    }

    transformHelper.setHasBoundComponentForTemplate();

    let nextKey = 0;

    rootNodes.forEach((curNode, i) => {
        let id = curNode.getAttributeValue('id');

        if (id && id.type !== 'Literal') {
            context.addError('Root HTML element should not have a dynamic `id` attribute. See: https://github.com/marko-js/marko/wiki/Error:-Dynamic-root-HTML-element-id-attribute');
            return;
        }

        curNode.setFlag('hasComponentBind');

        if (!curNode.hasAttribute('key') && !curNode.hasAttribute('ref')) {
            if (curNode.type === 'CustomTag' || rootNodes.length > 1) {
                curNode.setAttributeValue('key', builder.literal('_r' + (nextKey++)));
            }
        }
    });
};
