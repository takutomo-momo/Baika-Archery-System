"use strict";

/*
 * Baika Archery System Ver4
 * 記録入力画面
 *
 * 現段階：
 * ・的の描画
 * ・2段階ズーム
 * ・着弾位置の取得
 * ・本数制限なしの仮入力
 */

let currentArrows = [];
let photoGroupingArrows = [];
let registeredGroupingArrows = [];
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

    const tappedPoint = getTargetSvgPoint(event);

    if (!tappedPoint) {
        return;
    }

    const tappedX = tappedPoint.x;
    const tappedY = tappedPoint.y;

    if (!isZoomed) {
        isZoomed = true;

        zoomCenter = {
            x: tappedX,
            y: tappedY
        };

        svg.setAttribute(
            "viewBox",
            `${Math.max(0, Math.min(250, tappedX - 25))} ${Math.max(0, Math.min(250, tappedY - 25))} 50 50`
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

    if (
        window.baikaTargetGesture &&
        typeof window.baikaTargetGesture
            .resetFineAdjustment === "function"
    ) {
        window.baikaTargetGesture
            .resetFineAdjustment();
    }

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

    const adjustedArrow = calculateArrowScore(
        photoGroupingArrows[index].x,
        photoGroupingArrows[index].y
    );

    photoGroupingArrows[index].val =
        adjustedArrow.val;
    photoGroupingArrows[index].score =
        adjustedArrow.score;
    photoGroupingArrows[index].isMiss =
        adjustedArrow.val === "M";
    photoGroupingArrows[index].targetAdjusted =
        true;

    renderGroupingPins();
    updateCurrentEndDisplay();

    window.dispatchEvent(
        new CustomEvent(
            "baika:target-pin-updated",
            {
                detail: {
                    index: index,
                    arrows: photoGroupingArrows.map(
                        function (arrow) {
                            return { ...arrow };
                        }
                    )
                }
            }
        )
    );

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

    const activeArrows =
        photoGroupingArrows.length > 0
            ? photoGroupingArrows
            : currentArrows;

    const groupingSource =
        registeredGroupingArrows.concat(activeArrows);

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
    updateCurrentEndDisplay();
}

window.syncPhotoPinsToGrouping =
    syncPhotoPinsToGrouping;

/**
 * 現在入力中の着弾と、合計・平均を画面へ反映する
 */
function getActiveInputArrows() {
    return photoGroupingArrows.length > 0
        ? photoGroupingArrows
        : currentArrows;
}

function updateTargetScoreSummary(arrows) {
    const summary = document.getElementById("v4TargetScoreSummary");
    if (!summary) return;

    const source = Array.isArray(arrows) ? arrows : getActiveInputArrows();

    if (source.length === 0) {
        summary.textContent = "着弾を入力すると得点を表示します";
        return;
    }

    const scoreLabels = source.map(function (arrow, index) {
        const label = arrow && arrow.val != null ? String(arrow.val) : "－";
        return `${index + 1}:${label}`;
    });

    const total = source.reduce(function (sum, arrow) {
        return sum + Number(arrow && arrow.score || 0);
    }, 0);

    const average = (total / source.length).toFixed(1);

    summary.textContent =
        `${scoreLabels.join("  ")}　｜　本数 ${source.length}　合計 ${total}　平均 ${average}`;
}

function updateCurrentEndDisplay() {
    const arrows = getActiveInputArrows();
    updateTargetScoreSummary(arrows);
    const preview = document.getElementById("v4ArrowsPreview");

    if (preview) {
        preview.innerHTML = "";

        arrows.forEach(function (arrow, index) {
            const slot = document.createElement("button");
            slot.type = "button";
            slot.className = "v4-arrow-slot is-filled";
            slot.disabled = true;

            if (arrow && arrow.val === "M") {
                slot.classList.add("is-miss");
            }

            const number = document.createElement("span");
            number.className = "v4-arrow-number";
            number.textContent = String(index + 1);

            const score = document.createElement("span");
            score.className = "v4-arrow-score";
            score.textContent = arrow && arrow.val != null
                ? String(arrow.val)
                : "－";

            slot.appendChild(number);
            slot.appendChild(score);
            preview.appendChild(slot);
        });

        if (arrows.length === 0) {
            const empty = document.createElement("div");
            empty.className = "v4-arrows-empty";
            empty.textContent = "まだ入力されていません";
            preview.appendChild(empty);
        }
    }

    const count = arrows.length;
    const total = arrows.reduce(function (sum, arrow) {
        return sum + Number(arrow && arrow.score || 0);
    }, 0);
    const average = count > 0 ? (total / count).toFixed(1) : "0.0";

    const countElement = document.getElementById("v4CurrentArrowCount");
    const totalElement = document.getElementById("v4CurrentArrowTotal");
    const averageElement = document.getElementById("v4CurrentArrowAverage");

    if (countElement) countElement.textContent = `${count}本`;
    if (totalElement) totalElement.textContent = String(total);
    if (averageElement) averageElement.textContent = average;

    updateScoreInputState();
}

/**
 * キーパッドから得点を入力する
 */
function handleScoreKeypadInput(value, score) {
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

/**
 * 保存済みの練習データをProject Zeroへ同期する
 *
 * @param {Array} practiceData
 * @param {Object} savedRecord
 */
function syncPracticeToProjectZero(
    practiceData,
    savedRecord
) {
    if (
        typeof setState !== "function" ||
        !savedRecord ||
        !Array.isArray(practiceData)
    ) {
        return;
    }

    const samePracticeRecords =
        practiceData.filter(function (record) {
            return (
                record &&
                record.date === savedRecord.date &&
                record.memberName === savedRecord.memberName &&
                record.distance === savedRecord.distance
            );
        });

    const totalScore =
        samePracticeRecords.reduce(
            function (sum, record) {
                return sum + Number(record.total || 0);
            },
            0
        );

    const arrowCount =
        samePracticeRecords.reduce(
            function (count, record) {
                if (Array.isArray(record.pins)) {
                    return count + record.pins.length;
                }

                const scoreKeys = [
                    "a1",
                    "a2",
                    "a3",
                    "a4",
                    "a5",
                    "a6"
                ];

                return (
                    count +
                    scoreKeys.filter(function (key) {
                        return (
                            record[key] !== undefined &&
                            record[key] !== null &&
                            record[key] !== ""
                        );
                    }).length
                );
            },
            0
        );

    const averageScore =
        arrowCount > 0
            ? Number(
                (totalScore / arrowCount).toFixed(2)
            )
            : 0;

    const previousLastPractice =
        typeof getState === "function"
            ? getState("lastPractice")
            : null;

    setState("lastPractice", {
        date: savedRecord.date,
        distance: savedRecord.distance,
        totalScore: totalScore,
        averageScore: averageScore,
        arrowCount: arrowCount,
        memo:
            previousLastPractice &&
            typeof previousLastPractice.memo === "string"
                ? previousLastPractice.memo
                : ""
    });

    setState("practice", {
        date: savedRecord.date,
        distance: savedRecord.distance,
        arrows: Array.isArray(savedRecord.pins)
            ? savedRecord.pins.map(function (arrow) {
                return { ...arrow };
            })
            : [],
        photoMode: true
    });

    console.log(
        "[Project Zero] 練習データを同期しました。",
        {
            date: savedRecord.date,
            distance: savedRecord.distance,
            totalScore: totalScore,
            averageScore: averageScore,
            arrowCount: arrowCount
        }
    );
}

async function registerPhotoPracticeEnd(photoPins) {
    if (!Array.isArray(photoPins)) {
        return false;
    }

    if (photoPins.length === 0) {
        window.alert("1本以上のピンを追加してください。");
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
                String(pin.score == null ? "M" : pin.score).toUpperCase();

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

        syncPracticeToProjectZero(
            practiceData,
            record
        );

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
 * 写真入力の任意本数で現在入力中の着弾を直接置き換える
 * 確認ダイアログは表示しない
 */
function replaceCurrentEndFromPhoto(photoPins) {
    if (!Array.isArray(photoPins)) {
        return false;
    }

    if (
        photoPins.length < 1 ||
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
    const arrows = getActiveInputArrows();

    if (arrows.length === 0) {
        return;
    }

    const shouldClear = window.confirm(
        `現在入力中の${arrows.length}本をすべてクリアしますか？`
    );

    if (!shouldClear) {
        return;
    }

    currentArrows = [];
    photoGroupingArrows = [];

    if (
        window.baikaTargetGesture &&
        typeof window.baikaTargetGesture.clearPinSelection === "function"
    ) {
        window.baikaTargetGesture.clearPinSelection();
    }

    resetTargetZoom();
    renderTargetPins();
    renderGroupingPins();
    updateCurrentEndDisplay();
    updateScoreInputState();
}

/**
 * 入力の有無に応じて、
 * キーパッドと登録ボタンの状態を更新する
 */
function updateScoreInputState() {
    const arrows = getActiveInputArrows();
    const hasArrows = arrows.length > 0;

    document.querySelectorAll(".v4-score-key").forEach(function (button) {
        button.disabled = false;
    });

    const registerButton = document.getElementById("v4RegisterCurrentEnd");
    if (registerButton) registerButton.disabled = !hasArrows;

    const adjustedRegisterButton = document.getElementById("v4RegisterAdjustedArrows");
    if (adjustedRegisterButton) adjustedRegisterButton.disabled = !hasArrows;

    const clearButton = document.getElementById("v4ClearCurrentEnd");
    if (clearButton) clearButton.disabled = !hasArrows;
}

function registerCurrentGrouping() {
    const arrows = getActiveInputArrows();
    if (arrows.length === 0) return false;

    registeredGroupingArrows = registeredGroupingArrows.concat(
        arrows.map(function (arrow) { return { ...arrow }; })
    );

    currentArrows = [];
    photoGroupingArrows = [];

    if (window.baikaTargetGesture && typeof window.baikaTargetGesture.clearPinSelection === "function") {
        window.baikaTargetGesture.clearPinSelection();
    }

    renderTargetPins();
    renderGroupingPins();
    updateCurrentEndDisplay();
    resetTargetZoom();

    const message = document.getElementById("v4PinRegisterMessage");
    if (message) {
        message.textContent = `✓ ${arrows.length}本を登録しました`;
        window.setTimeout(function () {
            if (message.textContent.indexOf("登録しました") >= 0) message.textContent = "";
        }, 1200);
    }

    window.dispatchEvent(new CustomEvent("baika:grouping-registered", {
        detail: {
            count: arrows.length,
            registeredArrows: registeredGroupingArrows.map(function (arrow) { return { ...arrow }; })
        }
    }));
    return true;
}

function bindUnlimitedGroupingRegistration() {
    [
        "v4RegisterAdjustedArrows",
        "v4RegisterCurrentEnd"
    ].forEach(function (buttonId) {
        const button = document.getElementById(buttonId);
        if (!button || button.dataset.bound) return;

        button.dataset.bound = "true";
        button.addEventListener("click", registerCurrentGrouping);
    });
}

document.addEventListener("DOMContentLoaded", bindUnlimitedGroupingRegistration);
window.registerCurrentGrouping = registerCurrentGrouping;

