// Compiled using markoc@4.4.21 - DO NOT EDIT
"use strict";

var marko_template = module.exports = require("marko/src/html").t(__filename),
    marko_component = {},
    marko_componentBoundary = [
        "#myStart",
        "CmyEnd"
      ],
    components_helpers = require("marko/src/components/helpers"),
    marko_registerComponent = components_helpers.rc,
    marko_componentType = marko_registerComponent("/marko-test$1.0.0/autotests/components-compilation/boundary-multi-root-html-el-id-custom-tag-key/index.marko", function() {
      return module.exports;
    }),
    marko_renderer = components_helpers.r,
    marko_defineComponent = components_helpers.c,
    marko_renderComponent = require("marko/src/components/taglib/helpers/renderComponent"),
    marko_loadTemplate = require("marko/src/runtime/helper-loadTemplate"),
    my_component_template = marko_loadTemplate(require.resolve("./components/my-component/index.marko")),
    marko_helpers = require("marko/src/runtime/html/helpers"),
    marko_loadTag = marko_helpers.t,
    my_component_tag = marko_loadTag(my_component_template);

function render(input, out, __component, component, state) {
  var data = input;

  out.w("<h1 id=\"myStart\"></h1>");

  marko_renderComponent(my_component_tag, {}, out, [
    __component,
    "myEnd"
  ]);

  __component.boundary = marko_componentBoundary;
}

marko_template._ = marko_renderer(render, {
    type: marko_componentType,
    id: "myStart"
  }, marko_component);

marko_template.Component = marko_defineComponent(marko_component, marko_template._);

marko_template.meta = {
    deps: [
      {
          type: "require",
          path: "./index.marko"
        }
    ],
    tags: [
      "./components/my-component/index.marko"
    ]
  };
