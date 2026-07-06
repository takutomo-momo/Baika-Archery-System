// ⚠️ GASデプロイWebアプリURL設定枠
        const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyjU5ncJllBeJu4ncSeTl5G61AGg-b5118aoxPcGyx7fr4tXKFBZPEyC2uLggwbkwC9aA/exec";

        let practiceData = []; let matchData = [];
        let masterMembers = ["部員A", "部員B", "部員C"]; let currentArrows = [];
        let currentMode = 'practice'; let loggedInMember = ""; let selectedDateStr = "";
        let currentCalYear = 0; let currentCalMonth = 0;
        let isZoomed = false; let zoomCenter = { x: 150, y: 150 }; let trendChart;
        let dailyEnvMetadata = {}; const DEFAULT_PASSWORD = "baika";

        function showLoading(show) { document.getElementById("cloudLoadingIndicator").style.display = show ? "flex" : "none"; }
        function returnToOpening() { document.getElementById("openingOverlay").classList.remove("dismissed"); }
        
        function enterSystem() {
            const mem = document.getElementById("openingMemberDropdown").value;
            const pass = document.getElementById("loginPasswordInput").value;
            if(!mem) return;
            const correct = (dailyEnvMetadata.memberPasswords && dailyEnvMetadata.memberPasswords[mem]) || DEFAULT_PASSWORD;
            if(pass !== correct) { alert("パスワードが違います"); return; }
            loggedInMember = mem;
            document.getElementById("currentMemberDropdown").value = loggedInMember;
            document.getElementById("openingOverlay").classList.add("dismissed");
            handleMemberChange();
        }

        window.onload = async () => {
            const today = new Date(); currentCalYear = today.getFullYear(); currentCalMonth = today.getMonth() + 1;
            selectedDateStr = today.toISOString().split('T')[0];
            
            rebuildMemberDropdowns(); 
            initCharts(); 
            drawTargetSvg(); 
            
            await loadDataFromCloud();
            
            ['envWeather','envWind','envMemo','envTimeSlot'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.onchange = saveEnvironmentInputs;
            });
            const mName = document.getElementById('envMatchName');
            if(mName) mName.onchange = () => { saveEnvironmentInputs(); updateTableTitleWithMatchName(); };
        };

        async function loadDataFromCloud() {
            if(!GAS_API_URL || GAS_API_URL.includes("ここに新しい")) { setMode(currentMode); return; }
            showLoading(true);
            try {
                const res = await fetch(GAS_API_URL);
                const d = await res.json();
                practiceData = d.practice || []; matchData = d.match || [];
                if(d.metadata) d.metadata.forEach(m => { dailyEnvMetadata[m.key] = m.json || m; });
                if(dailyEnvMetadata.memberMaster && dailyEnvMetadata.memberMaster.length > 0) {
                    masterMembers = dailyEnvMetadata.memberMaster;
                }
            } catch(e) {
                console.error("Cloud load failed:", e);
            } finally {
                rebuildMemberDropdowns(); 
                setMode(currentMode); 
                showLoading(false);
            }
        }

        async function saveToCloud(type) {
            if(!GAS_API_URL || GAS_API_URL.includes("ここに新しい")) return;
            showLoading(true);
            try {
                let sendData;
                if(type === 'practice') {
                    sendData = practiceData;
                } else if(type === 'match') {
                    sendData = matchData;
                } else {
                    sendData = Object.keys(dailyEnvMetadata).map(k => ({key: k, json: dailyEnvMetadata[k]}));
                }
                
                let payload = { mode: type, data: sendData };
                await fetch(GAS_API_URL, { method:"POST", body: JSON.stringify(payload) });
            } catch(e) {
                console.error("Cloud save failed:", e);
            }
            showLoading(false);
        }

        function drawTargetSvg() {
            const svg = document.getElementById("targetSvg"); if(!svg) return; svg.innerHTML = "";
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
            let pg = document.createElementNS("http://www.w3.org/2000/svg","g"); pg.id = "pinsGroup"; svg.appendChild(pg);
            renderTargetPins();
        }

        function handleTargetClick(event) {
            if(document.getElementById("currentMemberDropdown").value !== loggedInMember) return;

            const svg = document.getElementById("targetSvg"); const rect = svg.getBoundingClientRect();
            let cx = ((event.clientX - rect.left)/rect.width)*300; let cy = ((event.clientY - rect.top)/rect.height)*300;
            if(!isZoomed) { isZoomed = true; zoomCenter = {x:cx, y:cy}; svg.setAttribute("viewBox", `${cx-50} ${cy-50} 100 100`); return; }
            const rx = zoomCenter.x - 50 + (cx/300)*100; const ry = zoomCenter.y - 50 + (cy/300)*100;
            const dist = Math.hypot(rx-150, ry-150);
            let o = { val:"M", score:0, x:rx, y:ry };
            if (dist <= 150) {
                if(dist<=7.5) o={val:"X", score:10, x:rx, y:ry}; else if(dist<=15) o={val:"10", score:10, x:rx, y:ry};
                else if(dist<=30) o={val:"9", score:9, x:rx, y:ry}; else if(dist<=45) o={val:"8", score:8, x:rx, y:ry};
                else if(dist<=60) o={val:"7", stroke:"#000", score:7, x:rx, y:ry}; else if(dist<=75) o={val:"6", score:6, x:rx, y:ry};
                else if(dist<=90) o={val:"5", score:5, x:rx, y:ry}; else if(dist<=105) o={val:"4", score:4, x:rx, y:ry};
                else if(dist<=120) o={val:"3", score:3, x:rx, y:ry}; else if(dist<=135) o={val:"2", score:2, x:rx, y:ry};
                else o={val:"1", score:1, x:rx, y:ry};
            }
            if(currentArrows.length < 6) { currentArrows.push(o); updateDisplay(); }
            resetTargetZoom();
        }

        function resetTargetZoom() { isZoomed = false; document.getElementById("targetSvg").setAttribute("viewBox", "0 0 300 300"); renderTargetPins(); }
        
        function renderTargetPins() {
            const pg = document.getElementById("pinsGroup"); if(!pg) return; pg.innerHTML = "";
            currentArrows.forEach((arr, idx) => {
                if(arr.val === "M") return;
                let c = document.createElementNS("http://www.w3.org/2000/svg","circle");
                c.setAttribute("cx",arr.x); c.setAttribute("cy",arr.y); c.setAttribute("r","3"); c.setAttribute("fill","var(--accent-pink)"); c.setAttribute("stroke","#fff");
                pg.appendChild(c);
                let t = document.createElementNS("http://www.w3.org/2000/svg","text");
                t.setAttribute("x",arr.x+4); t.setAttribute("y",arr.y+3); t.setAttribute("font-size","7"); t.setAttribute("font-weight","bold"); t.textContent = idx+1;
                pg.appendChild(t);
            });
        }

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
            saveToCloud('practice'); currentArrows = []; updateDisplay(); renderTable(); renderCalendar(); updateAnalytics();
        }

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

        function renderTable() {
            const head = document.getElementById("mainTableHeader"); const body = document.getElementById("mainTableBody");
            head.innerHTML = ""; body.innerHTML = ""; const targetMem = document.getElementById("currentMemberDropdown").value;
            
            const isEditable = (targetMem === loggedInMember);

            if(currentMode === 'practice') {
                head.innerHTML = `<tr><th style="width:100px;">部員名</th><th style="width:80px;">距離</th><th style="width:45px;">①</th><th style="width:45px;">②</th><th style="width:45px;">③</th><th style="width:45px;">④</th><th style="width:45px;">⑤</th><th style="width:45px;">⑥</th><th style="width:55px;">計</th><th style="width:70px;">操作</th></tr>`;
                practiceData.filter(p => p.date === selectedDateStr && (targetMem==='全部員' || p.memberName===targetMem)).forEach(p => {
                    let tr = document.createElement("tr");
                    const canDelete = (p.memberName === loggedInMember);
                    tr.innerHTML = `<td><b>${p.memberName}</b></td><td>${p.distance}</td><td>${p.a1}</td><td>${p.a2}</td><td>${p.a3}</td><td>${p.a4}</td><td>${p.a5}</td><td>${p.a6}</td><td style="color:var(--accent-blue);font-weight:bold;">${p.total}</td><td><button class="btn-delete-row" ${canDelete ? '' : 'disabled'} onclick="deleteRow('practice',${practiceData.indexOf(p)})">削除</button></td>`;
                    body.appendChild(tr);
                });
            } else if(currentMode === 'match') {
                matchData.filter(m => m.matchDate === selectedDateStr && (targetMem==='全部員' || m.name===targetMem)).forEach(m => {
                    const idx = matchData.indexOf(m); 
                    const dis = (m.name === loggedInMember && isEditable) ? "" : "disabled";
                    const maxEnd = m.maxEnd || 12;
                    const boundaryEnd = (maxEnd === 10) ? 5 : 6;

                    if(head.innerHTML === "") {
                        let headerHtml = `<tr>
                            <th style="width:120px;">大会名</th><th style="width:80px;">選手名</th><th style="width:80px;">種別</th>`;
                        for(let e=1; e<=boundaryEnd; e++) headerHtml += `<th style="width:35px;">${e}</th>`;
                        headerHtml += `<th style="width:50px;" class="section-total">前半計</th><th style="width:35px;" class="section-total">X</th><th style="width:35px;" class="section-total">10</th>`;
                        for(let e=(boundaryEnd+1); e<=12; e++) {
                            if(maxEnd === 12 || e <= maxEnd) headerHtml += `<th style="width:35px;">${e}</th>`;
                        }
                        headerHtml += `<th style="width:50px;" class="section-total">後半計</th><th style="width:35px;" class="section-total">X</th><th style="width:35px;" class="section-total">10</th>
                            <th style="width:55px;" class="row-grandtotal">総合計</th><th style="width:40px;" class="row-grandtotal">総X</th><th style="width:40px;" class="row-grandtotal">総10</th>
                            <th style="width:60px;">操作</th>
                        </tr>`;
                        head.innerHTML = headerHtml;
                    }
                    
                    let subTotal1 = 0; for(let e=1; e<=boundaryEnd; e++) subTotal1 += (m[`e${e}`]||0);
                    let subTotal2 = 0; for(let e=(boundaryEnd+1); e<=12; e++) { if(e<=maxEnd) subTotal2 += (m[`e${e}`]||0); }
                    
                    let x1 = m.x1 || 0; let ten1 = m.ten1 || 0;
                    let x2 = m.x2 || 0; let ten2 = m.ten2 || 0;
                    
                    let grandTotal = subTotal1 + subTotal2;
                    let totalX = x1 + x2;
                    let total10 = ten1 + ten2;

                    let tr = document.createElement("tr");
                    let h = `<td><input type="text" class="cell-input" style="text-align:left; color:var(--accent-orange);" value="${m.matchName||''}" ${dis} onchange="updateMatch(${idx},'matchName',this.value)"></td>
                             <td><input type="text" class="cell-input player-input" value="${m.name||''}" ${dis} onchange="updateMatch(${idx},'name',this.value)"></td>
                             <td><input type="text" class="cell-input cat-input" value="${m.category||''}" ${dis} onchange="updateMatch(${idx},'category',this.value)"></td>`;
                    
                    for(let e=1; e<=boundaryEnd; e++) {
                        h += `<td><input type="number" class="cell-input" value="${m[`e${e}`]||0}" ${dis} onchange="updateMatch(${idx},'e${e}',this.value)"></td>`;
                    }
                    h += `<td class="section-total" style="background:#eef7ff;"><input type="number" class="cell-input" value="${subTotal1}" disabled></td>`;
                    h += `<td class="section-total" style="background:#fffdec;"><input type="number" class="cell-input" value="${x1}" ${dis} onchange="updateMatch(${idx},'x1',this.value)"></td>`;
                    h += `<td class="section-total" style="background:#fffdec;"><input type="number" class="cell-input" value="${ten1}" ${dis} onchange="updateMatch(${idx},'ten1',this.value)"></td>`;

                    for(let e=(boundaryEnd+1); e<=12; e++) {
                        if(e <= maxEnd) {
                            h += `<td><input type="number" class="cell-input" value="${m[`e${e}`]||0}" ${dis} onchange="updateMatch(${idx},'e${e}',this.value)"></td>`;
                        } else if(maxEnd === 12) {
                            h += `<td><input type="number" class="cell-input" value="${m[`e${e}`]||0}" ${dis} onchange="updateMatch(${idx},'e${e}',this.value)"></td>`;
                        } else {
                            h += `<td style="background:#f2f2f7; color:#ccc;">-</td>`;
                        }
                    }
                    h += `<td class="section-total" style="background:#eef7ff;"><input type="number" class="cell-input" value="${subTotal2}" disabled></td>`;
                    h += `<td class="section-total" style="background:#fffdec;"><input type="number" class="cell-input" value="${x2}" ${dis} onchange="updateMatch(${idx},'x2',this.value)"></td>`;
                    h += `<td class="section-total" style="background:#fffdec;"><input type="number" class="cell-input" value="${ten2}" ${dis} onchange="updateMatch(${idx},'ten2',this.value)"></td>`;

                    h += `<td class="row-grandtotal" style="color:var(--accent-orange); font-size:13px;">${grandTotal}</td>`;
                    h += `<td class="row-grandtotal" style="color:#48484a;">${totalX}</td>`;
                    h += `<td class="row-grandtotal" style="color:#48484a;">${total10}</td>`;
                    
                    const canDeleteMatch = (m.name === loggedInMember && isEditable);
                    h += `<td><button class="btn-delete-row" ${canDeleteMatch ? '' : 'disabled'} onclick="deleteRow('match',${idx})">削除</button></td>`;
                    tr.innerHTML = h; body.appendChild(tr);
                });
            }
            
            calculateDailyTotalStats();
            applyInterfaceLockout(isEditable);
        }

        function applyInterfaceLockout(isEditable) {
            const banner = document.getElementById("readOnlyAlertBanner");
            const targetSvg = document.getElementById("targetSvg");
            
            if (isEditable) {
                if(banner) banner.style.display = "none";
                if(targetSvg) targetSvg.classList.remove("readonly-target");
            } else {
                if(banner) banner.style.display = "block";
                if(targetSvg) targetSvg.classList.add("readonly-target");
            }

            document.querySelectorAll(".input-lockable").forEach(el => {
                el.disabled = !isEditable;
            });
            
            ['envDistance', 'envTimeSlot', 'envWeather', 'envWind', 'envMemo', 'envMatchName'].forEach(id => {
                const el = document.getElementById(id);
                if(el) el.disabled = !isEditable;
            });
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

        function addBlankMatchRow(ends) {
            const targetMem = document.getElementById("currentMemberDropdown").value;
            if(targetMem !== loggedInMember) { alert("他人の画面、または全部員画面では新しくスコア行を追加できません。"); return; }
            
            let currentMatchName = document.getElementById("envMatchName").value.trim() || "無名の大会";
            let categoryName = ends === 10 ? "インドア18m" : "RC女子";
            
            let o = { 
                matchName: currentMatchName, matchDate: selectedDateStr, name: loggedInMember, category: categoryName, maxEnd: ends, 
                x1: 0, ten1: 0, x2: 0, ten2: 0, total: 0 
            };
            for(let e=1;e<=12;e++) o[`e${e}`] = 0;
            matchData.push(o); saveToCloud('match'); headResetAndRender();
        }

        function headResetAndRender() {
            document.getElementById("mainTableHeader").innerHTML = "";
            renderTable();
        }
        
        function updateMatch(idx, f, v) {
            if(!matchData[idx]) return; 
            if(matchData[idx].name !== loggedInMember) return; 
            
            if(['name','category','matchName'].includes(f)) {
                matchData[idx][f] = v;
            } else {
                matchData[idx][f] = parseInt(v) || 0;
            }
            
            const maxEnd = matchData[idx].maxEnd || 12;
            let sum = 0; 
            for(let e=1; e<=12; e++) { if(e <= maxEnd) sum += (matchData[idx][`e${e}`] || 0); }
            matchData[idx].total = sum; 
            
            saveToCloud('match'); headResetAndRender();
        }
        
        function deleteRow(type, idx) { 
            if(type==='practice' && practiceData[idx].memberName !== loggedInMember) return;
            if(type==='match' && matchData[idx].name !== loggedInMember) return;
            if(!confirm("削除しますか？")) return; 
            if(type==='practice') practiceData.splice(idx,1); else matchData.splice(idx,1); 
            saveToCloud(type); headResetAndRender(); renderCalendar(); updateAnalytics(); 
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
        }

        /* 【追加】ログイン者の該当モード内全データ一括削除ロジック */
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
            showLoading(false);
        }

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

        function rebuildMemberDropdowns() {
            const op = document.getElementById("openingMemberDropdown"); const cur = document.getElementById("currentMemberDropdown"); if(!op) return;
            op.innerHTML = ""; cur.innerHTML = '<option value="全部員">📊 部員全員分を表示</option>';
            masterMembers.forEach(m => {
                let o1=document.createElement("option"); o1.value=m; o1.textContent=m; op.appendChild(o1);
                let o2=document.createElement("option"); o2.value=m; o2.textContent=m; cur.appendChild(o2);
            });
            syncSelectedToManagementInput();
        }
        function syncSelectedToManagementInput() { document.getElementById("memberManagementInput").value = document.getElementById("openingMemberDropdown").value || ""; }
        function handleMemberChange() { headResetAndRender(); updateAnalytics(); loadEnvironmentInputs(); }

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

        async function addNewMemberFromOpening() { 
            const n = document.getElementById("memberManagementInput").value.trim(); 
            if(!n) { alert("登録する名前を入力してください"); return; }
            if(masterMembers.includes(n)) { alert("その名前は既に登録されています"); return; }
            masterMembers.push(n); dailyEnvMetadata.memberMaster = masterMembers; 
            rebuildMemberDropdowns(); document.getElementById("openingMemberDropdown").value = n; syncSelectedToManagementInput();
            await saveToCloud('metadata'); alert(`「${n}」さんを新規名簿に仮登録・同期しました`);
        }

        async function renameSelectedMemberFromOpening() { 
            const o = document.getElementById("openingMemberDropdown").value; 
            const n = document.getElementById("memberManagementInput").value.trim(); 
            if(!o||!n||o===n) return; 
            const i = masterMembers.indexOf(o); 
            if(i!==-1) masterMembers[i]=n; dailyEnvMetadata.memberMaster = masterMembers; 
            rebuildMemberDropdowns(); document.getElementById("openingMemberDropdown").value = n; syncSelectedToManagementInput();
            await saveToCloud('metadata'); alert("名前を変更しました");
        }

        async function changeMemberPasswordFromOpening() { 
            const s = document.getElementById("openingMemberDropdown").value; 
            const p = document.getElementById("loginPasswordInput").value; 
            const np = document.getElementById("newPasswordInput").value.trim(); 
            if(!s||!np) return; 
            if(!dailyEnvMetadata.memberPasswords) dailyEnvMetadata.memberPasswords={}; 
            if(p !== (dailyEnvMetadata.memberPasswords[s]||DEFAULT_PASSWORD)) { alert("現在のパスワードが正しくありません"); return; } 
            dailyEnvMetadata.memberPasswords[s]=np; await saveToCloud('metadata'); alert("パスワード変更完了"); 
        }
