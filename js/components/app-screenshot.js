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
 * Renders a lazy-loaded <img class="shot">. It's the one place to change how
 * every screenshot is delivered, e.g. switching to <picture> with AVIF and
 * WebP sources, without touching the pages.
 *
 * The element itself is display: contents (css/style.css), so the image
 * sits in the layout exactly where the tag is.
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
                img.className = "shot";
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
