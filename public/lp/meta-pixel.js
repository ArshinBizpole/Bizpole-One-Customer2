/*
  Meta (Facebook/Instagram) Pixel for the trademark pages — retargeting audiences
  and ad conversion tracking.

  Loaded by the static landing pages (/trademark-search/meta, /trademark-registration(+/meta, /apply),
  /trademark-classes, /gst-registration(+/meta, /apply), /company-registration(+/meta),
  /private-limited-company-registration(+/apply)) with a <script> tag, and by the React pages
  /trademark-search and /contact through src/utils/metaPixel.js — so there is
  one copy of the pixel code. Never on /trademark-report (its URL holds an access token).

  - Pixel ID: VITE_META_PIXEL_ID in the env. Vite replaces the token below at
    build time (and in dev), like VITE_API_BASE_URL. Not set → no pixel at all.
  - Fires only on the live site (bizpole.io / www.bizpole.io). To try it on
    testcust / localhost, open the page with ?pixel_test=1 (kept for the tab) and
    watch Meta Pixel Helper or Events Manager › Test events.
  - Sends PageView on load. Pages send their own events by pushing to a queue
    that works before this file has loaded:
        (window.bpPixelQ = window.bpPixelQ || []).push([event, params, eventId]);
    Meta's standard event names (ViewContent, Search, Lead, …) go as standard
    events, anything else as a custom event. eventId lets a later server-side
    Conversions API send of the same event be de-duplicated.
*/
(function (w, d) {
  if (w.bpPixelReady) return;
  w.bpPixelReady = true;

  var ID = "__VITE_META_PIXEL_ID__";
  var STD = { AddPaymentInfo: 1, AddToCart: 1, AddToWishlist: 1, CompleteRegistration: 1, Contact: 1, CustomizeProduct: 1,
    Donate: 1, FindLocation: 1, InitiateCheckout: 1, Lead: 1, PageView: 1, Purchase: 1, Schedule: 1, Search: 1,
    StartTrial: 1, SubmitApplication: 1, Subscribe: 1, ViewContent: 1 };

  var on = /^\d{6,20}$/.test(ID);
  if (on && !/^(www\.)?bizpole\.io$/.test(location.hostname)) {
    var test = false;
    try {
      if (/[?&]pixel_test=1(&|$)/.test(location.search)) sessionStorage.setItem("pixel_test", "1");
      test = sessionStorage.getItem("pixel_test") === "1";
    } catch (e) {}
    on = test;
  }

  var q = (w.bpPixelQ = w.bpPixelQ || []);
  if (!on) { q.length = 0; q.push = function () { return 0; }; return; }

  /* Meta Pixel base code */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(w,d,"script","https://connect.facebook.net/en_US/fbevents.js");
  // Only the events we send ourselves, from the trademark pages: no automatic PageView on
  // in-app route changes (pushState) and no automatic button-click / page-metadata events —
  // otherwise, once loaded, the pixel would report every later React route with its full
  // URL (dashboard, links that carry access tokens) to Meta.
  w.fbq.disablePushState = true;
  w.fbq("set", "autoConfig", false, ID);
  w.fbq("init", ID);
  w.fbq("track", "PageView");

  function send(a) {
    if (!a || !a[0]) return;
    var params = a[1] || {}, clean = {};
    for (var k in params) if (params[k] !== undefined && params[k] !== null && params[k] !== "") clean[k] = params[k];
    if (a[2]) w.fbq(STD[a[0]] ? "track" : "trackCustom", a[0], clean, { eventID: String(a[2]) });
    else w.fbq(STD[a[0]] ? "track" : "trackCustom", a[0], clean);
  }
  while (q.length) send(q.shift());
  q.push = function (a) { send(a); return 0; }; // later events go straight out
})(window, document);
