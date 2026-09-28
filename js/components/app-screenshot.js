/* Zest Mavericks - <app-screenshot>
 *
 * One app screenshot, framed the same way everywhere:
 *
 *     <app-screenshot src="/assets/Scan-Screen.png" alt="..."
 *                     width="1419" height="2796"></app-screenshot>
 *
 * width and height are the image's real pixel size (sips -g pixelWidth -g
 * pixelHeight file.png). They only set the aspect ratio, so the space is
 * reserved before the lazy image arrives and nothing below it jumps.
 *
 * Screenshots are phone mockups on a transparent background, and get a
 * shadow that follows the phone's outline. Add the card attribute for opaque
 * artwork (the launch poster), which gets rounded corners and a box shadow.
 *
 * Renders a lazy-loaded <img class="shot">. It's the one place to change how
 * every screenshot is delivered, e.g. switching to <picture> with AVIF and
 * WebP sources, without touching the pages.
 *
 * The element itself is display: contents (css/style.css), so the image
 * sits in the layout exactly where the tag is.
 *
 * Load it in <head> WITHOUT defer, after site-header.js. Deferred, the
 * images appear only after parsing and the text beside them jumps down.
 */

(function () {
    "use strict";

    if (!("customElements" in window)) return;

    customElements.define(
        "app-screenshot",
        class extends HTMLElement {
            connectedCallback() {
                if (this.dataset.rendered === "true") return;
                this.dataset.rendered = "true";

                /* createElement rather than innerHTML: src and alt come from
                   the page, so they are set as properties, never parsed. */
                var img = document.createElement("img");
                img.className = this.hasAttribute("card") ? "shot shot--card" : "shot";
                img.src = this.getAttribute("src") || "";
                img.alt = this.getAttribute("alt") || "";
                if (this.hasAttribute("width")) img.width = Number(this.getAttribute("width"));
                if (this.hasAttribute("height")) img.height = Number(this.getAttribute("height"));
                img.loading = "lazy";
                img.decoding = "async";
                this.appendChild(img);
            }
        }
    );
})();
