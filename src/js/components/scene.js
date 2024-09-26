// Importing necessary modules and libraries

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  BufferGeometry,
  BufferAttribute,
  Points,
  ShaderMaterial,
  Raycaster,
  Vector2,
  AdditiveBlending,
  PointLight,
  Frustum,
  Matrix4,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'stats-js'
import LoaderManager from '@/js/managers/LoaderManager'
import vertexShader from '@/js/glsl/main.vert'
import fragmentShader from '@/js/glsl/main.frag'
import randomVertexShader from '@/js/glsl/random.vert'
import randomFragmentShader from '@/js/glsl/random.frag'
import { randFloat } from 'three/src/math/MathUtils'
import gsap from 'gsap'
import TouchTexture from './TouchTexture'
import { isTouch } from '@/js/utils/isTouch'
import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  RenderPass,
  EffectPass,
  BlendFunction,
  SMAAEffect,
  SMAAPreset,
  GlitchEffect,
  VignetteEffect,
  NoiseEffect,
  GlitchMode,
} from 'postprocessing'

export default class MainScene {
  canvas
  renderer
  scene
  camera
  controls
  stats
  width
  height
  mouse = new Vector2(0, 0)
  currentFrameIndex = 49
  glitchEffect
  frustum
  projScreenMatrix

  constructor() {
    this.canvas = document.querySelector('.scene')
    if (!this.canvas) {
      throw new Error('Canvas element with class "scene" not found')
    }
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.touch = new TouchTexture()
    this.frustum = new Frustum()
    this.projScreenMatrix = new Matrix4()
    this.init().catch(error => {
      console.error('Initialization failed:', error)
    })
  }

  init = async () => {
    try {
      const assets = [
        { name: 'sprite1', texture: './img/right1_sprite_sheet.png', flipY: true },
        { name: 'sprite2', texture: './img/left1_sprite_sheet.png', flipY: true },
      ]

      await LoaderManager.load(assets)
      console.log('Loaded Textures:', LoaderManager.assets)

      this.setStats()
      this.setScene()
      this.setRenderer()
      this.setCamera()
      this.setControls()
      this.setParticlesGrid()
      this.setRaycaster()
      this.setPostProcessing()
      this.setLights()
      this.handleResize()

      this.events()
      this.animateIn()

      // Start the animation loop after initialization
      this.draw(0)
    } catch (error) {
      console.error('Error during initialization:', error)
      throw error
    }
  }

