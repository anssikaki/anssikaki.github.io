let speedSlider, powerSlider;

function setup() {
  const canvas = createCanvas(600, 400);
  canvas.parent('panel-container');
  angleMode(DEGREES);
  textFont('Courier New');
  speedSlider = createSlider(0, 100, 50);
  speedSlider.parent('panel-container');
  powerSlider = createSlider(0, 100, 50);
  powerSlider.parent('panel-container');
}

function draw() {
  background(20);
  drawFrame();
  drawGauge(width/3, height/2, speedSlider.value(), 'Speed');
  drawGauge(2*width/3, height/2, powerSlider.value(), 'Power');
}

function drawFrame() {
  stroke(0,255,255);
  noFill();
  rect(10, 10, width-20, height-20, 15);
}

function drawGauge(x, y, val, label) {
  push();
  translate(x, y);
  strokeWeight(8);
  stroke(0, 255, 255);
  noFill();
  const angle = map(val, 0, 100, -135, 135);
  arc(0, 0, 150, 150, -135, angle);
  stroke(60);
  arc(0, 0, 150, 150, angle, 135);
  fill(0, 255, 255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(12);
  text(label, 0, 50);
  textSize(24);
  text(nf(val,3,0), 0, 0);
  pop();
}
