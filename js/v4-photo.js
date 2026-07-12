"use strict";

/*
 * Baika Archery System Ver4
 * 的写真表示・操作機能
 *
 * ・写真選択
 * ・写真削除
 * ・拡大・縮小
 * ・回転
 * ・ドラッグ移動
 * ・マウスホイールズーム
 */

let currentTargetPhotoUrl = "";

let targetPhotoScale = 1;
let targetPhotoRotation = 0;
let targetPhotoTranslateX = 0;
let targetPhotoTranslateY = 0;

let isTargetPhotoDragging = false;
let targetPhotoDragStartX = 0;
let targetPhotoDragStartY = 0;
let targetPhotoDragOriginX = 0;
let targetPhotoDragOriginY = 0;

let activePhotoPointers = new Map();

let targetPhotoPinchStartDistance = 0;
let targetPhotoPinchStartScale = 1;

let targetPhotoPinchStartCenterX = 0;
let targetPhotoPinchStartCenterY = 0;

let targetPhotoPinchOriginX = 0;
let targetPhotoPinchOriginY = 0;

let isTargetPhotoPinching = false;

document.addEventListener("DOMContentLoaded", function () {
    initializeTargetPhotoViewer();
});

/**
 * 撮影した的の写真表示と操作を初期化する
 */
function initializeTargetPhotoViewer() {
    const photoInput =
        document.getElementById(
            "v4TargetPhotoInput"
        );

    const clearButton =
        document.getElementById(
            "v4TargetPhotoClear"
        );

    const zoomInButton =
        document.getElementById(
            "v4PhotoZoomIn"
        );

    const zoomOutButton =
        document.getElementById(
            "v4PhotoZoomOut"
        );

    const zoomResetButton =
        document.getElementById(
            "v4PhotoZoomReset"
        );

    const rotateLeftButton =
        document.getElementById(
            "v4PhotoRotateLeft"
        );

    const rotateRightButton =
        document.getElementById(
            "v4PhotoRotateRight"
        );

    const viewer =
        document.getElementById(
            "v4TargetPhotoViewer"
        );

    if (photoInput) {
        photoInput.addEventListener(
            "change",
            handleTargetPhotoSelection
        );
    }

    if (clearButton) {
        clearButton.addEventListener(
            "click",
            clearTargetPhoto
        );
    }

    if (zoomInButton) {
        zoomInButton.addEventListener(
            "click",
            function () {
                changeTargetPhotoZoom(0.2);
            }
        );
    }

    if (zoomOutButton) {
        zoomOutButton.addEventListener(
            "click",
            function () {
                changeTargetPhotoZoom(-0.2);
            }
        );
    }

    if (zoomResetButton) {
        zoomResetButton.addEventListener(
            "click",
            resetTargetPhotoTransform
        );
    }

    if (rotateLeftButton) {
        rotateLeftButton.addEventListener(
            "click",
            function () {
                rotateTargetPhoto(-90);
            }
        );
    }

    if (rotateRightButton) {
        rotateRightButton.addEventListener(
            "click",
            function () {
                rotateTargetPhoto(90);
            }
        );
    }

if (viewer) {
    viewer.style.touchAction = "none";

    viewer.addEventListener(
    "touchstart",
    handleTargetPhotoTouchStart,
    {
        passive: false
    }
);

viewer.addEventListener(
    "touchmove",
    handleTargetPhotoTouchMove,
    {
        passive: false
    }
);

viewer.addEventListener(
    "touchend",
    handleTargetPhotoTouchEnd,
    {
        passive: false
    }
);

viewer.addEventListener(
    "touchcancel",
    handleTargetPhotoTouchEnd,
    {
        passive: false
    }
);
    viewer.addEventListener(
        "pointerdown",
        handleTargetPhotoPointerDown
    );

    viewer.addEventListener(
        "pointermove",
        handleTargetPhotoPointerMove
    );

    viewer.addEventListener(
        "pointerup",
        handleTargetPhotoPointerEnd
    );

    viewer.addEventListener(
        "pointercancel",
        handleTargetPhotoPointerEnd
    );

    viewer.addEventListener(
        "lostpointercapture",
        handleTargetPhotoPointerEnd
    );

    viewer.addEventListener(
        "wheel",
        handleTargetPhotoWheel,
        {
            passive: false
        }
    );
}

    updateTargetPhotoControlState();
}

