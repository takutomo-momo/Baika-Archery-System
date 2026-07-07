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
    updateDashboard();
}
