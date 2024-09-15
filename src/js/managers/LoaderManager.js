// ===== Filename: src/js/managers/LoaderManager.js =====

import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { TextureLoader, LinearFilter, ClampToEdgeWrapping } from 'three'

class LoaderManager {
  assets
  constructor() {
    this.assets = {} // Dictionary of assets

    this.textureLoader = new TextureLoader()
    this.GLTFLoader = new GLTFLoader()
    this.OBJLoader = new OBJLoader()
    this.DRACOLoader = new DRACOLoader()
    this.FontLoader = new FontLoader()
  }

  load = (data) =>
    new Promise((resolve, reject) => {
      const promises = []
      for (let i = 0; i < data.length; i++) {
        const { name, gltf, texture, img, font, obj, flipY } = data[i]

        if (!this.assets[name]) {
          this.assets[name] = {}
        }

        if (gltf) {
          promises.push(this.loadGLTF(gltf, name))
        }

        if (texture) {
          promises.push(this.loadTexture(texture, name, flipY))
        }

        if (img) {
          promises.push(this.loadImage(img, name))
        }

        if (font) {
          promises.push(this.loadFont(font, name))
        }

        if (obj) {
          promises.push(this.loadObj(obj, name))
        }
      }

      Promise.all(promises)
        .then(() => resolve())
        .catch(error => {
          console.error('Error loading assets:', error)
          reject(error)
        })
    })

  loadGLTF(url, name) {
    return new Promise((resolve, reject) => {
      this.DRACOLoader.setDecoderPath('../scene/vendor/three/draco/')
      this.GLTFLoader.setDRACOLoader(this.DRACOLoader)

      this.GLTFLoader.load(
        url,
        (result) => {
          this.assets[name].gltf = result
          resolve(result)
        },
        undefined,
        (e) => {
          console.error(`Error loading GLTF ${name}:`, e)
          reject(e)
        }
      )
    })
  }

  loadTexture(url, name, flipY = true) {
    if (!this.assets[name]) {
      this.assets[name] = {}
    }
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (result) => {
          result.flipY = flipY
          // Set texture parameters for optimal performance and quality
          result.minFilter = LinearFilter
          result.magFilter = LinearFilter
          result.wrapS = ClampToEdgeWrapping
          result.wrapT = ClampToEdgeWrapping
          this.assets[name].texture = result
          resolve(result)
        },
        undefined,
        (e) => {
          console.error(`Error loading texture ${name}:`, e)
          reject(e)
        }
      )
    })
  }

  loadImage(url, name) {
    return new Promise((resolve, reject) => {
      const image = new Image()

      image.onload = () => {
        this.assets[name].img = image
        resolve(image)
      }

      image.onerror = (e) => {
        console.error(`Error loading image ${name}:`, e)
        reject(e)
      }

      image.src = url
    })
  }

  loadFont(url, name) {
    // Convert font to typeface.json using https://gero3.github.io/facetype.js/
    return new Promise((resolve, reject) => {
      this.FontLoader.load(
        url,
        // onLoad callback
        (font) => {
          this.assets[name].font = font
          resolve(font)
        },
        // onProgress callback
        () =>
        // xhr
        {
          // Optional: Implement progress feedback if needed
        },
        // onError callback
        (err) => {
          console.error(`Error loading font ${name}:`, err)
          reject(err)
        }
      )
    })
  }

  // https://threejs.org/docs/#examples/en/loaders/OBJLoader
  loadObj(url, name) {
    return new Promise((resolve, reject) => {
      // Load a resource
      this.OBJLoader.load(
        // resource URL
        url,
        // called when resource is loaded
        (object) => {
          this.assets[name].obj = object
          resolve(object)
        },
        // onProgress callback
        () =>
        // xhr
        {
          // Optional: Implement progress feedback if needed
        },
        // called when loading has errors
        (err) => {
          console.error(`Error loading OBJ ${name}:`, err)
          reject(err)
        }
      )
    })
  }
}

export default new LoaderManager()