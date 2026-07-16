"use strict";

/*
 * Baika Archery System Ver4
 * Step34-1 Arrow Candidate Detector
 *
 * 初期試作:
 * 緑色のノック／羽根を画像処理で抽出し、
 * 矢候補の位置を返す。
 *
 * この段階では着弾点や得点を自動確定しない。
 */

(function () {
    function createWorkCanvas(image, maxSide) {
        const naturalWidth =
            Number(image.naturalWidth || image.width);

        const naturalHeight =
            Number(image.naturalHeight || image.height);

        if (!naturalWidth || !naturalHeight) {
            throw new Error(
                "画像サイズを取得できません。"
            );
        }

        const scale =
            Math.min(
                1,
                maxSide /
                Math.max(
                    naturalWidth,
                    naturalHeight
                )
            );

        const width =
            Math.max(
                1,
                Math.round(naturalWidth * scale)
            );

        const height =
            Math.max(
                1,
                Math.round(naturalHeight * scale)
            );

        const canvas =
            document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context =
            canvas.getContext(
                "2d",
                {
                    willReadFrequently: true
                }
            );

        if (!context) {
            throw new Error(
                "Canvasを初期化できません。"
            );
        }

        context.drawImage(
            image,
            0,
            0,
            width,
            height
        );

        return {
            canvas,
            context,
            width,
            height,
            scale,
            naturalWidth,
            naturalHeight
        };
    }

    function isGreenCandidate(r, g, b) {
        const maxValue =
            Math.max(r, g, b);

        const minValue =
            Math.min(r, g, b);

        const saturation =
            maxValue - minValue;

        return (
            g >= 90 &&
            g >= r * 1.12 &&
            g >= b * 1.03 &&
            saturation >= 32 &&
            (
                g - r >= 18 ||
                g - b >= 12
            )
        );
    }

    function buildMask(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        const mask =
            new Uint8Array(width * height);

        for (
            let index = 0;
            index < width * height;
            index += 1
        ) {
            const offset = index * 4;
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];

            if (isGreenCandidate(r, g, b)) {
                mask[index] = 1;
            }
        }

        return mask;
    }

    function findComponents(
        mask,
        width,
        height
    ) {
        const visited =
            new Uint8Array(mask.length);

        const components = [];
        const directions = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],           [1, 0],
            [-1, 1],  [0, 1],  [1, 1]
        ];

        const stackX = [];
        const stackY = [];

        for (let y = 0; y < height; y += 1) {
            for (let x = 0; x < width; x += 1) {
                const startIndex =
                    y * width + x;

                if (
                    !mask[startIndex] ||
                    visited[startIndex]
                ) {
                    continue;
                }

                let area = 0;
                let sumX = 0;
                let sumY = 0;
                let minX = x;
                let maxX = x;
                let minY = y;
                let maxY = y;

                stackX.length = 0;
                stackY.length = 0;
                stackX.push(x);
                stackY.push(y);
                visited[startIndex] = 1;

                while (stackX.length > 0) {
                    const currentX =
                        stackX.pop();

                    const currentY =
                        stackY.pop();

                    area += 1;
                    sumX += currentX;
                    sumY += currentY;
                    minX =
                        Math.min(minX, currentX);
                    maxX =
                        Math.max(maxX, currentX);
                    minY =
                        Math.min(minY, currentY);
                    maxY =
                        Math.max(maxY, currentY);

                    directions.forEach(
                        function (direction) {
                            const nextX =
                                currentX +
                                direction[0];

                            const nextY =
                                currentY +
                                direction[1];

                            if (
                                nextX < 0 ||
                                nextY < 0 ||
                                nextX >= width ||
                                nextY >= height
                            ) {
                                return;
                            }

                            const nextIndex =
                                nextY * width +
                                nextX;

                            if (
                                !mask[nextIndex] ||
                                visited[nextIndex]
                            ) {
                                return;
                            }

                            visited[nextIndex] = 1;
                            stackX.push(nextX);
                            stackY.push(nextY);
                        }
                    );
                }

                components.push({
                    area,
                    centerX: sumX / area,
                    centerY: sumY / area,
                    minX,
                    maxX,
                    minY,
                    maxY,
                    width: maxX - minX + 1,
                    height: maxY - minY + 1
                });
            }
        }

        return components;
    }

    function mergeNearby(
        components,
        distance
    ) {
        const remaining =
            components.slice();

        const merged = [];

        while (remaining.length > 0) {
            const seed = remaining.shift();
            const group = [seed];

            for (
                let index =
                    remaining.length - 1;
                index >= 0;
                index -= 1
            ) {
                const item = remaining[index];

                if (
                    Math.hypot(
                        item.centerX -
                            seed.centerX,
                        item.centerY -
                            seed.centerY
                    ) <= distance
                ) {
                    group.push(item);
                    remaining.splice(index, 1);
                }
            }

            const totalArea =
                group.reduce(
                    function (sum, item) {
                        return sum + item.area;
                    },
                    0
                );

            merged.push({
                area: totalArea,
                centerX:
                    group.reduce(
                        function (sum, item) {
                            return (
                                sum +
                                item.centerX *
                                item.area
                            );
                        },
                        0
                    ) / totalArea,
                centerY:
                    group.reduce(
                        function (sum, item) {
                            return (
                                sum +
                                item.centerY *
                                item.area
                            );
                        },
                        0
                    ) / totalArea
            });
        }

        return merged;
    }

    function detect(image, options) {
        const settings =
            Object.assign(
                {
                    maxSide: 900,
                    maxCandidates: 12
                },
                options || {}
            );

        const work =
            createWorkCanvas(
                image,
                settings.maxSide
            );

        const imageData =
            work.context.getImageData(
                0,
                0,
                work.width,
                work.height
            );

        const mask =
            buildMask(imageData);

        const rawComponents =
            findComponents(
                mask,
                work.width,
                work.height
            );

        const minimumArea =
            Math.max(
                3,
                Math.round(
                    work.width *
                    work.height *
                    0.000004
                )
            );

        const filtered =
            rawComponents.filter(
                function (component) {
                    return (
                        component.area >=
                            minimumArea &&
                        component.area <=
                            work.width *
                            work.height *
                            0.004 &&
                        component.width <=
                            work.width * 0.12 &&
                        component.height <=
                            work.height * 0.12
                    );
                }
            );

        const merged =
            mergeNearby(
                filtered,
                Math.max(
                    7,
                    work.width * 0.012
                )
            );

        return merged
            .sort(function (a, b) {
                return b.area - a.area;
            })
            .slice(
                0,
                settings.maxCandidates
            )
            .map(function (
                candidate,
                index
            ) {
                return {
                    id: index + 1,
                    x:
                        candidate.centerX /
                        work.scale,
                    y:
                        candidate.centerY /
                        work.scale,
                    confidence:
                        Math.min(
                            0.99,
                            0.45 +
                            Math.log10(
                                candidate.area + 1
                            ) * 0.18
                        ),
                    area: candidate.area
                };
            });
    }

    window.BaikaArrowCandidateDetector = {
        detect
    };
})();