  setRenderer() {
    try {
      this.renderer = new WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
      })
      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      this.renderer.setClearColor(0x000000, 0)
      this.renderer.domElement.style.position = 'fixed'
      this.renderer.domElement.style.top = '0'
      this.renderer.domElement.style.left = '0'
      this.renderer.domElement.style.zIndex = '1'
    } catch (error) {
      console.error('Error setting up WebGL renderer:', error)
      throw error
    }
  }

  setScene() {
    this.scene = new Scene()
  }

  setCamera() {
    const aspectRatio = this.width / this.height
    const fieldOfView = 60
    const nearPlane = 0.1
    const farPlane = 10000

    this.camera = new PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane)
    this.camera.position.set(0, 0, 220)
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.camera)
  }

  setControls() {
    try {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.enableRotate = true
      this.controls.enableZoom = true
    } catch (error) {
      console.error('Error setting up OrbitControls:', error)
      this.controls = null
    }
  }

  setParticlesGrid() {
    try {
      const geometry = new BufferGeometry()
      const { particles, initPositions, randoms, colorRandoms } = this.generateParticleAttributes()
      this.setGeometryAttributes(geometry, particles, initPositions, randoms, colorRandoms)
      this.initializeUniforms()
      this.updateFrameOffset(this.currentFrameIndex)
      this.createParticleMesh(geometry)

      // Initialize visibility attribute
      const visibilityArray = new Float32Array(particles.length / 3)
      visibilityArray.fill(1.0)
      geometry.setAttribute('visibility', new BufferAttribute(visibilityArray, 1))

    } catch (error) {
      console.error('Error setting up particle grid:', error)
      throw error
    }
  }

  generateParticleAttributes() {
    const particles = []
    const initPositions = []
    const randoms = []
    const colorRandoms = []
    const multiplier = 12 // Adjust the multiplier for more particles
    this.nbColumns = 18 * multiplier
    this.nbLines = 32 * multiplier

    const halfColumn = this.nbColumns / 2
    const halfLines = this.nbLines / 2

    for (let i = 0; i < this.nbLines; i++) {
      for (let j = 0; j < this.nbColumns; j++) {
        const x = i - halfLines
        const y = j - halfColumn
        const z = 0
        particles.push(x, y, z)

        initPositions.push(
          x + randFloat(-50, 50),
          y + randFloat(-50, 50),
          randFloat(-100, 100)
        )
        randoms.push(Math.random())
        colorRandoms.push(Math.random())
      }
    }

    return {
      particles: new Float32Array(particles),
      initPositions: new Float32Array(initPositions),
      randoms: new Float32Array(randoms),
      colorRandoms: new Float32Array(colorRandoms),
    }
  }

  setGeometryAttributes(geometry, particles, initPositions, randoms, colorRandoms) {
    geometry.setAttribute('position', new BufferAttribute(particles, 3))
    geometry.setAttribute('initPosition', new BufferAttribute(initPositions, 3))
    geometry.setAttribute('randoms', new BufferAttribute(randoms, 1))
    geometry.setAttribute('colorRandoms', new BufferAttribute(colorRandoms, 1))
    geometry.center()
  }

  initializeUniforms() {
    this.dpr = Math.min(window.devicePixelRatio, 2)
    this.uniforms = {
      uPointSize: { value: 0.2 },
      uNbLines: { value: this.nbLines },
      uNbColumns: { value: this.nbColumns },
      uProgress: { value: 0 },
      uTime: { value: 0.0 },
      uTouch: { value: this.touch.texture },
      uScaleHeightPointSize: { value: (this.dpr * this.height) / 2.0 },
      uFrameIndex: { value: 0.0 }, // Explicitly use 0.0 to ensure it's a float
      uSpriteCols: { value: 5 },
      uSpriteRows: { value: 10 },
      uTotalFrames: { value: 100 },
      uSprite1: { value: LoaderManager.assets['sprite1'].texture },
      uSprite2: { value: LoaderManager.assets['sprite2'].texture },
      uSpriteSheet: { value: LoaderManager.assets['sprite1'].texture },
      uTexOffset: { value: new Vector2(0, 0) },
      uDisplacementScale: { value: 30.0 },
      uDisplacementBlend: { value: 0.0 },
      uDispersion: { value: 1.0 },
      uDistortionFrequency: { value: 0.1 },
      uDistortionAmplitude: { value: 1.0 },
      uRandomSeed: { value: Math.random() * 100 },
      uResolution: { value: new Vector2(this.width, this.height) },
    }
  }

  createParticleMesh(geometry) {
    const customMaterial = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    this.mesh = new Points(geometry, customMaterial)
    this.scene.add(this.mesh)
  }

  updateFrameOffset(frameIndex) {
    const framesPerSheet = 50
    const sheetIndex = Math.floor(frameIndex / framesPerSheet)
    let actualFrame = frameIndex % framesPerSheet

    if (sheetIndex < 1) {
      this.uniforms.uSpriteSheet.value = this.uniforms.uSprite1.value
      actualFrame = 49 - actualFrame
    } else {
      this.uniforms.uSpriteSheet.value = this.uniforms.uSprite2.value
    }

    const frameCol = actualFrame % this.uniforms.uSpriteCols.value
    const frameRow = Math.floor(actualFrame / this.uniforms.uSpriteCols.value)

    const uOffset = frameCol / this.uniforms.uSpriteCols.value
    const vOffset = frameRow / this.uniforms.uSpriteRows.value

    this.uniforms.uTexOffset.value.set(uOffset, vOffset)

    console.log(`Frame: ${frameIndex}, Sheet: ${sheetIndex}, Actual Frame: ${actualFrame}, Offset: (${uOffset}, ${vOffset})`)
  }

  handleMouseMove = (event) => {
    const mouseX = (event.clientX / window.innerWidth) * 2 - 1
    const mouseY = -(event.clientY / window.innerHeight) * 2 + 1

    console.log('Mouse X:', mouseX, 'Mouse Y:', mouseY)
    console.log('Mesh:', this.mesh)

    const deltaX = mouseX - this.mouse.x
    const frameChangeSpeed = 60.0

    this.currentFrameIndex += deltaX * frameChangeSpeed
    this.currentFrameIndex = Math.max(0, Math.min(this.currentFrameIndex, this.uniforms.uTotalFrames.value - 1))

    this.mouse.x = mouseX
    this.mouse.y = mouseY

    const rotateX = gsap.quickTo(this.mesh.rotation, 'x', { duration: 0.5, ease: 'circ.out' })
    const rotateY = gsap.quickTo(this.mesh.rotation, 'y', { duration: 0.5, ease: 'circ.out' })

    rotateX(-this.mouse.y * Math.PI / 64) // Negate this.mouse.y to reverse the tilt direction
    rotateY(this.mouse.x * Math.PI / 64)

    gsap.to(this.uniforms.uFrameIndex, {
      value: this.currentFrameIndex,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        this.updateFrameOffset(this.uniforms.uFrameIndex.value)
      },
    })

    this.ray.setFromCamera(this.mouse, this.camera)
    this.intersects = this.ray.intersectObjects([this.mesh])

    if (this.intersects.length) {
      const uv = new Vector2(0.5, 0.5)
      uv.x = (this.intersects[0].point.x / this.nbLines) + 0.5
      uv.y = (this.intersects[0].point.y / this.nbColumns) + 0.5
      this.touch.addTouch(uv)
    }

    if (this.light) {
      this.light.position.x = -this.mouse.x * 10
      this.light.position.y = this.mouse.y * 10
    }
  }

  animateIn() {
    gsap.fromTo(
      this.uniforms.uProgress,
      { value: 0 },
      {
        value: 1,
        duration: 2.0,
        ease: 'power3.out',
        onUpdate: () => {
          this.uniforms.uDisplacementBlend.value = this.uniforms.uProgress.value
        },
      }
    )

    gsap.fromTo(
      this.uniforms.uDispersion,
      { value: 1 },
      {
        value: 0,
        duration: 2.0,
        ease: 'power3.out',
      }
    )

    // Animate distortion amplitude
    gsap.fromTo(
      this.uniforms.uDistortionAmplitude,
      { value: 0 },
      {
        value: 1.5,
        duration: 2.0,
        ease: 'power2.inOut',
      }
    )

    // Animate distortion frequency
    gsap.fromTo(
      this.uniforms.uDistortionFrequency,
      { value: 0.05 },
      {
        value: 0.2,
        duration: 3.0,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: -1,
      }
    )
  }

  setStats() {
    try {
      this.stats = new Stats()
      this.stats.showPanel(0)
      document.body.appendChild(this.stats.dom)
    } catch (error) {
      console.error('Error setting up stats:', error)
      this.stats = null
    }
  }

  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true })
  }

  handleTouchMove = () => {
    this.ray.setFromCamera(this.mouse, this.camera)
    this.intersects = this.ray.intersectObjects([this.mesh])

    if (this.intersects.length) {
      const uv = new Vector2(0.5, 0.5)
      uv.x = this.intersects[0].point.x / this.nbLines + 0.5
      uv.y = this.intersects[0].point.y / this.nbColumns + 0.5
      this.touch.addTouch(uv)
    }
  }

  setRaycaster() {
    this.ray = new Raycaster()
    this.mouse = new Vector2()

    if (isTouch()) {
      window.addEventListener('touchmove', this.handleTouchMove)
    }
  }

  setPostProcessing() {
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Retro-style bloom effect with reduced intensity
    const bloomEffect = new BloomEffect({
      intensity: 2.5,
      luminanceThreshold: 0.05,
      luminanceSmoothing: 0.7,
      blendFunction: BlendFunction.SCREEN
    });

    // Chromatic aberration effect
    this.chromaticAberrationEffect = new ChromaticAberrationEffect({
      offset: new Vector2(0.004, 0.004),
    });

    // Glitch effect
    this.glitchEffect = new GlitchEffect({
      chromaticAberrationOffset: new Vector2(3, 3),
      delay: new Vector2(1.5, 3.5),
      duration: new Vector2(0.2, 0.4), // Shorter duration for less processing
      strength: new Vector2(0.3, 1.0),
      mode: GlitchMode.CONSTANT_WILD
    });

    // Vignette effect for a classic look
    const vignetteEffect = new VignetteEffect({
      eskil: false,
      offset: 0.2, // Increased offset for a more pronounced vignette
      darkness: 0.4 // Reduced darkness for a softer vignette
    });

    // Noise effect
    const noiseEffect = new NoiseEffect({
      blendFunction: BlendFunction.OVERLAY,
      premultiply: true
    });
    noiseEffect.blendMode.opacity.value = 0.05;

    const smaaEffect = new SMAAEffect();

    // Add effects in separate passes
    this.composer.addPass(new EffectPass(this.camera, bloomEffect));
    this.composer.addPass(new EffectPass(this.camera, this.chromaticAberrationEffect));
    this.composer.addPass(new EffectPass(this.camera, vignetteEffect, noiseEffect, smaaEffect));
    this.composer.addPass(new EffectPass(this.camera, this.glitchEffect));
  }

  setLights() {
    this.light = new PointLight('#ffffff', 1)
    this.light.position.set(0, 0, 100)
    this.scene.add(this.light)
  }

  updateFrustum() {
    this.projScreenMatrix.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse)
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix)
  }

  updateParticleVisibility() {
    if (!this.mesh) return

    const positions = this.mesh.geometry.attributes.position
    const visibility = this.mesh.geometry.attributes.visibility

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i)
      const y = positions.getY(i)
      const z = positions.getZ(i)

      if (this.frustum.containsPoint({ x, y, z })) {
        visibility.setX(i, 1.0)
      } else {
        visibility.setX(i, 0.0)
      }
    }

    visibility.needsUpdate = true
  }

  draw = (time) => {
    if (this.stats) this.stats.begin()

    if (this.controls) this.controls.update()

    // Update frustum and particle visibility
    this.updateFrustum()
    this.updateParticleVisibility()

    if (this.uniforms && this.uniforms.uTime) {
      this.uniforms.uTime.value = time * 0.001
    } else {
      console.warn('uTime uniform is not defined')
    }

    this.renderer.render(this.scene, this.camera)
    this.composer.render()

    this.touch.update()

    if (this.stats) this.stats.end()
    this.raf = window.requestAnimationFrame(this.draw)

    // Update random seed periodically for variety in distortion
    if (Math.random() < 0.01) { // Change seed roughly every 100 frames
      this.uniforms.uRandomSeed.value = Math.random() * 100
    }
  }

  handleResize = () => {
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()

    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(this.width, this.height)
    this.composer.setSize(this.width, this.height)

    this.uniforms.uScaleHeightPointSize.value = (this.dpr * this.height) / 2
    this.uniforms.uResolution.value.set(this.width, this.height)
  }
}