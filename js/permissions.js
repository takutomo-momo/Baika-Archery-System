const ROLE_LABELS = {
    admin: "管理者",
    leader: "主将・幹部",
    member: "部員"
};

function getMemberRoles() {
    return dailyEnvMetadata.memberRoles || {};
}

function getRole(memberName = loggedInMember) {
    if (!memberName) return "member";
    return getMemberRoles()[memberName] || "member";
}

function isAdmin() {
    return currentUserRole === "admin";
}

function isLeader() {
    return currentUserRole === "leader";
}

function canViewAllMembers() {
    return isAdmin() || isLeader();
}

function canEditMember(memberName) {
    if (!memberName || memberName === "全部員") return false;
    return isAdmin() || memberName === loggedInMember;
}

function canEditCurrentTarget() {
    const dropdown = document.getElementById("currentMemberDropdown");
    const targetMember = dropdown ? dropdown.value : "";
    return canEditMember(targetMember);
}

function getActiveInputMember() {
    const dropdown = document.getElementById("currentMemberDropdown");
    const targetMember = dropdown ? dropdown.value : loggedInMember;
    return canEditMember(targetMember) ? targetMember : loggedInMember;
}

function updateRoleBadge() {
    const badge = document.getElementById("roleBadge");
    if (!badge) return;

    const label = ROLE_LABELS[currentUserRole] || "部員";
    badge.textContent = `権限: ${label}`;
    badge.dataset.role = currentUserRole;
}
