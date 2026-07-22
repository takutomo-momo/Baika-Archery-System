/**
 * Baika Archery System
 * Project Zero
 * AI Coach Component
 */

(function () {
    "use strict";

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function normalizeSources(sources) {
        if (!Array.isArray(sources)) {
            return [];
        }

        return sources
            .filter(function (source) {
                return (
                    typeof source === "string" &&
                    source.trim() !== ""
                );
            })
            .map(function (source) {
                return source.trim();
            });
    }

    function createSourceList(sources) {
        const normalizedSources =
            normalizeSources(sources);

        if (normalizedSources.length === 0) {
            return `
                <p class="bas-ai-coach__empty">
                    分析の根拠はまだありません。
                </p>
            `;
        }

        const sourceItems =
            normalizedSources
                .map(function (source) {
                    return `
                        <li class="bas-ai-coach__source-item">
                            <span
                                class="bas-ai-coach__source-icon"
                                aria-hidden="true"
                            >
                                ✓
                            </span>

                            <span>
                                ${escapeHtml(source)}
                            </span>
                        </li>
                    `;
                })
                .join("");

        return `
            <ul class="bas-ai-coach__source-list">
                ${sourceItems}
            </ul>
        `;
    }

    function createConfidence(confidence) {
        const numericConfidence =
            Number(confidence);

        if (
            !Number.isFinite(numericConfidence) ||
            numericConfidence < 0
        ) {
            return "";
        }

        const safeConfidence =
            Math.min(100, Math.round(numericConfidence));

        return `
            <div class="bas-ai-coach__confidence">
                <div class="bas-ai-coach__confidence-header">
                    <span>信頼度</span>

                    <strong>
                        ${safeConfidence}%
                    </strong>
                </div>

                <div
                    class="bas-ai-coach__confidence-track"
                    role="progressbar"
                    aria-label="AIアドバイスの信頼度"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    aria-valuenow="${safeConfidence}"
                >
                    <span
                        class="bas-ai-coach__confidence-bar"
                        style="width: ${safeConfidence}%"
                    ></span>
                </div>
            </div>
        `;
    }

    function createAction(action) {
        if (
            !action ||
            typeof action.label !== "string" ||
            action.label.trim() === ""
        ) {
            return "";
        }

        const label =
            escapeHtml(action.label.trim());

        const href =
            typeof action.href === "string" &&
            action.href.trim() !== ""
                ? escapeHtml(action.href.trim())
                : "#";

        return `
            <div class="bas-ai-coach__actions">
                <a
                    class="bas-button bas-button--outline"
                    href="${href}"
                >
                    ${label}
                </a>
            </div>
        `;
    }

    function createCoachMarkup(options) {
        const settings = options || {};

        const title =
            typeof settings.title === "string" &&
            settings.title.trim() !== ""
                ? settings.title.trim()
                : "AIコーチ";

        const heading =
            typeof settings.heading === "string" &&
            settings.heading.trim() !== ""
                ? settings.heading.trim()
                : "今日のアドバイス";

        const message =
            typeof settings.message === "string" &&
            settings.message.trim() !== ""
                ? settings.message.trim()
                : "前回の練習結果をもとに、次回の重点課題を提案します。";

        const status =
            typeof settings.status === "string" &&
            settings.status.trim() !== ""
                ? settings.status.trim()
                : "準備中";

        return `
            <section class="bas-ai-coach">
                <header class="bas-ai-coach__header">
                    <div class="bas-ai-coach__identity">
                        <span
                            class="bas-ai-coach__icon"
                            aria-hidden="true"
                        >
                            🤖
                        </span>

                        <div>
                            <p class="bas-ai-coach__eyebrow">
                                Baika AI
                            </p>

                            <h2 class="bas-ai-coach__title">
                                ${escapeHtml(title)}
                            </h2>
                        </div>
                    </div>

                    <span class="bas-ai-coach__status">
                        ${escapeHtml(status)}
                    </span>
                </header>

                <div class="bas-ai-coach__body">
                    <div class="bas-ai-coach__advice">
                        <p class="bas-ai-coach__label">
                            ${escapeHtml(heading)}
                        </p>

                        <p class="bas-ai-coach__message">
                            ${escapeHtml(message)}
                        </p>
                    </div>

                    <div class="bas-ai-coach__evidence">
                        <p class="bas-ai-coach__label">
                            アドバイスの根拠
                        </p>

                        ${createSourceList(settings.sources)}
                    </div>

                    ${createConfidence(settings.confidence)}

                    ${createAction(settings.action)}
                </div>
            </section>
        `;
    }

    function render(options) {
        const settings = options || {};
        const targetId = settings.targetId;

        if (
            typeof targetId !== "string" ||
            targetId.trim() === ""
        ) {
            console.error(
                "[Baika AI Coach] targetIdが指定されていません。"
            );

            return false;
        }

        const target =
            document.getElementById(targetId);

        if (!target) {
            console.error(
                "[Baika AI Coach] 表示先が見つかりません:",
                targetId
            );

            return false;
        }

        target.innerHTML =
            createCoachMarkup(settings);

        return true;
    }

    window.BAS_AI_COACH = {
        render: render
    };
})();