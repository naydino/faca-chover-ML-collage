// ---------- STATE ----------
let classifier, off; // ml5 + offscreen 224x224 canvas
let label = "…", confidence = 0, lastSource = "";
let isFrozen = false, showHUD = false; // HUD hidden by default

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);


let cutouts = [], cutoutNames = [];
let pieces = [], wordStickers = [], recentLabels = [];
const MAX_RECENT = 10;

let nextClassifyAt = 0;
const classifyEveryMs = 2200;

let nextStickerAt = 0;             // cooldown timer
const STICKER_COOLDOWN_MS = 2200;  // spawn at most ~1 per 2.2s
const STICKER_CONF_MIN   = 0.45;   // only when the model is fairly sure
let lastStickerText = "";          // avoid immediate duplicates


let grainG; // paper grain



// ---------- HELPERS ----------
function catFromLabel(lbl){
  lbl = (lbl || "").toLowerCase();
  if (lbl.includes("book") || lbl.includes("library") || lbl.includes("notebook")) return "text";
  if (lbl.includes("person") || lbl.includes("gown") || lbl.includes("jean") || lbl.includes("suit")) return "human";
  if (lbl.includes("lizard") || lbl.includes("cat") || lbl.includes("dog") || lbl.includes("animal")) return "creature";
  return "other";
}
function addCutout(path){ cutouts.push(loadImage(path)); cutoutNames.push(path); }

// ---------- ASSETS ----------
function preload(){
  // add/remove your PNGs here (transparent PNGs look best)
  addCutout("cutout1.png");
  addCutout("cutout2.png");
  addCutout("cutout3.png");
  addCutout("todas_as_cores.png");
  addCutout("se-eu-tivesse-mais-tempo.png");
}

// ---------- SETUP ----------
function setup(){
  pixelDensity(1);        // ↓ retina cost
  frameRate(45);          // optional cap
  createCanvas(windowWidth, windowHeight);
  background(245);

  // offscreen canvas for classification
  off = createGraphics(224, 224);

  // MobileNet classifier (no webcam)
  classifier = ml5.imageClassifier("MobileNet", () => {
    console.log("MobileNet ready (no webcam)");
    nextClassifyAt = millis();
  });

  textFont("sans-serif"); textSize(14); noStroke();

  // UI buttons + picker (works on mobile, avoids key-focus issues)
  const freezeBtn = document.getElementById("freezeBtn");
  const saveBtn   = document.getElementById("saveBtn");
  const pickerEl  = document.getElementById("picker");

  freezeBtn.onclick = () => { isFrozen = !isFrozen; freezeBtn.textContent = isFrozen ? "Unfreeze" : "Freeze"; };
  saveBtn.onclick = () => saveCanvas("ml-collage","png");
  pickerEl.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => loadImage(reader.result, (img) => {
    // ↓ downscale once so we keep memory + speed friendly
    const MAX_SIDE = 900;                // tweak to taste
    if (img.width > img.height && img.width > MAX_SIDE)  img.resize(MAX_SIDE, 0);
    if (img.height >= img.width && img.height > MAX_SIDE) img.resize(0, MAX_SIDE);

    cutouts.push(img);
    cutoutNames.push(file.name || "uploaded");

    // small feedback burst
    for (let i=0; i<4; i++) dropPiece(img, "other", 0.5);
  });
  reader.readAsDataURL(file);
};
// seed a few pieces so mobile sees something immediately
for (let i = 0; i < min(12, cutouts.length * 3); i++) {
  const idx = floor(random(cutouts.length));
  dropPiece(cutouts[idx], "other", 0.5);
}

  // tiny paper grain
  grainG = createGraphics(128,128);
  grainG.loadPixels();
  for (let i=0; i<grainG.width*grainG.height*4; i+=4){
    const n = 200 + floor(random(-30,30));
    grainG.pixels[i]=n; grainG.pixels[i+1]=n; grainG.pixels[i+2]=n; grainG.pixels[i+3]=255;
  }
  grainG.updatePixels();
}

