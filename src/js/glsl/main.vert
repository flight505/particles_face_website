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

// Simplex noise function
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float noise(vec3 P) {
  vec3 i0 = mod289(floor(P)), i1 = mod289(i0 + vec3(1.0));
  vec3 f0 = fract(P), f1 = f0 - vec3(1.0);
  vec4 ix = vec4(i0.x, i1.x, i0.x, i1.x);
  vec4 iy = vec4(i0.y, i0.y, i1.y, i1.y);
  vec4 iz0 = vec4(i0.z), iz1 = vec4(i1.z);
  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0), ixy1 = permute(ixy + iz1);
  vec4 gx0 = ixy0 * (1.0 / 7.0), gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0); vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0)); gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);
  vec4 gx1 = ixy1 * (1.0 / 7.0), gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1); vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0)); gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);
  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x), g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z), g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x), g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z), g111 = vec3(gx1.w,gy1.w,gz1.w);
  vec4 norm0 = taylorInvSqrt(vec4(dot(g000,g000), dot(g010,g010), dot(g100,g100), dot(g110,g110)));
  g000 *= norm0.x; g010 *= norm0.y; g100 *= norm0.z; g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001,g001), dot(g011,g011), dot(g101,g101), dot(g111,g111)));
  g001 *= norm1.x; g011 *= norm1.y; g101 *= norm1.z; g111 *= norm1.w;
  float n000 = dot(g000, f0), n100 = dot(g100, vec3(f1.x,f0.yz));
  float n010 = dot(g010, vec3(f0.x,f1.y,f0.z)), n110 = dot(g110, vec3(f1.xy,f0.z));
  float n001 = dot(g001, vec3(f0.xy,f1.z)), n101 = dot(g101, vec3(f1.x,f0.y,f1.z));
  float n011 = dot(g011, vec3(f0.x,f1.yz)), n111 = dot(g111, f1);
  vec3 fade_xyz = fade(f0);
  vec4 n_z = mix(vec4(n000,n100,n010,n110), vec4(n001,n101,n011,n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

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
  vec3 transformed = vec3(position.x + sideToSideMovement, position.y, displacement);

  // Calculate final displaced position
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.5); // Adjusted scale factor, moves the particles away from the camera
  gl_Position = projectionMatrix * mvPosition;

  // Adjust point size based on Z-axis for depth perception and add randomness
  gl_PointSize = (uPointSize + randoms * 1.0) * (uScaleHeightPointSize / -mvPosition.z);
}