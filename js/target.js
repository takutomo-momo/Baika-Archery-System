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
