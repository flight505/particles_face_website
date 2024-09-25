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

// Add this to the list of varyings
varying float vAlpha;

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
  vec4 sampledColor = sheetIndex < 1.0 ? texture2D(uSprite1, finalUV) : texture2D(uSprite2, finalUV);

  // Apply brightness and circular mask
  float mask = smoothstep(0.5, 0.48, length(gl_PointCoord - 0.5));
  gl_FragColor = vec4(sampledColor.rgb * 0.5, sampledColor.a * mask * uProgress);

  // Apply visibility to the alpha channel
  gl_FragColor.a *= vAlpha;

  // Discard pixels if too transparent
  if (gl_FragColor.a < 0.01) {
    discard;
  }
}

