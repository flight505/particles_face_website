precision highp float;

// Sprite Sheet Samplers
uniform sampler2D uSprite1;
uniform sampler2D uSprite2;

// Frame Control Uniforms
uniform highp float uFrameIndex;
uniform float uSpriteCols;
uniform float uSpriteRows;

// Animation Progress
uniform float uProgress;
uniform float uTime;
uniform vec2 uResolution;

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

  // Adjust color to create a stronger blue-green tint
  vec3 tintedColor = mix(sampledColor.rgb, vec3(0.0, 0.8, 1.0), 0.2);
  
  // Enhance the pulsating glow effect
  float glow = sin(uTime * 2.0) * 0.5 + 0.5;
  
  // Apply brightness and glow
  vec3 finalColor = tintedColor * (0.3 + glow * 0.5);
  
  // Add a stronger blue halo
  float halo = 1.0 - smoothstep(0.2, 0.5, length(gl_PointCoord - 0.5));
  finalColor += vec3(0.0, 0.6, 1.0) * halo * 0.8;

  // Apply a softer circular mask
  float mask = smoothstep(0.5, 0.4, length(gl_PointCoord - 0.5));

  gl_FragColor = vec4(finalColor, sampledColor.a * mask * uProgress * vAlpha);

  // Enhance the bloom effect
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float bloomStrength = 0.4;
  vec3 bloom = vec3(0.0);
  for (float i = 0.0; i < 8.0; i++) {
    float offset = (i / 7.0) * 0.03;
    bloom += texture2D(uSprite1, uv + vec2(offset, offset)).rgb;
    bloom += texture2D(uSprite1, uv - vec2(offset, offset)).rgb;
  }
  bloom /= 16.0;
  
  gl_FragColor.rgb += bloom * bloomStrength;

  // Slightly brighten the overall image
  gl_FragColor.rgb *= 1.0;

  // Calculate brightness
  float brightness = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));

  // Discard pixels if too transparent or too dark
  if (gl_FragColor.a < 0.02 || brightness < 0.5) {
    discard;
  }
}

