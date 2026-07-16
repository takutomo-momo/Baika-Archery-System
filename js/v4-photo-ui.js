"use strict";

/*
 * Baika Archery System Ver4
 * Photo UI Adapter
 * Step18: 複数ピン描画用レイヤー
 */

(function () {
    let photoEngine = null;
    let currentPhotoUrl = "";

    const pins = [];
    let pinLayer = null;
    let scorePanel = null;
    let scoreEditingPin = null;
    let scoreSummary = null;
    let scoreList = null;
    let applyToEndButton = null;

    let calibrationMode = null;
    let calibrationPoints = {
        center: null,
        left: null,
        right: null,
        top: null,
        bottom: null
    };
    let calibrationButton = null;
    let calibrationStatus = null;

    let arrowCandidateLayer = null;
    let arrowCandidates = [];
    let arrowDetectButton = null;
    let arrowDetectStatus = null;

    document.addEventListener(
        "DOMContentLoaded",
        initializePhotoUI
    );

    function initializePhotoUI() {
        const elements = getPhotoElements();

        if (!elements.viewer || !elements.preview) {
            console.warn(
                "Photo UI: 写真ビューアーが見つかりません。"
            );
            return;
        }

        if (typeof window.BaikaPhotoEngine !== "function") {
            console.error(
                "Photo UI: v4-photo-engine.jsを先に読み込んでください。"
            );
            return;
        }

        photoEngine = new window.BaikaPhotoEngine(
            elements.viewer,
            elements.preview,
            {
                minScale: 1,
                maxScale: 6,
                zoomStep: 0.2
            }
        );

        createPinLayer(elements);
        createArrowCandidateLayer(elements);
        createScorePanel(elements);
        createScoreSummary(elements);
        createScoreList(elements);
        createCalibrationControls(elements);
        createArrowDetectionControls(elements);
        createApplyToEndButton(elements);
        createUndoButton(elements);
        bindUIEvents(elements);
        updatePhotoUI(elements, false);

        window.baikaPhotoEngine = photoEngine;
        window.baikaPhotoPins = pins;
        window.clearBaikaPhotoPins = function () {
            clearPins();
            closeScorePanel();
            updateUndoButton(elements);
            updateApplyToEndButton();
        };
    }

    function createPinLayer(elements) {
        pinLayer = document.createElement("div");

        pinLayer.style.position = "absolute";
        pinLayer.style.inset = "0";
        pinLayer.style.overflow = "hidden";
        pinLayer.style.pointerEvents = "none";
        pinLayer.style.zIndex = "5";

        elements.viewer.appendChild(pinLayer);
    }

    function createArrowCandidateLayer(elements) {
        arrowCandidateLayer =
            document.createElement("div");

        arrowCandidateLayer.style.position =
            "absolute";
        arrowCandidateLayer.style.inset = "0";
        arrowCandidateLayer.style.overflow =
            "hidden";
        arrowCandidateLayer.style.pointerEvents =
            "none";
        arrowCandidateLayer.style.zIndex = "4";

        elements.viewer.appendChild(
            arrowCandidateLayer
        );
    }

    function createArrowDetectionControls(elements) {
        const wrapper =
            document.createElement("div");

        wrapper.style.display = "grid";
        wrapper.style.gap = "6px";
        wrapper.style.width = "100%";
        wrapper.style.marginTop = "8px";

        arrowDetectButton =
            document.createElement("button");

        arrowDetectButton.type = "button";
        arrowDetectButton.textContent =
            "✨ 矢候補を自動検出";
        arrowDetectButton.className =
            elements.clearButton
                ? elements.clearButton.className
                : "";
        arrowDetectButton.disabled = true;

        arrowDetectStatus =
            document.createElement("div");

        arrowDetectStatus.style.padding = "8px";
        arrowDetectStatus.style.borderRadius =
            "10px";
        arrowDetectStatus.style.background =
            "rgba(6, 182, 212, 0.08)";
        arrowDetectStatus.style.color = "#155e75";
        arrowDetectStatus.style.fontSize = "12px";
        arrowDetectStatus.style.fontWeight = "700";
        arrowDetectStatus.style.textAlign = "center";
        arrowDetectStatus.textContent =
            "写真を選択すると検出できます。";

        arrowDetectButton.addEventListener(
            "click",
            function () {
                detectArrowCandidates(elements);
            }
        );

        wrapper.appendChild(arrowDetectButton);
        wrapper.appendChild(arrowDetectStatus);

        if (elements.clearButton) {
            elements.clearButton.insertAdjacentElement(
                "beforebegin",
                wrapper
            );
        }
    }

    function detectArrowCandidates(elements) {
        if (
            !elements.preview ||
            elements.preview.hidden ||
            !elements.preview.complete ||
            !elements.preview.naturalWidth
        ) {
            window.alert(
                "写真の読み込み完了後に実行してください。"
            );
            return;
        }

        if (
            !window.BaikaArrowCandidateDetector ||
            typeof window
                .BaikaArrowCandidateDetector
                .detect !== "function"
        ) {
            window.alert(
                "v4-arrow-detector.jsが読み込まれていません。"
            );
            return;
        }

        arrowDetectButton.disabled = true;
        arrowDetectButton.textContent =
            "解析中…";
        arrowDetectStatus.textContent =
            "緑色候補とシャフト方向を解析しています。";

        window.setTimeout(
            function () {
                try {
                    arrowCandidates =
                        window
                            .BaikaArrowCandidateDetector
                            .detect(
                                elements.preview,
                                {
                                    maxSide: 900,
                                    maxCandidates: 12
                                }
                            );

                    renderArrowCandidates(elements);

                    arrowDetectStatus.textContent =
                        arrowCandidates.length > 0
                            ? (
                                `${arrowCandidates.length}個の`
                                + "矢候補を検出しました。"
                            )
                            : (
                                "候補を検出できませんでした。"
                            );
                } catch (error) {
                    console.error(
                        "Arrow candidate detection error:",
                        error
                    );

                    arrowCandidates = [];
                    renderArrowCandidates(elements);
                    arrowDetectStatus.textContent =
                        "検出中にエラーが発生しました。";
                } finally {
                    arrowDetectButton.disabled = false;
                    arrowDetectButton.textContent =
                        "✨ 矢候補を再検出";
                }
            },
            30
        );
    }

    function renderArrowCandidates(elements) {
        if (
            !arrowCandidateLayer ||
            !photoEngine
        ) {
            return;
        }

        arrowCandidateLayer.replaceChildren();

        if (arrowCandidates.length === 0) {
            return;
        }

        const viewerRect =
            elements.viewer.getBoundingClientRect();

        arrowCandidates.forEach(
            function (candidate, index) {
                const startPoint =
                    photoEngine.imageToScreenPoint(
                        candidate.x,
                        candidate.y
                    );

                const impactPoint =
                    photoEngine.imageToScreenPoint(
                        candidate.impactX,
                        candidate.impactY
                    );

                const startX =
                    startPoint.x - viewerRect.left;
                const startY =
                    startPoint.y - viewerRect.top;
                const endX =
                    impactPoint.x - viewerRect.left;
                const endY =
                    impactPoint.y - viewerRect.top;

                const lineLength =
                    Math.hypot(
                        endX - startX,
                        endY - startY
                    );

                const lineAngle =
                    Math.atan2(
                        endY - startY,
                        endX - startX
                    ) *
                    180 /
                    Math.PI;

                const line =
                    document.createElement("div");

                line.style.position = "absolute";
                line.style.left = startX + "px";
                line.style.top = startY + "px";
                line.style.width = lineLength + "px";
                line.style.height = "3px";
                line.style.transformOrigin = "0 50%";
                line.style.transform =
                    `rotate(${lineAngle}deg)`;
                line.style.background =
                    candidate.shaftConfidence >= 0.22
                        ? "rgba(249, 115, 22, 0.9)"
                        : "rgba(148, 163, 184, 0.8)";
                line.style.borderRadius = "999px";
                line.style.boxShadow =
                    "0 0 0 1px rgba(255,255,255,0.8)";

                const candidateMarker =
                    document.createElement("div");

                candidateMarker.textContent =
                    `候補${index + 1}`;

                candidateMarker.style.position =
                    "absolute";
                candidateMarker.style.left =
                    startX + "px";
                candidateMarker.style.top =
                    startY + "px";
                candidateMarker.style.transform =
                    "translate(-50%, -50%)";
                candidateMarker.style.display = "grid";
                candidateMarker.style.placeItems =
                    "center";
                candidateMarker.style.minWidth = "46px";
                candidateMarker.style.height = "24px";
                candidateMarker.style.padding = "0 6px";
                candidateMarker.style.borderRadius =
                    "999px";
                candidateMarker.style.background =
                    "rgba(6, 182, 212, 0.9)";
                candidateMarker.style.border =
                    "2px solid #ffffff";
                candidateMarker.style.color = "#ffffff";
                candidateMarker.style.fontSize = "10px";
                candidateMarker.style.fontWeight = "900";
                candidateMarker.style.boxShadow =
                    "0 2px 8px rgba(0,0,0,0.3)";

                const impactMarker =
                    document.createElement("div");

                impactMarker.textContent =
                    `着弾${index + 1}`;

                impactMarker.style.position =
                    "absolute";
                impactMarker.style.left = endX + "px";
                impactMarker.style.top = endY + "px";
                impactMarker.style.transform =
                    "translate(-50%, -50%)";
                impactMarker.style.display = "grid";
                impactMarker.style.placeItems = "center";
                impactMarker.style.minWidth = "46px";
                impactMarker.style.height = "24px";
                impactMarker.style.padding = "0 6px";
                impactMarker.style.borderRadius =
                    "999px";
                impactMarker.style.background =
                    "rgba(249, 115, 22, 0.92)";
                impactMarker.style.border =
                    "2px solid #ffffff";
                impactMarker.style.color = "#ffffff";
                impactMarker.style.fontSize = "10px";
                impactMarker.style.fontWeight = "900";
                impactMarker.style.boxShadow =
                    "0 2px 8px rgba(0,0,0,0.3)";

                arrowCandidateLayer.appendChild(line);
                arrowCandidateLayer.appendChild(
                    candidateMarker
                );
                arrowCandidateLayer.appendChild(
                    impactMarker
                );
            }
        );
    }

    function clearArrowCandidates() {
        arrowCandidates = [];

        if (arrowCandidateLayer) {
            arrowCandidateLayer.replaceChildren();
        }

        if (arrowDetectStatus) {
            arrowDetectStatus.textContent =
                "写真を選択すると検出できます。";
        }
    }

    function createCalibrationControls(elements) {
        const wrapper =
            document.createElement("div");

        wrapper.style.display = "grid";
        wrapper.style.gap = "6px";
        wrapper.style.width = "100%";
        wrapper.style.marginTop = "8px";

        calibrationButton =
            document.createElement("button");

        calibrationButton.type = "button";
        calibrationButton.textContent =
            "🎯 写真の的を4点校正";
        calibrationButton.className =
            elements.clearButton
                ? elements.clearButton.className
                : "";

        calibrationStatus =
            document.createElement("div");

        calibrationStatus.style.padding = "8px";
        calibrationStatus.style.borderRadius = "10px";
        calibrationStatus.style.background =
            "rgba(109, 40, 217, 0.08)";
        calibrationStatus.style.color = "#38275c";
        calibrationStatus.style.fontSize = "12px";
        calibrationStatus.style.fontWeight = "700";
        calibrationStatus.style.textAlign = "center";
        calibrationStatus.textContent =
            "未校正：写真全体を基準に表示";

        calibrationButton.addEventListener(
            "click",
            function () {
                calibrationMode = "center";
                calibrationPoints = {
                    center: null,
                    left: null,
                    right: null,
                    top: null,
                    bottom: null
                };

                calibrationButton.textContent =
                    "① 的中心をタップ";
                calibrationStatus.textContent =
                    "写真上の的中心をタップしてください。";
            }
        );

        wrapper.appendChild(calibrationButton);
        wrapper.appendChild(calibrationStatus);

        if (elements.clearButton) {
            elements.clearButton.insertAdjacentElement(
                "beforebegin",
                wrapper
            );
        }
    }

    function updateCalibrationPrompt() {
        const prompts = {
            left: [
                "② 左端をタップ",
                "的紙の左端をタップしてください。"
            ],
            right: [
                "③ 右端をタップ",
                "的紙の右端をタップしてください。"
            ],
            top: [
                "④ 上端をタップ",
                "的紙の上端をタップしてください。"
            ],
            bottom: [
                "⑤ 下端をタップ",
                "的紙の下端をタップしてください。"
            ]
        };

        const prompt = prompts[calibrationMode];

        if (!prompt) {
            return;
        }

        calibrationButton.textContent = prompt[0];
        calibrationStatus.textContent = prompt[1];
    }

    function handleCalibrationPoint(
        imageX,
        imageY
    ) {
        if (!calibrationMode) {
            return false;
        }

        const point = {
            x: Number(imageX),
            y: Number(imageY)
        };

        if (
            !Number.isFinite(point.x) ||
            !Number.isFinite(point.y)
        ) {
            return true;
        }

        if (calibrationMode === "center") {
            calibrationPoints.center = point;
            calibrationMode = "left";
            updateCalibrationPrompt();
            return true;
        }

        calibrationPoints[calibrationMode] = point;

        const order = [
            "left",
            "right",
            "top",
            "bottom"
        ];

        const currentIndex =
            order.indexOf(calibrationMode);

        if (currentIndex < order.length - 1) {
            calibrationMode =
                order[currentIndex + 1];
            updateCalibrationPrompt();
            return true;
        }

        const calibration =
            getCalibration();

        if (!calibration.ready) {
            window.alert(
                "校正点が近すぎます。もう一度設定してください。"
            );
            resetCalibration();
            return true;
        }

        calibrationMode = null;
        calibrationButton.textContent =
            "🎯 写真の的を再校正";
        calibrationStatus.textContent =
            "4点校正済み：横・縦方向を個別補正";

        syncGroupingFromPhoto();

        return true;
    }

    function getCalibration() {
        const center = calibrationPoints.center;
        const left = calibrationPoints.left;
        const right = calibrationPoints.right;
        const top = calibrationPoints.top;
        const bottom = calibrationPoints.bottom;

        if (
            !center ||
            !left ||
            !right ||
            !top ||
            !bottom
        ) {
            return {
                ready: false,
                centerX: 0,
                centerY: 0,
                radiusX: 0,
                radiusY: 0
            };
        }

        const radiusX =
            (
                Math.abs(center.x - left.x) +
                Math.abs(right.x - center.x)
            ) / 2;

        const radiusY =
            (
                Math.abs(center.y - top.y) +
                Math.abs(bottom.y - center.y)
            ) / 2;

        return {
            ready:
                Number.isFinite(radiusX) &&
                Number.isFinite(radiusY) &&
                radiusX >= 10 &&
                radiusY >= 10,
            centerX: center.x,
            centerY: center.y,
            radiusX: radiusX,
            radiusY: radiusY
        };
    }

    function resetCalibration() {
        calibrationMode = null;
        calibrationPoints = {
            center: null,
            left: null,
            right: null,
            top: null,
            bottom: null
        };

        if (calibrationButton) {
            calibrationButton.textContent =
                "🎯 写真の的を4点校正";
        }

        if (calibrationStatus) {
            calibrationStatus.textContent =
                "未校正：写真全体を基準に表示";
        }
    }

    function createApplyToEndButton(elements) {
        applyToEndButton =
            document.createElement("button");

        applyToEndButton.type = "button";
        applyToEndButton.id =
            "v4PhotoApplyToCurrentEnd";

        applyToEndButton.className =
            elements.clearButton
                ? elements.clearButton.className
                : "";

        applyToEndButton.textContent =
            "💾 写真を登録";

        applyToEndButton.disabled = true;

        if (elements.clearButton) {
            elements.clearButton.insertAdjacentElement(
                "beforebegin",
                applyToEndButton
            );
        }

        applyToEndButton.addEventListener(
            "click",
            async function () {
                await registerPhotoPins();
            }
        );

        updateApplyToEndButton();
    }

    async function registerPhotoPins() {
        const readyPins =
            pins.filter(function (pin) {
                return pin.score !== null;
            });

        if (
            pins.length !== 6 ||
            readyPins.length !== 6
        ) {
            return;
        }

        if (
            typeof window.registerPhotoPracticeEnd
            !== "function"
        ) {
            window.alert(
                "写真記録の登録機能を確認できません。"
            );
            return;
        }

        applyToEndButton.disabled = true;
        applyToEndButton.textContent = "保存中…";

        try {
            const saved =
                await window.registerPhotoPracticeEnd(
                    pins
                );

            if (!saved) {
                return;
            }

            clearPins();
            closeScorePanel();

            const elements =
                getPhotoElements();

            updateUndoButton(elements);
            updateScoreList(elements);
            updateApplyToEndButton();

            window.alert(
                "写真の6本を登録しました。"
            );
        } finally {
            applyToEndButton.textContent =
                "💾 写真を登録";

            updateApplyToEndButton();
        }
    }

    function updateApplyToEndButton() {
        if (!applyToEndButton) {
            return;
        }

        const readyPins =
            pins.filter(function (pin) {
                return pin.score !== null;
            });

        applyToEndButton.disabled =
            !(
                pins.length === 6 &&
                readyPins.length === 6
            );
    }

    function createUndoButton(elements) {
        const undoButton =
            document.createElement("button");

        undoButton.type = "button";
        undoButton.id = "v4PhotoUndoLastPin";
        undoButton.className =
            elements.clearButton
                ? elements.clearButton.className
                : "";

        undoButton.textContent = "↩ 最後のピンを戻す";
        undoButton.disabled = true;

        if (elements.clearButton) {
            elements.clearButton.insertAdjacentElement(
                "beforebegin",
                undoButton
            );
        }

        elements.undoButton = undoButton;
    }

    function bindUIEvents(elements) {
        if (elements.input) {
            elements.input.addEventListener(
                "change",
                handlePhotoSelection
            );
        }

        if (elements.clearButton) {
            elements.clearButton.addEventListener(
                "click",
                clearPhoto
            );
        }

        if (elements.undoButton) {
            elements.undoButton.addEventListener(
                "click",
                function () {
                    if (pins.length === 0) {
                        return;
                    }

                    pins.pop();
                    closeScorePanel();
                    renderPins(elements);
                    updateUndoButton(elements);
                    updateScoreSummary();
                    updateScoreList(elements);
                    updateApplyToEndButton();
                    syncGroupingFromPhoto();
                }
            );
        }

        if (elements.zoomInButton) {
            elements.zoomInButton.addEventListener(
                "click",
                function () {
                    photoEngine.zoomBy(0.2);
                }
            );
        }

        if (elements.zoomOutButton) {
            elements.zoomOutButton.addEventListener(
                "click",
                function () {
                    photoEngine.zoomBy(-0.2);
                }
            );
        }

        if (elements.resetButton) {
            elements.resetButton.addEventListener(
                "click",
                function () {
                    photoEngine.reset();
                }
            );
        }

        if (elements.rotateLeftButton) {
            elements.rotateLeftButton.addEventListener(
                "click",
                function () {
                    photoEngine.rotate(-90);
                }
            );
        }

        if (elements.rotateRightButton) {
            elements.rotateRightButton.addEventListener(
                "click",
                function () {
                    photoEngine.rotate(90);
                }
            );
        }

        elements.viewer.addEventListener(
            "baika-photo-statechange",
            function (event) {
                updateZoomLabel(
                    elements,
                    event.detail.scale
                );

                renderPins(elements);
                renderArrowCandidates(elements);
            }
        );

        elements.viewer.addEventListener(
            "baika-photo-singletap",
            function (event) {
                const point = event.detail;

                if (
                    handleCalibrationPoint(
                        point.imageX,
                        point.imageY
                    )
                ) {
                    return;
                }

                pins.push({
                    x: Math.round(point.imageX),
                    y: Math.round(point.imageY),
                    score: null
                });

                console.table(pins);
                renderPins(elements);
                updateUndoButton(elements);
                updateScoreSummary();
                updateScoreList(elements);
                updateApplyToEndButton();
                syncGroupingFromPhoto();
            }
        );
    }

    function renderPins(elements) {
        if (!pinLayer || !photoEngine) {
            return;
        }

        pinLayer.replaceChildren();

        if (pins.length === 0) {
            return;
        }

        const viewerRect =
            elements.viewer.getBoundingClientRect();

        pins.forEach(function (pin, index) {
            const screenPoint =
                photoEngine.imageToScreenPoint(
                    pin.x,
                    pin.y
                );

            const dot =
                document.createElement("div");

            dot.textContent =
                pin.score === null
                    ? String(index + 1)
                    : `${index + 1}:${pin.score}`;

            dot.style.position = "absolute";
            dot.style.display = "grid";
            dot.style.placeItems = "center";
            dot.style.minWidth = "28px";
            dot.style.width = "auto";
            dot.style.padding = "0 6px";
            dot.style.height = "28px";
            dot.style.borderRadius = "50%";
            dot.style.background = "red";
            dot.style.color = "white";
            dot.style.fontSize = "12px";
            dot.style.fontWeight = "800";
            dot.style.lineHeight = "1";
            dot.style.border = "2px solid white";
            dot.style.boxSizing = "border-box";
            dot.style.boxShadow =
                "0 2px 6px rgba(0, 0, 0, 0.35)";
            dot.style.pointerEvents = "auto";
            dot.style.touchAction = "none";
            dot.style.cursor = "grab";
            dot.style.userSelect = "none";
            dot.style.webkitUserSelect = "none";

            dot.style.left =
                (
                    screenPoint.x -
                    viewerRect.left
                ) + "px";

            dot.style.top =
                (
                    screenPoint.y -
                    viewerRect.top
                ) + "px";

            dot.style.transform =
                "translate(-50%, -50%)";

            dot.dataset.pinIndex = String(index);

            bindPinDrag(
                dot,
                pin,
                elements
            );

            pinLayer.appendChild(dot);
        });
    }

    function createScoreSummary(elements) {
        scoreSummary =
            document.createElement("div");

        scoreSummary.style.display = "grid";
        scoreSummary.style.gridTemplateColumns =
            "repeat(4, minmax(0, 1fr))";
        scoreSummary.style.gap = "6px";
        scoreSummary.style.width = "100%";
        scoreSummary.style.marginTop = "8px";
        scoreSummary.style.padding = "10px";
        scoreSummary.style.borderRadius = "12px";
        scoreSummary.style.background =
            "rgba(109, 40, 217, 0.08)";
        scoreSummary.style.color = "#38275c";
        scoreSummary.style.fontWeight = "800";
        scoreSummary.style.textAlign = "center";

        if (elements.clearButton) {
            elements.clearButton.insertAdjacentElement(
                "beforebegin",
                scoreSummary
            );
        }

        updateScoreSummary();
    }

    function updateScoreSummary() {
        if (!scoreSummary) {
            return;
        }

        const scoredPins =
            pins.filter(function (pin) {
                return pin.score !== null;
            });

        const total =
            scoredPins.reduce(function (sum, pin) {
                if (pin.score === "X") {
                    return sum + 10;
                }

                if (pin.score === "M") {
                    return sum;
                }

                return sum + Number(pin.score);
            }, 0);

        const xCount =
            scoredPins.filter(function (pin) {
                return pin.score === "X";
            }).length;

        const tenCount =
            scoredPins.filter(function (pin) {
                return (
                    pin.score === "X" ||
                    pin.score === "10"
                );
            }).length;

        scoreSummary.innerHTML =
            `<div>本数<br><strong>${scoredPins.length}</strong></div>`
            + `<div>合計<br><strong>${total}</strong></div>`
            + `<div>X<br><strong>${xCount}</strong></div>`
            + `<div>10以上<br><strong>${tenCount}</strong></div>`;
    }

    function createScoreList(elements) {
        scoreList =
            document.createElement("div");

        scoreList.style.display = "grid";
        scoreList.style.gridTemplateColumns =
            "repeat(3, minmax(0, 1fr))";
        scoreList.style.gap = "6px";
        scoreList.style.width = "100%";
        scoreList.style.marginTop = "8px";

        if (elements.clearButton) {
            elements.clearButton.insertAdjacentElement(
                "beforebegin",
                scoreList
            );
        }

        updateScoreList(elements);
    }

    function updateScoreList(elements) {
        if (!scoreList) {
            return;
        }

        scoreList.replaceChildren();

        for (let index = 0; index < 6; index += 1) {
            const pin = pins[index];

            const button =
                document.createElement("button");

            button.type = "button";
            button.style.minHeight = "46px";
            button.style.padding = "8px";
            button.style.border =
                "1px solid rgba(109, 40, 217, 0.18)";
            button.style.borderRadius = "10px";
            button.style.background =
                pin
                    ? "rgba(255, 255, 255, 0.96)"
                    : "rgba(243, 244, 246, 0.9)";
            button.style.color = "#38275c";
            button.style.fontWeight = "800";
            button.style.cursor =
                pin ? "pointer" : "default";
            button.style.touchAction = "manipulation";

            const number =
                String(index + 1);

            const score =
                pin && pin.score !== null
                    ? pin.score
                    : "－";

            button.textContent =
                `${number}　${score}`;

            button.disabled = !pin;

            if (pin) {
                button.addEventListener(
                    "click",
                    function (event) {
                        event.preventDefault();
                        event.stopPropagation();

                        editPinScore(
                            pin,
                            elements
                        );
                    }
                );
            }

            scoreList.appendChild(button);
        }
    }

    function createScorePanel(elements) {
        scorePanel = document.createElement("div");

        scorePanel.style.position = "absolute";
        scorePanel.style.left = "50%";
        scorePanel.style.bottom = "12px";
        scorePanel.style.transform = "translateX(-50%)";
        scorePanel.style.display = "none";
        scorePanel.style.gridTemplateColumns =
            "repeat(4, minmax(48px, 1fr))";
        scorePanel.style.gap = "6px";
        scorePanel.style.width = "calc(100% - 24px)";
        scorePanel.style.maxWidth = "320px";
        scorePanel.style.padding = "10px";
        scorePanel.style.borderRadius = "14px";
        scorePanel.style.background =
            "rgba(17, 24, 39, 0.94)";
        scorePanel.style.boxShadow =
            "0 8px 24px rgba(0, 0, 0, 0.35)";
        scorePanel.style.zIndex = "20";
        scorePanel.style.pointerEvents = "auto";

        const scores = [
            "X", "10", "9", "8",
            "7", "6", "5", "4",
            "3", "2", "1", "M"
        ];

        scores.forEach(function (score) {
            const button =
                document.createElement("button");

            button.type = "button";
            button.textContent = score;
            button.style.minHeight = "44px";
            button.style.border = "0";
            button.style.borderRadius = "10px";
            button.style.fontSize = "18px";
            button.style.fontWeight = "900";
            button.style.cursor = "pointer";
            button.style.touchAction = "manipulation";

            if (
                score === "X" ||
                score === "10" ||
                score === "9"
            ) {
                button.style.background = "#ffd700";
                button.style.color = "#241c00";
            } else if (
                score === "8" ||
                score === "7"
            ) {
                button.style.background = "#ff3b30";
                button.style.color = "#ffffff";
            } else if (
                score === "6" ||
                score === "5"
            ) {
                button.style.background = "#007aff";
                button.style.color = "#ffffff";
            } else if (
                score === "4" ||
                score === "3"
            ) {
                button.style.background = "#333333";
                button.style.color = "#ffffff";
            } else if (
                score === "2" ||
                score === "1"
            ) {
                button.style.background = "#ffffff";
                button.style.color = "#1f2937";
            } else {
                button.style.background = "#b8bcc4";
                button.style.color = "#252932";
            }

            button.addEventListener(
                "pointerdown",
                function (event) {
                    event.stopPropagation();
                }
            );

            button.addEventListener(
                "click",
                function (event) {
                    event.preventDefault();
                    event.stopPropagation();

                    if (!scoreEditingPin) {
                        return;
                    }

                    scoreEditingPin.score = score;
                    closeScorePanel();
                    renderPins(elements);
                    updateScoreSummary();
                    updateScoreList(elements);
                    updateApplyToEndButton();
                    syncGroupingFromPhoto();
                    console.table(pins);
                }
            );

            scorePanel.appendChild(button);
        });

        const cancelButton =
            document.createElement("button");

        cancelButton.type = "button";
        cancelButton.textContent = "キャンセル";
        cancelButton.style.gridColumn = "1 / -1";
        cancelButton.style.minHeight = "40px";
        cancelButton.style.border = "0";
        cancelButton.style.borderRadius = "10px";
        cancelButton.style.background = "#6b7280";
        cancelButton.style.color = "#ffffff";
        cancelButton.style.fontWeight = "800";
        cancelButton.style.cursor = "pointer";

        cancelButton.addEventListener(
            "pointerdown",
            function (event) {
                event.stopPropagation();
            }
        );

        cancelButton.addEventListener(
            "click",
            function (event) {
                event.preventDefault();
                event.stopPropagation();
                closeScorePanel();
            }
        );

        scorePanel.appendChild(cancelButton);
        elements.viewer.appendChild(scorePanel);
    }

    function editPinScore(
        pin,
        elements
    ) {
        scoreEditingPin = pin;
        scorePanel.style.display = "grid";
    }

    function closeScorePanel() {
        scoreEditingPin = null;

        if (scorePanel) {
            scorePanel.style.display = "none";
        }
    }

    function bindPinDrag(
        dot,
        pin,
        elements
    ) {
        let dragging = false;
        let pointerId = null;
        let grabOffsetX = 0;
        let grabOffsetY = 0;
        let dragStartX = 0;
        let dragStartY = 0;
        let moved = false;

        dot.addEventListener(
            "pointerdown",
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                dragging = true;
                pointerId = event.pointerId;
                dragStartX = event.clientX;
                dragStartY = event.clientY;
                moved = false;

                const dotRect =
                    dot.getBoundingClientRect();

                grabOffsetX =
                    event.clientX -
                    (
                        dotRect.left +
                        dotRect.width / 2
                    );

                grabOffsetY =
                    event.clientY -
                    (
                        dotRect.top +
                        dotRect.height / 2
                    );

                dot.style.cursor = "grabbing";
                dot.style.transform =
                    "translate(-50%, -50%) scale(1.25)";
                dot.style.zIndex = "10";
                dot.style.opacity = "0.9";

                try {
                    dot.setPointerCapture(
                        event.pointerId
                    );
                } catch (error) {
                    // Pointer Capture未対応時も続行する。
                }
            }
        );

        dot.addEventListener(
            "pointermove",
            function (event) {
                if (
                    !dragging ||
                    event.pointerId !== pointerId
                ) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                if (
                    Math.hypot(
                        event.clientX - dragStartX,
                        event.clientY - dragStartY
                    ) > 6
                ) {
                    moved = true;
                }

                const targetClientX =
                    event.clientX - grabOffsetX;

                const targetClientY =
                    event.clientY - grabOffsetY;

                const imagePoint =
                    photoEngine.screenToImagePoint(
                        targetClientX,
                        targetClientY
                    );

                const state =
                    photoEngine.getState();

                pin.x = Math.max(
                    0,
                    Math.min(
                        state.naturalWidth,
                        imagePoint.x
                    )
                );

                pin.y = Math.max(
                    0,
                    Math.min(
                        state.naturalHeight,
                        imagePoint.y
                    )
                );

                /*
                 * 写真側で現在動かしている番号だけを
                 * 入力用・グルーピングへ再反映する。
                 */
                pin.photoPositionChanged = true;

                const screenPoint =
                    photoEngine.imageToScreenPoint(
                        pin.x,
                        pin.y
                    );

                const viewerRect =
                    elements.viewer.getBoundingClientRect();

                dot.style.left =
                    (
                        screenPoint.x -
                        viewerRect.left
                    ) + "px";

                dot.style.top =
                    (
                        screenPoint.y -
                        viewerRect.top
                    ) + "px";

                syncGroupingFromPhoto();
                pin.photoPositionChanged = false;
            }
        );

        function finishDrag(event) {
            if (
                !dragging ||
                event.pointerId !== pointerId
            ) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            dragging = false;
            pointerId = null;

            dot.style.cursor = "grab";
            dot.style.transform =
                "translate(-50%, -50%) scale(1)";
            dot.style.zIndex = "";
            dot.style.opacity = "1";

            if (!moved) {
                editPinScore(
                    pin,
                    elements
                );
                return;
            }

            pin.photoPositionChanged = true;
            renderPins(elements);
            syncGroupingFromPhoto();
            pin.photoPositionChanged = false;
            console.table(pins);
        }

        dot.addEventListener(
            "pointerup",
            finishDrag
        );

        dot.addEventListener(
            "pointercancel",
            finishDrag
        );

        dot.addEventListener(
            "lostpointercapture",
            function (event) {
                if (dragging) {
                    finishDrag(event);
                }
            }
        );
    }

    function handlePhotoSelection(event) {
        const file =
            event.target.files &&
            event.target.files[0];

        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            window.alert(
                "画像ファイルを選択してください。"
            );
            event.target.value = "";
            return;
        }

        const elements = getPhotoElements();

        releasePhotoUrl();
        clearPins();
        closeScorePanel();
        updateUndoButton(elements);

        currentPhotoUrl =
            URL.createObjectURL(file);

        elements.preview.hidden = false;
        elements.preview.src = currentPhotoUrl;

        clearArrowCandidates();

        elements.preview.addEventListener(
            "load",
            function handleArrowPhotoLoad() {
                elements.preview.removeEventListener(
                    "load",
                    handleArrowPhotoLoad
                );

                if (arrowDetectButton) {
                    arrowDetectButton.disabled = false;
                }

                if (arrowDetectStatus) {
                    arrowDetectStatus.textContent =
                        "「矢候補を自動検出」を押してください。";
                }
            }
        );

        updatePhotoUI(elements, true);
    }

    function clearPhoto() {
        const elements = getPhotoElements();

        releasePhotoUrl();
        clearPins();
        clearArrowCandidates();
        closeScorePanel();
        updateUndoButton(elements);

        if (elements.input) {
            elements.input.value = "";
        }

        if (elements.preview) {
            elements.preview.removeAttribute("src");
            elements.preview.hidden = true;
            elements.preview.style.transform = "";
        }

        if (photoEngine) {
            photoEngine.setLoaded(false);
        }

        updatePhotoUI(elements, false);
    }

    function clearPins() {
        pins.length = 0;

        if (pinLayer) {
            pinLayer.replaceChildren();
        }

        updateScoreSummary();

        const elements = getPhotoElements();
        updateScoreList(elements);
        updateApplyToEndButton();
        resetCalibration();
        syncGroupingFromPhoto();
    }

    function syncGroupingFromPhoto() {
        if (
            typeof window.syncPhotoPinsToGrouping
            !== "function"
        ) {
            return;
        }

        const state =
            photoEngine &&
            typeof photoEngine.getState === "function"
                ? photoEngine.getState()
                : null;

        window.syncPhotoPinsToGrouping(
            pins,
            state ? state.naturalWidth : 0,
            state ? state.naturalHeight : 0,
            getCalibration()
        );
    }

    function updateUndoButton(elements) {
        if (!elements.undoButton) {
            return;
        }

        elements.undoButton.disabled =
            pins.length === 0;
    }

    function updatePhotoUI(elements, hasPhoto) {
        if (elements.emptyDisplay) {
            elements.emptyDisplay.hidden = hasPhoto;
        }

        if (elements.preview) {
            elements.preview.hidden = !hasPhoto;
        }

        if (elements.clearButton) {
            elements.clearButton.disabled = !hasPhoto;
        }

        if (elements.viewer) {
            elements.viewer.classList.toggle(
                "has-photo",
                hasPhoto
            );

            if (!hasPhoto) {
                elements.viewer.classList.remove(
                    "is-dragging"
                );
            }
        }

        if (arrowDetectButton) {
            arrowDetectButton.disabled = !hasPhoto;
        }

        [
            elements.zoomInButton,
            elements.zoomOutButton,
            elements.resetButton,
            elements.rotateLeftButton,
            elements.rotateRightButton
        ].forEach(function (button) {
            if (button) {
                button.disabled = !hasPhoto;
            }
        });

        updateZoomLabel(elements, 1);
    }

    function updateZoomLabel(elements, scale) {
        if (!elements.resetButton) {
            return;
        }

        elements.resetButton.textContent =
            `${Math.round(scale * 100)}%`;
    }

    function releasePhotoUrl() {
        if (!currentPhotoUrl) {
            return;
        }

        URL.revokeObjectURL(currentPhotoUrl);
        currentPhotoUrl = "";
    }

    function getPhotoElements() {
        return {
            input:
                document.getElementById(
                    "v4TargetPhotoInput"
                ),
            clearButton:
                document.getElementById(
                    "v4TargetPhotoClear"
                ),
            undoButton:
                document.getElementById(
                    "v4PhotoUndoLastPin"
                ),
            zoomInButton:
                document.getElementById(
                    "v4PhotoZoomIn"
                ),
            zoomOutButton:
                document.getElementById(
                    "v4PhotoZoomOut"
                ),
            resetButton:
                document.getElementById(
                    "v4PhotoZoomReset"
                ),
            rotateLeftButton:
                document.getElementById(
                    "v4PhotoRotateLeft"
                ),
            rotateRightButton:
                document.getElementById(
                    "v4PhotoRotateRight"
                ),
            viewer:
                document.getElementById(
                    "v4TargetPhotoViewer"
                ),
            preview:
                document.getElementById(
                    "v4TargetPhotoPreview"
                ),
            emptyDisplay:
                document.getElementById(
                    "v4TargetPhotoEmpty"
                )
        };
    }
})();
