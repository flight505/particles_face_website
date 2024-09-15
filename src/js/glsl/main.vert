// ===== Filename: src/js/glsl/main.vert =====

// Vertex Shader with Sprite Sheet-Based Z-Axis Displacement
precision mediump float;

// Point Size Uniform
uniform float uPointSize;

// Animation Progress
uniform float uProgress;

// Time Uniform (Unused in Current Shader but Kept for Potential Extensions)
uniform float uTime;

// Touch Texture Sampler (Unused in Current Shader but Kept for Potential Extensions)
uniform sampler2D uTouch;

// Grid Dimensions
uniform float uNbLines;
uniform float uNbColumns;

// Scaling for Point Size Based on Height and Device Pixel Ratio
uniform float uScaleHeightPointSize;

// Sprite Sheet Uniforms
uniform sampler2D uSpriteSheet;    // Active Sprite Sheet (sprite1 or sprite2)
uniform vec2 uTexOffset;           // UV Offset to Select Current Frame
uniform float uDisplacementScale;  // Intensity of Z-Axis Displacement
uniform float uSpriteCols;         // Number of Columns in Sprite Sheet
uniform float uSpriteRows;         // Number of Rows in Sprite Sheet

// Attributes
attribute vec3 initPosition;

// Varying UV Coordinates to Pass to Fragment Shader
varying vec2 vTexCoords;

void main() {
  // Keep the particle positions static
  vec3 transformed = position;

  // Calculate normalized UVs based on particle position within the grid
  float normalizedX = (position.x + (uNbLines / 2.0)) / float(uNbLines);
  float normalizedY = (position.y + (uNbColumns / 2.0)) / float(uNbColumns);
  vTexCoords = vec2(normalizedX, normalizedY);

  // Use the sprite sheet only for displacement, not for position
  vec4 spriteData = texture2D(uSpriteSheet, uTexOffset + vTexCoords * vec2(1.0 / uSpriteCols, 1.0 / uSpriteRows));
  float displacement = spriteData.r * uDisplacementScale * uProgress;
  transformed.z += displacement;

  // Project the transformed vertex position
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Adjust point size based on Z-axis for depth perception
  gl_PointSize = uPointSize * (uScaleHeightPointSize / -mvPosition.z);
}