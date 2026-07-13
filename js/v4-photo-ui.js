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
        createScorePanel(elements);
        createScoreSummary(elements);
        createUndoButton(elements);
        bindUIEvents(elements);
        updatePhotoUI(elements, false);

        window.baikaPhotoEngine = photoEngine;
        window.baikaPhotoPins = pins;
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
            }
        );

        elements.viewer.addEventListener(
            "baika-photo-singletap",
            function (event) {
                const point = event.detail;

                pins.push({
                    x: Math.round(point.imageX),
                    y: Math.round(point.imageY),
                    score: null
                });

                console.table(pins);
                renderPins(elements);
                updateUndoButton(elements);
                updateScoreSummary();
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

            renderPins(elements);
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

        updatePhotoUI(elements, true);
    }

    function clearPhoto() {
        const elements = getPhotoElements();

        releasePhotoUrl();
        clearPins();
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
