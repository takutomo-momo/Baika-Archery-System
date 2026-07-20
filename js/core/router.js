/**
 * Baika Archery System
 * Project Zero
 * Core Router
 */

const BAS_ROUTES = Object.freeze({
    home: "index.html",
    practice: "input.html",
    analysis: "analysis.html",
    cameraCenter: "camera-center.html"
});

/**
 * 画面名からURLを取得する
 *
 * @param {string} routeName
 * @returns {string|null}
 */
function getRoute(routeName) {
    if (!(routeName in BAS_ROUTES)) {
        console.warn(`[Baika Router] 未登録の画面です: ${routeName}`);
        return null;
    }

    return BAS_ROUTES[routeName];
}

/**
 * 指定した画面へ移動する
 *
 * @param {string} routeName
 */
function navigateTo(routeName) {
    const destination = getRoute(routeName);

    if (!destination) {
        return;
    }

    if (typeof BAS_STATE !== "undefined") {
        BAS_STATE.currentPage = routeName;
    }

    if (
        typeof BAS_CONFIG !== "undefined" &&
        BAS_CONFIG.debug
    ) {
        console.log(
            `[Baika Router] ${routeName} へ移動します: ${destination}`
        );
    }

    window.location.href = destination;
}

/**
 * 現在のHTMLファイル名から画面名を判定する
 *
 * @returns {string}
 */
function detectCurrentRoute() {
    const fileName =
        window.location.pathname.split("/").pop() || "index.html";

    const matchedRoute = Object.entries(BAS_ROUTES).find(
        ([, path]) => path === fileName
    );

    return matchedRoute ? matchedRoute[0] : "home";
}