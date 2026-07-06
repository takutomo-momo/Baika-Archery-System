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
