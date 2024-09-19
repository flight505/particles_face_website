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
import { sortPoints } from '@/js/utils/three'
import { isTouch } from '@/js/utils/isTouch'
import { BloomEffect, ChromaticAberrationEffect, EffectComposer, RenderPass, EffectPass, BlendFunction } from "postprocessing";


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

  constructor() {
    this.canvas = document.querySelector('.scene')
    if (!this.canvas) {
      throw new Error('Canvas element with class "scene" not found')
    }
    this.width = window.innerWidth
    this.height = window.innerHeight
    // Create touch texture for mouse particles animation
    this.touch = new TouchTexture()
    this.currentFrameIndex = 49; // Start with the forward-facing frame
    this.mouse = new Vector2(0, 0); // Initialize mouse at center
    this.init().catch(error => {
      console.error('Initialization failed:', error)
      // Optionally, display an error message to the user
    })
  }

  init = async () => {
    try {
      // Preload assets before initiating the scene
      const assets = [
        { name: 'sprite1', texture: './img/right1_sprite_sheet.jpg', flipY: true },
        { name: 'sprite2', texture: './img/left1_sprite_sheet.jpg', flipY: true },
      ]

      await LoaderManager.load(assets)
      console.log('Loaded Textures:', LoaderManager.assets)
      this.setStats()
      this.setGUI()
      this.setScene()
      this.setRender() // Initialize renderer before controls and particles grid
      this.setCamera()
      this.setControls()
      this.setParticlesGrid()
      this.setRaycaster()
      this.setPostProcessing()
      this.handleResize()
      this.setRender()

      // start RAF
      this.events()
      this.animateIn()
    } catch (error) {
      console.error('Error during initialization:', error)
      throw error // Re-throw to be caught in the constructor
    }
  }

  // Our Webgl renderer, an object that will draw everything in our canvas
  setRender() {
    try {
      this.renderer = new WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
      })
      this.renderer.setSize(this.width, this.height)
      this.renderer.setPixelRatio(window.devicePixelRatio || 1)
      this.renderer.setClearColor('#000000', 1) // Moved setClearColor here
    } catch (error) {
      console.error('Error setting up WebGL renderer:', error)
      throw error
    }
  }

  setPostProcessing() {
    this.composer = new EffectComposer(this.renderer)
    this.renderPass = new RenderPass(this.scene, this.camera)
    this.composer.addPass(this.renderPass)

    this.bloomEffect = new BloomEffect({
      blendFunction: BlendFunction.SCREEN,
      intensity: 1.4,
      luminanceThreshold: 0.9,
      radius: 0.8,
      luminanceSmoothing: 0.025,
      mipmapBlur: true
    })

    this.chromaticAberrationEffect = new ChromaticAberrationEffect({
      offset: new Vector2(0.001, 0.001), // Adjust the offset as needed
      radialModulation: true,
      modulationOffset: 0.15
    })

    this.composer.addPass(new EffectPass(this.camera, this.bloomEffect, this.chromaticAberrationEffect))
  }

  setScene() {
    this.scene = new Scene()
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
      const randoms = []
      const colorRandoms = []
      const multiplier = 24
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
          randoms.push(Math.random())
          colorRandoms.push(Math.random())
        }
      }

      const vertices = new Float32Array(particles)
      const initPositionsFloat = new Float32Array(initPositions)
      const randomsFloat = new Float32Array(randoms)
      const colorRandomsFloat = new Float32Array(colorRandoms)

      // Add the particles to the array as "position" and "initPosition"
      // itemSize = 3 because there are 3 values (components) per vertex
      geometry.setAttribute('position', new BufferAttribute(vertices, 3))
      geometry.setAttribute('initPosition', new BufferAttribute(initPositionsFloat, 3))
      geometry.setAttribute('randoms', new BufferAttribute(randomsFloat, 1))
      geometry.setAttribute('colorRandoms', new BufferAttribute(colorRandomsFloat, 1))

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
        uFrameIndex: { value: this.currentFrameIndex },
        uSpriteCols: { value: 5 },
        uSpriteRows: { value: 10 },
        uTotalFrames: { value: 100 },

        // Sprite sheet textures
        uSprite1: { value: LoaderManager.assets['sprite1'].texture }, // sampler2D
        uSprite2: { value: LoaderManager.assets['sprite2'].texture }, // sampler2D

        // New uniform for active sprite sheet in vertex shader
        uSpriteSheet: { value: LoaderManager.assets['sprite1'].texture }, // Initially sprite1
        uTexOffset: { value: new Vector2(0, 0) }, // We'll calculate this in updateFrameOffset

        // Displacement uniforms
        uDisplacementScale: { value: 40.0 }, // Adjust this value to control displacement intensity
        uDisplacementBlend: { value: 0.0 }, // Blend factor for displacement effect
      }

      this.updateFrameOffset(this.currentFrameIndex);

      // Create a custom ShaderMaterial for this geometry
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
    } catch (error) {
      console.error('Error setting up particle grid:', error)
      throw error
    }
  }

  updateFrameOffset(frameIndex) {
    const framesPerSheet = 50;
    const sheetIndex = Math.floor(frameIndex / framesPerSheet);
    let actualFrame = frameIndex % framesPerSheet;

    if (sheetIndex < 1) {
      this.uniforms.uSpriteSheet.value = this.uniforms.uSprite1.value;
      actualFrame = 49 - actualFrame; // Reverse order for sprite1
    } else {
      this.uniforms.uSpriteSheet.value = this.uniforms.uSprite2.value;
    }

    const frameCol = actualFrame % this.uniforms.uSpriteCols.value;
    const frameRow = Math.floor(actualFrame / this.uniforms.uSpriteCols.value);

    const uOffset = frameCol / this.uniforms.uSpriteCols.value;
    const vOffset = frameRow / this.uniforms.uSpriteRows.value;

    this.uniforms.uTexOffset.value.set(uOffset, vOffset);

    console.log(`Frame: ${frameIndex}, Sheet: ${sheetIndex}, Actual Frame: ${actualFrame}, Offset: (${uOffset}, ${vOffset})`);
  }

  handleMouseMove = (e) => {
    const x = (e.clientX / window.innerWidth) * 2 - 1;
    const y = -(e.clientY / window.innerHeight) * 2 + 1;

    const deltaX = x - this.mouse.x;
    const deltaY = y - this.mouse.y;
    const frameChangeSpeed = 60.0;

    this.currentFrameIndex += deltaX * frameChangeSpeed;
    this.currentFrameIndex = Math.max(0, Math.min(this.currentFrameIndex, this.uniforms.uTotalFrames.value - 1));

    this.mouse.x = x;
    this.mouse.y = y;

    // Use GSAP's quickTo for smoother face rotation
    const rotateX = gsap.quickTo(this.mesh.rotation, "x", { duration: 0.5, ease: "circ.out" });
    const rotateY = gsap.quickTo(this.mesh.rotation, "y", { duration: 0.5, ease: "circ.out" });

    rotateX(this.mouse.y * Math.PI / 64); // Adjust rotation based on mouse Y position
    rotateY(this.mouse.x * Math.PI / 64); // Adjust rotation based on mouse X position

    gsap.to(this.uniforms.uFrameIndex, {
      value: this.currentFrameIndex,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        this.updateFrameOffset(this.uniforms.uFrameIndex.value);
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

    // Tilt the particle grid based on mouse Y movement
    const tiltAngle = deltaY * Math.PI / 4; // Adjust the multiplier for desired tilt sensitivity
    this.mesh.rotation.x = tiltAngle;
  }

  animateIn() {
    // Animate progress uniform with smoother easing
    gsap.fromTo(
      this.uniforms.uProgress,
      {
        value: 0,
      },
      {
        value: 1,
        duration: 2.5,
        ease: 'power2.inOut', // Use a smoother easing function
        onUpdate: () => {
          // Gradually blend displacement effect
          this.uniforms.uDisplacementBlend.value = this.uniforms.uProgress.value;
        }
      }
    );
  }

  /**
   * Axes Helper
   * https://threejs.org/docs/?q=Axesh#api/en/helpers/AxesHelper
   */
  setAxesHelper() {
    const axesHelper = new AxesHelper(3);
    this.scene.add(axesHelper);
  }

  /**
   * Build stats to display fps
   */
  setStats() {
    try {
      this.stats = new Stats();
      this.stats.showPanel(0);
      document.body.appendChild(this.stats.dom);
    } catch (error) {
      console.error('Error setting up stats:', error);
      // Optionally continue without stats
      this.stats = null;
    }
  }

  setGUI() {
    try {
      const gui = new GUI();
      gui.add(this.guiObj, 'uProgress', 0, 1, 0.01).onChange(() => {
        this.uniforms.uProgress.value = this.guiObj.uProgress;
      }).name('Progress').listen();

      // Ensure progress ends at 1
      gsap.to(this.guiObj, {
        uProgress: 1,
        duration: 2.5,
        ease: 'Power4.easeOut',
        onUpdate: () => {
          this.uniforms.uProgress.value = this.guiObj.uProgress;
        }
      });
      // Removed texture selection GUI as frame index now controls sprite sheets
      gui.add(this.guiObj, 'pointSize', 0, 2).onChange(() => {
        this.uniforms.uPointSize.value = this.guiObj.pointSize;
      });
    } catch (error) {
      console.error('Error setting up GUI:', error);
      // Optionally continue without GUI
    }
  }

  /**
   * List of events
   */
  events() {
    window.addEventListener('resize', this.handleResize, { passive: true });
    window.addEventListener('mousemove', this.handleMouseMove, { passive: true });
    this.draw(0);
  }

  // EVENTS

  /**
   * Request animation frame function
   * This function is called 60/time per seconds with no performance issue
   * Everything that happens in the scene is drawn here
   * @param {Number} time
   */
  draw = (time) => {
    if (this.stats) this.stats.begin();

    if (this.controls) this.controls.update(); // for damping

    // Update uTime
    this.uniforms.uTime.value = time * 0.001; // Convert to seconds

    this.renderer.render(this.scene, this.camera); // render scene
    this.composer.render(); // render post-processing

    this.touch.update(); // update touch texture

    if (this.stats) this.stats.end();
    this.raf = window.requestAnimationFrame(this.draw);
  }

  /**
   * On resize, we need to adapt our camera based
   * on the new window width and height and the renderer
   */
  handleResize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    // Update camera
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();

    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height);
    this.composer.setSize(this.width, this.height);

    this.uniforms.uScaleHeightPointSize.value = (this.dpr * this.height) / 2;
  }

  setRaycaster() {
    this.ray = new Raycaster();
    this.mouse = new Vector2();

    // get Mouse position

    if (isTouch()) {
      window.addEventListener('touchmove', this.handleTouchMove);
    } else {
      window.addEventListener('mousemove', this.handleMouseMove);
    }
  }

  handleTouchMove = (e) => {
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