"use strict";

/*
 * Baika Archery System Ver4
 * 記録入力画面
 *
 * 現段階：
 * ・的の描画
 * ・2段階ズーム
 * ・着弾位置の取得
 * ・最大6本までの仮入力
 */

let currentArrows = [];
let isZoomed = false;
let zoomCenter = {
    x: 150,
    y: 150
};

document.addEventListener("DOMContentLoaded", function () {
    drawTargetSvg();
    drawGroupingTargetSvg();
    updateCurrentEndDisplay();
    updateScoreInputState();
    initializeTargetPhotoViewer();
});

/**
 * アーチェリーの的をSVGで描画する
 */
function drawTargetSvg() {
    const svg = document.getElementById("targetSvg");

    if (!svg) {
        return;
    }

    svg.innerHTML = "";

    const rings = [
        { radius: 150, fill: "#ffffff" },
        { radius: 135, fill: "#ffffff" },
        { radius: 120, fill: "#333333" },
        { radius: 105, fill: "#333333" },
        { radius: 90, fill: "#007aff" },
        { radius: 75, fill: "#007aff" },
        { radius: 60, fill: "#ff3b30" },
        { radius: 45, fill: "#ff3b30" },
        { radius: 30, fill: "#ffd700" },
        { radius: 15, fill: "#ffd700" },
        { radius: 7.5, fill: "#ffd700" }
    ];

    rings.forEach(function (ring) {
        const circle = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );

        circle.setAttribute("cx", "150");
        circle.setAttribute("cy", "150");
        circle.setAttribute("r", String(ring.radius));
        circle.setAttribute("fill", ring.fill);

        circle.setAttribute(
            "stroke",
            ring.fill === "#333333" ? "#ffffff" : "#000000"
        );

        circle.setAttribute("stroke-width", "0.5");

        svg.appendChild(circle);
    });

    const pinsGroup = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "g"
    );

    pinsGroup.id = "pinsGroup";
    svg.appendChild(pinsGroup);

    renderTargetPins();
}

/**
 * グルーピング確認用の的を描画する
 */
function drawGroupingTargetSvg() {
    const svg =
        document.getElementById("groupingTargetSvg");

    if (!svg) {
        return;
    }

    svg.innerHTML = "";

    const rings = [
        { radius: 150, fill: "#ffffff" },
        { radius: 135, fill: "#ffffff" },
        { radius: 120, fill: "#333333" },
        { radius: 105, fill: "#333333" },
        { radius: 90, fill: "#007aff" },
        { radius: 75, fill: "#007aff" },
        { radius: 60, fill: "#ff3b30" },
        { radius: 45, fill: "#ff3b30" },
        { radius: 30, fill: "#ffd700" },
        { radius: 15, fill: "#ffd700" },
        { radius: 7.5, fill: "#ffd700" }
    ];

    rings.forEach(function (ring) {
        const circle = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );

        circle.setAttribute("cx", "150");
        circle.setAttribute("cy", "150");
        circle.setAttribute("r", String(ring.radius));
        circle.setAttribute("fill", ring.fill);

        circle.setAttribute(
            "stroke",
            ring.fill === "#333333"
                ? "#ffffff"
                : "#000000"
        );

        circle.setAttribute("stroke-width", "0.5");

        svg.appendChild(circle);
    });

    const groupingPinsGroup =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );

    groupingPinsGroup.id = "groupingPinsGroup";
    svg.appendChild(groupingPinsGroup);

    renderGroupingPins();
}

/**
 * 的をタップしたときの処理
 *
 * 1回目：タップ位置を中心に拡大
 * 2回目：着弾位置を確定
 */
function handleTargetClick(event) {
    const svg = document.getElementById("targetSvg");

    if (!svg || currentArrows.length >= 6) {
        return;
    }

    const rect = svg.getBoundingClientRect();

    const tappedX =
        ((event.clientX - rect.left) / rect.width) * 300;

    const tappedY =
        ((event.clientY - rect.top) / rect.height) * 300;

    if (!isZoomed) {
        isZoomed = true;

        zoomCenter = {
            x: tappedX,
            y: tappedY
        };

        svg.setAttribute(
            "viewBox",
            `${tappedX - 50} ${tappedY - 50} 100 100`
        );

        return;
    }

    const realX =
        zoomCenter.x - 50 + (tappedX / 300) * 100;

    const realY =
        zoomCenter.y - 50 + (tappedY / 300) * 100;

    const arrow = calculateArrowScore(realX, realY);

currentArrows.push(arrow);

updateCurrentEndDisplay();
resetTargetZoom();
updateScoreInputState();
}

/**
 * 着弾位置から得点を計算する
 */
