/**
 * Baika Archery System
 * Project Zero
 * Home Page
 */

(function () {
    "use strict";

    const HOME_CARDS = [
        {
            icon: "📝",
            title: "練習入力",
            description: "得点や着弾位置を記録します。",
            body:
                "的タップ、キーパッド、写真を使った入力へ進みます。",
            status: {
                label: "利用可能",
                type: "ready"
            },
            interactive: true,
            actions: [
                {
                    label: "練習入力を開く",
                     href: "practice.html",
                    className: "bas-button--primary"
                }
            ]
        },
        {
            icon: "📷",
            title: "撮影専用モード",
            description: "練習中の的写真を素早く撮影します。",
            body:
                "距離を選択し、撮影ガイドに合わせて写真を保存します。",
            status: {
                label: "開発中",
                type: "development"
            },
            interactive: true,
            actions: [
                {
                    label: "撮影画面を開く",
                    href: "camera-center.html",
                    className: "bas-button--secondary"
                }
            ]
        },
        {
            icon: "📊",
            title: "分析",
            description: "練習記録やグルーピングを振り返ります。",
            body:
                "得点推移、着弾傾向、将来のAIフォーム分析をまとめます。",
            status: {
                label: "開発中",
                type: "development"
            },
            interactive: true,
            actions: [
                {
                    label: "分析画面を開く",
                    href: "analysis.html",
                    className: "bas-button--outline"
                }
            ]
        },
        {
            icon: "🏆",
            title: "大会記録",
            description: "大会結果とラウンド記録を管理します。",
            body:
                "大会別の得点、順位、振り返りを保存できるようにします。",
            status: {
                label: "準備中",
                type: "planned"
            },
            interactive: true
        },
        {
            icon: "⚙️",
            title: "設定",
            description: "部員情報やシステム設定を管理します。",
            body:
                "ログイン、パスワード、表示設定などを扱う予定です。",
            status: {
                label: "準備中",
                type: "planned"
            },
            interactive: true
        }
    ];

    function renderHomeCards() {
        if (
            !window.BAS_CARD ||
            typeof window.BAS_CARD.renderAll !== "function"
        ) {
            console.error(
                "[Baika Home] Cardコンポーネントを読み込めません。"
            );

            return;
        }

        window.BAS_CARD.renderAll({
            targetId: "homeFeatureCards",
            cards: HOME_CARDS
        });
    }

    function getCurrentUserName() {
    if (
        typeof BAS_STATE === "undefined" ||
        !BAS_STATE.currentUser
    ) {
        return "ゲストユーザー";
    }

    const currentUser = BAS_STATE.currentUser;

    if (
        typeof currentUser.name === "string" &&
        currentUser.name.trim() !== ""
    ) {
        return currentUser.name.trim() + " さん";
    }

    return "ゲストユーザー";
}

function renderCurrentUser() {
    const userNameElement =
        document.getElementById("homeUserName");

    if (!userNameElement) {
        console.warn(
            "[Baika Home] 利用者名の表示場所がありません。"
        );

        return;
    }

    userNameElement.textContent =
        getCurrentUserName();
}

    function formatPracticeDate(dateValue) {
        if (
            typeof dateValue !== "string" ||
            dateValue.trim() === ""
        ) {
            return "記録なし";
        }

        const date =
            new Date(dateValue + "T00:00:00");

        if (Number.isNaN(date.getTime())) {
            return dateValue;
        }

        return new Intl.DateTimeFormat("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric"
        }).format(date);
    }

    function setTextContent(id, value) {
        const element =
            document.getElementById(id);

        if (!element) {
            console.warn(
                `[Baika Home] 表示場所がありません: ${id}`
            );

            return;
        }

        element.textContent = value;
    }

    function renderLastPractice() {
        const lastPractice =
            typeof BAS_STATE !== "undefined"
                ? BAS_STATE.lastPractice
                : null;

        if (!lastPractice) {
            setTextContent(
                "homeLastPracticeDate",
                "記録なし"
            );

            setTextContent(
                "homeLastPracticeDistance",
                "-"
            );

            setTextContent(
                "homeLastPracticeScore",
                "-"
            );

            setTextContent(
                "homeLastPracticeAverage",
                "-"
            );

            setTextContent(
                "homeLastPracticeArrowCount",
                "-"
            );

            setTextContent(
                "homeLastMemo",
                "前回の練習メモはありません。"
            );

            return;
        }

        const totalScore =
            Number(lastPractice.totalScore);

        const averageScore =
            Number(lastPractice.averageScore);

        const arrowCount =
            Number(lastPractice.arrowCount);

        setTextContent(
            "homeLastPracticeDate",
            formatPracticeDate(lastPractice.date)
        );

        setTextContent(
            "homeLastPracticeDistance",
            lastPractice.distance || "-"
        );

        setTextContent(
            "homeLastPracticeScore",
            Number.isFinite(totalScore)
                ? String(totalScore)
                : "-"
        );

        setTextContent(
            "homeLastPracticeAverage",
            Number.isFinite(averageScore)
                ? averageScore.toFixed(2)
                : "-"
        );

        setTextContent(
            "homeLastPracticeArrowCount",
            Number.isFinite(arrowCount)
                ? String(arrowCount)
                : "-"
        );

        setTextContent(
            "homeLastMemo",
            typeof lastPractice.memo === "string" &&
            lastPractice.memo.trim() !== ""
                ? lastPractice.memo.trim()
                : "前回の練習メモはありません。"
        );
    }

        function createAiCoachAdvice(lastPractice) {
        if (!lastPractice) {
            return {
                heading: "前回の練習記録がありません",
                message:
                    "練習記録を保存すると、次回の練習に向けたアドバイスを表示します。",
                sources: [],
                confidence: 0
            };
        }

        const totalScore =
            Number(lastPractice.totalScore);

        const averageScore =
            Number(lastPractice.averageScore);

        const arrowCount =
            Number(lastPractice.arrowCount);

        const memo =
            typeof lastPractice.memo === "string"
                ? lastPractice.memo.trim()
                : "";

        let heading =
            "前回の練習を振り返りましょう";

        let message =
            "前回の記録を確認し、同じ動作を安定して繰り返すことを意識しましょう。";

        let confidence = 55;

        if (
            Number.isFinite(averageScore) &&
            averageScore >= 9
        ) {
            heading =
                "高い得点水準を維持できています";

            message =
                "前回は平均9点以上を記録しています。大きくフォームを変えず、同じセットアップとリリースを再現することを意識しましょう。";

            confidence = 85;
        } else if (
            Number.isFinite(averageScore) &&
            averageScore >= 8
        ) {
            heading =
                "安定した射を増やしましょう";

            message =
                "前回は良い射が積み重なっています。得点を追い過ぎず、肩の位置とリリースまでの流れを一定にすることが次の安定につながります。";

            confidence = 75;
        } else if (
            Number.isFinite(averageScore) &&
            averageScore > 0
        ) {
            heading =
                "フォームの再現性を優先しましょう";

            message =
                "前回は得点のばらつきがあった可能性があります。まずは狙い続けることより、セットアップからリリースまでを同じリズムで行うことを優先しましょう。";

            confidence = 65;
        }

        if (memo.includes("クリッカー")) {
            message +=
                " メモにクリッカーへの意識が記録されています。音に反応して離すのではなく、伸び合いの結果としてクリッカーが落ちる流れを確認しましょう。";

            confidence =
                Math.min(95, confidence + 5);
        }

        if (
            memo.includes("肩") ||
            memo.includes("グルーピング")
        ) {
            message +=
                " 肩の位置を意識したことでグルーピングが改善しているため、今日も同じ感覚を再現することが重点課題です。";

            confidence =
                Math.min(95, confidence + 5);
        }

        const sources = [];

        if (
            Number.isFinite(totalScore) &&
            totalScore > 0
        ) {
            sources.push(
                `前回の総得点：${totalScore}点`
            );
        }

        if (
            Number.isFinite(averageScore) &&
            averageScore > 0
        ) {
            sources.push(
                `前回の平均：${averageScore.toFixed(2)}点`
            );
        }

        if (
            Number.isFinite(arrowCount) &&
            arrowCount > 0
        ) {
            sources.push(
                `前回の射数：${arrowCount}射`
            );
        }

        if (memo !== "") {
            sources.push(
                "前回の練習メモ"
            );
        }

        return {
            heading: heading,
            message: message,
            sources: sources,
            confidence: confidence
        };
    }

    function renderAiCoach() {
        if (
            !window.BAS_AI_COACH ||
            typeof window.BAS_AI_COACH.render !== "function"
        ) {
            console.error(
                "[Baika Home] AIコーチコンポーネントを読み込めません。"
            );

            return;
        }

        const lastPractice =
            typeof BAS_STATE !== "undefined"
                ? BAS_STATE.lastPractice
                : null;

        const advice =
            createAiCoachAdvice(lastPractice);

        window.BAS_AI_COACH.render({
            targetId: "home-ai-coach",
            title: "AIコーチ",
            heading: advice.heading,
            message: advice.message,
            status: "試作版",
            sources: advice.sources,
            confidence: advice.confidence
        });
    }

       function initializeHome() {
        renderCurrentUser();
        renderLastPractice();
        renderHomeCards();
        renderAiCoach();

        console.log(
            "[Baika Home] ホーム画面を初期化しました。"
        );
    }

    window.BAS_HOME = {
        initialize: initializeHome
    };
})();