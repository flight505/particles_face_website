// Importing necessary modules and libraries

import {
  Color,
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
  PointLight, // Added PointLight
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'stats-js'
import LoaderManager from '@/js/managers/LoaderManager'
import GUI from 'lil-gui'
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
  HueSaturationEffect,
  SMAAEffect,
  SMAAPreset,
  DotScreenEffect, // Corrected import
  GlitchEffect, // Corrected import
} from 'postprocessing'

// The MainScene class is a Three.js-based scene manager. It initializes various properties such as canvas, renderer, scene,
export default class MainScene {
  canvas
  renderer
  scene
  camera
  controls
  stats
  width
  height
  guiObj = {
    uProgress: 0,
    pointSize: 0.5,
  }
  mouse = new Vector2(0, 0) // Initialize mouse position
  currentFrameIndex = 49 // Start with the forward-facing frame
  dotScreenEffect
  glitchEffect

  constructor() {
    this.canvas = document.querySelector('.scene')
    if (!this.canvas) {
      throw new Error('Canvas element with class "scene" not found')
    }
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.touch = new TouchTexture()
    this.init().catch(error => {
      console.error('Initialization failed:', error)
    })
  }

  init = async () => {
    try {
      // Preload assets
      const assets = [
        { name: 'sprite1', texture: './img/right1_sprite_sheet.png', flipY: true },
        { name: 'sprite2', texture: './img/left1_sprite_sheet.png', flipY: true },
      ]

      await LoaderManager.load(assets)
      console.log('Loaded Textures:', LoaderManager.assets)

      // Initialize components
      this.setStats()
      this.setGUI()
      this.setScene()
      this.setRenderer()
      this.setCamera()
      this.setControls()
      this.setParticlesGrid()
      this.setRaycaster() // Ensure setRaycaster is called
      this.setPostProcessing()
      this.setLights() // Ensure lights are set up
      this.handleResize()

      // Start rendering
      this.events()
      this.animateIn()
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
      })
      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(window.devicePixelRatio || 1)
      this.renderer.setClearColor('#000000', 1)
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
    this.camera.position.set(0, 0, 125)
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

