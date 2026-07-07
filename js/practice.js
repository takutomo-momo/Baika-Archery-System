function handleKeypadInput(val, score) { 
    if(document.getElementById("currentMemberDropdown").value !== loggedInMember) return;
    if(currentArrows.length >= 6) return; 
    currentArrows.push({val:val, score:score, x:150, y:150}); 
    updateDisplay(); 
}

function updateDisplay() {
    renderTargetPins(); const row = document.getElementById("arrowsRow"); row.innerHTML = ""; let total = 0;
    currentArrows.forEach(arr => {
        total += arr.score; let b = document.createElement("div"); b.className = "arrow-badge"; b.textContent = arr.val;
        if(['X','10','9'].includes(arr.val)) b.style.backgroundColor = "#ffd700";
        else if(['8','7'].includes(arr.val)) { b.style.backgroundColor = "#ff3b30"; b.style.color = "#fff"; }
        else if(['6','5'].includes(arr.val)) { b.style.backgroundColor = "#007aff"; b.style.color = "#fff"; }
        else if(['4','3'].includes(arr.val)) { b.style.backgroundColor = "#333"; b.style.color = "#fff"; }
        else b.style.backgroundColor = "#bbb";
        row.appendChild(b);
    });
    document.getElementById("valCount").textContent = `${currentArrows.length}/6`;
    document.getElementById("valTotal").textContent = total;
    document.getElementById("valAvg").textContent = currentArrows.length ? (total / currentArrows.length).toFixed(1) : "0.0";
    
    calculateDailyTotalStats();
    }

function savePracticeEnd() {
    const targetMem = document.getElementById("currentMemberDropdown").value;
    if(targetMem !== loggedInMember) { alert("他人の画面、または全部員画面ではデータを登録できません。"); return; }
    if(currentArrows.length < 6) { alert("6本入力してください"); return; }
    const sorted = [...currentArrows].sort((a,b)=>b.score - a.score);
    practiceData.push({
        date: selectedDateStr, memberName: loggedInMember, distance: document.getElementById("envDistance").value,
        a1:sorted[0].val, a2:sorted[1].val, a3:sorted[2].val, a4:sorted[3].val, a5:sorted[4].val, a6:sorted[5].val,
        total: sorted.reduce((a,b)=>a+b.score,0), pins: JSON.parse(JSON.stringify(currentArrows))
    });
    saveToCloud('practice'); currentArrows = []; updateDisplay(); renderTable(); renderCalendar(); updateAnalytics(); updateDashboard();
}

function calculateDailyTotalStats() {
    const lblArrows = document.getElementById("lblDailyTotalArrows");
    const lblScore = document.getElementById("lblDailyTotalScore");
    const lblAvg = document.getElementById("lblDailyTotalAvg");
    if(!lblArrows || !lblScore || !lblAvg) return;

    if (currentMode !== 'practice') return;

    const targetMem = document.getElementById("currentMemberDropdown").value;
    const dayRecords = practiceData.filter(p => p.date === selectedDateStr && (targetMem === '全部員' || p.memberName === targetMem));

    let savedArrowsCount = dayRecords.length * 6;
    let savedScoreSum = dayRecords.reduce((sum, r) => sum + (r.total || 0), 0);

    let currentArrowsCount = 0;
    let currentArrowsScoreSum = 0;
    if (targetMem === loggedInMember) {
        currentArrowsCount = currentArrows.length;
        currentArrowsScoreSum = currentArrows.reduce((sum, a) => sum + (a.score || 0), 0);
    }

    let totalArrows = savedArrowsCount + currentArrowsCount;
    let totalScore = savedScoreSum + currentArrowsScoreSum;
    let totalAvg = totalArrows > 0 ? (totalScore / totalArrows).toFixed(1) : "0.0";

    let currentBlockEndCount = dayRecords.length % 6; 
    let blockStartIndex = dayRecords.length - currentBlockEndCount;
    if(currentBlockEndCount === 0 && dayRecords.length > 0 && currentArrowsCount === 0) {
        blockStartIndex = dayRecords.length - 6;
    }
    
    let targetBlockRecords = dayRecords.slice(blockStartIndex, blockStartIndex + 6);
    let sixEndScoreSum = targetBlockRecords.reduce((sum, r) => sum + (r.total || 0), 0);
    
    if(targetBlockRecords.length < 6) {
        sixEndScoreSum += currentArrowsScoreSum;
    }

    lblArrows.textContent = `${totalArrows} 本`;
    lblScore.textContent = `${sixEndScoreSum} 点`;
    lblAvg.textContent = totalAvg;
}

function deleteRow(type, idx) { 
    if(type==='practice' && practiceData[idx].memberName !== loggedInMember) return;
    if(type==='match' && matchData[idx].name !== loggedInMember) return;
    if(!confirm("削除しますか？")) return; 
    if(type==='practice') practiceData.splice(idx,1); else matchData.splice(idx,1); 
    saveToCloud(type); headResetAndRender(); renderCalendar(); updateAnalytics(); updateDashboard(); 
}

async function deleteAllMyModeData() {
    const targetMem = document.getElementById("currentMemberDropdown").value;
    if(targetMem !== loggedInMember) {
        alert("他人の画面、または全部員画面を開いている状態では一括削除を実行できません。");
        return;
    }
    if(!loggedInMember) {
        alert("ログイン情報が確認できません。");
        return;
    }

    const modeLabel = (currentMode === 'practice') ? "【練習記録データ】" : "【大会スコアデータ】";
    
    // 警告確認 1回目
    const confirm1 = confirm(`❗❗ 本当に、ログイン中の部員「${loggedInMember}」のすべての ${modeLabel} を一括削除しますか？\n過去に記録されたすべての日のデータが対象となります。`);
    if(!confirm1) return;

    // 警告確認 2回目
    const confirm2 = confirm(`⚠️ これを実行すると、クラウド(GAS)上のスプレッドシートデータも上書きされ、復元はできません。\n本当の本当によろしいですか？`);
    if(!confirm2) return;

    showLoading(true);

    if(currentMode === 'practice') {
        // ログイン者以外のデータのみを残すフィルター
        practiceData = practiceData.filter(p => p.memberName !== loggedInMember);
        await saveToCloud('practice');
    } else {
        // ログイン者以外のデータのみを残すフィルター
        matchData = matchData.filter(m => m.name !== loggedInMember);
        await saveToCloud('match');
    }

    alert(`${modeLabel} から「${loggedInMember}」のデータをすべて削除しました。`);
    
    // 画面を再読み込み・更新
    headResetAndRender();
    renderCalendar();
    updateAnalytics();
    updateDashboard();
    showLoading(false);
}
