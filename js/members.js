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
