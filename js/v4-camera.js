"use strict";

/*
 * Baika Archery System Ver4
 * Step35-4: 撮影済み写真のAI解析開始画面
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
        if (el.savedPreview) el.savedPreview.addEventListener("click", selectArrowColorFromPhoto);
        if (el.resetColor) el.resetColor.addEventListener("click", resetSelectedArrowColor);

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
        selectedArrowColor = normalizeColor(photo.selectedArrowColor) || loadMemberArrowColor(photo.memberName);
        selectedColorPoint = photo.selectedColorPoint || null;
        updateColorSelectionUI();
        el.analysisStatus.textContent = selectedArrowColor
            ? (photo.aiStatus === "analyzed"
                ? "前回の解析結果：矢候補 " + ((photo.aiCandidates || []).length) + "件。色を変更すると再解析できます。"
                : "選択した色で解析できます。")
            : "先に写真内のノック／羽根をタップしてください。";
        el.analyzeSaved.disabled = !selectedArrowColor;
        el.analyzeSaved.textContent = photo.aiStatus === "analyzed" ? "✨ 再解析する" : "✨ AI解析開始";
        el.previewModal.hidden = false;
        el.savedPreview.onload = function () {
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

    function selectArrowColorFromPhoto(event) {
        const el = getElements();
        if (!currentPreviewPhoto || !el.savedPreview || !el.savedPreview.naturalWidth) return;

        const rect = el.savedPreview.getBoundingClientRect();
        const localX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const localY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
        const imageX = Math.max(0, Math.min(el.savedPreview.naturalWidth - 1, Math.round(localX / rect.width * el.savedPreview.naturalWidth)));
        const imageY = Math.max(0, Math.min(el.savedPreview.naturalHeight - 1, Math.round(localY / rect.height * el.savedPreview.naturalHeight)));

        try {
            const canvas = document.createElement("canvas");
            canvas.width = el.savedPreview.naturalWidth;
            canvas.height = el.savedPreview.naturalHeight;
            const context = canvas.getContext("2d", { willReadFrequently: true });
            context.drawImage(el.savedPreview, 0, 0);

            // 1画素だけでは反射や影の影響を受けるため、周囲5×5の中央値に近い平均色を使う。
            const radius = 2;
            const startX = Math.max(0, imageX - radius);
            const startY = Math.max(0, imageY - radius);
            const width = Math.min(canvas.width - startX, radius * 2 + 1);
            const height = Math.min(canvas.height - startY, radius * 2 + 1);
            const pixels = context.getImageData(startX, startY, width, height).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; count += 1;
            }
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

    function updateColorSelectionUI() {
        const el = getElements();
        if (!el.colorSwatch || !el.colorInstruction || !el.analyzeSaved) return;
        if (selectedArrowColor) {
            const cssColor = "rgb(" + selectedArrowColor.r + ", " + selectedArrowColor.g + ", " + selectedArrowColor.b + ")";
            el.colorSwatch.style.setProperty("--v4-selected-arrow-color", cssColor);
            el.colorSwatch.classList.add("is-selected");
            el.colorInstruction.textContent = "選択色：" + cssColor + "（写真をタップすると変更）";
            el.analyzeSaved.disabled = analysisInProgress;
        } else {
            el.colorSwatch.classList.remove("is-selected");
            el.colorSwatch.style.removeProperty("--v4-selected-arrow-color");
            el.colorInstruction.textContent = "写真内のノックまたは羽根を1回タップしてください。";
            el.analyzeSaved.disabled = true;
        }
        renderColorTapMarker();
    }

    function renderColorTapMarker() {
        const el = getElements();
        if (!el.colorMarker || !el.savedPreview || !selectedColorPoint) {
            if (el.colorMarker) el.colorMarker.hidden = true;
            return;
        }
        const imageRect = el.savedPreview.getBoundingClientRect();
        const stageRect = el.savedPreview.parentElement.getBoundingClientRect();
        const normalizedX = Number(selectedColorPoint.normalizedX);
        const normalizedY = Number(selectedColorPoint.normalizedY);
        if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) {
            el.colorMarker.hidden = true;
            return;
        }
        el.colorMarker.style.left = (imageRect.left - stageRect.left + imageRect.width * normalizedX) + "px";
        el.colorMarker.style.top = (imageRect.top - stageRect.top + imageRect.height * normalizedY) + "px";
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
            savedPreview: document.getElementById("v4SavedPhotoPreview"),
            savedTitle: document.getElementById("v4SavedPhotoTitle"),
            savedDetails: document.getElementById("v4SavedPhotoDetails"),
            analyzeSaved: document.getElementById("v4AnalyzeSavedPhotoButton"),
            analysisStatus: document.getElementById("v4SavedPhotoAnalysisStatus"),
            candidateLayer: document.getElementById("v4SavedPhotoCandidateLayer"),
            colorMarker: document.getElementById("v4PhotoColorTapMarker"),
            colorSwatch: document.getElementById("v4SelectedArrowColor"),
            colorInstruction: document.getElementById("v4PhotoColorInstruction"),
            resetColor: document.getElementById("v4ResetArrowColorButton")
        };
    }

    window.BaikaLocalPhotoStore = {
        databaseName: DB_NAME,
        storeName: STORE_NAME,
        refreshCounts: refreshCounts,
        getAllPhotos: getAllPhotos
    };
})();
