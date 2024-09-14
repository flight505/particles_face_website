// Fragment Shader
precision mediump float;

uniform sampler2D uSprite1;
uniform sampler2D uSprite2;
uniform float uFrameIndex;
uniform float uSpriteCols;
uniform float uSpriteRows;
uniform float uProgress;
uniform float uBrightness; // New uniform for controlling brightness

varying vec2 vTexCoords;

// create a circle value in a frag shader
float circle(vec2 uv, float border) {
  float radius = 0.5;
  float dist = radius - distance(uv, vec2(0.5));
  return smoothstep(0.0, border, dist);
}

void main() {
  // Total frames per sprite sheet
  float framesPerSheet = 50.0;

  // Determine current sprite sheet and next sprite sheet
  float sheetIndex = floor(uFrameIndex / framesPerSheet);
  float frameInSheet = mod(uFrameIndex, framesPerSheet);

  bool useSprite1 = sheetIndex < 1.0;

  // Calculate frame number within the current and next sprite sheet
  float currentFrame = frameInSheet;
  float nextFrame = frameInSheet + 1.0;

  // Clamp nextFrame to avoid overflow
  if (nextFrame >= framesPerSheet) {
    nextFrame = framesPerSheet - 1.0;
  }

  // Calculate row and column for current frame
  float frameCol = mod(currentFrame, uSpriteCols);
  float frameRow = floor(currentFrame / uSpriteCols);

  // Calculate row and column for next frame
  float nextFrameCol = mod(nextFrame, uSpriteCols);
  float nextFrameRow = floor(nextFrame / uSpriteCols);

  // Calculate UV offset for current frame
  vec2 frameUVOffset = vec2(frameCol, frameRow) / vec2(uSpriteCols, uSpriteRows);

  // Calculate UV offset for next frame
  vec2 nextFrameUVOffset = vec2(nextFrameCol, nextFrameRow) / vec2(uSpriteCols, uSpriteRows);

  // Calculate UV within the frame
  vec2 uvWithinFrame = gl_PointCoord / vec2(uSpriteCols, uSpriteRows);

  // Final UV coordinates for current and next frames
  vec2 finalUVCurrent = frameUVOffset + uvWithinFrame;
  vec2 finalUVNext = nextFrameUVOffset + uvWithinFrame;

  // Calculate interpolation factor
  float interp = fract(uFrameIndex);

  // Sample textures
  vec4 colorCurrent = useSprite1 ? texture2D(uSprite1, finalUVCurrent) : texture2D(uSprite2, finalUVCurrent);
  vec4 colorNext = useSprite1 ? texture2D(uSprite1, finalUVNext) : texture2D(uSprite2, finalUVNext);

  // Blend between current and next frame
  vec4 blendedColor = mix(colorCurrent, colorNext, interp);

  // Apply brightness adjustment
  blendedColor.rgb *= uBrightness;

  // Apply the texture color
  gl_FragColor = blendedColor;

  // Discard pixels if too dark (adjusted threshold based on brightness)
  if (gl_FragColor.r < 0.1 * uBrightness) {
    discard;
  }

  // Apply circle opacity and progress
  gl_FragColor.a *= circle(gl_PointCoord, 0.2) * uProgress;
}