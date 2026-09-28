/* Zest Mavericks - <site-pricing>
 *
 * The plans section on each product page. A page writes:
 *
 *     <site-pricing id="pricing" data-product="topdrawer"></site-pricing>
 *
 * Every product's plans, prices and fine print live in PRODUCTS below, so a
 * price change is one edit here. The grid picks its column count from the
 * number of plans (see .pricing-grid in css/style.css), so adding or
 * removing a plan needs no CSS change.
 *
 * Keep id="pricing" on the tag in the page, not in here: links such as
 * href="#pricing" then have a target before this script has run.
 */

(function () {
    "use strict";

    var PRODUCTS = {
        markpdf: {
            eyebrow: "Subscriptions",
            title: "MarkPDF PRO",
            lede: "There's room to reset how we look at documents. This is our attempt at it.",
            plans: [
                {
                    name: "Weekly",
                    price: "$5.99",
                    per: "week",
                    note: "Billed weekly",
                    features: ["Every Pro feature", "Good for a one off job", "No free trial on this plan"]
                },
                {
                    name: "Monthly",
                    price: "$9.99",
                    per: "month",
                    note: "7 day free trial",
                    badge: "Best value",
                    features: ["Every Pro feature", "AI summaries and web page to PDF", "Priority support"]
                }
            ],
            fineprint:
                "Prices shown in US dollars. Your local price and billing period appear in the App " +
                "before you confirm. Subscriptions renew automatically until cancelled in your Apple " +
                "Account settings.",
            appStore: {
                href: "https://apps.apple.com/in/app/id6737065841",
                alt: "Download MarkPDF on the App Store"
            },
            links: [{ href: "/markpdf/terms/", label: "Terms and privacy" }]
        },

        topdrawer: {
            eyebrow: "Ultra",
            title: "Free to use. Ultra when you outgrow it.",
            lede: "The free drawer holds 30 items, and every feature above works in it. Ultra removes the limit.",
            plans: [
                {
                    name: "Monthly",
                    price: "$4.99",
                    per: "month",
                    note: "Billed monthly",
                    features: ["Unlimited items", "Everything in the free drawer", "Cancel any time"]
                },
                {
                    name: "Yearly",
                    price: "$24.99",
                    per: "year",
                    note: "Works out around $2.08 a month",
                    badge: "Best value",
                    features: ["Unlimited items", "Everything in the free drawer", "Cancel any time"]
                },
                {
                    name: "Lifetime",
                    price: "$59.99",
                    per: "once",
                    note: "One payment, no renewal",
                    features: ["Unlimited items, for good", "Not a subscription", "Yours on every device you sign in on"]
                }
            ],
            fineprint:
                "Prices shown in US dollars. Your local price and billing period appear in the App " +
                "before you confirm. Subscriptions renew automatically until cancelled in your Apple " +
                "Account settings. Lifetime is a one off purchase and does not renew.",
            appStore: null, // TODO: { href, alt } once the App Store listing is live
            links: [
                { href: "/topdrawer/terms/", label: "Terms of Use" },
                { href: "/topdrawer/privacy/", label: "Privacy Policy" }
            ]
        }
    };

    /* Everything below is escaped on the way into innerHTML, so copy edits
       with an ampersand or a quote in them can't break the markup. */
    function esc(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function plan(p) {
        return [
            '<div class="plan' + (p.badge ? " plan--featured" : "") + '">',
            p.badge ? '<p class="plan__badge">' + esc(p.badge) + "</p>" : "",
            '<p class="plan__name">' + esc(p.name) + "</p>",
            '<p class="plan__price">' + esc(p.price) + "<span>/" + esc(p.per) + "</span></p>",
            '<p class="plan__note">' + esc(p.note) + "</p>",
            '<ul class="feature-list">',
            p.features.map(function (f) { return "<li>" + esc(f) + "</li>"; }).join(""),
            "</ul>",
            "</div>"
        ].join("");
    }

    function actions(product) {
        var badge = product.appStore
            ? '<a class="badge-link" href="' + esc(product.appStore.href) +
              '" target="_blank" rel="noopener noreferrer">' +
              '<img src="/assets/AppStore-Badge.png" alt="' + esc(product.appStore.alt) + '" loading="lazy"></a>'
            : "";

        var links = product.links.map(function (link) {
            return '<a class="btn btn--ghost" href="' + esc(link.href) + '">' + esc(link.label) + "</a>";
        }).join("");

        return '<div class="center"><div class="btn-row">' + badge + links + "</div></div>";
    }

    function template(product) {
        return [
            '<section class="section bg-zest">',
            '<div class="container">',
            '<div class="center">',
            '<p class="eyebrow">' + esc(product.eyebrow) + "</p>",
            "<h2>" + esc(product.title) + "</h2>",
            '<p class="lede">' + esc(product.lede) + "</p>",
            "</div>",
            '<div class="pricing-grid">' + product.plans.map(plan).join("") + "</div>",
            '<p class="lede center plan-fineprint">' + esc(product.fineprint) + "</p>",
            actions(product),
            "</div>",
            "</section>"
        ].join("");
    }

    if (!("customElements" in window)) return;

    customElements.define(
        "site-pricing",
        class extends HTMLElement {
            connectedCallback() {
                if (this.dataset.rendered === "true") return;
                var key = this.dataset.product;
                if (!Object.prototype.hasOwnProperty.call(PRODUCTS, key)) return;
                this.dataset.rendered = "true";
                this.innerHTML = template(PRODUCTS[key]);
            }
        }
    );
})();
