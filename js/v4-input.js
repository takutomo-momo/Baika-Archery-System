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
let photoGroupingArrows = [];
let isZoomed = false;
let zoomCenter = {
    x: 150,
    y: 150
};

const V4_GAS_API_URL =
    "https://script.google.com/macros/s/AKfycbwGlg88mq5G4fR0_H9BlQ8VmdloL8oBPOBeIBQKWrK_XunDTPalvpo1tLu4I0qA2f16/exec";

document.addEventListener("DOMContentLoaded", function () {
    drawTargetSvg();
    drawGroupingTargetSvg();
    updateCurrentEndDisplay();
    updateScoreInputState();    
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

    if (!svg) {
        return;
    }

    /*
     * Target Engineがピンドラッグ／ピンタップとして
     * 処理した直後のclickは、ズームへ渡さない。
     */
    if (
        window.baikaTargetGesture &&
        typeof window.baikaTargetGesture
            .consumeSuppressedClick === "function" &&
        window.baikaTargetGesture
            .consumeSuppressedClick()
    ) {
        return;
    }

    /*
     * ピンク丸そのものをタップした場合も、
     * 的ズームや新規入力として扱わない。
     */
    if (
        event.target &&
        typeof event.target.closest === "function" &&
        event.target.closest(
            "[data-target-pin-index]"
        )
    ) {
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

    /*
     * 6本入力済みでもズーム表示は利用できる。
     * ただし、新しい7本目は追加しない。
     */
    if (currentArrows.length >= 6) {
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

    const targetSource =
        photoGroupingArrows.length > 0
            ? photoGroupingArrows
            : currentArrows;

    targetSource.forEach(function (arrow, index) {
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
        pin.setAttribute("r", "5");
        pin.setAttribute("fill", "#ec4899");
        pin.setAttribute("stroke", "#ffffff");
        pin.setAttribute("stroke-width", "1");
        pin.setAttribute(
            "data-target-pin-index",
            String(index)
        );
        pin.style.cursor = "grab";
        pin.style.pointerEvents = "all";
        pin.style.touchAction = "none";

        /*
         * スマホで掴みやすい透明な当たり判定。
         * 見た目は変えず、半径12の範囲でドラッグ可能にする。
         */
        const pinHitArea =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );

        pinHitArea.setAttribute(
            "cx",
            String(arrow.x)
        );
        pinHitArea.setAttribute(
            "cy",
            String(arrow.y)
        );
        pinHitArea.setAttribute("r", "12");
        pinHitArea.setAttribute(
            "fill",
            "transparent"
        );
        pinHitArea.setAttribute(
            "data-target-pin-index",
            String(index)
        );
        pinHitArea.style.cursor = "grab";
        pinHitArea.style.pointerEvents = "all";
        pinHitArea.style.touchAction = "none";

        pinsGroup.appendChild(pinHitArea);
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
        pinNumber.setAttribute(
            "data-target-pin-label-index",
            String(index)
        );
        pinNumber.style.pointerEvents = "none";

        pinsGroup.appendChild(pinNumber);
    });
}
/**
 * グルーピング確認用の的に着弾位置を表示する
 */
function getTargetSvgPoint(event) {
    const svg = document.getElementById("targetSvg");

    if (!svg) {
        return null;
    }

    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;

    const matrix = svg.getScreenCTM();

    if (!matrix) {
        return null;
    }

    const svgPoint =
        point.matrixTransform(matrix.inverse());

    return {
        x: Math.max(0, Math.min(300, svgPoint.x)),
        y: Math.max(0, Math.min(300, svgPoint.y))
    };
}

function getPhotoGroupingArrows() {
    return photoGroupingArrows;
}

function updateTargetPinPosition(
    index,
    x,
    y
) {
    if (!photoGroupingArrows[index]) {
        return false;
    }

    photoGroupingArrows[index].x =
        Math.max(0, Math.min(300, Number(x)));

    photoGroupingArrows[index].y =
        Math.max(0, Math.min(300, Number(y)));

    photoGroupingArrows[index].targetAdjusted =
        true;

    renderGroupingPins();

    return true;
}

function finishTargetPinPosition(
    index,
    x,
    y
) {
    const updated =
        updateTargetPinPosition(
            index,
            x,
            y
        );

    if (!updated) {
        return false;
    }

    renderTargetPins();
    renderGroupingPins();

    return true;
}

window.baikaTargetModel = {
    getArrows: getPhotoGroupingArrows,
    updatePinPosition: updateTargetPinPosition,
    finishPinPosition: finishTargetPinPosition
};

function renderGroupingPins() {
    const pinsGroup =
        document.getElementById("groupingPinsGroup");

    if (!pinsGroup) {
        return;
    }

    pinsGroup.innerHTML = "";

    const groupingSource =
        photoGroupingArrows.length > 0
            ? photoGroupingArrows
            : currentArrows;

    groupingSource.forEach(function (arrow, index) {
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

        pinNumber.style.pointerEvents = "none";

        pinsGroup.appendChild(pinNumber);

    });

    renderGroupingCenter(
        pinsGroup,
        groupingSource
    );
}

/**
 * グルーピングの平均着弾位置を表示する
 */
function renderGroupingCenter(
    pinsGroup,
    arrows
) {
    const validArrows =
        arrows.filter(function (arrow) {
            if (!arrow) {
                return false;
            }

            const scoreLabel =
                String(
                    arrow.val != null
                        ? arrow.val
                        : ""
                )
                    .trim()
                    .toUpperCase();

            const isMiss =
                arrow.isMiss === true ||
                scoreLabel === "M";

            return (
                !isMiss &&
                arrow.x != null &&
                arrow.y != null &&
                Number.isFinite(Number(arrow.x)) &&
                Number.isFinite(Number(arrow.y))
            );
        });

    if (validArrows.length === 0) {
        return;
    }

    const centerX =
        validArrows.reduce(
            function (sum, arrow) {
                return sum + Number(arrow.x);
            },
            0
        ) / validArrows.length;

    const centerY =
        validArrows.reduce(
            function (sum, arrow) {
                return sum + Number(arrow.y);
            },
            0
        ) / validArrows.length;

    const markerGroup =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );

    markerGroup.setAttribute(
        "aria-label",
        "グルーピング中心"
    );

    const outerCircle =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );

    outerCircle.setAttribute("cx", String(centerX));
    outerCircle.setAttribute("cy", String(centerY));
    outerCircle.setAttribute("r", "7");
    outerCircle.setAttribute("fill", "none");
    outerCircle.setAttribute("stroke", "#06b6d4");
    outerCircle.setAttribute("stroke-width", "2");

    markerGroup.appendChild(outerCircle);

    const horizontalLine =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );

    horizontalLine.setAttribute(
        "x1",
        String(centerX - 10)
    );
    horizontalLine.setAttribute(
        "x2",
        String(centerX + 10)
    );
    horizontalLine.setAttribute("y1", String(centerY));
    horizontalLine.setAttribute("y2", String(centerY));
    horizontalLine.setAttribute("stroke", "#06b6d4");
    horizontalLine.setAttribute("stroke-width", "1.8");

    markerGroup.appendChild(horizontalLine);

    const verticalLine =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "line"
        );

    verticalLine.setAttribute("x1", String(centerX));
    verticalLine.setAttribute("x2", String(centerX));
    verticalLine.setAttribute(
        "y1",
        String(centerY - 10)
    );
    verticalLine.setAttribute(
        "y2",
        String(centerY + 10)
    );
    verticalLine.setAttribute("stroke", "#06b6d4");
    verticalLine.setAttribute("stroke-width", "1.8");

    markerGroup.appendChild(verticalLine);

    const label =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text"
        );

    label.setAttribute(
        "x",
        String(centerX + 10)
    );
    label.setAttribute(
        "y",
        String(centerY - 8)
    );
    label.setAttribute("font-size", "8");
    label.setAttribute("font-weight", "bold");
    label.setAttribute("fill", "#0891b2");
    label.textContent = "中心";

    markerGroup.appendChild(label);
    pinsGroup.appendChild(markerGroup);
}

