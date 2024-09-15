// ===== Filename: src/js/components/scene.js =====

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
  LinearFilter,
  ClampToEdgeWrapping,
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
import { sortPoints } from '@/js/utils/three'
import { isTouch } from '@/js/utils/isTouch'

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
    pointSize: 1.5,
  }

  constructor() {
    this.canvas = document.querySelector('.scene')
    if (!this.canvas) {
      throw new Error('Canvas element with class "scene" not found')
    }
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Create touch texture for mouse particles animation
    this.touch = new TouchTexture()

    this.init().catch(error => {
      console.error('Initialization failed:', error)
      // Optionally, display an error message to the user
    })
  }

  init = async () => {
    try {
      // Preload assets before initiating the scene
      const assets = [
        { name: 'sprite1', texture: './img/sprite1.jpg', flipY: true },
        { name: 'sprite2', texture: './img/sprite2.jpg', flipY: true },
      ]

      await LoaderManager.load(assets)
      console.log('Loaded Textures:', LoaderManager.assets)

      this.setStats()
      this.setGUI()
      this.setScene()
      this.setRender()
      this.setCamera()
      this.setControls()
      this.setParticlesGrid()
      // this.setAxesHelper()
      this.setRaycaster()

      this.handleResize()

      // start RAF
      this.events()

      this.animateIn()
      this.uniforms.uProgress.value = 1.0
    } catch (error) {
      console.error('Error during initialization:', error)
      throw error // Re-throw to be caught in the constructor
    }
  }

  /**
   * Our Webgl renderer, an object that will draw everything in our canvas
   * https://threejs.org/docs/?q=rend#api/en/renderers/WebGLRenderer
   */
  setRender() {
    try {
      this.renderer = new WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
      })
      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(window.devicePixelRatio || 1)
    } catch (error) {
      console.error('Error setting up WebGL renderer:', error)
      throw error
    }
  }

  /**
   * This is our scene, we'll add any object
   * https://threejs.org/docs/?q=scene#api/en/scenes/Scene
   */
  setScene() {
    this.scene = new Scene()
    // this.scene.background = new Color(0xffffff)
  }

  /**
   * Our Perspective camera, this is the point of view that we'll have
   * of our scene.
   * A perscpective camera is mimicing the human eyes so something far we'll
   * look smaller than something close
   * https://threejs.org/docs/?q=pers#api/en/cameras/PerspectiveCamera
   */
  setCamera() {
    const aspectRatio = this.width / this.height
    const fieldOfView = 60
    const nearPlane = 0.1
    const farPlane = 10000

    // set classic camera
    this.camera = new PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane)
    this.camera.position.set(0, 0, 125)
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.camera)
  }

  /**
   * Threejs controls to have controls on our scene
   * https://threejs.org/docs/?q=orbi#examples/en/controls/OrbitControls
   */
  setControls() {
    try {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement)
      this.controls.enableDamping = true
      this.controls.enableRotate = true // Enable rotation for user interaction
      this.controls.enableZoom = true   // Enable zoom for user interaction
      // this.controls.autoRotate = true
      // this.controls.dampingFactor = 0.04
    } catch (error) {
      console.error('Error setting up OrbitControls:', error)
      // Optionally, you might want to continue without controls
      this.controls = null
    }
  }

  setParticlesGrid() {
    try {
      // Create a grid of particles

      // Create a geometry
      const geometry = new BufferGeometry()

      const particles = []
      const initPositions = []
      const multiplier = 16
      const nbColumns = 9 * multiplier // 144
      const nbLines = 16 * multiplier  // 256

      this.nbColumns = nbColumns
      this.nbLines = nbLines

      // Center the grid
      const halfColumn = nbColumns / 2
      const halfLines = nbLines / 2

      // For each line/column, add a "particle" to the array
      for (let i = 0; i < nbLines; i++) {
        for (let y = 0; y < nbColumns; y++) {
          const point = [i - halfLines, y - halfColumn, 0.0] // Centered coordinates

          // Initialize Z with some random depth for displacement effect
          const initPoint = [i - halfLines, y - halfColumn, randFloat(50, 150)] // Reduced z range for better visualization

          particles.push(...point) // Spread the coordinates for Float32Array
          initPositions.push(...initPoint)
        }
      }

      const vertices = new Float32Array(particles)
      const initPositionsFloat = new Float32Array(initPositions)

      // Add the particles to the array as "position" and "initPosition"
      // itemSize = 3 because there are 3 values (components) per vertex
      geometry.setAttribute('position', new BufferAttribute(vertices, 3))
      geometry.setAttribute('initPosition', new BufferAttribute(initPositionsFloat, 3))

      geometry.center()

      this.dpr = 2 // device pixel ratio
      this.uniforms = {
        uPointSize: { value: this.guiObj.pointSize },
        uNbLines: { value: nbLines },
        uNbColumns: { value: nbColumns },
        uProgress: { value: this.guiObj.uProgress },
        uTime: { value: 0.0 },
        uTouch: { value: this.touch.texture },
        uScaleHeightPointSize: { value: (this.dpr * this.height) / 2.0 },

        // Sprite sheet uniforms
        uFrameIndex: { value: 0 },
        uSpriteCols: { value: 5 },
        uSpriteRows: { value: 10 },
        uTotalFrames: { value: 100 },

        // Sprite sheet textures
        uSprite1: { value: LoaderManager.assets['sprite1'].texture }, // sampler2D
        uSprite2: { value: LoaderManager.assets['sprite2'].texture }, // sampler2D

        // New uniform for active sprite sheet in vertex shader
        uSpriteSheet: { value: LoaderManager.assets['sprite1'].texture }, // Initially sprite1
      }

      // Create a custom ShaderMaterial for this geometry
      const customMaterial = new ShaderMaterial({
        uniforms: this.uniforms,
        vertexShader,
        fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      })
      this.mesh = new Points(geometry, customMaterial)

      this.scene.add(this.mesh)
    } catch (error) {
      console.error('Error setting up particle grid:', error)
      throw error
    }
  }

  animateIn() {
    // Animate progress uniform
    gsap.fromTo(
      this.uniforms.uProgress,
      {
        value: 0,
      },
      {
        value: 1,
        duration: 2.5,
        ease: 'Power4.easeOut',
      }
    )
  }

  /**
   * Axes Helper
   * https://threejs.org/docs/?q=Axesh#api/en/helpers/AxesHelper
   */
  setAxesHelper() {
    const axesHelper = new AxesHelper(3)
    this.scene.add(axesHelper)
  }

  /**
   * Build stats to display fps
   */
  setStats() {
    try {
      this.stats = new Stats()
      this.stats.showPanel(0)
      document.body.appendChild(this.stats.dom)
    } catch (error) {
      console.error('Error setting up stats:', error)
      // Optionally continue without stats
      this.stats = null
    }
  }

  setGUI() {
    try {
      const gui = new GUI()
      gui.add(this.guiObj, 'uProgress', 0, 1, 0.01).onChange(() => {
        this.uniforms.uProgress.value = this.guiObj.uProgress
      }).name('Progress').listen()

      // Ensure progress ends at 1
      gsap.to(this.guiObj, {
        uProgress: 1,
        duration: 2.5,
        ease: 'Power4.easeOut',
        onUpdate: () => {
          this.uniforms.uProgress.value = this.guiObj.uProgress
        }
      })
      // Removed texture selection GUI as frame index now controls sprite sheets
      gui.add(this.guiObj, 'pointSize', 0, 2).onChange(() => {
        this.uniforms.uPointSize.value = this.guiObj.pointSize
      })
    } catch (error) {
      console.error('Error setting up GUI:', error)
      // Optionally continue without GUI
    }
  }

  /**
   * List of events
   */
  events() {
    window.addEventListener('resize', this.handleResize, { passive: true })
    this.draw(0)
  }

  // EVENTS

  /**
   * Request animation frame function
   * This function is called 60/time per seconds with no performance issue
   * Everything that happens in the scene is drawn here
   * @param {Number} time
   */
  draw = (time) => {
    if (this.stats) this.stats.begin()

    if (this.controls) this.controls.update() // for damping

    sortPoints(this.mesh, this.camera) // sort points to avoid render order issues due to transparency

    // Update uTime
    this.uniforms.uTime.value = time * 0.001 // Convert to seconds

    this.renderer.render(this.scene, this.camera) // render scene

    this.touch.update() // update touch texture

    if (this.stats) this.stats.end()
    this.raf = window.requestAnimationFrame(this.draw)
  }

  /**
   * On resize, we need to adapt our camera based
   * on the new window width and height and the renderer
   */
  handleResize = () => {
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Update camera
    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()

    this.renderer.setPixelRatio(this.dpr)
    this.renderer.setSize(this.width, this.height)

    this.uniforms.uScaleHeightPointSize.value = (this.dpr * this.height) / 2
  }

  setRaycaster() {
    this.ray = new Raycaster()
    this.mouse = new Vector2()

    // get Mouse position

    if (isTouch()) {
      window.addEventListener('touchmove', this.handleTouchMove)
    } else {
      window.addEventListener('mousemove', this.handleMouseMove)
    }
  }

  handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;
    this.mouse.x = x;
    this.mouse.y = y;

    // Calculate normalized mouse X position (0 to 1)
    const normalizedX = e.clientX / window.innerWidth;

    // Map to frame index (float)
    const frameIndex = normalizedX * (this.uniforms.uTotalFrames.value - 1);

    // Smoothly interpolate the frame index using GSAP for smoother transitions
    gsap.to(this.uniforms.uFrameIndex, {
      value: frameIndex,
      duration: 0.3, // Adjust duration as needed
      ease: 'power2.out',
      onUpdate: () => {
        // Determine active sprite sheet based on frameIndex
        const framesPerSheet = 50.0; // As each sheet has 50 frames
        const sheetIndex = Math.floor(this.uniforms.uFrameIndex.value / framesPerSheet);

        if (sheetIndex < 1) {
          this.uniforms.uSpriteSheet.value = this.uniforms.uSprite1.value;
        } else {
          this.uniforms.uSpriteSheet.value = this.uniforms.uSprite2.value;
        }

        // Calculate frame within the active sprite sheet
        const frameInSheet = Math.floor(this.uniforms.uFrameIndex.value % framesPerSheet);

        // Calculate column and row for current frame
        const frameCol = frameInSheet % this.uniforms.uSpriteCols.value;
        const frameRow = Math.floor(frameInSheet / this.uniforms.uSpriteCols.value);

        // Calculate UV offset for the current frame
        const uOffset = frameCol / this.uniforms.uSpriteCols.value;
        const vOffset = frameRow / this.uniforms.uSpriteRows.value;

        this.uniforms.uTexOffset.value.set(uOffset, vOffset);
      },
    });

    // From the mouse position, use a raycaster to know when the 2D plane is being touched
    this.ray.setFromCamera(this.mouse, this.camera);
    this.intersects = this.ray.intersectObjects([this.mesh]);

    if (this.intersects.length) {
      const uv = new Vector2(0.5, 0.5);
      uv.x = this.intersects[0].point.x / this.nbLines + 0.5;
      uv.y = this.intersects[0].point.y / this.nbColumns + 0.5;
      this.touch.addTouch(uv);
    }
  }

  handleTouchMove = (e) => {
    // Same as mouse move but for touch devices
    const x = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
    const y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1;

    this.mouse.x = x;
    this.mouse.y = y;

    // Calculate normalized mouse X position (0 to 1)
    const normalizedX = e.touches[0].clientX / window.innerWidth;

    // Map to frame index (float)
    const frameIndex = normalizedX * (this.uniforms.uTotalFrames.value - 1);

    // Smoothly interpolate the frame index using GSAP
    gsap.to(this.uniforms.uFrameIndex, {
      value: frameIndex,
      duration: 0.3, // Adjust duration as needed
      ease: 'power2.out',
      onUpdate: () => {
        // Determine active sprite sheet based on frameIndex
        const framesPerSheet = 50.0; // As each sheet has 50 frames
        const sheetIndex = Math.floor(this.uniforms.uFrameIndex.value / framesPerSheet);

        if (sheetIndex < 1) {
          this.uniforms.uSpriteSheet.value = this.uniforms.uSprite1.value;
        } else {
          this.uniforms.uSpriteSheet.value = this.uniforms.uSprite2.value;
        }

        // Calculate frame within the active sprite sheet
        const frameInSheet = Math.floor(this.uniforms.uFrameIndex.value % framesPerSheet);

        // Calculate column and row for current frame
        const frameCol = frameInSheet % this.uniforms.uSpriteCols.value;
        const frameRow = Math.floor(frameInSheet / this.uniforms.uSpriteCols.value);

        // Calculate UV offset for the current frame
        const uOffset = frameCol / this.uniforms.uSpriteCols.value;
        const vOffset = frameRow / this.uniforms.uSpriteRows.value;

        this.uniforms.uTexOffset.value.set(uOffset, vOffset);
      },
    });

    // From the mouse position, use a raycaster to know when the 2D plane is being touched
    this.ray.setFromCamera(this.mouse, this.camera);
    this.intersects = this.ray.intersectObjects([this.mesh]);

    if (this.intersects.length) {
      const uv = new Vector2(0.5, 0.5);
      uv.x = this.intersects[0].point.x / this.nbLines + 0.5;
      uv.y = this.intersects[0].point.y / this.nbColumns + 0.5;
      this.touch.addTouch(uv);
    }
  }
}