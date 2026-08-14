#!/usr/bin/env python3
"""build-flag-sections.py — inject the country-flag list + combo grids into a locale flag page.

WHY THIS EXISTS
---------------
Four locale flag pages (fr, it, ja, zh-tw) shipped with only 21 generic static
tiles and no country data at all — the Japanese "国旗 絵文字 一覧 / copy the
world's flags" page contained no 🇯🇵. Seven other locales (de, es, vi, th, ar,
pl, pt) already carry the full machinery. This ports that machinery onto a page
that lacks it, using CLDR country names (Intl.DisplayNames) rather than
hand-translation, so no country name is ever invented.

Country codes + region assignments are read from the EN page so every locale
partitions the world identically. Only the NAMES are localized.

USAGE
  python3 scripts/build-flag-sections.py <locale> --page <path> [--dry-run]
"""
import argparse, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STRINGS = os.path.join(ROOT, "data", "flag_page_strings")

def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def iso_to_flag(code):
    return "".join(chr(0x1F1E6 + ord(ch) - ord("A")) for ch in code)

def build_sections(st, countries):
    s = st["sections"]; r = st["regions"]
    cl, gr = s["country_list"], s["grids"]
    order = ["all", "europe", "asia", "americas", "africa", "oceania"]
    btns = "\n".join(
        f'    <button class="region-filter{" active" if k=="all" else ""}" data-region="{k}">{esc(r[k])}</button>'
        for k in order)
    return f"""
<div class="section-divider"></div>

<!-- ALL COUNTRY FLAGS -->
<section class="mood-explainers" id="country-flags">
  <span class="article-section-label">{esc(cl["label"])}</span>
  <h2>{esc(cl["h2"])}</h2>
  <p class="u-secondary-tight">{esc(cl["intro"])}</p>

  <div class="region-filters" id="regionFilters">
{btns}
  </div>

  <div class="flag-rows" id="countryFlagList"></div>
</section>

<div class="section-divider"></div>

<!-- FLAG COMBO SETS -->
<section class="mood-explainers" id="flag-grids">
  <span class="article-section-label">{esc(gr["label"])}</span>
  <h2>{esc(gr["h2"])}</h2>
  <p class="u-secondary-block">{esc(gr["intro"])}</p>

  <div id="flagGridContainer"></div>
</section>
"""

def build_script(st, countries, groups):
    rows = ",\n".join(
        '    { code: "%s", name: %s, region: "%s" }' % (c["code"], json.dumps(c["name"], ensure_ascii=False), c["region"])
        for c in countries)
    aria = st["aria_copy_flag"]
    if "{name}" not in aria:
        sys.exit(f"aria_copy_flag for {st['locale']} is missing the {{name}} placeholder")
    pre, post = aria.split("{name}", 1)
    gnames = st["groups"]
    grp = ",\n".join(
        '    { name: %s, flags: [%s] }' % (
            json.dumps(gnames[g["name"]], ensure_ascii=False),
            ",".join(json.dumps(f, ensure_ascii=False) for f in g["flags"]))
        for g in groups if g["name"] in gnames)
    return """
<script>
document.addEventListener("DOMContentLoaded", function () {
  "use strict";
  var ns = window.UltraTextGen;
  if (!ns) return;

  var COUNTRIES = [
%s
  ];

  var list = document.getElementById("countryFlagList");
  if (list) {
    COUNTRIES.forEach(function (c) {
      var flag = ns.isoToFlag(c.code);
      var row = document.createElement("div");
      row.className = "flag-row";
      row.setAttribute("data-region", c.region);
      var btn = document.createElement("button");
      btn.className = "flag-emoji symbol-tile";
      btn.setAttribute("data-symbol", flag);
      btn.setAttribute("aria-label", %s + c.name + %s);
      btn.textContent = flag;
      var label = document.createElement("span");
      label.className = "flag-label";
      label.textContent = c.name;
      row.appendChild(btn);
      row.appendChild(label);
      list.appendChild(row);
    });

    var filterBtns = document.querySelectorAll(".region-filter");
    filterBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var region = btn.getAttribute("data-region");
        filterBtns.forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        list.querySelectorAll(".flag-row").forEach(function (item) {
          item.style.display = (region === "all" || item.getAttribute("data-region") === region) ? "" : "none";
        });
      });
    });
  }

  var FLAG_GROUPS = [
%s
  ];
  if (ns.buildGrids) ns.buildGrids("flagGridContainer", FLAG_GROUPS);
});
</script>
""" % (rows, json.dumps(pre, ensure_ascii=False), json.dumps(post, ensure_ascii=False), grp)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("locale"); ap.add_argument("--page", required=True)
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    st = json.load(open(os.path.join(STRINGS, f"{a.locale}.json"), encoding="utf-8"))
    key = "zh-TW" if a.locale == "zh-tw" else a.locale
    countries = json.load(open("/tmp/countries_localized.json", encoding="utf-8"))[key]
    groups = json.load(open("/tmp/groups.json", encoding="utf-8"))

    path = os.path.join(ROOT, a.page)
    html = open(path, encoding="utf-8").read()
    if "countryFlagList" in html:
        sys.exit(f"{a.page} already has a country list — refusing to double-inject")

    sections = build_sections(st, countries)
    script = build_script(st, countries, groups)

    # insert the sections immediately before the FAQ section, else before the last </section>
    m = re.search(r'\n<div class="section-divider"></div>\s*\n\s*<!--[^>]*-->\s*\n<section[^>]*id="faq"', html)
    if m:
        html = html[:m.start()] + sections + html[m.start():]
    else:
        m2 = re.search(r'<section[^>]*id="faq"', html)
        if not m2: sys.exit(f"{a.page}: could not find an insertion anchor")
        html = html[:m2.start()] + sections + "\n" + html[m2.start():]

    # script must run after symbol-explorer.js defines ns.isoToFlag
    anchor = '<script src="/footer.js"></script>'
    if anchor not in html: sys.exit(f"{a.page}: no footer.js anchor for the script block")
    html = html.replace(anchor, anchor + script, 1)

    if a.dry_run:
        print(f"[dry-run] {a.page}: would add {len(countries)} countries + {len(groups)} combo sets")
        return
    open(path, "w", encoding="utf-8").write(html)
    print(f"{a.page}: injected {len(countries)} countries + {len(groups)} combo sets")

if __name__ == "__main__":
    main()
