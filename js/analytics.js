function drawScatterPoints(filteredPractice) {
    const svg = document.getElementById("analyticsScatterSvg"); if(!svg) return; svg.innerHTML = "";
    const rings = [
        { r: 150, fill: "#fff" }, { r: 135, fill: "#fff" }, { r: 120, fill: "#333" }, { r: 105, fill: "#333" },
        { r: 90, fill: "#007aff" }, { r: 75, fill: "#007aff" }, { r: 60, fill: "#ff3b30" }, { r: 45, fill: "#ff3b30" },
        { r: 30, fill: "#ffd700" }, { r: 15, fill: "#ffd700" }, { r: 7.5, fill: "#ffd700" }
    ];
    rings.forEach(r => {
        let c = document.createElementNS("http://www.w3.org/2000/svg","circle");
        c.setAttribute("cx",150); c.setAttribute("cy",150); c.setAttribute("r",r.r); c.setAttribute("fill",r.fill);
        c.setAttribute("stroke", r.fill==="#333"?"#fff":"#000"); c.setAttribute("stroke-width","0.5");
        svg.appendChild(c);
    });
    filteredPractice.forEach(p => {
        if(p.pins) {
            p.pins.forEach(pin => {
                if(pin.val==='M') return;
                let c = document.createElementNS("http://www.w3.org/2000/svg","circle");
                c.setAttribute("cx",pin.x); c.setAttribute("cy",pin.y); c.setAttribute("r","4"); c.setAttribute("fill","var(--accent-pink)"); c.setAttribute("stroke","#fff"); c.setAttribute("stroke-width","0.5");
                svg.appendChild(c);
            });
        }
    });
}

function initCharts() {
    trendChart = new Chart(document.getElementById("trendChart"), {
        type: 'line',
        data: { labels: [], datasets: [{ label: '6エンドごとの合計スコア推移', data: [], borderColor: '#007aff', backgroundColor: 'rgba(0,122,255,0.1)', fill: true }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 60 } } }
    });
}

function updateAnalytics() {
    const targetMem = document.getElementById("currentMemberDropdown").value;
    const filteredPractice = practiceData.filter(p => p.date === selectedDateStr && (targetMem==='全部員' || p.memberName===targetMem));
    
    if(currentMode === 'practice') {
        drawScatterPoints(filteredPractice);
        if (trendChart) {
            trendChart.data.labels = filteredPractice.map((_, i) => `${i+1}回目`);
            trendChart.data.datasets[0].data = filteredPractice.map(d => d.total);
            trendChart.update();
        }
    }
}
let analysisPeriod = "all";
function getArrowRateStats() {
    const targetMem = document.getElementById("currentMemberDropdown").value;

    let records = practiceData.filter(p => {
    return targetMem === "全部員" || p.memberName === targetMem;
});

records = filterPracticeByAnalysisPeriod(records);

    let totalArrows = 0;
    let xCount = 0;
    let tenCount = 0;
    let missCount = 0;

    records.forEach(record => {
        ["a1", "a2", "a3", "a4", "a5", "a6"].forEach(key => {
            const val = record[key];
            if (!val) return;

            totalArrows++;

            if (val === "X") xCount++;
            if (val === "10") tenCount++;
            if (val === "M") missCount++;
        });
    });

    return {
        totalArrows,
        xRate: totalArrows ? ((xCount / totalArrows) * 100).toFixed(1) : "0.0",
        tenRate: totalArrows ? (((xCount + tenCount) / totalArrows) * 100).toFixed(1) : "0.0",
        missRate: totalArrows ? ((missCount / totalArrows) * 100).toFixed(1) : "0.0"
    };
}
function setAnalysisPeriod(period) {
    analysisPeriod = period;

    document.querySelectorAll(".analysis-period-btn").forEach(btn => {
        btn.classList.remove("active-analysis-period");
    });

    const activeBtn = document.querySelector(`[data-analysis-period="${period}"]`);
    if (activeBtn) {
        activeBtn.classList.add("active-analysis-period");
    }

    if (typeof updateAnalysisSummary === "function") {
        updateAnalysisSummary();
    }
    if (typeof updateAverageTrendChart === "function") {
    updateAverageTrendChart();
}
}

function filterPracticeByAnalysisPeriod(records) {
    if (!selectedDateStr) return records;

    const today = selectedDateStr;
    const month = selectedDateStr.slice(0, 7);
    const year = selectedDateStr.slice(0, 4);

    if (analysisPeriod === "today") {
        return records.filter(r => r.date === today);
    }

    if (analysisPeriod === "month") {
        return records.filter(r => r.date && r.date.startsWith(month));
    }

    if (analysisPeriod === "year") {
        return records.filter(r => r.date && r.date.startsWith(year));
    }

    return records;
}
function getAverageScoreTrend(period = analysisPeriod) {
    const targetMem = document.getElementById("currentMemberDropdown").value;

    let records = practiceData.filter(p =>
        p &&
        p.date &&
        (targetMem === "全部員" || p.memberName === targetMem)
    );

    records = filterPracticeByAnalysisPeriod(records);

    const grouped = {};

    records.forEach(r => {
        const key = String(r.date).split("T")[0];

        if (!grouped[key]) {
            grouped[key] = {
                total: 0,
                arrows: 0
            };
        }

        grouped[key].total += Number(r.total || 0);
        grouped[key].arrows += 6;
    });

    return Object.keys(grouped)
        .sort()
        .filter(date => grouped[date].arrows > 0)
        .map(date => ({
            date,
            average: Number((grouped[date].total / grouped[date].arrows).toFixed(1))
        }));
}