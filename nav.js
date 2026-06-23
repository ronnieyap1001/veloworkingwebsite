/* ============================================================================
   Velo Working — shared site navigation (single source of truth).

   Every page loads this script and contains a single placeholder:
       <div id="velo-nav"></div>
   This file replaces that placeholder with the full navigation bar, so the
   menu is defined in ONE place. Change a label or link here and it updates on
   the home page, Fabrication, AI quote, Field notes (blog) and Assessment all
   at once — the pages can no longer drift out of sync.

   Links are root-relative (e.g. "/fabrication.html") so the same markup works
   from every folder depth (/, /blog/, /assessment/) on www.veloworking.com.
   ============================================================================ */
(function () {
  "use strict";

  // Is the visitor on the home page? If so, use in-page anchors for the
  // sections that live on the home page so clicks scroll instead of reloading.
  var path = location.pathname.replace(/\/index\.html$/, "/");
  var isHome = path === "/" || path === "";

  var systemHref = isHome ? "#build" : "/index.html#build";
  var aboutHref  = isHome ? "#about" : "/index.html#about";

  // The Field notes (blog) dropdown entries — edit this list to change the menu.
  var notes = [
    ["/blog/three-categories-of-business-software.html", "Three categories of business software", "Cloud ERP · Low-Code · No-Code"],
    ["/blog/workflow-vs-erp-positioning.html",          "Workflow vs ERP positioning",            "Platform strategy"],
    ["/blog/operational-tasks-first-principles.html",   "Operational tasks at first principles",  "Value × Effort"],
    ["/blog/positioning-of-jodoo.html",                 "Positioning of Jodoo",                   "Org-chart test"],
    ["/blog/THE%20SME%20DIGITAL%20PARADOX.html",        "The SME Digital Paradox",                "Diary · slide deck"]
  ];

  var notesMarkup = notes.map(function (n) {
    return '<li><a href="' + n[0] + '">' + n[1] + '<small>' + n[2] + '</small></a></li>';
  }).join("");

  var html =
    '<header class="vnav" id="veloNav">' +
      '<div class="vnav__in">' +
        '<a href="/index.html" class="vnav__logo" aria-label="Velo Working — home">' +
          '<img src="/asset/velo-logo.svg" alt="Velo Working">' +
        '</a>' +
        '<nav class="vnav__links" id="veloNavLinks" aria-label="Primary">' +
          '<a href="' + systemHref + '" data-match="#build">System</a>' +
          '<a href="' + aboutHref + '" data-match="#about">About</a>' +
          '<a href="/fabrication.html" data-match="/fabrication.html">Fabrication</a>' +
          '<span class="vnav__drop" data-drop>' +
            '<a href="/blog/index.html" data-match="/blog/" aria-haspopup="true" aria-expanded="false">Field notes</a>' +
            '<ul class="vnav__menu">' +
              notesMarkup +
              '<li><a href="/blog/index.html" class="vnav__menu-all">All field notes</a></li>' +
            '</ul>' +
          '</span>' +
          '<a href="/assessment/assessment.html" data-match="/assessment/" target="_blank" rel="noopener">Assessment</a>' +
          '<a href="/ai-quote.html" class="vnav__cta" data-match="/ai-quote.html">Get quote</a>' +
        '</nav>' +
        '<button class="vnav__toggle" id="veloNavToggle" aria-label="Menu" aria-expanded="false">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 8h16"/><path d="M4 16h16"/></svg>' +
        '</button>' +
      '</div>' +
    '</header>';

  function mount() {
    var placeholder = document.getElementById("velo-nav");
    if (!placeholder) return;

    var tmp = document.createElement("div");
    tmp.innerHTML = html;
    var nav = tmp.firstChild;
    placeholder.replaceWith(nav);

    // Highlight the link for the current page.
    var here = location.pathname;
    nav.querySelectorAll(".vnav__links a[data-match]").forEach(function (a) {
      var m = a.getAttribute("data-match");
      if (m && m.charAt(0) !== "#" && here.indexOf(m) !== -1) {
        a.classList.add("is-current");
        a.setAttribute("aria-current", "page");
      }
    });

    // Mobile hamburger.
    var toggle = nav.querySelector("#veloNavToggle");
    if (toggle) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    // Dropdown: tap to open on mobile, hover (CSS) on desktop.
    var drop = nav.querySelector("[data-drop]");
    var dropTrigger = drop ? drop.querySelector("a") : null;
    if (drop && dropTrigger) {
      dropTrigger.addEventListener("click", function (e) {
        if (window.matchMedia("(max-width: 980px)").matches) {
          e.preventDefault();
          var open = drop.classList.toggle("is-open");
          dropTrigger.setAttribute("aria-expanded", open ? "true" : "false");
        }
      });
    }

    // Close the mobile menu after following any non-dropdown link.
    nav.querySelectorAll(".vnav__links a").forEach(function (l) {
      if (l === dropTrigger) return;
      l.addEventListener("click", function () {
        nav.classList.remove("is-open");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
