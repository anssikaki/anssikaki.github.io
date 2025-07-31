let x, y;
let vx, vy;
let diameter = 50;
let ballColor;

function setup() {
  createCanvas(400, 400);
  x = width / 2;
  y = height / 2;
  vx = random(-3, 3);
  vy = random(-3, 3);
  ballColor = color(255, 0, 0);
}

function draw() {
  background(220);
  fill(ballColor);
  noStroke();
  ellipse(x, y, diameter);

  x += vx;
  y += vy;

  let collided = false;
  if (x - diameter/2 <= 0 || x + diameter/2 >= width) {
    vx *= -1;
    collided = true;
  }
  if (y - diameter/2 <= 0 || y + diameter/2 >= height) {
    vy *= -1;
    collided = true;
  }
  if (collided) {
    ballColor = color(random(255), random(255), random(255));
  }
}
