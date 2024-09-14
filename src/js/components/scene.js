import {
  Color,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  AxesHelper,
  BufferGeometry,
  BufferAttribute,
  Points,
  ShaderMaterial,
  Raycaster,
  Vector2,
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
    texture: 'me',
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
        { name: 'me', texture: './img/me.png' },
        { name: 'sprite1', texture: './img/sprite1.jpg' },
        { name: 'sprite2', texture: './img/sprite2.jpg' },
      ]

      await LoaderManager.load(assets)

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
    this.camera.position.y = 0
    this.camera.position.x = 0
    this.camera.position.z = 125
    this.camera.lookAt(0, 0, 0)

    this.scene.add(this.camera)
  }

  /**
   * Threejs controls to have controls on our scene
   * https://threejs.org/docs/?q=orbi#examples/en/controls/OrbitControls
   */
  setControls() {
    try {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.enableRotate = true; // Disable rotation if not needed
      this.controls.enableZoom = false;   // Disable zoom if not needed
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

      // create a geometry
      const geometry = new BufferGeometry()

      const particles = []
      const initPositions = []
      const multiplier = 18
      const nbColumns = 9 * multiplier
      const nbLines = 16 * multiplier

      this.nbColumns = nbColumns
      this.nbLines = nbLines

      const halfColumn = nbColumns / 2
      const halfLines = nbLines / 2

      // for each line / column add a "particule" to the array

      for (let i = 0; i < nbLines; i++) {
        for (let y = 0; y < nbColumns; y++) {
          const point = [i, y, 0.0] // coordinates of each points

          // appear from Z
          const initPoint = [i - halfLines, y - halfColumn, randFloat(0, 500)]

          particles.push(...point) // spread the coordinates for Float32Array
          initPositions.push(...initPoint)
        }
      }

      const vertices = new Float32Array(particles)
      const initPositionsFloat = new Float32Array(initPositions)

      // console.log(particles)
      // Add the particles to the array as "position" and "initPosition"
      // itemSize = 3 because there are 3 values (components) per vertex
      geometry.setAttribute('position', new BufferAttribute(vertices, 3))
      geometry.setAttribute('initPosition', new BufferAttribute(initPositionsFloat, 3))

      geometry.center()
      // const material = new MeshBasicMaterial({ color: 0xff0000 })

      this.dpr = 2
      this.uniforms = {
        uColor: { value: new Color(0xff0000) },
        uPointSize: { value: this.guiObj.pointSize },
        uTexture: { value: LoaderManager.assets[this.guiObj.texture].texture },
        uNbLines: { value: nbLines },
        uNbColumns: { value: nbColumns },
        uProgress: { value: this.guiObj.uProgress },
        uTime: { value: 0 },
        uTouch: { value: this.touch.texture },
        uScaleHeightPointSize: { value: (this.dpr * this.height) / 2 },
      }

      // create a custom shaderMaterial for this geometry
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
    // animate progress uniform
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
      gui.add(this.guiObj, 'uProgress', 0, 1).onChange(() => {
        this.uniforms.uProgress.value = this.guiObj.uProgress
      })
      gui
        .add(this.guiObj, 'texture', { me: 'me' })
        .onChange(() => {
          this.uniforms.uTexture.value = LoaderManager.assets[this.guiObj.texture].texture
          this.animateIn()
        })

      gui.add(this.guiObj, 'pointSize', 0, 4).onChange(() => {
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
   * Everything that happens in the scene is drawed here
   * @param {Number} now
   */
  draw = (time) => {
    if (this.stats) this.stats.begin();

    if (this.controls) this.controls.update(); // for damping

    sortPoints(this.mesh, this.camera); // sort points to avoid render order issues due to transparency

    // Update uTime
    this.uniforms.uTime.value = time * 0.001; // Convert to seconds

    this.renderer.render(this.scene, this.camera); // render scene

    this.touch.update(); // update touch texture

    if (this.stats) this.stats.end();
    this.raf = window.requestAnimationFrame(this.draw);
  };

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
    const x = (e.clientX / window.innerWidth) * 2 - 1
    const y = -(e.clientY / window.innerHeight) * 2 + 1
    this.mouse.x = x
    this.mouse.y = y

    // from the mouse position, use a raycaster to know when the 2D plane is being touch

    this.ray.setFromCamera(this.mouse, this.camera)
    this.intersects = this.ray.intersectObjects([this.mesh])

    if (this.intersects.length) {
      const uv = new Vector2(0.5, 0.5)
      uv.x = this.intersects[0].point.x / this.nbLines + 0.5
      uv.y = this.intersects[0].point.y / this.nbColumns + 0.5
      this.touch.addTouch(uv)
    }
  }

  handleTouchMove = (e) => {
    // same as mouse move but for touch devices
    const x = (e.touches[0].clientX / window.innerWidth) * 2 - 1
    const y = -(e.touches[0].clientY / window.innerHeight) * 2 + 1

    this.mouse.x = x
    this.mouse.y = y

    this.ray.setFromCamera(this.mouse, this.camera)
    this.intersects = this.ray.intersectObjects([this.mesh])

    if (this.intersects.length) {
      const uv = new Vector2(0.5, 0.5)
      uv.x = this.intersects[0].point.x / this.nbLines + 0.5
      uv.y = this.intersects[0].point.y / this.nbColumns + 0.5
      this.touch.addTouch(uv)
    }
  }
}