/**
 * 写真上のピンをグルーピング表示へ反映する。
 * Step29Aでは写真全体を300×300の的へ正規化して表示する。
 */
function syncPhotoPinsToGrouping(
    photoPins,
    naturalWidth,
    naturalHeight,
    calibration
) {
    if (
        !Array.isArray(photoPins) ||
        !naturalWidth ||
        !naturalHeight
    ) {
        photoGroupingArrows = [];
        renderGroupingPins();
        return;
    }

    const previousTargetArrows =
        Array.isArray(photoGroupingArrows)
            ? photoGroupingArrows
            : [];

    photoGroupingArrows =
        photoPins.map(function (pin, index) {
            const scoreLabel =
                pin.score === null
                    ? ""
                    : String(pin.score)
                        .trim()
                        .toUpperCase();

            const isMiss =
                scoreLabel === "M";

            const photoTargetX =
                calibration &&
                calibration.ready
                    ? (
                        150 +
                        (
                            Number(pin.x) -
                            Number(calibration.centerX)
                        ) /
                        Number(calibration.radiusX) *
                        150
                    )
                    : (
                        Number(pin.x) /
                        Number(naturalWidth)
                    ) * 300;

            const photoTargetY =
                calibration &&
                calibration.ready
                    ? (
                        150 +
                        (
                            Number(pin.y) -
                            Number(calibration.centerY)
                        ) /
                        Number(calibration.radiusY) *
                        150
                    )
                    : (
                        Number(pin.y) /
                        Number(naturalHeight)
                    ) * 300;

            const previous =
                previousTargetArrows[index];

            const preserveManualAdjustment =
                previous &&
                previous.targetAdjusted === true &&
                pin.photoPositionChanged !== true;

            return {
                val: scoreLabel,
                score:
                    isMiss
                        ? 0
                        : (
                            scoreLabel === "X"
                                ? 10
                                : Number(scoreLabel || 0)
                        ),
                isMiss: isMiss,
                x:
                    preserveManualAdjustment
                        ? Number(previous.x)
                        : photoTargetX,
                y:
                    preserveManualAdjustment
                        ? Number(previous.y)
                        : photoTargetY,
                targetAdjusted:
                    preserveManualAdjustment,
                inputType: "photo-grouping"
            };
        });

    renderTargetPins();
    renderGroupingPins();
}

