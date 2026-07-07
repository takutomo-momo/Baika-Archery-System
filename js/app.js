window.onload = async () => {
    const today = new Date(); currentCalYear = today.getFullYear(); currentCalMonth = today.getMonth() + 1;
    selectedDateStr = formatDateJST(today);
    
    rebuildMemberDropdowns(); 
    initCharts(); 
    drawTargetSvg(); 
    
    await loadDataFromCloud();
    
    ['envWeather','envWind','envMemo','envTimeSlot'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.onchange = saveEnvironmentInputs;
    });
    const mName = document.getElementById('envMatchName');
    if(mName) mName.onchange = () => { saveEnvironmentInputs(); updateTableTitleWithMatchName(); updateDashboard(); };
    updateDashboard();
};
