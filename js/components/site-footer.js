/* Zest Mavericks - <site-footer>
 *
 * The footer lives here and nowhere else. Every page writes one tag:
 *
 *     <site-footer></site-footer>
 *
 * Edit this file and all five pages update. No build step and no fetch:
 * the markup is inlined in the script, so it renders as soon as the
 * deferred script runs, and it works over file:// as well as https://.
 *
 * It renders into the light DOM on purpose, so the rules in css/style.css
 * still apply and nothing has to be duplicated inside a shadow root.
 */

(function () {
    "use strict";

    var EMAIL = "zestmavericks@gmail.com";
    var TWITTER = "https://twitter.com/zestmavericks";

    var LINKS = [
        { href: "index.html", label: "Home" },
        { href: "markpdf.html", label: "MarkPDF" },
        { href: "about.html", label: "About" },
        { href: "contact.html", label: "Contact" },
        { href: "terms.html", label: "Terms and privacy" }
    ];

    var WAVE_PATH =
        "M-160 44c30 0 58-18 88-18s58 18 88 18 58-18 88-18 58 18 88 18v44h-352z";

    function template() {
        var year = new Date().getFullYear();

        var links = LINKS.map(function (link) {
            return '<a href="' + link.href + '">' + link.label + "</a>";
        }).join("");

        var waves = [0.2, 0.5, 0.9]
            .map(function (opacity, index) {
                return (
                    '<use href="#gentle-wave" x="50" y="' +
                    index * 3 +
                    '" fill="#03ffff" fill-opacity="' +
                    opacity +
                    '"></use>'
                );
            })
            .join("");

        return [
            '<div class="social-row">',
            '<a href="' + TWITTER + '" target="_blank" rel="noopener noreferrer">',
            '<img src="assets/Twitter.png" alt="Zest Mavericks on X" width="28" height="28">',
            "</a>",
            '<a href="mailto:' + EMAIL + '">',
            '<img src="assets/email.png" alt="Email Zest Mavericks" width="28" height="28">',
            "</a>",
            "</div>",
            '<nav class="footer-links" aria-label="Footer">' + links + "</nav>",
            '<p class="footer-note">{ } &amp; designed with \u{1F90D} in India</p>',
            '<p class="footer-fine">&copy; ' + year + " Zest Mavericks Pvt. Ltd. All rights reserved.</p>",
            '<svg class="waves" viewBox="0 24 150 28" preserveAspectRatio="none" aria-hidden="true" focusable="false">',
            '<defs><path id="gentle-wave" d="' + WAVE_PATH + '"></path></defs>',
            "<g>" + waves + "</g>",
            "</svg>"
        ].join("");
    }

    if (!("customElements" in window)) return;

    customElements.define(
        "site-footer",
        class extends HTMLElement {
            connectedCallback() {
                if (this.dataset.rendered === "true") return;
                this.dataset.rendered = "true";
                this.classList.add("site-footer");
                this.setAttribute("role", "contentinfo");
                /* Fixed literal with no user input anywhere in it, which is
                   why innerHTML is safe here and keeps this to one file. */
                this.innerHTML = template();
            }
        }
    );
})();
