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
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'stats-js'
import LoaderManager from '@/js/managers/LoaderManager'
import GUI from 'lil-gui'
import vertexShader from '@/js/glsl/main.vert'
import fragmentShader from '@/js/glsl/main.frag'
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
        { name: 'sprite1', texture: './img/right1_sprite_sheet.jpg', flipY: true },
        { name: 'sprite2', texture: './img/left1_sprite_sheet.jpg', flipY: true },
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
      this.setRaycaster()
      this.setPostProcessing()
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
    const multiplier = 24
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
      uDisplacementScale: { value: 40.0 }, // Controls Z-axis displacement intensity
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

  handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1
    const y = -(e.clientY / window.innerHeight) * 2 + 1

    const deltaX = x - this.mouse.x
    const deltaY = y - this.mouse.y
    const frameChangeSpeed = 60.0

    this.currentFrameIndex += deltaX * frameChangeSpeed
    this.currentFrameIndex = Math.max(0, Math.min(this.currentFrameIndex, this.uniforms.uTotalFrames.value - 1))

    this.mouse.x = x
    this.mouse.y = y

    const rotateX = gsap.quickTo(this.mesh.rotation, 'x', { duration: 0.5, ease: 'circ.out' })
    const rotateY = gsap.quickTo(this.mesh.rotation, 'y', { duration: 0.5, ease: 'circ.out' })

    rotateX(this.mouse.y * Math.PI / 64)
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
      uv.x = this.intersects[0].point.x / this.nbLines + 0.5
      uv.y = this.intersects[0].point.y / this.nbColumns + 0.5
      this.touch.addTouch(uv)
    }

    const tiltAngle = deltaY * Math.PI / 4
    this.mesh.rotation.x = tiltAngle
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
    } catch (error) {
      console.error('Error setting up GUI:', error)
    }
  }

  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true })
    this.draw(0)
  }

  draw = (time) => {
    if (this.stats) this.stats.begin()

    if (this.controls) this.controls.update()

    this.uniforms.uTime.value = time * 0.001

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

  setRaycaster() {
    this.ray = new Raycaster()
    this.mouse = new Vector2()

    if (isTouch()) {
      window.addEventListener('touchmove', this.handleTouchMove)
    } else {
      window.addEventListener('mousemove', this.handleMouseMove)
    }
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

  setPostProcessing() {
    this.composer = new EffectComposer(this.renderer)
    this.renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(this.renderPass)

    this.bloomEffect = new BloomEffect({
      blendFunction: BlendFunction.SCREEN,
      intensity: 0.1,
      luminanceThreshold: 0.9,
      radius: 0.8,
      luminanceSmoothing: 0.15,
      mipmapBlur: true,
    })

    this.chromaticAberrationEffect = new ChromaticAberrationEffect({
      offset: new Vector2(0.001, 0.001),
      radialModulation: true,
      modulationOffset: 0.15,
    })

    this.composer.addPass(new EffectPass(this.camera, this.bloomEffect, this.chromaticAberrationEffect))
  }
}