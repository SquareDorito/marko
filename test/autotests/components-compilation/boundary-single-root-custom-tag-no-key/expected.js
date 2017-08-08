// Compiled using markoc@4.4.21 - DO NOT EDIT
"use strict";

var marko_template = module.exports = require("marko/src/html").t(__filename),
    marko_component = {},
    marko_componentBoundary = "foo";

function render(input, out) {
  var data = input;

  out.w("<div id=\"foo\"></div>");

  __component.boundary = marko_componentBoundary;
}

marko_template._ = render;

marko_template.meta = {};
