"use strict";

/*
 * Baika Archery System Ver4 - Target Engine (Step60-5)
 *
 * 入力的の操作:
 *   タップ       : 600%ズーム
 *   ピンドラッグ : 入力的のピンだけ移動
 *   ダブルタップ : 全体表示へリセット
 */
(function () {
    let activeDrag = null;
    let suppressClickUntil = 0;
    let pendingFrame = 0;
    let pendingPoint = null;
    let backgroundPointer = null;
    let lastTap = null;

    function suppressNextClick(duration) {
        suppressClickUntil = Date.now() + (duration || 500);
    }

    function consumeSuppressedClick() {
        if (Date.now() <= suppressClickUntil) {
            suppressClickUntil = 0;
            return true;
        }
        return false;
    }

    window.baikaTargetGesture = {
        consumeSuppressedClick: consumeSuppressedClick,
        resetFineAdjustment: function () {}
    };

    function getSvg() {
        return document.getElementById("targetSvg");
    }

    function resetZoom() {
        suppressNextClick(650);
        if (typeof window.resetTargetZoom === "function") {
            window.resetTargetZoom();
        } else {
            const svg = getSvg();
            if (svg) svg.setAttribute("viewBox", "0 0 300 300");
        }
    }

    function zoomAround(svg, x, y) {
        const size = 50; // 600%
        const half = size / 2;
        const left = Math.max(0, Math.min(300 - size, x - half));
        const top = Math.max(0, Math.min(300 - size, y - half));
        svg.setAttribute("viewBox", `${left} ${top} ${size} ${size}`);
    }

    function getSvgPoint(event) {
        const svg = getSvg();
        if (!svg) return null;
        const matrix = svg.getScreenCTM();
        if (!matrix) return null;
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const result = point.matrixTransform(matrix.inverse());
        return {
            x: Math.max(0, Math.min(300, result.x)),
            y: Math.max(0, Math.min(300, result.y))
        };
    }

    function findPinElement(target) {
        if (!(target instanceof Element)) return null;
        return target.closest("[data-target-pin-index]");
    }

    function findPinParts(index) {
        const svg = getSvg();
        const result = { hitArea: null, visiblePin: null };
        if (!svg) return result;
        svg.querySelectorAll(`[data-target-pin-index="${index}"]`)
            .forEach(function (element) {
                const radius = Number(element.getAttribute("r"));
                if (radius >= 10) result.hitArea = element;
                else result.visiblePin = element;
            });
        return result;
    }

    function findLabel(index) {
        const svg = getSvg();
        return svg
            ? svg.querySelector(`[data-target-pin-label-index="${index}"]`)
            : null;
    }

    function moveVisual(drag, point) {
        drag.pinElement.setAttribute("cx", String(point.x));
        drag.pinElement.setAttribute("cy", String(point.y));
        if (drag.hitArea) {
            drag.hitArea.setAttribute("cx", String(point.x));
            drag.hitArea.setAttribute("cy", String(point.y));
        }
        if (drag.labelElement) {
            drag.labelElement.setAttribute("x", String(point.x + 5));
            drag.labelElement.setAttribute("y", String(point.y + 3));
        }
    }

    function registerTap(event, point) {
        const now = Date.now();
        const isDouble = lastTap &&
            now - lastTap.time <= 340 &&
            Math.hypot(
                event.clientX - lastTap.clientX,
                event.clientY - lastTap.clientY
            ) <= 28;

        if (isDouble) {
            lastTap = null;
            resetZoom();
            return true;
        }

        lastTap = {
            time: now,
            clientX: event.clientX,
            clientY: event.clientY,
            point: point
        };
        return false;
    }

    function handlePointerDown(event) {
        const pinElement = findPinElement(event.target);

        if (!pinElement) {
            backgroundPointer = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY
            };
            return;
        }

        const index = Number(pinElement.getAttribute("data-target-pin-index"));
        if (!Number.isInteger(index)) return;

        event.preventDefault();
        event.stopPropagation();

        const parts = findPinParts(index);
        const visiblePin = parts.visiblePin || pinElement;
        const originalPoint = {
            x: Number(visiblePin.getAttribute("cx")),
            y: Number(visiblePin.getAttribute("cy"))
        };

        activeDrag = {
            pointerId: event.pointerId,
            index: index,
            pinElement: visiblePin,
            hitArea: parts.hitArea,
            labelElement: findLabel(index),
            startClientX: event.clientX,
            startClientY: event.clientY,
            originalPoint: originalPoint,
            lastPoint: originalPoint,
            moved: false
        };

        suppressNextClick();
        visiblePin.style.cursor = "grabbing";

        /* SVG本体で捕捉し、指が小さなピンから外れてもドラッグを継続する。 */
        const svg = getSvg();
        if (svg && typeof svg.setPointerCapture === "function") {
            try { svg.setPointerCapture(event.pointerId); } catch (_) {}
        }
    }

    function handlePointerMove(event) {
        if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

        event.preventDefault();
        event.stopPropagation();

        const movement = Math.hypot(
            event.clientX - activeDrag.startClientX,
            event.clientY - activeDrag.startClientY
        );
        if (movement >= 2) activeDrag.moved = true;

        const point = getSvgPoint(event);
        if (!point) return;
        activeDrag.lastPoint = point;
        pendingPoint = point;

        if (!pendingFrame) {
            pendingFrame = requestAnimationFrame(function () {
                pendingFrame = 0;
                if (!activeDrag || !pendingPoint) return;
                const framePoint = pendingPoint;
                pendingPoint = null;
                moveVisual(activeDrag, framePoint);
                if (window.baikaTargetModel &&
                    typeof window.baikaTargetModel.updatePinPosition === "function") {
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
        if (activeDrag && activeDrag.pointerId === event.pointerId) {
            event.preventDefault();
            event.stopPropagation();

            if (pendingFrame) {
                cancelAnimationFrame(pendingFrame);
                pendingFrame = 0;
            }
            pendingPoint = null;

            const drag = activeDrag;
            activeDrag = null;
            drag.pinElement.style.cursor = "grab";

            if (drag.moved) {
                if (window.baikaTargetModel &&
                    typeof window.baikaTargetModel.finishPinPosition === "function") {
                    window.baikaTargetModel.finishPinPosition(
                        drag.index,
                        drag.lastPoint.x,
                        drag.lastPoint.y
                    );
                }
                suppressNextClick();
            } else {
                const svg = getSvg();
                if (!registerTap(event, drag.originalPoint) && svg) {
                    zoomAround(svg, drag.originalPoint.x, drag.originalPoint.y);
                }
                suppressNextClick();
            }
            return;
        }

        if (backgroundPointer && backgroundPointer.pointerId === event.pointerId) {
            const movement = Math.hypot(
                event.clientX - backgroundPointer.startX,
                event.clientY - backgroundPointer.startY
            );
            backgroundPointer = null;
            if (movement < 8) {
                const point = getSvgPoint(event);
                if (point && registerTap(event, point)) {
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
        }
    }

    function handleDoubleClick(event) {
        event.preventDefault();
        event.stopPropagation();
        resetZoom();
    }

    function bind() {
        const svg = getSvg();
        if (!svg || svg.dataset.targetEngineBound) return;
        svg.dataset.targetEngineBound = "true";
        svg.style.touchAction = "none";
        svg.style.webkitUserSelect = "none";
        svg.style.userSelect = "none";
        svg.style.webkitTouchCallout = "none";

        svg.addEventListener("pointerdown", handlePointerDown);
        svg.addEventListener("pointermove", handlePointerMove);
        svg.addEventListener("pointerup", finishPointer);
        svg.addEventListener("pointercancel", finishPointer);
        svg.addEventListener("dblclick", handleDoubleClick, true);
    }

    document.addEventListener("DOMContentLoaded", bind);
    window.addEventListener("load", bind);
})();
