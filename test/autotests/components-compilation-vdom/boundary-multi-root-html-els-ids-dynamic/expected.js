"use strict";

var marko_template = module.exports = require("marko/src/vdom").t(__filename),
    marko_component = {},
    components_helpers = require("marko/src/components/helpers"),
    marko_registerComponent = components_helpers.rc,
    marko_componentType = marko_registerComponent("/marko-test$1.0.0/autotests/components-compilation-vdom/boundary-multi-root-html-els-ids-dynamic/index.marko", function() {
      return module.exports;
    }),
    marko_renderer = components_helpers.r,
    marko_defineComponent = components_helpers.c;

function render(input, out, __component, component, state) {
  var data = input;

  var marko_componentBoundaryStartId = input.myStart;

  out.e("H1", {
      id: marko_componentBoundaryStartId
    }, 0, 20, {
      c: __component.id
    });

  var marko_componentBoundaryEndId = input.myEnd;

  out.e("DIV", {
      id: marko_componentBoundaryEndId
    }, 0, 36, {
      c: __component.id
    });

  __component.___boundary = [
      "#" + marko_componentBoundaryStartId,
      "#" + marko_componentBoundaryEndId
    ];
}

marko_template._ = marko_renderer(render, {
    type: marko_componentType
  }, marko_component);

marko_template.Component = marko_defineComponent(marko_component, marko_template._);

marko_template.meta = {
    deps: [
      {
          type: "require",
          path: "./"
        }
    ]
  };
