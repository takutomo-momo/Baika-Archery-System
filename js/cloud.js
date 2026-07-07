async function loadDataFromCloud() {
    if(!GAS_API_URL || GAS_API_URL.includes("ここに新しい")) {
        setMode(currentMode);
        return;
    }

    showLoading(true);

    try {
        const res = await fetch(GAS_API_URL);
        const d = await res.json();

        practiceData = (d.practice || []).map(p => ({
            ...p,
            date: normalizeCloudDate(p.date),
            total: Number(p.total || 0),
            pins: parseJsonIfNeeded(p.pins)
        }));

        matchData = (d.match || []).map(m => ({
            ...m,
            matchDate: normalizeCloudDate(m.matchDate),
            total: Number(m.total || 0)
        }));

        dailyEnvMetadata = {};

        if(d.metadata) {
            d.metadata.forEach(m => {
                dailyEnvMetadata[m.key] = parseJsonIfNeeded(m.json);
            });
        }

        if(dailyEnvMetadata.memberMaster && dailyEnvMetadata.memberMaster.length > 0) {
            masterMembers = dailyEnvMetadata.memberMaster;
        }

    } catch(e) {
        console.error("Cloud load failed:", e);
    } finally {
        rebuildMemberDropdowns();

        const currentMemberDropdown = document.getElementById("currentMemberDropdown");
        if (loggedInMember && currentMemberDropdown) {
            currentMemberDropdown.value = loggedInMember;
        }

        setMode(currentMode);
        renderCalendar();
        renderTable();
        updateAnalytics();
        calculateDailyTotalStats();

        showLoading(false);
    }
}

function normalizeCloudDate(value) {
    if (!value) return "";

    if (typeof value === "string") {
        if (value.includes("T")) {
            const date = new Date(value);
            return formatDateJST(date);
        }
        return value.replace(/\//g, "-");
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    return formatDateJST(date);
}

function formatDateJST(date) {
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getUTCFullYear();
    const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
    const d = String(jst.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function parseJsonIfNeeded(value) {
    if (!value) return value;

    if (typeof value === "object") return value;

    try {
        return JSON.parse(value);
    } catch(e) {
        return value;
    }
}

async function saveToCloud(type) {
    if (!GAS_API_URL || GAS_API_URL.includes("ここに新しい")) return;

    showLoading(true);

    try {
        let sendData;

        if (type === "practice") {
            sendData = practiceData;
        } else if (type === "match") {
            sendData = matchData;
        } else {
            sendData = Object.keys(dailyEnvMetadata).map(k => ({
                key: k,
                json: dailyEnvMetadata[k]
            }));
        }

        const payload = {
            mode: type,
            data: sendData
        };

        // Google Apps Script の Web アプリはリダイレクトを挟むことがあるため、
        // Content-Type を明示しないシンプルな POST にして CORS preflight を避ける。
        const res = await fetch(GAS_API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });

        await res.text();

    } catch (e) {
        console.error("Cloud save failed:", e);
        alert("クラウド保存に失敗しました。通信環境またはGAS設定を確認してください。");
    } finally {
        showLoading(false);
    }
}
