"use strict";

/*
 * Baika Archery System Ver4
 * Step36 Arrow Candidate Detector
 * 登録済みのノック＋羽色を組み合わせ、候補ごとの一致率を返す。
 */
(function () {
    function createWorkCanvas(image, maxSide) {
        const naturalWidth = Number(image.naturalWidth || image.width);
        const naturalHeight = Number(image.naturalHeight || image.height);
        if (!naturalWidth || !naturalHeight) throw new Error("画像サイズを取得できません。");
        const scale = Math.min(1, maxSide / Math.max(naturalWidth, naturalHeight));
        const width = Math.max(1, Math.round(naturalWidth * scale));
        const height = Math.max(1, Math.round(naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvasを初期化できません。");
        context.drawImage(image, 0, 0, width, height);
        return { context, width, height, scale };
    }
    function rgbToHsv(r,g,b){r/=255;g/=255;b/=255;const max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let h=0;if(d){if(max===r)h=60*(((g-b)/d)%6);else if(max===g)h=60*(((b-r)/d)+2);else h=60*(((r-g)/d)+4);}if(h<0)h+=360;return{h,s:max===0?0:d/max,v:max};}
    function hueDistance(a,b){const d=Math.abs(a-b);return Math.min(d,360-d);}
    function colorMatches(r,g,b,target){const hsv=rgbToHsv(r,g,b),t=rgbToHsv(target.r,target.g,target.b);const rgb=Math.hypot(r-target.r,g-target.g,b-target.b);if(t.s<.18)return rgb<=105&&Math.abs(hsv.v-t.v)<=.30;return hueDistance(hsv.h,t.h)<=24&&Math.abs(hsv.s-t.s)<=.34&&Math.abs(hsv.v-t.v)<=.38&&rgb<=152;}
    function buildMask(imageData,target){const mask=new Uint8Array(imageData.width*imageData.height),d=imageData.data;for(let i=0;i<mask.length;i++){const o=i*4;if(colorMatches(d[o],d[o+1],d[o+2],target))mask[i]=1;}return mask;}
    function components(mask,w,h){const seen=new Uint8Array(mask.length),out=[],stack=[],dirs=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];for(let y=0;y<h;y++)for(let x=0;x<w;x++){const st=y*w+x;if(!mask[st]||seen[st])continue;let area=0,sx=0,sy=0,minX=x,maxX=x,minY=y,maxY=y;stack.length=0;stack.push([x,y]);seen[st]=1;while(stack.length){const [cx,cy]=stack.pop();area++;sx+=cx;sy+=cy;minX=Math.min(minX,cx);maxX=Math.max(maxX,cx);minY=Math.min(minY,cy);maxY=Math.max(maxY,cy);for(const [dx,dy] of dirs){const nx=cx+dx,ny=cy+dy;if(nx<0||ny<0||nx>=w||ny>=h)continue;const ni=ny*w+nx;if(mask[ni]&&!seen[ni]){seen[ni]=1;stack.push([nx,ny]);}}}out.push({area,x:sx/area,y:sy/area,width:maxX-minX+1,height:maxY-minY+1});}return out;}
    function detect(image, options) {
        const settings=Object.assign({maxSide:900,maxCandidates:12,targetColor:null,profileColors:null},options||{});
        const colors=(settings.profileColors||[]).filter(Boolean);
        if(!colors.length&&settings.targetColor)colors.push({part:"nock",color:settings.targetColor});
        if(!colors.length)throw new Error("矢プロフィールの色が登録されていません。");
        const work=createWorkCanvas(image,settings.maxSide),data=work.context.getImageData(0,0,work.width,work.height),imageArea=work.width*work.height;
        const points=[];
        colors.forEach(function(item,colorIndex){const mask=buildMask(data,item.color||item);components(mask,work.width,work.height).filter(c=>c.area>=Math.max(3,Math.round(imageArea*.000004))&&c.area<=imageArea*.006&&c.width<=work.width*.16&&c.height<=work.height*.16).forEach(c=>points.push({x:c.x,y:c.y,area:c.area,colorIndex,part:item.part||("color"+colorIndex)}));});
        const clusters=[];const mergeDistance=Math.max(9,work.width*.025);
        points.sort((a,b)=>b.area-a.area).forEach(function(p){let cluster=clusters.find(c=>Math.hypot(c.x-p.x,c.y-p.y)<=mergeDistance);if(!cluster){cluster={x:p.x,y:p.y,totalArea:0,points:[],parts:{}};clusters.push(cluster);}cluster.points.push(p);cluster.totalArea+=p.area;cluster.parts[p.part]=true;const total=cluster.points.reduce((s,q)=>s+q.area,0);cluster.x=cluster.points.reduce((s,q)=>s+q.x*q.area,0)/total;cluster.y=cluster.points.reduce((s,q)=>s+q.y*q.area,0)/total;});
        return clusters.map(function(c){const matched=Object.keys(c.parts);let score=matched.length/colors.length;const hasNock=!!c.parts.nock;score=Math.min(.99,.28+score*.58+(hasNock?.13:0)+Math.min(.08,Math.log10(c.totalArea+1)*.025));return{x:c.x/work.scale,y:c.y/work.scale,impactX:c.x/work.scale,impactY:c.y/work.scale,confidence:score,matchedParts:matched,area:c.totalArea};}).filter(c=>c.confidence>=.42).sort((a,b)=>b.confidence-a.confidence).slice(0,settings.maxCandidates).map((c,i)=>Object.assign({id:i+1},c));
    }
    window.BaikaArrowCandidateDetector={detect};
})();
