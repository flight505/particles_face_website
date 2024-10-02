import { Texture } from 'three'

function outSine(n) {
  return Math.sin((n * Math.PI) / 2);
}

export default class TouchTexture {
  constructor() {
    this.size = 64;
    this.maxAge = 120;
    this.radius = 0.15;
    this.trail = [];

    this.initTexture();

    // Update these values to match the sprite sheet
    this.columns = 6;
    this.rows = 10;
    this.totalFrames = 60; // 6 columns * 10 rows
  }

  initTexture() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.texture = new Texture(this.canvas);

    this.canvas.id = 'touchTexture';
    this.canvas.style.width = this.canvas.style.height = `${this.canvas.width}px`;
  }

  update() {
    this.clear();

    // Fade out
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw touches
    this.trail.forEach((touch) => {
      this.drawTouch(touch);
    });

    // Update texture
    this.texture.needsUpdate = true;
  }

  clear() {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  addTouch(point) {
    // Calculate the angle from the center of the screen to the mouse position
    const angle = Math.atan2(point.y - 0.5, point.x - 0.5);

    // Normalize the angle to be between 0 and 2π
    const normalizedAngle = (angle + 2 * Math.PI) % (2 * Math.PI);

    // Map the angle to a frame index
    const frameIndex = Math.floor(normalizedAngle / (2 * Math.PI) * this.totalFrames);

    // Calculate row and column
    const row = Math.floor(frameIndex / this.columns);
    const column = frameIndex % this.columns;

    this.trail.push({
      x: point.x,
      y: point.y,
      age: 0,
      column: column / (this.columns - 1),
      row: row / (this.rows - 1)
    });
  }

  drawTouch(touch) {
    const pos = {
      x: touch.x * this.size,
      y: touch.y * this.size
    };

    let intensity = 1;
    if (touch.age < this.maxAge) {
      intensity = (this.maxAge - touch.age) / this.maxAge;
    }

    intensity *= 0.2;

    const radius = this.size * this.radius;
    const grd = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);

    grd.addColorStop(0, `rgba(255, 0, 0, ${intensity})`);
    grd.addColorStop(1, 'rgba(0, 0, 0, 0)');

    this.ctx.beginPath();
    this.ctx.fillStyle = grd;
    this.ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw column and row information
    this.ctx.fillStyle = `rgba(0, 255, 0, ${intensity})`;
    this.ctx.fillRect(pos.x, pos.y, 2, 2);

    // Update touch position with column and row
    touch.x = touch.column;
    touch.y = touch.row;
  }
}
