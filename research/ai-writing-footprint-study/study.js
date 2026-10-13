/* AI Writing Footprint Study: on a phone the charts are hidden, so open each chart's data table. Without script the table stays one tap away. */
(function () {
  "use strict";
  if (!window.matchMedia("(max-width: 600px)").matches) return;
  document.querySelectorAll(".figure-data").forEach(function (d) { d.open = true; });
})();
