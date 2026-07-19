"use strict";

/*
 * Baika Archery System Ver4
 * Photo Engine
 *
 * 対応:
 * ・Pointer Eventsによるマウス／タッチ／ペン統一
 * ・1本指パン
 * ・2本指ピンチズーム＋2本指パン
 * ・ダブルタップ／ダブルクリックで100%
 * ・ホイールズーム
 * ・90度回転
 * ・枠外制御
 * ・画像座標と画面座標の相互変換
 */

(function (global) {
    const DEFAULT_OPTIONS = {
        minScale: 1,
        maxScale: 6,
        zoomStep: 0.2,
        wheelZoomStep: 0.12,
        doubleTapDelay: 320,
        tapMoveLimit: 12
    };

    class BaikaPhotoEngine {
        constructor(viewer, image, options = {}) {
            if (!(viewer instanceof HTMLElement)) {
                throw new Error("Photo Engine: viewerが見つかりません。");
            }

            if (!(image instanceof HTMLImageElement)) {
                throw new Error("Photo Engine: imageが見つかりません。");
            }

            this.viewer = viewer;
            this.image = image;
            this.options = {
                ...DEFAULT_OPTIONS,
                ...options
            };

            this.state = {
                loaded: false,
                scale: 1,
                rotation: 0,
                x: 0,
                y: 0,
                gestureMode: "idle"
            };

            this.pointers = new Map();

            this.gesture = {
                startScale: 1,
                startX: 0,
                startY: 0,
                startDistance: 0,
                startCenter: { x: 0, y: 0 },
                anchorImagePoint: { x: 0, y: 0 },
                tapStart: null,
                moved: false,
                wasMultiTouch: false
            };

            this.lastTapTime = 0;
            this.resizeObserver = null;

            this.handlePointerDown =
                this.handlePointerDown.bind(this);
            this.handlePointerMove =
                this.handlePointerMove.bind(this);
            this.handlePointerEnd =
                this.handlePointerEnd.bind(this);
            this.handleWheel =
                this.handleWheel.bind(this);
            this.handleDoubleClick =
                this.handleDoubleClick.bind(this);
            this.handleImageLoad =
                this.handleImageLoad.bind(this);
            this.handleResize =
                this.handleResize.bind(this);

            this.initialize();
        }

        initialize() {
            this.viewer.style.touchAction = "none";

            this.viewer.addEventListener(
                "pointerdown",
                this.handlePointerDown
            );
            this.viewer.addEventListener(
                "pointermove",
                this.handlePointerMove
            );
            this.viewer.addEventListener(
                "pointerup",
                this.handlePointerEnd
            );
            this.viewer.addEventListener(
                "pointercancel",
                this.handlePointerEnd
            );
            this.viewer.addEventListener(
                "lostpointercapture",
                this.handlePointerEnd
            );
            this.viewer.addEventListener(
                "wheel",
                this.handleWheel,
                { passive: false }
            );
            this.viewer.addEventListener(
                "dblclick",
                this.handleDoubleClick
            );

            this.image.addEventListener(
                "load",
                this.handleImageLoad
            );

            if ("ResizeObserver" in global) {
                this.resizeObserver =
                    new ResizeObserver(this.handleResize);
                this.resizeObserver.observe(this.viewer);
            } else {
                global.addEventListener(
                    "resize",
                    this.handleResize
                );
            }

            if (
                this.image.complete &&
                this.image.naturalWidth > 0
            ) {
                this.handleImageLoad();
            }

            this.applyTransform();
        }

        destroy() {
            this.viewer.removeEventListener(
                "pointerdown",
                this.handlePointerDown
            );
            this.viewer.removeEventListener(
                "pointermove",
                this.handlePointerMove
            );
            this.viewer.removeEventListener(
                "pointerup",
                this.handlePointerEnd
            );
            this.viewer.removeEventListener(
                "pointercancel",
                this.handlePointerEnd
            );
            this.viewer.removeEventListener(
                "lostpointercapture",
                this.handlePointerEnd
            );
            this.viewer.removeEventListener(
                "wheel",
                this.handleWheel
            );
            this.viewer.removeEventListener(
                "dblclick",
                this.handleDoubleClick
            );
            this.image.removeEventListener(
                "load",
                this.handleImageLoad
            );

            if (this.resizeObserver) {
                this.resizeObserver.disconnect();
            } else {
                global.removeEventListener(
                    "resize",
                    this.handleResize
                );
            }

            this.pointers.clear();
        }

        setLoaded(loaded) {
            this.state.loaded = Boolean(loaded);

            if (!this.state.loaded) {
                this.pointers.clear();
                this.reset();
            }
        }

        handleImageLoad() {
            this.state.loaded =
                this.image.naturalWidth > 0 &&
                this.image.naturalHeight > 0;

            this.reset();
            this.dispatchStateChange();
        }

        handleResize() {
            if (!this.state.loaded) {
                return;
            }

            this.constrainPosition();
            this.applyTransform();
        }

        handlePointerDown(event) {
            if (!this.state.loaded) {
                return;
            }

            /*
             * Step56-1:
             * 写真上の着弾ピンを操作している間は、写真本体の
             * パン／ピンチ処理へ同じPointerEventを渡さない。
             * iPhone SafariではstopPropagationだけでは写真側が
             * 反応する場合があるため、エンジン側でも明示的に遮断する。
             */
            if (
                global.baikaPhotoPinDragging === true ||
                (
                    event.target instanceof Element &&
                    event.target.closest(
                        '[data-baika-photo-pin="true"]'
                    )
                )
            ) {
                return;
            }

            if (
                event.pointerType === "mouse" &&
                event.button !== 0
            ) {
                return;
            }

            event.preventDefault();

            this.pointers.set(
                event.pointerId,
                this.createPointerRecord(event)
            );

            try {
                this.viewer.setPointerCapture(event.pointerId);
            } catch (error) {
                // Safari等で取得できない場合も操作は継続する。
            }

            if (this.pointers.size === 1) {
                this.beginPan(event);
            } else if (this.pointers.size >= 2) {
                this.beginPinch();
            }

            this.viewer.classList.add("is-dragging");
        }

        handlePointerMove(event) {
            if (global.baikaPhotoPinDragging === true) {
                return;
            }

            if (
                !this.state.loaded ||
                !this.pointers.has(event.pointerId)
            ) {
                return;
            }

            event.preventDefault();

            this.pointers.set(
                event.pointerId,
                this.createPointerRecord(event)
            );

            if (this.pointers.size >= 2) {
                if (this.state.gestureMode !== "pinch-pan") {
                    this.beginPinch();
                }

                this.updatePinch();
                return;
            }

            if (
                this.pointers.size === 1 &&
                this.state.gestureMode === "pan"
            ) {
                this.updatePan();
            }
        }

        handlePointerEnd(event) {
            if (!this.pointers.has(event.pointerId)) {
                return;
            }

            event.preventDefault();

            const endedPointer =
                this.pointers.get(event.pointerId);

            this.pointers.delete(event.pointerId);

            try {
                if (
                    this.viewer.hasPointerCapture(event.pointerId)
                ) {
                    this.viewer.releasePointerCapture(
                        event.pointerId
                    );
                }
            } catch (error) {
                // Pointer Capture未対応時は無視する。
            }

            if (this.pointers.size >= 2) {
                this.beginPinch();
                return;
            }

            if (this.pointers.size === 1) {
                const remaining =
                    Array.from(this.pointers.values())[0];

                this.state.gestureMode = "pan";
                this.gesture.startX = this.state.x;
                this.gesture.startY = this.state.y;
                this.gesture.tapStart = {
                    x: remaining.clientX,
                    y: remaining.clientY
                };
                this.gesture.moved = true;
                return;
            }

            this.viewer.classList.remove("is-dragging");
            this.state.gestureMode = "idle";

            this.detectDoubleTap(endedPointer);

            this.gesture.tapStart = null;
            this.gesture.moved = false;
            this.gesture.wasMultiTouch = false;
        }

        beginPan(event) {
            this.state.gestureMode = "pan";
            this.gesture.startX = this.state.x;
            this.gesture.startY = this.state.y;
            this.gesture.tapStart = {
                x: event.clientX,
                y: event.clientY
            };
            this.gesture.moved = false;
            this.gesture.wasMultiTouch = false;
        }

        updatePan() {
            const pointer =
                Array.from(this.pointers.values())[0];

            if (!pointer || !this.gesture.tapStart) {
                return;
            }

            const deltaX =
                pointer.clientX -
                this.gesture.tapStart.x;
            const deltaY =
                pointer.clientY -
                this.gesture.tapStart.y;

            if (
                Math.hypot(deltaX, deltaY) >
                this.options.tapMoveLimit
            ) {
                this.gesture.moved = true;
            }

            this.state.x =
                this.gesture.startX + deltaX;
            this.state.y =
                this.gesture.startY + deltaY;

            this.constrainPosition();
            this.applyTransform();
        }

        beginPinch() {
            const pair = this.getFirstTwoPointers();

            if (!pair) {
                return;
            }

            const [first, second] = pair;
            const center =
                this.getPointerCenter(first, second);

            this.state.gestureMode = "pinch-pan";
            this.gesture.wasMultiTouch = true;
            this.gesture.moved = true;
            this.gesture.startScale = this.state.scale;
            this.gesture.startDistance =
                this.getPointerDistance(first, second);
            this.gesture.startCenter = center;
            this.gesture.anchorImagePoint =
                this.screenToImagePoint(
                    center.x,
                    center.y
                );
        }

        updatePinch() {
            const pair = this.getFirstTwoPointers();

            if (
                !pair ||
                this.gesture.startDistance <= 0
            ) {
                return;
            }

            const [first, second] = pair;
            const currentDistance =
                this.getPointerDistance(first, second);
            const currentCenter =
                this.getPointerCenter(first, second);

            const nextScale = this.clamp(
                this.gesture.startScale *
                (
                    currentDistance /
                    this.gesture.startDistance
                ),
                this.options.minScale,
                this.options.maxScale
            );

            this.state.scale = nextScale;

            const projected =
                this.imageToScreenPoint(
                    this.gesture.anchorImagePoint.x,
                    this.gesture.anchorImagePoint.y
                );

            this.state.x +=
                currentCenter.x - projected.x;
            this.state.y +=
                currentCenter.y - projected.y;

            this.constrainPosition();
            this.applyTransform();
        }

        detectDoubleTap(endedPointer) {
            if (
                !endedPointer ||
                this.gesture.moved ||
                this.gesture.wasMultiTouch
            ) {
                this.lastTapTime = 0;
                return;
            }

            const now = Date.now();

            if (
                now - this.lastTapTime <=
                this.options.doubleTapDelay
            ) {
                this.reset();
                this.lastTapTime = 0;
            } else {
                this.lastTapTime = now;
            }
        }

        handleWheel(event) {
            if (!this.state.loaded) {
                return;
            }

            event.preventDefault();

            const factor =
                event.deltaY < 0
                    ? 1 + this.options.wheelZoomStep
                    : 1 - this.options.wheelZoomStep;

            this.zoomAt(
                this.state.scale * factor,
                event.clientX,
                event.clientY
            );
        }

        handleDoubleClick(event) {
            if (!this.state.loaded) {
                return;
            }

            event.preventDefault();
            this.reset();
        }

        zoomBy(amount) {
            const rect =
                this.viewer.getBoundingClientRect();

            this.zoomAt(
                this.state.scale + amount,
                rect.left + rect.width / 2,
                rect.top + rect.height / 2
            );
        }

        zoomAt(scale, clientX, clientY) {
            if (!this.state.loaded) {
                return;
            }

            const anchor =
                this.screenToImagePoint(clientX, clientY);

            this.state.scale = this.clamp(
                scale,
                this.options.minScale,
                this.options.maxScale
            );

            const projected =
                this.imageToScreenPoint(anchor.x, anchor.y);

            this.state.x += clientX - projected.x;
            this.state.y += clientY - projected.y;

            this.constrainPosition();
            this.applyTransform();
        }

        rotate(degrees) {
            if (!this.state.loaded) {
                return;
            }

            this.state.rotation =
                this.normalizeRotation(
                    this.state.rotation + degrees
                );

            this.state.x = 0;
            this.state.y = 0;

            this.constrainPosition();
            this.applyTransform();
        }

        reset() {
            this.state.scale = 1;
            this.state.rotation = 0;
            this.state.x = 0;
            this.state.y = 0;
            this.state.gestureMode = "idle";

            this.pointers.clear();
            this.viewer.classList.remove("is-dragging");

            this.applyTransform();
        }

        applyTransform() {
            this.image.style.transform = [
                "translate(-50%, -50%)",
                `translate3d(${this.state.x}px, ${this.state.y}px, 0)`,
                `rotate(${this.state.rotation}deg)`,
                `scale(${this.state.scale})`
            ].join(" ");

            this.dispatchStateChange();
        }

        constrainPosition() {
            const bounds =
                this.getDisplayBounds();

            if (!bounds) {
                this.state.x = 0;
                this.state.y = 0;
                return;
            }

            const maxX = Math.max(
                0,
                (bounds.width - bounds.viewportWidth) / 2
            );
            const maxY = Math.max(
                0,
                (bounds.height - bounds.viewportHeight) / 2
            );

            this.state.x = this.clamp(
                this.state.x,
                -maxX,
                maxX
            );
            this.state.y = this.clamp(
                this.state.y,
                -maxY,
                maxY
            );
        }

        getDisplayBounds() {
            if (
                !this.state.loaded ||
                !this.image.naturalWidth ||
                !this.image.naturalHeight
            ) {
                return null;
            }

            const viewportWidth =
                this.viewer.clientWidth;
            const viewportHeight =
                this.viewer.clientHeight;

            if (!viewportWidth || !viewportHeight) {
                return null;
            }

            const fitted =
                this.getFittedImageSize();

            const quarterTurn =
                this.state.rotation === 90 ||
                this.state.rotation === 270;

            return {
                viewportWidth,
                viewportHeight,
                width:
                    (
                        quarterTurn
                            ? fitted.height
                            : fitted.width
                    ) * this.state.scale,
                height:
                    (
                        quarterTurn
                            ? fitted.width
                            : fitted.height
                    ) * this.state.scale
            };
        }

        getFittedImageSize() {
            const viewportWidth =
                this.viewer.clientWidth;
            const viewportHeight =
                this.viewer.clientHeight;

            const imageRatio =
                this.image.naturalWidth /
                this.image.naturalHeight;
            const viewportRatio =
                viewportWidth /
                viewportHeight;

            if (imageRatio > viewportRatio) {
                return {
                    width: viewportWidth,
                    height: viewportWidth / imageRatio
                };
            }

            return {
                width: viewportHeight * imageRatio,
                height: viewportHeight
            };
        }

        screenToImagePoint(clientX, clientY) {
            if (!this.state.loaded) {
                return { x: 0, y: 0 };
            }

            const rect =
                this.viewer.getBoundingClientRect();
            const fitted =
                this.getFittedImageSize();

            let localX =
                clientX -
                (rect.left + rect.width / 2) -
                this.state.x;
            let localY =
                clientY -
                (rect.top + rect.height / 2) -
                this.state.y;

            const radians =
                -this.state.rotation * Math.PI / 180;
            const rotatedX =
                localX * Math.cos(radians) -
                localY * Math.sin(radians);
            const rotatedY =
                localX * Math.sin(radians) +
                localY * Math.cos(radians);

            localX = rotatedX / this.state.scale;
            localY = rotatedY / this.state.scale;

            return {
                x:
                    (
                        localX / fitted.width + 0.5
                    ) * this.image.naturalWidth,
                y:
                    (
                        localY / fitted.height + 0.5
                    ) * this.image.naturalHeight
            };
        }

        imageToScreenPoint(imageX, imageY) {
            if (!this.state.loaded) {
                return { x: 0, y: 0 };
            }

            const rect =
                this.viewer.getBoundingClientRect();
            const fitted =
                this.getFittedImageSize();

            let localX =
                (
                    imageX / this.image.naturalWidth -
                    0.5
                ) * fitted.width;
            let localY =
                (
                    imageY / this.image.naturalHeight -
                    0.5
                ) * fitted.height;

            localX *= this.state.scale;
            localY *= this.state.scale;

            const radians =
                this.state.rotation * Math.PI / 180;
            const rotatedX =
                localX * Math.cos(radians) -
                localY * Math.sin(radians);
            const rotatedY =
                localX * Math.sin(radians) +
                localY * Math.cos(radians);

            return {
                x:
                    rect.left +
                    rect.width / 2 +
                    this.state.x +
                    rotatedX,
                y:
                    rect.top +
                    rect.height / 2 +
                    this.state.y +
                    rotatedY
            };
        }

        getState() {
            return {
                loaded: this.state.loaded,
                scale: this.state.scale,
                rotation: this.state.rotation,
                x: this.state.x,
                y: this.state.y,
                naturalWidth: this.image.naturalWidth || 0,
                naturalHeight: this.image.naturalHeight || 0
            };
        }

        dispatchStateChange() {
            this.viewer.dispatchEvent(
                new CustomEvent(
                    "baika-photo-statechange",
                    {
                        detail: this.getState()
                    }
                )
            );
        }

        createPointerRecord(event) {
            return {
                pointerId: event.pointerId,
                pointerType: event.pointerType,
                clientX: event.clientX,
                clientY: event.clientY
            };
        }

        getFirstTwoPointers() {
            const values =
                Array.from(this.pointers.values());

            if (values.length < 2) {
                return null;
            }

            return [values[0], values[1]];
        }

        getPointerDistance(first, second) {
            return Math.hypot(
                second.clientX - first.clientX,
                second.clientY - first.clientY
            );
        }

        getPointerCenter(first, second) {
            return {
                x:
                    (
                        first.clientX +
                        second.clientX
                    ) / 2,
                y:
                    (
                        first.clientY +
                        second.clientY
                    ) / 2
            };
        }

        normalizeRotation(rotation) {
            return ((rotation % 360) + 360) % 360;
        }

        clamp(value, minimum, maximum) {
            return Math.min(
                maximum,
                Math.max(minimum, value)
            );
        }
    }

    global.BaikaPhotoEngine = BaikaPhotoEngine;
})(window);
