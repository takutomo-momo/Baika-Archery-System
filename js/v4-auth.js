"use strict";

/**
 * Baika Archery System Ver4
 * オープニング画面・ログイン管理
 */

const V4_AUTH_STORAGE_KEY = "baikaArcheryVer4Login";
const V4_DEFAULT_PASSWORD = "baika";

const V4Auth = {
    members: [],
    memberPasswords: {},
    loggedInMember: "",

    /**
     * ログイン画面の初期化
     */
    async init() {
        this.restoreLogin();

        try {
            await this.loadMemberData();
        } catch (error) {
            console.error("部員データの読み込みに失敗しました:", error);
            this.showMessage(
                "部員データを読み込めませんでした。通信環境を確認してください。",
                "error"
            );
        }

        this.renderMemberDropdown();
        this.bindEvents();
        this.updateScreen();
    },

    /**
     * GASから部員一覧・パスワード情報を取得
     */
    async loadMemberData() {
        if (typeof GAS_API_URL === "undefined" || !GAS_API_URL) {
            throw new Error("GAS_API_URLが設定されていません");
        }

        const response = await fetch(GAS_API_URL, {
            method: "GET",
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(`HTTPエラー: ${response.status}`);
        }

        const data = await response.json();
        const metadata = {};

        if (Array.isArray(data.metadata)) {
            data.metadata.forEach(item => {
                if (!item || !item.key) return;

                metadata[item.key] = this.parseJson(item.json);
            });
        }

        if (
            Array.isArray(metadata.memberMaster) &&
            metadata.memberMaster.length > 0
        ) {
            this.members = metadata.memberMaster;
        } else {
            this.members = ["部員A", "部員B", "部員C"];
        }

        if (
            metadata.memberPasswords &&
            typeof metadata.memberPasswords === "object"
        ) {
            this.memberPasswords = metadata.memberPasswords;
        } else {
            this.memberPasswords = {};
        }
    },

    /**
     * JSON文字列ならオブジェクトへ変換
     */
    parseJson(value) {
        if (typeof value !== "string") {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    },

    /**
     * 部員選択欄を作成
     */
    renderMemberDropdown() {
        const dropdown = document.getElementById("v4LoginMember");

        if (!dropdown) return;

        dropdown.innerHTML = '<option value="">部員を選択してください</option>';

        this.members.forEach(member => {
            const option = document.createElement("option");
            option.value = member;
            option.textContent = member;
            dropdown.appendChild(option);
        });

        if (
            this.loggedInMember &&
            this.members.includes(this.loggedInMember)
        ) {
            dropdown.value = this.loggedInMember;
        }
    },

    /**
     * ボタンや入力欄のイベント設定
     */
    bindEvents() {
        const loginButton = document.getElementById("v4LoginButton");
        const logoutButton = document.getElementById("v4LogoutButton");
        const passwordInput = document.getElementById("v4LoginPassword");

        if (loginButton) {
            loginButton.addEventListener("click", () => {
                this.login();
            });
        }

        if (logoutButton) {
            logoutButton.addEventListener("click", () => {
                this.logout();
            });
        }

        if (passwordInput) {
            passwordInput.addEventListener("keydown", event => {
                if (event.key === "Enter") {
                    event.preventDefault();
                    this.login();
                }
            });
        }
    },

    /**
     * ログイン
     */
    login() {
        const memberDropdown = document.getElementById("v4LoginMember");
        const passwordInput = document.getElementById("v4LoginPassword");

        if (!memberDropdown || !passwordInput) return;

        const member = memberDropdown.value;
        const password = passwordInput.value;

        if (!member) {
            this.showMessage("部員を選択してください。", "error");
            memberDropdown.focus();
            return;
        }

        if (!password) {
            this.showMessage("パスワードを入力してください。", "error");
            passwordInput.focus();
            return;
        }

        const correctPassword =
            this.memberPasswords[member] || V4_DEFAULT_PASSWORD;

        if (password !== correctPassword) {
            this.showMessage("パスワードが違います。", "error");
            passwordInput.value = "";
            passwordInput.focus();
            return;
        }

        this.loggedInMember = member;
        this.saveLogin();

        passwordInput.value = "";

        this.showMessage(`${member}さん、ログインしました。`, "success");
        this.updateScreen();
    },

    /**
     * ログアウト
     */
    logout() {
        this.loggedInMember = "";
        localStorage.removeItem(V4_AUTH_STORAGE_KEY);

        const passwordInput = document.getElementById("v4LoginPassword");

        if (passwordInput) {
            passwordInput.value = "";
        }

        this.showMessage("ログアウトしました。", "success");
        this.updateScreen();
    },

    /**
     * ログイン状態を保存
     */
    saveLogin() {
        const loginData = {
            member: this.loggedInMember,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem(
            V4_AUTH_STORAGE_KEY,
            JSON.stringify(loginData)
        );
    },

    /**
     * 保存されたログイン状態を復元
     */
    restoreLogin() {
        const savedData = localStorage.getItem(V4_AUTH_STORAGE_KEY);

        if (!savedData) return;

        try {
            const loginData = JSON.parse(savedData);

            if (loginData && typeof loginData.member === "string") {
                this.loggedInMember = loginData.member;
            }
        } catch (error) {
            console.warn("ログイン情報を復元できませんでした:", error);
            localStorage.removeItem(V4_AUTH_STORAGE_KEY);
        }
    },

    /**
     * ログイン前・ログイン後の表示切り替え
     */
    updateScreen() {
        const loginPanel = document.getElementById("v4LoginPanel");
        const menuPanel = document.getElementById("v4MenuPanel");
        const memberName = document.getElementById("v4LoggedInMember");

        const isLoggedIn = Boolean(this.loggedInMember);

        if (loginPanel) {
            loginPanel.hidden = isLoggedIn;
        }

        if (menuPanel) {
            menuPanel.hidden = !isLoggedIn;
        }

        if (memberName) {
            memberName.textContent = this.loggedInMember;
        }

        document.body.classList.toggle("v4-is-logged-in", isLoggedIn);
    },

    /**
     * 案内・エラーメッセージ表示
     */
    showMessage(message, type = "") {
        const messageElement = document.getElementById("v4LoginMessage");

        if (!messageElement) return;

        messageElement.textContent = message;
        messageElement.className = "v4-login-message";

        if (type) {
            messageElement.classList.add(`is-${type}`);
        }
    }
};

/**
 * 他のVer4画面からログイン中の部員を取得する関数
 */
function getV4LoggedInMember() {
    const savedData = localStorage.getItem(V4_AUTH_STORAGE_KEY);

    if (!savedData) return "";

    try {
        const loginData = JSON.parse(savedData);
        return loginData.member || "";
    } catch {
        return "";
    }
}

/**
 * 未ログインならオープニング画面へ戻す関数
 */
function requireV4Login() {
    const member = getV4LoggedInMember();

    if (!member) {
        window.location.href = "project-zero-home.html";
        return false;
    }

    return true;
}

document.addEventListener("DOMContentLoaded", () => {
    V4Auth.init();
});