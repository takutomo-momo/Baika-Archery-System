function addBlankMatchRow(ends) {
    const targetMem = document.getElementById("currentMemberDropdown").value;
    if(!canEditCurrentTarget()) { alert("この閲覧対象では新しくスコア行を追加できません。"); return; }
    
    let currentMatchName = document.getElementById("envMatchName").value.trim() || "無名の大会";
    let categoryName = ends === 10 ? "インドア18m" : "RC女子";
    
    let o = { 
        matchName: currentMatchName, matchDate: selectedDateStr, name: getActiveInputMember(), category: categoryName, maxEnd: ends, 
        x1: 0, ten1: 0, x2: 0, ten2: 0, total: 0 
    };
    for(let e=1;e<=12;e++) o[`e${e}`] = 0;
    matchData.push(o); saveToCloud('match'); headResetAndRender(); updateDashboard();
}

function updateMatch(idx, f, v) {
    if(!matchData[idx]) return; 
    if(!canEditMember(matchData[idx].name)) return; 
    
    if(['name','category','matchName'].includes(f)) {
        matchData[idx][f] = v;
    } else {
        matchData[idx][f] = parseInt(v) || 0;
    }
    
    const maxEnd = matchData[idx].maxEnd || 12;
    let sum = 0; 
    for(let e=1; e<=12; e++) { if(e <= maxEnd) sum += (matchData[idx][`e${e}`] || 0); }
    matchData[idx].total = sum; 
    
    saveToCloud('match'); headResetAndRender(); updateDashboard();
}
