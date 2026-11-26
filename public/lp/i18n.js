/*
  Shared page translation runtime for the static landing pages (?lang=hi, ta, ml, …):
  /gst-registration, /trademark-registration (+ /apply). Same code as
  /trademark-search/meta/i18n/i18n.js, which keeps its own copy.

  Loaded only for a non-English visit (the bootstrap in the page <head> writes this
  script and <page>/i18n/<lang>.js, which sets window.TM_I18N_DICT). The page script
  then calls TMI18N.apply(document) once, before anything else touches the DOM.
  Elements marked data-noi18n (e.g. the → arrows) are left alone.

  Every run of text + inline tags (b, span, small, br, a, …) is one unit. Its tags
  become numbered placeholders, so
      <b id="tm-count">247</b> brand names checked so far
  is keyed and translated as
      <0>247</0> brand names checked so far
  and rebuilt from clones of the original elements. Ids, classes and links survive
  whatever the translation does, and no translated HTML is ever parsed. A unit
  missing from the dictionary stays in English. scripts/translate-tm-meta.mjs
  (--page gst | tm-reg | tm-apply) uses this same collect() to extract the strings,
  so the two always agree.
*/
(function (root) {
  var INLINE = { A: 1, ABBR: 1, B: 1, BDI: 1, BR: 1, CODE: 1, EM: 1, I: 1, MARK: 1, SMALL: 1, SPAN: 1, STRONG: 1, SUB: 1, SUP: 1, U: 1 };
  var SKIP = { SCRIPT: 1, STYLE: 1, SVG: 1, NOSCRIPT: 1, TEMPLATE: 1, TEXTAREA: 1 };
  var ATTRS = ["placeholder", "aria-label", "alt", "title", "data-ph", "data-ph-s"];
  var LETTER = /[A-Za-z]{2}/;
  var TOKEN = /<(\/?)(\d+)(\/?)>/g;

  function norm(s) { return String(s == null ? "" : s).replace(/\s+/g, " ").trim(); }
  function tag(el) { return String(el.tagName || "").toUpperCase(); }
  function skipped(el) { return SKIP[tag(el)] || (el.hasAttribute && el.hasAttribute("data-noi18n")); }
  function kids(el) { var a = []; for (var c = el.firstChild; c; c = c.nextSibling) a.push(c); return a; }
  // An inline element whose whole subtree is text + inline elements
  function pure(el) {
    if (!INLINE[tag(el)] || skipped(el)) return false;
    for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && !pure(c)) return false;
    return true;
  }
  // Nodes → "text <0>inner</0> <1/>", collecting the elements in placeholder order
  function template(nodes, els) {
    return nodes.map(function (n) {
      if (n.nodeType === 3) return n.nodeValue.replace(/</g, "‹");
      if (n.nodeType !== 1) return "";
      var k = els.length; els.push(n);
      return n.firstChild ? "<" + k + ">" + template(kids(n), els) + "</" + k + ">" : "<" + k + "/>";
    }).join("");
  }

  // Text units: [{ key, nodes, els }] for the body, plus attribute / head units [{ key, el, attr }]
  function collect(doc) {
    var units = [], attrs = [];
    (function walk(el) {
      var run = [];
      function flush() {
        if (!run.length) return;
        var real = run.filter(function (n) { return n.nodeType === 1 || /\S/.test(n.nodeValue); });
        var nodes = run; run = [];
        // A lone wrapper (<a>Services</a>) is unwrapped, so the same words share one key
        if (real.length === 1 && real[0].nodeType === 1) { walk(real[0]); return; }
        if (!LETTER.test(nodes.map(function (n) { return n.textContent; }).join(""))) return;
        var els = [], key = norm(template(nodes, els));
        units.push({ key: key, nodes: nodes, els: els });
      }
      for (var c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) run.push(c);
        else if (c.nodeType === 1) {
          if (skipped(c)) { flush(); continue; }
          if (pure(c)) run.push(c); else { flush(); walk(c); }
        }
      }
      flush();
    })(doc.body);

    var all = doc.querySelectorAll("[" + ATTRS.join("],[") + "]");
    for (var i = 0; i < all.length; i++) {
      if (all[i].closest && all[i].closest("[data-noi18n]")) continue;
      for (var j = 0; j < ATTRS.length; j++) {
        var v = all[i].getAttribute(ATTRS[j]);
        if (v && LETTER.test(v)) attrs.push({ key: norm(v), el: all[i], attr: ATTRS[j] });
      }
    }
    var d = doc.querySelector('meta[name="description"]');
    if (d) attrs.push({ key: norm(d.getAttribute("content")), el: d, attr: "content" });
    if (doc.title) attrs.push({ key: norm(doc.title), el: null, attr: "title" });
    return { units: units, attrs: attrs };
  }

  // Translated template → fragment of text nodes + shallow clones of the original elements
  function build(doc, s, els) {
    var frag = doc.createDocumentFragment(), stack = [frag], last = 0, m;
    function top() { return stack[stack.length - 1]; }
    function text(t) { if (t) top().appendChild(doc.createTextNode(t.replace(/‹/g, "<"))); }
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(s))) {
      text(s.slice(last, m.index)); last = TOKEN.lastIndex;
      if (m[1]) { if (stack.length > 1) stack.pop(); continue; }
      var src = els[+m[2]]; if (!src) continue;
      var el = src.cloneNode(false); top().appendChild(el);
      if (!m[3]) stack.push(el);
    }
    text(s.slice(last));
    return frag;
  }

  function dict() { var d = root.TM_I18N_DICT; return d && d.strings ? d.strings : null; }

  function apply(doc) {
    var h = doc.documentElement, strings = dict();
    if (!strings) { h.lang = "en-IN"; h.removeAttribute("dir"); h.classList.remove("i18n"); return false; }
    // Option labels get translated; the value posted to the server must stay English.
    var opts = doc.querySelectorAll("option:not([value])");
    for (var o = 0; o < opts.length; o++) opts[o].setAttribute("value", opts[o].textContent.trim());

    var c = collect(doc);
    c.units.forEach(function (u) {
      var tr = strings[u.key];
      if (typeof tr !== "string" || !tr) return;
      var first = u.nodes[0], parent = first.parentNode;
      var raw = u.nodes.map(function (n) { return n.textContent; }).join("");
      if (/^\s/.test(raw)) parent.insertBefore(doc.createTextNode(" "), first);
      parent.insertBefore(build(doc, tr, u.els), first);
      if (/\s$/.test(raw)) parent.insertBefore(doc.createTextNode(" "), first);
      u.nodes.forEach(function (n) { parent.removeChild(n); });
    });
    c.attrs.forEach(function (a) {
      var tr = strings[a.key];
      if (typeof tr !== "string" || !tr) return;
      if (a.el) a.el.setAttribute(a.attr, tr); else doc.title = tr;
    });
    return true;
  }

  // JS-built strings: t("Sending your report…"), t("… +91 {m}.", { m: m })
  function t(s, vars) {
    var strings = dict(), k = norm(s), out = strings && typeof strings[k] === "string" && strings[k] ? strings[k] : s;
    if (vars) out = out.replace(/\{(\w+)\}/g, function (m, n) { return n in vars ? vars[n] : m; });
    return out;
  }

  root.TMI18N = { collect: collect, apply: apply, t: t, norm: norm };
  // The dictionary script runs after this one, so read lang lazily
  Object.defineProperty(root.TMI18N, "lang", { get: function () { return (root.TM_I18N_DICT && root.TM_I18N_DICT.lang) || "en"; } });
})(typeof window !== "undefined" ? window : this);
