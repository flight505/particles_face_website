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

uniform sampler2D uSpriteSheet;    // Active Sprite Sheet (sprite1 or sprite2)
uniform vec2 uTexOffset;           // UV Offset to Select Current Frame
uniform float uDisplacementScale;  // Intensity of Z-Axis Displacement
uniform float uSpriteCols;         // Number of columns in the sprite sheet
uniform float uSpriteRows;         // Number of rows in the sprite sheet
uniform float uFrameIndex;         // Current frame index

void main() {
  // Calculate normalized UVs based on particle position within the grid
  float normalizedX = (position.x + (uNbLines / 2.0)) / float(uNbLines);
  float normalizedY = (position.y + (uNbColumns / 2.0)) / float(uNbColumns);
  vTexCoords = vec2(normalizedX, normalizedY);

  // Calculate frame index and UV offset
  float framesPerSheet = 50.0;
  float frameIndex = floor(uFrameIndex);
  float sheetIndex = floor(frameIndex / framesPerSheet);
  float frameInSheet = mod(frameIndex, framesPerSheet);

  float frameCol = mod(frameInSheet, uSpriteCols);
  float frameRow = uSpriteRows - 1.0 - floor(frameInSheet / uSpriteCols);

  float frameWidth = 1.0 / uSpriteCols;
  float frameHeight = 1.0 / uSpriteRows;

  vec2 frameUVOffset = vec2(frameCol * frameWidth, frameRow * frameHeight);
  vec2 spriteUV = frameUVOffset + vTexCoords * vec2(frameWidth, frameHeight);

  // Sample sprite sheet
  vec4 spriteData = texture2D(uSpriteSheet, spriteUV);
  float brightness = spriteData.r;

  // Affect the Z-axis based on uProgress for initial animation
  float displacement = initPosition.z * (1.0 - uProgress);

  // After uProgress is 1, use displacement mapping for Z-axis
  if (uProgress >= 1.0) {
    displacement = brightness * uDisplacementScale;
  }

  vec3 transformed = vec3(position.x, position.y, displacement);

  // Calculate final displaced position
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Adjust point size based on Z-axis for depth perception
  gl_PointSize = uPointSize * (uScaleHeightPointSize / -mvPosition.z);
}