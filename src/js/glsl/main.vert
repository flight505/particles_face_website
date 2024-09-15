// Vertex Shader with Only Z-Axis Displacement
precision mediump float;

uniform float uPointSize;
uniform float uProgress;
uniform float uTime;
uniform sampler2D uTouch;
uniform float uNbLines;
uniform float uNbColumns;
uniform float uScaleHeightPointSize;

attribute vec3 initPosition;

varying vec2 vTexCoords;

void main() {
  // Only affect the Z-axis based on uProgress
  vec3 transformed = vec3(position.x, position.y, initPosition.z * (1.0 - uProgress));

  // Project vertex
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Calculate normalized UVs based on particle position within the grid
  // Assuming the grid is centered and spans from -halfLines to +halfLines and -halfColumns to +halfColumns
  // Map x from [-halfLines, +halfLines] to [0,1]
  // Map y from [-halfColumns, +halfColumns] to [0,1]
  float normalizedX = (position.x + (uNbLines / 2.0)) / float(uNbLines);
  float normalizedY = (position.y + (uNbColumns / 2.0)) / float(uNbColumns);
  vTexCoords = vec2(normalizedX, normalizedY);

  // Final Position (Point Size based on Z)
  gl_PointSize = uPointSize * (uScaleHeightPointSize / -mvPosition.z);
}