/**
 * 端末から選択した写真を表示する
 */
function handleTargetPhotoSelection(event) {
    const selectedFile =
        event.target.files &&
        event.target.files[0];

    if (!selectedFile) {
        return;
    }

    if (!selectedFile.type.startsWith("image/")) {
        window.alert(
            "画像ファイルを選択してください。"
        );

        event.target.value = "";
        return;
    }

    const preview =
        document.getElementById(
            "v4TargetPhotoPreview"
        );

    const emptyDisplay =
        document.getElementById(
            "v4TargetPhotoEmpty"
        );

    const clearButton =
        document.getElementById(
            "v4TargetPhotoClear"
        );

    const viewer =
        document.getElementById(
            "v4TargetPhotoViewer"
        );

    releaseCurrentTargetPhotoUrl();

    currentTargetPhotoUrl =
        URL.createObjectURL(selectedFile);

    if (preview) {
        preview.src = currentTargetPhotoUrl;
        preview.hidden = false;
    }

    if (emptyDisplay) {
        emptyDisplay.hidden = true;
    }

    if (clearButton) {
        clearButton.disabled = false;
    }

    if (viewer) {
        viewer.classList.add("has-photo");
    }

    resetTargetPhotoTransform();
    updateTargetPhotoControlState();
}

/**
 * 表示中の写真を閉じる
 */
function clearTargetPhoto() {
    const photoInput =
        document.getElementById(
            "v4TargetPhotoInput"
        );

    const preview =
        document.getElementById(
            "v4TargetPhotoPreview"
        );

    const emptyDisplay =
        document.getElementById(
            "v4TargetPhotoEmpty"
        );

    const clearButton =
        document.getElementById(
            "v4TargetPhotoClear"
        );

    const viewer =
        document.getElementById(
            "v4TargetPhotoViewer"
        );

    releaseCurrentTargetPhotoUrl();

    if (photoInput) {
        photoInput.value = "";
    }

    if (preview) {
        preview.removeAttribute("src");
        preview.hidden = true;
    }

    if (emptyDisplay) {
        emptyDisplay.hidden = false;
    }

    if (clearButton) {
        clearButton.disabled = true;
    }

    if (viewer) {
        viewer.classList.remove(
            "has-photo",
            "is-dragging"
        );
    }

    resetTargetPhotoTransform();
    updateTargetPhotoControlState();
}

/**
 * 写真の拡大率を変更する
 */
function changeTargetPhotoZoom(amount) {
    if (!currentTargetPhotoUrl) {
        return;
    }

    targetPhotoScale = Math.min(
        4,
        Math.max(
             0.25,
            targetPhotoScale + amount
        )
    );

    applyTargetPhotoTransform();
}

/**
 * 写真を90度単位で回転する
 */
function rotateTargetPhoto(degrees) {
    if (!currentTargetPhotoUrl) {
        return;
    }

    targetPhotoRotation += degrees;

    if (targetPhotoRotation >= 360) {
        targetPhotoRotation -= 360;
    }

    if (targetPhotoRotation <= -360) {
        targetPhotoRotation += 360;
    }

    applyTargetPhotoTransform();
}

/**
 * 写真の拡大・位置・回転を初期状態へ戻す
 */
function resetTargetPhotoTransform() {
    targetPhotoScale = 1;
    targetPhotoRotation = 0;
    targetPhotoTranslateX = 0;
    targetPhotoTranslateY = 0;

    activePhotoPointers.clear();

    isTargetPhotoDragging = false;
    isTargetPhotoPinching = false;

    const viewer =
        document.getElementById(
            "v4TargetPhotoViewer"
        );

    if (viewer) {
        viewer.classList.remove(
            "is-dragging"
        );
    }

    applyTargetPhotoTransform();
}

/**
 * 写真へ現在の変形状態を反映する
 */
function applyTargetPhotoTransform() {
    const preview =
        document.getElementById(
            "v4TargetPhotoPreview"
        );

    if (!preview) {
        return;
    }

    preview.style.transform = [
        `translate(${targetPhotoTranslateX}px,`,
        `${targetPhotoTranslateY}px)`,
        `rotate(${targetPhotoRotation}deg)`,
        `scale(${targetPhotoScale})`
    ].join(" ");

    updateTargetPhotoZoomLabel();
}

/**
 * 表示倍率をボタンへ反映する
 */
