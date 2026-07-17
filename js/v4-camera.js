"use strict";

/*
 * Baika Archery System Ver4
 * Step35-3: 撮影済み一覧
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
                card.innerHTML = '<img class="v4-photo-card-image" alt="End ' + escapeHtml(photo.endNumber) + ' の的写真">'
                    + '<div class="v4-photo-card-body">'
                    + '<div class="v4-photo-card-title"><span>📷 End ' + escapeHtml(photo.endNumber) + '</span><span class="v4-photo-card-status' + statusClass + '">' + statusText + '</span></div>'
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
        previewObjectUrl = URL.createObjectURL(photo.blob);
        el.savedPreview.src = previewObjectUrl;
        el.savedTitle.textContent = "End " + (photo.endNumber || "-");
        el.savedDetails.textContent = formatDateTime(photo.createdAt) + " ／ " + (photo.distance || "距離未設定") + " ／ " + (photo.status === "complete" ? "入力済み" : "未入力");
        el.previewModal.hidden = false;
    }

    function closePhotoPreview() {
        const el = getElements();
        if (el.previewModal) el.previewModal.hidden = true;
        if (el.savedPreview) el.savedPreview.removeAttribute("src");
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
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
            savedDetails: document.getElementById("v4SavedPhotoDetails")
        };
    }

    window.BaikaLocalPhotoStore = {
        databaseName: DB_NAME,
        storeName: STORE_NAME,
        refreshCounts: refreshCounts,
        getAllPhotos: getAllPhotos
    };
})();
