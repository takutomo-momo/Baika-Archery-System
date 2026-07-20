/**
 * Baika Archery System
 * Project Zero
 * Header Component
 */

(function () {
    "use strict";

    const HEADER_ITEMS = [
        {
            route: "home",
            label: "ホーム",
            icon: "🏠",
            href: "index.html"
        },
        {
            route: "practice",
            label: "練習入力",
            icon: "📝",
            href: "input.html"
        },
        {
            route: "analysis",
            label: "分析",
            icon: "📊",
            href: "analysis.html"
        },
        {
            route: "cameraCenter",
            label: "撮影",
            icon: "📷",
            href: "camera-center.html"
        }
    ];

    function createNavigationLink(item, currentRoute) {
        const link = document.createElement("a");

        link.className = "bas-header__nav-link";
        link.href = item.href;

        if (item.route === currentRoute) {
            link.setAttribute("aria-current", "page");
        }

        const icon = document.createElement("span");

        icon.className = "bas-header__nav-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = item.icon;

        const label = document.createElement("span");

        label.textContent = item.label;

        link.append(icon, label);

        return link;
    }

    function createHeader(currentRoute) {
        const header = document.createElement("header");

        header.className = "bas-header";

        const inner = document.createElement("div");

        inner.className = "bas-header__inner";

        const brand = document.createElement("a");

        brand.className = "bas-header__brand";
        brand.href = "index.html";

        const mark = document.createElement("span");

        mark.className = "bas-header__mark";
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = "🏹";

        const brandText = document.createElement("span");

        brandText.className = "bas-header__brand-text";

        const title = document.createElement("span");

        title.className = "bas-header__title";
        title.textContent = "Baika Archery System";

        const subtitle = document.createElement("span");

        subtitle.className = "bas-header__subtitle";
        subtitle.textContent =
            "梅花女子大学アーチェリー部 練習支援システム";

        brandText.append(title, subtitle);
        brand.append(mark, brandText);

        const navigation = document.createElement("nav");

        navigation.className = "bas-header__nav";
        navigation.setAttribute("aria-label", "主要メニュー");

        HEADER_ITEMS.forEach(function (item) {
            navigation.append(
                createNavigationLink(item, currentRoute)
            );
        });

        inner.append(brand, navigation);
        header.append(inner);

        return header;
    }

    function renderHeader(options) {
        const settings = options || {};
        const targetId = settings.targetId || "app-header";
        const target = document.getElementById(targetId);

        if (!target) {
            console.warn(
                "[Baika Header] ヘッダー表示先が見つかりません:",
                targetId
            );

            return;
        }

        const currentRoute =
            settings.currentRoute ||
            (
                window.BAS_ROUTER &&
                typeof window.BAS_ROUTER.detectCurrentRoute ===
                    "function"
                    ? window.BAS_ROUTER.detectCurrentRoute()
                    : "home"
            );

        target.replaceChildren(createHeader(currentRoute));
    }

    window.BAS_HEADER = {
        render: renderHeader
    };
})();