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

    resetTargetZoom();
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
        if (arrow.val === "M") {
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