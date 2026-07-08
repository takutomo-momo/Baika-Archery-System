function showLoading(show) { document.getElementById("cloudLoadingIndicator").style.display = show ? "flex" : "none"; }

function returnToOpening() { document.getElementById("openingOverlay").classList.remove("dismissed"); }

function applyInterfaceLockout(isEditable) {
    const editable = typeof canEditCurrentTarget === "function" ? canEditCurrentTarget() : isEditable;
    const banner = document.getElementById("readOnlyAlertBanner");
    const targetSvg = document.getElementById("targetSvg");
    
    if (editable) {
        if(banner) banner.style.display = "none";
        if(targetSvg) targetSvg.classList.remove("readonly-target");
    } else {
        if(banner) {
            banner.style.display = "block";
            if (document.getElementById("currentMemberDropdown")?.value === "全部員") {
                banner.textContent = "⚠️ 閲覧対象が「全部員」のため、入力・編集はロックされています。個人名を選択してください。";
            } else {
                banner.textContent = "⚠️ この閲覧対象は編集権限がないため、入力・編集はロックされています。";
            }
        }
        if(targetSvg) targetSvg.classList.add("readonly-target");
    }

    document.querySelectorAll(".input-lockable").forEach(el => {
        el.disabled = !editable;
    });
    
    ['envDistance', 'envTimeSlot', 'envWeather', 'envWind', 'envMemo', 'envMatchName'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.disabled = !editable;
    });

    updateRoleBadge();
}

function headResetAndRender() {
    document.getElementById("mainTableHeader").innerHTML = "";
    renderTable();
}

function updateTableTitleWithMatchName() {
    const titleEl = document.getElementById("scoreTableTitle");
    if (currentMode === 'match') {
        const name = document.getElementById("envMatchName").value.trim() || "大会・記録会";
        titleEl.textContent = `📋 ${name} スコアシート`;
    } else {
        titleEl.textContent = "📋 練習スコアシート";
    }
}

function setMode(mode) {
    currentMode = mode; localStorage.setItem("archery_mode", mode);
    ['btnModePractice','btnModeMatch'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.className = "mode-btn";
    });
    const activeEl = document.getElementById(mode==='practice'?'btnModePractice':'btnModeMatch');
    if(activeEl) activeEl.classList.add(mode==='practice'?'active-practice':'active-match');
    
    const wrapper = document.getElementById("distanceInputWrapper");
    const panel = document.getElementById("dailyTotalStatsPanel");

    // 全データ一括削除エリアのテキスト・ボタンをモードに同期
    const zoneTitle = document.getElementById("lblDeleteZoneTitle");
    const zoneDesc = document.getElementById("lblDeleteZoneDesc");
    const zoneBtn = document.getElementById("btnDeleteAllMyData");

    if (mode === 'match') {
        if(panel) panel.style.display = "none";
        document.getElementById("matchNameContainer").style.display = "block";
        document.getElementById("matchActionButtons").style.display = "flex";
        document.getElementById("distanceContainer").style.display = "block";
        document.getElementById("distanceLabel").textContent = "大会種別 / 距離区分";
        document.getElementById("upperLayout").style.display = "none";
        document.getElementById("practiceAnalyticsArea").style.display = "none";
        wrapper.innerHTML = `<input type="text" class="form-control" id="envDistance" value="RC女子 70m" placeholder="例: RC女子 70m / インドア18m" onchange="saveEnvironmentInputs()">`;
        
        if(zoneTitle) zoneTitle.textContent = "⚠️ 大会データの全一括削除（危険ゾーン）";
        if(zoneDesc) zoneDesc.textContent = `現在ログインしている部員(${loggedInMember || '未ログイン'})の、これまでのすべての「大会・記録会スコアデータ」を一括で完全に削除します。この操作は取り消せません。`;
        if(zoneBtn) zoneBtn.textContent = "💥 自分の全大会データを一括削除する";
    } else {
        if(panel) panel.style.display = "block";
        document.getElementById("matchNameContainer").style.display = "none";
        document.getElementById("matchActionButtons").style.display = "none";
        document.getElementById("distanceContainer").style.display = "block";
        document.getElementById("distanceLabel").textContent = "練習距離";
        document.getElementById("upperLayout").style.display = "grid";
        document.getElementById("practiceAnalyticsArea").style.display = "block";
        
        wrapper.innerHTML = `
            <select class="form-control" id="envDistance" onchange="saveEnvironmentInputs(); renderTable();">
                <option value="70m">🎯 70m</option>
                <option value="60m">🎯 60m</option>
                <option value="50m">🎯 50m</option>
                <option value="30m">🎯 30m</option>
                <option value="18m">🎯 18m (インドア)</option>
                <option value="近射">🏹 近射</option>
            </select>
        `;

        if(zoneTitle) zoneTitle.textContent = "⚠️ 練習データの全一括削除（危険ゾーン）";
        if(zoneDesc) zoneDesc.textContent = `現在ログインしている部員(${loggedInMember || '未ログイン'})の、これまでのすべての「練習記録データ(的タップ・各エンド情報を含む)」を一括で完全に削除します。この操作は取り消せません。`;
        if(zoneBtn) zoneBtn.textContent = "💥 自分の全練習データを一括削除する";
    }
    
    currentArrows = []; updateDisplay(); renderCalendar(); headResetAndRender(); updateAnalytics(); loadEnvironmentInputs();
    updateTableTitleWithMatchName();
    updateDashboard();
}
