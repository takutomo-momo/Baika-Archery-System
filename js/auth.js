function enterSystem() {
    const mem = document.getElementById("openingMemberDropdown").value;
    const pass = document.getElementById("loginPasswordInput").value;

    if (!mem) return;

    const correct = (dailyEnvMetadata.memberPasswords && dailyEnvMetadata.memberPasswords[mem]) || DEFAULT_PASSWORD;

    if (pass !== correct) {
        alert("パスワードが違います");
        return;
    }

    loggedInMember = mem;
    currentUserRole = getRole(loggedInMember);

    const currentMemberDropdown = document.getElementById("currentMemberDropdown");
    if (currentMemberDropdown) {
        currentMemberDropdown.value = loggedInMember;
    }

    document.getElementById("openingOverlay").classList.add("dismissed");

    updateRoleBadge();
    setMode(currentMode);

    if (currentMemberDropdown) {
        currentMemberDropdown.value = loggedInMember;
    }

    handleMemberChange();
    renderTable();
    updateDisplay();
    calculateDailyTotalStats();
    updateDashboard();
}