window.syncPhotoPinsToGrouping =
    syncPhotoPinsToGrouping;

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
 * 写真入力の1本以上をGoogleスプレッドシートへ登録する
 */
async function registerPhotoPracticeEnd(photoPins) {
    if (!Array.isArray(photoPins)) {
        return false;
    }

    if (
        photoPins.length === 0 ||
        photoPins.some(function (pin) {
            return !pin || pin.score == null;
        })
    ) {
        window.alert(
            "1本以上のピンを追加し、すべての得点を設定してください。"
        );
        return false;
    }

    const memberNameElement =
        document.getElementById(
            "v4LoggedInMemberName"
        );

    let memberName =
        memberNameElement
            ? memberNameElement.textContent.trim()
            : "";

    if (
        !memberName ||
        memberName === "未ログイン" ||
        memberName === "ログイン情報を確認中"
    ) {
        const savedMemberName =
            localStorage.getItem(
                "v4PhotoPracticeMemberName"
            ) || "";

        const enteredMemberName =
            window.prompt(
                "登録する部員名を入力してください。",
                savedMemberName
            );

        if (enteredMemberName === null) {
            return false;
        }

        memberName =
            enteredMemberName.trim();

        if (!memberName) {
            window.alert(
                "部員名を入力してください。"
            );
            return false;
        }

        localStorage.setItem(
            "v4PhotoPracticeMemberName",
            memberName
        );
    }

    const dateElement =
        document.getElementById(
            "v4PracticeDate"
        );

    const distanceElement =
        document.getElementById(
            "v4DistanceSelect"
        );

    const practiceDate =
        dateElement ? dateElement.value : "";

    const distance =
        distanceElement ? distanceElement.value : "";

    if (!practiceDate) {
        window.alert(
            "練習日を選択してください。"
        );
        return false;
    }

    if (!distance) {
        window.alert(
            "距離を選択してください。"
        );
        return false;
    }

    const arrows =
        photoPins.map(function (pin) {
            const label =
                String(pin.score).toUpperCase();

            let numericScore = 0;

            if (
                label === "X" ||
                label === "10"
            ) {
                numericScore = 10;
            } else if (label !== "M") {
                numericScore = Number(label);
            }

            return {
                val: label,
                score: numericScore,
                x: null,
                y: null,
                inputType: "photo",
                photoX: Number(pin.x),
                photoY: Number(pin.y)
            };
        });

    const sorted =
        [...arrows].sort(function (a, b) {
            return b.score - a.score;
        });

    const record = {
        date: practiceDate,
        memberName: memberName,
        distance: distance,
        a1: sorted[0] ? sorted[0].val : "",
        a2: sorted[1] ? sorted[1].val : "",
        a3: sorted[2] ? sorted[2].val : "",
        a4: sorted[3] ? sorted[3].val : "",
        a5: sorted[4] ? sorted[4].val : "",
        a6: sorted[5] ? sorted[5].val : "",
        total: sorted.reduce(
            function (sum, arrow) {
                return sum + arrow.score;
            },
            0
        ),
        pins: arrows
    };

    try {
        const getResponse =
            await fetch(V4_GAS_API_URL);

        if (!getResponse.ok) {
            throw new Error(
                "クラウドデータを取得できませんでした。"
            );
        }

        const cloudData =
            await getResponse.json();

        const practiceData =
            Array.isArray(cloudData.practice)
                ? cloudData.practice
                : [];

        practiceData.push(record);

        const payload = {
            mode: "practice",
            data: practiceData
        };

        const saveResponse =
            await fetch(
                V4_GAS_API_URL,
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

        if (!saveResponse.ok) {
            throw new Error(
                "クラウドへ保存できませんでした。"
            );
        }

        await saveResponse.text();

        currentArrows = [];
        resetTargetZoom();
        updateCurrentEndDisplay();
        updateScoreInputState();

        return true;
    } catch (error) {
        console.error(
            "Photo practice save failed:",
            error
        );

        window.alert(
            "クラウド保存に失敗しました。通信環境またはGAS設定を確認してください。"
        );

        return false;
    }
}

window.registerPhotoPracticeEnd =
    registerPhotoPracticeEnd;

/**
 * 写真入力の6本で現在エンドを直接置き換える
 * 確認ダイアログは表示しない
 */
function replaceCurrentEndFromPhoto(photoPins) {
    if (!Array.isArray(photoPins)) {
        return false;
    }

    if (
        photoPins.length !== 6 ||
        photoPins.some(function (pin) {
            return !pin || pin.score == null;
        })
    ) {
        return false;
    }

    currentArrows =
        photoPins.map(function (pin) {
            const label =
                String(pin.score).toUpperCase();

            let numericScore = 0;

            if (
                label === "X" ||
                label === "10"
            ) {
                numericScore = 10;
            } else if (label !== "M") {
                numericScore = Number(label);
            }

            return {
                val: label,
                score: numericScore,
                x: null,
                y: null,
                inputType: "photo",
                photoX: Number(pin.x),
                photoY: Number(pin.y)
            };
        });

    resetTargetZoom();
    updateCurrentEndDisplay();
    renderTargetPins();
    renderGroupingPins();
    updateScoreInputState();

    return true;
}

window.replaceCurrentEndFromPhoto =
    replaceCurrentEndFromPhoto;

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

