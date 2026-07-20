"use strict";

/*
 * Baika Archery System Ver4
 * Target Engine
 *
 * 入力用の的に表示された写真由来ピンを、
 * SVG全体を再描画せず滑らかにドラッグする。
 */

(function () {
    let activeDrag = null;
    let suppressClickUntil = 0;
    let pendingFrame = 0;
    let pendingPoint = null;
    let fineAdjustIndex = null;

    function suppressNextClick() {
        suppressClickUntil =
            Date.now() + 450;
    }

    function consumeSuppressedClick() {
        if (Date.now() <= suppressClickUntil) {
            suppressClickUntil = 0;
            return true;
        }

        return false;
    }

    window.baikaTargetGesture = {
        consumeSuppressedClick:
            consumeSuppressedClick,
        resetFineAdjustment: function () {
            fineAdjustIndex = null;
        }
    };

    function getSvg() {
        return document.getElementById("targetSvg");
    }

    function shouldZoomForFineAdjustment() {
        return (
            window.matchMedia(
                "(orientation: landscape)"
            ).matches &&
            Math.min(
                window.innerWidth,
                window.innerHeight
            ) <= 600
        );
    }

    function zoomAroundPin(svg, x, y) {
        // 300 / 50 = 6.0（600%）
        const size = 50;
        const half = size / 2;
        const left = Math.max(
            0,
            Math.min(300 - size, x - half)
        );
        const top = Math.max(
            0,
            Math.min(300 - size, y - half)
        );

        svg.setAttribute(
            "viewBox",
            `${left} ${top} ${size} ${size}`
        );
    }

    function isFineZoomed(svg) {
        if (!svg || !svg.viewBox || !svg.viewBox.baseVal) {
            return false;
        }

        return svg.viewBox.baseVal.width <= 55;
    }

    function markFineAdjustPin(index) {
        const svg = getSvg();
        if (!svg) return;

        svg.querySelectorAll(
            "[data-target-pin-index]"
        ).forEach(function (element) {
            if (Number(element.getAttribute("r")) < 10) {
                element.setAttribute(
                    "stroke-width",
                    Number(element.getAttribute(
                        "data-original-stroke-width"
                    ) || 1)
                );
            }
        });

        const parts = findPinParts(index);
        if (parts.visiblePin) {
            if (!parts.visiblePin.hasAttribute(
                "data-original-stroke-width"
            )) {
                parts.visiblePin.setAttribute(
                    "data-original-stroke-width",
                    parts.visiblePin.getAttribute(
                        "stroke-width"
                    ) || "1"
                );
            }
            parts.visiblePin.setAttribute(
                "stroke-width",
                "3"
            );
        }
    }

    function getSvgPoint(event) {
        const svg = getSvg();

        if (!svg) {
            return null;
        }

        const matrix = svg.getScreenCTM();

        if (!matrix) {
            return null;
        }

        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;

        const svgPoint =
            point.matrixTransform(
                matrix.inverse()
            );

        return {
            x: Math.max(
                0,
                Math.min(300, svgPoint.x)
            ),
            y: Math.max(
                0,
                Math.min(300, svgPoint.y)
            )
        };
    }

    function findPinElement(target) {
        if (!(target instanceof Element)) {
            return null;
        }

        return target.closest(
            "[data-target-pin-index]"
        );
    }

    function findPinParts(index) {
        const svg = getSvg();

        if (!svg) {
            return {
                hitArea: null,
                visiblePin: null
            };
        }

        const matches =
            svg.querySelectorAll(
                `[data-target-pin-index="${index}"]`
            );

        let hitArea = null;
        let visiblePin = null;

        matches.forEach(function (element) {
            const radius =
                Number(
                    element.getAttribute("r")
                );

            if (radius >= 10) {
                hitArea = element;
            } else {
                visiblePin = element;
            }
        });

        return {
            hitArea: hitArea,
            visiblePin: visiblePin
        };
    }

    function findLabel(index) {
        const svg = getSvg();

        if (!svg) {
            return null;
        }

        return svg.querySelector(
            `[data-target-pin-label-index="${index}"]`
        );
    }

    function moveVisual(
        pinElement,
        labelElement,
        point
    ) {
        pinElement.setAttribute(
            "cx",
            String(point.x)
        );

        pinElement.setAttribute(
            "cy",
            String(point.y)
        );

        if (
            activeDrag &&
            activeDrag.hitArea
        ) {
            activeDrag.hitArea.setAttribute(
                "cx",
                String(point.x)
            );

            activeDrag.hitArea.setAttribute(
                "cy",
                String(point.y)
            );
        }

        if (labelElement) {
            labelElement.setAttribute(
                "x",
                String(point.x + 5)
            );

            labelElement.setAttribute(
                "y",
                String(point.y + 3)
            );
        }
    }

    function handlePointerDown(event) {
        const pinElement =
            findPinElement(event.target);

        if (!pinElement) {
            return;
        }

        const index =
            Number(
                pinElement.getAttribute(
                    "data-target-pin-index"
                )
            );

        if (!Number.isInteger(index)) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const svg = getSvg();
        const pinParts =
            findPinParts(index);
        const visiblePin =
            pinParts.visiblePin || pinElement;
        const originalPoint = {
            x: Number(visiblePin.getAttribute("cx")),
            y: Number(visiblePin.getAttribute("cy"))
        };

        if (
            svg &&
            Number.isFinite(originalPoint.x) &&
            Number.isFinite(originalPoint.y) &&
            shouldZoomForFineAdjustment() &&
            (!isFineZoomed(svg) || fineAdjustIndex !== index)
        ) {
            /*
             * 1回目のタップは600%拡大とピン選択だけにする。
             * 拡大とドラッグを同じ指操作で行わないため、
             * iPhoneでも細かな修正を始めやすい。
             */
            zoomAroundPin(
                svg,
                originalPoint.x,
                originalPoint.y
            );
            fineAdjustIndex = index;
            markFineAdjustPin(index);
            suppressNextClick();
            return;
        }

        fineAdjustIndex = index;
        markFineAdjustPin(index);

        activeDrag = {
            pointerId: event.pointerId,
            index: index,
            pinElement: visiblePin,
            hitArea: pinParts.hitArea,
            labelElement: findLabel(index),
            startClientX: event.clientX,
            startClientY: event.clientY,
            originalPoint: originalPoint,
            lastPoint: originalPoint,
            moved: false
        };

        /*
         * ピンを押した時点で、この後に生成されるclickを
         * ズームへ渡さない。
         */
        suppressNextClick();

        pinElement.style.cursor = "grabbing";

        if (
            typeof pinElement.setPointerCapture
            === "function"
        ) {
            pinElement.setPointerCapture(
                event.pointerId
            );
        }
    }

    function handlePointerMove(event) {
        if (
            !activeDrag ||
            activeDrag.pointerId !== event.pointerId
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const point = getSvgPoint(event);

        if (!point) {
            return;
        }

        activeDrag.lastPoint = point;

        const movement =
            Math.hypot(
                event.clientX -
                    activeDrag.startClientX,
                event.clientY -
                    activeDrag.startClientY
            );

        if (movement >= 3) {
            activeDrag.moved = true;
            suppressNextClick();
        }

        pendingPoint = point;

        if (!pendingFrame) {
            pendingFrame = window.requestAnimationFrame(function () {
                pendingFrame = 0;
                if (!activeDrag || !pendingPoint) {
                    return;
                }

                const framePoint = pendingPoint;
                pendingPoint = null;

                moveVisual(
                    activeDrag.pinElement,
                    activeDrag.labelElement,
                    framePoint
                );

                if (
                    window.baikaTargetModel &&
                    typeof window.baikaTargetModel
                        .updatePinPosition === "function"
                ) {
                    window.baikaTargetModel.updatePinPosition(
                        activeDrag.index,
                        framePoint.x,
                        framePoint.y
                    );
                }
            });
        }
    }

    function finishPointer(event) {
        if (
            !activeDrag ||
            activeDrag.pointerId !== event.pointerId
        ) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (pendingFrame) {
            window.cancelAnimationFrame(pendingFrame);
            pendingFrame = 0;
            pendingPoint = null;
        }

        const finishedDrag = activeDrag;
        /*
         * pointerup時はブラウザ側で座標がわずかに変わることがある。
         * ドラッグ中に確定した最後のSVG座標をそのまま使用し、
         * ピンが別位置へ飛んだりM判定になって消えることを防ぐ。
         */
        const point = finishedDrag.moved
            ? finishedDrag.lastPoint
            : finishedDrag.originalPoint;

        /*
         * pointerup後にブラウザが発生させるclickを抑止。
         */
        suppressNextClick();
        activeDrag = null;

        finishedDrag.pinElement.style.cursor =
            "grab";

        if (
            point &&
            window.baikaTargetModel &&
            typeof window.baikaTargetModel
                .finishPinPosition === "function"
        ) {
            window.baikaTargetModel
                .finishPinPosition(
                    finishedDrag.index,
                    point.x,
                    point.y
                );
        }
    }

    function bind() {
        const svg = getSvg();

        if (!svg || svg.dataset.targetEngineBound) {
            return;
        }

        svg.dataset.targetEngineBound = "true";

        /*
         * Step56-2:
         * iPhone横向きでピンをドラッグした際にページがスクロールし、
         * 横の写真パネルまで動いて見える問題を防ぐ。
         * 的の操作領域内ではブラウザ標準のスクロールを停止する。
         */
        svg.style.touchAction = "none";
        svg.style.webkitUserSelect = "none";
        svg.style.userSelect = "none";

        svg.addEventListener(
            "pointerdown",
            handlePointerDown
        );

        svg.addEventListener(
            "pointermove",
            handlePointerMove
        );

        svg.addEventListener(
            "pointerup",
            finishPointer
        );

        svg.addEventListener(
            "pointercancel",
            finishPointer
        );
    }

    document.addEventListener(
        "DOMContentLoaded",
        bind
    );

    window.addEventListener(
        "load",
        bind
    );
})();