function updateTargetPhotoZoomLabel() {
    const zoomResetButton =
        document.getElementById(
            "v4PhotoZoomReset"
        );

    if (!zoomResetButton) {
        return;
    }

    zoomResetButton.textContent =
        `${Math.round(targetPhotoScale * 100)}%`;
}

/**
 * 写真操作のポインター開始
 */
function handleTargetPhotoPointerDown(event) {
    if (event.pointerType === "touch") {
    return;
}
    if (!currentTargetPhotoUrl) {
        return;
    }

    const viewer =
        document.getElementById(
            "v4TargetPhotoViewer"
        );

    if (!viewer) {
        return;
    }

    event.preventDefault();

    activePhotoPointers.set(
        event.pointerId,
        {
            x: event.clientX,
            y: event.clientY
        }
    );

    //viewer.setPointerCapture(
    //   event.pointerId
    //);

    if (activePhotoPointers.size === 1) {
        startSinglePointerPhotoDrag(event);
        return;
    }

    if (activePhotoPointers.size === 2) {
        startTargetPhotoPinch();
    }
}

/**
 * 写真操作中のポインター移動
 */
function handleTargetPhotoPointerMove(event) {
    if (event.pointerType === "touch") {
    return;
}
    if (
        !currentTargetPhotoUrl ||
        !activePhotoPointers.has(
            event.pointerId
        )
    ) {
        return;
    }

    event.preventDefault();

    activePhotoPointers.set(
        event.pointerId,
        {
            x: event.clientX,
            y: event.clientY
        }
    );

    if (
        activePhotoPointers.size >= 2 &&
        isTargetPhotoPinching
    ) {
        moveTargetPhotoPinch();
        return;
    }

    if (
        activePhotoPointers.size === 1 &&
        isTargetPhotoDragging
    ) {
        moveSinglePointerPhotoDrag(event);
    }
}

/**
 * 写真操作のポインター終了
 */
function handleTargetPhotoPointerEnd(event) {
   if (event.pointerType === "touch") {
    return;
} 
    const viewer =
        document.getElementById(
            "v4TargetPhotoViewer"
        );

    activePhotoPointers.delete(
        event.pointerId
    );

    //if (
    //    viewer &&
    //    typeof viewer.hasPointerCapture ===
    //        "function" &&
    //    viewer.hasPointerCapture(event.pointerId)
    //) {
    //    viewer.releasePointerCapture(
    //        event.pointerId
    //   );
    //}

    if (activePhotoPointers.size === 0) {
        isTargetPhotoDragging = false;
        isTargetPhotoPinching = false;

        if (viewer) {
            viewer.classList.remove(
                "is-dragging"
            );
        }

        return;
    }

    if (activePhotoPointers.size === 1) {
        isTargetPhotoPinching = false;

        const remainingPointer =
            Array.from(
                activePhotoPointers.values()
            )[0];

        targetPhotoDragStartX =
            remainingPointer.x;

        targetPhotoDragStartY =
            remainingPointer.y;

        targetPhotoDragOriginX =
            targetPhotoTranslateX;

        targetPhotoDragOriginY =
            targetPhotoTranslateY;

        isTargetPhotoDragging = true;
    }
}

/**
 * 1本指またはマウスでのドラッグ開始
 */
function startSinglePointerPhotoDrag(event) {
    const viewer =
        document.getElementById(
            "v4TargetPhotoViewer"
        );

    isTargetPhotoPinching = false;
    isTargetPhotoDragging = true;

    targetPhotoDragStartX =
        event.clientX;

    targetPhotoDragStartY =
        event.clientY;

    targetPhotoDragOriginX =
        targetPhotoTranslateX;

    targetPhotoDragOriginY =
        targetPhotoTranslateY;

    if (viewer) {
        viewer.classList.add(
            "is-dragging"
        );
    }
}

/**
 * 1本指またはマウスで写真を移動する
 */
function moveSinglePointerPhotoDrag(event) {
    targetPhotoTranslateX =
        targetPhotoDragOriginX +
        event.clientX -
        targetPhotoDragStartX;

    targetPhotoTranslateY =
        targetPhotoDragOriginY +
        event.clientY -
        targetPhotoDragStartY;

    applyTargetPhotoTransform();
}

/**
 * 2本指操作を開始する
 */
