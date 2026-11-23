/* Shared runtime for Bizpole static landing pages (public/<slug>/index.html).
 * Loaded with `defer`, so it never blocks first paint. Responsibilities:
 *  1. Ad attribution: keep utm_* / fbclid / gclid for the session and forward them
 *     (plus plan, cta and the chosen state) on every [data-apply] link.
 *  2. Live pricing: prices are baked into the HTML (instant paint + SEO). After load,
 *     ONE cached request to /landing-prices refreshes them from the price master and
 *     powers the state picker — no layout shift, nothing waits on the network.
 *  3. Swipe carousels ([data-carousel] + [data-dots-for]) and the sticky mobile bar.
 *
 * Page markup contract
 *   <body data-lp-services="83,57,74">                 service IDs used on the page
 *   [data-lp-min="83"]                                  → "₹10,000" (lowest state total)
 *   [data-lp-plan="83,57"] .lp-amt / .lp-for            → plan total for chosen state
 *   <select data-lp-state>                              → state picker (options auto-filled)
 *   [data-lp-breakdown="83"]                            → <tbody> filled with the fee split
 */
(function () {
  "use strict";
  var KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"];
  var fmt = function (n) { return "₹" + Math.round(n).toLocaleString("en-IN"); };
  var store = function (k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } };
  var keep = function (k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

  // ---------- API base: VITE_API_BASE_URL from .env only (no hardcoded host) ----------
  var host = location.hostname;
  var ENV_API = "__VITE_API_BASE_URL__"; // replaced by vite with VITE_API_BASE_URL
  var API = /^https?:\/\//.test(ENV_API) ? ENV_API : "";
  if (!API) console.error("VITE_API_BASE_URL is not set in .env — API calls from this page will fail");
  window.LP_API = API;

  // ---------- 1. Attribution ----------
  var qs = new URLSearchParams(location.search), attr = {};
  try { attr = JSON.parse(store("lp_attr") || "{}"); } catch (e) {}
  KEYS.forEach(function (k) { if (qs.get(k)) attr[k] = qs.get(k); });
  if (!attr.landing) attr.landing = location.href;
  if (!attr.referrer && document.referrer && document.referrer.indexOf(location.host) < 0) attr.referrer = document.referrer;
  store("lp_attr", JSON.stringify(attr));

  var chosenState = keep("lp_state") || "";
  function decorateApplyLinks() {
    document.querySelectorAll("a[data-apply]").forEach(function (a) {
      var base = a.getAttribute("data-href") || a.getAttribute("href");
      a.setAttribute("data-href", base);
      var u = new URL(base, location.origin);
      KEYS.forEach(function (k) { if (attr[k] && !u.searchParams.has(k)) u.searchParams.set(k, attr[k]); });
      var cta = a.getAttribute("data-cta"); if (cta) u.searchParams.set("cta", cta);
      if (chosenState) u.searchParams.set("state", chosenState);
      a.setAttribute("href", u.pathname + u.search);
    });
  }
  decorateApplyLinks();

  // ---------- 2. Live pricing ----------
  var ids = (document.body.getAttribute("data-lp-services") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
  var data = null;

  function totalFor(idList, state) {
    var sum = 0;
    for (var i = 0; i < idList.length; i++) {
      var svc = data.services[idList[i]];
      var row = svc && svc.states[state];
      if (!row) return null; // a service not priced in this state → plan unavailable there
      sum += row.total;
    }
    return sum;
  }
  function minFor(idList) {
    var best = null;
    Object.keys(data.states).forEach(function (st) { var t = totalFor(idList, st); if (t !== null && (best === null || t < best)) best = t; });
    return best;
  }

  function render() {
    if (!data) return;
    document.querySelectorAll("[data-lp-min]").forEach(function (el) {
      var m = minFor(el.getAttribute("data-lp-min").split(","));
      if (m !== null) el.textContent = fmt(m);
    });
    document.querySelectorAll("[data-lp-plan]").forEach(function (card) {
      var list = card.getAttribute("data-lp-plan").split(",");
      var amt = card.querySelector(".lp-amt"), forEl = card.querySelector(".lp-for"), btn = card.querySelector("a[data-apply]");
      var t = chosenState ? totalFor(list, chosenState) : minFor(list);
      if (amt) amt.textContent = t === null ? "On request" : fmt(t);
      if (forEl) forEl.textContent = chosenState ? (t === null ? "Not offered online in " + chosenState : "all-inclusive in " + chosenState) : "all-inclusive, starting price";
      if (btn) btn.classList.toggle("is-muted", t === null);
    });
    document.querySelectorAll("[data-lp-breakdown]").forEach(function (tb) {
      var svc = data.services[tb.getAttribute("data-lp-breakdown")];
      var wrap = tb.closest("[data-lp-breakdown-wrap]");
      var row = svc && chosenState && svc.states[chosenState];
      if (!row) { if (wrap) wrap.hidden = true; return; }
      var lines = [["Professional fee", row.professional], ["DSC & other charges", row.vendor], ["GST (18%)", row.gst], ["Government fee & stamp duty", row.government]]
        .filter(function (l) { return l[1] > 0; });
      lines.push(["Total for " + chosenState, row.total, "lp-total"]);
      tb.textContent = "";
      lines.forEach(function (l) {
        var tr = document.createElement("tr"), th = document.createElement("th"), td = document.createElement("td");
        th.scope = "row"; th.textContent = l[0]; td.textContent = fmt(l[1]);
        if (l[2]) tr.className = l[2];
        tr.appendChild(th); tr.appendChild(td); tb.appendChild(tr);
      });
      if (wrap) wrap.hidden = false;
    });
  }

  function fillStates() {
    if (chosenState && !data.states[chosenState]) chosenState = "";
    var names = Object.keys(data.states).sort();
    document.querySelectorAll("select[data-lp-state]").forEach(function (sel) {
      sel.textContent = "";
      sel.appendChild(new Option("Select your state", ""));
      names.forEach(function (n) { sel.appendChild(new Option(n, n, false, n === chosenState)); });
      sel.disabled = false;
      sel.addEventListener("change", function () {
        chosenState = sel.value; keep("lp_state", chosenState);
        document.querySelectorAll("select[data-lp-state]").forEach(function (o) { if (o !== sel) o.value = chosenState; });
        render(); decorateApplyLinks();
      });
    });
  }

  function load() {
    if (!ids.length) return;
    var cacheKey = "lp_prices_" + ids.join("_");
    try {
      var c = JSON.parse(store(cacheKey) || "null");
      if (c && Date.now() - c.at < 10 * 60 * 1000) return ready(c.body);
    } catch (e) {}
    fetch(API + "/landing-prices?services=" + ids.join(","), { credentials: "omit" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (body) {
        if (!body || !body.success) return unavailable(); // keep the baked-in prices
        store(cacheKey, JSON.stringify({ at: Date.now(), body: body }));
        ready(body);
      })
      .catch(unavailable);
  }
  // Offline / API down: the baked-in starting prices stay; hide the picker that can't work.
  function unavailable() {
    document.querySelectorAll(".price-pick").forEach(function (el) { el.hidden = true; });
  }
  function ready(body) {
    data = body; data.states = {};
    Object.keys(body.services || {}).forEach(function (id) {
      Object.keys(body.services[id].states).forEach(function (st) { data.states[st] = 1; });
    });
    if (!Object.keys(data.states).length) return unavailable();
    fillStates(); render();
  }
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); };
  if (document.readyState === "complete") idle(load); else window.addEventListener("load", function () { idle(load); });

  // ---------- 3a. Swipe carousels ----------
  function initCarousel(track) {
    if (track._ready) return; track._ready = true;
    var dotsBox = document.querySelector('[data-dots-for="' + track.id + '"]');
    var cards = Array.prototype.slice.call(track.children);
    if (!dotsBox || track.scrollWidth <= track.clientWidth + 4) return;
    var center = function (c) { return c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2; };
    var dots = cards.map(function (card, i) {
      var b = document.createElement("button"), h = card.querySelector("h3, cite");
      b.type = "button"; b.setAttribute("aria-label", "Show " + (h ? h.textContent : "item " + (i + 1)));
      b.addEventListener("click", function () { track.scrollTo({ left: center(card), behavior: "smooth" }); });
      dotsBox.appendChild(b); return b;
    });
    var mark = function () {
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bestD = Infinity;
      cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bestD) { bestD = d; best = i; } });
      dots.forEach(function (d, i) { d.setAttribute("aria-current", i === best ? "true" : "false"); });
    };
    var start = track.getAttribute("data-start") && track.querySelector(track.getAttribute("data-start"));
    if (start) track.scrollLeft = center(start);
    var raf; track.addEventListener("scroll", function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(mark); }, { passive: true });
    mark();
  }
  var tracks = document.querySelectorAll("[data-carousel]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { initCarousel(e.target); io.unobserve(e.target); } });
    }, { rootMargin: "300px 0px" });
    tracks.forEach(function (t) { io.observe(t); });
  } else { tracks.forEach(initCarousel); }

  // ---------- 3b. Sticky bar: hidden while the hero CTA is on screen ----------
  var bar = document.getElementById("mbar"), heroCta = document.querySelector(".hero-cta");
  if (bar && heroCta && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { bar.classList.toggle("off", es[0].isIntersecting); }).observe(heroCta);
  }

  var yr = document.getElementById("yr"); if (yr) yr.textContent = new Date().getFullYear();
})();
