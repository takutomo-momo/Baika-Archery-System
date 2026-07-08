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