function startTargetPhotoPinch() {
    const pointers =
        Array.from(
            activePhotoPointers.values()
        );

    if (pointers.length < 2) {
        return;
    }

    const firstPointer = pointers[0];
    const secondPointer = pointers[1];

    isTargetPhotoDragging = false;
    isTargetPhotoPinching = true;

    targetPhotoPinchStartDistance =
        getPhotoPointerDistance(
            firstPointer,
            secondPointer
        );

    targetPhotoPinchStartScale =
        targetPhotoScale;

    const center =
        getPhotoPointerCenter(
            firstPointer,
            secondPointer
        );

    targetPhotoPinchStartCenterX =
        center.x;

    targetPhotoPinchStartCenterY =
        center.y;

    targetPhotoPinchOriginX =
        targetPhotoTranslateX;

    targetPhotoPinchOriginY =
        targetPhotoTranslateY;
}

/**
 * 2本指で写真を拡大・縮小・移動する
 */
function moveTargetPhotoPinch() {
    const pointers =
        Array.from(
            activePhotoPointers.values()
        );

    if (pointers.length < 2) {
        return;
    }

    const firstPointer = pointers[0];
    const secondPointer = pointers[1];

    const currentDistance =
        getPhotoPointerDistance(
            firstPointer,
            secondPointer
        );

    if (targetPhotoPinchStartDistance <= 0) {
        return;
    }

    const scaleRatio =
        currentDistance /
        targetPhotoPinchStartDistance;

    targetPhotoScale = Math.min(
        4,
        Math.max(
            0.25,
            targetPhotoPinchStartScale *
                scaleRatio
        )
    );

    const currentCenter =
        getPhotoPointerCenter(
            firstPointer,
            secondPointer
        );

    targetPhotoTranslateX =
        targetPhotoPinchOriginX +
        currentCenter.x -
        targetPhotoPinchStartCenterX;

    targetPhotoTranslateY =
        targetPhotoPinchOriginY +
        currentCenter.y -
        targetPhotoPinchStartCenterY;

    applyTargetPhotoTransform();
}

/**
 * 2点間の距離を取得する
 */
function getPhotoPointerDistance(
    firstPointer,
    secondPointer
) {
    return Math.hypot(
        secondPointer.x -
            firstPointer.x,
        secondPointer.y -
            firstPointer.y
    );
}

/**
 * 2点の中央位置を取得する
 */
function getPhotoPointerCenter(
    firstPointer,
    secondPointer
) {
    return {
        x:
            (
                firstPointer.x +
                secondPointer.x
            ) / 2,

        y:
            (
                firstPointer.y +
                secondPointer.y
            ) / 2
    };
}

/**
 * iPhoneなどでタッチ操作を開始する
 */
function handleTargetPhotoTouchStart(event) {
    if (!currentTargetPhotoUrl) {
        return;
    }

    event.preventDefault();

    if (event.touches.length >= 2) {
        const firstTouch =
            event.touches[0];

        const secondTouch =
            event.touches[1];

        isTargetPhotoDragging = false;
        isTargetPhotoPinching = true;

        targetPhotoPinchStartDistance =
            getTargetPhotoTouchDistance(
                firstTouch,
                secondTouch
            );

        targetPhotoPinchStartScale =
            targetPhotoScale;

        const center =
            getTargetPhotoTouchCenter(
                firstTouch,
                secondTouch
            );

        targetPhotoPinchStartCenterX =
            center.x;

        targetPhotoPinchStartCenterY =
            center.y;

        targetPhotoPinchOriginX =
            targetPhotoTranslateX;

        targetPhotoPinchOriginY =
            targetPhotoTranslateY;

        return;
    }

    if (event.touches.length === 1) {
        const touch =
            event.touches[0];

        isTargetPhotoPinching = false;
        isTargetPhotoDragging = true;

        targetPhotoDragStartX =
            touch.clientX;

        targetPhotoDragStartY =
            touch.clientY;

        targetPhotoDragOriginX =
            targetPhotoTranslateX;

        targetPhotoDragOriginY =
            targetPhotoTranslateY;

        const viewer =
            document.getElementById(
                "v4TargetPhotoViewer"
            );

        if (viewer) {
            viewer.classList.add(
                "is-dragging"
            );
        }
    }
}

/**
 * iPhoneなどでタッチ操作中の写真を動かす
 */
