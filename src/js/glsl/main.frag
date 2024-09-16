precision mediump float;

// Sprite Sheet Samplers
uniform sampler2D uSprite1;
uniform sampler2D uSprite2;

// Frame Control Uniforms
uniform float uFrameIndex;
uniform float uSpriteCols;
uniform float uSpriteRows;

// Animation Progress
uniform float uProgress;

// Varying UV Coordinates from Vertex Shader
varying vec2 vTexCoords;

float circle(vec2 uv, float border) {
  float radius = 0.5;
  float dist = radius - distance(uv, vec2(0.5));
  return smoothstep(0.0, border, dist);
}

void main() {
  // Total frames per sprite sheet
  float framesPerSheet = 50.0;

  // Use uFrameIndex to determine which frame to show
  float frameIndex = floor(uFrameIndex);
  
  // Determine current sprite sheet
  float sheetIndex = floor(frameIndex / framesPerSheet);
  float frameInSheet = mod(frameIndex, framesPerSheet);

  // Calculate Column and Row for Current Frame
  float frameCol = mod(frameInSheet, uSpriteCols);
  float frameRow = uSpriteRows - 1.0 - floor(frameInSheet / uSpriteCols);
  
  // Define frame dimensions in UV space
  float frameWidth = 1.0 / uSpriteCols;
  float frameHeight = 1.0 / uSpriteRows;

  // Calculate UV offset for current frame
  vec2 frameUVOffset = vec2(frameCol * frameWidth, frameRow * frameHeight);

  // Final UV coordinates for current frame
  vec2 finalUV = frameUVOffset + vTexCoords * vec2(frameWidth, frameHeight);

  // Sample texture from the correct sprite sheet
  vec4 sampledColor;
  if (sheetIndex < 1.0) {
    sampledColor = texture2D(uSprite1, finalUV);
  } else {
    sampledColor = texture2D(uSprite2, finalUV);
  }

  // Enhance brightness for glow effect
  sampledColor.rgb *= 1.5; // Increase brightness

  // Apply the sampled texture color
  gl_FragColor.rgb = sampledColor.rgb;

  // Discard pixels if too dark to create transparency
  if (gl_FragColor.r < 0.5) {
    discard;
  }

  // Apply circular opacity mask and animation progress
  gl_FragColor.a = circle(gl_PointCoord, 0.2) * uProgress;
}

