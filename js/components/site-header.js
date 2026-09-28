/* Zest Mavericks - <site-header>
 *
 * The floating nav pill and the theme toggle. Every page writes:
 *
 *     <site-header></site-header>
 *
 * Loaded in <head> WITHOUT defer, straight after theme.js. That way the
 * element is already defined when the parser reaches the tag, so it renders
 * in the same pass as the rest of the page and the nav never pops in late.
 * theme.js wires up #themeToggle on DOMContentLoaded, by which point the
 * button below exists.
 *
 * The current page is worked out from the URL, so nothing needs to be set
 * per page. Legal pages (/markpdf/terms/ and so on) highlight nothing, the
 * same as before.
 */

(function () {
    "use strict";

    var LINKS = [
        { href: "/", label: "Home" },
        { href: "/markpdf/", label: "MarkPDF" },
        { href: "/topdrawer/", label: "TopDrawer" },
        { href: "/about/", label: "About" },
        { href: "/contact/", label: "Contact" }
    ];

    var SUN =
        '<svg class="icon icon--sun" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<circle cx="12" cy="12" r="4"></circle>' +
        '<path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>' +
        "</svg>";

    var MOON =
        '<svg class="icon icon--moon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="M20 14.6A8.5 8.5 0 1 1 9.4 4a6.8 6.8 0 0 0 10.6 10.6z"></path>' +
        "</svg>";

    /* "/about/index.html" and "/about/" are the same page */
    function currentPath() {
        return window.location.pathname.replace(/index\.html$/, "");
    }

    function template() {
        var here = currentPath();

        var links = LINKS.map(function (link) {
            var current = link.href === here ? ' aria-current="page"' : "";
            return '<a href="' + link.href + '"' + current + ">" + link.label + "</a>";
        }).join("");

        return [
            '<nav class="site-nav" aria-label="Primary">' + links + "</nav>",
            /* Ships hidden: theme.js reveals it, so it never sits there dead
               when JavaScript is off. */
            '<button class="theme-toggle" id="themeToggle" type="button" aria-pressed="false"',
            ' aria-label="Switch to dark mode" title="Switch to dark mode" hidden>',
            SUN + MOON,
            "</button>"
        ].join("");
    }

    if (!("customElements" in window)) return;

    customElements.define(
        "site-header",
        class extends HTMLElement {
            connectedCallback() {
                if (this.dataset.rendered === "true") return;
                this.dataset.rendered = "true";
                this.classList.add("site-header");
                /* Fixed literals only; the path is compared, never written. */
                this.innerHTML = template();
            }
        }
    );
})();
