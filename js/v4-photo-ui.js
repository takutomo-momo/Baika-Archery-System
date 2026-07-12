"use strict";

/*
 * Baika Archery System Ver4
 * Photo UI Adapter
 *
 * 既存の記録入力画面とBaikaPhotoEngineを接続する。
 */

(function () {
    let photoEngine = null;
    let currentPhotoUrl = "";
    const pins = [];
    let pinElement = null;

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
pinElement = document.createElement("div");

pinElement.style.position = "absolute";
pinElement.style.width = "10px";
pinElement.style.height = "10px";
pinElement.style.borderRadius = "50%";
pinElement.style.background = "red";
pinElement.style.pointerEvents = "none";
pinElement.style.display = "none";
elements.viewer.appendChild(pinElement);
        bindUIEvents(elements);
        updatePhotoUI(elements, false);

        window.baikaPhotoEngine = photoEngine;
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

        elements.viewer.addEventListener(
            "baika-photo-statechange",
            function (event) {
                updateZoomLabel(
                    elements,
                    event.detail.scale
                );
                renderPin(elements);
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

        pinElement.style.display = "block";

        renderPin(elements);


const screenPoint =
    photoEngine.imageToScreenPoint(
        point.imageX,
        point.imageY
    );

const viewerRect =
    elements.viewer.getBoundingClientRect();

pinElement.style.left =
    (screenPoint.x - viewerRect.left - 5) + "px";

pinElement.style.top =
    (screenPoint.y - viewerRect.top - 5) + "px";

    }
);


        elements.viewer.addEventListener(
            "baika-photo-singletap",
            function (event) {
                const point = event.detail;

                console.log(
                    "Photo image coordinate:",
                    {
                        x: Math.round(point.imageX),
                        y: Math.round(point.imageY),
                        normalizedX:
                            Number(
                                point.normalizedX.toFixed(6)
                            ),
                        normalizedY:
                            Number(
                                point.normalizedY.toFixed(6)
                            )
                    }
                );
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

        currentPhotoUrl =
            URL.createObjectURL(file);

        elements.preview.hidden = false;
        elements.preview.src = currentPhotoUrl;

        updatePhotoUI(elements, true);
    }

    function clearPhoto() {
        const elements = getPhotoElements();

        releasePhotoUrl();

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
function renderPin(elements) {

    if (!pinElement) return;
    if (pins.length === 0) return;

    const point = pins[pins.length - 1];

    const screenPoint =
        photoEngine.imageToScreenPoint(
            point.x,
            point.y
        );

    const viewerRect =
        elements.viewer.getBoundingClientRect();

    pinElement.style.left =
        (screenPoint.x - viewerRect.left - 5) + "px";

    pinElement.style.top =
        (screenPoint.y - viewerRect.top - 5) + "px";
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
