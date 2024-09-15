// Fragment Shader without Blending Sprite Sheets
precision mediump float;

uniform sampler2D uSprite1;
uniform sampler2D uSprite2;
uniform float uFrameIndex;
uniform float uSpriteCols;
uniform float uSpriteRows;
uniform float uProgress;

varying vec2 vTexCoords;

// Function to create a circular opacity mask
float circle(vec2 uv, float border) {
  float radius = 0.5;
  float dist = radius - distance(uv, vec2(0.5));
  return smoothstep(0.0, border, dist);
}

void main() {
  // Total frames per sprite sheet
  float framesPerSheet = 50.0;

  // Determine current sprite sheet and frame within the sheet
  float sheetIndex = floor(uFrameIndex / framesPerSheet);
  float frameInSheet = mod(uFrameIndex, framesPerSheet);

  bool useSprite1 = sheetIndex < 1.0;

  // Calculate row and column for current frame
  float frameCol = mod(frameInSheet, uSpriteCols);
  float frameRow = floor(frameInSheet / uSpriteCols);

  // Define frame dimensions in UV space
  float frameWidth = 1.0 / uSpriteCols;
  float frameHeight = 1.0 / uSpriteRows;

  // Calculate UV offset for current frame
  vec2 frameUVOffset = vec2(frameCol * frameWidth, frameRow * frameHeight);

  // Calculate UV within the frame
  vec2 uvWithinFrame = vTexCoords * vec2(frameWidth, frameHeight);

  // Final UV coordinates for current frame
  vec2 finalUV = frameUVOffset + uvWithinFrame;

  // Sample texture from the correct sprite sheet
  vec4 sampledColor;
  if (useSprite1) {
    sampledColor = texture2D(uSprite1, finalUV);
  } else {
    sampledColor = texture2D(uSprite2, finalUV);
  }

  // Apply the texture color
  gl_FragColor.rgb = sampledColor.rgb;

  // Discard pixels if too dark
  if (gl_FragColor.r < 0.1) {
    discard;
  }

  // Apply circle opacity and progress
  gl_FragColor.a = circle(gl_PointCoord, 0.2) * uProgress;
}