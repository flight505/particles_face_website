precision mediump float;

uniform float uPointSize;
uniform float uTime;
uniform float uScaleHeightPointSize;

attribute vec3 initPosition;
attribute float randoms;

void main() {
  // Add movement to the particles
  vec3 transformed = initPosition;
  transformed.x += sin(uTime * 0.5 + randoms * 10.0) * 5.0;
  transformed.y += cos(uTime * 0.5 + randoms * 10.0) * 5.0;
  transformed.z += sin(uTime * 0.5 + randoms * 10.0) * 5.0;

  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Adjust point size based on Z-axis for depth perception and add randomness
  gl_PointSize = (uPointSize + randoms * 0.5) * (uScaleHeightPointSize / -mvPosition.z);
}