/**
 * Baika Archery System
 * Project Zero
 * Page Header Component
 */

(function () {
    "use strict";

    function createPageHeader(options) {
        const settings = options || {};

        const header = document.createElement("header");
        header.className = "bas-page-header";

        if (settings.eyebrow) {
            const eyebrow = document.createElement("p");

            eyebrow.className = "bas-page-header__eyebrow";
            eyebrow.textContent = settings.eyebrow;

            header.append(eyebrow);
        }

        const title = document.createElement("h1");

        title.className = "bas-page-header__title";
        title.textContent =
            settings.title || "Baika Archery System";

        header.append(title);

        if (settings.description) {
            const description = document.createElement("p");

            description.className =
                "bas-page-header__description";

            description.textContent = settings.description;

            header.append(description);
        }

        return header;
    }

    function renderPageHeader(options) {
        const settings = options || {};
        const targetId =
            settings.targetId || "page-header";
        const target =
            document.getElementById(targetId);

        if (!target) {
            console.warn(
                "[Baika Page Header] 表示先が見つかりません:",
                targetId
            );

            return;
        }

        target.replaceChildren(
            createPageHeader(settings)
        );
    }

    window.BAS_PAGE_HEADER = {
        render: renderPageHeader
    };
})();