"use strict";

/**
 * Baika Archery System Ver4
 * 各画面共通のログインセッション管理
 */

(function () {
    const STORAGE_KEY = "baikaArcheryVer4Login";

    function readLoginData() {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return null;
        }

        try {
            const loginData = JSON.parse(savedData);

            if (
                !loginData ||
                typeof loginData.member !== "string" ||
                !loginData.member.trim()
            ) {
                localStorage.removeItem(STORAGE_KEY);
                return null;
            }

            return loginData;
        } catch (error) {
            console.warn("ログイン情報を読み込めませんでした:", error);
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }
    }

    function getLoggedInMember() {
        const loginData = readLoginData();
        return loginData ? loginData.member : "";
    }

    function requireLogin() {
        const member = getLoggedInMember();

        if (member) {
            return true;
        }

        window.location.replace("project-zero-home.html");
        return false;
    }

    window.V4Session = {
        getLoggedInMember,
        requireLogin
    };

    requireLogin();
})();