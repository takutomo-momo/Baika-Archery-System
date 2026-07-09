function getTodayPracticeRanking() {
    const todayRecords = practiceData.filter(p => p.date === selectedDateStr);

    const rankingMap = {};

    todayRecords.forEach(record => {
        const name = record.memberName;
        if (!rankingMap[name]) rankingMap[name] = 0;
        rankingMap[name] += Number(record.total || 0);
    });

    return Object.entries(rankingMap)
        .map(([memberName, total]) => ({ memberName, total }))
        .sort((a, b) => b.total - a.total);
}

function getMonthlyTotalRanking() {
    const monthKey = selectedDateStr.slice(0, 7);

    const monthRecords = practiceData.filter(p => {
        return p.date && p.date.startsWith(monthKey);
    });

    const rankingMap = {};

    monthRecords.forEach(record => {
        const name = record.memberName;
        if (!rankingMap[name]) rankingMap[name] = 0;
        rankingMap[name] += Number(record.total || 0);
    });

    return Object.entries(rankingMap)
        .map(([memberName, total]) => ({ memberName, total }))
        .sort((a, b) => b.total - a.total);
}

function get70mAverageRanking() {
    const records70m = practiceData.filter(p => p.distance === "70m");

    const rankingMap = {};

    records70m.forEach(record => {
        const name = record.memberName;
        if (!rankingMap[name]) {
            rankingMap[name] = {
                total: 0,
                count: 0
            };
        }

        rankingMap[name].total += Number(record.total || 0);
        rankingMap[name].count += 1;
    });

    return Object.entries(rankingMap)
        .map(([memberName, data]) => ({
            memberName,
            average: data.count ? (data.total / data.count).toFixed(1) : "0.0"
        }))
        .sort((a, b) => Number(b.average) - Number(a.average));
}
function formatRankingTop3(ranking, valueKey, suffix) {
    if (!ranking || ranking.length === 0) {
        return "記録なし";
    }

    const medals = ["🥇", "🥈", "🥉"];

    return ranking.slice(0, 3).map((item, index) => {
        return `<div style="font-size:13px; line-height:1.6;">
            ${medals[index]} ${item.memberName}　${item[valueKey]}${suffix}
        </div>`;
    }).join("");
}

function updateRankingPanel() {
    const today = getTodayPracticeRanking();
    const month = getMonthlyTotalRanking();
    const avg70 = get70mAverageRanking();

    const todayLabel = document.getElementById("rankTodayTop");
    const monthLabel = document.getElementById("rankMonthTop");
    const avg70Label = document.getElementById("rank70mTop");

    if (todayLabel) {
        todayLabel.innerHTML = formatRankingTop3(today, "total", "点");
    }

    if (monthLabel) {
        monthLabel.innerHTML = formatRankingTop3(month, "total", "点");
    }

    if (avg70Label) {
        avg70Label.innerHTML = formatRankingTop3(avg70, "average", "点");
    }
}function formatRankingTop3(ranking, valueKey, suffix) {
    if (!ranking || ranking.length === 0) {
        return "記録なし";
    }

    const medals = ["🥇", "🥈", "🥉"];

    return ranking.slice(0, 3).map((item, index) => {
        return `<div style="font-size:13px; line-height:1.6;">
            ${medals[index]} ${item.memberName}　${item[valueKey]}${suffix}
        </div>`;
    }).join("");
}

