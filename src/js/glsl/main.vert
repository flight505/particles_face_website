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
attribute float randoms;

varying vec2 vTexCoords;

uniform sampler2D uSpriteSheet;    // Active Sprite Sheet (sprite1 or sprite2)
uniform vec2 uTexOffset;           // UV Offset to Select Current Frame
uniform float uDisplacementScale;  // Intensity of Z-Axis Displacement
uniform float uSpriteCols;         // Number of columns in the sprite sheet
uniform float uSpriteRows;         // Number of rows in the sprite sheet
uniform float uFrameIndex;         // Current frame index
uniform float uDisplacementBlend;  // New uniform to blend displacement effect

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

  // Blend the displacement effect gradually
  float displacement = mix(initPosition.z, brightness * uDisplacementScale, uDisplacementBlend);

  // Add subtle side-to-side movement
  float sideToSideMovement = sin(uTime + position.y * 1.5) * 0.3; // Increased vertical frequency

  // Create horizontal ribbons by adjusting the y position
  float ribbonHeight = 4.0; // Height of each ribbon (3-4 rows)
  float gapHeight = 2.0;   // Gap between ribbons
  float rowsPerRibbon = 4.0; // Number of rows per ribbon
  float adjustedY = floor(position.y / (ribbonHeight + gapHeight)) * (ribbonHeight + gapHeight) + mod(position.y, rowsPerRibbon);

  vec3 transformed = vec3(position.x + sideToSideMovement, adjustedY, displacement);

  // Calculate final displaced position
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 2.5); // Adjusted scale factor, moves the particles away from the camera
  gl_Position = projectionMatrix * mvPosition;

  // Adjust point size based on Z-axis for depth perception and add randomness
  gl_PointSize = (uPointSize + randoms * 0.5) * (uScaleHeightPointSize / -mvPosition.z);
}