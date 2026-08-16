// ============================================================
//  COOKING GAME — Phaser 3  (portrait 480×800)
//  Drawn via raw Canvas 2D so all existing drawing code ports
//  directly; Phaser provides audio, input, and the game loop.
// ============================================================

function createCookingGame(words, callbacks) {
  var VW = 480, VH = 800;

  /* ── State machine ─────────────────────────────────────────
     Hot Dog uses 0-11, Pizza 100s, Breakfast 200s -- disjoint ranges so
     G.st can never accidentally match a different dish's state while
     only one dish's screens/logic are actually meant to be reachable
     (see the DISHES registry below, and drawSel()/onDown's S.SEL
     branch, for how a dish is picked). ── */
  var S  = { SEL:0, BUN:1, BUN_R:2, TOM:3, TOM_R:4, CAB:5, CAB_R:6, SAU:7, SAU_R:8, CMB:9, CMB_R:10, FIN:11 };
  var SP = { DOUGH:100, DOUGH_R:101, SAUCE:102, SAUCE_R:103, CHEESE:104, CHEESE_R:105, TOPPING:106, TOPPING_R:107, BAKE:108, BAKE_R:109, CUT:110, CUT_R:111, FIN:112 };
  var SB = { EGG:200, EGG_R:201, BACON:202, BACON_R:203, TOAST:204, TOAST_R:205, PLATE:206, PLATE_R:207, FIN:208 };
  var SG = { PATTY:300, PATTY_R:301, GRILL:302, GRILL_R:303, VEG:304, VEG_R:305, STACK:306, STACK_R:307, FIN:308 };
  var SF = { PEEL:400, PEEL_R:401, SLICE:402, SLICE_R:403, FRY:404, FRY_R:405, SALT:406, SALT_R:407, FIN:408 };

  /* ── Colours ───────────────────────────────────────────── */
  var C = {
    /* bg/ui/panel/sOff used to be a cold dark navy (#111827/#1e2a40/
       #0f3460) that clashed with img/cooking/bg.jpg's warm wood-board +
       blue-tile kitchen illustration underneath it -- switched to a warm
       dark-brown family (matching the wood board and the outline colour
       below) so the UI chrome reads as part of the same warm kitchen
       scene instead of a mismatched blue-black overlay pasted on top. */
    bg:'#2B1B10', ui:'#4A2E1B', panel:'#7B3F10',
    /* Food colours sampled/matched from img/cooking/bg.jpg's flat-vector
       kitchen illustration (golden board, blue tile, warm reds/greens) so
       the drawn food reads as part of the same illustration, not a
       separate rendering style pasted on top of it. */
    bun:'#EFAE55', bunD:'#C67C2C', bunHi:'#FBD48C',
    tom:'#EB4B36', tomD:'#C22E20', tomHi:'#FF8C74', tomLeaf:'#3FC17B',
    cab:'#3FC17B', cabD:'#237A4A', cabHi:'#8CE0AE',
    sau:'#B2531F', sauD:'#7E3712', sauL:'#E68A46',
    kni:'#E7ECF2', kniD:'#AEB9C7', kniH:'#C0392B', kniHD:'#8F2419',
    acc:'#2EC4B6', gold:'#F0A500',
    red:'#E53935', grn:'#27AE60',
    w:'#fff', gray:'#606880',
    sh:'rgba(20,15,5,.28)',
    /* Consistent dark warm-brown outline + brighter gloss highlight on
       every food shape -- a polished, appetizing "cooking game" look
       (crisp outline + shine) rather than plain flat fills. */
    outline:'#3D2010',
    // sOff deliberately lighter than `ui` (the step bar's own background)
    // -- they were identical before this pass, making not-yet-reached
    // step pills fill-invisible against the bar itself.
    sDone:'#27AE60', sAct:'#2EC4B6', sOff:'#6B4226',
  };

  /* ── Layout constants ──────────────────────────────────── */
  var SH = 78;
  var BLX=80, BTY=315, BRX=400, BUN_BBY=465;
  var BCX=VW/2, BW=BRX-BLX, BH=BUN_BBY-BTY;
  var CHOP_DUR=9000, ICX=185, ICY=380, IR=90;
  // Chopping reveals the vegetable progressively (2x3 grid of regions)
  // instead of the whole thing flipping between 3 fixed looks. Taps
  // needed to fully chop (CHOPS_NEEDED) is deliberately decoupled from
  // how many visual regions there are (VEG_CELLS) -- sTomato/sCabbage
  // take a continuous 0..1 "how much is chopped" fraction, so a much
  // higher tap count still animates smoothly across the same 6 regions
  // instead of needing a cluttered 40-cell grid.
  var VEG_COLS=3, VEG_ROWS=2, VEG_CELLS=VEG_COLS*VEG_ROWS;
  var CHOPS_NEEDED=40;
  function vegCellRect(cx,cy,r,idx){
    var col=idx%VEG_COLS, row=Math.floor(idx/VEG_COLS);
    var cw=(r*1.9)/VEG_COLS, ch=(r*1.6)/VEG_ROWS;
    var x0=cx-cw*VEG_COLS/2+col*cw, y0=cy-ch*VEG_ROWS/2+row*ch;
    return {x:x0,y:y0,w:cw,h:ch,cx:x0+cw/2,cy:y0+ch/2};
  }
  // Drawn as one continuous pill/capsule, not a chain of separate link
  // segments -- a real hot dog sausage is one smooth piece, and drawing
  // it as visually-pre-divided links was competing with (and burying)
  // the actual cut marks the player makes.
  var SCX=168, STOP=148, SAU_BOT=620, LW=58;
  var CUT_TY=[310,470], KX=SCX+90;
  var CMB_BBY=630, CTW=155, DROP_DUR=480;
  // Shared "play again / exit" button pair on every dish's finished
  // screen (drawFinal/drawPizzaFinal/drawBreakfastFinal) -- side by side
  // instead of a single centered button, so leaving the cooking game
  // entirely doesn't require hunting for the small always-there "← ออก"
  // button up in the shared HUD bar above the canvas.
  var FIN_BTN_W=160, FIN_BTN_GAP=8;
  var FIN_BTN_X0=(VW-(FIN_BTN_W*2+FIN_BTN_GAP))/2, FIN_BTN_X1=FIN_BTN_X0+FIN_BTN_W+FIN_BTN_GAP;
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

  /* ── Pizza layout + steps ─────────────────────────────────────
     DOUGH is the only step where the pizza's radius is actually
     interactive (drag-to-stretch); every later step just displays it at
     a fixed PZ_DISPLAY_R regardless of what the player stretched it to
     -- G.doughFinal/G.doughR only ever feed the DOUGH step's own score,
     never the layout math of later screens. Keeps SAUCE/CHEESE/TOPPING/
     BAKE/FIN geometry fixed and simple instead of every one of them
     needing to re-derive safe layout bounds from a variable radius. ── */
  var PZ_CX=VW/2, PZ_CY=380, PZ_R_MIN=60, PZ_R_TARGET=150, PZ_R_MAX=185, PZ_R_TORN=210;
  var PZ_DISPLAY_R=130;
  var CHEESE_TAPS_NEEDED=32, SAUCE_DUR=8000;
  var TOPPING_LIST=['pepperoni','mushroom','pepperoni','olive','pepperoni','mushroom'];
  var TOPPING_LABELS={pepperoni:'เปปเปอโรนี', mushroom:'เห็ด', olive:'มะกอก'};
  // Fixed decorative landing spots on the pizza (not the tap-timing
  // position itself, which only drives the score) -- keeps toppings
  // scattered readably instead of stacking on top of each other.
  var TOPPING_SPOTS=[{dx:-45,dy:-30},{dx:40,dy:-35},{dx:-55,dy:15},{dx:50,dy:20},{dx:-15,dy:50},{dx:25,dy:-5}];
  var BAKE_DUR=6000, BAKE_GOOD=[0.55,0.78]; // fraction-of-duration "perfectly baked" window
  /* Slicing: drag across the baked pizza to cut it into 8 wedges. Each
     drag is matched to the nearest not-yet-used guide angle, and scored
     on how close the stroke passes to the center -- a wedge cut that
     misses the middle leaves uneven slices. */
  var PZ_CUT_ANGLES=[0, Math.PI/4, Math.PI/2, Math.PI*3/4];
  var PZ_CUTS_NEEDED=PZ_CUT_ANGLES.length;
  var PIZZA_STEPS=[
    {icon:'🫓',lbl:'1.แป้ง', states:[SP.DOUGH,SP.DOUGH_R]},
    {icon:'🍅',lbl:'2.ซอส', states:[SP.SAUCE,SP.SAUCE_R]},
    {icon:'🧀',lbl:'3.ชีส', states:[SP.CHEESE,SP.CHEESE_R]},
    {icon:'🍕',lbl:'4.หน้า', states:[SP.TOPPING,SP.TOPPING_R]},
    {icon:'🔥',lbl:'5.อบ',  states:[SP.BAKE,SP.BAKE_R]},
    {icon:'🔪',lbl:'6.ตัด', states:[SP.CUT,SP.CUT_R,SP.FIN]},
  ];
  var PIZZA_STEP_IDX={};
  PIZZA_STEP_IDX[SP.DOUGH_R]=0; PIZZA_STEP_IDX[SP.SAUCE_R]=1; PIZZA_STEP_IDX[SP.CHEESE_R]=2;
  PIZZA_STEP_IDX[SP.TOPPING_R]=3; PIZZA_STEP_IDX[SP.BAKE_R]=4; PIZZA_STEP_IDX[SP.CUT_R]=5;

  /* ── Breakfast layout + steps ──────────────────────────────── */
  var EGG_CX=VW/2, EGG_CY=380, EGG_R=100, EGG_TAPS_NEEDED=8, EGG_DUR=6000;
  var BC_TOP=210, BC_BOT=560, BC_CUT_TY=[330,470], BC_KX=VW/2+120;
  var TOAST_DUR=5000, TOAST_GOOD=[0.5,0.75];
  var PLATE_LIST=['egg','bacon','toast'];
  var PLATE_LABELS={egg:'ไข่ดาว', bacon:'เบคอน', toast:'ขนมปังปิ้ง'};
  var BREAKFAST_STEPS=[
    {icon:'🥚',lbl:'1.ไข่',    states:[SB.EGG,SB.EGG_R]},
    {icon:'🥓',lbl:'2.เบคอน', states:[SB.BACON,SB.BACON_R]},
    {icon:'🍞',lbl:'3.ปิ้ง',   states:[SB.TOAST,SB.TOAST_R]},
    {icon:'🍽️',lbl:'4.จัดจาน',states:[SB.PLATE,SB.PLATE_R,SB.FIN]},
  ];
  var BREAKFAST_STEP_IDX={};
  BREAKFAST_STEP_IDX[SB.EGG_R]=0; BREAKFAST_STEP_IDX[SB.BACON_R]=1;
  BREAKFAST_STEP_IDX[SB.TOAST_R]=2; BREAKFAST_STEP_IDX[SB.PLATE_R]=3;

  /* ── Burger layout + steps ─────────────────────────────────────
     Four deliberately different verbs so no two steps feel like the
     same tap: press (tap-count), grill (timing), veg (moving drop),
     stack (single precision drop of the top bun). ── */
  var BG_CX=VW/2, BG_CY=380;
  var PATTY_TAPS_NEEDED=14, PATTY_DUR=7000;
  var PATTY_R0=58, PATTY_R1=86;   // grows from lumpy ball to a wide flat patty as it's pressed
  var GRILL_DUR=6500, GRILL_GOOD=[0.5,0.74];
  var BG_VEG_LIST=['lettuce','tomato','cheese'];
  var BG_VEG_LABELS={lettuce:'ผักกาด', tomato:'มะเขือเทศ', cheese:'ชีส'};
  var BG_STACK_BY=600;            // y of the bottom bun's top face in the stack screen
  var BG_TARGET_W=150;            // width of the "line the top bun up here" target zone
  var BG_SWEEP=112;               // how far either side of center the top bun travels
  var BURGER_STEPS=[
    {icon:'🥩',lbl:'1.ปั้น',   states:[SG.PATTY,SG.PATTY_R]},
    {icon:'🔥',lbl:'2.ย่าง',   states:[SG.GRILL,SG.GRILL_R]},
    {icon:'🥬',lbl:'3.ผัก',    states:[SG.VEG,SG.VEG_R]},
    {icon:'🍔',lbl:'4.ประกอบ', states:[SG.STACK,SG.STACK_R,SG.FIN]},
  ];
  var BURGER_STEP_IDX={};
  BURGER_STEP_IDX[SG.PATTY_R]=0; BURGER_STEP_IDX[SG.GRILL_R]=1;
  BURGER_STEP_IDX[SG.VEG_R]=2;   BURGER_STEP_IDX[SG.STACK_R]=3;

  /* ── Fries layout + steps ──────────────────────────────────────
     SALT is the one step in the whole game that can be overdone --
     every other step rewards "more taps = better", so a sweet spot the
     player can overshoot gives the dish its own distinct risk. ── */
  var FR_CX=VW/2, FR_CY=370;
  var POTATO_RX=78, POTATO_RY=104;
  var PEEL_TAPS_NEEDED=12, PEEL_DUR=7000;
  var FR_SLICE_XS=[-38,-13,13,38];       // guide x-offsets for the 4 lengthwise cuts
  var FR_SLICES_NEEDED=FR_SLICE_XS.length;
  var FRY_DUR=6500, FRY_GOOD=[0.52,0.76];
  var SALT_TARGET=10, SALT_MAX=18;       // best at SALT_TARGET shakes; past SALT_MAX it's ruined
  var FRIES_STEPS=[
    {icon:'🥔',lbl:'1.ปอก', states:[SF.PEEL,SF.PEEL_R]},
    {icon:'🔪',lbl:'2.หั่น', states:[SF.SLICE,SF.SLICE_R]},
    {icon:'🔥',lbl:'3.ทอด', states:[SF.FRY,SF.FRY_R]},
    {icon:'🧂',lbl:'4.เกลือ',states:[SF.SALT,SF.SALT_R,SF.FIN]},
  ];
  var FRIES_STEP_IDX={};
  FRIES_STEP_IDX[SF.PEEL_R]=0; FRIES_STEP_IDX[SF.SLICE_R]=1;
  FRIES_STEP_IDX[SF.FRY_R]=2;  FRIES_STEP_IDX[SF.SALT_R]=3;

  // Looked up by dish key wherever behaviour needs to branch by dish
  // (step bar, word-practice cycling, food-select routing) instead of
  // repeating the same three-way if/else in every one of those places.
  var DISHES={
    hotdog:    { steps:STEPS,           stepIdx:STEP_IDX,           first:S.BUN   },
    pizza:     { steps:PIZZA_STEPS,     stepIdx:PIZZA_STEP_IDX,     first:SP.DOUGH},
    breakfast: { steps:BREAKFAST_STEPS, stepIdx:BREAKFAST_STEP_IDX, first:SB.EGG  },
    burger:    { steps:BURGER_STEPS,    stepIdx:BURGER_STEP_IDX,    first:SG.PATTY},
    fries:     { steps:FRIES_STEPS,     stepIdx:FRIES_STEP_IDX,     first:SF.PEEL }
  };

  /* ── Game state ────────────────────────────────────────── */
  var G;
  // Every screen change goes through this (instead of assigning G.st
  // directly) so update() knows when the current screen was entered --
  // that's what drives the pop-in transition below, and the animated
  // score counters (see animateScore).
  function setState(s){ G.st=s; G.stAt=sc?sc.time.now:0; }
  function resetG(){
    G={
      st:S.SEL, stAt:0, dish:null,
      scores:{bun:0,tom:0,cab:0,sau:0,cmb:0, dough:0,sauce:0,cheese:0,topping:0,bake:0,pzcut:0, egg:0,bacon:0,toast:0,plate:0,
              patty:0,grill:0,bgveg:0,stack:0, peel:0,slice:0,fry:0,salt:0},
      total:0,
      cutting:false, pts:[], split:false, topPiece:[], botPiece:[],
      ing:'tom', taps:0, choppedCount:0,
      chopRun:false, chopDone:false, chopStart:0,
      kAnim:0, kAnimStart:0, tomFinalPct:0, cabFinalPct:0,
      kY:260, kDir:1, kSpd:2.8, cuts:0, cutSc:[], cutY:[],
      cList:['tom','cab','sau'], cIdx:0,
      sX:240, sDir:1, sSpd:3.2, dropped:[], allDone:false,
      scoreAnim:{},  // scoreKey -> {from, to, startedAt}, see animateScore/drawScoreVal
      tapFx:null,    // {x, y, startedAt} -- ripple drawn at the last successful button tap
      chopPunch:0, starPunch:0, lastStarN:0, cutAt:[],
      confetti:null, confettiStart:0,
      // ── Cooking-Mama-style juice: a big flash text ("PERFECT!"/"OK!")
      // on every scored action, a short screen-shake for great hits, and a
      // consecutive-great-score combo counter (resets whenever a step
      // scores below 80) -- see gradeScore()/triggerBigFx()/triggerShake(). ──
      bigFx:null, shakeUntil:0, shakeMag:0, comboCount:0,

      // ── Pizza ──
      doughDragging:false, doughR:0, doughFinal:0, doughDone:false,
      sauceRun:false, sauceStart:0, sauceDone:false, sauceCells:[false,false,false,false,false,false],
      sauceCellAt:[0,0,0,0,0,0],
      cheeseTaps:0, cheeseCount:0, cheeseRun:false, cheeseDone:false, cheeseStart:0,
      cheesePunch:0, cheeseFinalPct:0,
      toppingIdx:0, toppingX:VW/2, toppingDir:1, toppingSpd:3.2, toppingDropped:[], toppingAllDone:false,
      bakeRun:false, bakeStart:0, bakeDone:false, bakeVal:0, bakeTapVal:0,
      // pzCuts: one {ang, sc, at} per completed slice; pzDrag holds the
      // in-progress stroke's start point while the finger is down.
      pzCuts:[], pzCutSc:[], pzDrag:null, pzCutDone:false,

      // ── Breakfast ──
      eggTaps:0, eggCracks:0, eggRun:false, eggDone:false, eggStart:0, eggPunch:0,
      baconY:260, baconDir:1, baconSpd:2.6, baconCuts:0, baconSc:[], baconCutY:[], baconAt:[],
      toastRun:false, toastStart:0, toastDone:false, toastVal:0, toastTapVal:0,
      plateIdx:0, plateX:VW/2, plateDir:1, plateSpd:3.2, plateDropped:[], plateAllDone:false,

      // ── Burger ──
      pattyTaps:0, pattyCount:0, pattyRun:false, pattyDone:false, pattyStart:0, pattyPunch:0, pattyFinalPct:0,
      grillRun:false, grillStart:0, grillDone:false, grillVal:0, grillTapVal:0, grillFlip:0,
      bgVegIdx:0, bgVegX:VW/2, bgVegDir:1, bgVegSpd:3.2, bgVegDropped:[], bgVegAllDone:false,
      stackX:VW/2, stackDir:1, stackSpd:4.2, stackDone:false, stackDropAt:0,

      // ── Fries ──
      peelTaps:0, peelCount:0, peelRun:false, peelDone:false, peelStart:0, peelPunch:0, peelFinalPct:0,
      frSlices:[], frSliceSc:[], frDrag:null, frSliceDone:false,
      fryRun:false, fryStart:0, fryDone:false, fryVal:0, fryTapVal:0,
      saltCount:0, saltRun:false, saltDone:false, saltStart:0, saltPunch:0, saltGrains:[],
    };
  }
  resetG();

  // Ripple feedback for a successful button tap -- drawBtn() itself has
  // no press state (buttons are hit-tested once in onDown, not held),
  // so this is a separate, position-only effect layered on top instead
  // of threading pressed-state through every button.
  function pressFx(x,y){ G.tapFx={x:x,y:y,startedAt:sc.time.now}; if(sc.sfxClick)sc.sfxClick.play(); }
  function drawTapFx(time){
    var fx=G.tapFx; if(!fx)return;
    var t=(time-fx.startedAt)/260;
    if(t>=1){G.tapFx=null;return;}
    var e=1-Math.pow(1-t,2);
    ctx.save();
    ctx.strokeStyle='rgba(255,255,255,'+(0.55*(1-e))+')';
    ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(fx.x,fx.y,10+e*26,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  var BIGFX_Y=300;
  // Cooking-Mama-style big flash text ("PERFECT!"/"GREAT!"/"OK!") shown on
  // every scored action -- pops in with a little overshoot, holds, then
  // fades and drifts up. Drawn unscaled (like drawTapFx) so the text
  // itself always stays crisp and centered regardless of the screen's
  // pop-in transform. The shake (see triggerShake) is applied ONLY to
  // this text's own jitter offset, not to the whole canvas -- it used to
  // be a global ctx.translate in update() wrapping every draw call
  // including buttons, which visibly shifted tappable elements by a few
  // pixels away from where onDown's hit-testing (always untransformed)
  // expected them, occasionally causing a real tap to miss right after a
  // "PERFECT!" -- moving it here keeps the punchy feel without ever
  // touching anything clickable.
  function triggerBigFx(txt,col){ G.bigFx={txt:txt,col:col,startedAt:sc.time.now}; }
  function drawBigFx(time){
    var fx=G.bigFx; if(!fx)return;
    var t=(time-fx.startedAt)/650;
    if(t>=1){G.bigFx=null;return;}
    var inT=Math.min(1,t/0.22);
    var ie=1-Math.pow(1-inT,3);
    var scale=inT<1?1.4-0.4*ie:1;
    var alpha=t<0.7?1:Math.max(0,1-(t-0.7)/0.3);
    var rise=t>0.3?(t-0.3)*44:0;
    var shakeX=0,shakeY=0;
    if(G.shakeUntil&&time<G.shakeUntil){
      var sMag=G.shakeMag*(G.shakeUntil-time)/220;
      shakeX=(Math.random()-0.5)*2*sMag; shakeY=(Math.random()-0.5)*2*sMag;
    }
    ctx.save();
    ctx.globalAlpha=alpha;
    ctx.translate(VW/2+shakeX,BIGFX_Y-rise+shakeY);
    ctx.scale(scale,scale);
    ctx.font='bold 38px Prompt,sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.lineWidth=7; ctx.strokeStyle='rgba(30,15,5,.55)';
    ctx.strokeText(fx.txt,0,0);
    ctx.fillStyle=fx.col;
    ctx.fillText(fx.txt,0,0);
    ctx.textAlign='left'; ctx.textBaseline='alphabetic';
    ctx.restore();
  }
  // Short random-offset jitter magnitude for a great/perfect hit -- decays
  // linearly to 0 over 220ms, consumed only by drawBigFx above (never
  // affects hit-testing since it's not applied to the shared canvas
  // transform anymore).
  function triggerShake(mag){ G.shakeUntil=sc.time.now+220; G.shakeMag=mag; }
  // Central "how good was that score" classification, reused everywhere a
  // step's numeric score becomes final -- keeps the flash text/colour,
  // shake, combo count, and sound consistent across every mini-game
  // instead of re-deriving thresholds at each of the ~13 scoring call
  // sites (chop, cut, sauce, cheese, dough, bake, egg, toast, bun, plus
  // the three drag-and-drop averages).
  function gradeScore(score){
    var grade = score>=90 ? {txt:'PERFECT!',col:'#FFD166',shake:5,ping:true}
      : score>=70 ? {txt:'เยี่ยม!',col:'#2EC4B6',shake:0,ping:true}
      : score>=50 ? {txt:'ดี!',col:'#F0A500',shake:0,ping:false}
      : {txt:'ลองใหม่นะ',col:'#E57373',shake:0,ping:false};
    G.comboCount = score>=80 ? (G.comboCount||0)+1 : 0;
    var label = G.comboCount>=2 ? grade.txt+' x'+G.comboCount : grade.txt;
    triggerBigFx(label,grade.col);
    if(grade.shake) triggerShake(grade.shake);
    if(grade.ping && sc.sfxOk) sc.sfxOk.play();
  }

  /* ── Canvas 2D context — set in create() ───────────────── */
  var ctx;
  var sc; // Phaser scene reference
  var bgImg = null; // kitchen background image — set in create() if it loaded

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
  /* Safari's canvas textAlign='center'/'right' doesn't measure Thai glyph
     widths correctly and renders as if textAlign='left' (text starts at
     what should be its center). Always align left and compute the draw
     position ourselves from measureText() so Thai text lands centered on
     every browser. */
  function T(txt,cx,y,align){
    align=align||'center';
    ctx.textAlign='left';
    var s=String(txt);
    var w=ctx.measureText(s).width;
    var x=align==='center'?cx-w/2:align==='right'?cx-w:cx;
    ctx.fillText(s,x,y);
  }
  // `time`, when passed, drives a small idle scale pulse so a tappable
  // button reads as alive rather than a flat rectangle -- purely a
  // rendering transform (like the screen pop-in above), so onDown's
  // hit() calls against this same x/y/w/h are completely unaffected.
  function drawBtn(x,y,w,h,txt,col,time){
    var cx=x+w/2, cy=y+h/2, pulsing=time!==undefined;
    if(pulsing){
      var s=1+0.025*Math.sin(time*0.004);
      ctx.save(); ctx.translate(cx,cy); ctx.scale(s,s); ctx.translate(-cx,-cy);
    }
    fillRR(x,y,w,h,13,col);
    ctx.font='bold 15px Prompt,sans-serif'; ctx.fillStyle=C.w;
    ctx.textBaseline='middle';
    T(txt,cx,cy,'center'); ctx.textBaseline='alphabetic';
    if(pulsing) ctx.restore();
  }
  function hit(px,py,x,y,w,h){return px>=x&&px<=x+w&&py>=y&&py<=y+h;}

  function drawBg(){
    if(bgImg){
      var iw=bgImg.naturalWidth||bgImg.width, ih=bgImg.naturalHeight||bgImg.height;
      var scale=Math.max(VW/iw,VH/ih);
      var dw=iw*scale, dh=ih*scale;
      ctx.drawImage(bgImg,(VW-dw)/2,(VH-dh)/2,dw,dh);
    }else{
      ctx.fillStyle=C.bg; ctx.fillRect(0,0,VW,VH);
    }
  }

  /* ── Bun ─────────────────────────────────────────────────── */
  function drawBunSprite(){
    fillRR(BLX,BTY,BW,BH,14,C.bun);
    // Flat crust shading built from layered shapes (top highlight band,
    // bottom shadow band) rather than a canvas gradient -- keeps it
    // consistent with the flat-vector look of img/cooking/bg.jpg instead
    // of reading as a separately-rendered style pasted on top of it.
    ctx.save(); ctx.beginPath(); rr(BLX,BTY,BW,BH,14); ctx.clip();
    ctx.fillStyle=C.bunHi; ctx.globalAlpha=.5;
    ctx.beginPath(); ctx.ellipse(BCX,BTY+8,BW*.42,BH*.32,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle=C.bunD; ctx.globalAlpha=.3;
    ctx.fillRect(BLX,BTY+BH-18,BW,18);
    ctx.globalAlpha=1;
    ctx.restore();
    ctx.strokeStyle=C.outline; ctx.lineWidth=3; rr(BLX,BTY,BW,BH,14); ctx.stroke();
    ctx.fillStyle=C.bunD;
    [[185,338],[225,348],[265,336],[305,348],[345,336],[160,352],[380,350]].forEach(function(d){
      ctx.beginPath(); ctx.ellipse(d[0],d[1],4.5,3,0,0,Math.PI*2); ctx.fill();
    });
  }
  function drawBunPiece(poly,dx,dy){
    if(!poly||poly.length<2)return;
    dy=dy||0;
    ctx.save(); ctx.translate(dx,dy);
    ctx.beginPath(); ctx.moveTo(poly[0].x,poly[0].y);
    for(var i=1;i<poly.length;i++) ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath(); ctx.clip(); drawBunSprite(); ctx.restore();
    ctx.save(); ctx.translate(dx,dy);
    ctx.beginPath(); ctx.moveTo(poly[0].x,poly[0].y);
    for(var i=1;i<poly.length;i++) ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath(); ctx.strokeStyle=C.outline; ctx.lineWidth=4; ctx.lineJoin='round'; ctx.stroke(); ctx.restore();
  }
  function sBunTop(cx,cy,w,h){
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=10; ctx.shadowOffsetY=5;
    ctx.fillStyle=C.bun;
    ctx.beginPath();
    ctx.ellipse(cx,cy+h*.35,w/2,h*.6,0,Math.PI,0,false);
    ctx.lineTo(cx+w/2,cy+h); ctx.lineTo(cx-w/2,cy+h); ctx.closePath(); ctx.fill();
    ctx.shadowColor='transparent';
    ctx.fillStyle=C.bunD; ctx.fillRect(cx-w/2,cy+h-10,w,10);
    ctx.fillStyle=C.bunHi; ctx.globalAlpha=.7;
    ctx.beginPath(); ctx.ellipse(cx-w*.13,cy+h*.15,w*.18,h*.12,-0.4,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle=C.bunD;
    [[-.18,-.1],[.05,-.16],[.24,-.04]].forEach(function(p){
      ctx.beginPath(); ctx.ellipse(cx+p[0]*w,cy+h*.35+p[1]*h,3.5,2.5,0,0,Math.PI*2); ctx.fill();
    });
    ctx.strokeStyle=C.outline; ctx.lineWidth=3; ctx.lineJoin='round';
    ctx.beginPath();
    ctx.ellipse(cx,cy+h*.35,w/2,h*.6,0,Math.PI,0,false);
    ctx.lineTo(cx+w/2,cy+h); ctx.lineTo(cx-w/2,cy+h); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }
  function sBunBot(cx,cy,w,h){
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    ctx.fillStyle=C.bunD;
    ctx.beginPath();
    ctx.ellipse(cx,cy+h*.65,w/2+6,h*.38,0,0,Math.PI,false);
    ctx.lineTo(cx-w/2-6,cy); ctx.lineTo(cx+w/2+6,cy); ctx.closePath(); ctx.fill();
    ctx.shadowColor='transparent';
    ctx.fillStyle=C.bun; ctx.fillRect(cx-w/2,cy,w,h*.6);
    ctx.fillStyle=C.bunHi; ctx.globalAlpha=.5;
    ctx.beginPath(); ctx.ellipse(cx-w*.15,cy+h*.1,w*.14,h*.16,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    ctx.strokeStyle=C.outline; ctx.lineWidth=3; ctx.lineJoin='round';
    ctx.beginPath();
    ctx.ellipse(cx,cy+h*.65,w/2+6,h*.38,0,0,Math.PI,false);
    ctx.lineTo(cx-w/2-6,cy); ctx.lineTo(cx+w/2+6,cy); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }

  /* ── Tomato / Cabbage ─────────────────────────────────────────
     pct (0..1) is how much of the vegetable has been chopped -- 0 is
     whole, 1 is fully diced. Chopping reveals VEG_CELLS regions one at
     a time (see vegCellRect) rather than the whole vegetable flipping
     between fixed looks, so progress reads directly on the shape. ── */
  function sTomato(cx,cy,r,pct){
    pct=pct||0;
    var choppedN=Math.round(pct*VEG_CELLS);
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    ctx.fillStyle=C.tom; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='transparent';
    if(choppedN<VEG_CELLS){
      // whole-tomato character (calyx + shine) fades out as it gets chopped
      ctx.globalAlpha=1-pct*.7;
      ctx.fillStyle=C.tomLeaf;
      for(var k=0;k<5;k++){
        var a0=(k/5)*Math.PI*2-Math.PI/2;
        ctx.beginPath();
        ctx.ellipse(cx+Math.cos(a0)*r*.22,cy-r*.86+Math.sin(a0)*r*.22,r*.16,r*.07,a0+Math.PI/2,0,Math.PI*2);
        ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx,cy-r*.86,r*.13,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.4)';
      ctx.beginPath(); ctx.ellipse(cx-r*.28,cy-r*.3,r*.22,r*.15,-0.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=C.tomHi; ctx.globalAlpha=.75*(1-pct*.7);
      ctx.beginPath(); ctx.ellipse(cx-r*.22,cy-r*.32,r*.1,r*.06,-0.5,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }
    if(choppedN>0){
      ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.clip();
      for(var i=0;i<choppedN;i++){
        var c=vegCellRect(cx,cy,r,i);
        ctx.fillStyle=C.tomD; ctx.fillRect(c.x,c.y,c.w,c.h);
        ctx.fillStyle='rgba(255,255,255,.28)';
        ctx.beginPath(); ctx.ellipse(c.cx-c.w*.15,c.cy-c.h*.12,c.w*.2,c.h*.15,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=C.outline; ctx.lineWidth=1.5; ctx.globalAlpha=.5;
        ctx.strokeRect(c.x,c.y,c.w,c.h); ctx.globalAlpha=1;
      }
      ctx.restore();
    }
    ctx.strokeStyle=C.outline; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  function sCabbage(cx,cy,r,pct){
    pct=pct||0;
    var choppedN=Math.round(pct*VEG_CELLS);
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    for(var i=4;i>=0;i--){ctx.fillStyle=i%2===0?C.cab:C.cabD;ctx.beginPath();ctx.ellipse(cx,cy+i*4,r-i*7,(r-i*7)*.85,0,0,Math.PI*2);ctx.fill();}
    ctx.shadowColor='transparent';
    if(choppedN<VEG_CELLS){
      ctx.fillStyle=C.cabHi; ctx.globalAlpha=.5*(1-pct*.7);
      ctx.beginPath(); ctx.ellipse(cx-r*.22,cy-r*.28,r*.26,r*.16,-0.4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=1;
    }
    if(choppedN>0){
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx,cy,r,r*.85,0,0,Math.PI*2); ctx.clip();
      for(var i2=0;i2<choppedN;i2++){
        var c=vegCellRect(cx,cy,r*.9,i2);
        ctx.fillStyle=C.cab; ctx.fillRect(c.x,c.y,c.w,c.h);
        ctx.strokeStyle=C.cabD; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(c.x,c.cy); ctx.lineTo(c.x+c.w,c.cy); ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.22)';
        ctx.beginPath(); ctx.ellipse(c.cx-c.w*.15,c.cy-c.h*.15,c.w*.16,c.h*.1,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle=C.outline; ctx.lineWidth=1.5; ctx.globalAlpha=.4;
        ctx.strokeRect(c.x,c.y,c.w,c.h); ctx.globalAlpha=1;
      }
      ctx.restore();
    }
    ctx.strokeStyle=C.outline; ctx.lineWidth=3;
    ctx.beginPath(); ctx.ellipse(cx,cy,r,r*.85,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  /* ── Sausage ──────────────────────────────────────────────── */
  // One smooth pill/capsule from STOP to SAU_BOT -- see the constants
  // comment above for why this replaced a chain of separate link ovals.
  function sSausageBody(topY,botY,cx,w){
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    fillRR(cx-w/2,topY,w,botY-topY,w/2,C.sau);
    ctx.shadowColor='transparent';
    ctx.save();
    rr(cx-w/2,topY,w,botY-topY,w/2); ctx.clip();
    ctx.fillStyle=C.sauL; ctx.globalAlpha=.85;
    ctx.beginPath(); ctx.ellipse(cx-w*.17,(topY+botY)/2,w*.17,(botY-topY)*.48,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle='rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.ellipse(cx-w*.19,(topY+botY)/2,w*.08,(botY-topY)*.42,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle=C.outline; ctx.lineWidth=3;
    rr(cx-w/2,topY,w,botY-topY,w/2); ctx.stroke();
    ctx.restore();
  }
  function sSausageFull(cuts){
    sSausageBody(STOP,SAU_BOT,SCX,LW);
    // A precise tap (score >= 70, same threshold as the "🎯 ตรง!" label
    // below) draws as a clean glowing line; a sloppy tap draws jagged with
    // a bit of exposed pink "meat" showing through the torn cut.
    for(var ci=0;ci<Math.min(cuts,G.cutY.length);ci++){
      var ty=G.cutY[ci], good=(G.cutSc[ci]||0)>=70;
      ctx.save();
      if(good){
        ctx.strokeStyle='#fff'; ctx.lineWidth=3.5;
        ctx.shadowColor=C.acc; ctx.shadowBlur=10;
        ctx.beginPath(); ctx.moveTo(SCX-LW/2-10,ty); ctx.lineTo(SCX+LW/2+10,ty); ctx.stroke();
      }else{
        ctx.fillStyle='#F2A79E';
        ctx.beginPath(); ctx.ellipse(SCX,ty+3,LW*.32,7,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.lineCap='round';
        ctx.beginPath();
        var zx=SCX-LW/2-8, zStep=(LW+16)/6, zDir=1;
        ctx.moveTo(zx,ty);
        for(var zi=0;zi<6;zi++){zx+=zStep; ctx.lineTo(zx,ty+zDir*5); zDir*=-1;}
        ctx.stroke();
      }
      ctx.restore();
    }
    if(cuts>=2){
      var y0=Math.min(G.cutY[0],G.cutY[1]), y1=Math.max(G.cutY[0],G.cutY[1]);
      ctx.save();
      ctx.fillStyle='rgba(240,165,0,0.2)';
      ctx.fillRect(SCX-LW/2-5,y0,LW+10,y1-y0);
      ctx.strokeStyle=C.gold; ctx.lineWidth=2; ctx.setLineDash([4,3]);
      ctx.strokeRect(SCX-LW/2-5,y0,LW+10,y1-y0);
      ctx.setLineDash([]); ctx.restore();
    }
  }
  function drawAssemblySausagePiece(cx,cy,targetW,targetH){
    var topY=G.cuts>=2?Math.min(G.cutY[0],G.cutY[1]):(G.cuts>=1?G.cutY[0]:STOP);
    var botY=G.cuts>=2?Math.max(G.cutY[0],G.cutY[1]):SAU_BOT;
    var pieceH=botY-topY, srcCX=SCX, srcCY=(topY+botY)/2;
    var sx=targetW/pieceH, sy=targetH/LW;
    ctx.save();
    ctx.translate(cx,cy); ctx.scale(sx,sy); ctx.rotate(Math.PI/2); ctx.translate(-srcCX,-srcCY);
    ctx.beginPath(); ctx.rect(SCX-LW/2-1,topY,LW+2,pieceH); ctx.clip();
    sSausageBody(STOP,SAU_BOT,SCX,LW);
    ctx.restore();
  }

  /* ── Assembly helpers ──────────────────────────────────────── */
  // Bun pieces come out of the cut already wide-and-short (a horizontal
  // cut splits the bun into a top half and bottom half, same orientation
  // as the sandwich stack needs) -- no rotation needed to reuse them here,
  // unlike when the cut used to run top-to-bottom.
  function drawAssemblyBunPiece(poly,targetCX,targetCY,targetW,targetH){
    if(!poly||poly.length<2)return false;
    var sx=targetW/BW, sy=targetH/BH;
    var ox=BCX, oy=BTY+BH/2;
    function applyT(){ctx.translate(targetCX,targetCY);ctx.scale(sx,sy);ctx.translate(-ox,-oy);}
    ctx.save(); applyT();
    ctx.beginPath(); ctx.moveTo(poly[0].x,poly[0].y);
    for(var i=1;i<poly.length;i++) ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath(); ctx.clip(); drawBunSprite(); ctx.restore();
    ctx.save(); applyT();
    ctx.beginPath(); ctx.moveTo(poly[0].x,poly[0].y);
    for(var i=1;i<poly.length;i++) ctx.lineTo(poly[i].x,poly[i].y);
    ctx.closePath(); ctx.strokeStyle=C.outline; ctx.lineWidth=4/Math.min(sx,sy); ctx.lineJoin='round'; ctx.stroke(); ctx.restore();
    return true;
  }
  function drawAssemblyLayer(ing,cx,cy,w){
    ctx.save();
    if(ing==='tom'||ing==='tomato'){
      var tPct=G.tomFinalPct||0;
      ctx.fillStyle=tPct>=.67?C.tomD:C.tom;
      ctx.beginPath(); ctx.ellipse(cx,cy,w/2,11,0,0,Math.PI*2); ctx.fill();
      if(tPct<.34){
        ctx.fillStyle='rgba(255,220,200,.55)';
        [-22,0,22].forEach(function(dx){ctx.beginPath();ctx.ellipse(cx+dx,cy,4,8,0,0,Math.PI*2);ctx.fill();});
      }else{
        ctx.strokeStyle='rgba(255,190,180,.7)'; ctx.lineWidth=2;
        var nc=tPct>=.67?7:4;
        for(var i=0;i<nc;i++){var lx=cx-w*0.44+i*(w*0.88/(nc-1));ctx.beginPath();ctx.moveTo(lx,cy-9);ctx.lineTo(lx,cy+9);ctx.stroke();}
      }
    }else if(ing==='cab'||ing==='cabbage'){
      var cPct=G.cabFinalPct||0;
      ctx.fillStyle=C.cab; ctx.beginPath(); ctx.ellipse(cx,cy,w/2+8,8,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=C.cabD; ctx.lineWidth=1.5;
      var nc=cPct>=.67?7:(cPct>=.34?4:2);
      for(var i=0;i<nc;i++){var lx=cx-w*0.44+i*(w*0.88/Math.max(nc-1,1));ctx.beginPath();ctx.moveTo(lx,cy-6);ctx.lineTo(lx,cy+6);ctx.stroke();}
    }else{
      drawAssemblySausagePiece(cx,cy,w-16,36);
    }
    ctx.restore();
  }
  // Coloured to match the red-handled utensils hanging in img/cooking/bg.jpg
  // (dark-red base, lighter red grip band, silver blade) instead of the
  // previous grey/brown that didn't relate to the rest of the scene.
  function sKnife(kx,ky,angle){
    ctx.save(); ctx.translate(kx,ky); ctx.rotate(angle);
    ctx.shadowColor=C.sh; ctx.shadowBlur=6; ctx.shadowOffsetY=3;
    ctx.fillStyle=C.kniHD; rr(-10,0,20,52,5); ctx.fill();
    ctx.shadowColor='transparent';
    ctx.strokeStyle=C.outline; ctx.lineWidth=2.5; rr(-10,0,20,52,5); ctx.stroke();
    ctx.fillStyle=C.kniH; rr(-7,3,14,30,4); ctx.fill();
    ctx.fillStyle=C.kniD; ctx.fillRect(-14,-6,28,10);
    ctx.strokeStyle=C.outline; ctx.lineWidth=2; ctx.strokeRect(-14,-6,28,10);
    ctx.fillStyle=C.kni;
    ctx.beginPath(); ctx.moveTo(-8,-6); ctx.lineTo(8,-6); ctx.lineTo(5,-76); ctx.lineTo(0,-90); ctx.lineTo(-5,-76); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.moveTo(-5,-6); ctx.lineTo(-1,-6); ctx.lineTo(0,-76); ctx.lineTo(-4,-76); ctx.closePath(); ctx.fill();
    ctx.strokeStyle=C.outline; ctx.lineWidth=2.5; ctx.lineJoin='round';
    ctx.beginPath(); ctx.moveTo(-8,-6); ctx.lineTo(8,-6); ctx.lineTo(5,-76); ctx.lineTo(0,-90); ctx.lineTo(-5,-76); ctx.closePath(); ctx.stroke();
    ctx.restore();
  }

  /* ── Pizza: dough / sauce / cheese / toppings ────────────────
     Sauce and cheese both reveal over the SAME 6-cell grid used for
     chopping (vegCellRect/VEG_CELLS) -- sauce marks a cell "painted" as
     the drag passes over it, cheese reveals cells by tap count, same
     shape as sTomato/sCabbage's chop reveal just re-themed. ── */
  function sDoughRaw(cx,cy,r){
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    ctx.fillStyle='#F3DCA6';
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='transparent';
    ctx.fillStyle='rgba(255,255,255,.3)';
    ctx.beginPath(); ctx.ellipse(cx-r*.25,cy-r*.3,r*.2,r*.13,-0.4,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=C.outline; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  function sDoughDisc(cx,cy,r,torn){
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    ctx.fillStyle=torn?'#E8C989':'#F3DCA6';
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='transparent';
    ctx.strokeStyle='#D8A857'; ctx.lineWidth=10;
    ctx.beginPath(); ctx.arc(cx,cy,r-6,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.ellipse(cx-r*.3,cy-r*.3,r*.22,r*.14,-0.5,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=C.outline; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  // cellAt/ts (both optional) drive a brief pop-in on whichever cell was
  // JUST painted, so a paint stroke reads as a series of little splats
  // instead of colour just silently appearing under the finger.
  function sSauceLayer(cx,cy,r,cells,cellAt,ts){
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r-8,0,Math.PI*2); ctx.clip();
    for(var i=0;i<VEG_CELLS;i++){
      if(!cells[i])continue;
      var c=vegCellRect(cx,cy,r,i);
      var pop=1;
      if(cellAt&&ts!==undefined&&cellAt[i]){
        var pt=(ts-cellAt[i])/200;
        if(pt<1){ var pe=1-Math.pow(1-pt,2); pop=1.16-0.16*pe; }
      }
      ctx.save(); ctx.translate(c.cx,c.cy); ctx.scale(pop,pop); ctx.translate(-c.cx,-c.cy);
      ctx.fillStyle='rgba(196,42,32,.5)'; ctx.fillRect(c.x,c.y,c.w,c.h);
      ctx.fillStyle='rgba(255,150,140,.25)';
      ctx.beginPath(); ctx.ellipse(c.cx-c.w*.15,c.cy-c.h*.1,c.w*.18,c.h*.12,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  // Deterministic dot offsets (not Math.random()) -- randomising inside a
  // function redrawn every frame would make the shreds flicker to a new
  // position 60 times a second instead of looking like settled cheese.
  var CHEESE_DOTS=[[.18,.22],[.55,.15],[.32,.55],[.72,.6],[.14,.78],[.62,.82]];
  function sCheeseLayer(cx,cy,r,pct){
    var revealed=Math.round((pct||0)*VEG_CELLS);
    if(revealed<=0)return;
    ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,r-8,0,Math.PI*2); ctx.clip();
    for(var i=0;i<revealed;i++){
      var c=vegCellRect(cx,cy,r,i);
      CHEESE_DOTS.forEach(function(d){
        ctx.fillStyle='#FCE7A3';
        ctx.beginPath(); ctx.ellipse(c.x+d[0]*c.w,c.y+d[1]*c.h,4,2.4,0.3,0,Math.PI*2); ctx.fill();
      });
    }
    ctx.restore();
  }
  function sTopping(kind,x,y){
    ctx.save();
    if(kind==='pepperoni'){
      ctx.fillStyle='#C0392B'; ctx.beginPath(); ctx.arc(x,y,16,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#8F2419';
      [[-.3,-.2],[.25,.1],[-.05,.35]].forEach(function(p){ctx.beginPath();ctx.arc(x+p[0]*16,y+p[1]*16,2.5,0,Math.PI*2);ctx.fill();});
      ctx.strokeStyle=C.outline; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y,16,0,Math.PI*2); ctx.stroke();
    }else if(kind==='mushroom'){
      ctx.fillStyle='#EFE0C8'; ctx.beginPath(); ctx.ellipse(x,y,14,10,0,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle='#C7B48A'; ctx.lineWidth=1.5;
      for(var i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(x-12,y+i*3);ctx.lineTo(x+12,y+i*3);ctx.stroke();}
      ctx.strokeStyle=C.outline; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(x,y,14,10,0,0,Math.PI*2); ctx.stroke();
    }else{
      ctx.fillStyle='#3D3226'; ctx.beginPath(); ctx.arc(x,y,9,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#1a1510'; ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=C.outline; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(x,y,9,0,Math.PI*2); ctx.stroke();
    }
    ctx.restore();
  }
  // A dropped topping pops in with a little overshoot instead of just
  // appearing -- same "reward moment" pop shape as the chop-star pop-in,
  // reused here since landing a topping is its own small success beat.
  function drawDroppedTopping(d,cx,cy,ts){
    var scale=1;
    if(d.droppedAt){
      var pt=(ts-d.droppedAt)/220;
      if(pt<1){ var pe=1-Math.pow(1-pt,2); scale=1.15-0.15*pe; }
    }
    ctx.save(); ctx.translate(cx,cy); ctx.scale(scale,scale); ctx.translate(-cx,-cy);
    sTopping(d.kind,cx,cy);
    ctx.restore();
  }

  /* ── Breakfast: egg / bacon / toast / plate ──────────────────── */
  function sEggWhole(cx,cy,r){
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    ctx.fillStyle='#FBF3E3';
    ctx.beginPath(); ctx.ellipse(cx,cy,r*0.78,r,0,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='transparent';
    ctx.fillStyle='rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.ellipse(cx-r*.25,cy-r*.35,r*.18,r*.28,-0.4,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=C.outline; ctx.lineWidth=3;
    ctx.beginPath(); ctx.ellipse(cx,cy,r*0.78,r,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  // Deterministic crack segments (relative to cx,cy,r), revealed one at a
  // time by tap count -- same "no Math.random() in a per-frame draw"
  // reasoning as CHEESE_DOTS above.
  var EGG_CRACK_LINES=[
    [[-.3,-.6],[-.15,-.2],[-.35,.1]],
    [[.25,-.65],[.35,-.25],[.15,.05]],
    [[-.1,.5],[.1,.75]],
    [[.4,.3],[.55,.55]],
    [[-.5,-.15],[-.6,.2]],
    [[.05,-.3],[-.05,.0]],
    [[.5,-.05],[.4,.25]]
  ];
  function sEggCracked(cx,cy,r,tapCount){
    sEggWhole(cx,cy,r);
    var n=Math.min(EGG_CRACK_LINES.length,tapCount);
    ctx.save();
    ctx.strokeStyle='#B99A6A'; ctx.lineWidth=2; ctx.lineJoin='round';
    for(var i=0;i<n;i++){
      var seg=EGG_CRACK_LINES[i];
      ctx.beginPath();
      ctx.moveTo(cx+seg[0][0]*r,cy+seg[0][1]*r);
      for(var k=1;k<seg.length;k++) ctx.lineTo(cx+seg[k][0]*r,cy+seg[k][1]*r);
      ctx.stroke();
    }
    ctx.restore();
  }
  function sEggBroken(cx,cy,r){
    ctx.save();
    ctx.fillStyle='#FFF6E5';
    ctx.beginPath(); ctx.ellipse(cx,cy+r*.15,r*1.05,r*.55,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#FFC94D';
    ctx.beginPath(); ctx.arc(cx,cy+r*.15,r*.32,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#E0A82E'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy+r*.15,r*.32,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='#FBF3E3';
    ctx.beginPath(); ctx.ellipse(cx-r*.6,cy-r*.7,r*.42,r*.3,-0.3,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=C.outline; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.ellipse(cx-r*.6,cy-r*.7,r*.42,r*.3,-0.3,0,Math.PI*2); ctx.stroke();
    ctx.fillStyle='#FBF3E3';
    ctx.beginPath(); ctx.ellipse(cx+r*.58,cy-r*.68,r*.4,r*.28,0.35,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx+r*.58,cy-r*.68,r*.4,r*.28,0.35,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle=C.outline; ctx.lineWidth=3;
    ctx.beginPath(); ctx.ellipse(cx,cy+r*.15,r*1.05,r*.55,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  function sBaconStrip(){
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    var bx=VW/2, bw=70;
    fillRR(bx-bw/2,BC_TOP,bw,BC_BOT-BC_TOP,18,'#E8917A');
    ctx.shadowColor='transparent';
    ctx.strokeStyle='#B8523A'; ctx.lineWidth=5;
    for(var i=0;i<5;i++){
      var yy=BC_TOP+20+i*((BC_BOT-BC_TOP-40)/4);
      ctx.beginPath();
      ctx.moveTo(bx-bw/2+6,yy);
      ctx.quadraticCurveTo(bx,yy+14,bx+bw/2-6,yy);
      ctx.stroke();
    }
    ctx.strokeStyle=C.outline; ctx.lineWidth=3;
    rr(bx-bw/2,BC_TOP,bw,BC_BOT-BC_TOP,18); ctx.stroke();
    ctx.restore();
  }
  // Mirrors sSausageFull's clean-vs-jagged cut-mark convention exactly
  // (score >= 70 = clean glow line, else a jagged zigzag) -- same visual
  // language, re-themed as bacon "flip" marks instead of sausage cuts.
  function sBaconFull(cuts){
    sBaconStrip();
    var bx=VW/2, bw=70;
    for(var ci=0;ci<Math.min(cuts,G.baconCutY.length);ci++){
      var ty=G.baconCutY[ci], good=(G.baconSc[ci]||0)>=70;
      ctx.save();
      if(good){
        ctx.strokeStyle='#fff'; ctx.lineWidth=3.5;
        ctx.shadowColor=C.acc; ctx.shadowBlur=10;
        ctx.beginPath(); ctx.moveTo(bx-bw/2-10,ty); ctx.lineTo(bx+bw/2+10,ty); ctx.stroke();
      }else{
        ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.lineCap='round';
        ctx.beginPath();
        var zx=bx-bw/2-8, zStep=(bw+16)/6, zDir=1;
        ctx.moveTo(zx,ty);
        for(var zi=0;zi<6;zi++){zx+=zStep; ctx.lineTo(zx,ty+zDir*5); zDir*=-1;}
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  function sToastSlice(cx,cy,frac){
    var tint = frac<TOAST_GOOD[0]?'#F5E6C8':frac>TOAST_GOOD[1]?'#6B4423':'#D9A15C';
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    ctx.fillStyle=tint;
    var w=140,h=150;
    ctx.beginPath();
    ctx.moveTo(cx-w/2,cy+h/2); ctx.lineTo(cx-w/2,cy-h/2+30);
    ctx.quadraticCurveTo(cx-w/2,cy-h/2,cx-w/2+30,cy-h/2);
    ctx.lineTo(cx+w/2-30,cy-h/2);
    ctx.quadraticCurveTo(cx+w/2,cy-h/2,cx+w/2,cy-h/2+30);
    ctx.lineTo(cx+w/2,cy+h/2);
    ctx.closePath(); ctx.fill();
    ctx.shadowColor='transparent';
    ctx.strokeStyle=C.outline; ctx.lineWidth=3; ctx.stroke();
    ctx.restore();
  }
  function sPlateItem(kind,cx,cy,w){
    ctx.save();
    if(kind==='egg'){
      ctx.fillStyle='#FFF6E5'; ctx.beginPath(); ctx.ellipse(cx,cy,w/2,w*0.32,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#FFC94D'; ctx.beginPath(); ctx.arc(cx,cy,w*0.18,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle=C.outline; ctx.lineWidth=2;
      ctx.beginPath(); ctx.ellipse(cx,cy,w/2,w*0.32,0,0,Math.PI*2); ctx.stroke();
    }else if(kind==='bacon'){
      fillRR(cx-w/2,cy-10,w,20,8,'#E8917A');
      ctx.strokeStyle='#B8523A'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(cx-w/2+6,cy); ctx.quadraticCurveTo(cx,cy+8,cx+w/2-6,cy); ctx.stroke();
      ctx.strokeStyle=C.outline; ctx.lineWidth=2; rr(cx-w/2,cy-10,w,20,8); ctx.stroke();
    }else{
      fillRR(cx-w*0.28,cy-w*0.32,w*0.56,w*0.6,8,'#D9A15C');
      ctx.strokeStyle=C.outline; ctx.lineWidth=2; rr(cx-w*0.28,cy-w*0.32,w*0.56,w*0.6,8); ctx.stroke();
    }
    ctx.restore();
  }

  /* ── Burger: patty / grill / veg / stack ─────────────────────
     pct (0..1) is how far the patty has been pressed -- it starts as a
     tall lumpy ball and flattens into a wide disc, so the tap progress
     reads on the shape itself the way chopping does for the veg. ── */
  function sPatty(cx,cy,pct,cooked){
    pct=pct||0;
    var rx=PATTY_R0+(PATTY_R1-PATTY_R0)*pct;
    var ry=PATTY_R0*0.82-(PATTY_R0*0.82-22)*pct;
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    ctx.fillStyle=cooked?'#6B3A1E':'#C4685A';
    ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='transparent';
    // Raw mince reads as speckled; a cooked patty gets sear bands instead.
    if(cooked){
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.clip();
      ctx.strokeStyle='rgba(40,20,10,.45)'; ctx.lineWidth=5;
      for(var g=-2;g<=2;g++){
        ctx.beginPath(); ctx.moveTo(cx-rx,cy+g*13+4); ctx.lineTo(cx+rx,cy+g*13-4); ctx.stroke();
      }
      ctx.restore();
    }else{
      ctx.fillStyle='rgba(150,60,50,.55)';
      [[-.45,-.2],[.1,-.35],[.5,.05],[-.2,.3],[.35,.4],[-.6,.25]].forEach(function(p){
        ctx.beginPath(); ctx.ellipse(cx+p[0]*rx,cy+p[1]*ry,rx*.09,ry*.16,0,0,Math.PI*2); ctx.fill();
      });
    }
    ctx.fillStyle='rgba(255,255,255,'+(cooked?0.14:0.24)+')';
    ctx.beginPath(); ctx.ellipse(cx-rx*.3,cy-ry*.35,rx*.2,ry*.2,-0.4,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=C.outline; ctx.lineWidth=3;
    ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  function sGrillGrate(cx,cy,w,h){
    ctx.save();
    fillRR(cx-w/2,cy-h/2,w,h,14,'#2A2018');
    ctx.strokeStyle='#5A4636'; ctx.lineWidth=6; ctx.lineCap='round';
    for(var i=0;i<5;i++){
      var yy=cy-h/2+22+i*((h-44)/4);
      ctx.beginPath(); ctx.moveTo(cx-w/2+14,yy); ctx.lineTo(cx+w/2-14,yy); ctx.stroke();
    }
    ctx.strokeStyle=C.outline; ctx.lineWidth=3; rr(cx-w/2,cy-h/2,w,h,14); ctx.stroke();
    ctx.restore();
  }
  function sBurgerVeg(kind,cx,cy,w){
    ctx.save();
    if(kind==='lettuce'){
      // Ruffled edge drawn as a wave around a flat band -- reads as a
      // leaf rather than the plain ellipse the other two layers use.
      ctx.fillStyle=C.cab; ctx.beginPath();
      var n=14;
      for(var i=0;i<=n;i++){
        var a=(i/n)*Math.PI*2, rr2=(w/2+9)*(1+0.13*Math.sin(a*5));
        var px=cx+Math.cos(a)*rr2, py=cy+Math.sin(a)*rr2*0.26;
        i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
      }
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle=C.cabD; ctx.lineWidth=2; ctx.stroke();
    }else if(kind==='tomato'){
      ctx.fillStyle=C.tom; ctx.beginPath(); ctx.ellipse(cx,cy,w/2,11,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle=C.tomD;
      [-0.42,0,0.42].forEach(function(o){ ctx.beginPath(); ctx.ellipse(cx+o*w,cy,w*.07,7,0,0,Math.PI*2); ctx.fill(); });
      ctx.strokeStyle=C.outline; ctx.lineWidth=2.5; ctx.beginPath(); ctx.ellipse(cx,cy,w/2,11,0,0,Math.PI*2); ctx.stroke();
    }else{
      // Cheese slice: square with the corners drooping past the patty edge.
      ctx.fillStyle='#F6C445';
      ctx.beginPath();
      ctx.moveTo(cx-w/2,cy-9); ctx.lineTo(cx+w/2,cy-9); ctx.lineTo(cx+w/2,cy+4);
      ctx.lineTo(cx+w*0.28,cy+16); ctx.lineTo(cx+w*0.1,cy+4);
      ctx.lineTo(cx-w*0.1,cy+16); ctx.lineTo(cx-w*0.28,cy+4);
      ctx.lineTo(cx-w/2,cy+4); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=C.outline; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.stroke();
    }
    ctx.restore();
  }
  // Shared by the STACK screen and the finish screen so the burger the
  // player assembled is drawn identically in both places.
  function sBurgerStack(cx,by,topBunDY){
    var w=180;
    sBunBot(cx,by,w,44);
    var layerY=by-14;
    G.bgVegDropped.forEach(function(d){
      sBurgerVeg(d.ing,cx+(d.off||0),layerY,w-18);
      layerY-=17;
    });
    sPatty(cx,layerY-6,G.pattyFinalPct||1,true);
    layerY-=34;
    if(topBunDY!==null&&topBunDY!==undefined) sBunTop(cx,layerY-38+topBunDY,w,52);
  }

  /* ── Fries: potato / slices / fryer / salt ─────────────────── */
  function sPotato(cx,cy,peelPct){
    peelPct=peelPct||0;
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    ctx.fillStyle='#A9793F';
    ctx.beginPath(); ctx.ellipse(cx,cy,POTATO_RX,POTATO_RY,0,0,Math.PI*2); ctx.fill();
    ctx.shadowColor='transparent';
    // Peeled flesh is revealed as a growing wedge sweeping around the
    // potato, so partial progress is legible at a glance.
    if(peelPct>0){
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx,cy,POTATO_RX,POTATO_RY,0,0,Math.PI*2); ctx.clip();
      ctx.fillStyle='#F5E3B8';
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.arc(cx,cy,Math.max(POTATO_RX,POTATO_RY)*1.2,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,peelPct));
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if(peelPct<1){
      ctx.fillStyle='rgba(90,58,26,.5)';
      [[-.3,-.45],[.35,-.2],[-.15,.3],[.25,.55]].forEach(function(p){
        ctx.beginPath(); ctx.ellipse(cx+p[0]*POTATO_RX,cy+p[1]*POTATO_RY,5,3.5,0.4,0,Math.PI*2); ctx.fill();
      });
    }
    ctx.strokeStyle=C.outline; ctx.lineWidth=3;
    ctx.beginPath(); ctx.ellipse(cx,cy,POTATO_RX,POTATO_RY,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }
  // One fry stick. `tint` lets the same shape serve the raw (pale),
  // frying (golden) and finished (deep gold) states.
  function sFryStick(cx,cy,w,h,tint,rot){
    ctx.save();
    ctx.translate(cx,cy); if(rot) ctx.rotate(rot);
    fillRR(-w/2,-h/2,w,h,3,tint);
    ctx.fillStyle='rgba(255,255,255,.22)';
    fillRR(-w/2+2,-h/2+3,w*0.3,h-6,2,'rgba(255,255,255,.22)');
    ctx.strokeStyle=C.outline; ctx.lineWidth=2; rr(-w/2,-h/2,w,h,3); ctx.stroke();
    ctx.restore();
  }
  function sFryBasket(cx,cy,w,h){
    ctx.save();
    ctx.strokeStyle='#8A8F98'; ctx.lineWidth=3;
    for(var i=0;i<=6;i++){ var xx=cx-w/2+i*(w/6); ctx.beginPath(); ctx.moveTo(xx,cy-h/2); ctx.lineTo(xx,cy+h/2); ctx.stroke(); }
    for(var j=0;j<=4;j++){ var yy=cy-h/2+j*(h/4); ctx.beginPath(); ctx.moveTo(cx-w/2,yy); ctx.lineTo(cx+w/2,yy); ctx.stroke(); }
    ctx.strokeStyle=C.outline; ctx.lineWidth=3.5; ctx.strokeRect(cx-w/2,cy-h/2,w,h);
    ctx.restore();
  }
  function sFriesCarton(cx,cy,tint,saltN){
    ctx.save();
    var w=132,h=118;
    ctx.shadowColor=C.sh; ctx.shadowBlur=9; ctx.shadowOffsetY=5;
    // Fries first, poking up out of the carton behind it.
    for(var i=0;i<7;i++){
      var fx=cx-52+i*17.5, lift=[36,52,44,60,46,54,38][i];
      sFryStick(fx,cy-h/2-lift/2+16,15,lift+34,tint,(i-3)*0.05);
    }
    ctx.shadowColor='transparent';
    ctx.fillStyle='#E24B3C';
    ctx.beginPath();
    ctx.moveTo(cx-w/2,cy-h/2); ctx.lineTo(cx+w/2,cy-h/2);
    ctx.lineTo(cx+w/2-16,cy+h/2); ctx.lineTo(cx-w/2+16,cy+h/2); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.9)';
    ctx.beginPath(); ctx.ellipse(cx,cy+6,26,20,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=C.outline; ctx.lineWidth=3; ctx.lineJoin='round';
    ctx.beginPath();
    ctx.moveTo(cx-w/2,cy-h/2); ctx.lineTo(cx+w/2,cy-h/2);
    ctx.lineTo(cx+w/2-16,cy+h/2); ctx.lineTo(cx-w/2+16,cy+h/2); ctx.closePath(); ctx.stroke();
    if(saltN) drawSaltGrains(cx,cy-h/2-30,saltN);
    ctx.restore();
  }
  // Deterministic scatter (same reasoning as CHEESE_DOTS) so salt doesn't
  // jitter to new positions every frame once it's landed.
  var SALT_SPOTS=[[-.42,-.30],[.10,-.52],[.44,-.18],[-.18,.10],[.30,.24],[-.50,.30],
                  [.02,-.14],[.52,-.44],[-.30,-.54],[.22,.52],[-.06,.34],[.40,.02],
                  [-.56,-.06],[.16,.08],[-.24,-.16],[.34,-.34],[.06,.20],[-.40,.48]];
  function drawSaltGrains(cx,cy,n){
    ctx.save();
    ctx.fillStyle='rgba(255,255,255,.95)';
    for(var i=0;i<Math.min(n,SALT_SPOTS.length);i++){
      var s=SALT_SPOTS[i];
      ctx.beginPath(); ctx.arc(cx+s[0]*110,cy+s[1]*74,2.1,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  /* ── Step bar (dish-aware: reads DISHES[G.dish].steps) ───────── */
  function curStep(){
    var steps=DISHES[G.dish].steps;
    for(var i=0;i<steps.length;i++)if(steps[i].states.indexOf(G.st)>=0)return i;
    return -1;
  }
  function drawStepBar(time){
    var steps=DISHES[G.dish].steps;
    ctx.fillStyle=C.ui; ctx.fillRect(0,0,VW,SH);
    var cs=curStep(), sw=(VW-106)/steps.length;
    steps.forEach(function(si,i){
      var sx=4+i*sw, bg=i<cs?C.sDone:i===cs?C.sAct:C.sOff;
      fillRR(sx,8,sw-5,SH-16,9,bg);
      var icx=sx+(sw-5)/2, icy=8+(SH-16)/2-7;
      ctx.font='20px sans-serif'; ctx.textBaseline='middle';
      if(i===cs&&time!==undefined){
        // subtle breathing pulse on the current step's icon -- the only
        // visual life the step bar has otherwise is a flat colour swap
        var pulse=1+0.05*Math.sin(time*0.005);
        ctx.save(); ctx.translate(icx,icy); ctx.scale(pulse,pulse); ctx.translate(-icx,-icy);
        T(si.icon,icx,icy,'center');
        ctx.restore();
      }else{
        T(si.icon,icx,icy,'center');
      }
      ctx.font='bold 9px Prompt,sans-serif'; ctx.fillStyle=C.w;
      T(si.lbl,sx+(sw-5)/2,SH-13,'center'); ctx.textBaseline='alphabetic';
    });
    var bx=VW-100;
    fillRR(bx,8,95,SH-16,9,C.panel);
    ctx.font='bold 10px Prompt,sans-serif'; ctx.fillStyle=C.gold;
    T('คะแนนรวม',bx+47,27,'center');
    ctx.font='bold 23px Prompt,sans-serif'; ctx.fillStyle=C.w;
    T(G.total,bx+47,56,'center');
  }

  /* ── Screens ───────────────────────────────────────────────── */
  // SEL_FOODS drives both the drawn grid here AND onDown's S.SEL hit-test
  // (below) -- keep them reading from this single array/layout formula
  // instead of two hand-copied coordinate sets.
  // Hot dog is free by default; pizza/breakfast are shop-unlocked dishes
  // (supabase/024_game_upgrades_migration.sql, cook_dish_pizza/
  // cook_dish_breakfast) -- window.__cookLoadout is set by game.html just
  // before start(). Locked cards reuse the exact same dimmed/non-clickable
  // treatment already used for Burger/Fries below (drawSel()/onDown's
  // S.SEL branch both already only act on ok:true cards).
  var cookLoadout = window.__cookLoadout || {};
  var SEL_FOODS=[
    {l:'Hot Dog',    e:'🌭', ok:true,                       dish:'hotdog'},
    {l:'Pizza',      e:'🍕', ok:!!cookLoadout.hasPizza,     dish:'pizza'},
    {l:'Breakfast',  e:'🍳', ok:!!cookLoadout.hasBreakfast, dish:'breakfast'},
    {l:'Burger',     e:'🍔', ok:!!cookLoadout.hasBurger,    dish:'burger'},
    {l:'Fries',      e:'🍟', ok:!!cookLoadout.hasFries,     dish:'fries'}
  ];
  var SEL_CARD_W=130, SEL_CARD_H=162, SEL_COL_GAP=145, SEL_ROW_GAP=176, SEL_X0=30, SEL_Y0=160;
  function selCardRect(i){
    var col=i%3, row=Math.floor(i/3);
    return {x:SEL_X0+col*SEL_COL_GAP, y:SEL_Y0+row*SEL_ROW_GAP, w:SEL_CARD_W, h:SEL_CARD_H};
  }
  function drawSel(){
    drawBg();
    ctx.font='bold 30px Prompt,sans-serif'; ctx.fillStyle=C.w;
    T('🍳 Cooking Game',VW/2,90,'center');
    ctx.font='16px Prompt'; ctx.fillStyle=C.acc; T('เลือกอาหารที่จะทำ',VW/2,124,'center');
    SEL_FOODS.forEach(function(f,i){
      var r=selCardRect(i);
      // Locked-card colour warmed to match the new brown UI chrome (was a
      // cold navy #1e2440/#3a3d62 that clashed with everything else here).
      fillRR(r.x,r.y,r.w,r.h,16,f.ok?C.panel:'#3A2A20');
      ctx.font='52px sans-serif'; ctx.textBaseline='middle';
      ctx.globalAlpha=f.ok?1:0.32; T(f.e,r.x+r.w/2,r.y+r.h/2-14,'center'); ctx.globalAlpha=1;
      ctx.font=(f.ok?'bold ':'')+'14px Prompt'; ctx.fillStyle=f.ok?C.w:'#8a7566'; ctx.textBaseline='alphabetic';
      T(f.l,r.x+r.w/2,r.y+r.h-18,'center');
      // Locked dishes are all shop purchases, so say so on the card --
      // dimming alone read as "broken"/"coming soon" rather than "buyable".
      if(!f.ok){
        ctx.font='22px sans-serif'; ctx.textBaseline='middle';
        T('🔒',r.x+r.w-20,r.y+20,'center'); ctx.textBaseline='alphabetic';
        ctx.font='10px Prompt'; ctx.fillStyle='#8a7566';
        T('ซื้อในร้านค้า',r.x+r.w/2,r.y+r.h-4,'center');
      }
    });
  }

  function drawBunCut(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.8)';
    T('ลากตัดขนมปังตามแนวนอน เปิดออกเป็น 2 ฝา',VW/2,SH+28,'center');
    if(G.split){
      drawBunPiece(G.topPiece,0,-10); drawBunPiece(G.botPiece,0,10);
      ctx.font='bold 26px Prompt'; ctx.fillStyle=C.gold;
      T('ตัดได้ '+scoreVal('bun',G.scores.bun,ts)+' คะแนน! '+(G.scores.bun>=80?'🎉':G.scores.bun>=50?'👍':'💪'),VW/2,BUN_BBY+52,'center');
      ctx.font='14px Prompt'; ctx.fillStyle='rgba(255,255,255,.55)';
      T(G.scores.bun>=80?'ตัดตรงมาก!':G.scores.bun>=50?'ดีพอใช้':'ลองใหม่นะ',VW/2,BUN_BBY+78,'center');
      drawBtn(VW/2-85,BUN_BBY+98,170,52,'ต่อไป →',C.acc,ts);
    }else{
      drawBunSprite();
      var midY=(BTY+BUN_BBY)/2;
      ctx.setLineDash([9,6]); ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(BLX-22,midY); ctx.lineTo(BRX+22,midY); ctx.stroke(); ctx.setLineDash([]);
      if(G.pts.length>1){
        ctx.strokeStyle=C.acc; ctx.lineWidth=4.5; ctx.lineCap='round'; ctx.lineJoin='round';
        ctx.beginPath(); ctx.moveTo(G.pts[0].x,G.pts[0].y);
        G.pts.forEach(function(p){ctx.lineTo(p.x,p.y);}); ctx.stroke();
      }
      if(!G.cutting&&G.pts.length===0){
        var t=(ts%1400)/1400, hx=BLX-38+t*(BW+76);
        ctx.fillStyle='rgba(46,196,182,'+(0.35+0.35*Math.sin(ts/280))+')';
        ctx.beginPath(); ctx.arc(hx,midY,11,0,Math.PI*2); ctx.fill();
      }
    }
  }

  function drawChop(ts){
    drawBg(); drawStepBar(ts);
    var isTom=G.ing==='tom';
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('แตะสับ'+(isTom?'มะเขือเทศ':'กะหล่ำปลี')+'!',VW/2,SH+30,'center');
    var elapsed=G.chopRun?Math.min(CHOP_DUR,ts-G.chopStart):0;
    var pct=Math.max(0,1-elapsed/CHOP_DUR);
    if(G.chopRun&&!G.chopDone&&elapsed>=CHOP_DUR) finishChop();
    fillRR(40,SH+48,VW-80,18,9,'#2A1D14');
    fillRR(40,SH+48,(VW-80)*pct,18,9,pct>0.3?C.acc:C.red);
    ctx.font='bold 11px Prompt'; ctx.fillStyle=C.w;
    T(Math.max(0,Math.ceil((CHOP_DUR-elapsed)/1000))+'วิ',VW/2,SH+60,'center');
    var chopPct=(G.choppedCount||0)/CHOPS_NEEDED;
    // Each tap punches the vegetable with a brief squash so the knife
    // visibly "lands" on it, instead of the reveal being the only sign a
    // tap registered.
    var punchT=G.chopPunch?(ts-G.chopPunch)/140:1, sq=1;
    if(punchT<1){ var pe=1-Math.pow(1-punchT,2); sq=1-0.05*(1-pe); }
    ctx.save(); ctx.translate(ICX,ICY); ctx.scale(1/sq,sq); ctx.translate(-ICX,-ICY);
    if(isTom) sTomato(ICX,ICY,IR,chopPct); else sCabbage(ICX,ICY,IR,chopPct);
    ctx.restore();
    var kA=0;
    if(G.kAnim){
      var ae=ts-G.kAnimStart, dur=300;
      kA=ae<dur/2?-(ae/(dur/2))*Math.PI/2:-((dur-ae)/(dur/2))*Math.PI/2;
      if(ae>=dur){G.kAnim=0;kA=0;}
    }
    sKnife(ICX+IR+52,ICY-28,kA);
    var starN=Math.min(3,Math.ceil(chopPct*3));
    var starT=G.starPunch?(ts-G.starPunch)/220:1;
    var starScale=1;
    if(starT<1){ var se=1-Math.pow(1-starT,2); starScale=1.15-0.15*se; }
    ctx.save();
    ctx.font='26px sans-serif'; ctx.fillStyle=C.gold;
    var stx=VW/2+55, sty=ICY+IR+40;
    ctx.translate(stx,sty); ctx.scale(starScale,starScale); ctx.translate(-stx,-sty);
    T('⭐'.repeat(starN)+'☆'.repeat(3-starN),stx,sty,'center');
    ctx.restore();
    ctx.font='12px Prompt'; ctx.fillStyle='rgba(255,255,255,.4)';
    T('สับ '+G.taps+' ครั้ง',VW/2+55,ICY+IR+60,'center');
    if(G.chopDone){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('เสร็จแล้ว!',VW/2,320,'center');
      var chopKey=isTom?'tom':'cab';
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal(chopKey,G.scores[chopKey],ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }

  function drawSau(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.8)';
    T('แตะตอนมีดผ่านรอยตัด! (2 ครั้ง)',VW/2,SH+26,'center');
    if(G.cuts<2){G.kY+=G.kDir*G.kSpd; if(G.kY>SAU_BOT-12)G.kDir=-1; if(G.kY<STOP+12)G.kDir=1;}
    sSausageFull(G.cuts);
    if(G.cuts<2){
      CUT_TY.forEach(function(ty,i){
        if(i>=G.cuts){
          ctx.strokeStyle='rgba(46,196,182,.5)'; ctx.lineWidth=2.5; ctx.setLineDash([6,4]);
          ctx.beginPath(); ctx.moveTo(SCX-36,ty); ctx.lineTo(SCX+36,ty); ctx.stroke(); ctx.setLineDash([]);
          ctx.font='10px Prompt'; ctx.fillStyle=C.acc;
          T('ตัดที่นี่',SCX+40,ty+4,'left');
        }
      });
      CUT_TY.forEach(function(ty,i){
        if(i<G.cuts)return;
        var d=Math.abs(G.kY-ty);
        if(d<30){ctx.fillStyle='rgba(46,196,182,'+(0.14*(1-d/30))+')'; ctx.fillRect(0,ty-14,VW,28);}
      });
      ctx.save(); ctx.translate(KX,G.kY); ctx.rotate(-Math.PI/2);
      ctx.shadowColor=C.sh; ctx.shadowBlur=5; ctx.shadowOffsetY=2;
      ctx.fillStyle=C.kni;
      ctx.beginPath(); ctx.moveTo(-7,-6); ctx.lineTo(7,-6); ctx.lineTo(4,-74); ctx.lineTo(0,-88); ctx.lineTo(-4,-74); ctx.closePath(); ctx.fill();
      ctx.shadowColor='transparent';
      ctx.fillStyle='rgba(255,255,255,.35)';
      ctx.beginPath(); ctx.moveTo(-4,-6); ctx.lineTo(-1,-6); ctx.lineTo(0,-74); ctx.lineTo(-3,-74); ctx.closePath(); ctx.fill();
      ctx.strokeStyle=C.outline; ctx.lineWidth=2.5; ctx.lineJoin='round';
      ctx.beginPath(); ctx.moveTo(-7,-6); ctx.lineTo(7,-6); ctx.lineTo(4,-74); ctx.lineTo(0,-88); ctx.lineTo(-4,-74); ctx.closePath(); ctx.stroke();
      ctx.fillStyle=C.kniHD; rr(-10,-6+74,20,50,5); ctx.fill();
      ctx.strokeStyle=C.outline; ctx.lineWidth=2.5; rr(-10,-6+74,20,50,5); ctx.stroke();
      ctx.fillStyle=C.kniH; rr(-7,-3+74,14,28,4); ctx.fill();
      ctx.restore();
    }
    if(G.cutSc.length>0){
      G.cutSc.forEach(function(cs,i){
        var cAt=G.cutAt[i]||0, ct=cAt?(ts-cAt)/220:1, cScale=1;
        if(ct<1){ var ce=1-Math.pow(1-ct,2); cScale=1.12-0.12*ce; }
        var lx=VW/2, ly=680-i*22;
        ctx.save();
        ctx.translate(lx,ly); ctx.scale(cScale,cScale); ctx.translate(-lx,-ly);
        ctx.font='bold 13px Prompt'; ctx.fillStyle=cs>=70?C.grn:C.gold;
        T(cs>=70?'🎯 ตรง! +'+cs:'📍 พอใช้ +'+cs,lx,ly,'center');
        ctx.restore();
      });
    }
    ctx.font='bold 14px Prompt'; ctx.fillStyle=C.w;
    T('ตัดแล้ว '+G.cuts+'/2',VW/2,720,'center');
    if(G.cuts>=2){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('ตัดเสร็จ! ✂️',VW/2,310,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('sau',G.scores.sau,ts)+' คะแนน',VW/2,362,'center');
      drawBtn(VW/2-80,402,160,50,'ต่อไป →',C.acc,ts);
    }
  }

  function drawCmb(ts){
    drawBg(); drawStepBar(ts);
    var cur=G.cList[G.cIdx];
    if(G.cIdx<G.cList.length){
      ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
      T('แตะเพื่อวาง'+(ING_LABELS[cur]||cur)+'!',VW/2,SH+26,'center');
      G.sX+=G.sDir*G.sSpd; if(G.sX>VW-45)G.sDir=-1; if(G.sX<45)G.sDir=1;
    }
    if(!drawAssemblyBunPiece(G.botPiece,VW/2,CMB_BBY+23,222,46)) sBunBot(VW/2,CMB_BBY,222,46);
    G.dropped.forEach(function(d){
      var t=Math.min(1,(ts-d.dropStart)/DROP_DUR);
      var ease=1-(1-t)*(1-t);
      var cy=d.fromY+(d.toY-d.fromY)*ease;
      // Brief squash-and-settle right after landing so the drop reads as
      // an impact rather than just stopping -- volume-preserving (wider
      // as it flattens), same spirit as the chop-tap punch above.
      var landT=ts-(d.dropStart+DROP_DUR), sq=1;
      if(landT>=0&&landT<180){
        var lt=landT/180;
        sq=1-0.08*Math.sin(lt*Math.PI)*(1-lt);
      }
      ctx.save();
      ctx.translate(d.x,cy); ctx.scale(1/sq,sq); ctx.translate(-d.x,-cy);
      drawAssemblyLayer(d.ing,d.x,cy,185);
      ctx.restore();
    });
    if(G.cIdx>=G.cList.length){
      if(!drawAssemblyBunPiece(G.topPiece,VW/2,CMB_BBY-G.dropped.length*20-33,222,55))
        sBunTop(VW/2,CMB_BBY-G.dropped.length*20-60,222,55);
    }
    if(G.cIdx<G.cList.length){
      ctx.strokeStyle='rgba(46,196,182,.38)'; ctx.lineWidth=2; ctx.setLineDash([5,4]);
      ctx.strokeRect(VW/2-CTW/2,CMB_BBY-14,CTW,20); ctx.setLineDash([]);
      ctx.fillStyle='rgba(46,196,182,.06)'; ctx.fillRect(VW/2-CTW/2,CMB_BBY-14,CTW,20);
      ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1; ctx.setLineDash([3,6]);
      ctx.beginPath(); ctx.moveTo(G.sX,240); ctx.lineTo(G.sX,CMB_BBY-14); ctx.stroke(); ctx.setLineDash([]);
      if(cur==='tom') sTomato(G.sX,225,38,G.tomFinalPct);
      else if(cur==='cab') sCabbage(G.sX,225,38,G.cabFinalPct);
      else drawAssemblySausagePiece(G.sX,225,80,30);
    }
    if(G.cIdx>=G.cList.length&&!G.allDone){
      G.allDone=true;
      var acc=G.dropped.reduce(function(s,d){return s+d.acc;},0)/G.dropped.length;
      G.scores.cmb=Math.round(acc*100); G.total+=G.scores.cmb;
      // animateScore/gradeScore fire when CMB_R actually appears, not here
      // -- this screen never displays the cmb score itself (only
      // drawResult does, after the delay below), so starting the 600ms
      // count-up (or the big flash text) now would let them finish before
      // the player ever sees them.
      sc.time.delayedCall(700,function(){animateScore('cmb',G.scores.cmb);gradeScore(G.scores.cmb);setState(S.CMB_R);});
    }
  }

  function drawResult(key,ts){
    drawBg(); drawStepBar(ts);
    fillRR(45,SH+28,VW-90,205,18,C.ui);
    ctx.font='bold 24px Prompt'; ctx.fillStyle=C.gold;
    T('เสร็จสิ้น! 🎉',VW/2,SH+76,'center');
    var score=G.scores[key];
    ctx.font='bold 46px Prompt'; ctx.fillStyle=C.w; T(scoreVal(key,score,ts),VW/2,SH+142,'center');
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.45)'; T('คะแนน',VW/2,SH+166,'center');
    ctx.font='16px Prompt';
    ctx.fillStyle=score>=80?C.sDone:score>=50?C.gold:C.red;
    T(score>=80?'⭐⭐⭐ ยอดเยี่ยม!':score>=50?'⭐⭐ ดีมาก!':'⭐ ลองใหม่นะ',VW/2,SH+200,'center');
    ctx.font='12px Prompt'; ctx.fillStyle='rgba(255,255,255,.35)';
    T('คะแนนรวม: '+G.total,VW/2,SH+228,'center');
    drawBtn(VW/2-100,SH+258,200,54,'🎤 พูดคำนี้ด้วย!',C.acc,ts);
  }

  function drawFinal(ts){
    drawBg();
    if(!G.confetti){ spawnConfetti(); if(sc.sfxCongrats)sc.sfxCongrats.play(); }
    drawConfetti(ts);
    ctx.font='bold 24px Prompt'; ctx.fillStyle=C.gold;
    T('🎉 Hot Dog สำเร็จ! 🎉',VW/2,68,'center');
    var fc=VW/2, baseY=285;
    if(!drawAssemblyBunPiece(G.botPiece,fc,baseY+23,216,44)) sBunBot(fc,baseY,216,44);
    G.dropped.forEach(function(d,i){drawAssemblyLayer(d.ing,d.x,baseY-22-i*20,185);});
    if(!drawAssemblyBunPiece(G.topPiece,fc,baseY-G.dropped.length*20-33,216,55))
      sBunTop(fc,baseY-G.dropped.length*20-60,216,55);
    fillRR(28,350,VW-56,210,16,C.ui);
    var rows=[['ตัดขนมปัง','bun'],['สับมะเขือเทศ','tom'],['สับกะหล่ำปลี','cab'],['ตัดไส้กรอก','sau'],['ใส่ส่วนผสม','cmb']];
    rows.forEach(function(r,i){
      var ry=382+i*34;
      ctx.font='14px Prompt'; ctx.fillStyle='rgba(255,255,255,.72)'; T(r[0],48,ry,'left');
      ctx.fillStyle=C.gold; T(G.scores[r[1]]+' pts',VW-48,ry,'right');
    });
    ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(28,558,VW-56,1);
    drawDishMedal(592,['bun','tom','cab','sau','cmb']);
    ctx.font='bold 20px Prompt'; ctx.fillStyle=C.w;
    T('คะแนนรวม: '+G.total+' คะแนน',VW/2,660,'center');
    drawBtn(FIN_BTN_X0,690,FIN_BTN_W,52,'🔄 เล่นอีกครั้ง',C.acc,ts);
    drawBtn(FIN_BTN_X1,690,FIN_BTN_W,52,'← ออก',C.gray,ts);
  }

  /* ── Pizza screens ─────────────────────────────────────────── */
  function drawPizzaDough(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.8)';
    T('ลากออกจากตรงกลางเพื่อยืดแป้ง!',VW/2,SH+28,'center');
    if(!G.doughDone){
      var r=Math.max(PZ_R_MIN,G.doughR);
      sDoughRaw(PZ_CX,PZ_CY,r);
      // The closer the current drag is to the target radius, the
      // brighter/thicker the ring glows -- live feedback during the
      // drag itself instead of only finding out the score on release.
      var closeness=G.doughDragging?Math.max(0,1-Math.abs(r-PZ_R_TARGET)/60):0;
      ctx.setLineDash([8,6]);
      ctx.strokeStyle='rgba(240,165,0,'+(0.4+0.5*closeness)+')';
      ctx.lineWidth=2.5+3*closeness;
      ctx.beginPath(); ctx.arc(PZ_CX,PZ_CY,PZ_R_TARGET,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]);
      if(closeness>0.7){
        ctx.fillStyle='rgba(240,165,0,'+((closeness-0.7)*0.5)+')';
        ctx.beginPath(); ctx.arc(PZ_CX,PZ_CY,PZ_R_TARGET,0,Math.PI*2); ctx.fill();
      }
      ctx.font='12px Prompt'; ctx.fillStyle=C.gold;
      T('เป้าหมาย',PZ_CX,PZ_CY-PZ_R_TARGET-10,'center');
    }else{
      sDoughDisc(PZ_CX,PZ_CY,G.doughFinal,G.doughFinal>=PZ_R_TORN);
      ctx.font='bold 26px Prompt'; ctx.fillStyle=C.gold;
      T('ยืดแป้งได้ '+scoreVal('dough',G.scores.dough,ts)+' คะแนน!',VW/2,PZ_CY+G.doughFinal+56,'center');
      drawBtn(VW/2-85,PZ_CY+G.doughFinal+78,170,52,'ต่อไป →',C.acc,ts);
    }
  }
  function paintSauceAt(x,y){
    if(G.sauceDone)return;
    for(var i=0;i<VEG_CELLS;i++){
      var c=vegCellRect(PZ_CX,PZ_CY,PZ_DISPLAY_R,i);
      if(x>=c.x&&x<=c.x+c.w&&y>=c.y&&y<=c.y+c.h){
        if(!G.sauceCells[i]){ G.sauceCells[i]=true; G.sauceCellAt[i]=sc.time.now; }
        break;
      }
    }
    var painted=G.sauceCells.filter(function(b){return b;}).length;
    if(painted>=VEG_CELLS) finishSauce();
  }
  function drawPizzaSauce(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('ลากนิ้วป้ายซอสให้ทั่วแป้ง!',VW/2,SH+28,'center');
    var elapsed=G.sauceRun?Math.min(SAUCE_DUR,ts-G.sauceStart):0;
    var pct=Math.max(0,1-elapsed/SAUCE_DUR);
    if(G.sauceRun&&!G.sauceDone&&elapsed>=SAUCE_DUR) finishSauce();
    fillRR(40,SH+48,VW-80,18,9,'#2A1D14');
    fillRR(40,SH+48,(VW-80)*pct,18,9,pct>0.3?C.acc:C.red);
    sDoughDisc(PZ_CX,PZ_CY,PZ_DISPLAY_R,false);
    sSauceLayer(PZ_CX,PZ_CY,PZ_DISPLAY_R,G.sauceCells,G.sauceCellAt,ts);
    var painted=G.sauceCells.filter(function(b){return b;}).length;
    ctx.font='bold 14px Prompt'; ctx.fillStyle=C.w;
    T('ป้ายแล้ว '+painted+'/'+VEG_CELLS,VW/2,PZ_CY+PZ_DISPLAY_R+40,'center');
    if(G.sauceDone){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('เสร็จแล้ว!',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('sauce',G.scores.sauce,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawPizzaCheese(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('แตะโรยชีสให้ทั่ว!',VW/2,SH+30,'center');
    var elapsed=G.cheeseRun?Math.min(CHOP_DUR,ts-G.cheeseStart):0;
    var pct=Math.max(0,1-elapsed/CHOP_DUR);
    if(G.cheeseRun&&!G.cheeseDone&&elapsed>=CHOP_DUR) finishCheese();
    fillRR(40,SH+48,VW-80,18,9,'#2A1D14');
    fillRR(40,SH+48,(VW-80)*pct,18,9,pct>0.3?C.acc:C.red);
    ctx.font='bold 11px Prompt'; ctx.fillStyle=C.w;
    T(Math.max(0,Math.ceil((CHOP_DUR-elapsed)/1000))+'วิ',VW/2,SH+60,'center');
    var cheesePct=(G.cheeseCount||0)/CHEESE_TAPS_NEEDED;
    var punchT=G.cheesePunch?(ts-G.cheesePunch)/140:1, sq=1;
    if(punchT<1){ var pe=1-Math.pow(1-punchT,2); sq=1-0.05*(1-pe); }
    ctx.save(); ctx.translate(PZ_CX,PZ_CY); ctx.scale(1/sq,sq); ctx.translate(-PZ_CX,-PZ_CY);
    sDoughDisc(PZ_CX,PZ_CY,PZ_DISPLAY_R,false);
    sSauceLayer(PZ_CX,PZ_CY,PZ_DISPLAY_R,G.sauceCells);
    sCheeseLayer(PZ_CX,PZ_CY,PZ_DISPLAY_R,cheesePct);
    ctx.restore();
    ctx.font='12px Prompt'; ctx.fillStyle='rgba(255,255,255,.4)';
    T('โรย '+G.cheeseTaps+' ครั้ง',VW/2,PZ_CY+PZ_DISPLAY_R+40,'center');
    if(G.cheeseDone){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('เสร็จแล้ว!',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('cheese',G.scores.cheese,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawPizzaTopping(ts){
    drawBg(); drawStepBar(ts);
    var cur=TOPPING_LIST[G.toppingIdx];
    if(G.toppingIdx<TOPPING_LIST.length){
      ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
      T('แตะเพื่อวาง'+(TOPPING_LABELS[cur]||cur)+'!',VW/2,SH+28,'center');
      G.toppingX+=G.toppingDir*G.toppingSpd; if(G.toppingX>VW-45)G.toppingDir=-1; if(G.toppingX<45)G.toppingDir=1;
    }
    sDoughDisc(PZ_CX,PZ_CY,PZ_DISPLAY_R,false);
    sSauceLayer(PZ_CX,PZ_CY,PZ_DISPLAY_R,G.sauceCells);
    sCheeseLayer(PZ_CX,PZ_CY,PZ_DISPLAY_R,G.cheeseFinalPct);
    G.toppingDropped.forEach(function(d,i){
      var spot=TOPPING_SPOTS[i%TOPPING_SPOTS.length];
      drawDroppedTopping(d,PZ_CX+spot.dx,PZ_CY+spot.dy,ts);
    });
    if(G.toppingIdx<TOPPING_LIST.length){
      ctx.strokeStyle='rgba(46,196,182,.38)'; ctx.lineWidth=2; ctx.setLineDash([5,4]);
      ctx.strokeRect(VW/2-40,180,80,40); ctx.setLineDash([]);
      ctx.fillStyle='rgba(46,196,182,.06)'; ctx.fillRect(VW/2-40,180,80,40);
      sTopping(cur,G.toppingX,200);
    }
    if(G.toppingIdx>=TOPPING_LIST.length&&!G.toppingAllDone){
      G.toppingAllDone=true;
      var acc=G.toppingDropped.reduce(function(s,d){return s+d.acc;},0)/G.toppingDropped.length;
      G.scores.topping=Math.round(acc*100); G.total+=G.scores.topping;
      animateScore('topping',G.scores.topping);
      gradeScore(G.scores.topping);
    }
    if(G.toppingAllDone){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('หน้าพิซซ่าเสร็จ!',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('topping',G.scores.topping,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawPizzaBake(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('กดหยิบออกตอนสุกกำลังดี!',VW/2,SH+28,'center');
    if(!G.bakeRun){G.bakeRun=true;G.bakeStart=ts;}
    var elapsed=ts-G.bakeStart;
    var frac=G.bakeDone?G.bakeTapVal:Math.min(1,elapsed/BAKE_DUR);
    G.bakeVal=frac;
    if(!G.bakeDone&&frac>=1) finishBake(1);
    var tintCol = frac<BAKE_GOOD[0] ? '#F3DCA6' : frac>BAKE_GOOD[1] ? '#7A4A1E' : '#E0A73D';
    sDoughDisc(PZ_CX,PZ_CY,PZ_DISPLAY_R,false);
    ctx.save();
    ctx.beginPath(); ctx.arc(PZ_CX,PZ_CY,PZ_DISPLAY_R-8,0,Math.PI*2); ctx.clip();
    ctx.globalAlpha=0.55; ctx.fillStyle=tintCol;
    ctx.fillRect(PZ_CX-PZ_DISPLAY_R,PZ_CY-PZ_DISPLAY_R,PZ_DISPLAY_R*2,PZ_DISPLAY_R*2);
    ctx.globalAlpha=1;
    ctx.restore();
    sSauceLayer(PZ_CX,PZ_CY,PZ_DISPLAY_R,G.sauceCells);
    sCheeseLayer(PZ_CX,PZ_CY,PZ_DISPLAY_R,G.cheeseFinalPct);
    G.toppingDropped.forEach(function(d,i){
      var spot=TOPPING_SPOTS[i%TOPPING_SPOTS.length];
      drawDroppedTopping(d,PZ_CX+spot.dx,PZ_CY+spot.dy,ts);
    });
    // A soft pulsing ring while inside the good-bake window -- a live
    // "now's the time!" cue instead of only the gauge colour to go by.
    if(!G.bakeDone&&frac>=BAKE_GOOD[0]&&frac<=BAKE_GOOD[1]){
      var pulse=0.25+0.15*Math.sin(ts*0.008);
      ctx.strokeStyle='rgba(240,165,0,'+pulse+')'; ctx.lineWidth=6;
      ctx.beginPath(); ctx.arc(PZ_CX,PZ_CY,PZ_DISPLAY_R+8,0,Math.PI*2); ctx.stroke();
    }
    fillRR(40,570,VW-80,20,10,'#2A1D14');
    var goodX0=40+(VW-80)*BAKE_GOOD[0], goodX1=40+(VW-80)*BAKE_GOOD[1];
    ctx.fillStyle='rgba(240,165,0,.35)'; ctx.fillRect(goodX0,570,goodX1-goodX0,20);
    fillRR(40,570,(VW-80)*frac,20,10, frac<BAKE_GOOD[0]?C.acc: frac<=BAKE_GOOD[1]?C.gold:C.red);
    if(!G.bakeDone){
      drawBtn(VW/2-100,606,200,50,'หยิบออกจากเตา! 🔥',C.gold,ts);
    }else{
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('อบเสร็จ!',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('bake',G.scores.bake,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawPizzaFinal(ts){
    drawBg();
    if(!G.confetti){ spawnConfetti(); if(sc.sfxCongrats)sc.sfxCongrats.play(); }
    drawConfetti(ts);
    ctx.font='bold 24px Prompt'; ctx.fillStyle=C.gold;
    T('🎉 พิซซ่าสำเร็จ! 🎉',VW/2,68,'center');
    var fcx=VW/2, fcy=222, fr=112;
    sDoughDisc(fcx,fcy,fr,false);
    sSauceLayer(fcx,fcy,fr,G.sauceCells);
    sCheeseLayer(fcx,fcy,fr,G.cheeseFinalPct);
    G.toppingDropped.forEach(function(d,i){
      var spot=TOPPING_SPOTS[i%TOPPING_SPOTS.length];
      drawDroppedTopping(d,fcx+spot.dx*0.86,fcy+spot.dy*0.86,ts);
    });
    drawPizzaSliceMarks(fcx,fcy,fr,G.pzCuts);
    fillRR(28,350,VW-56,222,16,C.ui);
    var rows=[['ยืดแป้ง','dough'],['ป้ายซอส','sauce'],['โรยชีส','cheese'],['วางหน้าพิซซ่า','topping'],['อบ','bake'],['ตัดชิ้น','pzcut']];
    rows.forEach(function(r,i){
      var ry=380+i*32;
      ctx.font='14px Prompt'; ctx.fillStyle='rgba(255,255,255,.72)'; T(r[0],48,ry,'left');
      ctx.fillStyle=C.gold; T(G.scores[r[1]]+' pts',VW-48,ry,'right');
    });
    ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(28,584,VW-56,1);
    drawDishMedal(618,['dough','sauce','cheese','topping','bake','pzcut']);
    ctx.font='bold 20px Prompt'; ctx.fillStyle=C.w;
    T('คะแนนรวม: '+G.total+' คะแนน',VW/2,688,'center');
    drawBtn(FIN_BTN_X0,714,FIN_BTN_W,52,'🔄 เล่นอีกครั้ง',C.acc,ts);
    drawBtn(FIN_BTN_X1,714,FIN_BTN_W,52,'← ออก',C.gray,ts);
  }

  /* ── Breakfast screens ────────────────────────────────────────── */
  function drawBreakfastEgg(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('แตะตอกไข่ให้แตก!',VW/2,SH+30,'center');
    var elapsed=G.eggRun?Math.min(EGG_DUR,ts-G.eggStart):0;
    var pct=Math.max(0,1-elapsed/EGG_DUR);
    if(G.eggRun&&!G.eggDone&&elapsed>=EGG_DUR) finishEgg();
    fillRR(40,SH+48,VW-80,18,9,'#2A1D14');
    fillRR(40,SH+48,(VW-80)*pct,18,9,pct>0.3?C.acc:C.red);
    var punchT=G.eggPunch?(ts-G.eggPunch)/140:1, sq=1;
    if(punchT<1){ var pe=1-Math.pow(1-punchT,2); sq=1-0.05*(1-pe); }
    ctx.save(); ctx.translate(EGG_CX,EGG_CY); ctx.scale(1/sq,sq); ctx.translate(-EGG_CX,-EGG_CY);
    if(G.eggCracks>=EGG_TAPS_NEEDED) sEggBroken(EGG_CX,EGG_CY,EGG_R);
    else sEggCracked(EGG_CX,EGG_CY,EGG_R,G.eggCracks);
    ctx.restore();
    ctx.font='12px Prompt'; ctx.fillStyle='rgba(255,255,255,.4)';
    T('ตอก '+G.eggTaps+' ครั้ง',VW/2,EGG_CY+EGG_R+40,'center');
    if(G.eggDone){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('เสร็จแล้ว!',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('egg',G.scores.egg,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawBreakfastBacon(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.8)';
    T('แตะตอนที่ปลายพลิกผ่านจุดหมาย! (2 ครั้ง)',VW/2,SH+26,'center');
    if(G.baconCuts<2){G.baconY+=G.baconDir*G.baconSpd; if(G.baconY>BC_BOT-12)G.baconDir=-1; if(G.baconY<BC_TOP+12)G.baconDir=1;}
    sBaconFull(G.baconCuts);
    if(G.baconCuts<2){
      BC_CUT_TY.forEach(function(ty,i){
        if(i>=G.baconCuts){
          ctx.strokeStyle='rgba(46,196,182,.5)'; ctx.lineWidth=2.5; ctx.setLineDash([6,4]);
          ctx.beginPath(); ctx.moveTo(VW/2-45,ty); ctx.lineTo(VW/2+45,ty); ctx.stroke(); ctx.setLineDash([]);
          ctx.font='10px Prompt'; ctx.fillStyle=C.acc;
          T('พลิกตรงนี้',VW/2+50,ty+4,'left');
        }
      });
      ctx.save(); ctx.translate(BC_KX,G.baconY); ctx.rotate(-Math.PI/2);
      ctx.shadowColor=C.sh; ctx.shadowBlur=5; ctx.shadowOffsetY=2;
      fillRR(-30,-7,50,14,5,'#CFCFCF');
      ctx.shadowColor='transparent';
      ctx.strokeStyle=C.outline; ctx.lineWidth=2.5; rr(-30,-7,50,14,5); ctx.stroke();
      fillRR(18,-9,26,18,5,'#8D6E63');
      ctx.strokeStyle=C.outline; ctx.lineWidth=2.5; rr(18,-9,26,18,5); ctx.stroke();
      ctx.restore();
    }
    if(G.baconSc.length>0){
      G.baconSc.forEach(function(cs,i){
        var cAt=G.baconAt[i]||0, ct=cAt?(ts-cAt)/220:1, cScale=1;
        if(ct<1){ var ce=1-Math.pow(1-ct,2); cScale=1.12-0.12*ce; }
        var lx=VW/2, ly=680-i*22;
        ctx.save();
        ctx.translate(lx,ly); ctx.scale(cScale,cScale); ctx.translate(-lx,-ly);
        ctx.font='bold 13px Prompt'; ctx.fillStyle=cs>=70?C.grn:C.gold;
        T(cs>=70?'🎯 พอดี! +'+cs:'📍 พอใช้ +'+cs,lx,ly,'center');
        ctx.restore();
      });
    }
    ctx.font='bold 14px Prompt'; ctx.fillStyle=C.w;
    T('พลิกแล้ว '+G.baconCuts+'/2',VW/2,720,'center');
    if(G.baconCuts>=2){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('ทอดเสร็จ! 🥓',VW/2,310,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('bacon',G.scores.bacon,ts)+' คะแนน',VW/2,362,'center');
      drawBtn(VW/2-80,402,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawBreakfastToast(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('กดป๊อปตอนสีเหลืองทองพอดี!',VW/2,SH+28,'center');
    if(!G.toastRun){G.toastRun=true;G.toastStart=ts;}
    var elapsed=ts-G.toastStart;
    var frac=G.toastDone?G.toastTapVal:Math.min(1,elapsed/TOAST_DUR);
    G.toastVal=frac;
    if(!G.toastDone&&frac>=1) finishToast(1);
    sToastSlice(VW/2,340,frac);
    fillRR(40,470,VW-80,20,10,'#2A1D14');
    var goodX0=40+(VW-80)*TOAST_GOOD[0], goodX1=40+(VW-80)*TOAST_GOOD[1];
    ctx.fillStyle='rgba(240,165,0,.35)'; ctx.fillRect(goodX0,470,goodX1-goodX0,20);
    fillRR(40,470,(VW-80)*frac,20,10, frac<TOAST_GOOD[0]?C.acc: frac<=TOAST_GOOD[1]?C.gold:C.red);
    if(!G.toastDone){
      drawBtn(VW/2-90,510,180,50,'ป๊อปขึ้นมา! 🍞',C.gold,ts);
    }else{
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('ปิ้งเสร็จ!',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('toast',G.scores.toast,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawBreakfastPlate(ts){
    drawBg(); drawStepBar(ts);
    var cur=PLATE_LIST[G.plateIdx];
    if(G.plateIdx<PLATE_LIST.length){
      ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
      T('แตะเพื่อจัดวาง'+(PLATE_LABELS[cur]||cur)+'!',VW/2,SH+26,'center');
      G.plateX+=G.plateDir*G.plateSpd; if(G.plateX>VW-45)G.plateDir=-1; if(G.plateX<45)G.plateDir=1;
    }
    ctx.save();
    ctx.fillStyle='#EDEDED'; ctx.beginPath(); ctx.ellipse(VW/2,460,150,90,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=C.outline; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(VW/2,460,150,90,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
    var plateSpots=[{dx:-70,dy:-10},{dx:20,dy:20},{dx:60,dy:-25}];
    G.plateDropped.forEach(function(d,i){
      var sp=plateSpots[i%plateSpots.length];
      sPlateItem(d.ing,VW/2+sp.dx,460+sp.dy,90);
    });
    if(G.plateIdx<PLATE_LIST.length){
      ctx.strokeStyle='rgba(46,196,182,.38)'; ctx.lineWidth=2; ctx.setLineDash([5,4]);
      ctx.strokeRect(VW/2-40,290,80,40); ctx.setLineDash([]);
      ctx.fillStyle='rgba(46,196,182,.06)'; ctx.fillRect(VW/2-40,290,80,40);
      sPlateItem(cur,G.plateX,310,60);
    }
    if(G.plateIdx>=PLATE_LIST.length&&!G.plateAllDone){
      G.plateAllDone=true;
      var acc=G.plateDropped.reduce(function(s,d){return s+d.acc;},0)/G.plateDropped.length;
      G.scores.plate=Math.round(acc*100); G.total+=G.scores.plate;
      sc.time.delayedCall(700,function(){animateScore('plate',G.scores.plate);gradeScore(G.scores.plate);setState(SB.PLATE_R);});
    }
  }
  function drawBreakfastFinal(ts){
    drawBg();
    if(!G.confetti){ spawnConfetti(); if(sc.sfxCongrats)sc.sfxCongrats.play(); }
    drawConfetti(ts);
    ctx.font='bold 24px Prompt'; ctx.fillStyle=C.gold;
    T('🎉 มื้อเช้าสำเร็จ! 🎉',VW/2,68,'center');
    ctx.save();
    ctx.fillStyle='#EDEDED'; ctx.beginPath(); ctx.ellipse(VW/2,220,140,84,0,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle=C.outline; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(VW/2,220,140,84,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
    var finSpots=[{dx:-65,dy:-8},{dx:18,dy:18},{dx:55,dy:-22}];
    G.plateDropped.forEach(function(d,i){
      var sp=finSpots[i%finSpots.length];
      sPlateItem(d.ing,VW/2+sp.dx,220+sp.dy,85);
    });
    fillRR(28,350,VW-56,180,16,C.ui);
    var rows=[['ตอกไข่','egg'],['ทอดเบคอน','bacon'],['ปิ้งขนมปัง','toast'],['จัดจาน','plate']];
    rows.forEach(function(r,i){
      var ry=382+i*34;
      ctx.font='14px Prompt'; ctx.fillStyle='rgba(255,255,255,.72)'; T(r[0],48,ry,'left');
      ctx.fillStyle=C.gold; T(G.scores[r[1]]+' pts',VW-48,ry,'right');
    });
    ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(28,528,VW-56,1);
    drawDishMedal(562,['egg','bacon','toast','plate']);
    ctx.font='bold 20px Prompt'; ctx.fillStyle=C.w;
    T('คะแนนรวม: '+G.total+' คะแนน',VW/2,630,'center');
    drawBtn(FIN_BTN_X0,660,FIN_BTN_W,52,'🔄 เล่นอีกครั้ง',C.acc,ts);
    drawBtn(FIN_BTN_X1,660,FIN_BTN_W,52,'← ออก',C.gray,ts);
  }

  /* ── Pizza: slicing ─────────────────────────────────────────── */
  // Shared by the CUT screen and the pizza finish screen so the slices
  // the player actually cut show up in the final presentation too.
  function drawPizzaSliceMarks(cx,cy,r,cuts){
    ctx.save();
    cuts.forEach(function(c){
      var good=(c.sc||0)>=70;
      ctx.save();
      ctx.translate(cx,cy); ctx.rotate(c.ang);
      if(good){
        ctx.strokeStyle='#fff'; ctx.lineWidth=3.5;
        ctx.shadowColor=C.acc; ctx.shadowBlur=10;
        ctx.beginPath(); ctx.moveTo(-r,0); ctx.lineTo(r,0); ctx.stroke();
      }else{
        // Same clean-vs-jagged convention as the sausage/bacon cuts.
        ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.lineCap='round';
        ctx.beginPath();
        var zx=-r, zStep=(r*2)/8, zDir=1;
        ctx.moveTo(zx,c.off||0);
        for(var zi=0;zi<8;zi++){ zx+=zStep; ctx.lineTo(zx,(c.off||0)+zDir*5); zDir*=-1; }
        ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
  }
  function drawPizzaCut(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('ลากผ่านกลางพิซซ่าเพื่อตัดเป็นชิ้น!',VW/2,SH+28,'center');
    sDoughDisc(PZ_CX,PZ_CY,PZ_DISPLAY_R,false);
    sSauceLayer(PZ_CX,PZ_CY,PZ_DISPLAY_R,G.sauceCells);
    sCheeseLayer(PZ_CX,PZ_CY,PZ_DISPLAY_R,G.cheeseFinalPct);
    G.toppingDropped.forEach(function(d,i){
      var spot=TOPPING_SPOTS[i%TOPPING_SPOTS.length];
      drawDroppedTopping(d,PZ_CX+spot.dx,PZ_CY+spot.dy,ts);
    });
    // Remaining guide lines, so it's always obvious where to cut next.
    if(!G.pzCutDone){
      var used={};
      G.pzCuts.forEach(function(c){ used[c.guide]=true; });
      ctx.save();
      ctx.setLineDash([7,6]); ctx.strokeStyle='rgba(46,196,182,.5)'; ctx.lineWidth=2.5;
      PZ_CUT_ANGLES.forEach(function(a,i){
        if(used[i])return;
        ctx.save(); ctx.translate(PZ_CX,PZ_CY); ctx.rotate(a);
        ctx.beginPath(); ctx.moveTo(-PZ_DISPLAY_R-14,0); ctx.lineTo(PZ_DISPLAY_R+14,0); ctx.stroke();
        ctx.restore();
      });
      ctx.setLineDash([]); ctx.restore();
    }
    drawPizzaSliceMarks(PZ_CX,PZ_CY,PZ_DISPLAY_R,G.pzCuts);
    // Live stroke while the finger is down.
    if(G.pzDrag&&G.pzDrag.cx!==undefined){
      ctx.save();
      ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=3; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(G.pzDrag.x,G.pzDrag.y); ctx.lineTo(G.pzDrag.cx,G.pzDrag.cy); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }
    G.pzCutSc.forEach(function(cs,i){
      var lx=VW/2, ly=600+i*22;
      ctx.font='bold 13px Prompt'; ctx.fillStyle=cs>=70?C.grn:C.gold;
      T(cs>=70?'🎯 ตรงกลาง! +'+cs:'📍 พอใช้ +'+cs,lx,ly,'center');
    });
    ctx.font='bold 14px Prompt'; ctx.fillStyle=C.w;
    T('ตัดแล้ว '+G.pzCuts.length+'/'+PZ_CUTS_NEEDED,VW/2,570,'center');
    if(G.pzCutDone){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('ตัดเสร็จ! 🍕',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('pzcut',G.scores.pzcut,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }

  /* ── Burger screens ─────────────────────────────────────────── */
  function drawBurgerPatty(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('แตะกดเนื้อให้แบนเป็นแผ่น!',VW/2,SH+30,'center');
    var elapsed=G.pattyRun?Math.min(PATTY_DUR,ts-G.pattyStart):0;
    var pct=Math.max(0,1-elapsed/PATTY_DUR);
    if(G.pattyRun&&!G.pattyDone&&elapsed>=PATTY_DUR) finishPatty();
    fillRR(40,SH+48,VW-80,18,9,'#2A1D14');
    fillRR(40,SH+48,(VW-80)*pct,18,9,pct>0.3?C.acc:C.red);
    ctx.font='bold 11px Prompt'; ctx.fillStyle=C.w;
    T(Math.max(0,Math.ceil((PATTY_DUR-elapsed)/1000))+'วิ',VW/2,SH+60,'center');
    var pressPct=(G.pattyCount||0)/PATTY_TAPS_NEEDED;
    var punchT=G.pattyPunch?(ts-G.pattyPunch)/140:1, sq=1;
    if(punchT<1){ var pe=1-Math.pow(1-punchT,2); sq=1-0.09*(1-pe); }
    // Board under the patty so it isn't floating on the background.
    fillRR(BG_CX-130,BG_CY-70,260,150,16,'rgba(60,34,20,.5)');
    ctx.save(); ctx.translate(BG_CX,BG_CY); ctx.scale(1/sq,sq); ctx.translate(-BG_CX,-BG_CY);
    sPatty(BG_CX,BG_CY,pressPct,false);
    ctx.restore();
    ctx.font='12px Prompt'; ctx.fillStyle='rgba(255,255,255,.45)';
    T('กด '+G.pattyTaps+' ครั้ง',VW/2,BG_CY+110,'center');
    if(G.pattyDone){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('ปั้นเสร็จ! 🥩',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('patty',G.scores.patty,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawBurgerGrill(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('กดยกออกตอนสุกกำลังดี!',VW/2,SH+28,'center');
    if(!G.grillRun){G.grillRun=true;G.grillStart=ts;}
    var elapsed=ts-G.grillStart;
    var frac=G.grillDone?G.grillTapVal:Math.min(1,elapsed/GRILL_DUR);
    G.grillVal=frac;
    if(!G.grillDone&&frac>=1) finishGrill(1);
    sGrillGrate(BG_CX,BG_CY,300,190);
    // Sizzle wisps rising off the grate while it cooks.
    if(!G.grillDone){
      ctx.save(); ctx.strokeStyle='rgba(255,255,255,.16)'; ctx.lineWidth=3; ctx.lineCap='round';
      for(var i=0;i<3;i++){
        var sx2=BG_CX-60+i*60, ph=ts*0.004+i;
        ctx.beginPath(); ctx.moveTo(sx2,BG_CY-70);
        ctx.quadraticCurveTo(sx2+Math.sin(ph)*14,BG_CY-100,sx2+Math.sin(ph+1)*10,BG_CY-130);
        ctx.stroke();
      }
      ctx.restore();
    }
    sPatty(BG_CX,BG_CY,G.pattyFinalPct||1,frac>0.28);
    if(!G.grillDone&&frac>=GRILL_GOOD[0]&&frac<=GRILL_GOOD[1]){
      var pulse=0.25+0.15*Math.sin(ts*0.008);
      ctx.strokeStyle='rgba(240,165,0,'+pulse+')'; ctx.lineWidth=6;
      ctx.beginPath(); ctx.ellipse(BG_CX,BG_CY,PATTY_R1+18,44,0,0,Math.PI*2); ctx.stroke();
    }
    fillRR(40,548,VW-80,20,10,'#2A1D14');
    var gx0=40+(VW-80)*GRILL_GOOD[0], gx1=40+(VW-80)*GRILL_GOOD[1];
    ctx.fillStyle='rgba(240,165,0,.35)'; ctx.fillRect(gx0,548,gx1-gx0,20);
    fillRR(40,548,(VW-80)*frac,20,10, frac<GRILL_GOOD[0]?C.acc: frac<=GRILL_GOOD[1]?C.gold:C.red);
    if(!G.grillDone){
      drawBtn(VW/2-100,586,200,50,'ยกออกจากเตา! 🔥',C.gold,ts);
    }else{
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('ย่างเสร็จ!',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('grill',G.scores.grill,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawBurgerVeg(ts){
    drawBg(); drawStepBar(ts);
    var cur=BG_VEG_LIST[G.bgVegIdx];
    if(G.bgVegIdx<BG_VEG_LIST.length){
      ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
      T('แตะเพื่อวาง'+(BG_VEG_LABELS[cur]||cur)+'!',VW/2,SH+26,'center');
      G.bgVegX+=G.bgVegDir*G.bgVegSpd; if(G.bgVegX>VW-45)G.bgVegDir=-1; if(G.bgVegX<45)G.bgVegDir=1;
    }
    sBunBot(VW/2,BG_STACK_BY,180,44);
    var ly=BG_STACK_BY-14;
    G.bgVegDropped.forEach(function(d){
      var t=Math.min(1,(ts-d.dropStart)/DROP_DUR), ease=1-(1-t)*(1-t);
      var yy=d.fromY+(ly-d.fromY)*ease;
      sBurgerVeg(d.ing,VW/2+d.off*(1-ease),yy,162);
      ly-=17;
    });
    if(G.bgVegIdx<BG_VEG_LIST.length){
      ctx.strokeStyle='rgba(46,196,182,.38)'; ctx.lineWidth=2; ctx.setLineDash([5,4]);
      ctx.strokeRect(VW/2-CTW/2,BG_STACK_BY-26,CTW,22); ctx.setLineDash([]);
      ctx.fillStyle='rgba(46,196,182,.06)'; ctx.fillRect(VW/2-CTW/2,BG_STACK_BY-26,CTW,22);
      ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1; ctx.setLineDash([3,6]);
      ctx.beginPath(); ctx.moveTo(G.bgVegX,270); ctx.lineTo(G.bgVegX,BG_STACK_BY-26); ctx.stroke(); ctx.setLineDash([]);
      sBurgerVeg(cur,G.bgVegX,250,150);
    }
    if(G.bgVegIdx>=BG_VEG_LIST.length&&!G.bgVegAllDone){
      G.bgVegAllDone=true;
      var acc=G.bgVegDropped.reduce(function(s,d){return s+d.acc;},0)/G.bgVegDropped.length;
      G.scores.bgveg=Math.round(acc*100); G.total+=G.scores.bgveg;
      sc.time.delayedCall(700,function(){animateScore('bgveg',G.scores.bgveg);gradeScore(G.scores.bgveg);setState(SG.VEG_R);});
    }
  }
  function drawBurgerStack(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('แตะตอนฝาบนตรงกลางพอดี!',VW/2,SH+28,'center');
    // Sweep symmetrically around the target, otherwise the bun spends
    // more time on one side of center and the "perfect" tap is easier
    // from one direction than the other.
    if(!G.stackDone){
      G.stackX+=G.stackDir*G.stackSpd;
      if(G.stackX>VW/2+BG_SWEEP)G.stackDir=-1;
      if(G.stackX<VW/2-BG_SWEEP)G.stackDir=1;
    }
    // Target zone marker on the stack itself.
    ctx.strokeStyle='rgba(46,196,182,.4)'; ctx.lineWidth=2; ctx.setLineDash([5,4]);
    ctx.strokeRect(VW/2-BG_TARGET_W/2,BG_STACK_BY-150,BG_TARGET_W,26); ctx.setLineDash([]);
    if(G.stackDone){
      // Top bun drops into place with the same ease as the other drops.
      var dt=Math.min(1,(ts-G.stackDropAt)/DROP_DUR), de=1-(1-dt)*(1-dt);
      sBurgerStack(VW/2,BG_STACK_BY,-90*(1-de));
    }else{
      sBurgerStack(VW/2,BG_STACK_BY,null);
      sBunTop(G.stackX,190,180,52);
      ctx.strokeStyle='rgba(255,255,255,.08)'; ctx.lineWidth=1; ctx.setLineDash([3,6]);
      ctx.beginPath(); ctx.moveTo(G.stackX,250); ctx.lineTo(G.stackX,BG_STACK_BY-150); ctx.stroke(); ctx.setLineDash([]);
    }
    if(G.stackDone){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('ประกอบเสร็จ! 🍔',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('stack',G.scores.stack,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawBurgerFinal(ts){
    drawBg();
    if(!G.confetti){ spawnConfetti(); if(sc.sfxCongrats)sc.sfxCongrats.play(); }
    drawConfetti(ts);
    ctx.font='bold 24px Prompt'; ctx.fillStyle=C.gold;
    T('🎉 เบอร์เกอร์สำเร็จ! 🎉',VW/2,62,'center');
    sBurgerStack(VW/2,320,0);
    fillRR(28,360,VW-56,152,16,C.ui);
    var rows=[['ปั้นเนื้อ','patty'],['ย่างเนื้อ','grill'],['ใส่ผัก','bgveg'],['ประกอบ','stack']];
    rows.forEach(function(r,i){
      var ry=392+i*32;
      ctx.font='14px Prompt'; ctx.fillStyle='rgba(255,255,255,.72)'; T(r[0],48,ry,'left');
      ctx.fillStyle=C.gold; T(G.scores[r[1]]+' pts',VW-48,ry,'right');
    });
    ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(28,524,VW-56,1);
    drawDishMedal(560,['patty','grill','bgveg','stack']);
    ctx.font='bold 20px Prompt'; ctx.fillStyle=C.w;
    T('คะแนนรวม: '+G.total+' คะแนน',VW/2,632,'center');
    drawBtn(FIN_BTN_X0,662,FIN_BTN_W,52,'🔄 เล่นอีกครั้ง',C.acc,ts);
    drawBtn(FIN_BTN_X1,662,FIN_BTN_W,52,'← ออก',C.gray,ts);
  }

  /* ── Fries screens ──────────────────────────────────────────── */
  function drawFriesPeel(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('แตะเพื่อปอกเปลือกมันฝรั่ง!',VW/2,SH+30,'center');
    var elapsed=G.peelRun?Math.min(PEEL_DUR,ts-G.peelStart):0;
    var pct=Math.max(0,1-elapsed/PEEL_DUR);
    if(G.peelRun&&!G.peelDone&&elapsed>=PEEL_DUR) finishPeel();
    fillRR(40,SH+48,VW-80,18,9,'#2A1D14');
    fillRR(40,SH+48,(VW-80)*pct,18,9,pct>0.3?C.acc:C.red);
    ctx.font='bold 11px Prompt'; ctx.fillStyle=C.w;
    T(Math.max(0,Math.ceil((PEEL_DUR-elapsed)/1000))+'วิ',VW/2,SH+60,'center');
    var peelPct=(G.peelCount||0)/PEEL_TAPS_NEEDED;
    var punchT=G.peelPunch?(ts-G.peelPunch)/140:1, sq=1;
    if(punchT<1){ var pe=1-Math.pow(1-punchT,2); sq=1-0.06*(1-pe); }
    ctx.save(); ctx.translate(FR_CX,FR_CY); ctx.scale(1/sq,sq); ctx.translate(-FR_CX,-FR_CY);
    sPotato(FR_CX,FR_CY,peelPct);
    ctx.restore();
    ctx.font='12px Prompt'; ctx.fillStyle='rgba(255,255,255,.45)';
    T('ปอก '+G.peelTaps+' ครั้ง',VW/2,FR_CY+POTATO_RY+42,'center');
    if(G.peelDone){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('ปอกเสร็จ! 🥔',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('peel',G.scores.peel,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawFriesSlice(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('ลากลงตามเส้นเพื่อหั่นเป็นแท่ง!',VW/2,SH+28,'center');
    var used={};
    G.frSlices.forEach(function(s){ used[s.guide]=true; });
    // The peeled potato, now shown as a squared-off block ready to cut.
    ctx.save();
    ctx.shadowColor=C.sh; ctx.shadowBlur=8; ctx.shadowOffsetY=4;
    fillRR(FR_CX-58,FR_CY-110,116,220,12,'#F5E3B8');
    ctx.shadowColor='transparent';
    ctx.strokeStyle=C.outline; ctx.lineWidth=3; rr(FR_CX-58,FR_CY-110,116,220,12); ctx.stroke();
    ctx.restore();
    if(!G.frSliceDone){
      ctx.save(); ctx.setLineDash([7,6]); ctx.strokeStyle='rgba(46,196,182,.5)'; ctx.lineWidth=2.5;
      FR_SLICE_XS.forEach(function(dx,i){
        if(used[i])return;
        ctx.beginPath(); ctx.moveTo(FR_CX+dx,FR_CY-116); ctx.lineTo(FR_CX+dx,FR_CY+116); ctx.stroke();
      });
      ctx.setLineDash([]); ctx.restore();
    }
    G.frSlices.forEach(function(s){
      var good=(s.sc||0)>=70;
      ctx.save();
      if(good){
        ctx.strokeStyle='#fff'; ctx.lineWidth=3.5; ctx.shadowColor=C.acc; ctx.shadowBlur=10;
        ctx.beginPath(); ctx.moveTo(FR_CX+s.x,FR_CY-112); ctx.lineTo(FR_CX+s.x,FR_CY+112); ctx.stroke();
      }else{
        ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.lineJoin='round'; ctx.lineCap='round';
        ctx.beginPath();
        var zy=FR_CY-112, zStep=224/8, zDir=1;
        ctx.moveTo(FR_CX+s.x,zy);
        for(var zi=0;zi<8;zi++){ zy+=zStep; ctx.lineTo(FR_CX+s.x+zDir*5,zy); zDir*=-1; }
        ctx.stroke();
      }
      ctx.restore();
    });
    if(G.frDrag&&G.frDrag.cx!==undefined){
      ctx.save();
      ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=3; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(G.frDrag.x,G.frDrag.y); ctx.lineTo(G.frDrag.cx,G.frDrag.cy); ctx.stroke();
      ctx.setLineDash([]); ctx.restore();
    }
    ctx.font='bold 14px Prompt'; ctx.fillStyle=C.w;
    T('หั่นแล้ว '+G.frSlices.length+'/'+FR_SLICES_NEEDED,VW/2,FR_CY+150,'center');
    G.frSliceSc.forEach(function(cs,i){
      ctx.font='bold 13px Prompt'; ctx.fillStyle=cs>=70?C.grn:C.gold;
      T(cs>=70?'🎯 ตรงเส้น! +'+cs:'📍 พอใช้ +'+cs,VW/2,FR_CY+176+i*20,'center');
    });
    if(G.frSliceDone){
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('หั่นเสร็จ! 🔪',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('slice',G.scores.slice,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawFriesFry(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('ยกตะกร้าขึ้นตอนเหลืองกรอบพอดี!',VW/2,SH+28,'center');
    if(!G.fryRun){G.fryRun=true;G.fryStart=ts;}
    var elapsed=ts-G.fryStart;
    var frac=G.fryDone?G.fryTapVal:Math.min(1,elapsed/FRY_DUR);
    G.fryVal=frac;
    if(!G.fryDone&&frac>=1) finishFry(1);
    // Oil vat.
    ctx.save();
    fillRR(FR_CX-150,FR_CY-60,300,200,16,'#4A3418');
    ctx.fillStyle='#C98A2E';
    fillRR(FR_CX-142,FR_CY-46,284,178,12,'#C98A2E');
    // Bubbles rising through the oil while frying.
    if(!G.fryDone){
      ctx.fillStyle='rgba(255,235,180,.45)';
      for(var b=0;b<9;b++){
        var bph=(ts*0.0012+b*0.37)%1;
        var bx=FR_CX-120+((b*53)%240);
        var by=FR_CY+120-bph*150;
        ctx.beginPath(); ctx.arc(bx,by,3+2.5*Math.sin(b),0,Math.PI*2); ctx.fill();
      }
    }
    ctx.strokeStyle=C.outline; ctx.lineWidth=3; rr(FR_CX-150,FR_CY-60,300,200,16); ctx.stroke();
    ctx.restore();
    var tint = frac<FRY_GOOD[0] ? '#F2E2B4' : frac>FRY_GOOD[1] ? '#8A5A22' : '#E8B54B';
    // Basket + fries lift out of the oil once done.
    var lift=G.fryDone?Math.min(70,(ts-(G.fryStart+elapsed))*0.4+40):0;
    ctx.save(); ctx.translate(0,-lift);
    for(var i=0;i<8;i++){
      var fx=FR_CX-95+i*27, fy=FR_CY+30+((i%3)-1)*16;
      sFryStick(fx,fy,16,86,tint,(i-4)*0.09);
    }
    sFryBasket(FR_CX,FR_CY+30,240,130);
    ctx.restore();
    if(!G.fryDone&&frac>=FRY_GOOD[0]&&frac<=FRY_GOOD[1]){
      var pulse=0.25+0.15*Math.sin(ts*0.008);
      ctx.strokeStyle='rgba(240,165,0,'+pulse+')'; ctx.lineWidth=6;
      ctx.strokeRect(FR_CX-126,FR_CY-38,252,142);
    }
    fillRR(40,600,VW-80,20,10,'#2A1D14');
    var fx0=40+(VW-80)*FRY_GOOD[0], fx1=40+(VW-80)*FRY_GOOD[1];
    ctx.fillStyle='rgba(240,165,0,.35)'; ctx.fillRect(fx0,600,fx1-fx0,20);
    fillRR(40,600,(VW-80)*frac,20,10, frac<FRY_GOOD[0]?C.acc: frac<=FRY_GOOD[1]?C.gold:C.red);
    if(!G.fryDone){
      drawBtn(VW/2-100,636,200,50,'ยกตะกร้าขึ้น! 🍟',C.gold,ts);
    }else{
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('ทอดเสร็จ!',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('fry',G.scores.fry,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawFriesSalt(ts){
    drawBg(); drawStepBar(ts);
    ctx.font='15px Prompt'; ctx.fillStyle='rgba(255,255,255,.85)';
    T('เขย่าเกลือให้พอดี — อย่าเค็มเกิน!',VW/2,SH+28,'center');
    var punchT=G.saltPunch?(ts-G.saltPunch)/140:1;
    var tiltAng=punchT<1?Math.sin(punchT*Math.PI*3)*0.28:0;
    sFriesCarton(FR_CX,FR_CY+70,'#E8B54B',G.saltCount);
    // Salt shaker, tipping with each shake.
    ctx.save();
    ctx.translate(FR_CX+96,205); ctx.rotate(-0.5+tiltAng);
    fillRR(-17,-34,34,60,8,'#F2F2F2');
    ctx.strokeStyle=C.outline; ctx.lineWidth=2.5; rr(-17,-34,34,60,8); ctx.stroke();
    fillRR(-14,-44,28,14,5,'#9BA3AE');
    ctx.strokeStyle=C.outline; ctx.lineWidth=2.5; rr(-14,-44,28,14,5); ctx.stroke();
    ctx.fillStyle='#5A6270';
    [[-6,-40],[0,-38],[6,-40]].forEach(function(p){ ctx.beginPath(); ctx.arc(p[0],p[1],1.6,0,Math.PI*2); ctx.fill(); });
    ctx.restore();
    // "How salty" meter -- the sweet spot sits in the middle, and the bar
    // turns red past SALT_MAX so over-salting is visible before it's final.
    var sPct=Math.min(1,G.saltCount/SALT_MAX);
    var tgt0=(SALT_TARGET-3)/SALT_MAX, tgt1=(SALT_TARGET+3)/SALT_MAX;
    fillRR(40,600,VW-80,20,10,'#2A1D14');
    ctx.fillStyle='rgba(240,165,0,.35)'; ctx.fillRect(40+(VW-80)*tgt0,600,(VW-80)*(tgt1-tgt0),20);
    fillRR(40,600,(VW-80)*sPct,20,10, G.saltCount>SALT_TARGET+3?C.red: G.saltCount>=SALT_TARGET-3?C.gold:C.acc);
    ctx.font='bold 14px Prompt'; ctx.fillStyle=C.w;
    T('เขย่า '+G.saltCount+' ครั้ง',VW/2,592,'center');
    if(!G.saltDone){
      drawBtn(VW/2-155,636,140,50,'🧂 เขย่า',C.gold,ts);
      drawBtn(VW/2+15,636,140,50,'พอแล้ว! ✓',C.acc,ts);
    }else{
      ctx.fillStyle='rgba(0,0,0,.58)'; ctx.fillRect(0,0,VW,VH);
      ctx.font='bold 30px Prompt'; ctx.fillStyle=C.gold;
      T('โรยเกลือเสร็จ! 🧂',VW/2,320,'center');
      ctx.font='bold 22px Prompt'; ctx.fillStyle=C.w; T(scoreVal('salt',G.scores.salt,ts)+' คะแนน',VW/2,372,'center');
      drawBtn(VW/2-80,412,160,50,'ต่อไป →',C.acc,ts);
    }
  }
  function drawFriesFinal(ts){
    drawBg();
    if(!G.confetti){ spawnConfetti(); if(sc.sfxCongrats)sc.sfxCongrats.play(); }
    drawConfetti(ts);
    ctx.font='bold 24px Prompt'; ctx.fillStyle=C.gold;
    T('🎉 เฟรนช์ฟรายส์สำเร็จ! 🎉',VW/2,62,'center');
    sFriesCarton(VW/2,270,'#E8B54B',G.saltCount);
    fillRR(28,360,VW-56,152,16,C.ui);
    var rows=[['ปอกเปลือก','peel'],['หั่นแท่ง','slice'],['ทอด','fry'],['โรยเกลือ','salt']];
    rows.forEach(function(r,i){
      var ry=392+i*32;
      ctx.font='14px Prompt'; ctx.fillStyle='rgba(255,255,255,.72)'; T(r[0],48,ry,'left');
      ctx.fillStyle=C.gold; T(G.scores[r[1]]+' pts',VW-48,ry,'right');
    });
    ctx.fillStyle='rgba(255,255,255,.2)'; ctx.fillRect(28,524,VW-56,1);
    drawDishMedal(560,['peel','slice','fry','salt']);
    ctx.font='bold 20px Prompt'; ctx.fillStyle=C.w;
    T('คะแนนรวม: '+G.total+' คะแนน',VW/2,632,'center');
    drawBtn(FIN_BTN_X0,662,FIN_BTN_W,52,'🔄 เล่นอีกครั้ง',C.acc,ts);
    drawBtn(FIN_BTN_X1,662,FIN_BTN_W,52,'← ออก',C.gray,ts);
  }

  // A one-time celebration for the single "you finished the whole dish"
  // moment -- not used anywhere else, so it stays a treat rather than
  // wearing out its welcome the way over-using juice on every tap would.
  function spawnConfetti(){
    var palette=[C.acc,C.gold,C.grn,'#FF6B6B','#FFD166','#4ECDC4'];
    var arr=[];
    for(var i=0;i<24;i++){
      arr.push({
        x:20+Math.random()*(VW-40),
        phase:Math.random()*(VH+40),
        speed:55+Math.random()*45,
        size:5+Math.random()*4,
        color:palette[i%palette.length],
        rot:Math.random()*Math.PI*2,
        rotSpeed:(Math.random()-0.5)*3
      });
    }
    G.confetti=arr; G.confettiStart=sc.time.now;
  }
  function drawConfetti(ts){
    if(!G.confetti||!G.confetti.length)return;
    var elapsed=(ts-G.confettiStart)/1000;
    ctx.save();
    G.confetti.forEach(function(p){
      var y=((p.phase+elapsed*p.speed)%(VH+40))-40;
      var sway=Math.sin(elapsed*1.6+p.phase)*10;
      ctx.save();
      ctx.translate(p.x+sway,y);
      ctx.rotate(p.rot+elapsed*p.rotSpeed);
      ctx.fillStyle=p.color;
      ctx.fillRect(-p.size/2,-p.size*0.3,p.size,p.size*0.6);
      ctx.restore();
    });
    ctx.restore();
  }

  // Cooking-Mama-style medal for the whole finished dish, from the
  // average of its steps' scores -- shown once on each dish's final
  // screen alongside the existing per-step score breakdown/total.
  function dishGrade(avg){
    if(avg>=90) return {med:'🏆',txt:'สุดยอดเชฟตัวน้อย!',col:'#FFD166'};
    if(avg>=75) return {med:'🥇',txt:'เก่งมาก!',col:'#F0A500'};
    if(avg>=55) return {med:'🥈',txt:'ทำได้ดี!',col:'#C7CDD6'};
    return {med:'🥉',txt:'ลองอีกครั้งนะ!',col:'#CD7F32'};
  }
  function drawDishMedal(y,scoreKeys){
    var avg=scoreKeys.reduce(function(s,k){return s+(G.scores[k]||0);},0)/scoreKeys.length;
    var g=dishGrade(avg);
    ctx.font='54px sans-serif'; ctx.textBaseline='middle';
    T(g.med,VW/2,y,'center');
    ctx.font='bold 17px Prompt'; ctx.fillStyle=g.col; ctx.textBaseline='alphabetic';
    T(g.txt,VW/2,y+40,'center');
  }

  // Score count-up: call animateScore() the instant a score becomes
  // final, then read it back through scoreVal() wherever it's drawn --
  // counts up from 0 over 600ms instead of the number just appearing,
  // the same easeOutCubic curve as the screen pop-in transform above.
  function animateScore(key,toVal){
    G.scoreAnim[key]={from:0,to:toVal,startedAt:sc.time.now};
  }
  function scoreVal(key,finalVal,time){
    var a=G.scoreAnim[key];
    if(!a)return finalVal;
    var t=Math.min(1,(time-a.startedAt)/450);
    var e=1-Math.pow(1-t,3);
    return Math.round(a.from+(a.to-a.from)*e);
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
    var pct=(G.choppedCount||0)/CHOPS_NEEDED;
    G.scores[key]=Math.round(pct*100);
    G.total+=G.scores[key];
    animateScore(key,G.scores[key]);
    gradeScore(G.scores[key]);
    if(G.ing==='tom')G.tomFinalPct=pct; else G.cabFinalPct=pct;
  }
  function finishDough(){
    if(G.doughDone)return;
    G.doughDone=true;
    G.doughFinal=Math.max(PZ_R_MIN,Math.min(PZ_R_TORN,G.doughR));
    var score=Math.round(Math.max(10,100-Math.abs(G.doughR-PZ_R_TARGET)*0.8));
    G.scores.dough=score; G.total+=score; animateScore('dough',score); gradeScore(score);
  }
  function finishSauce(){
    if(G.sauceDone)return;
    G.sauceDone=true;
    var painted=G.sauceCells.filter(function(b){return b;}).length;
    var score=Math.round((painted/VEG_CELLS)*100);
    G.scores.sauce=score; G.total+=score; animateScore('sauce',score); gradeScore(score);
  }
  function finishCheese(){
    if(G.cheeseDone)return;
    G.cheeseDone=true;
    var pct=(G.cheeseCount||0)/CHEESE_TAPS_NEEDED;
    var score=Math.round(pct*100);
    G.scores.cheese=score; G.total+=score; animateScore('cheese',score); gradeScore(score);
    G.cheeseFinalPct=pct;
  }
  // Shared shape for both BAKE (pizza) and TOAST (breakfast): a value
  // rising 0..1 over a fixed duration, one tap locks it in, scored by
  // proximity to a "good zone" window -- kept as two separate small
  // functions per dish (not one generic helper) since each writes to a
  // different score key and duration/window constant.
  function finishBake(frac){
    if(G.bakeDone)return;
    G.bakeDone=true; G.bakeTapVal=frac;
    var mid=(BAKE_GOOD[0]+BAKE_GOOD[1])/2, half=(BAKE_GOOD[1]-BAKE_GOOD[0])/2;
    var score;
    if(frac>=BAKE_GOOD[0]&&frac<=BAKE_GOOD[1]) score=Math.round(100-Math.abs(frac-mid)/half*20);
    else { var distOut=frac<BAKE_GOOD[0]?BAKE_GOOD[0]-frac:frac-BAKE_GOOD[1]; score=Math.round(Math.max(10,80-distOut*220)); }
    G.scores.bake=score; G.total+=score; animateScore('bake',score); gradeScore(score);
  }
  function finishEgg(){
    if(G.eggDone)return;
    G.eggDone=true;
    var pct=Math.min(1,(G.eggCracks||0)/EGG_TAPS_NEEDED);
    var score=Math.round(pct*100);
    G.scores.egg=score; G.total+=score; animateScore('egg',score); gradeScore(score);
  }
  function finishToast(frac){
    if(G.toastDone)return;
    G.toastDone=true; G.toastTapVal=frac;
    var mid=(TOAST_GOOD[0]+TOAST_GOOD[1])/2, half=(TOAST_GOOD[1]-TOAST_GOOD[0])/2;
    var score;
    if(frac>=TOAST_GOOD[0]&&frac<=TOAST_GOOD[1]) score=Math.round(100-Math.abs(frac-mid)/half*20);
    else { var distOut=frac<TOAST_GOOD[0]?TOAST_GOOD[0]-frac:frac-TOAST_GOOD[1]; score=Math.round(Math.max(10,80-distOut*220)); }
    G.scores.toast=score; G.total+=score; animateScore('toast',score); gradeScore(score);
  }
  /* ── Pizza slicing ──────────────────────────────────────────
     A stroke is accepted when it crosses the pizza and is long enough
     to plausibly be a cut; it's then snapped to whichever unused guide
     angle it's closest to, and scored on how near the line passes to
     the center (an off-center cut leaves lopsided slices). ── */
  function commitPizzaCut(x0,y0,x1,y1){
    if(G.pzCutDone)return;
    var dx=x1-x0, dy=y1-y0, len=Math.hypot(dx,dy);
    if(len<90)return;                                  // too short to be a deliberate cut
    var strokeAng=Math.atan2(dy,dx);
    var used={}; G.pzCuts.forEach(function(c){ used[c.guide]=true; });
    // Pick the nearest unused guide, comparing undirected angles (a cut
    // drawn right-to-left is the same slice as left-to-right).
    var bestI=-1, bestD=Infinity;
    PZ_CUT_ANGLES.forEach(function(a,i){
      if(used[i])return;
      var d=Math.abs(((strokeAng-a+Math.PI/2)%Math.PI+Math.PI)%Math.PI-Math.PI/2);
      if(d<bestD){bestD=d;bestI=i;}
    });
    if(bestI<0)return;
    // Perpendicular distance from the pizza center to the stroke's line.
    var distC=Math.abs(dy*(PZ_CX-x0)-dx*(PZ_CY-y0))/len;
    if(distC>PZ_DISPLAY_R)return;                      // missed the pizza entirely
    var angPenalty=bestD*180/Math.PI;                  // degrees off the guide
    var sc2=Math.round(Math.max(10,100-distC*0.85-angPenalty*1.6));
    G.pzCuts.push({guide:bestI,ang:PZ_CUT_ANGLES[bestI],sc:sc2,off:0,at:sc.time.now});
    G.pzCutSc.push(sc2);
    if(sc.sfxLand)sc.sfxLand.play();
    if(G.pzCuts.length>=PZ_CUTS_NEEDED) finishPizzaCut();
  }
  function finishPizzaCut(){
    if(G.pzCutDone)return;
    G.pzCutDone=true;
    var avg=G.pzCutSc.reduce(function(s,v){return s+v;},0)/G.pzCutSc.length;
    var score=Math.round(avg);
    G.scores.pzcut=score; G.total+=score; animateScore('pzcut',score); gradeScore(score);
  }

  /* ── Burger scoring ─────────────────────────────────────────── */
  function finishPatty(){
    if(G.pattyDone)return;
    G.pattyDone=true;
    var pct=Math.min(1,(G.pattyCount||0)/PATTY_TAPS_NEEDED);
    var score=Math.round(pct*100);
    G.scores.patty=score; G.total+=score; animateScore('patty',score); gradeScore(score);
    G.pattyFinalPct=pct;
  }
  function finishGrill(frac){
    if(G.grillDone)return;
    G.grillDone=true; G.grillTapVal=frac;
    var mid=(GRILL_GOOD[0]+GRILL_GOOD[1])/2, half=(GRILL_GOOD[1]-GRILL_GOOD[0])/2;
    var score;
    if(frac>=GRILL_GOOD[0]&&frac<=GRILL_GOOD[1]) score=Math.round(100-Math.abs(frac-mid)/half*20);
    else { var d=frac<GRILL_GOOD[0]?GRILL_GOOD[0]-frac:frac-GRILL_GOOD[1]; score=Math.round(Math.max(10,80-d*220)); }
    G.scores.grill=score; G.total+=score; animateScore('grill',score); gradeScore(score);
  }
  function finishStack(){
    if(G.stackDone)return;
    G.stackDone=true; G.stackDropAt=sc.time.now;
    var acc=Math.max(0,1-Math.abs(G.stackX-VW/2)/(BG_TARGET_W/2));
    var score=Math.round(Math.max(10,acc*100));
    G.scores.stack=score; G.total+=score; animateScore('stack',score); gradeScore(score);
  }

  /* ── Fries scoring ──────────────────────────────────────────── */
  function finishPeel(){
    if(G.peelDone)return;
    G.peelDone=true;
    var pct=Math.min(1,(G.peelCount||0)/PEEL_TAPS_NEEDED);
    var score=Math.round(pct*100);
    G.scores.peel=score; G.total+=score; animateScore('peel',score); gradeScore(score);
    G.peelFinalPct=pct;
  }
  // Same snap-to-nearest-unused-guide shape as commitPizzaCut, but the
  // guides here are parallel vertical lines rather than radial ones.
  function commitFrySlice(x0,y0,x1,y1){
    if(G.frSliceDone)return;
    if(Math.abs(y1-y0)<90)return;                      // must be a real downward stroke
    var mx=(x0+x1)/2;
    var used={}; G.frSlices.forEach(function(s){ used[s.guide]=true; });
    var bestI=-1, bestD=Infinity;
    FR_SLICE_XS.forEach(function(dx,i){
      if(used[i])return;
      var d=Math.abs(mx-(FR_CX+dx));
      if(d<bestD){bestD=d;bestI=i;}
    });
    if(bestI<0)return;
    var tilt=Math.abs(x1-x0);                          // a straight cut stays vertical
    var sc2=Math.round(Math.max(10,100-bestD*3.2-tilt*0.9));
    G.frSlices.push({guide:bestI,x:FR_SLICE_XS[bestI],sc:sc2});
    G.frSliceSc.push(sc2);
    if(sc.sfxLand)sc.sfxLand.play();
    if(G.frSlices.length>=FR_SLICES_NEEDED) finishFrySlice();
  }
  function finishFrySlice(){
    if(G.frSliceDone)return;
    G.frSliceDone=true;
    var avg=G.frSliceSc.reduce(function(s,v){return s+v;},0)/G.frSliceSc.length;
    var score=Math.round(avg);
    G.scores.slice=score; G.total+=score; animateScore('slice',score); gradeScore(score);
  }
  function finishFry(frac){
    if(G.fryDone)return;
    G.fryDone=true; G.fryTapVal=frac;
    var mid=(FRY_GOOD[0]+FRY_GOOD[1])/2, half=(FRY_GOOD[1]-FRY_GOOD[0])/2;
    var score;
    if(frac>=FRY_GOOD[0]&&frac<=FRY_GOOD[1]) score=Math.round(100-Math.abs(frac-mid)/half*20);
    else { var d=frac<FRY_GOOD[0]?FRY_GOOD[0]-frac:frac-FRY_GOOD[1]; score=Math.round(Math.max(10,80-d*220)); }
    G.scores.fry=score; G.total+=score; animateScore('fry',score); gradeScore(score);
  }
  // The only step that can be overshot: score falls off on BOTH sides of
  // SALT_TARGET, so stopping is a real decision rather than "tap forever".
  function finishSalt(){
    if(G.saltDone)return;
    G.saltDone=true;
    var off=Math.abs((G.saltCount||0)-SALT_TARGET);
    var score=Math.round(Math.max(10,100-off*11));
    G.scores.salt=score; G.total+=score; animateScore('salt',score); gradeScore(score);
  }

  function initSt(s){
    if(s===S.TOM){G.ing='tom';G.taps=0;G.choppedCount=0;G.chopRun=false;G.chopDone=false;G.chopStart=0;G.kAnim=0;G.chopPunch=0;G.starPunch=0;G.lastStarN=0;}
    if(s===S.CAB){G.ing='cab';G.taps=0;G.choppedCount=0;G.chopRun=false;G.chopDone=false;G.chopStart=0;G.kAnim=0;G.chopPunch=0;G.starPunch=0;G.lastStarN=0;}
    if(s===S.SAU){G.kY=260;G.kDir=1;G.kSpd=2.8;G.cuts=0;G.cutSc=[];G.cutY=[];G.cutAt=[];G.scores.sau=0;}
    if(s===S.CMB){G.cList=['tom','cab','sau'];G.cIdx=0;G.sX=240;G.sDir=1;G.dropped=[];G.allDone=false;}
    if(s===SP.CUT){G.pzCuts=[];G.pzCutSc=[];G.pzDrag=null;G.pzCutDone=false;}
    if(s===SG.PATTY){G.pattyTaps=0;G.pattyCount=0;G.pattyRun=false;G.pattyDone=false;G.pattyStart=0;G.pattyPunch=0;}
    if(s===SG.GRILL){G.grillRun=false;G.grillStart=0;G.grillDone=false;G.grillVal=0;}
    if(s===SG.VEG){G.bgVegIdx=0;G.bgVegX=VW/2;G.bgVegDir=1;G.bgVegDropped=[];G.bgVegAllDone=false;}
    if(s===SG.STACK){G.stackX=VW/2-BG_SWEEP;G.stackDir=1;G.stackDone=false;}
    if(s===SF.PEEL){G.peelTaps=0;G.peelCount=0;G.peelRun=false;G.peelDone=false;G.peelStart=0;G.peelPunch=0;}
    if(s===SF.SLICE){G.frSlices=[];G.frSliceSc=[];G.frDrag=null;G.frSliceDone=false;}
    if(s===SF.FRY){G.fryRun=false;G.fryStart=0;G.fryDone=false;G.fryVal=0;}
    if(s===SF.SALT){G.saltCount=0;G.saltDone=false;G.saltPunch=0;}
  }
  function getWord(fromSt){
    var idx=DISHES[G.dish].stepIdx[fromSt];
    if(idx===undefined||!words||!words.length)return null;
    return words[idx%words.length];
  }
  function showPopup(fromSt,toSt){
    var w=getWord(fromSt);
    if(!w){initSt(toSt);setState(toSt);return;}
    setState(-1);
    callbacks.onPractice(w,null,function(){initSt(toSt);setState(toSt);});
  }

  /* ══ Phaser Scene ══════════════════════════════════════════ */
  var CookScene=new Phaser.Class({
    Extends:Phaser.Scene,
    initialize:function(){Phaser.Scene.call(this,{key:'cooking'});},

    preload:function(){
      this.load.audio('ck_chop', 'soundeffect/KifeChop.mp3');
      this.load.audio('ck_cut',  'soundeffect/TomatoCut.mp3');
      this.load.audio('ck_bread','soundeffect/SlicingToast.mp3');
      this.load.audio('ck_ok',       'soundeffect/CorrectSFX.mp3');
      this.load.audio('ck_click',    'soundeffect/Click.mp3');
      this.load.audio('ck_congrats', 'soundeffect/CongratSFX.mp3');
      this.load.audio('ck_land',     'soundeffect/FlipCard.mp3');
      this.load.image('ck_bg', 'img/cooking/bg.jpg');
    },

    create:function(){
      var self=this; sc=this;
      ctx=this.sys.game.canvas.getContext('2d');
      if(this.textures.exists('ck_bg')) bgImg=this.textures.get('ck_bg').getSourceImage();
      this.sfxChop =this.sound.add('ck_chop', {volume:0.7});
      this.sfxCut  =this.sound.add('ck_cut',  {volume:0.8});
      this.sfxBread=this.sound.add('ck_bread',{volume:0.7,loop:true});
      this.sfxOk       =this.sound.add('ck_ok',       {volume:0.7});
      this.sfxClick    =this.sound.add('ck_click',    {volume:0.5});
      this.sfxCongrats =this.sound.add('ck_congrats', {volume:0.8});
      this.sfxLand     =this.sound.add('ck_land',     {volume:0.55});
      resetG();
      this.input.on('pointerdown', function(ptr){
        // Each CookingGame.start() spins up a brand-new AudioContext, which
        // browsers start suspended. Phaser's own unlock only resolves it on
        // a later touch event, so the very first play() (bread drag-cut sfx)
        // was silently queued and only became audible once the context
        // resumed near the end of the gesture. Resume it synchronously here,
        // inside the genuine user-gesture handler, so playback starts on cue.
        if(self.sound.context && self.sound.context.state!=='running') self.sound.context.resume();
        self.onDown(ptr.x,ptr.y,self.time.now);
      });
      this.input.on('pointermove', function(ptr){if(ptr.isDown)self.onMove(ptr.x,ptr.y);});
      this.input.on('pointerup',   function(ptr){self.onUp(ptr.x,ptr.y);});
    },

    update:function(time){
      if(G.st<0)return;
      ctx.clearRect(0,0,VW,VH);

      // Every screen has a brief, subtle scale-settle over its first
      // ~120ms (see setState) -- purely a rendering transform around the
      // draw calls, so it never touches input hit-testing (which uses
      // the untransformed logical layout coordinates) and settles to a
      // no-op well before a player could react to it. No alpha fade --
      // an earlier version faded the whole screen from black on every
      // transition, which read as sluggish/flickery rather than snappy.
      var since=time-(G.stAt||0), pop=Math.min(1,since/120);
      var ease=1-Math.pow(1-pop,3);
      var scale=0.985+0.015*ease;
      ctx.save();
      ctx.translate(VW/2,VH/2); ctx.scale(scale,scale); ctx.translate(-VW/2,-VH/2);

      switch(G.st){
        case S.SEL:   drawSel();break;
        case S.BUN:   drawBunCut(time);break;
        case S.BUN_R: drawResult('bun',time);break;
        case S.TOM:   drawChop(time);break;
        case S.TOM_R: drawResult('tom',time);break;
        case S.CAB:   drawChop(time);break;
        case S.CAB_R: drawResult('cab',time);break;
        case S.SAU:   drawSau(time);break;
        case S.SAU_R: drawResult('sau',time);break;
        case S.CMB:   drawCmb(time);break;
        case S.CMB_R: drawResult('cmb',time);break;
        case S.FIN:   drawFinal(time);break;

        case SP.DOUGH:     drawPizzaDough(time);break;
        case SP.DOUGH_R:   drawResult('dough',time);break;
        case SP.SAUCE:     drawPizzaSauce(time);break;
        case SP.SAUCE_R:   drawResult('sauce',time);break;
        case SP.CHEESE:    drawPizzaCheese(time);break;
        case SP.CHEESE_R:  drawResult('cheese',time);break;
        case SP.TOPPING:   drawPizzaTopping(time);break;
        case SP.TOPPING_R: drawResult('topping',time);break;
        case SP.BAKE:      drawPizzaBake(time);break;
        case SP.BAKE_R:    drawResult('bake',time);break;
        case SP.CUT:       drawPizzaCut(time);break;
        case SP.CUT_R:     drawResult('pzcut',time);break;
        case SP.FIN:       drawPizzaFinal(time);break;

        case SB.EGG:      drawBreakfastEgg(time);break;
        case SB.EGG_R:    drawResult('egg',time);break;
        case SB.BACON:    drawBreakfastBacon(time);break;
        case SB.BACON_R:  drawResult('bacon',time);break;
        case SB.TOAST:    drawBreakfastToast(time);break;
        case SB.TOAST_R:  drawResult('toast',time);break;
        case SB.PLATE:    drawBreakfastPlate(time);break;
        case SB.PLATE_R:  drawResult('plate',time);break;
        case SB.FIN:      drawBreakfastFinal(time);break;

        case SG.PATTY:    drawBurgerPatty(time);break;
        case SG.PATTY_R:  drawResult('patty',time);break;
        case SG.GRILL:    drawBurgerGrill(time);break;
        case SG.GRILL_R:  drawResult('grill',time);break;
        case SG.VEG:      drawBurgerVeg(time);break;
        case SG.VEG_R:    drawResult('bgveg',time);break;
        case SG.STACK:    drawBurgerStack(time);break;
        case SG.STACK_R:  drawResult('stack',time);break;
        case SG.FIN:      drawBurgerFinal(time);break;

        case SF.PEEL:     drawFriesPeel(time);break;
        case SF.PEEL_R:   drawResult('peel',time);break;
        case SF.SLICE:    drawFriesSlice(time);break;
        case SF.SLICE_R:  drawResult('slice',time);break;
        case SF.FRY:      drawFriesFry(time);break;
        case SF.FRY_R:    drawResult('fry',time);break;
        case SF.SALT:     drawFriesSalt(time);break;
        case SF.SALT_R:   drawResult('salt',time);break;
        case SF.FIN:      drawFriesFinal(time);break;
      }

      ctx.restore();
      drawTapFx(time); // drawn after restore so the ripple sits at the exact tap position, unaffected by the pop-in scale
      drawBigFx(time);
    },

    onDown:function(x,y,now){
      if(G.st===S.SEL){
        for(var fi=0;fi<SEL_FOODS.length;fi++){
          var f=SEL_FOODS[fi], r=selCardRect(fi);
          if(hit(x,y,r.x,r.y,r.w,r.h)){
            if(f.ok){pressFx(x,y);G.dish=f.dish;setState(DISHES[f.dish].first);}
            return;
          }
        }
        return;
      }
      if(G.st===S.BUN){
        if(!G.split){G.cutting=true;G.pts=[{x:x,y:y}];this.sfxBread.play(undefined,{seek:1});}
        else if(hit(x,y,VW/2-85,BUN_BBY+98,170,52)){pressFx(x,y);setState(S.BUN_R);}
        return;
      }
      if(G.st===S.BUN_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(S.BUN_R,S.TOM);}return;}
      if(G.st===S.TOM||G.st===S.CAB){
        if(G.chopDone){if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(G.ing==='tom'?S.TOM_R:S.CAB_R);}return;}
        var dx=x-ICX,dy=y-ICY;
        if(dx*dx+dy*dy<(IR+22)*(IR+22)){
          if(!G.chopRun){G.chopRun=true;G.chopStart=now;}
          G.taps++;
          if(G.choppedCount<CHOPS_NEEDED)G.choppedCount++;
          G.kAnim=1;G.kAnimStart=now;
          G.chopPunch=now;
          var newStarN=Math.min(3,Math.ceil((G.choppedCount/CHOPS_NEEDED)*3));
          if(newStarN>G.lastStarN){G.starPunch=now;G.lastStarN=newStarN;}
          this.sfxChop.play();
          sc.time.delayedCall((this.sfxChop.duration||0.15)*1000,function(){sc.sfxCut.play();});
          if(G.choppedCount>=CHOPS_NEEDED&&!G.chopDone)finishChop();
        }
        return;
      }
      if(G.st===S.TOM_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(S.TOM_R,S.CAB);}return;}
      if(G.st===S.CAB_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(S.CAB_R,S.SAU);}return;}
      if(G.st===S.SAU){
        if(G.cuts>=2){if(hit(x,y,VW/2-80,402,160,50)){pressFx(x,y);setState(S.SAU_R);}return;}
        var cs=Math.round(Math.max(10,100-Math.abs(G.kY-CUT_TY[G.cuts])*2));
        G.cutSc.push(cs);G.cutY.push(G.kY);G.cutAt.push(now);G.cuts++;
        if(sc.sfxLand)sc.sfxLand.play();
        if(G.cuts>=2){G.scores.sau=Math.round((G.cutSc[0]+G.cutSc[1])/2);G.total+=G.scores.sau;animateScore('sau',G.scores.sau);gradeScore(G.scores.sau);}
        return;
      }
      if(G.st===S.SAU_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(S.SAU_R,S.CMB);}return;}
      if(G.st===S.CMB){
        if(G.cIdx<G.cList.length){
          var acc=Math.max(0,1-Math.abs(G.sX-VW/2)/(CTW/2));
          var toY=CMB_BBY-22-G.dropped.length*20;
          G.dropped.push({ing:G.cList[G.cIdx],x:G.sX,acc:acc,dropStart:now,fromY:225,toY:toY});
          G.cIdx++;
          if(sc.sfxLand)sc.sfxLand.play();
        }
        return;
      }
      if(G.st===S.CMB_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(S.CMB_R,S.FIN);}return;}
      if(G.st===S.FIN){
        // no pressFx on either button -- resetG()/onFinish() both tear
        // this screen down immediately, so a ripple would never get a
        // frame to render before it's gone.
        if(hit(x,y,FIN_BTN_X0,690,FIN_BTN_W,52)){
          callbacks.onPoints&&callbacks.onPoints(G.total);
          resetG();
          return;
        }
        if(hit(x,y,FIN_BTN_X1,690,FIN_BTN_W,52)){
          // Bank this dish's points into the shared running total before
          // leaving -- same as the retry path -- so the shared finish
          // screen's total/leaderboard save isn't missing the dish that
          // was just completed.
          callbacks.onPoints&&callbacks.onPoints(G.total);
          callbacks.onFinish&&callbacks.onFinish();
        }
        return;
      }

      // ── Pizza ──
      if(G.st===SP.DOUGH){
        if(!G.doughDone){ G.doughDragging=true; G.doughR=Math.hypot(x-PZ_CX,y-PZ_CY); }
        else if(hit(x,y,VW/2-85,PZ_CY+G.doughFinal+78,170,52)){pressFx(x,y);setState(SP.DOUGH_R);}
        return;
      }
      if(G.st===SP.DOUGH_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SP.DOUGH_R,SP.SAUCE);}return;}
      if(G.st===SP.SAUCE){
        if(G.sauceDone){if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SP.SAUCE_R);}return;}
        if(!G.sauceRun){G.sauceRun=true;G.sauceStart=now;}
        paintSauceAt(x,y);
        return;
      }
      if(G.st===SP.SAUCE_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SP.SAUCE_R,SP.CHEESE);}return;}
      if(G.st===SP.CHEESE){
        if(G.cheeseDone){if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SP.CHEESE_R);}return;}
        var cdx=x-PZ_CX,cdy=y-PZ_CY;
        if(cdx*cdx+cdy*cdy<(PZ_DISPLAY_R+22)*(PZ_DISPLAY_R+22)){
          if(!G.cheeseRun){G.cheeseRun=true;G.cheeseStart=now;}
          G.cheeseTaps++;
          if(G.cheeseCount<CHEESE_TAPS_NEEDED)G.cheeseCount++;
          G.cheesePunch=now;
          this.sfxChop.play();
          if(G.cheeseCount>=CHEESE_TAPS_NEEDED&&!G.cheeseDone)finishCheese();
        }
        return;
      }
      if(G.st===SP.CHEESE_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SP.CHEESE_R,SP.TOPPING);}return;}
      if(G.st===SP.TOPPING){
        if(G.toppingAllDone){if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SP.TOPPING_R);}return;}
        if(G.toppingIdx<TOPPING_LIST.length){
          var tAcc=Math.max(0,1-Math.abs(G.toppingX-VW/2)/(VW/2-45));
          G.toppingDropped.push({kind:TOPPING_LIST[G.toppingIdx],acc:tAcc,droppedAt:now});
          G.toppingIdx++;
          if(sc.sfxLand)sc.sfxLand.play();
        }
        return;
      }
      if(G.st===SP.TOPPING_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SP.TOPPING_R,SP.BAKE);}return;}
      if(G.st===SP.BAKE){
        if(!G.bakeDone){
          if(hit(x,y,VW/2-100,606,200,50)){pressFx(x,y);finishBake(G.bakeVal);}
          return;
        }
        if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SP.BAKE_R);}
        return;
      }
      if(G.st===SP.BAKE_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SP.BAKE_R,SP.CUT);}return;}
      if(G.st===SP.CUT){
        if(G.pzCutDone){if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SP.CUT_R);}return;}
        G.pzDrag={x:x,y:y,cx:x,cy:y};
        if(this.sfxBread)this.sfxBread.play(undefined,{seek:1});
        return;
      }
      if(G.st===SP.CUT_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SP.CUT_R,SP.FIN);}return;}
      if(G.st===SP.FIN){
        if(hit(x,y,FIN_BTN_X0,740,FIN_BTN_W,52)){callbacks.onPoints&&callbacks.onPoints(G.total);resetG();return;}
        if(hit(x,y,FIN_BTN_X1,740,FIN_BTN_W,52)){callbacks.onPoints&&callbacks.onPoints(G.total);callbacks.onFinish&&callbacks.onFinish();}
        return;
      }

      // ── Breakfast ──
      if(G.st===SB.EGG){
        if(G.eggDone){if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SB.EGG_R);}return;}
        var edx=x-EGG_CX,edy=y-EGG_CY;
        if(edx*edx+edy*edy<(EGG_R+22)*(EGG_R+22)){
          if(!G.eggRun){G.eggRun=true;G.eggStart=now;}
          G.eggTaps++;
          if(G.eggCracks<EGG_TAPS_NEEDED)G.eggCracks++;
          G.eggPunch=now;
          this.sfxChop.play();
          if(G.eggCracks>=EGG_TAPS_NEEDED&&!G.eggDone)finishEgg();
        }
        return;
      }
      if(G.st===SB.EGG_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SB.EGG_R,SB.BACON);}return;}
      if(G.st===SB.BACON){
        if(G.baconCuts>=2){if(hit(x,y,VW/2-80,402,160,50)){pressFx(x,y);setState(SB.BACON_R);}return;}
        var bcs=Math.round(Math.max(10,100-Math.abs(G.baconY-BC_CUT_TY[G.baconCuts])*2));
        G.baconSc.push(bcs);G.baconCutY.push(G.baconY);G.baconAt.push(now);G.baconCuts++;
        if(sc.sfxLand)sc.sfxLand.play();
        if(G.baconCuts>=2){G.scores.bacon=Math.round((G.baconSc[0]+G.baconSc[1])/2);G.total+=G.scores.bacon;animateScore('bacon',G.scores.bacon);gradeScore(G.scores.bacon);}
        return;
      }
      if(G.st===SB.BACON_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SB.BACON_R,SB.TOAST);}return;}
      if(G.st===SB.TOAST){
        if(!G.toastDone){
          if(hit(x,y,VW/2-90,510,180,50)){pressFx(x,y);finishToast(G.toastVal);}
          return;
        }
        if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SB.TOAST_R);}
        return;
      }
      if(G.st===SB.TOAST_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SB.TOAST_R,SB.PLATE);}return;}
      if(G.st===SB.PLATE){
        if(G.plateIdx<PLATE_LIST.length){
          var pAcc=Math.max(0,1-Math.abs(G.plateX-VW/2)/(VW/2-45));
          G.plateDropped.push({ing:PLATE_LIST[G.plateIdx],acc:pAcc});
          G.plateIdx++;
          if(sc.sfxLand)sc.sfxLand.play();
        }
        return;
      }
      if(G.st===SB.PLATE_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SB.PLATE_R,SB.FIN);}return;}
      if(G.st===SB.FIN){
        if(hit(x,y,FIN_BTN_X0,660,FIN_BTN_W,52)){callbacks.onPoints&&callbacks.onPoints(G.total);resetG();return;}
        if(hit(x,y,FIN_BTN_X1,660,FIN_BTN_W,52)){callbacks.onPoints&&callbacks.onPoints(G.total);callbacks.onFinish&&callbacks.onFinish();}
        return;
      }

      // ── Burger ──
      if(G.st===SG.PATTY){
        if(G.pattyDone){if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SG.PATTY_R);}return;}
        var pdx=x-BG_CX,pdy=y-BG_CY;
        if(Math.abs(pdx)<PATTY_R1+30&&Math.abs(pdy)<80){
          if(!G.pattyRun){G.pattyRun=true;G.pattyStart=now;}
          G.pattyTaps++;
          if(G.pattyCount<PATTY_TAPS_NEEDED)G.pattyCount++;
          G.pattyPunch=now;
          this.sfxChop.play();
          if(G.pattyCount>=PATTY_TAPS_NEEDED&&!G.pattyDone)finishPatty();
        }
        return;
      }
      if(G.st===SG.PATTY_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SG.PATTY_R,SG.GRILL);}return;}
      if(G.st===SG.GRILL){
        if(!G.grillDone){
          if(hit(x,y,VW/2-100,586,200,50)){pressFx(x,y);finishGrill(G.grillVal);}
          return;
        }
        if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SG.GRILL_R);}
        return;
      }
      if(G.st===SG.GRILL_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SG.GRILL_R,SG.VEG);}return;}
      if(G.st===SG.VEG){
        if(G.bgVegIdx<BG_VEG_LIST.length){
          var vAcc=Math.max(0,1-Math.abs(G.bgVegX-VW/2)/(CTW/2));
          G.bgVegDropped.push({ing:BG_VEG_LIST[G.bgVegIdx],acc:vAcc,off:G.bgVegX-VW/2,dropStart:now,fromY:250});
          G.bgVegIdx++;
          if(sc.sfxLand)sc.sfxLand.play();
        }
        return;
      }
      if(G.st===SG.VEG_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SG.VEG_R,SG.STACK);}return;}
      if(G.st===SG.STACK){
        if(!G.stackDone){ finishStack(); return; }
        if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SG.STACK_R);}
        return;
      }
      if(G.st===SG.STACK_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SG.STACK_R,SG.FIN);}return;}
      if(G.st===SG.FIN){
        if(hit(x,y,FIN_BTN_X0,662,FIN_BTN_W,52)){callbacks.onPoints&&callbacks.onPoints(G.total);resetG();return;}
        if(hit(x,y,FIN_BTN_X1,662,FIN_BTN_W,52)){callbacks.onPoints&&callbacks.onPoints(G.total);callbacks.onFinish&&callbacks.onFinish();}
        return;
      }

      // ── Fries ──
      if(G.st===SF.PEEL){
        if(G.peelDone){if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SF.PEEL_R);}return;}
        var qdx=(x-FR_CX)/POTATO_RX, qdy=(y-FR_CY)/POTATO_RY;
        if(qdx*qdx+qdy*qdy<1.4){
          if(!G.peelRun){G.peelRun=true;G.peelStart=now;}
          G.peelTaps++;
          if(G.peelCount<PEEL_TAPS_NEEDED)G.peelCount++;
          G.peelPunch=now;
          this.sfxCut.play();
          if(G.peelCount>=PEEL_TAPS_NEEDED&&!G.peelDone)finishPeel();
        }
        return;
      }
      if(G.st===SF.PEEL_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SF.PEEL_R,SF.SLICE);}return;}
      if(G.st===SF.SLICE){
        if(G.frSliceDone){if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SF.SLICE_R);}return;}
        G.frDrag={x:x,y:y,cx:x,cy:y};
        if(this.sfxBread)this.sfxBread.play(undefined,{seek:1});
        return;
      }
      if(G.st===SF.SLICE_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SF.SLICE_R,SF.FRY);}return;}
      if(G.st===SF.FRY){
        if(!G.fryDone){
          if(hit(x,y,VW/2-100,636,200,50)){pressFx(x,y);finishFry(G.fryVal);}
          return;
        }
        if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SF.FRY_R);}
        return;
      }
      if(G.st===SF.FRY_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SF.FRY_R,SF.SALT);}return;}
      if(G.st===SF.SALT){
        if(!G.saltDone){
          if(hit(x,y,VW/2-155,636,140,50)){
            pressFx(x,y);
            G.saltCount++; G.saltPunch=now;
            this.sfxChop.play();
            // Hard cap: past SALT_MAX the fries are ruined, so the step
            // ends itself rather than letting the score keep sinking.
            if(G.saltCount>=SALT_MAX) finishSalt();
            return;
          }
          if(hit(x,y,VW/2+15,636,140,50)){pressFx(x,y);finishSalt();}
          return;
        }
        if(hit(x,y,VW/2-80,412,160,50)){pressFx(x,y);setState(SF.SALT_R);}
        return;
      }
      if(G.st===SF.SALT_R){if(hit(x,y,VW/2-100,SH+258,200,54)){pressFx(x,y);showPopup(SF.SALT_R,SF.FIN);}return;}
      if(G.st===SF.FIN){
        if(hit(x,y,FIN_BTN_X0,662,FIN_BTN_W,52)){callbacks.onPoints&&callbacks.onPoints(G.total);resetG();return;}
        if(hit(x,y,FIN_BTN_X1,662,FIN_BTN_W,52)){callbacks.onPoints&&callbacks.onPoints(G.total);callbacks.onFinish&&callbacks.onFinish();}
        return;
      }
    },

    onMove:function(x,y){
      if(G.st===S.BUN&&G.cutting)G.pts.push({x:x,y:y});
      if(G.st===SP.DOUGH&&G.doughDragging)G.doughR=Math.hypot(x-PZ_CX,y-PZ_CY);
      if(G.st===SP.SAUCE&&G.sauceRun&&!G.sauceDone)paintSauceAt(x,y);
      if(G.st===SP.CUT&&G.pzDrag){G.pzDrag.cx=x;G.pzDrag.cy=y;}
      if(G.st===SF.SLICE&&G.frDrag){G.frDrag.cx=x;G.frDrag.cy=y;}
    },

    onUp:function(x,y){
      if(G.st===SP.CUT&&G.pzDrag){
        var d=G.pzDrag; G.pzDrag=null;
        if(this.sfxBread)this.sfxBread.stop();
        commitPizzaCut(d.x,d.y,x,y);
        return;
      }
      if(G.st===SF.SLICE&&G.frDrag){
        var fd=G.frDrag; G.frDrag=null;
        if(this.sfxBread)this.sfxBread.stop();
        commitFrySlice(fd.x,fd.y,x,y);
        return;
      }
      if(G.st===SP.DOUGH&&G.doughDragging){G.doughDragging=false;finishDough();return;}
      if(!(G.st===S.BUN&&G.cutting))return;
      this.sfxBread.stop();
      var raw=G.pts.slice(); G.cutting=false;
      if(raw.length<4){G.pts=[];return;}
      // Cut runs left-to-right (was top-to-bottom) -- a hot dog bun opens
      // along its length into a top half and bottom half, not a left
      // half and right half.
      if(raw[0].x>raw[raw.length-1].x)raw.reverse();
      if(raw[raw.length-1].x-raw[0].x<BW*0.5){G.pts=[];return;}
      var clip=[],entryDone=false,exitDone=false;
      for(var ci=0;ci<raw.length&&!exitDone;ci++){
        var cp=raw[ci],pp=ci>0?raw[ci-1]:null;
        if(!entryDone){
          if(cp.x>=BLX){
            if(pp&&pp.x<BLX){var et=(BLX-pp.x)/(cp.x-pp.x);clip.push({y:pp.y+et*(cp.y-pp.y),x:BLX});}
            else clip.push({y:cp.y,x:BLX});
            entryDone=true;
          }
        }
        if(entryDone&&cp.x>=BLX&&cp.x<=BRX)
          clip.push({y:Math.max(BTY,Math.min(BUN_BBY,cp.y)),x:cp.x});
        if(entryDone&&!exitDone&&pp&&pp.x<=BRX&&cp.x>BRX){
          var yt=(BRX-pp.x)/(cp.x-pp.x);
          clip.push({y:Math.max(BTY,Math.min(BUN_BBY,pp.y+yt*(cp.y-pp.y))),x:BRX});
          exitDone=true;
        }
      }
      if(!exitDone&&clip.length>0)clip.push({y:Math.max(BTY,Math.min(BUN_BBY,raw[raw.length-1].y)),x:BRX});
      if(clip.length<2){G.pts=[];return;}
      clip[0].x=BLX; clip[clip.length-1].x=BRX;
      // topPiece: top edge + the cut line (bounded above by the top of
      // the bun, below by wherever the player cut). botPiece: mirror,
      // bounded below by the bottom edge.
      G.topPiece=[{x:BLX,y:BTY}].concat(clip).concat([{x:BRX,y:BTY}]);
      G.botPiece=[{x:BLX,y:BUN_BBY},{x:BRX,y:BUN_BBY}].concat(clip.slice().reverse());
      var fromHoriz=Math.abs(bestFit(clip));
      G.scores.bun=Math.round(Math.max(0,100-fromHoriz*2.2));
      G.total+=G.scores.bun; G.split=true;
      animateScore('bun',G.scores.bun);
      gradeScore(G.scores.bun);
    }
  });

  return new Phaser.Game({
    type:   Phaser.CANVAS,
    parent: 'cookingGame',
    width:  VW, height: VH,
    render: {clearBeforeRender:false},
    backgroundColor: '#2B1B10',
    scale:  {mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH, autoRound:true},
    scene:  CookScene,
  });
}

/* ── Public API (mirrors ShootingGame, AirplaneGame, etc.) ── */
var CookingGame=(function(){
  var game=null;
  return{
    start:function(words,cbs){
      if(game){try{game.destroy(true);}catch(e){}game=null;}
      function boot(){ setTimeout(function(){game=createCookingGame(words,cbs);},60); }
      // Safari can get stuck rendering canvas text with a fallback font's
      // metrics if the web font ('Prompt') hasn't finished loading before
      // the first fillText() call — later frames re-set ctx.font but the
      // glyphs never re-measure. Wait for it so the tightly-sized step-bar
      // boxes get the real Prompt widths from the very first draw.
      if(document.fonts&&document.fonts.ready) document.fonts.ready.then(boot,boot);
      else boot();
    },
    stop:function(){
      if(game){try{game.destroy(true);}catch(e){}game=null;}
    }
  };
}());
