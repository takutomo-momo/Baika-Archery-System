function renderCalendar() {
    const grid = document.getElementById("calendarGrid"); const title = document.getElementById("calMonthTitle"); if(!grid) return; grid.innerHTML = "";
    title.textContent = `${currentCalYear}年${String(currentCalMonth).padStart(2,'0')}月`;
    ["日","月","火","水","木","金","土"].forEach(l => { let d = document.createElement("div"); d.className="cal-day-label"; d.textContent=l; grid.appendChild(d); });
    const first = new Date(currentCalYear, currentCalMonth-1, 1).getDay(); const days = new Date(currentCalYear, currentCalMonth, 0).getDate();
    for(let i=0;i<first;i++) { let c=document.createElement("div"); c.className="cal-cell empty"; grid.appendChild(c); }
    for(let day=1; day<=days; day++) {
        let c = document.createElement("div"); c.className="cal-cell"; c.textContent=day;
        const normalizedDStr = `${currentCalYear}-${String(currentCalMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        let hasData = currentMode==='practice'? practiceData.some(p=>p.date===normalizedDStr) : matchData.some(m=>m.matchDate===normalizedDStr);
        if(hasData) c.classList.add("has-data"); if(normalizedDStr===selectedDateStr) c.classList.add("selected");
        c.onclick = () => { selectedDateStr = normalizedDStr; document.querySelectorAll(".cal-cell").forEach(el=>el.classList.remove("selected")); c.classList.add("selected"); headResetAndRender(); loadEnvironmentInputs(); updateAnalytics(); };
        grid.appendChild(c);
    }
    document.getElementById("filteredDateBadge").textContent = `選択日: ${selectedDateStr}`;
}

function changeMonth(dir) { currentCalMonth+=dir; if(currentCalMonth>12){currentCalMonth=1;currentCalYear++;} if(currentCalMonth<1){currentCalMonth=12;currentCalYear--;} renderCalendar(); }
