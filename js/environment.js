function saveEnvironmentInputs() {
    if(!loggedInMember || !selectedDateStr) return; 
    if(document.getElementById("currentMemberDropdown").value !== loggedInMember) return; 
    
    const key = `${selectedDateStr}_${loggedInMember}`;
    const distEl = document.getElementById("envDistance");
    const timeEl = document.getElementById("envTimeSlot");
    const weatEl = document.getElementById("envWeather");
    const windEl = document.getElementById("envWind");
    const memoEl = document.getElementById("envMemo");
    const matchEl = document.getElementById("envMatchName");

    dailyEnvMetadata[key] = { 
        distance: distEl ? distEl.value : "70m", 
        timeSlot: timeEl ? timeEl.value : "午前枠", 
        weather: weatEl ? weatEl.value : "晴れ", 
        wind: windEl ? windEl.value : "無風", 
        memo: memoEl ? memoEl.value : "",
        matchName: matchEl ? matchEl.value : "春季記録会"
    };
    saveToCloud('metadata');
}

function loadEnvironmentInputs() {
    const tm = document.getElementById("currentMemberDropdown").value; const m = (tm === '全部員') ? loggedInMember : tm;
    const meta = dailyEnvMetadata[`${selectedDateStr}_${m}`];
    const distEl = document.getElementById("envDistance");
    const timeEl = document.getElementById("envTimeSlot");
    const weatEl = document.getElementById("envWeather");
    const windEl = document.getElementById("envWind");
    const memoEl = document.getElementById("envMemo");
    const matchEl = document.getElementById("envMatchName");

    if(meta) {
        if(distEl) distEl.value = meta.distance || (currentMode === 'match' ? "RC女子 70m" : "70m"); 
        if(timeEl) timeEl.value = meta.timeSlot || "午前枠";
        if(weatEl) weatEl.value = meta.weather || "晴れ"; 
        if(windEl) windEl.value = meta.wind || "無風"; 
        if(memoEl) memoEl.value = meta.memo || "";
        if(matchEl) matchEl.value = meta.matchName || "春季記録会";
    } else { 
        if(distEl) distEl.value = (currentMode === 'match' ? "RC女子 70m" : "70m");
        if(memoEl) memoEl.value = ""; 
        if(matchEl) matchEl.value = "春季記録会";
    }
    updateTableTitleWithMatchName();
    
    // モードに応じた一括削除UIテキストの更新
    const zoneDesc = document.getElementById("lblDeleteZoneDesc");
    if(zoneDesc) {
        if(currentMode === 'match') {
            zoneDesc.textContent = `現在ログインしている部員(${loggedInMember || '未ログイン'})の、これまでのすべての「大会・記録会スコアデータ」を一括で完全に削除します。この操作は取り消せません。`;
        } else {
            zoneDesc.textContent = `現在ログインしている部員(${loggedInMember || '未ログイン'})の、これまでのすべての「練習記録データ(的タップ・各エンド情報を含む)」を一括で完全に削除します。この操作は取り消せません。`;
        }
    }
}