      // Add additional random particles
      this.addRandomParticles()
    } catch (error) {
      console.error('Error setting up particle grid:', error)
      throw error
    }
  }

  addRandomParticles() {
    const randomParticleCount = 1000
    const randomParticles = []
    const randomInitPositions = []
    const randoms = []
    const colorRandoms = []

    for (let i = 0; i < randomParticleCount; i++) {
      const x = randFloat(-this.nbColumns / 2, this.nbColumns / 2)
      const y = randFloat(-this.nbLines / 2, this.nbLines / 2)
      const z = randFloat(-50, 50)
      randomParticles.push(x, y, z)
      randomInitPositions.push(x, y, z)
      randoms.push(Math.random())
      colorRandoms.push(Math.random())
    }

    const randomGeometry = new BufferGeometry()
    randomGeometry.setAttribute('position', new BufferAttribute(new Float32Array(randomParticles), 3))
    randomGeometry.setAttribute('initPosition', new BufferAttribute(new Float32Array(randomInitPositions), 3))
    randomGeometry.setAttribute('randoms', new BufferAttribute(new Float32Array(randoms), 1))
    randomGeometry.setAttribute('colorRandoms', new BufferAttribute(new Float32Array(colorRandoms), 1))
    randomGeometry.center()

    const customMaterial = new ShaderMaterial({
      uniforms: {
        uPointSize: { value: this.guiObj.pointSize },
        uTime: { value: 0.0 },
        uScaleHeightPointSize: { value: (this.dpr * this.height) / 2.0 },
      },
      vertexShader: randomVertexShader,
      fragmentShader: randomFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    })

    this.randomMesh = new Points(randomGeometry, customMaterial)
    this.scene.add(this.randomMesh)
  }

  generateParticleAttributes() {
    const particles = []
    const initPositions = []
    const randoms = []
    const colorRandoms = []
    const multiplier = 28
    const nbColumns = 9 * multiplier // 144 columns
    const nbLines = 16 * multiplier  // 384 lines

    this.nbColumns = nbColumns
    this.nbLines = nbLines

    // Center the grid
    const halfColumn = nbColumns / 2
    const halfLines = nbLines / 2

    // Generate particles
    for (let i = 0; i < nbLines; i++) {
      for (let y = 0; y < nbColumns; y++) {
        const point = [i - halfLines, y - halfColumn, 0.0]
        const initPoint = [i - halfLines, y - halfColumn, randFloat(50, 150)]
        particles.push(...point)
        initPositions.push(...initPoint)
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
    this.dpr = 2 // Device pixel ratio
    this.uniforms = {
      uPointSize: { value: this.guiObj.pointSize }, // Particle size
      uNbLines: { value: this.nbLines },
      uNbColumns: { value: this.nbColumns },
      uProgress: { value: this.guiObj.uProgress }, // Animation progress
      uTime: { value: 0.0 },
      uTouch: { value: this.touch.texture },
      uScaleHeightPointSize: { value: (this.dpr * this.height) / 2.0 },

      // Sprite sheet uniforms
      uFrameIndex: { value: this.currentFrameIndex },
      uSpriteCols: { value: 5 },
      uSpriteRows: { value: 10 },
      uTotalFrames: { value: 100 },

      // Sprite sheet textures
      uSprite1: { value: LoaderManager.assets['sprite1'].texture },
      uSprite2: { value: LoaderManager.assets['sprite2'].texture },

      // Active sprite sheet and UV offset
      uSpriteSheet: { value: LoaderManager.assets['sprite1'].texture },
      uTexOffset: { value: new Vector2(0, 0) },

      // Displacement uniforms
      uDisplacementScale: { value: 30.0 }, // Controls Z-axis displacement intensity
      uDisplacementBlend: { value: 0.0 },  // Blend factor for displacement effect
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
      actualFrame = 49 - actualFrame // Reverse order for sprite1
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

    // Debugging logs
    console.log('Mouse X:', mouseX, 'Mouse Y:', mouseY)
    console.log('Mesh:', this.mesh)


    const deltaX = mouseX - this.mouse.x
    const frameChangeSpeed = 60.0

    this.currentFrameIndex += deltaX * frameChangeSpeed
    this.currentFrameIndex = Math.max(0, Math.min(this.currentFrameIndex, this.uniforms.uTotalFrames.value - 1))

    this.mouse.x = mouseX
    this.mouse.y = mouseY

    // Initialize GSAP quickTo for smooth rotation
    const rotateX = gsap.quickTo(this.mesh.rotation, 'x', { duration: 0.5, ease: 'circ.out' })
    const rotateY = gsap.quickTo(this.mesh.rotation, 'y', { duration: 0.5, ease: 'circ.out' })

    // Apply rotation based on mouse movement
    rotateX(this.mouse.y * Math.PI / 64) // Tilt up/down
    rotateY(this.mouse.x * Math.PI / 64) // Turn left/right

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

    // Update light position based on mouse movement
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
        duration: 2.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          this.uniforms.uDisplacementBlend.value = this.uniforms.uProgress.value
        },
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

  setGUI() {
    try {
      const gui = new GUI()
      gui.add(this.guiObj, 'uProgress', 0, 1, 0.01).onChange(() => {
        this.uniforms.uProgress.value = this.guiObj.uProgress
      }).name('Progress').listen()

      gsap.to(this.guiObj, {
        uProgress: 1,
        duration: 2.5,
        ease: 'Power4.easeOut',
        onUpdate: () => {
          this.uniforms.uProgress.value = this.guiObj.uProgress
        },
      })
      gui.add(this.guiObj, 'pointSize', 0, 2).onChange(() => {
        this.uniforms.uPointSize.value = this.guiObj.pointSize
      })

      // Add controls for DotScreenEffect
      gui.add(this.dotScreenEffect, 'enabled').name('DotScreen Effect')
      gui.add(this.dotScreenEffect.uniforms.get('scale'), 'value', 0.1, 2).name('DotScreen Scale')

      // Add controls for GlitchEffect
      gui.add(this.glitchEffect, 'enabled').name('Glitch Effect')
    } catch (error) {
      console.error('Error setting up GUI:', error)
    }
  }

  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true })
    this.draw(0)
  }

  handleTouchMove = (e) => {
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
    this.composer = new EffectComposer(this.renderer)
    this.renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(this.renderPass)

    // Create multiple BloomEffect instances with different intensities
    const bloom1 = new BloomEffect({
      blendFunction: BlendFunction.SCREEN,
      intensity: 1.9,
      luminanceThreshold: 0.1,
      radius: 1.1,
      luminanceSmoothing: 0.15,
      mipmapBlur: true,
    })

    const bloom2 = new BloomEffect({
      blendFunction: BlendFunction.SCREEN,
      intensity: 3.2,
      luminanceThreshold: 0.1,
      radius: 0.5,
      luminanceSmoothing: 0.15,
      mipmapBlur: true,
    })

    const bloom3 = new BloomEffect({
      blendFunction: BlendFunction.SCREEN,
      intensity: 1.2,
      luminanceThreshold: 0.1,
      radius: 0.5,
      luminanceSmoothing: 0.15,
      mipmapBlur: true,
    })

    this.chromaticAberrationEffect = new ChromaticAberrationEffect({
      offset: new Vector2(0.002, 0.02),
      radialModulation: true,
      modulationOffset: 0.7,
    })

    this.hueSaturationEffect = new HueSaturationEffect({
      hue: -0.1,
      saturation: 0.25,
    })

    this.smaaAliasEffect = new SMAAEffect({ preset: SMAAPreset.ULTRA })

    // Add bloom and hue/saturation effects to the first EffectPass
    this.composer.addPass(new EffectPass(this.camera, bloom1, bloom2, bloom3, this.hueSaturationEffect, this.smaaAliasEffect))

    // Add chromatic aberration effect to a separate EffectPass
    this.composer.addPass(new EffectPass(this.camera, this.chromaticAberrationEffect))

    // Add DotScreenEffect
    // this.dotScreenEffect = new DotScreenEffect({ scale: 0.0005 })
    // this.composer.addPass(new EffectPass(this.camera, this.dotScreenEffect))

    // Add GlitchEffect
    this.glitchEffect = new GlitchEffect()
    this.composer.addPass(new EffectPass(this.camera, this.glitchEffect))
  }

  setLights() {
    this.light = new PointLight('#ffffff', 1) // Corrected usage
    this.light.position.set(0, 0, 100)
    this.scene.add(this.light)
  }

  draw = (time) => {
    if (this.stats) this.stats.begin()

    if (this.controls) this.controls.update()

    this.uniforms.uTime.value = time * 0.001

    if (this.randomMesh) {
      this.randomMesh.material.uniforms.uTime.value = time * 0.001
    }

    this.renderer.render(this.scene, this.camera)
    this.composer.render()

    this.touch.update()

    if (this.stats) this.stats.end()
    this.raf = window.requestAnimationFrame(this.draw)
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
  }
}