// ---------- DRAW ----------
function draw(){
  background(245);

  // schedule ML classifications (stops when frozen)
  if (!isFrozen && classifier && millis() >= nextClassifyAt){
    nextClassifyAt = millis() + classifyEveryMs;
    const idx = floor(random(cutouts.length));
    classifyCutout(idx);
  }

  // update + draw collage pieces (freeze stops motion)
  drawPieces(!isFrozen);

  // draw floating label stickers
  drawStickers(!isFrozen);

  // HUD (you can hide with 'H')
  if (showHUD){
    drawHUD();
  }
// keep things lighter on iOS Safari (alpha+rotation can be expensive)
if (isIOS) {
  if (pieces.length > 120) pieces.splice(0, pieces.length - 120);
}

  // paper grain overlay
if (!isIOS) {
  push();
  blendMode(MULTIPLY); tint(255, 22);
  for (let y=0; y<height; y+=grainG.height)
    for (let x=0; x<width; x+=grainG.width) image(grainG, x, y);
  pop();
}
}

// ---------- DRAW HELPERS ----------
function drawPieces(animate){
  for (let p of pieces){
    if (animate){
      p.a += p.spin; p.x += p.dx;

      if (p.mode === "fall"){
        p.y += p.dy;
        p.dy = min(p.dy + p.g, 0.75); // capped gravity
      } else {
        p.y += 0.10 + 0.25 * sin(0.02*frameCount + p.phase); // slight down + bob
        p.x += 0.35 * cos(0.015*frameCount + p.phase);
      }
      if (p.y < 30) p.y += 0.15; // nudge into view

      // gentle wrap
      if (p.x < -140) p.x = width + 140;
      if (p.x > width + 140) p.x = -140;
      if (p.y > height + 180) p.y = -80;
    }

    push();
    translate(p.x, p.y); rotate(p.a);
    imageMode(CENTER);
    tint(p.tintC[0], p.tintC[1], p.tintC[2], p.alpha);
    image(p.img, 0, 0, p.w, p.h);
    noTint();
    pop();
  }
}

function drawStickers(animate){
  for (let w of wordStickers){
    if (animate){
      w.x += w.dx; w.y += w.dy;
      w.alpha = max(0, w.alpha - 0.25);
    }
    push();
    translate(w.x, w.y); rotate(w.a);
    fill(20, w.alpha + 40); rect(-w.w/2-6, -16, w.w+12, 26, 4);
    fill(255, w.alpha); textAlign(CENTER, CENTER); text(w.text, 0, -3);
    pop();
  }
  if (animate) wordStickers = wordStickers.filter(w => w.alpha > 2);
}

function drawHUD(){
  fill(25, 200); rect(10, 10, 460, 90, 8);
  fill(255);
  text("label: " + (label || "—"), 20, 35);
  text("confidence: " + nf(confidence || 0,1,2), 20, 55);
  text("source: " + (lastSource || "—"), 20, 75);

  // machine poem panel (recent labels)
  push();
  textAlign(RIGHT, TOP);
  fill(20, 200);
  rect(width-260, 10, 250, 26 + 18*recentLabels.length, 8);
  fill(255); text("machine poem", width-20, 14);
  for (let i=0; i<recentLabels.length; i++){
    text(recentLabels[i], width-20, 36 + i*18);
  }
  pop();
}

