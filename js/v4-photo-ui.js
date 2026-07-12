"use strict";

/*
 * Baika Archery System Ver4
 * Photo UI Adapter v2
 *
 * 元画像座標で着弾ピンを保持する。
 */

(function () {
    let photoEngine = null;
    let currentPhotoUrl = "";
    let pins = [];
    let nextPinId = 1;

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

        preparePinLayer(elements);
        preparePinControls(elements);

        photoEngine = new window.BaikaPhotoEngine(
            elements.viewer,
            elements.preview,
            {
                minScale: 1,
                maxScale: 6,
                zoomStep: 0.2
            }
        );

        bindUIEvents(elements);
        updatePhotoUI(elements, false);

        window.baikaPhotoEngine = photoEngine;
        window.baikaPhotoPins = {
            getPins,
            setPins,
            clearPins,
            removeLastPin,
            addPin: addPinByImageCoordinate
        };
    }

    function preparePinLayer(elements) {
        let layer =
            document.getElementById("v4PhotoPinLayer");

        if (!layer) {
            layer = document.createElement("div");
            layer.id = "v4PhotoPinLayer";
            layer.className = "v4-photo-pin-layer";
            layer.setAttribute("aria-hidden", "true");
            elements.viewer.appendChild(layer);
        }

        elements.pinLayer = layer;
    }

    function preparePinControls(elements) {
        if (!elements.clearButton) {
            return;
        }

        let undoButton =
            document.getElementById("v4PhotoPinUndo");

        if (!undoButton) {
            undoButton = document.createElement("button");
            undoButton.type = "button";
            undoButton.id = "v4PhotoPinUndo";
            undoButton.className = elements.clearButton.className;
            undoButton.textContent = "ピンを1本戻す";
            undoButton.disabled = true;
            elements.clearButton.insertAdjacentElement(
                "afterend",
                undoButton
            );
        }

        let clearPinsButton =
            document.getElementById("v4PhotoPinsClear");

        if (!clearPinsButton) {
            clearPinsButton = document.createElement("button");
            clearPinsButton.type = "button";
            clearPinsButton.id = "v4PhotoPinsClear";
            clearPinsButton.className =
                elements.clearButton.className;
            clearPinsButton.textContent = "ピンを全削除";
            clearPinsButton.disabled = true;
            undoButton.insertAdjacentElement(
                "afterend",
                clearPinsButton
            );
        }

        elements.undoPinButton = undoButton;
        elements.clearPinsButton = clearPinsButton;
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

        if (elements.undoPinButton) {
            elements.undoPinButton.addEventListener(
                "click",
                removeLastPin
            );
        }

        if (elements.clearPinsButton) {
            elements.clearPinsButton.addEventListener(
                "click",
                clearPins
            );
        }

        elements.viewer.addEventListener(
            "baika-photo-statechange",
            function (event) {
                updateZoomLabel(
                    elements,
                    event.detail.scale
                );
                renderPins();
            }
        );

        elements.viewer.addEventListener(
            "baika-photo-tap",
            function (event) {
                addPinByImageCoordinate(
                    event.detail.imageX,
                    event.detail.imageY
                );
            }
        );
    }

    function addPinByImageCoordinate(imageX, imageY, data = {}) {
        if (!photoEngine || !photoEngine.getState().loaded) {
            return null;
        }

        const pin = {
            id: data.id || nextPinId++,
            imageX: Number(imageX),
            imageY: Number(imageY),
            score:
                data.score === undefined
                    ? null
                    : data.score,
            confidence:
                data.confidence === undefined
                    ? null
                    : data.confidence,
            source: data.source || "manual"
        };

        if (
            !Number.isFinite(pin.imageX) ||
            !Number.isFinite(pin.imageY)
        ) {
            return null;
        }

        pins.push(pin);
        renderPins();
        dispatchPinsChange();

        return { ...pin };
    }

    function removeLastPin() {
        if (!pins.length) {
            return;
        }

        pins.pop();
        renderPins();
        dispatchPinsChange();
    }

    function clearPins() {
        pins = [];
        nextPinId = 1;
        renderPins();
        dispatchPinsChange();
    }

    function getPins() {
        return pins.map(function (pin) {
            return { ...pin };
        });
    }

    function setPins(nextPins) {
        if (!Array.isArray(nextPins)) {
            throw new TypeError(
                "Photo Pins: 配列を指定してください。"
            );
        }

        pins = nextPins
            .map(function (pin, index) {
                return {
                    id: pin.id || index + 1,
                    imageX: Number(pin.imageX),
                    imageY: Number(pin.imageY),
                    score:
                        pin.score === undefined
                            ? null
                            : pin.score,
                    confidence:
                        pin.confidence === undefined
                            ? null
                            : pin.confidence,
                    source: pin.source || "import"
                };
            })
            .filter(function (pin) {
                return (
                    Number.isFinite(pin.imageX) &&
                    Number.isFinite(pin.imageY)
                );
            });

        nextPinId =
            pins.reduce(function (maximum, pin) {
                return Math.max(maximum, Number(pin.id) || 0);
            }, 0) + 1;

        renderPins();
        dispatchPinsChange();
    }

    function renderPins() {
        const elements = getPhotoElements();

        if (!elements.pinLayer) {
            return;
        }

        elements.pinLayer.replaceChildren();

        if (
            !photoEngine ||
            !photoEngine.getState().loaded
        ) {
            updatePinButtons(elements);
            return;
        }

        const viewerRect =
            elements.viewer.getBoundingClientRect();

        pins.forEach(function (pin, index) {
            const screen =
                photoEngine.imageToScreenPoint(
                    pin.imageX,
                    pin.imageY
                );

            const marker = document.createElement("span");
            marker.className = "v4-photo-pin";
            marker.textContent = String(index + 1);
            marker.style.left =
                `${screen.x - viewerRect.left}px`;
            marker.style.top =
                `${screen.y - viewerRect.top}px`;
            marker.dataset.pinId = String(pin.id);

            elements.pinLayer.appendChild(marker);
        });

        updatePinButtons(elements);
    }

    function updatePinButtons(elements) {
        const disabled = pins.length === 0;

        if (elements.undoPinButton) {
            elements.undoPinButton.disabled = disabled;
        }

        if (elements.clearPinsButton) {
            elements.clearPinsButton.disabled = disabled;
        }
    }

    function dispatchPinsChange() {
        const elements = getPhotoElements();

        if (!elements.viewer) {
            return;
        }

        elements.viewer.dispatchEvent(
            new CustomEvent(
                "baika-photo-pinschange",
                {
                    detail: {
                        pins: getPins()
                    }
                }
            )
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
        renderPins();
    }

    function updateZoomLabel(elements, scale) {
        if (elements.resetButton) {
            elements.resetButton.textContent =
                `${Math.round(scale * 100)}%`;
        }
    }

    function releasePhotoUrl() {
        if (currentPhotoUrl) {
            URL.revokeObjectURL(currentPhotoUrl);
            currentPhotoUrl = "";
        }
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
            undoPinButton:
                document.getElementById(
                    "v4PhotoPinUndo"
                ),
            clearPinsButton:
                document.getElementById(
                    "v4PhotoPinsClear"
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
                ),
            pinLayer:
                document.getElementById(
                    "v4PhotoPinLayer"
                )
        };
    }
})();
