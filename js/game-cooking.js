// ============================================================
//  COOKING GAME — Phaser 3  (portrait 480×800)
//  Drawn via raw Canvas 2D so all existing drawing code ports
//  directly; Phaser provides audio, input, and the game loop.
// ============================================================

function createCookingGame(words, callbacks) {
  var VW = 480, VH = 800;

  /* ── State machine ─────────────────────────────────────── */
  var S = { SEL:0, BUN:1, BUN_R:2, TOM:3, TOM_R:4, CAB:5, CAB_R:6, SAU:7, SAU_R:8, CMB:9, CMB_R:10, FIN:11 };

  /* ── Colours ───────────────────────────────────────────── */
  var C = {
    bg:'#111827', ui:'#1e2a40', panel:'#0f3460',
    bun:'#D4943A', bunD:'#8C5E1E',
    tom:'#E74C3C', tomD:'#C0392B',
    cab:'#27AE60', cabD:'#1a7a44',
    sau:'#7B3F10', sauL:'#A85520',
    kni:'#B8C0CC', kniH:'#5E4A38',
    acc:'#2EC4B6', gold:'#F0A500',
    red:'#E53935', grn:'#27AE60',
    w:'#fff', gray:'#606880',
    sDone:'#27AE60', sAct:'#2EC4B6', sOff:'#1e2a40',
  };

  /* ── Layout constants ──────────────────────────────────── */
  var SH = 78;
  var BLX=80, BTY=315, BRX=400, BUN_BBY=465;
  var BCX=VW/2, BW=BRX-BLX, BH=BUN_BBY-BTY;
  var CHOP_DUR=9000, ICX=185, ICY=380, IR=90;
  var SCX=168, STOP=148, LH=64, LW=52, NL=5;
  var CUT_TY=[282,370], KX=SCX+90;
  var CMB_BBY=630, CTW=155, DROP_DUR=480;
  var ING_LABELS={tom:'มะเขือเทศ', cab:'กะหล่ำปลี', sau:'ไส้กรอก'};
  var STEPS=[
    {icon:'🍞',lbl:'1.ปัง',  states:[S.BUN,S.BUN_R]},
    {icon:'🔪',lbl:'2.สับ',  states:[S.TOM,S.TOM_R,S.CAB,S.CAB_R]},
    {icon:'✂️',lbl:'3.ตัด', states:[S.SAU,S.SAU_R]},
    {icon:'🌭',lbl:'4.รวม', states:[S.CMB,S.CMB_R,S.FIN]},
  ];
  var STEP_IDX={};
  STEP_IDX[S.BUN_R]=0; STEP_IDX[S.TOM_R]=1; STEP_IDX[S.CAB_R]=2;
  STEP_IDX[S.SAU_R]=3; STEP_IDX[S.CMB_R]=4;

  /* ── Game state ────────────────────────────────────────── */
  var G;
  function resetG(){
    G={
      st:S.SEL, scores:{bun:0,tom:0,cab:0,sau:0,cmb:0}, total:0,
      cutting:false, pts:[], split:false, leftPiece:[], rightPiece:[],
      ing:'tom', taps:0, chopSt:0,
      chopRun:false, chopDone:false, chopStart:0,
      kAnim:0, kAnimStart:0, tomFinalSt:0, cabFinalSt:0,
      kY:260, kDir:1, kSpd:2.8, cuts:0, cutSc:[],
      cList:['tom','cab','sau'], cIdx:0,
      sX:240, sDir:1, sSpd:3.2, dropped:[], allDone:false,
    };
  }
  resetG();

  /* ── Canvas 2D context — set in create() ───────────────── */
  var ctx;
  var sc; // Phaser scene reference

  /* ══ Draw helpers ══════════════════════════════════════════ */
  function rr(x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
    ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
    ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
    ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
    ctx.closePath();
  }
  function fillRR(x,y,w,h,r,col){ctx.fillStyle=col;rr(x,y,w,h,r);ctx.fill();}
  function drawBtn(x,y,w,h,txt,col){
    fillRR(x,y,w,h,13,col);
    ctx.font='bold 15px Prompt,sans-serif'; ctx.fillStyle=C.w;
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(txt,x+w/2,y+h/2); ctx.textBaseline='alphabetic';
  }
  function hit(px,py,x,y,w,h){return px>=x&&px<=x+w&&py>=y&&py<=y+h;}

  function drawBg(){ctx.fillStyle=C.bg; ctx.fillRect(0,0,VW,VH);}

  /* ── Bun ─────────────────────────────────────────────────── */
  function drawBunSprite(){
    fillRR(BLX,BTY,BW,BH,14,C.bun);
    ctx.strokeStyle=C.bunD; ctx.lineWidth=3; rr(BLX,BTY,BW,BH,14); ctx.stroke();
    ctx.fillStyle=C.bunD;
    [[185,338],[225,348],[265,336],[305,348],[345,336],[160,352],[380,350]].forEach(function(d){
      ctx.beginPath(); ctx.arc(d[0],d[1],4.5,0,Math.PI*2); ctx.fill();
    });
  }
  function drawBunPiece(poly,dx){
    if(!poly||poly.length<2)return;
    ctx.save(); ctx.translate(dx,0);
    ctx.beginPath(); ctx.moveTo(poly[0].x,poly[0].y);
    for(var i=1;i<poly.length;i++) ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath(); ctx.clip(); drawBunSprite(); ctx.restore();
    ctx.save(); ctx.translate(dx,0);
    ctx.beginPath(); ctx.moveTo(poly[0].x,poly[0].y);
    for(var i=1;i<poly.length;i++) ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath(); ctx.strokeStyle=C.bunD; ctx.lineWidth=2.5; ctx.stroke(); ctx.restore();
  }
  function sBunTop(cx,cy,w,h){
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.35)'; ctx.shadowBlur=10; ctx.shadowOffsetY=5;
    ctx.fillStyle=C.bun;
    ctx.beginPath();
    ctx.ellipse(cx,cy+h*.35,w/2,h*.6,0,Math.PI,0,false);
    ctx.lineTo(cx+w/2,cy+h); ctx.lineTo(cx-w/2,cy+h); ctx.closePath(); ctx.fill();
    ctx.fillStyle=C.bunD; ctx.fillRect(cx-w/2,cy+h-10,w,10);
    ctx.fillStyle='rgba(255,255,255,.18)';
    ctx.beginPath(); ctx.ellipse(cx-w*.13,cy+h*.15,w*.16,h*.1,-0.4,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function sBunBot(cx,cy,w,h){
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.35)'; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    ctx.fillStyle=C.bunD;
    ctx.beginPath();
    ctx.ellipse(cx,cy+h*.65,w/2+6,h*.38,0,0,Math.PI,false);
    ctx.lineTo(cx-w/2-6,cy); ctx.lineTo(cx+w/2+6,cy); ctx.closePath(); ctx.fill();
    ctx.fillStyle=C.bun; ctx.fillRect(cx-w/2,cy,w,h*.6);
    ctx.restore();
  }

  /* ── Tomato / Cabbage ─────────────────────────────────────── */
  function sTomato(cx,cy,r,st){
    ctx.save();
    if(st===0){
      ctx.fillStyle=C.tom; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=C.cabD; ctx.lineWidth=4; ctx.lineCap='round';
      ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.quadraticCurveTo(cx+12,cy-r-20,cx+7,cy-r-32); ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.22)';
      ctx.beginPath(); ctx.ellipse(cx-r*.26,cy-r*.26,r*.2,r*.14,-0.5,0,Math.PI*2); ctx.fill();
    }else if(st===1){
      ctx.fillStyle=C.tomD; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(255,190,180,.5)'; ctx.lineWidth=3;
      for(var i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(cx+i*r/3.5,cy-r+6);ctx.lineTo(cx+i*r/3.5,cy+r-6);ctx.stroke();}
    }else{
      ctx.fillStyle=C.tomD;
      for(var j=0;j<9;j++){
        var a=(j/9)*Math.PI*2, d=r*.52+(j%3)*r*.28;
        ctx.beginPath(); ctx.ellipse(cx+Math.cos(a)*d,cy+Math.sin(a)*d,r*.3,r*.17,a,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  }
  function sCabbage(cx,cy,r,st){
    ctx.save();
    if(st===0){
      for(var i=4;i>=0;i--){ctx.fillStyle=i%2===0?C.cab:C.cabD;ctx.beginPath();ctx.ellipse(cx,cy+i*4,r-i*7,(r-i*7)*.85,0,0,Math.PI*2);ctx.fill();}
    }else if(st===1){
      ctx.fillStyle=C.cabD; ctx.beginPath(); ctx.ellipse(cx,cy,r,r*.85,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='rgba(180,255,180,.4)'; ctx.lineWidth=2;
      for(var i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(cx-r+4,cy+i*r/4);ctx.lineTo(cx+r-4,cy+i*r/4);ctx.stroke();}
    }else{
      ctx.fillStyle=C.cab;
      for(var j=0;j<13;j++){
        var a=(j/13)*Math.PI*2+.2, d=r*.25+Math.abs(Math.sin(j))*r*.75;
        ctx.beginPath(); ctx.ellipse(cx+Math.cos(a)*d,cy+Math.sin(a)*d,r*.22,r*.07,a+.4,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ── Sausage ──────────────────────────────────────────────── */
  function sSauLink(cx,cy,w,h){
    ctx.save();
    ctx.fillStyle=C.sau; ctx.beginPath(); ctx.ellipse(cx,cy,w/2,h/2,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=C.sauL; ctx.beginPath(); ctx.ellipse(cx-w*.13,cy-h*.18,w*.17,h*.12,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function sSausageFull(cuts){
    for(var i=0;i<NL-1;i++){
      var gy=STOP+i*LH+LH;
      ctx.fillStyle='#4a2008';
      ctx.fillRect(SCX-7,gy-4,14,STOP+(i+1)*LH-gy+8);
    }
    for(var i=0;i<NL;i++) sSauLink(SCX,STOP+i*LH+LH/2,LW,LH-10);
    for(var ci=0;ci<Math.min(cuts,CUT_TY.length);ci++){
      var ty=CUT_TY[ci];
      ctx.save();
      ctx.strokeStyle='#fff'; ctx.lineWidth=3.5;
      ctx.shadowColor=C.acc; ctx.shadowBlur=10;
      ctx.beginPath(); ctx.moveTo(SCX-LW/2-10,ty); ctx.lineTo(SCX+LW/2+10,ty); ctx.stroke();
      ctx.restore();
    }
    if(cuts>=2){
      ctx.save();
      ctx.fillStyle='rgba(240,165,0,0.2)';
      ctx.fillRect(SCX-LW/2-5,CUT_TY[0],LW+10,CUT_TY[1]-CUT_TY[0]);
      ctx.strokeStyle=C.gold; ctx.lineWidth=2; ctx.setLineDash([4,3]);
      ctx.strokeRect(SCX-LW/2-5,CUT_TY[0],LW+10,CUT_TY[1]-CUT_TY[0]);
      ctx.setLineDash([]); ctx.restore();
    }
  }
  function drawAssemblySausagePiece(cx,cy,targetW,targetH){
    var topY=G.cuts>=1?CUT_TY[0]:STOP;
    var botY=G.cuts>=2?CUT_TY[1]:STOP+NL*LH;
    var pieceH=botY-topY, srcCX=SCX, srcCY=(topY+botY)/2;
    var sx=targetW/pieceH, sy=targetH/LW;
    ctx.save();
    ctx.translate(cx,cy); ctx.scale(sx,sy); ctx.rotate(Math.PI/2); ctx.translate(-srcCX,-srcCY);
    ctx.beginPath(); ctx.rect(SCX-LW/2-1,topY,LW+2,pieceH); ctx.clip();
    for(var i=0;i<NL-1;i++){var gy=STOP+i*LH+LH;ctx.fillStyle='#4a2008';ctx.fillRect(SCX-7,gy-4,14,STOP+(i+1)*LH-gy+8);}
    for(var i=0;i<NL;i++) sSauLink(SCX,STOP+i*LH+LH/2,LW,LH-10);
    ctx.restore();
  }

  /* ── Assembly helpers ──────────────────────────────────────── */
  function drawAssemblyBunPiece(poly,targetCX,targetCY,targetW,targetH){
    if(!poly||poly.length<2)return false;
    var sx=targetW/BH, sy=targetH/BW;
    var ox=BCX, oy=BTY+BH/2;
    function applyT(){ctx.translate(targetCX,targetCY);ctx.scale(sx,sy);ctx.rotate(Math.PI/2);ctx.translate(-ox,-oy);}
    ctx.save(); applyT();
    ctx.beginPath(); ctx.moveTo(poly[0].x,poly[0].y);
    for(var i=1;i<poly.length;i++) ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath(); ctx.clip(); drawBunSprite(); ctx.restore();
    ctx.save(); applyT();
    ctx.beginPath(); ctx.moveTo(poly[0].x,poly[0].y);
    for(var i=1;i<poly.length;i++) ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath(); ctx.strokeStyle=C.bunD; ctx.lineWidth=2.5/Math.min(sx,sy); ctx.stroke(); ctx.restore();
    return true;
  }
  function drawAssemblyLayer(ing,cx,cy,w){
    ctx.save();
    if(ing==='tom'||ing==='tomato'){
      var tSt=G.tomFinalSt||0;
      ctx.fillStyle=tSt>=2?C.tomD:C.tom;
      ctx.beginPath(); ctx.ellipse(cx,cy,w/2,11,0,0,Math.PI*2); ctx.fill();
      if(tSt===0){
        ctx.fillStyle='rgba(255,220,200,.55)';
        [-22,0,22].forEach(function(dx){ctx.beginPath();ctx.ellipse(cx+dx,cy,4,8,0,0,Math.PI*2);ctx.fill();});
      }else{
        ctx.strokeStyle='rgba(255,190,180,.7)'; ctx.lineWidth=2;
        var nc=tSt>=2?7:4;
        for(var i=0;i<nc;i++){var lx=cx-w*0.44+i*(w*0.88/(nc-1));ctx.beginPath();ctx.moveTo(lx,cy-9);ctx.lineTo(lx,cy+9);ctx.stroke();}
      }
    }else if(ing==='cab'||ing==='cabbage'){
      var cSt=G.cabFinalSt||0;
      ctx.fillStyle=C.cab; ctx.beginPath(); ctx.ellipse(cx,cy,w/2+8,8,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=C.cabD; ctx.lineWidth=1.5;
      var nc=cSt>=2?7:(cSt>=1?4:2);
      for(var i=0;i<nc;i++){var lx=cx-w*0.44+i*(w*0.88/Math.max(nc-1,1));ctx.beginPath();ctx.moveTo(lx,cy-6);ctx.lineTo(lx,cy+6);ctx.stroke();}
    }else{
      drawAssemblySausagePiece(cx,cy,w-16,36);
    }
    ctx.restore();
  }
  function sIngLayer(ing,cx,cy,w){
    ctx.save();
    if(ing==='tom'||ing==='tomato'){
      ctx.fillStyle=C.tom; ctx.beginPath(); ctx.ellipse(cx,cy,w/2,11,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,220,200,.55)';
      [-22,0,22].forEach(function(dx){ctx.beginPath();ctx.ellipse(cx+dx,cy,4,8,0,0,Math.PI*2);ctx.fill();});
    }else if(ing==='cab'||ing==='cabbage'){
      ctx.fillStyle=C.cab; ctx.beginPath(); ctx.ellipse(cx,cy,w/2+8,8,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=C.cabD; ctx.lineWidth=1.5;
      for(var i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(cx-w/2,cy+i*2.5);ctx.quadraticCurveTo(cx,cy+i*2.5-3,cx+w/2,cy+i*2.5);ctx.stroke();}
    }else{
      ctx.fillStyle=C.sau; ctx.beginPath(); ctx.ellipse(cx,cy,w/2-8,18,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=C.sauL; ctx.beginPath(); ctx.ellipse(cx-14,cy-6,11,5,-0.2,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  function sKnife(kx,ky,angle){
    ctx.save(); ctx.translate(kx,ky); ctx.rotate(angle);
    ctx.fillStyle=C.kniH; rr(-10,0,20,52,5); ctx.fill();
    ctx.fillStyle='#7a8090'; ctx.fillRect(-14,-6,28,10);
    ctx.fillStyle=C.kni;
    ctx.beginPath(); ctx.moveTo(-8,-6); ctx.lineTo(8,-6); ctx.lineTo(5,-76); ctx.lineTo(0,-90); ctx.lineTo(-5,-76); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.moveTo(-5,-6); ctx.lineTo(-1,-6); ctx.lineTo(0,-76); ctx.lineTo(-4,-76); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* ── Step bar ──────────────────────────────────────────────── */
  function curStep(){for(var i=0;i<STEPS.length;i++)if(STEPS[i].states.indexOf(G.st)>=0)return i;return -1;}
  function drawStepBar(){
    ctx.fillStyle=C.ui; ctx.fillRect(0,0,VW,SH);
    var cs=curStep(), sw=(VW-106)/4;
    STEPS.forEach(function(si,i){
      var sx=4+i*sw, bg=i<cs?C.sDone:i===cs?C.sAct:C.sOff;
      fillRR(sx,8,sw-5,SH-16,9,bg);
      ctx.font='20px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(si.icon,sx+(sw-5)/2,8+(SH-16)/2-7);
      ctx.font='bold 9px Prompt,sans-serif'; ctx.fillStyle=C.w;
      ctx.fillText(si.lbl,sx+(sw-5)/2,SH-13); ctx.textBaseline='alphabetic';
    });
    var bx=VW-100;
    fillRR(bx,8,95,SH-16,9,C.panel);
    ctx.font='bold 10px Prompt,sans-serif'; ctx.fillStyle=C.gold; ctx.textAlign='center';
    ctx.fillText('คะแนนรวม',bx+47,27);
    ctx.font='bold 23px Prompt,sans-serif'; ctx.fillStyle=C.w;
    ctx.fillText(G.total,bx+47,56);
  }

  /* ── Screens ───────────────────────────────────────────────── */
  function drawSel(){
    drawBg();
    ctx.font='bold 30px Prompt,sans-serif'; ctx.fillStyle=C.w; ctx.textAlign='center';
    ctx.fillText('🍳 Cooking Game',VW/2,90);
    ctx.font='16px Prompt'; ctx.fillStyle=C.acc; ctx.fillText('เลือกอาหารที่จะทำ',VW/2,124);
    var foods=[{l:'Hot Dog',e:'🌭',ok:true},{l:'Burger',e:'🍔',ok:false},{l:'Fries',e:'🍟',ok:false}];
    foods.forEach(function(f,i){
      var bx=30+i*145,by=160,bw=130,bh=162;
      fillRR(bx,by,bw,bh,16,f.ok?'#7B3F10':'#1e2440');
      ctx.font='52px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.globalAlpha=f.ok?1:0.32; ctx.fillText(f.e,bx+bw/2,by+bh/2-14); ctx.globalAlpha=1;
      ctx.font=(f.ok?'bold ':'')+'14px Prompt'; ctx.fillStyle=f.ok?C.w:'#3a3d62'; ctx.textBaseline='alphabetic';
      ctx.fillText(f.l,bx+bw/2,by+bh-18);
    });
    var pc=VW/2, py=510;
    sBunTop(pc,py-60,210,52); sIngLayer('cab',pc,py-18,192);
    sIngLayer('tom',pc,py-6,174); sIngLayer('sau',pc,py+10,155); sBunBot(pc,py+26,210,44);
  }

  function drawBunCut(ts){
    drawBg(); drawStepBar();
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.8)'; ctx.textAlign='center';
    ctx.fillText('ลากตัดขนมปังเป็น 2 ชิ้น',VW/2,SH+28);
    if(G.split){
      drawBunPiece(G.leftPiece,-8); drawBunPiece(G.rightPiece,8);
      ctx.font='bold 26px Prompt'; ctx.fillStyle=C.gold; ctx.textAlign='center';
      ctx.fillText('ตัดได้ '+G.scores.bun+' คะแนน! '+(G.scores.bun>=80?'🎉':G.scores.bun>=50?'👍':'💪'),VW/2,BUN_BBY+52);
      ctx.font='14px Prompt'; ctx.fillStyle='rgba(255,255,255,.55)';
      ctx.fillText(G.scores.bun>=80?'ตัดตรงมาก!':G.scores.bun>=50?'ดีพอใช้':'ลองใหม่นะ',VW/2,BUN_BBY+78);
      drawBtn(VW/2-85,BUN_BBY+98,170,52,'ต่อไป →',C.acc);
    }else{
      drawBunSprite();
      ctx.setLineDash([9,6]); ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(BCX,BTY-22); ctx.lineTo(BCX,BUN_BBY+22); ctx.stroke(); ctx.setLineDash([]);
      if(G.pts.length>1){
        ctx.strokeStyle=C.acc; ctx.lineWidth=4.5; ctx.lineCap='round'; ctx.lineJoin='round';
        ctx.beginPath(); ctx.moveTo(G.pts[0].x,G.pts[0].y);
        G.pts.forEach(function(p){ctx.lineTo(p.x,p.y);}); ctx.stroke();
      }
      if(!G.cutting&&G.pts.length===0){
        var t=(ts%1400)/1400, hy=BTY-38+t*(BH+76);
        ctx.fillStyle='rgba(46,196,182,'+(0.35+0.35*Math.sin(ts/280))+')';
        ctx.beginPath(); ctx.arc(BCX,hy,11,0,Math.PI*2); ctx.fill();
      }
    }
  }

  function drawChop(ts){
    drawBg(); drawStepBar();
    var isTom=G.ing==='tom';
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)'; ctx.textAlign='center';
    ctx.fillText('แตะสับ'+(isTom?'มะเขือเทศ':'กะหล่ำปลี')+'!',VW/2,SH+30);
    var elapsed=G.chopRun?Math.min(CHOP_DUR,ts-G.chopStart):0;
    var pct=Math.max(0,1-elapsed/CHOP_DUR);
    if(G.chopRun&&!G.chopDone&&elapsed>=CHOP_DUR) finishChop();
    fillRR(40,SH+48,VW-80,18,9,'#1a2035');
    fillRR(40,SH+48,(VW-80)*pct,18,9,pct>0.3?C.acc:C.red);
    ctx.font='bold 11px Prompt'; ctx.fillStyle=C.w;
    ctx.fillText(Math.max(0,Math.ceil((CHOP_DUR-elapsed)/1000))+'วิ',VW/2,SH+60);
    if(isTom) sTomato(ICX,ICY,IR,G.chopSt); else sCabbage(ICX,ICY,IR,G.chopSt);
    var kA=0;
    if(G.kAnim){
      var ae=ts-G.kAnimStart, dur=300;
      kA=ae<dur/2?-(ae/(dur/2))*Math.PI/2:-((dur-ae)/(dur/2))*Math.PI/2;
      if(ae>=dur){G.kAnim=0;kA=0;}
    }
    sKnife(ICX+IR+52,ICY-28,kA);
    ctx.font='26px sans-serif'; ctx.textAlign='center'; ctx.fillStyle=C.gold;
    ctx.fillText(G.chopSt===0?'☆☆☆':G.chopSt===1?'⭐☆☆':'⭐⭐⭐',VW/2+55,ICY+IR+40);
    ctx.font='12px Prompt'; ctx.fillStyle='rgba(255,255,255,.4)';
    ctx.fillText('สับ '+G.taps+' ครั้ง',VW/2+55,ICY+IR+60);
    if(G.chopDone){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold; ctx.textAlign='center';
      ctx.fillText('เสร็จแล้ว!',VW/2,320);
      var sc=isTom?G.scores.tom:G.scores.cab;
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; ctx.fillText(sc+' คะแนน',VW/2,372);
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc);
    }
  }

  function drawSau(ts){
    drawBg(); drawStepBar();
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.8)'; ctx.textAlign='center';
    ctx.fillText('แตะตอนมีดผ่านรอยตัด! (2 ครั้ง)',VW/2,SH+26);
    if(G.cuts<2){G.kY+=G.kDir*G.kSpd; if(G.kY>STOP+NL*LH-12)G.kDir=-1; if(G.kY<STOP+12)G.kDir=1;}
    sSausageFull(G.cuts);
    if(G.cuts<2){
      CUT_TY.forEach(function(ty,i){
        if(i>=G.cuts){
          ctx.strokeStyle='rgba(46,196,182,.5)'; ctx.lineWidth=2.5; ctx.setLineDash([6,4]);
          ctx.beginPath(); ctx.moveTo(SCX-36,ty); ctx.lineTo(SCX+36,ty); ctx.stroke(); ctx.setLineDash([]);
          ctx.font='10px Prompt'; ctx.fillStyle=C.acc; ctx.textAlign='left';
          ctx.fillText('ตัดที่นี่',SCX+40,ty+4);
        }
      });
      CUT_TY.forEach(function(ty,i){
        if(i<G.cuts)return;
        var d=Math.abs(G.kY-ty);
        if(d<30){ctx.fillStyle='rgba(46,196,182,'+(0.14*(1-d/30))+')'; ctx.fillRect(0,ty-14,VW,28);}
      });
      ctx.save(); ctx.translate(KX,G.kY); ctx.rotate(-Math.PI/2);
      ctx.fillStyle=C.kni;
      ctx.beginPath(); ctx.moveTo(-7,-6); ctx.lineTo(7,-6); ctx.lineTo(4,-74); ctx.lineTo(0,-88); ctx.lineTo(-4,-74); ctx.closePath(); ctx.fill();
      ctx.fillStyle=C.kniH; rr(-10,-6+74,20,50,5); ctx.fill();
      ctx.restore();
    }
    if(G.cutSc.length>0){
      G.cutSc.forEach(function(cs,i){
        ctx.font='bold 13px Prompt'; ctx.fillStyle=cs>=70?C.grn:C.gold; ctx.textAlign='center';
        ctx.fillText(cs>=70?'🎯 ตรง! +'+cs:'📍 พอใช้ +'+cs,VW/2,680-i*22);
      });
    }
    ctx.font='bold 14px Prompt'; ctx.fillStyle=C.w; ctx.textAlign='center';
    ctx.fillText('ตัดแล้ว '+G.cuts+'/2',VW/2,720);
    if(G.cuts>=2){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold; ctx.textAlign='center';
      ctx.fillText('ตัดเสร็จ! ✂️',VW/2,310);
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; ctx.fillText(G.scores.sau+' คะแนน',VW/2,362);
      drawBtn(VW/2-80,402,160,50,'ต่อไป →',C.acc);
    }
  }

  function drawCmb(ts){
    drawBg(); drawStepBar();
    var cur=G.cList[G.cIdx];
    if(G.cIdx<G.cList.length){
      ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)'; ctx.textAlign='center';
      ctx.fillText('แตะเพื่อวาง'+(ING_LABELS[cur]||cur)+'!',VW/2,SH+26);
      G.sX+=G.sDir*G.sSpd; if(G.sX>VW-45)G.sDir=-1; if(G.sX<45)G.sDir=1;
    }
    if(!drawAssemblyBunPiece(G.rightPiece,VW/2,CMB_BBY+23,222,46)) sBunBot(VW/2,CMB_BBY,222,46);
    G.dropped.forEach(function(d){
      var t=Math.min(1,(ts-d.dropStart)/DROP_DUR);
      var ease=1-(1-t)*(1-t);
      drawAssemblyLayer(d.ing,d.x,d.fromY+(d.toY-d.fromY)*ease,185);
    });
    if(G.cIdx>=G.cList.length){
      if(!drawAssemblyBunPiece(G.leftPiece,VW/2,CMB_BBY-G.dropped.length*20-33,222,55))
        sBunTop(VW/2,CMB_BBY-G.dropped.length*20-60,222,55);
    }
    if(G.cIdx<G.cList.length){
      ctx.strokeStyle='rgba(46,196,182,.38)'; ctx.lineWidth=2; ctx.setLineDash([5,4]);
      ctx.strokeRect(VW/2-CTW/2,CMB_BBY-14,CTW,20); ctx.setLineDash([]);
      ctx.fillStyle='rgba(46,196,182,.06)'; ctx.fillRect(VW/2-CTW/2,CMB_BBY-14,CTW,20);
      ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1; ctx.setLineDash([3,6]);
      ctx.beginPath(); ctx.moveTo(G.sX,240); ctx.lineTo(G.sX,CMB_BBY-14); ctx.stroke(); ctx.setLineDash([]);
      if(cur==='tom') sTomato(G.sX,225,38,G.tomFinalSt);
      else if(cur==='cab') sCabbage(G.sX,225,38,G.cabFinalSt);
      else drawAssemblySausagePiece(G.sX,225,80,30);
    }
    if(G.cIdx>=G.cList.length&&!G.allDone){
      G.allDone=true;
      var acc=G.dropped.reduce(function(s,d){return s+d.acc;},0)/G.dropped.length;
      G.scores.cmb=Math.round(acc*100); G.total+=G.scores.cmb;
      sc.time.delayedCall(700,function(){G.st=S.CMB_R;});
    }
  }

  function drawResult(key){
    drawBg(); drawStepBar();
    fillRR(45,SH+28,VW-90,205,18,C.ui);
    ctx.font='bold 24px Prompt'; ctx.fillStyle=C.gold; ctx.textAlign='center';
    ctx.fillText('เสร็จสิ้น! 🎉',VW/2,SH+76);
    var score=G.scores[key];
    ctx.font='bold 46px Prompt'; ctx.fillStyle=C.w; ctx.fillText(score,VW/2,SH+142);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.45)'; ctx.fillText('คะแนน',VW/2,SH+166);
    ctx.font='16px Prompt';
    ctx.fillStyle=score>=80?C.sDone:score>=50?C.gold:C.red;
    ctx.fillText(score>=80?'⭐⭐⭐ ยอดเยี่ยม!':score>=50?'⭐⭐ ดีมาก!':'⭐ ลองใหม่นะ',VW/2,SH+200);
    ctx.font='12px Prompt'; ctx.fillStyle='rgba(255,255,255,.35)';
    ctx.fillText('คะแนนรวม: '+G.total,VW/2,SH+228);
    drawBtn(VW/2-100,SH+258,200,54,'🎤 พูดคำนี้ด้วย!',C.acc);
  }

  function drawFinal(){
    drawBg();
    ctx.font='bold 24px Prompt'; ctx.fillStyle=C.gold; ctx.textAlign='center';
    ctx.fillText('🎉 Hot Dog สำเร็จ! 🎉',VW/2,68);
    var fc=VW/2, baseY=285;
    if(!drawAssemblyBunPiece(G.rightPiece,fc,baseY+23,216,44)) sBunBot(fc,baseY,216,44);
    G.dropped.forEach(function(d,i){drawAssemblyLayer(d.ing,d.x,baseY-22-i*20,185);});
    if(!drawAssemblyBunPiece(G.leftPiece,fc,baseY-G.dropped.length*20-33,216,55))
      sBunTop(fc,baseY-G.dropped.length*20-60,216,55);
    fillRR(28,350,VW-56,210,16,C.ui);
    var rows=[['ตัดขนมปัง','bun'],['สับมะเขือเทศ','tom'],['สับกะหล่ำปลี','cab'],['ตัดไส้กรอก','sau'],['ใส่ส่วนผสม','cmb']];
    rows.forEach(function(r,i){
      var ry=382+i*34;
      ctx.font='14px Prompt'; ctx.fillStyle='rgba(255,255,255,.72)'; ctx.textAlign='left'; ctx.fillText(r[0],48,ry);
      ctx.textAlign='right'; ctx.fillStyle=C.gold; ctx.fillText(G.scores[r[1]]+' pts',VW-48,ry);
    });
    ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(28,558,VW-56,1);
    ctx.font='bold 20px Prompt'; ctx.fillStyle=C.w; ctx.textAlign='center';
    ctx.fillText('คะแนนรวม: '+G.total+' คะแนน',VW/2,584);
    drawBtn(VW/2-94,614,188,52,'🔄 เล่นอีกครั้ง',C.acc);
  }

  /* ── Game logic ────────────────────────────────────────────── */
  function bestFit(pts){
    var n=pts.length; if(n<2)return 90;
    var sx=0,sy=0,sxy=0,sxx=0;
    pts.forEach(function(p){sx+=p.x;sy+=p.y;sxy+=p.x*p.y;sxx+=p.x*p.x;});
    var d=n*sxx-sx*sx; if(Math.abs(d)<1e-5)return 90;
    return Math.atan((n*sxy-sx*sy)/d)*180/Math.PI;
  }
  function finishChop(){
    G.chopDone=true;
    var key=G.ing==='tom'?'tom':'cab';
    G.scores[key]=G.chopSt===0?20:G.chopSt===1?60:100;
    G.total+=G.scores[key];
    if(G.ing==='tom')G.tomFinalSt=G.chopSt; else G.cabFinalSt=G.chopSt;
  }
  function initSt(s){
    if(s===S.TOM){G.ing='tom';G.taps=0;G.chopSt=0;G.chopRun=false;G.chopDone=false;G.chopStart=0;G.kAnim=0;}
    if(s===S.CAB){G.ing='cab';G.taps=0;G.chopSt=0;G.chopRun=false;G.chopDone=false;G.chopStart=0;G.kAnim=0;}
    if(s===S.SAU){G.kY=260;G.kDir=1;G.kSpd=2.8;G.cuts=0;G.cutSc=[];G.scores.sau=0;}
    if(s===S.CMB){G.cList=['tom','cab','sau'];G.cIdx=0;G.sX=240;G.sDir=1;G.dropped=[];G.allDone=false;}
  }
  function getWord(fromSt){
    var idx=STEP_IDX[fromSt];
    if(idx===undefined||!words||!words.length)return null;
    return words[idx%words.length];
  }
  function showPopup(fromSt,toSt){
    var w=getWord(fromSt);
    if(!w){initSt(toSt);G.st=toSt;return;}
    G.st=-1;
    callbacks.onPractice(w,null,function(){initSt(toSt);G.st=toSt;});
  }

  /* ══ Phaser Scene ══════════════════════════════════════════ */
  var CookScene=new Phaser.Class({
    Extends:Phaser.Scene,
    initialize:function(){Phaser.Scene.call(this,{key:'cooking'});},

    preload:function(){
      this.load.audio('ck_chop', 'soundeffect/KifeChop.mp3');
      this.load.audio('ck_cut',  'soundeffect/TomatoCut.mp3');
      this.load.audio('ck_bread','soundeffect/SlicingToast.mp3');
    },

    create:function(){
      var self=this; sc=this;
      ctx=this.sys.game.canvas.getContext('2d');
      this.sfxChop =this.sound.add('ck_chop', {volume:0.7});
      this.sfxCut  =this.sound.add('ck_cut',  {volume:0.8});
      this.sfxBread=this.sound.add('ck_bread',{volume:0.7,loop:true});
      resetG();
      this.input.on('pointerdown', function(ptr){self.onDown(ptr.x,ptr.y,self.time.now);});
      this.input.on('pointermove', function(ptr){if(ptr.isDown)self.onMove(ptr.x,ptr.y);});
      this.input.on('pointerup',   function(ptr){self.onUp(ptr.x,ptr.y);});
    },

    update:function(time){
      if(G.st<0)return;
      ctx.clearRect(0,0,VW,VH);
      switch(G.st){
        case S.SEL:   drawSel();break;
        case S.BUN:   drawBunCut(time);break;
        case S.BUN_R: drawResult('bun');break;
        case S.TOM:   drawChop(time);break;
        case S.TOM_R: drawResult('tom');break;
        case S.CAB:   drawChop(time);break;
        case S.CAB_R: drawResult('cab');break;
        case S.SAU:   drawSau(time);break;
        case S.SAU_R: drawResult('sau');break;
        case S.CMB:   drawCmb(time);break;
        case S.CMB_R: drawResult('cmb');break;
        case S.FIN:   drawFinal();break;
      }
    },

    onDown:function(x,y,now){
      if(G.st===S.SEL){if(hit(x,y,30,160,130,162))G.st=S.BUN;return;}
      if(G.st===S.BUN){
        if(!G.split){G.cutting=true;G.pts=[{x:x,y:y}];this.sfxBread.play();}
        else if(hit(x,y,VW/2-85,BUN_BBY+98,170,52))G.st=S.BUN_R;
        return;
      }
      if(G.st===S.BUN_R){if(hit(x,y,VW/2-100,SH+258,200,54))showPopup(S.BUN_R,S.TOM);return;}
      if(G.st===S.TOM||G.st===S.CAB){
        if(G.chopDone){if(hit(x,y,VW/2-80,412,160,50))G.st=(G.ing==='tom'?S.TOM_R:S.CAB_R);return;}
        var dx=x-ICX,dy=y-ICY;
        if(dx*dx+dy*dy<(IR+22)*(IR+22)){
          if(!G.chopRun){G.chopRun=true;G.chopStart=now;}
          G.taps++;G.chopSt=G.taps>=8?2:G.taps>=4?1:0;
          G.kAnim=1;G.kAnimStart=now;
          this.sfxChop.play();this.sfxCut.play();
          if(G.chopSt>=2&&!G.chopDone)finishChop();
        }
        return;
      }
      if(G.st===S.TOM_R){if(hit(x,y,VW/2-100,SH+258,200,54))showPopup(S.TOM_R,S.CAB);return;}
      if(G.st===S.CAB_R){if(hit(x,y,VW/2-100,SH+258,200,54))showPopup(S.CAB_R,S.SAU);return;}
      if(G.st===S.SAU){
        if(G.cuts>=2){if(hit(x,y,VW/2-80,402,160,50))G.st=S.SAU_R;return;}
        var cs=Math.round(Math.max(10,100-Math.abs(G.kY-CUT_TY[G.cuts])*2));
        G.cutSc.push(cs);G.cuts++;
        if(G.cuts>=2){G.scores.sau=Math.round((G.cutSc[0]+G.cutSc[1])/2);G.total+=G.scores.sau;}
        return;
      }
      if(G.st===S.SAU_R){if(hit(x,y,VW/2-100,SH+258,200,54))showPopup(S.SAU_R,S.CMB);return;}
      if(G.st===S.CMB){
        if(G.cIdx<G.cList.length){
          var acc=Math.max(0,1-Math.abs(G.sX-VW/2)/(CTW/2));
          var toY=CMB_BBY-22-G.dropped.length*20;
          G.dropped.push({ing:G.cList[G.cIdx],x:G.sX,acc:acc,dropStart:now,fromY:225,toY:toY});
          G.cIdx++;
        }
        return;
      }
      if(G.st===S.CMB_R){if(hit(x,y,VW/2-100,SH+258,200,54))showPopup(S.CMB_R,S.FIN);return;}
      if(G.st===S.FIN){
        if(hit(x,y,VW/2-94,614,188,52)){
          callbacks.onPoints&&callbacks.onPoints(G.total);
          resetG();
        }
      }
    },

    onMove:function(x,y){
      if(G.st===S.BUN&&G.cutting)G.pts.push({x:x,y:y});
    },

    onUp:function(x,y){
      if(!(G.st===S.BUN&&G.cutting))return;
      this.sfxBread.stop();
      var raw=G.pts.slice(); G.cutting=false;
      if(raw.length<4){G.pts=[];return;}
      if(raw[0].y>raw[raw.length-1].y)raw.reverse();
      if(raw[raw.length-1].y-raw[0].y<BH*0.5){G.pts=[];return;}
      var clip=[],entryDone=false,exitDone=false;
      for(var ci=0;ci<raw.length&&!exitDone;ci++){
        var cp=raw[ci],pp=ci>0?raw[ci-1]:null;
        if(!entryDone){
          if(cp.y>=BTY){
            if(pp&&pp.y<BTY){var et=(BTY-pp.y)/(cp.y-pp.y);clip.push({x:pp.x+et*(cp.x-pp.x),y:BTY});}
            else clip.push({x:cp.x,y:BTY});
            entryDone=true;
          }
        }
        if(entryDone&&cp.y>=BTY&&cp.y<=BUN_BBY)
          clip.push({x:Math.max(BLX,Math.min(BRX,cp.x)),y:cp.y});
        if(entryDone&&!exitDone&&pp&&pp.y<=BUN_BBY&&cp.y>BUN_BBY){
          var xt=(BUN_BBY-pp.y)/(cp.y-pp.y);
          clip.push({x:Math.max(BLX,Math.min(BRX,pp.x+xt*(cp.x-pp.x))),y:BUN_BBY});
          exitDone=true;
        }
      }
      if(!exitDone&&clip.length>0)clip.push({x:Math.max(BLX,Math.min(BRX,raw[raw.length-1].x)),y:BUN_BBY});
      if(clip.length<2){G.pts=[];return;}
      clip[0].y=BTY; clip[clip.length-1].y=BUN_BBY;
      G.leftPiece=[{x:BLX,y:BTY}].concat(clip).concat([{x:BLX,y:BUN_BBY}]);
      G.rightPiece=[{x:BRX,y:BTY},{x:BRX,y:BUN_BBY}].concat(clip.slice().reverse());
      var fromVert=Math.abs(Math.abs(bestFit(clip))-90);
      G.scores.bun=Math.round(Math.max(0,100-fromVert*2.2));
      G.total+=G.scores.bun; G.split=true;
    }
  });

  return new Phaser.Game({
    type:   Phaser.CANVAS,
    parent: 'cookingGame',
    width:  VW, height: VH,
    render: {clearBeforeRender:false},
    backgroundColor: '#111827',
    scale:  {mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH},
    scene:  CookScene,
  });
}

/* ── Public API (mirrors ShootingGame, AirplaneGame, etc.) ── */
var CookingGame=(function(){
  var game=null;
  return{
    start:function(words,cbs){
      if(game){try{game.destroy(true);}catch(e){}game=null;}
      setTimeout(function(){game=createCookingGame(words,cbs);},60);
    },
    stop:function(){
      if(game){try{game.destroy(true);}catch(e){}game=null;}
    }
  };
}());
