/* Zest Mavericks - <app-screenshot>
 *
 * One app screenshot, framed the same way everywhere:
 *
 *     <app-screenshot name="markpdf/scan" alt="..."
 *                     width="900" height="1848"></app-screenshot>
 *
 * name picks the image set tools/optimize_images.sh builds in assets/shots/:
 * <name>-600 and <name>-900, each as AVIF and WebP. The browser takes AVIF
 * where it can and the width that suits the screen: 600 on 2x displays, 900
 * on 3x phones, since .shot is never shown wider than 300px.
 *
 * width and height are the 900w file's pixel size. They only set the aspect
 * ratio, so the space is reserved before the lazy image arrives and nothing
 * below it jumps.
 *
 * Screenshots are phone mockups on a transparent background, and get a
 * shadow that follows the phone's outline. Add the card attribute for opaque
 * artwork (the launch poster), which gets rounded corners and a box shadow.
 *
 * The element and its <picture> are display: contents (css/style.css), so
 * the image sits in the layout exactly where the tag is.
 *
 * Load it in <head> WITHOUT defer, after site-header.js. Deferred, the
 * images appear only after parsing and the text beside them jumps down.
 */

(function () {
    "use strict";

    var FOLDER = "/assets/shots/";
    var WIDTHS = [600, 900];
    var SIZES = "300px"; /* .shot is width: min(100%, 300px) */

    function srcset(base, format) {
        return WIDTHS.map(function (w) {
            return base + "-" + w + "." + format + " " + w + "w";
        }).join(", ");
    }

    if (!("customElements" in window)) return;

    customElements.define(
        "app-screenshot",
        class extends HTMLElement {
            connectedCallback() {
                if (this.dataset.rendered === "true") return;
                this.dataset.rendered = "true";

                /* createElement rather than innerHTML: name and alt come from
                   the page, so they are set as properties, never parsed. */
                var base = FOLDER + (this.getAttribute("name") || "");

                /* Order matters: the img goes inside the picture, and gets
                   loading="lazy", before any URL is set. Otherwise the
                   browser may start fetching the WebP fallback straight away
                   and then fetch the AVIF as well. */
                var picture = document.createElement("picture");
                var avif = document.createElement("source");
                avif.type = "image/avif";
                avif.sizes = SIZES;
                avif.srcset = srcset(base, "avif");
                picture.appendChild(avif);

                var img = document.createElement("img");
                img.className = this.hasAttribute("card") ? "shot shot--card" : "shot";
                img.alt = this.getAttribute("alt") || "";
                if (this.hasAttribute("width")) img.width = Number(this.getAttribute("width"));
                if (this.hasAttribute("height")) img.height = Number(this.getAttribute("height"));
                img.loading = "lazy";
                img.decoding = "async";
                picture.appendChild(img);

                img.sizes = SIZES;
                img.srcset = srcset(base, "webp");
                img.src = base + "-" + WIDTHS[WIDTHS.length - 1] + ".webp";
                this.appendChild(picture);
            }
        }
    );
})();