// ---------- LOGIC ----------
function dropPiece(img, lbl, conf){
  const cat = catFromLabel(lbl);
  const c   = constrain(conf || 0, 0, 1);

  // varied sizes that still read
  let size   = random(0.12, 0.38) * min(width, height) * map(c, 0, 1, 0.9, 1.25);
  let spin   = map(c, 0, 1, 0.002, 0.015) * (random()<0.5?-1:1);
  let driftX = random(-0.55, 0.55);
  let driftY = random(0.2, 0.6);

  // category styling (tint + motion flavor)
  let alpha  = map(c, 0, 1, 130, 255);
  let tintC  = [255,255,255];
  if (cat === "text")     { size *= map(c,0,1,1.05,1.6); driftX *= 0.4;          tintC=[255,240,210]; }
  if (cat === "human")    { spin *= map(c,0,1,1.2,1.8);                           tintC=[255,230,240]; }
  if (cat === "creature") { size *= map(c,0,1,0.7,1.0);  driftX = random(-1.1,1.1); tintC=[230,240,255]; }

  const mode = (c < 0.35) ? "float" : "fall";

  pieces.push({
    img, mode,
    x: random(width),                          // spawn across canvas
    y: random(-100, height*0.6),               // some in-view, some above
    dx: driftX, dy: driftY, g: random(0.0008, 0.0022),
    a: random(TWO_PI), spin,
    w: size, h: size * (img.height / img.width),
    alpha, phase: random(TWO_PI),
    tintC
  });

  if (pieces.length > 200) pieces.splice(0, pieces.length - 200);
}

async function classifyCutout(idx){
  const img = cutouts[idx];

  // draw cutout into 224x224 offscreen canvas (cover)
  off.clear();
  off.push();
  off.imageMode(CENTER);
  off.translate(off.width/2, off.height/2);
  const s = max(off.width / img.width, off.height / img.height);
  off.image(img, 0, 0, img.width*s, img.height*s);
  off.pop();

  try {
    // IMPORTANT: use off.canvas and await the result
    const results = await classifier.classify(off.canvas);
    if (!results || !results[0]) return;

    label = results[0].label;
    confidence = results[0].confidence || 0;
    lastSource = cutoutNames[idx] || `cutout ${idx}`;

    // poem log
    if (!recentLabels.length || recentLabels[recentLabels.length-1] !== label){
      recentLabels.push(label);
      if (recentLabels.length > MAX_RECENT) recentLabels.shift();
    }

    // spawn a sticker only if confident, not too often, and not a duplicate
const t = label.split(",")[0]; // first phrase
if (confidence >= STICKER_CONF_MIN &&
    millis() >= nextStickerAt &&
    t !== lastStickerText) {

  const tw = textWidth(t);
  wordStickers.push({
    text: t, w: tw,
    x: random(120, width-120),
    y: 70,
    dx: random(-0.15, 0.15),
    dy: random(0.45, 0.75),        // gentle drift
    a: random(-0.05, 0.05),
    alpha: map(confidence, 0, 1, 140, 220)
  });

  nextStickerAt = millis() + STICKER_COOLDOWN_MS;
  lastStickerText = t;

  // keep list tidy (max 24 on screen)
  if (wordStickers.length > 24) wordStickers.splice(0, wordStickers.length - 24);
}

  } catch (e) {
    console.error(e);
  }
}


// ---------- INPUT ----------
function mousePressed(){
  if (isFrozen) return;
  for (let i=0; i<6; i++){
    const idx = floor(random(cutouts.length));
    dropPiece(cutouts[idx], label, confidence);
  }
}

function touchStarted() {
  // mimic a click on touch devices
  if (!isFrozen) mousePressed();
  // returning false prevents page scroll on some mobiles while touching canvas
  return false;
}
function touchMoved() { return false; }  // prevent accidental scroll over canvas

function keyPressed(){
  if (key === "s" || key === "S") saveCanvas("ml-collage","png");
  if (key === "f" || key === "F") {
    isFrozen = !isFrozen;
    document.getElementById("freezeBtn").textContent = isFrozen ? "Unfreeze" : "Freeze";
  }
  if (key === "h" || key === "H") showHUD = !showHUD;
}
function windowResized(){ resizeCanvas(windowWidth, windowHeight); }
