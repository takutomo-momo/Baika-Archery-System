/**
 * Baika Archery System
 * Project Zero
 * Core Application
 */

/**
 * Baika Archery Systemを初期化する
 */
function initializeBaikaApp() {
    const currentRoute =
        typeof detectCurrentRoute === "function"
            ? detectCurrentRoute()
            : "home";

    if (typeof BAS_STATE !== "undefined") {
        BAS_STATE.currentPage = currentRoute;
    }

    if (
        typeof BAS_CONFIG !== "undefined" &&
        BAS_CONFIG.debug
    ) {
        console.group("[Baika Core] アプリケーションを起動しました");
        console.log("アプリ名:", BAS_CONFIG.appName);
        console.log("タイトル:", BAS_CONFIG.appTitle);
        console.log("バージョン:", BAS_CONFIG.version);
        console.log("現在の画面:", currentRoute);
        console.log("状態:", BAS_STATE);
        console.groupEnd();
    }

    document.documentElement.dataset.baikaApp = "ready";

    window.dispatchEvent(
        new CustomEvent("baika:ready", {
            detail: {
                route: currentRoute,
                version:
                    typeof BAS_CONFIG !== "undefined"
                        ? BAS_CONFIG.version
                        : null
            }
        })
    );
}

/**
 * HTMLの読み込み完了後に起動する
 */
if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeBaikaApp,
        { once: true }
    );
} else {
    initializeBaikaApp();
}