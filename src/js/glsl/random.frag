precision mediump float;

void main() {
  // Calculate the distance from the center of the point
  float dist = distance(gl_PointCoord, vec2(0.5, 0.5));

  // Create a circular mask
  if (dist > 0.5) {
    discard;
  }

  // Set the color of the particles with increased opacity
  gl_FragColor = vec4(1.0, 1.0, 1.0, 0.1); // White color with 80% opacity
}