function handleTargetPhotoTouchMove(event) {
    if (!currentTargetPhotoUrl) {
        return;
    }

    event.preventDefault();

    if (event.touches.length >= 2) {
        const firstTouch =
            event.touches[0];

        const secondTouch =
            event.touches[1];

        if (!isTargetPhotoPinching) {
            handleTargetPhotoTouchStart(event);
            return;
        }

        const currentDistance =
            getTargetPhotoTouchDistance(
                firstTouch,
                secondTouch
            );

        if (
            targetPhotoPinchStartDistance <= 0
        ) {
            return;
        }

        const scaleRatio =
            currentDistance /
            targetPhotoPinchStartDistance;

        targetPhotoScale = Math.min(
            4,
            Math.max(
                0.25,
                targetPhotoPinchStartScale *
                    scaleRatio
            )
        );

        const currentCenter =
            getTargetPhotoTouchCenter(
                firstTouch,
                secondTouch
            );

        targetPhotoTranslateX =
            targetPhotoPinchOriginX +
            currentCenter.x -
            targetPhotoPinchStartCenterX;

        targetPhotoTranslateY =
            targetPhotoPinchOriginY +
            currentCenter.y -
            targetPhotoPinchStartCenterY;

        applyTargetPhotoTransform();
        return;
    }

    if (
        event.touches.length === 1 &&
        isTargetPhotoDragging
    ) {
        const touch =
            event.touches[0];

        targetPhotoTranslateX =
            targetPhotoDragOriginX +
            touch.clientX -
            targetPhotoDragStartX;

        targetPhotoTranslateY =
            targetPhotoDragOriginY +
            touch.clientY -
            targetPhotoDragStartY;

        applyTargetPhotoTransform();
    }
}

/**
 * iPhoneなどでタッチ操作を終了する
 */
function handleTargetPhotoTouchEnd(event) {
    if (event.cancelable) {
        event.preventDefault();
    }

    const viewer =
        document.getElementById(
            "v4TargetPhotoViewer"
        );

    if (event.touches.length === 0) {
        isTargetPhotoDragging = false;
        isTargetPhotoPinching = false;

        if (viewer) {
            viewer.classList.remove(
                "is-dragging"
            );
        }

        return;
    }

    if (event.touches.length === 1) {
        const touch =
            event.touches[0];

        isTargetPhotoPinching = false;
        isTargetPhotoDragging = true;

        targetPhotoDragStartX =
            touch.clientX;

        targetPhotoDragStartY =
            touch.clientY;

        targetPhotoDragOriginX =
            targetPhotoTranslateX;

        targetPhotoDragOriginY =
            targetPhotoTranslateY;
    }
}

/**
 * 2本の指の間隔を取得する
 */
function getTargetPhotoTouchDistance(
    firstTouch,
    secondTouch
) {
    return Math.hypot(
        secondTouch.clientX -
            firstTouch.clientX,
        secondTouch.clientY -
            firstTouch.clientY
    );
}

/**
 * 2本の指の中央位置を取得する
 */
function getTargetPhotoTouchCenter(
    firstTouch,
    secondTouch
) {
    return {
        x:
            (
                firstTouch.clientX +
                secondTouch.clientX
            ) / 2,

        y:
            (
                firstTouch.clientY +
                secondTouch.clientY
            ) / 2
    };
}

/**
 * PCのマウスホイールで拡大・縮小する
 */
function handleTargetPhotoWheel(event) {
    if (!currentTargetPhotoUrl) {
        return;
    }

    event.preventDefault();

    const zoomAmount =
        event.deltaY < 0
            ? 0.1
            : -0.1;

    changeTargetPhotoZoom(zoomAmount);
}

/**
 * 写真の有無に応じて操作ボタンを有効・無効にする
 */
function updateTargetPhotoControlState() {
    const hasPhoto =
        Boolean(currentTargetPhotoUrl);

    const controlIds = [
        "v4PhotoZoomIn",
        "v4PhotoZoomOut",
        "v4PhotoZoomReset",
        "v4PhotoRotateLeft",
        "v4PhotoRotateRight"
    ];

    controlIds.forEach(function (id) {
        const button =
            document.getElementById(id);

        if (button) {
            button.disabled = !hasPhoto;
        }
    });
}

/**
 * 作成済みの一時画像URLを解放する
 */
function releaseCurrentTargetPhotoUrl() {
    if (!currentTargetPhotoUrl) {
        return;
    }

    URL.revokeObjectURL(
        currentTargetPhotoUrl
    );

    currentTargetPhotoUrl = "";
}