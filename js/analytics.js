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
