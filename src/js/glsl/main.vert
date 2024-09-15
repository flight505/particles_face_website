// Vertex Shader with Z-Axis Displacement Disabled
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
  // Chunk of code used in Three.js
  #include <begin_vertex>

  // Appear effect
  transformed = initPosition + ((position - initPosition) * uProgress);

  // Get UVs of the plane
  vec2 vUv = transformed.xy / vec2(uNbLines, uNbColumns) - vec2(-0.5, -0.5);

  // Project vertex
  #include <project_vertex>

  // Get Texture coords for fragment shader
  vTexCoords = vUv; // Use vUv instead of position.xy

  // Final Position
  gl_PointSize = uPointSize * (uScaleHeightPointSize / -mvPosition.z);
}