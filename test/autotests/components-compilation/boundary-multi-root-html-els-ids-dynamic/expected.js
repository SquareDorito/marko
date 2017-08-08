// Compiled using markoc@4.4.21 - DO NOT EDIT
"use strict";

var marko_template = module.exports = require("marko/src/html").t(__filename),
    marko_component = {},
    components_helpers = require("marko/src/components/helpers"),
    marko_registerComponent = components_helpers.rc,
    marko_componentType = marko_registerComponent("/marko-test$1.0.0/autotests/components-compilation/boundary-multi-root-html-els-ids-dynamic/index.marko", function() {
      return module.exports;
    }),
    marko_renderer = components_helpers.r,
    marko_defineComponent = components_helpers.c,
    marko_helpers = require("marko/src/runtime/html/helpers"),
    marko_attr = marko_helpers.a;

function render(input, out, __component, component, state) {
  var data = input;

  var marko_componentBoundaryStartId = input.myStart;

  out.w("<h1" +
    marko_attr("id", marko_componentBoundaryStartId) +
    "></h1>");

  var marko_componentBoundaryEndId = input.myEnd;

  out.w("<div" +
    marko_attr("id", marko_componentBoundaryEndId) +
    "></div>");

  __component.boundary = [
      "#" + marko_componentBoundaryStartId,
      "#" + marko_componentBoundaryEndId
    ];
}

marko_template._ = marko_renderer(render, {
    type: marko_componentType,
    id: marko_componentBoundaryStartId
  }, marko_component);

marko_template.Component = marko_defineComponent(marko_component, marko_template._);

marko_template.meta = {
    deps: [
      {
          type: "require",
          path: "./index.marko"
        }
    ]
  };
