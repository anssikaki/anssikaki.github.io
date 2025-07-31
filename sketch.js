let speedSlider, powerSlider, torqueSlider;

function setup() {
  const canvas = createCanvas(620, 420);
  canvas.parent('canvas-holder');
  angleMode(DEGREES);
  textFont('Courier New');
  speedSlider = createSlider(0, 100, 50);
  speedSlider.parent('controls');
  powerSlider = createSlider(0, 100, 50);
  powerSlider.parent('controls');
  torqueSlider = createSlider(0, 100, 50);
  torqueSlider.parent('controls');
}

function draw() {
  background(20);
  drawFrame();
  drawGauge(width/4, height/2, speedSlider.value(), 'Speed');
  drawGauge(width/2, height/2, powerSlider.value(), 'Power');
  drawGauge(3*width/4, height/2, torqueSlider.value(), 'Torque');
}

function drawFrame() {
  stroke(0,255,255);
  noFill();
  rect(10, 10, width-20, height-20, 15);
  stroke(0, 60);
  for (let i = 20; i < width; i += 40) {
    line(i, 10, i, height - 10);
  }
  for (let j = 20; j < height; j += 40) {
    line(10, j, width - 10, j);
  }
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
  const scanA = frameCount % 360;
  stroke(0, 200, 100, 150);
  line(0, 0, 75 * cos(scanA), 75 * sin(scanA));
  fill(0, 255, 255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(12);
  text(label, 0, 50);
  textSize(24);
  text(nf(val,3,0), 0, 0);
  pop();
}
