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
  // Total Frames per Sprite Sheet
  float framesPerSheet = 50.0;

  // Determine Current Sprite Sheet and Frame Within the Sheet
  float sheetIndex = floor(uFrameIndex / framesPerSheet);
  float frameInSheet = mod(uFrameIndex, framesPerSheet);

  // Boolean to Select Sprite Sheet
  bool useSprite1 = sheetIndex < 1.0;

  // Calculate Column and Row for Current Frame
  float frameCol = mod(frameInSheet, uSpriteCols);
  float frameRow = uSpriteRows - 1.0 - floor(frameInSheet / uSpriteCols);

  // Define Frame Dimensions in UV Space
  float frameWidth = 1.0 / uSpriteCols;
  float frameHeight = 1.0 / uSpriteRows;

  // Calculate UV Offset for Current Frame
  vec2 frameUVOffset = vec2(frameCol * frameWidth, frameRow * frameHeight);

  // Calculate UV Within the Frame
  vec2 uvWithinFrame = vTexCoords * vec2(frameWidth, frameHeight);

  // Final UV Coordinates for Current Frame
  vec2 finalUV = frameUVOffset + uvWithinFrame;

  // Sample Texture from the Correct Sprite Sheet
  vec4 sampledColor;
  if (useSprite1) {
    sampledColor = texture2D(uSprite1, finalUV);
  } else {
    sampledColor = texture2D(uSprite2, finalUV);
  }

  // Apply the Sampled Texture Color
  gl_FragColor.rgb = sampledColor.rgb;

  // Discard Pixels if Too Dark to Create Transparency
  if (gl_FragColor.r < 0.1) {
    discard;
  }

  // Apply Circular Opacity Mask and Animation Progress
  gl_FragColor.a = circle(gl_PointCoord, 0.2) * uProgress;
}