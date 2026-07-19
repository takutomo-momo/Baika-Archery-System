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
            consumeSuppressedClick
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
        const size = 100;
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
        const initialPoint = getSvgPoint(event);

        if (
            svg &&
            initialPoint &&
            shouldZoomForFineAdjustment()
        ) {
            zoomAroundPin(
                svg,
                initialPoint.x,
                initialPoint.y
            );
        }

        const pinParts =
            findPinParts(index);

        activeDrag = {
            pointerId: event.pointerId,
            index: index,
            pinElement:
                pinParts.visiblePin ||
                pinElement,
            hitArea:
                pinParts.hitArea,
            labelElement: findLabel(index),
            startClientX: event.clientX,
            startClientY: event.clientY,
            lastPoint: initialPoint,
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

        moveVisual(
            activeDrag.pinElement,
            activeDrag.labelElement,
            point
        );

        if (
            window.baikaTargetModel &&
            typeof window.baikaTargetModel
                .updatePinPosition === "function"
        ) {
            window.baikaTargetModel
                .updatePinPosition(
                    activeDrag.index,
                    point.x,
                    point.y
                );
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

        const point =
            getSvgPoint(event) ||
            activeDrag.lastPoint;
        const finishedDrag = activeDrag;

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
         * SVG全体のtouch-actionは変更しない。
         * ピンク丸を掴んだ場合だけTarget Engineが処理し、
         * それ以外は既存の的タップ・ズームへ渡す。
         */

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
