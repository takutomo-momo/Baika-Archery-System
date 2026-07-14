"use strict";

(function () {
    const className = "v4-is-landscape-layout";

    function updateLayout() {
        const viewport = window.visualViewport;
        const width = viewport ? viewport.width : window.innerWidth;
        const height = viewport ? viewport.height : window.innerHeight;

        document.documentElement.classList.toggle(
            className,
            width > height && width >= 568
        );
    }

    document.addEventListener("DOMContentLoaded", updateLayout);
    window.addEventListener("resize", updateLayout);
    window.addEventListener("orientationchange", function () {
        window.setTimeout(updateLayout, 250);
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", updateLayout);
    }
})();
