/**
 * Baika Archery System
 * Project Zero
 * Card Component
 */

(function () {
    "use strict";

    function createAction(action) {
        if (!action || !action.label) {
            return null;
        }

        const element = action.href
            ? document.createElement("a")
            : document.createElement("button");

        element.className =
            "bas-button " +
            (action.className || "bas-button--primary");

        element.textContent = action.label;

        if (action.href) {
            element.href = action.href;
        } else {
            element.type = "button";
        }

        if (
            typeof action.onClick === "function" &&
            !action.href
        ) {
            element.addEventListener(
                "click",
                action.onClick
            );
        }

        return element;
    }

    function createCard(options) {
        const settings = options || {};

        const article = document.createElement("article");

        article.className = "bas-card";

        if (settings.interactive) {
            article.classList.add(
                "bas-card--interactive"
            );
        }

        if (settings.id) {
            article.id = settings.id;
        }

        if (
            settings.title ||
            settings.description
        ) {
            const header = document.createElement("div");

            header.className = "bas-card__header";

            const headingGroup =
                document.createElement("div");

            if (settings.title) {
                const title = document.createElement(
                    settings.headingLevel || "h2"
                );

                title.className = "bas-card__title";
                title.textContent = settings.title;

                headingGroup.append(title);
            }

            if (settings.description) {
                const description =
                    document.createElement("p");

                description.className =
                    "bas-card__description";

                description.textContent =
                    settings.description;

                headingGroup.append(description);
            }

            header.append(headingGroup);
            article.append(header);
        }

        if (settings.body) {
            const body = document.createElement("div");

            body.className = "bas-card__body";

            if (settings.body instanceof Node) {
                body.append(settings.body);
            } else {
                const paragraph =
                    document.createElement("p");

                paragraph.textContent =
                    String(settings.body);

                body.append(paragraph);
            }

            article.append(body);
        }

        if (
            Array.isArray(settings.actions) &&
            settings.actions.length > 0
        ) {
            const footer =
                document.createElement("footer");

            footer.className = "bas-card__footer";

            settings.actions.forEach(function (action) {
                const actionElement =
                    createAction(action);

                if (actionElement) {
                    footer.append(actionElement);
                }
            });

            article.append(footer);
        }

        return article;
    }

    function renderCard(options) {
        const settings = options || {};
        const targetId =
            settings.targetId || "card-container";

        const target =
            document.getElementById(targetId);

        if (!target) {
            console.warn(
                "[Baika Card] 表示先が見つかりません:",
                targetId
            );

            return;
        }

        target.append(createCard(settings));
    }

    function renderCards(options) {
        const settings = options || {};
        const targetId =
            settings.targetId || "card-container";

        const target =
            document.getElementById(targetId);

        if (!target) {
            console.warn(
                "[Baika Card] 表示先が見つかりません:",
                targetId
            );

            return;
        }

        const cards = Array.isArray(settings.cards)
            ? settings.cards
            : [];

        const fragment =
            document.createDocumentFragment();

        cards.forEach(function (cardSettings) {
            fragment.append(
                createCard(cardSettings)
            );
        });

        target.replaceChildren(fragment);
    }

    window.BAS_CARD = {
        create: createCard,
        render: renderCard,
        renderAll: renderCards
    };
})();