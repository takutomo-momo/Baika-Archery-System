function renderTable() {
    const head = document.getElementById("mainTableHeader"); const body = document.getElementById("mainTableBody");
    head.innerHTML = ""; body.innerHTML = ""; const targetMem = document.getElementById("currentMemberDropdown").value;
    
    const isEditable = canEditCurrentTarget();

    if(currentMode === 'practice') {
        head.innerHTML = `<tr><th style="width:100px;">部員名</th><th style="width:80px;">距離</th><th style="width:45px;">①</th><th style="width:45px;">②</th><th style="width:45px;">③</th><th style="width:45px;">④</th><th style="width:45px;">⑤</th><th style="width:45px;">⑥</th><th style="width:55px;">計</th><th style="width:70px;">操作</th></tr>`;
        practiceData.filter(p => p.date === selectedDateStr && (targetMem==='全部員' || p.memberName===targetMem)).forEach(p => {
            let tr = document.createElement("tr");
            const canDelete = canEditMember(p.memberName);
            tr.innerHTML = `<td><b>${p.memberName}</b></td><td>${p.distance}</td><td>${p.a1}</td><td>${p.a2}</td><td>${p.a3}</td><td>${p.a4}</td><td>${p.a5}</td><td>${p.a6}</td><td style="color:var(--accent-blue);font-weight:bold;">${p.total}</td><td><button class="btn-delete-row" ${canDelete ? '' : 'disabled'} onclick="deleteRow('practice',${practiceData.indexOf(p)})">削除</button></td>`;
            body.appendChild(tr);
        });
    } else if(currentMode === 'match') {
        matchData.filter(m => m.matchDate === selectedDateStr && (targetMem==='全部員' || m.name===targetMem)).forEach(m => {
            const idx = matchData.indexOf(m); 
            const dis = canEditMember(m.name) ? "" : "disabled";
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
            
            const canDeleteMatch = canEditMember(m.name);
            h += `<td><button class="btn-delete-row" ${canDeleteMatch ? '' : 'disabled'} onclick="deleteRow('match',${idx})">削除</button></td>`;
            tr.innerHTML = h; body.appendChild(tr);
        });
    }
    
    calculateDailyTotalStats();
    applyInterfaceLockout(isEditable);
}