function calculateArrowScore(x, y) {
    const distanceFromCenter = Math.hypot(
        x - 150,
        y - 150
    );

    const arrow = {
        val: "M",
        score: 0,
        x: x,
        y: y
    };

    if (distanceFromCenter > 150) {
        return arrow;
    }

    if (distanceFromCenter <= 7.5) {
        arrow.val = "X";
        arrow.score = 10;
    } else if (distanceFromCenter <= 15) {
        arrow.val = "10";
        arrow.score = 10;
    } else if (distanceFromCenter <= 30) {
        arrow.val = "9";
        arrow.score = 9;
    } else if (distanceFromCenter <= 45) {
        arrow.val = "8";
        arrow.score = 8;
    } else if (distanceFromCenter <= 60) {
        arrow.val = "7";
        arrow.score = 7;
    } else if (distanceFromCenter <= 75) {
        arrow.val = "6";
        arrow.score = 6;
    } else if (distanceFromCenter <= 90) {
        arrow.val = "5";
        arrow.score = 5;
    } else if (distanceFromCenter <= 105) {
        arrow.val = "4";
        arrow.score = 4;
    } else if (distanceFromCenter <= 120) {
        arrow.val = "3";
        arrow.score = 3;
    } else if (distanceFromCenter <= 135) {
        arrow.val = "2";
        arrow.score = 2;
    } else {
        arrow.val = "1";
        arrow.score = 1;
    }

    return arrow;
}

/**
 * ズームを初期状態へ戻す
 */
function resetTargetZoom() {
    const svg = document.getElementById("targetSvg");

    isZoomed = false;
    zoomCenter = {
        x: 150,
        y: 150
    };

    if (!svg) {
        return;
    }

    svg.setAttribute("viewBox", "0 0 300 300");
    renderTargetPins();
     renderGroupingPins();
}

/**
 * 入力済みの着弾位置を表示する
 */
function renderTargetPins() {
    const pinsGroup =
        document.getElementById("pinsGroup");

    if (!pinsGroup) {
        return;
    }

    pinsGroup.innerHTML = "";

    currentArrows.forEach(function (arrow, index) {
if (
    arrow.val === "M" ||
    arrow.x == null ||
    arrow.y == null
) {
    return;
}

        const pin = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );

        pin.setAttribute("cx", String(arrow.x));
        pin.setAttribute("cy", String(arrow.y));
        pin.setAttribute("r", "3.5");
        pin.setAttribute("fill", "#ec4899");
        pin.setAttribute("stroke", "#ffffff");
        pin.setAttribute("stroke-width", "1");

        pinsGroup.appendChild(pin);

        const pinNumber = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );

        pinNumber.setAttribute("x", String(arrow.x + 5));
        pinNumber.setAttribute("y", String(arrow.y + 3));
        pinNumber.setAttribute("font-size", "8");
        pinNumber.setAttribute("font-weight", "bold");
        pinNumber.setAttribute("fill", "#111827");
        pinNumber.textContent = String(index + 1);

        pinsGroup.appendChild(pinNumber);
    });
}
/**
 * グルーピング確認用の的に着弾位置を表示する
 */
function renderGroupingPins() {
    const pinsGroup =
        document.getElementById("groupingPinsGroup");

    if (!pinsGroup) {
        return;
    }

    pinsGroup.innerHTML = "";

    currentArrows.forEach(function (arrow, index) {
if (
    arrow.val === "M" ||
    arrow.x == null ||
    arrow.y == null
) {
    return;
}

        const pin = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );

        pin.setAttribute("cx", String(arrow.x));
        pin.setAttribute("cy", String(arrow.y));
        pin.setAttribute("r", "4");
        pin.setAttribute("fill", "#ec4899");
        pin.setAttribute("stroke", "#ffffff");
        pin.setAttribute("stroke-width", "1.2");

        pinsGroup.appendChild(pin);

        const pinNumber = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );

        pinNumber.setAttribute(
            "x",
            String(arrow.x + 5)
        );

        pinNumber.setAttribute(
            "y",
            String(arrow.y + 3)
        );

        pinNumber.setAttribute(
            "font-size",
            "8"
        );

        pinNumber.setAttribute(
            "font-weight",
            "bold"
        );

        pinNumber.setAttribute(
            "fill",
            "#111827"
        );

        pinNumber.textContent =
            String(index + 1);

        pinsGroup.appendChild(pinNumber);
    });
}

/**
 * 現在入力中の6本と、合計・平均を画面へ反映する
 */
function updateCurrentEndDisplay() {
    const arrowSlots =
        document.querySelectorAll(".v4-arrow-slot");

    arrowSlots.forEach(function (slot, index) {
        const scoreElement =
            slot.querySelector(".v4-arrow-score");

        const arrow = currentArrows[index];

        slot.classList.remove(
            "is-filled",
            "is-miss"
        );

        if (!scoreElement) {
            return;
        }

        if (!arrow) {
            scoreElement.textContent = "－";
            return;
        }

        scoreElement.textContent = arrow.val;
        slot.classList.add("is-filled");

        if (arrow.val === "M") {
            slot.classList.add("is-miss");
        }
    });

    const count = currentArrows.length;

    const total = currentArrows.reduce(
        function (sum, arrow) {
            return sum + Number(arrow.score || 0);
        },
        0
    );

    const average =
        count > 0
            ? (total / count).toFixed(1)
            : "0.0";

    const countElement =
        document.getElementById(
            "v4CurrentArrowCount"
        );

    const totalElement =
        document.getElementById(
            "v4CurrentArrowTotal"
        );

    const averageElement =
        document.getElementById(
            "v4CurrentArrowAverage"
        );

    if (countElement) {
        countElement.textContent =
            `${count} / 6`;
    }

    if (totalElement) {
        totalElement.textContent =
            String(total);
    }

    if (averageElement) {
        averageElement.textContent =
            average;
    }
}
/**
 * キーパッドから得点を入力する
 */
