precision highp float;

// Sprite Sheet Samplers
uniform sampler2D uSpriteSheet;
uniform float uFrameIndex;
uniform float uSpriteCols;
uniform float uSpriteRows;

// Animation Progress
uniform float uProgress;
uniform float uTime;
uniform vec2 uResolution;

// Varying UV Coordinates from Vertex Shader
varying vec2 vTexCoords;

// Varying Alpha from Vertex Shader
varying float vAlpha;

float circle(vec2 uv, float border) {
  float radius = 0.5;
  float dist = radius - distance(uv, vec2(0.5));
  return smoothstep(0.0, border, dist);
}

void main() {
  // Use uFrameIndex to determine which frame to show
  float frameIndex = floor(uFrameIndex);
  
  // Calculate Column and Row for Current Frame
  float frameCol = mod(frameIndex, uSpriteCols);
  float frameRow = uSpriteRows - 1.0 - floor(frameIndex / uSpriteCols);
  
  // Define frame dimensions in UV space
  float frameWidth = 1.0 / uSpriteCols;
  float frameHeight = 1.0 / uSpriteRows;

  // Calculate UV offset for current frame
  vec2 frameUVOffset = vec2(frameCol * frameWidth, frameRow * frameHeight);

  // Final UV coordinates for current frame
  vec2 finalUV = frameUVOffset + vTexCoords * vec2(frameWidth, frameHeight);

  // Sample texture from the sprite sheet
  vec4 sampledColor = texture2D(uSpriteSheet, finalUV);

  // Adjust color to create a stronger blue-green tint
  vec3 tintedColor = mix(sampledColor.rgb, vec3(0.0, 0.8, 1.0), 0.2);
  
  // Enhance the pulsating glow effect
  float glow = sin(uTime * 2.0) * 0.5 + 0.5;
  
  // Apply brightness and glow
  vec3 finalColor = tintedColor * (0.5 + glow * 0.5);
  
  // Add a stronger blue halo
  float halo = 1.0 - smoothstep(0.2, 0.5, length(gl_PointCoord - 0.5));
  finalColor += vec3(0.0, 0.6, 1.0) * halo * 0.8;

  // Apply a softer circular mask
  float mask = smoothstep(0.5, 0.4, length(gl_PointCoord - 0.5));

  gl_FragColor = vec4(finalColor, sampledColor.a * mask * uProgress * vAlpha);

  // Slightly brighten the overall image
  gl_FragColor.rgb *= 1.0;

  // Calculate brightness
  float brightness = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));

  // Discard pixels if too transparent or too dark
  if (gl_FragColor.a < 0.05 || brightness < 0.65) {
    discard;
  }
}