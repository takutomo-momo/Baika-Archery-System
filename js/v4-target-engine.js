"use strict";

/*
 * Baika Archery System Ver4
 * Gesture Engine v2 - Input Target
 *
 * 1本指（ピン上）: ピン移動
 * 1本指（背景）: 的の移動／短いタップ
 * 2本指: ピンチズーム＋2本指パン
 * ダブルタップ: 全体表示へ戻す
 */

(function () {
    const SVG_SIZE = 300;
    const MIN_VIEW_SIZE = 50;   // 600%
    const MAX_VIEW_SIZE = 300;  // 100%
    const MOVE_THRESHOLD = 5;
    const DOUBLE_TAP_DELAY = 300;

    let pointers = new Map();
    let gesture = null;
    let suppressClickUntil = 0;
    let singleTapTimer = 0;
    let lastTap = null;
    let renderFrame = 0;
    let pendingViewBox = null;
    let selectedPinIndex = null;
    let nudgeHoldTimer = 0;
    let nudgeRepeatTimer = 0;

    function scheduleViewBox(svg, box) {
        pendingViewBox = box;
        if (renderFrame) return;
        renderFrame = requestAnimationFrame(function () {
            renderFrame = 0;
            if (!pendingViewBox) return;
            const next = pendingViewBox;
            pendingViewBox = null;
            setViewBox(svg, next);
        });
    }

    function getSvg() {
        return document.getElementById("targetSvg");
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function getViewBox(svg) {
        const box = svg.viewBox.baseVal;
        return {
            x: box.x,
            y: box.y,
            width: box.width || SVG_SIZE,
            height: box.height || SVG_SIZE
        };
    }

    function setViewBox(svg, box) {
        const width = clamp(box.width, MIN_VIEW_SIZE, MAX_VIEW_SIZE);
        const height = width;
        const maxX = SVG_SIZE - width;
        const maxY = SVG_SIZE - height;
        const x = clamp(box.x, 0, Math.max(0, maxX));
        const y = clamp(box.y, 0, Math.max(0, maxY));
        svg.setAttribute("viewBox", `${x} ${y} ${width} ${height}`);
        window.isZoomed = width < MAX_VIEW_SIZE - 0.5;
    }

    function resetView() {
        const svg = getSvg();
        if (!svg) return;
        setViewBox(svg, { x: 0, y: 0, width: 300, height: 300 });
        if (typeof window.resetTargetZoom === "function") {
            // resetTargetZoomはピン再描画も行う。再帰を避けるためviewBox設定後に呼ぶ。
            window.isZoomed = false;
            window.zoomCenter = { x: 150, y: 150 };
            if (typeof window.renderTargetPins === "function") {
                window.renderTargetPins();
            }
            if (typeof window.renderGroupingPins === "function") {
                window.renderGroupingPins();
            }
        }
    }

    function clientToSvg(svg, clientX, clientY) {
        const rect = svg.getBoundingClientRect();
        const box = getViewBox(svg);
        return {
            x: box.x + ((clientX - rect.left) / rect.width) * box.width,
            y: box.y + ((clientY - rect.top) / rect.height) * box.height
        };
    }

    function findPinElement(target) {
        return target instanceof Element
            ? target.closest("[data-target-pin-index]")
            : null;
    }

    function findPinParts(index) {
        const svg = getSvg();
        const matches = svg
            ? svg.querySelectorAll(`[data-target-pin-index="${index}"]`)
            : [];
        let hitArea = null;
        let visiblePin = null;
        matches.forEach(function (element) {
            const radius = Number(element.getAttribute("r"));
            if (radius >= 10) hitArea = element;
            else visiblePin = element;
        });
        return { hitArea, visiblePin };
    }

    function findLabel(index) {
        const svg = getSvg();
        return svg
            ? svg.querySelector(`[data-target-pin-label-index="${index}"]`)
            : null;
    }

    function movePinVisual(index, point) {
        const parts = findPinParts(index);
        [parts.hitArea, parts.visiblePin].forEach(function (element) {
            if (!element) return;
            element.setAttribute("cx", String(point.x));
            element.setAttribute("cy", String(point.y));
        });
        const label = findLabel(index);
        if (label) {
            label.setAttribute("x", String(point.x + 5));
            label.setAttribute("y", String(point.y + 3));
        }
    }

    function clearPinSelection() {
        selectedPinIndex = null;
        applyPinSelection();
        updateAdjustmentPanel();
    }

    function applyPinSelection() {
        const svg = getSvg();
        if (!svg) return;

        svg.querySelectorAll("[data-target-pin-index]").forEach(function (element) {
            const index = Number(element.getAttribute("data-target-pin-index"));
            const radius = Number(element.getAttribute("r"));
            const isSelected = index === selectedPinIndex;

            if (radius < 10) {
                element.setAttribute("stroke", isSelected ? "#111827" : "#ffffff");
                element.setAttribute("stroke-width", isSelected ? "2.5" : "1");
                element.setAttribute("r", isSelected ? "6.5" : "5");
            }
        });
    }

    function updateAdjustmentPanel() {
        const panel = document.getElementById("v4PinAdjustPanel");
        const status = document.getElementById("v4PinAdjustStatus");
        if (!panel || !status) return;

        const hasSelection = Number.isInteger(selectedPinIndex);
        panel.classList.toggle("is-active", hasSelection);
        const availablePinIndexes = new Set();
        if (getSvg()) {
            getSvg().querySelectorAll("[data-target-pin-index]").forEach(function (element) {
                const index = Number(element.getAttribute("data-target-pin-index"));
                if (Number.isInteger(index)) availablePinIndexes.add(index);
            });
        }
        const availablePins = availablePinIndexes.size;

        if (hasSelection && !availablePinIndexes.has(selectedPinIndex)) {
            selectedPinIndex = null;
        }
        const selectionStillActive = Number.isInteger(selectedPinIndex);
        panel.classList.toggle("is-active", selectionStillActive);
        panel.querySelectorAll("[data-pin-nudge]").forEach(function (button) {
            button.disabled = !selectionStillActive;
        });

        status.textContent = selectionStillActive
            ? `ピン ${selectedPinIndex + 1} を選択中`
            : (availablePins > 0 ? "入力的のピンをタップして選択" : "写真からピンを入力してください");
    }

    function selectPin(index) {
        if (!Number.isInteger(index)) return;
        selectedPinIndex = index;
        applyPinSelection();
        updateAdjustmentPanel();
        window.dispatchEvent(new CustomEvent("baika:target-pin-selected", {
            detail: { index: index }
        }));
    }

    function getNudgeStep() {
        const checked = document.querySelector('input[name="v4PinAdjustStep"]:checked');
        return checked ? Number(checked.value) || 1 : 1;
    }

    function nudgeSelectedPin(dx, dy) {
        if (!Number.isInteger(selectedPinIndex)) return false;
        const parts = findPinParts(selectedPinIndex);
        const visiblePin = parts.visiblePin;
        if (!visiblePin) return false;

        const step = getNudgeStep();
        const point = {
            x: clamp(Number(visiblePin.getAttribute("cx")) + dx * step, 0, SVG_SIZE),
            y: clamp(Number(visiblePin.getAttribute("cy")) + dy * step, 0, SVG_SIZE)
        };

        movePinVisual(selectedPinIndex, point);
        if (window.baikaTargetModel && typeof window.baikaTargetModel.finishPinPosition === "function") {
            window.baikaTargetModel.finishPinPosition(selectedPinIndex, point.x, point.y);
        }
        requestAnimationFrame(applyPinSelection);
        return true;
    }

    function stopNudgeRepeat() {
        clearTimeout(nudgeHoldTimer);
        clearInterval(nudgeRepeatTimer);
        nudgeHoldTimer = 0;
        nudgeRepeatTimer = 0;
    }

    function startNudge(button) {
        const dx = Number(button.dataset.dx || 0);
        const dy = Number(button.dataset.dy || 0);
        nudgeSelectedPin(dx, dy);
        stopNudgeRepeat();
        nudgeHoldTimer = window.setTimeout(function () {
            nudgeRepeatTimer = window.setInterval(function () {
                nudgeSelectedPin(dx, dy);
            }, 55);
        }, 300);
    }

    function bindAdjustmentPanel() {
        const panel = document.getElementById("v4PinAdjustPanel");
        if (!panel || panel.dataset.bound) return;
        panel.dataset.bound = "true";

        panel.querySelectorAll("[data-pin-nudge]").forEach(function (button) {
            button.addEventListener("pointerdown", function (event) {
                event.preventDefault();
                startNudge(button);
            });
            ["pointerup", "pointercancel", "pointerleave", "lostpointercapture"].forEach(function (name) {
                button.addEventListener(name, stopNudgeRepeat);
            });
        });

        const clearButton = document.getElementById("v4PinAdjustDone");
        if (clearButton) clearButton.addEventListener("click", clearPinSelection);
        updateAdjustmentPanel();
    }

    function pointerRecord(event) {
        return {
            id: event.pointerId,
            clientX: event.clientX,
            clientY: event.clientY
        };
    }

    function firstTwoPointers() {
        const values = Array.from(pointers.values());
        return values.length >= 2 ? [values[0], values[1]] : null;
    }

    function centerOf(a, b) {
        return {
            x: (a.clientX + b.clientX) / 2,
            y: (a.clientY + b.clientY) / 2
        };
    }

    function distanceOf(a, b) {
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function beginPinch(svg) {
        if (pendingViewBox) {
            const next = pendingViewBox;
            pendingViewBox = null;
            setViewBox(svg, next);
        }
        const pair = firstTwoPointers();
        if (!pair) return;
        const center = centerOf(pair[0], pair[1]);
        gesture = {
            mode: "pinch",
            moved: true,
            startDistance: Math.max(1, distanceOf(pair[0], pair[1])),
            startCenter: center,
            startBox: getViewBox(svg),
            anchor: clientToSvg(svg, center.x, center.y)
        };
        suppressNextClick();
    }

    function updatePinch(svg) {
        const pair = firstTwoPointers();
        if (!pair || !gesture || gesture.mode !== "pinch") return;
        const center = centerOf(pair[0], pair[1]);
        const ratio = distanceOf(pair[0], pair[1]) / gesture.startDistance;
        const width = clamp(gesture.startBox.width / ratio, MIN_VIEW_SIZE, MAX_VIEW_SIZE);
        const rect = svg.getBoundingClientRect();
        const fx = (center.x - rect.left) / rect.width;
        const fy = (center.y - rect.top) / rect.height;
        scheduleViewBox(svg, {
            x: gesture.anchor.x - fx * width,
            y: gesture.anchor.y - fy * width,
            width,
            height: width
        });
    }

    function beginBackgroundPan(svg, event) {
        if (pendingViewBox) {
            const next = pendingViewBox;
            pendingViewBox = null;
            setViewBox(svg, next);
        }
        gesture = {
            mode: "background",
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            lastClientX: event.clientX,
            lastClientY: event.clientY,
            startBox: getViewBox(svg),
            moved: false
        };
    }

    function updateBackgroundPan(svg, event) {
        if (!gesture || gesture.mode !== "background") return;
        const dx = event.clientX - gesture.startClientX;
        const dy = event.clientY - gesture.startClientY;
        if (Math.hypot(dx, dy) >= MOVE_THRESHOLD) {
            gesture.moved = true;
            suppressNextClick();
        }
        if (!gesture.moved) return;
        const rect = svg.getBoundingClientRect();
        const box = gesture.startBox;
        scheduleViewBox(svg, {
            x: box.x - dx * box.width / rect.width,
            y: box.y - dy * box.height / rect.height,
            width: box.width,
            height: box.height
        });
    }

    function beginPinSelection(event, pinElement) {
        const index = Number(pinElement.getAttribute("data-target-pin-index"));
        if (!Number.isInteger(index)) return false;
        selectPin(index);
        gesture = {
            mode: "pin-select",
            pointerId: event.pointerId,
            moved: false
        };
        suppressNextClick();
        return true;
    }

    function updatePinDrag(svg, event) {
        if (!gesture || gesture.mode !== "pin") return;
        const movement = Math.hypot(
            event.clientX - gesture.startClientX,
            event.clientY - gesture.startClientY
        );
        if (movement >= 2) gesture.moved = true;
        const raw = clientToSvg(svg, event.clientX, event.clientY);
        const point = {
            x: clamp(raw.x, 0, SVG_SIZE),
            y: clamp(raw.y, 0, SVG_SIZE)
        };
        gesture.lastPoint = point;
        if (renderFrame) return;
        renderFrame = requestAnimationFrame(function () {
            renderFrame = 0;
            if (!gesture || gesture.mode !== "pin" || !gesture.lastPoint) return;
            const latest = gesture.lastPoint;
            movePinVisual(gesture.index, latest);
            if (window.baikaTargetModel && typeof window.baikaTargetModel.updatePinPosition === "function") {
                window.baikaTargetModel.updatePinPosition(gesture.index, latest.x, latest.y);
            }
        });
    }

    function finishPinDrag() {
        if (!gesture || gesture.mode !== "pin") return;
        const finished = gesture;
        const point = finished.lastPoint || finished.original;
        if (window.baikaTargetModel && typeof window.baikaTargetModel.finishPinPosition === "function") {
            window.baikaTargetModel.finishPinPosition(finished.index, point.x, point.y);
        }
    }

    function suppressNextClick() {
        suppressClickUntil = Date.now() + 500;
    }

    function consumeSuppressedClick() {
        if (Date.now() <= suppressClickUntil) {
            suppressClickUntil = 0;
            return true;
        }
        return false;
    }

    function handleTap(svg, event) {
        const now = Date.now();
        const isDouble = lastTap &&
            now - lastTap.time <= DOUBLE_TAP_DELAY &&
            Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <= 28;

        if (isDouble) {
            clearTimeout(singleTapTimer);
            singleTapTimer = 0;
            lastTap = null;
            resetView();
            suppressNextClick();
            return;
        }

        lastTap = { time: now, x: event.clientX, y: event.clientY };
        clearTimeout(singleTapTimer);
        singleTapTimer = window.setTimeout(function () {
            singleTapTimer = 0;
            lastTap = null;
            if (typeof window.handleTargetClick === "function") {
                window.handleTargetClick({
                    clientX: event.clientX,
                    clientY: event.clientY,
                    target: svg
                });
                suppressNextClick();
            }
        }, DOUBLE_TAP_DELAY + 20);
    }

    function handlePointerDown(event) {
        const svg = getSvg();
        if (!svg || (event.pointerType === "mouse" && event.button !== 0)) return;

        const pin = findPinElement(event.target);
        if (!pin) return;

        event.preventDefault();
        event.stopPropagation();
        beginPinSelection(event, pin);
    }

    function handlePointerMove(event) {
        /* Step65-1: 入力的のパン・ピンチズーム・背景タップは使用しない。 */
    }

    function handlePointerEnd(event) {
        if (gesture && gesture.mode === "pin-select") {
            gesture = null;
        }
    }

    function bind() {
        const svg = getSvg();
        if (!svg || svg.dataset.gestureEngineV2Bound) return;
        svg.dataset.gestureEngineV2Bound = "true";
        svg.style.touchAction = "manipulation";
        svg.style.webkitUserSelect = "none";
        svg.style.userSelect = "none";
        svg.addEventListener("pointerdown", handlePointerDown);
        svg.addEventListener("pointermove", handlePointerMove);
        svg.addEventListener("pointerup", handlePointerEnd);
        svg.addEventListener("pointercancel", handlePointerEnd);
        svg.addEventListener("lostpointercapture", handlePointerEnd);
        bindAdjustmentPanel();

        const observer = new MutationObserver(function () {
            requestAnimationFrame(function () {
                if (Number.isInteger(selectedPinIndex)) applyPinSelection();
                updateAdjustmentPanel();
            });
        });
        const pinsGroup = document.getElementById("pinsGroup");
        if (pinsGroup) observer.observe(pinsGroup, { childList: true });
    }

    window.baikaTargetGesture = {
        consumeSuppressedClick,
        resetFineAdjustment: resetView,
        selectPin: selectPin,
        clearPinSelection: clearPinSelection,
        nudgeSelectedPin: nudgeSelectedPin
    };

    document.addEventListener("DOMContentLoaded", bind);
    window.addEventListener("load", bind);
})();
