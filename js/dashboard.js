function getVisibleMemberForStats() {
    const selector = document.getElementById("currentMemberDropdown");
    if (!selector) return loggedInMember || "";
    return selector.value || loggedInMember || "";
}

function filterPracticeForMember(memberName) {
    return practiceData.filter(record => memberName === "全部員" || record.memberName === memberName);
}

function filterMatchForMember(memberName) {
    return matchData.filter(record => memberName === "全部員" || record.name === memberName);
}

function updateDashboard() {
    const panel = document.getElementById("dashboardPanel");
    if (!panel) return;

    const targetMem = getVisibleMemberForStats();
    const memberLabel = document.getElementById("dashboardMemberLabel");
    const modeLabel = document.getElementById("dashboardModeLabel");

    if (memberLabel) {
        memberLabel.textContent = targetMem === "全部員" ? "部員全員の集計" : `${targetMem || "未ログイン"} さんの集計`;
    }
    if (modeLabel) {
        modeLabel.textContent = currentMode === "match" ? "大会" : "練習";
        modeLabel.style.background = currentMode === "match" ? "#fff2df" : "#eef7ff";
        modeLabel.style.color = currentMode === "match" ? "var(--accent-orange)" : "var(--accent-blue)";
    }

    const memberPractice = filterPracticeForMember(targetMem);
    const todayPractice = memberPractice.filter(record => record.date === selectedDateStr);
    const todayScore = todayPractice.reduce((sum, record) => sum + (Number(record.total) || 0), 0);
    const todayArrows = todayPractice.length * 6;
    const todayAvg = todayArrows > 0 ? (todayScore / todayArrows).toFixed(1) : "0.0";

    const monthPrefix = selectedDateStr ? selectedDateStr.slice(0, 7) : new Date().toISOString().slice(0, 7);
    const monthPractice = memberPractice.filter(record => String(record.date || "").startsWith(monthPrefix));
    const monthEnds = monthPractice.length;
    const monthArrows = monthEnds * 6;

    const memberMatches = filterMatchForMember(targetMem)
        .slice()
        .sort((a, b) => String(b.matchDate || "").localeCompare(String(a.matchDate || "")));
    const latestMatch = memberMatches[0];

    setDashboardText("dashTodayEnds", `${todayPractice.length} E`);
    setDashboardText("dashTodayArrows", `${todayArrows} 本`);
    setDashboardText("dashTodayAvg", todayAvg);
    setDashboardText("dashMonthArrows", `${monthArrows} 本`);
    setDashboardText("dashMonthEnds", `${monthEnds} E`);
    setDashboardText("dashLatestMatchScore", latestMatch ? `${latestMatch.total || 0} 点` : "--");
    setDashboardText("dashLatestMatchName", latestMatch ? `${latestMatch.matchName || "大会記録"} / ${latestMatch.matchDate || "日付未設定"}` : "記録なし");

if (typeof updateRankingPanel === "function") {
        updateRankingPanel();
    }

if (typeof updateAnalysisSummary === "function") {
        updateAnalysisSummary();
    }
}

function setDashboardText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function updateAnalysisSummary() {

    const stats = getArrowRateStats();

    const xRate = document.getElementById("dashXRate");
    const tenRate = document.getElementById("dashTenRate");
    const missRate = document.getElementById("dashMissRate");

    if (xRate) {
        xRate.textContent = `${stats.xRate}%`;
    }

    if (tenRate) {
        tenRate.textContent = `${stats.tenRate}%`;
    }

    if (missRate) {
        missRate.textContent = `${stats.missRate}%`;
    }
}