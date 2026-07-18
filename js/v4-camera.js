"use strict";

/*
 * Baika Archery System Ver4
 * Step35-5: ノック＋羽3枚の矢プロフィール登録
 * 写真はIndexedDB（端末内）だけに保存し、クラウド送信しない。
 */
(function () {
    const DB_NAME = "baika-archery-local";
    const DB_VERSION = 1;
    const STORE_NAME = "targetPhotos";

    let stream = null;
    let sessionCount = 0;
    let lastCaptureId = null;
    let databasePromise = null;
    let captureInProgress = false;
    let sessionId = "";
    let messageTimer = null;
    let listObjectUrls = [];
    let previewObjectUrl = null;
    let currentPreviewPhoto = null;
    let analysisInProgress = false;
    let selectedArrowColor = null;
    let selectedColorPoint = null;
    let arrowProfile = null;
    let profileDraft = null;
    let profileEditing = false;
    let profileStepIndex = 0;
    let previewZoom = { scale: 1, x: 0, y: 0 };
    let previewGesture = null;
    let suppressPreviewTapUntil = 0;
    const PROFILE_PARTS = ["nock", "vane1", "vane2", "vane3"];
    const PROFILE_LABELS = { nock: "ノック", vane1: "羽①", vane2: "羽②", vane3: "羽③" };

    document.addEventListener("DOMContentLoaded", initializeCameraMode);

    function initializeCameraMode() {
        const el = getElements();
        if (!el.open || !el.modal || !el.video) return;

        el.open.addEventListener("click", openCamera);
        el.close.addEventListener("click", closeCamera);
        el.finish.addEventListener("click", closeCamera);
        el.capture.addEventListener("click", capturePhoto);
        el.deleteLast.addEventListener("click", deleteLastCapture);
        if (el.openList) el.openList.addEventListener("click", openPhotoList);
        if (el.closeList) el.closeList.addEventListener("click", closePhotoList);
        if (el.closePreview) el.closePreview.addEventListener("click", closePhotoPreview);
        if (el.analyzeSaved) el.analyzeSaved.addEventListener("click", analyzeSavedPhoto);
        // PCはclick、iPhoneはtouchendから直接色取得する。
        // touchstartでpreventDefaultするため、iPhoneでは合成clickが発生しない場合がある。
        if (el.savedPreview) el.savedPreview.addEventListener("click", selectArrowColorFromPhoto);
        if (el.zoomIn) el.zoomIn.addEventListener("click", function () { setPreviewZoom(previewZoom.scale + 0.5); });
        if (el.zoomOut) el.zoomOut.addEventListener("click", function () { setPreviewZoom(previewZoom.scale - 0.5); });
        if (el.zoomReset) el.zoomReset.addEventListener("click", resetPreviewZoom);
        initializePreviewGestures(el);
        if (el.resetColor) el.resetColor.addEventListener("click", resetSelectedArrowColor);
        if (el.startProfile) el.startProfile.addEventListener("click", startArrowProfileEditing);
        if (el.cancelProfile) el.cancelProfile.addEventListener("click", cancelArrowProfileEditing);
        if (el.saveProfile) el.saveProfile.addEventListener("click", saveArrowProfile);
        if (el.profileSlots) el.profileSlots.addEventListener("click", selectProfilePart);

        el.modal.addEventListener("click", function (event) {
            if (event.target === el.modal) closeCamera();
        });
        if (el.listModal) el.listModal.addEventListener("click", function (event) {
            if (event.target === el.listModal) closePhotoList();
        });
        if (el.previewModal) el.previewModal.addEventListener("click", function (event) {
            if (event.target === el.previewModal) closePhotoPreview();
        });

        document.addEventListener("visibilitychange", function () {
            if (document.hidden && !el.modal.hidden) stopCameraStream();
        });

        refreshCounts();
    }

    async function openCamera() {
        const el = getElements();

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            window.alert("このブラウザではアプリ内カメラを利用できません。GitHub PagesのHTTPS画面をSafariまたはChromeで開いてください。");
            return;
        }

        sessionCount = 0;
        lastCaptureId = null;
        captureInProgress = false;
        sessionId = createSessionId();
        el.sessionCount.textContent = "0";
        el.deleteLast.disabled = true;
        el.capture.disabled = true;
        el.message.textContent = "カメラを準備しています…";
        el.modal.hidden = false;
        document.body.classList.add("v4-camera-open");

        try {
            stream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    facingMode: { ideal: "environment" },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            el.video.srcObject = stream;
            await el.video.play();
            el.capture.disabled = false;
            el.message.textContent = "的の外周を円に合わせて撮影";
        } catch (error) {
            console.error("Camera start failed:", error);
            el.message.textContent = "カメラを開始できませんでした。";
            window.alert("カメラを開始できませんでした。ブラウザのカメラ許可を確認してください。");
            closeCamera();
        }
    }

    function closeCamera() {
        const el = getElements();
        stopCameraStream();
        el.modal.hidden = true;
        document.body.classList.remove("v4-camera-open");
    }

    async function openPhotoList() {
        const el = getElements();
        if (!el.listModal) return;
        el.listModal.hidden = false;
        document.body.classList.add("v4-camera-open");
        await renderPhotoList();
    }

    function closePhotoList() {
        const el = getElements();
        if (el.listModal) el.listModal.hidden = true;
        revokeListObjectUrls();
        document.body.classList.remove("v4-camera-open");
    }

    async function renderPhotoList() {
        const el = getElements();
        if (!el.listGrid) return;
        revokeListObjectUrls();
        el.listGrid.innerHTML = "";
        try {
            const photos = await getAllPhotos();
            photos.sort(function (a, b) { return String(b.createdAt || "").localeCompare(String(a.createdAt || "")); });
            const pending = photos.filter(function (photo) { return photo.status !== "complete"; }).length;
            el.listTotal.textContent = String(photos.length);
            el.listPending.textContent = String(pending);
            el.listEmpty.hidden = photos.length !== 0;
            el.listGrid.hidden = photos.length === 0;

            photos.forEach(function (photo) {
                const url = URL.createObjectURL(photo.blob);
                listObjectUrls.push(url);
                const card = document.createElement("button");
                card.type = "button";
                card.className = "v4-photo-card";
                const statusText = photo.status === "complete" ? "入力済み" : "未入力";
                const statusClass = photo.status === "complete" ? " is-complete" : "";
                const analysisText = photo.aiStatus === "analyzed" ? "AI解析済み" : "未解析";
                const analysisClass = photo.aiStatus === "analyzed" ? " is-analyzed" : "";
                card.innerHTML = '<img class="v4-photo-card-image" alt="End ' + escapeHtml(photo.endNumber) + ' の的写真">'
                    + '<div class="v4-photo-card-body">'
                    + '<div class="v4-photo-card-title"><span>📷 End ' + escapeHtml(photo.endNumber) + '</span><span class="v4-photo-card-status' + statusClass + '">' + statusText + '</span></div>'
                    + '<div class="v4-photo-card-badges"><span class="v4-photo-card-analysis' + analysisClass + '">' + analysisText + '</span></div>'
                    + '<div class="v4-photo-card-meta"><span>🕒 ' + formatDateTime(photo.createdAt) + '</span><span>🎯 ' + escapeHtml(photo.distance || "距離未設定") + '</span></div>'
                    + '</div>';
                card.querySelector("img").src = url;
                card.addEventListener("click", function () { openPhotoPreview(photo); });
                el.listGrid.appendChild(card);
            });
        } catch (error) {
            console.error("Photo list failed:", error);
            window.alert("撮影済み一覧を読み込めませんでした。");
        }
    }

    function openPhotoPreview(photo) {
        const el = getElements();
        if (!el.previewModal || !photo || !photo.blob) return;
        closePhotoPreview();
        currentPreviewPhoto = photo;
        previewObjectUrl = URL.createObjectURL(photo.blob);
        el.savedPreview.src = previewObjectUrl;
        el.savedTitle.textContent = "End " + (photo.endNumber || "-");
        el.savedDetails.textContent = formatDateTime(photo.createdAt) + " ／ " + (photo.distance || "距離未設定") + " ／ " + (photo.status === "complete" ? "入力済み" : "未入力");
        arrowProfile = loadArrowProfile(photo.memberName);
        profileDraft = cloneArrowProfile(arrowProfile);
        profileEditing = false;
        profileStepIndex = 0;
        selectedArrowColor = normalizeColor(photo.selectedArrowColor)
            || normalizeColor(arrowProfile && arrowProfile.nock && arrowProfile.nock.color)
            || loadMemberArrowColor(photo.memberName);
        selectedColorPoint = photo.selectedColorPoint || null;
        updateArrowProfileUI();
        updateColorSelectionUI();
        el.analysisStatus.textContent = selectedArrowColor
            ? (photo.aiStatus === "analyzed"
                ? "前回の解析結果：矢候補 " + ((photo.aiCandidates || []).length) + "件。色を変更すると再解析できます。"
                : "選択した色で解析できます。")
            : "先に写真内のノック／羽根をタップしてください。";
        el.analyzeSaved.disabled = !selectedArrowColor;
        el.analyzeSaved.textContent = photo.aiStatus === "analyzed" ? "✨ 再解析する" : "✨ AI解析開始";
        resetPreviewZoom();
        el.previewModal.hidden = false;
        el.savedPreview.onload = function () {
            resetPreviewZoom();
            updateColorSelectionUI();
            if (currentPreviewPhoto && currentPreviewPhoto.aiStatus === "analyzed") {
                renderSavedCandidates(currentPreviewPhoto.aiCandidates || []);
            }
        };
    }

    function closePhotoPreview() {
        const el = getElements();
        if (el.previewModal) el.previewModal.hidden = true;
        if (el.savedPreview) {
            el.savedPreview.onload = null;
            el.savedPreview.removeAttribute("src");
        }
        clearSavedCandidates();
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
        currentPreviewPhoto = null;
        analysisInProgress = false;
        selectedArrowColor = null;
        selectedColorPoint = null;
        arrowProfile = null;
        profileDraft = null;
        profileEditing = false;
        profileStepIndex = 0;
        resetPreviewZoom();
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function applyPreviewTransform() {
        const el = getElements();
        if (!el.zoomContent) return;
        previewZoom.scale = clamp(previewZoom.scale, 1, 5);
        if (previewZoom.scale === 1) {
            previewZoom.x = 0;
            previewZoom.y = 0;
        }
        el.zoomContent.style.transform = "translate3d(" + previewZoom.x + "px," + previewZoom.y + "px,0) scale(" + previewZoom.scale + ")";
        if (el.zoomReset) el.zoomReset.textContent = Math.round(previewZoom.scale * 100) + "%";
    }

    function setPreviewZoom(nextScale, centerX, centerY) {
        const el = getElements();
        if (!el.analysisStage || !el.zoomContent) return;
        const oldScale = previewZoom.scale;
        const scale = clamp(nextScale, 1, 5);
        if (scale === oldScale) return;
        const rect = el.analysisStage.getBoundingClientRect();
        const cx = Number.isFinite(centerX) ? centerX - rect.left - rect.width / 2 : 0;
        const cy = Number.isFinite(centerY) ? centerY - rect.top - rect.height / 2 : 0;
        const ratio = scale / oldScale;
        previewZoom.x = cx - (cx - previewZoom.x) * ratio;
        previewZoom.y = cy - (cy - previewZoom.y) * ratio;
        previewZoom.scale = scale;
        applyPreviewTransform();
    }

    function resetPreviewZoom() {
        previewZoom = { scale: 1, x: 0, y: 0 };
        applyPreviewTransform();
    }

    function touchDistance(a, b) {
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function touchCenter(a, b) {
        return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
    }

    function initializePreviewGestures(el) {
        if (!el.analysisStage) return;
        el.analysisStage.addEventListener("touchstart", function (event) {
            if (event.target.closest && event.target.closest(".v4-photo-zoom-controls")) return;
            if (event.touches.length === 2) {
                const center = touchCenter(event.touches[0], event.touches[1]);
                previewGesture = { type: "pinch", distance: touchDistance(event.touches[0], event.touches[1]), scale: previewZoom.scale, centerX: center.x, centerY: center.y };
                event.preventDefault();
            } else if (event.touches.length === 1) {
                previewGesture = { type: "pan", startX: event.touches[0].clientX, startY: event.touches[0].clientY, x: previewZoom.x, y: previewZoom.y, moved: false };
                event.preventDefault();
            }
        }, { passive: false });
        el.analysisStage.addEventListener("touchmove", function (event) {
            if (!previewGesture) return;
            if (previewGesture.type === "pinch" && event.touches.length === 2) {
                const distance = touchDistance(event.touches[0], event.touches[1]);
                const center = touchCenter(event.touches[0], event.touches[1]);
                previewGesture.moved = true;
                setPreviewZoom(previewGesture.scale * distance / Math.max(1, previewGesture.distance), center.x, center.y);
                suppressPreviewTapUntil = Date.now() + 350;
                event.preventDefault();
            } else if (previewGesture.type === "pan" && event.touches.length === 1) {
                const dx = event.touches[0].clientX - previewGesture.startX;
                const dy = event.touches[0].clientY - previewGesture.startY;
                const distance = Math.hypot(dx, dy);
                if (distance > 5) {
                    previewGesture.moved = true;
                    previewZoom.x = previewGesture.x + dx;
                    previewZoom.y = previewGesture.y + dy;
                    applyPreviewTransform();
                    suppressPreviewTapUntil = Date.now() + 350;
                }
                event.preventDefault();
            }
        }, { passive: false });
        el.analysisStage.addEventListener("touchend", function (event) {
            const gesture = previewGesture;
            previewGesture = null;
            if (!gesture) return;

            if (gesture.moved || gesture.type === "pinch") {
                suppressPreviewTapUntil = Date.now() + 350;
                return;
            }

            // iPhone SafariではtouchstartのpreventDefaultによりclickが出ないため、
            // 移動していない1本指操作をここで明示的に「タップ」として処理する。
            const touch = event.changedTouches && event.changedTouches[0];
            if (gesture.type === "pan" && touch) {
                selectArrowColorFromPhoto({
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    fromTouch: true
                });
                suppressPreviewTapUntil = Date.now() + 350;
            }
        }, { passive: true });
    }

    async function analyzeSavedPhoto() {
        const el = getElements();
        if (analysisInProgress || !currentPreviewPhoto || !el.savedPreview) return;
        if (!window.BaikaArrowCandidateDetector || typeof window.BaikaArrowCandidateDetector.detect !== "function") {
            window.alert("矢候補検出プログラムを読み込めませんでした。ページを再読み込みしてください。");
            return;
        }

        if (!selectedArrowColor) {
            el.analysisStatus.textContent = "先に写真内のノック／羽根をタップしてください。";
            return;
        }

        analysisInProgress = true;
        el.analyzeSaved.disabled = true;
        el.analyzeSaved.textContent = "解析中…";
        el.analysisStatus.textContent = "選択した色に近いノック／羽根を探しています…";
        clearSavedCandidates();

        try {
            await waitForImage(el.savedPreview);
            await nextPaint();
            const candidates = window.BaikaArrowCandidateDetector.detect(el.savedPreview, {
                maxSide: 900,
                maxCandidates: 12,
                targetColor: selectedArrowColor
            });
            renderSavedCandidates(candidates);

            currentPreviewPhoto.aiCandidates = candidates;
            currentPreviewPhoto.selectedArrowColor = selectedArrowColor;
            currentPreviewPhoto.selectedColorPoint = selectedColorPoint;
            currentPreviewPhoto.aiStatus = "analyzed";
            currentPreviewPhoto.analyzedAt = new Date().toISOString();
            await putPhoto(currentPreviewPhoto);

            if (candidates.length > 0) {
                el.analysisStatus.textContent = "解析完了：矢候補を " + candidates.length + " 件表示しました。";
            } else {
                el.analysisStatus.textContent = "解析完了：選択した色の矢候補は見つかりませんでした。色の選択位置を変えてお試しください。";
            }
            el.analyzeSaved.textContent = "✨ 再解析する";
            if (el.listModal && !el.listModal.hidden) await renderPhotoList();
        } catch (error) {
            console.error("Saved photo analysis failed:", error);
            el.analysisStatus.textContent = "解析に失敗しました。もう一度お試しください。";
            el.analyzeSaved.textContent = "✨ AI解析開始";
        } finally {
            analysisInProgress = false;
            el.analyzeSaved.disabled = !selectedArrowColor;
        }
    }

    function waitForImage(image) {
        if (image.complete && image.naturalWidth > 0) return Promise.resolve();
        return new Promise(function (resolve, reject) {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", function () { reject(new Error("画像を読み込めませんでした。")); }, { once: true });
        });
    }

    function nextPaint() {
        return new Promise(function (resolve) {
            window.requestAnimationFrame(function () { window.requestAnimationFrame(resolve); });
        });
    }

    function getContainedImageRect(image, useViewportCoordinates) {
        const naturalWidth = image.naturalWidth || 1;
        const naturalHeight = image.naturalHeight || 1;
        const box = useViewportCoordinates
            ? image.getBoundingClientRect()
            : { left: image.offsetLeft, top: image.offsetTop, width: image.clientWidth, height: image.clientHeight };
        const scale = Math.min(box.width / naturalWidth, box.height / naturalHeight);
        const width = naturalWidth * scale;
        const height = naturalHeight * scale;
        return {
            left: box.left + (box.width - width) / 2,
            top: box.top + (box.height - height) / 2,
            width: width,
            height: height
        };
    }

    function selectArrowColorFromPhoto(event) {
        if (!event.fromTouch && Date.now() < suppressPreviewTapUntil) return;
        const el = getElements();
        if (!currentPreviewPhoto || !el.savedPreview || !el.savedPreview.naturalWidth) return;

        // object-fit:contain の余白を除いた、実際に写真が描画されている範囲を使う。
        const rect = getContainedImageRect(el.savedPreview, true);
        const rawX = event.clientX - rect.left;
        const rawY = event.clientY - rect.top;
        if (rawX < 0 || rawY < 0 || rawX > rect.width || rawY > rect.height) return;
        const localX = Math.max(0, Math.min(rect.width, rawX));
        const localY = Math.max(0, Math.min(rect.height, rawY));
        const imageX = Math.max(0, Math.min(el.savedPreview.naturalWidth - 1, Math.round(localX / rect.width * el.savedPreview.naturalWidth)));
        const imageY = Math.max(0, Math.min(el.savedPreview.naturalHeight - 1, Math.round(localY / rect.height * el.savedPreview.naturalHeight)));

        try {
            const canvas = document.createElement("canvas");
            canvas.width = el.savedPreview.naturalWidth;
            canvas.height = el.savedPreview.naturalHeight;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            context.drawImage(el.savedPreview, 0, 0);

            // ノックは画面上では小さいため、単純平均すると周囲の的・畳の色に負ける。
            // タップ周辺から「背景色との差が大きく、中心に近い色」を探し、その色だけを平均する。
            const radius = 8;
            const startX = Math.max(0, imageX - radius);
            const startY = Math.max(0, imageY - radius);
            const width = Math.min(canvas.width - startX, radius * 2 + 1);
            const height = Math.min(canvas.height - startY, radius * 2 + 1);
            const imageData = context.getImageData(startX, startY, width, height);
            const pixels = imageData.data;

            function pixelAt(x, y) {
                const offset = (y * width + x) * 4;
                return { r: pixels[offset], g: pixels[offset + 1], b: pixels[offset + 2] };
            }
            function distance(a, b) {
                return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
            }

            // 外周は背景である可能性が高いので、外周画素の中央値を背景色とする。
            const borderR = [], borderG = [], borderB = [];
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    if (x !== 0 && y !== 0 && x !== width - 1 && y !== height - 1) continue;
                    const color = pixelAt(x, y);
                    borderR.push(color.r); borderG.push(color.g); borderB.push(color.b);
                }
            }
            function median(values) {
                values.sort(function (a, b) { return a - b; });
                return values[Math.floor(values.length / 2)];
            }
            const background = { r: median(borderR), g: median(borderG), b: median(borderB) };

            const centerX = Math.min(width - 1, imageX - startX);
            const centerY = Math.min(height - 1, imageY - startY);
            let seed = pixelAt(centerX, centerY);
            let bestScore = -Infinity;
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    const color = pixelAt(x, y);
                    const centerDistance = Math.hypot(x - centerX, y - centerY);
                    const backgroundDistance = distance(color, background);
                    const score = backgroundDistance - centerDistance * 8;
                    if (score > bestScore) {
                        bestScore = score;
                        seed = color;
                    }
                }
            }

            // 選んだ種色に近い画素だけを平均し、背景の混入を防ぐ。
            let r = 0, g = 0, b = 0, count = 0;
            const seedTolerance = 72;
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    const color = pixelAt(x, y);
                    if (distance(color, seed) > seedTolerance) continue;
                    if (Math.hypot(x - centerX, y - centerY) > radius) continue;
                    r += color.r; g += color.g; b += color.b; count += 1;
                }
            }
            if (!count) { r = seed.r; g = seed.g; b = seed.b; count = 1; }
            selectedArrowColor = {
                r: Math.round(r / count),
                g: Math.round(g / count),
                b: Math.round(b / count)
            };
            selectedColorPoint = {
                x: imageX,
                y: imageY,
                normalizedX: imageX / el.savedPreview.naturalWidth,
                normalizedY: imageY / el.savedPreview.naturalHeight
            };

            if (profileEditing) {
                applyColorToProfileDraft(selectedArrowColor, selectedColorPoint);
                clearSavedCandidates();
                updateArrowProfileUI();
                updateColorSelectionUI();
                return;
            }

            currentPreviewPhoto.selectedArrowColor = selectedArrowColor;
            currentPreviewPhoto.selectedColorPoint = selectedColorPoint;
            saveMemberArrowColor(currentPreviewPhoto.memberName, selectedArrowColor);
            putPhoto(currentPreviewPhoto).catch(function (error) {
                console.error("Selected arrow color save failed:", error);
            });
            clearSavedCandidates();
            updateColorSelectionUI();
            el.analysisStatus.textContent = "色を選択しました。「AI解析開始」を押してください。";
            el.analyzeSaved.textContent = currentPreviewPhoto.aiStatus === "analyzed" ? "✨ 再解析する" : "✨ AI解析開始";
        } catch (error) {
            console.error("Color sampling failed:", error);
            el.analysisStatus.textContent = "色を取得できませんでした。写真内をもう一度タップしてください。";
        }
    }

    function resetSelectedArrowColor() {
        const el = getElements();
        if (profileEditing) {
            const part = PROFILE_PARTS[profileStepIndex];
            if (profileDraft && part) profileDraft[part] = null;
            selectedArrowColor = null;
            selectedColorPoint = null;
            updateArrowProfileUI();
            updateColorSelectionUI();
            return;
        }
        selectedArrowColor = null;
        selectedColorPoint = null;
        if (currentPreviewPhoto) {
            delete currentPreviewPhoto.selectedArrowColor;
            delete currentPreviewPhoto.selectedColorPoint;
            putPhoto(currentPreviewPhoto).catch(function (error) {
                console.error("Selected arrow color reset failed:", error);
            });
        }
        clearSavedCandidates();
        updateColorSelectionUI();
        if (el.analysisStatus) el.analysisStatus.textContent = "写真内のノックまたは羽根を1回タップしてください。";
    }

    function profileStorageKey(memberName) {
        const name = String(memberName || "guest").trim() || "guest";
        return "baika-arrow-profile:" + encodeURIComponent(name);
    }

    function cloneArrowProfile(profile) {
        if (!profile) return { nock: null, vane1: null, vane2: null, vane3: null };
        try { return JSON.parse(JSON.stringify(profile)); }
        catch (error) { return { nock: null, vane1: null, vane2: null, vane3: null }; }
    }

    function loadArrowProfile(memberName) {
        try {
            const raw = localStorage.getItem(profileStorageKey(memberName));
            if (!raw) return { nock: null, vane1: null, vane2: null, vane3: null };
            const parsed = JSON.parse(raw);
            return {
                nock: parsed.nock || null,
                vane1: parsed.vane1 || null,
                vane2: parsed.vane2 || null,
                vane3: parsed.vane3 || null,
                memberName: parsed.memberName || memberName || "",
                updatedAt: parsed.updatedAt || ""
            };
        } catch (error) {
            console.error("Arrow profile load failed:", error);
            return { nock: null, vane1: null, vane2: null, vane3: null };
        }
    }

    function startArrowProfileEditing() {
        if (!currentPreviewPhoto) return;
        profileDraft = cloneArrowProfile(arrowProfile);
        profileEditing = true;
        profileStepIndex = 0;
        selectedArrowColor = null;
        selectedColorPoint = null;
        clearSavedCandidates();
        updateArrowProfileUI();
        updateColorSelectionUI();
        const el = getElements();
        if (el.analysisStatus) el.analysisStatus.textContent = "矢プロフィール登録中です。ノックから順にタップしてください。";
    }

    function cancelArrowProfileEditing() {
        profileEditing = false;
        profileDraft = cloneArrowProfile(arrowProfile);
        profileStepIndex = 0;
        selectedArrowColor = normalizeColor(arrowProfile && arrowProfile.nock && arrowProfile.nock.color)
            || (currentPreviewPhoto && normalizeColor(currentPreviewPhoto.selectedArrowColor));
        selectedColorPoint = null;
        updateArrowProfileUI();
        updateColorSelectionUI();
    }

    function selectProfilePart(event) {
        const button = event.target.closest("[data-profile-part]");
        if (!button || !profileEditing) return;
        const part = button.getAttribute("data-profile-part");
        const index = PROFILE_PARTS.indexOf(part);
        if (index < 0) return;
        profileStepIndex = index;
        const item = profileDraft && profileDraft[part];
        selectedArrowColor = normalizeColor(item && item.color);
        selectedColorPoint = item && item.point ? item.point : null;
        updateArrowProfileUI();
        updateColorSelectionUI();
    }

    function applyColorToProfileDraft(color, point) {
        if (!profileDraft) profileDraft = cloneArrowProfile(null);
        const part = PROFILE_PARTS[profileStepIndex];
        if (!part) return;
        profileDraft[part] = { color: normalizeColor(color), point: point };
        const nextIndex = profileStepIndex + 1;
        if (nextIndex < PROFILE_PARTS.length) {
            profileStepIndex = nextIndex;
            selectedArrowColor = null;
            // 最後にタップした位置は、次の部位へ進んだ後も丸で表示する。
            // 次のタップ時に新しい位置へ更新される。
        }
        const el = getElements();
        if (el.analysisStatus) {
            el.analysisStatus.textContent = nextIndex < PROFILE_PARTS.length
                ? PROFILE_LABELS[part] + "を取得しました。次は" + PROFILE_LABELS[PROFILE_PARTS[nextIndex]] + "をタップしてください。"
                : "4色を取得しました。「プロフィール保存」を押してください。";
        }
    }

    function isProfileComplete(profile) {
        return PROFILE_PARTS.every(function (part) {
            return profile && profile[part] && normalizeColor(profile[part].color);
        });
    }

    function saveArrowProfile() {
        const el = getElements();
        if (!currentPreviewPhoto || !isProfileComplete(profileDraft)) return;
        const memberName = currentPreviewPhoto.memberName || readPracticeSettings().memberName || "未ログイン";
        profileDraft.memberName = memberName;
        profileDraft.updatedAt = new Date().toISOString();
        try {
            localStorage.setItem(profileStorageKey(memberName), JSON.stringify(profileDraft));
            arrowProfile = cloneArrowProfile(profileDraft);
            profileEditing = false;
            profileStepIndex = 0;
            selectedArrowColor = normalizeColor(arrowProfile.nock.color);
            selectedColorPoint = arrowProfile.nock.point || null;
            saveMemberArrowColor(memberName, selectedArrowColor);
            currentPreviewPhoto.arrowProfile = arrowProfile;
            currentPreviewPhoto.selectedArrowColor = selectedArrowColor;
            currentPreviewPhoto.selectedColorPoint = selectedColorPoint;
            putPhoto(currentPreviewPhoto).catch(function (error) {
                console.error("Arrow profile photo save failed:", error);
            });
            updateArrowProfileUI();
            updateColorSelectionUI();
            if (el.analysisStatus) el.analysisStatus.textContent = "矢プロフィールを端末内に保存しました。現在のAI解析はノック色を基準に開始します。";
        } catch (error) {
            console.error("Arrow profile save failed:", error);
            window.alert("矢プロフィールを保存できませんでした。");
        }
    }

    function updateArrowProfileUI() {
        const el = getElements();
        if (!el.profileSlots) return;
        const source = profileEditing ? profileDraft : arrowProfile;
        const memberName = currentPreviewPhoto && currentPreviewPhoto.memberName ? currentPreviewPhoto.memberName : "現在の部員";
        if (el.profileMember) {
            el.profileMember.textContent = memberName + "さんの配色" + (isProfileComplete(source) ? "（登録済み）" : "（未登録）");
        }
        el.profileSlots.querySelectorAll("[data-profile-part]").forEach(function (button) {
            const part = button.getAttribute("data-profile-part");
            const item = source && source[part];
            const color = normalizeColor(item && item.color);
            const swatch = button.querySelector(".v4-arrow-profile-slot-swatch");
            button.classList.toggle("is-active", profileEditing && PROFILE_PARTS[profileStepIndex] === part);
            button.classList.toggle("is-set", Boolean(color));
            if (swatch) {
                if (color) swatch.style.background = "rgb(" + color.r + ", " + color.g + ", " + color.b + ")";
                else swatch.style.removeProperty("background");
            }
        });
        if (el.profileEditor) el.profileEditor.hidden = !profileEditing;
        if (el.startProfile) el.startProfile.textContent = isProfileComplete(arrowProfile) ? "配色を変更" : "配色を登録";
        if (el.profileStepLabel && profileEditing) {
            el.profileStepLabel.textContent = PROFILE_LABELS[PROFILE_PARTS[profileStepIndex]] + "の中央をタップ";
        }
        if (el.saveProfile) el.saveProfile.disabled = !isProfileComplete(profileDraft);
        if (el.analyzeSaved) {
            const usableNock = normalizeColor(arrowProfile && arrowProfile.nock && arrowProfile.nock.color);
            if (!profileEditing && usableNock && !selectedArrowColor) selectedArrowColor = usableNock;
            el.analyzeSaved.disabled = profileEditing || analysisInProgress || !selectedArrowColor;
        }
    }

    function updateColorSelectionUI() {
        const el = getElements();
        if (!el.colorSwatch || !el.colorInstruction || !el.analyzeSaved) return;
        if (selectedArrowColor) {
            const cssColor = "rgb(" + selectedArrowColor.r + ", " + selectedArrowColor.g + ", " + selectedArrowColor.b + ")";
            el.colorSwatch.style.setProperty("--v4-selected-arrow-color", cssColor);
            el.colorSwatch.classList.add("is-selected");
            el.colorInstruction.textContent = profileEditing ? "取得色：" + cssColor : "選択色：" + cssColor + "（写真をタップすると変更）";
            el.analyzeSaved.disabled = analysisInProgress;
        } else {
            el.colorSwatch.classList.remove("is-selected");
            el.colorSwatch.style.removeProperty("--v4-selected-arrow-color");
            el.colorInstruction.textContent = profileEditing ? PROFILE_LABELS[PROFILE_PARTS[profileStepIndex]] + "の中央をタップしてください。" : "写真内のノックまたは羽根を1回タップしてください。";
            el.analyzeSaved.disabled = true;
        }
        if (profileEditing) el.analyzeSaved.disabled = true;
        renderColorTapMarker();
    }

    function renderColorTapMarker() {
        const el = getElements();
        if (!el.colorMarker || !el.savedPreview || !selectedColorPoint) {
            if (el.colorMarker) el.colorMarker.hidden = true;
            return;
        }
        const normalizedX = Number(selectedColorPoint.normalizedX);
        const normalizedY = Number(selectedColorPoint.normalizedY);
        if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) {
            el.colorMarker.hidden = true;
            return;
        }
        // マーカーはzoomContent内のローカル座標で配置する。
        // object-fit:containによる上下左右の余白も考慮する。
        const rect = getContainedImageRect(el.savedPreview, false);
        el.colorMarker.style.left = (rect.left + rect.width * normalizedX) + "px";
        el.colorMarker.style.top = (rect.top + rect.height * normalizedY) + "px";
        el.colorMarker.hidden = false;
    }

    function normalizeColor(value) {
        if (!value) return null;
        const r = Number(value.r), g = Number(value.g), b = Number(value.b);
        if (![r, g, b].every(Number.isFinite)) return null;
        return {
            r: Math.max(0, Math.min(255, Math.round(r))),
            g: Math.max(0, Math.min(255, Math.round(g))),
            b: Math.max(0, Math.min(255, Math.round(b)))
        };
    }

    function memberColorStorageKey(memberName) {
        return "baika-arrow-color:" + String(memberName || "default").trim();
    }

    function saveMemberArrowColor(memberName, color) {
        try { localStorage.setItem(memberColorStorageKey(memberName), JSON.stringify(color)); }
        catch (error) { console.warn("Arrow color local save failed:", error); }
    }

    function loadMemberArrowColor(memberName) {
        try { return normalizeColor(JSON.parse(localStorage.getItem(memberColorStorageKey(memberName)) || "null")); }
        catch (error) { return null; }
    }

    function renderSavedCandidates(candidates) {
        const el = getElements();
        const layer = el.candidateLayer;
        const image = el.savedPreview;
        if (!layer || !image || !image.naturalWidth || !image.naturalHeight) return;
        layer.setAttribute("viewBox", "0 0 " + image.naturalWidth + " " + image.naturalHeight);
        layer.innerHTML = "";

        candidates.forEach(function (candidate, index) {
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            group.setAttribute("class", "v4-saved-candidate");
            const radius = Math.max(14, Math.min(image.naturalWidth, image.naturalHeight) * 0.018);

            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", candidate.x);
            circle.setAttribute("cy", candidate.y);
            circle.setAttribute("r", radius);

            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
            text.setAttribute("x", candidate.x);
            text.setAttribute("y", candidate.y + radius * 0.28);
            text.setAttribute("text-anchor", "middle");
            text.setAttribute("font-size", radius * 0.95);
            text.textContent = String(index + 1);

            group.appendChild(circle);
            group.appendChild(text);
            layer.appendChild(group);
        });
    }

    function clearSavedCandidates() {
        const layer = document.getElementById("v4SavedPhotoCandidateLayer");
        if (layer) layer.innerHTML = "";
    }

    function revokeListObjectUrls() {
        listObjectUrls.forEach(function (url) { URL.revokeObjectURL(url); });
        listObjectUrls = [];
    }

    function formatDateTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "時刻不明";
        return String(date.getMonth() + 1).padStart(2, "0") + "/"
            + String(date.getDate()).padStart(2, "0") + " "
            + String(date.getHours()).padStart(2, "0") + ":"
            + String(date.getMinutes()).padStart(2, "0");
    }

    function escapeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function stopCameraStream() {
        if (stream) {
            stream.getTracks().forEach(function (track) { track.stop(); });
            stream = null;
        }
        const video = document.getElementById("v4CameraVideo");
        if (video) video.srcObject = null;
    }

    async function capturePhoto() {
        const el = getElements();
        if (captureInProgress || !stream || !el.video.videoWidth || !el.video.videoHeight) return;

        captureInProgress = true;
        el.capture.disabled = true;
        el.message.textContent = "保存中…";

        try {
            const canvas = el.canvas;
            canvas.width = el.video.videoWidth;
            canvas.height = el.video.videoHeight;
            const context = canvas.getContext("2d", { alpha: false });
            context.drawImage(el.video, 0, 0, canvas.width, canvas.height);

            const blob = await canvasToBlob(canvas, "image/jpeg", 0.9);
            const settings = readPracticeSettings();
            const guide = calculateGuideMetadata(el.stage, canvas.width, canvas.height);

            const endNumber = sessionCount + 1;
            const createdAt = new Date();
            const record = {
                blob: blob,
                sessionId: sessionId,
                endNumber: endNumber,
                fileName: createPhotoFileName(createdAt, settings.distance, endNumber),
                createdAt: createdAt.toISOString(),
                memberName: settings.memberName,
                practiceDate: settings.practiceDate,
                distance: settings.distance,
                status: "pending",
                guide: guide,
                width: canvas.width,
                height: canvas.height
            };

            lastCaptureId = await addPhoto(record);
            sessionCount += 1;
            el.sessionCount.textContent = String(sessionCount);
            el.deleteLast.disabled = false;
            showCaptureFeedback(el, "End " + endNumber + " を保存しました");
            await refreshCounts();

            if (navigator.vibrate) navigator.vibrate(35);
        } catch (error) {
            console.error("Capture save failed:", error);
            el.message.textContent = "保存に失敗しました。";
            window.alert("写真を端末内へ保存できませんでした。空き容量を確認してください。");
        } finally {
            captureInProgress = false;
            el.capture.disabled = !stream;
        }
    }

    async function deleteLastCapture() {
        const el = getElements();
        if (lastCaptureId === null) return;

        try {
            await deletePhoto(lastCaptureId);
            lastCaptureId = null;
            sessionCount = Math.max(0, sessionCount - 1);
            el.sessionCount.textContent = String(sessionCount);
            el.deleteLast.disabled = true;
            el.message.textContent = "直前の写真を削除しました。";
            await refreshCounts();
        } catch (error) {
            console.error("Delete capture failed:", error);
            window.alert("直前の写真を削除できませんでした。");
        }
    }


    function showCaptureFeedback(el, text) {
        if (el.flash) {
            el.flash.classList.remove("is-active");
            void el.flash.offsetWidth;
            el.flash.classList.add("is-active");
        }

        el.message.textContent = text;
        el.message.classList.add("is-saved");

        if (messageTimer) window.clearTimeout(messageTimer);
        messageTimer = window.setTimeout(function () {
            if (el.flash) el.flash.classList.remove("is-active");
            el.message.classList.remove("is-saved");
            if (stream) el.message.textContent = "次の的を合わせて撮影";
        }, 1400);
    }

    function createSessionId() {
        return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
    }

    function createPhotoFileName(date, distance, endNumber) {
        const pad = function (value, length) { return String(value).padStart(length, "0"); };
        const stamp = date.getFullYear()
            + pad(date.getMonth() + 1, 2)
            + pad(date.getDate(), 2) + "_"
            + pad(date.getHours(), 2)
            + pad(date.getMinutes(), 2)
            + pad(date.getSeconds(), 2);
        const distanceText = String(distance || "distance").replace(/[^0-9A-Za-z_-]/g, "");
        return stamp + "_" + distanceText + "_End" + pad(endNumber, 2) + ".jpg";
    }

    function readPracticeSettings() {
        const member = document.getElementById("v4LoggedInMemberName");
        const date = document.getElementById("v4PracticeDate");
        const distance = document.getElementById("v4DistanceSelect");
        return {
            memberName: member ? member.textContent.trim() : "",
            practiceDate: date ? date.value : "",
            distance: distance ? distance.value : ""
        };
    }

    function calculateGuideMetadata(stage, imageWidth, imageHeight) {
        const rect = stage.getBoundingClientRect();
        const diameterCss = Math.min(rect.width * 0.82, rect.height * 0.82);
        const scaleX = imageWidth / rect.width;
        const scaleY = imageHeight / rect.height;
        return {
            centerX: imageWidth / 2,
            centerY: imageHeight / 2,
            radiusX: diameterCss * scaleX / 2,
            radiusY: diameterCss * scaleY / 2,
            normalizedCenterX: 0.5,
            normalizedCenterY: 0.5,
            normalizedRadiusX: (diameterCss / rect.width) / 2,
            normalizedRadiusY: (diameterCss / rect.height) / 2
        };
    }

    function canvasToBlob(canvas, type, quality) {
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (blob) resolve(blob);
                else reject(new Error("Canvas blob creation failed"));
            }, type, quality);
        });
    }

    function openDatabase() {
        if (databasePromise) return databasePromise;
        databasePromise = new Promise(function (resolve, reject) {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = function () {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
                    store.createIndex("createdAt", "createdAt", { unique: false });
                    store.createIndex("status", "status", { unique: false });
                }
            };
            request.onsuccess = function () { resolve(request.result); };
            request.onerror = function () { reject(request.error); };
        });
        return databasePromise;
    }

    async function addPhoto(record) {
        const db = await openDatabase();
        return new Promise(function (resolve, reject) {
            const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).add(record);
            request.onsuccess = function () { resolve(request.result); };
            request.onerror = function () { reject(request.error); };
        });
    }

    async function putPhoto(record) {
        const db = await openDatabase();
        return new Promise(function (resolve, reject) {
            const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(record);
            request.onsuccess = function () { resolve(request.result); };
            request.onerror = function () { reject(request.error); };
        });
    }

    async function deletePhoto(id) {
        const db = await openDatabase();
        return new Promise(function (resolve, reject) {
            const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(id);
            request.onsuccess = function () { resolve(); };
            request.onerror = function () { reject(request.error); };
        });
    }

    async function getAllPhotos() {
        const db = await openDatabase();
        return new Promise(function (resolve, reject) {
            const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
            request.onsuccess = function () { resolve(request.result || []); };
            request.onerror = function () { reject(request.error); };
        });
    }

    async function countPhotos() {
        const db = await openDatabase();
        return new Promise(function (resolve, reject) {
            const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).count();
            request.onsuccess = function () { resolve(request.result || 0); };
            request.onerror = function () { reject(request.error); };
        });
    }

    async function refreshCounts() {
        const el = getElements();
        try {
            const count = await countPhotos();
            el.localCount.textContent = String(count);
            el.totalCount.textContent = String(count);
            if (el.listModal && !el.listModal.hidden) await renderPhotoList();
        } catch (error) {
            console.error("Photo count failed:", error);
        }
    }

    function getElements() {
        return {
            open: document.getElementById("v4OpenCameraButton"),
            modal: document.getElementById("v4CameraModal"),
            close: document.getElementById("v4CloseCameraButton"),
            finish: document.getElementById("v4FinishCameraButton"),
            capture: document.getElementById("v4CaptureButton"),
            deleteLast: document.getElementById("v4DeleteLastCaptureButton"),
            video: document.getElementById("v4CameraVideo"),
            canvas: document.getElementById("v4CameraCanvas"),
            stage: document.getElementById("v4CameraStage"),
            flash: document.getElementById("v4CameraFlash"),
            message: document.getElementById("v4CameraMessage"),
            sessionCount: document.getElementById("v4CameraSessionCount"),
            totalCount: document.getElementById("v4CameraTotalCount"),
            localCount: document.getElementById("v4LocalPhotoCount"),
            openList: document.getElementById("v4OpenPhotoListButton"),
            listModal: document.getElementById("v4PhotoListModal"),
            closeList: document.getElementById("v4ClosePhotoListButton"),
            listGrid: document.getElementById("v4PhotoListGrid"),
            listEmpty: document.getElementById("v4PhotoListEmpty"),
            listTotal: document.getElementById("v4PhotoListTotal"),
            listPending: document.getElementById("v4PhotoListPending"),
            previewModal: document.getElementById("v4PhotoPreviewModal"),
            closePreview: document.getElementById("v4ClosePhotoPreviewButton"),
            analysisStage: document.getElementById("v4PhotoAnalysisStage"),
            zoomContent: document.getElementById("v4PhotoZoomContent"),
            zoomIn: document.getElementById("v4PhotoZoomInButton"),
            zoomOut: document.getElementById("v4PhotoZoomOutButton"),
            zoomReset: document.getElementById("v4PhotoZoomResetButton"),
            savedPreview: document.getElementById("v4SavedPhotoPreview"),
            savedTitle: document.getElementById("v4SavedPhotoTitle"),
            savedDetails: document.getElementById("v4SavedPhotoDetails"),
            analyzeSaved: document.getElementById("v4AnalyzeSavedPhotoButton"),
            analysisStatus: document.getElementById("v4SavedPhotoAnalysisStatus"),
            candidateLayer: document.getElementById("v4SavedPhotoCandidateLayer"),
            colorMarker: document.getElementById("v4PhotoColorTapMarker"),
            colorSwatch: document.getElementById("v4SelectedArrowColor"),
            colorInstruction: document.getElementById("v4PhotoColorInstruction"),
            resetColor: document.getElementById("v4ResetArrowColorButton"),
            startProfile: document.getElementById("v4StartArrowProfileButton"),
            cancelProfile: document.getElementById("v4CancelArrowProfileButton"),
            saveProfile: document.getElementById("v4SaveArrowProfileButton"),
            profileEditor: document.getElementById("v4ArrowProfileEditor"),
            profileSlots: document.getElementById("v4ArrowProfileSlots"),
            profileMember: document.getElementById("v4ArrowProfileMember"),
            profileStepLabel: document.getElementById("v4ArrowProfileStepLabel")
        };
    }

    window.BaikaLocalPhotoStore = {
        databaseName: DB_NAME,
        storeName: STORE_NAME,
        refreshCounts: refreshCounts,
        getAllPhotos: getAllPhotos
    };
})();
