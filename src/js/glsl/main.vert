// Vertex Shader with Z-Axis Displacement and Row Distortion
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
uniform float uDispersion;
uniform float uDistortionFrequency;
uniform float uDistortionAmplitude;
uniform float uRandomSeed;

// Function to generate a pseudo-random value
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Add this function at the top of your shader
vec3 mod289(vec3 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
  return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
  return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise(vec3 v) {
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  // Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
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

  // Apply dispersion effect
  vec3 dispersedPosition = mix(position, initPosition, uDispersion);

  // Add subtle side-to-side movement
  float sideToSideMovement = sin(uTime + dispersedPosition.y * 1.5) * 0.3;

  // Calculate row-based distortion
  float rowDistortion = sin(dispersedPosition.y * uDistortionFrequency + uTime) * uDistortionAmplitude;
  
  // Determine if this is a "special" row for extra distortion
  float rowSeed = floor(dispersedPosition.y / 10.0) + uRandomSeed;
  float isSpecialRow = step(0.9, random(vec2(rowSeed, 0.0)));
  
  // Apply extra distortion to special rows
  rowDistortion *= mix(10.0, 10.0, isSpecialRow);

  // Create horizontal ribbons by adjusting the y position
  float ribbonHeight = 3.0;
  float gapHeight = 0.5;
  float rowsPerRibbon = 3.0;
  float adjustedY = floor(dispersedPosition.y / (ribbonHeight + gapHeight)) * (ribbonHeight + gapHeight) + mod(dispersedPosition.y, rowsPerRibbon);

  // Calculate final displaced position
  vec3 transformed = vec3(
    dispersedPosition.x + sideToSideMovement + snoise(vec3(dispersedPosition.xy * 0.1, uTime * 0.1)) * 0.5,
    adjustedY + snoise(vec3(dispersedPosition.xy * 0.1, uTime * 0.1 + 100.0)) * 0.3,
    mix(dispersedPosition.z, displacement, 1.0 - uDispersion) + snoise(vec3(dispersedPosition.xy * 0.1, uTime * 0.1 + 200.0)) * 0.5
  );

  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Adjust point size based on Z-axis for depth perception and add randomness
  gl_PointSize = (uPointSize + randoms * 0.5) * (uScaleHeightPointSize / -mvPosition.z);
}