function handleScoreKeypadInput(value, score) {
    if (currentArrows.length >= 6) {
        return;
    }

currentArrows.push({
    val: value,
    score: score,
    x: null,
    y: null,
    inputType: "keypad"
});

    updateCurrentEndDisplay();
    renderTargetPins();
    renderGroupingPins();
    updateScoreInputState();
}

/**
 * 現在エンドをすべてクリアする
 */
function clearCurrentEnd() {
    if (currentArrows.length === 0) {
        return;
    }

    const shouldClear = window.confirm(
        "現在入力中の6本をすべてクリアしますか？"
    );

    if (!shouldClear) {
        return;
    }

    currentArrows = [];

    resetTargetZoom();
    updateCurrentEndDisplay();
    updateScoreInputState();
}

/**
 * 6本入力済みかどうかに応じて、
 * キーパッドと登録ボタンの状態を更新する
 */
function updateScoreInputState() {
    const isFull =
        currentArrows.length >= 6;

    const scoreButtons =
        document.querySelectorAll(
            ".v4-score-key"
        );

    scoreButtons.forEach(function (button) {
        button.disabled = isFull;
    });

    const registerButton =
        document.getElementById(
            "v4RegisterCurrentEnd"
        );

    if (registerButton) {
        registerButton.disabled =
            currentArrows.length !== 6;
    }

    const clearButton =
        document.getElementById(
            "v4ClearCurrentEnd"
        );

    if (clearButton) {
        clearButton.disabled =
            currentArrows.length === 0;
    }
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
            0.5,
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
 * 写真のドラッグ開始
 */
function startTargetPhotoDrag(event) {
    if (!currentTargetPhotoUrl) {
        return;
    }

    const viewer =
        document.getElementById(
            "v4TargetPhotoViewer"
        );

    isTargetPhotoDragging = true;

    targetPhotoDragStartX = event.clientX;
    targetPhotoDragStartY = event.clientY;

    targetPhotoDragOriginX =
        targetPhotoTranslateX;

    targetPhotoDragOriginY =
        targetPhotoTranslateY;

    if (viewer) {
        viewer.classList.add("is-dragging");
        viewer.setPointerCapture(event.pointerId);
    }
}

/**
 * 写真をドラッグ移動する
 */
function moveTargetPhotoDrag(event) {
    if (!isTargetPhotoDragging) {
        return;
    }

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
 * 写真のドラッグ終了
 */
function endTargetPhotoDrag(event) {
    if (!isTargetPhotoDragging) {
        return;
    }

    isTargetPhotoDragging = false;

    const viewer =
        document.getElementById(
            "v4TargetPhotoViewer"
        );

    if (viewer) {
        viewer.classList.remove("is-dragging");

        if (
            typeof viewer.hasPointerCapture ===
                "function" &&
            viewer.hasPointerCapture(event.pointerId)
        ) {
            viewer.releasePointerCapture(
                event.pointerId
            );
        }
    }
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

/**
 * 撮影した的の写真表示と操作を初期化する
 */
function initializeTargetPhotoViewer() {
    const photoInput =
        document.getElementById("v4TargetPhotoInput");

    const clearButton =
        document.getElementById("v4TargetPhotoClear");

    const zoomInButton =
        document.getElementById("v4PhotoZoomIn");

    const zoomOutButton =
        document.getElementById("v4PhotoZoomOut");

    const zoomResetButton =
        document.getElementById("v4PhotoZoomReset");

    const rotateLeftButton =
        document.getElementById("v4PhotoRotateLeft");

    const rotateRightButton =
        document.getElementById("v4PhotoRotateRight");

    const viewer =
        document.getElementById("v4TargetPhotoViewer");

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
        viewer.addEventListener(
            "pointerdown",
            startTargetPhotoDrag
        );

        viewer.addEventListener(
            "pointermove",
            moveTargetPhotoDrag
        );

        viewer.addEventListener(
            "pointerup",
            endTargetPhotoDrag
        );

        viewer.addEventListener(
            "pointercancel",
            endTargetPhotoDrag
        );

        viewer.addEventListener(
            "pointerleave",
            endTargetPhotoDrag
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

    const viewer =
    document.getElementById(
        "v4TargetPhotoViewer"
    );

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