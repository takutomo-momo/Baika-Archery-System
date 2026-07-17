"use strict";

/*
 * Baika Archery System Ver4
 * Step35-4a Arrow Candidate Detector
 * 写真上で選択したノック／羽根色に近い領域を検出する。
 * この段階では候補表示のみで、自動登録は行わない。
 */
(function () {
    function createWorkCanvas(image, maxSide) {
        const naturalWidth = Number(image.naturalWidth || image.width);
        const naturalHeight = Number(image.naturalHeight || image.height);
        if (!naturalWidth || !naturalHeight) throw new Error("画像サイズを取得できません。");

        const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
        const width = Math.max(1, Math.round(naturalWidth * scale));
        const height = Math.max(1, Math.round(naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvasを初期化できません。");
        context.drawImage(image, 0, 0, width, height);
        return { context, width, height, scale, naturalWidth, naturalHeight };
    }

    function rgbToHsv(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        let h = 0;
        if (delta !== 0) {
            if (max === r) h = 60 * (((g - b) / delta) % 6);
            else if (max === g) h = 60 * (((b - r) / delta) + 2);
            else h = 60 * (((r - g) / delta) + 4);
        }
        if (h < 0) h += 360;
        return { h, s: max === 0 ? 0 : delta / max, v: max };
    }

    function hueDistance(a, b) {
        const d = Math.abs(a - b);
        return Math.min(d, 360 - d);
    }

    function buildColorMask(imageData, targetColor, tolerance) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const mask = new Uint8Array(width * height);
        const target = rgbToHsv(targetColor.r, targetColor.g, targetColor.b);
        const hueTolerance = Number(tolerance && tolerance.hue) || 24;
        const saturationTolerance = Number(tolerance && tolerance.saturation) || 0.34;
        const valueTolerance = Number(tolerance && tolerance.value) || 0.38;
        const rgbTolerance = Number(tolerance && tolerance.rgb) || 105;

        for (let index = 0; index < width * height; index += 1) {
            const offset = index * 4;
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            const hsv = rgbToHsv(r, g, b);
            const rgbDistance = Math.hypot(r - targetColor.r, g - targetColor.g, b - targetColor.b);

            let match;
            if (target.s < 0.18) {
                // 白・灰・黒系は色相が不安定なのでRGBと明るさを中心に比較する。
                match = rgbDistance <= rgbTolerance && Math.abs(hsv.v - target.v) <= 0.30;
            } else {
                match = hueDistance(hsv.h, target.h) <= hueTolerance
                    && Math.abs(hsv.s - target.s) <= saturationTolerance
                    && Math.abs(hsv.v - target.v) <= valueTolerance
                    && rgbDistance <= rgbTolerance * 1.45;
            }
            if (match) mask[index] = 1;
        }
        return mask;
    }

    function findComponents(mask, width, height) {
        const visited = new Uint8Array(mask.length);
        const components = [];
        const directions = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
        const stack = [];

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const start = y * width + x;
                if (!mask[start] || visited[start]) continue;
                let area = 0, sumX = 0, sumY = 0, minX = x, maxX = x, minY = y, maxY = y;
                stack.length = 0;
                stack.push([x, y]);
                visited[start] = 1;
                while (stack.length) {
                    const point = stack.pop();
                    const cx = point[0], cy = point[1];
                    area += 1; sumX += cx; sumY += cy;
                    minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
                    minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
                    directions.forEach(function (d) {
                        const nx = cx + d[0], ny = cy + d[1];
                        if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
                        const ni = ny * width + nx;
                        if (!mask[ni] || visited[ni]) return;
                        visited[ni] = 1;
                        stack.push([nx, ny]);
                    });
                }
                components.push({
                    area,
                    centerX: sumX / area,
                    centerY: sumY / area,
                    minX, maxX, minY, maxY,
                    width: maxX - minX + 1,
                    height: maxY - minY + 1
                });
            }
        }
        return components;
    }

    function mergeNearby(components, distance) {
        const remaining = components.slice();
        const merged = [];
        while (remaining.length) {
            const seed = remaining.shift();
            const group = [seed];
            for (let i = remaining.length - 1; i >= 0; i -= 1) {
                const item = remaining[i];
                if (Math.hypot(item.centerX - seed.centerX, item.centerY - seed.centerY) <= distance) {
                    group.push(item);
                    remaining.splice(i, 1);
                }
            }
            const area = group.reduce(function (sum, item) { return sum + item.area; }, 0);
            merged.push({
                area,
                centerX: group.reduce(function (sum, item) { return sum + item.centerX * item.area; }, 0) / area,
                centerY: group.reduce(function (sum, item) { return sum + item.centerY * item.area; }, 0) / area
            });
        }
        return merged;
    }

    function detect(image, options) {
        const settings = Object.assign({ maxSide: 900, maxCandidates: 12, targetColor: null }, options || {});
        if (!settings.targetColor) throw new Error("検出するノック色が選択されていません。");
        const work = createWorkCanvas(image, settings.maxSide);
        const imageData = work.context.getImageData(0, 0, work.width, work.height);
        const mask = buildColorMask(imageData, settings.targetColor, settings.colorTolerance);
        const raw = findComponents(mask, work.width, work.height);
        const imageArea = work.width * work.height;
        const minimumArea = Math.max(3, Math.round(imageArea * 0.000004));
        const filtered = raw.filter(function (component) {
            return component.area >= minimumArea
                && component.area <= imageArea * 0.006
                && component.width <= work.width * 0.16
                && component.height <= work.height * 0.16;
        });
        const merged = mergeNearby(filtered, Math.max(7, work.width * 0.012));
        return merged
            .sort(function (a, b) { return b.area - a.area; })
            .slice(0, settings.maxCandidates)
            .map(function (candidate, index) {
                return {
                    id: index + 1,
                    x: candidate.centerX / work.scale,
                    y: candidate.centerY / work.scale,
                    confidence: Math.min(0.99, 0.45 + Math.log10(candidate.area + 1) * 0.18),
                    area: candidate.area,
                    impactX: candidate.centerX / work.scale,
                    impactY: candidate.centerY / work.scale
                };
            });
    }

    window.BaikaArrowCandidateDetector = { detect };
})();
