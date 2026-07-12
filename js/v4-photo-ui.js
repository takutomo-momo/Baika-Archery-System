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
                    renderPins(elements);
                    updateUndoButton(elements);
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
                    y: Math.round(point.imageY)
                });

                console.table(pins);
                renderPins(elements);
                updateUndoButton(elements);
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

            dot.textContent = String(index + 1);

            dot.style.position = "absolute";
            dot.style.display = "grid";
            dot.style.placeItems = "center";
            dot.style.width = "28px";
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
                    viewerRect.left -
                    14
                ) + "px";

            dot.style.top =
                (
                    screenPoint.y -
                    viewerRect.top -
                    14
                ) + "px";

            dot.dataset.pinIndex = String(index);

            bindPinDrag(
                dot,
                pin,
                elements
            );

            pinLayer.appendChild(dot);
        });
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

        dot.addEventListener(
            "pointerdown",
            function (event) {
                event.preventDefault();
                event.stopPropagation();

                dragging = true;
                pointerId = event.pointerId;

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
                dot.style.transform = "scale(1.25)";
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
                        viewerRect.left -
                        14
                    ) + "px";

                dot.style.top =
                    (
                        screenPoint.y -
                        viewerRect.top -
                        14
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
            dot.style.transform = "scale(1)";
            dot.style.zIndex = "";
            dot.style.opacity = "1";

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
