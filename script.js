import * as THREE from "https://cdn.skypack.dev/three@0.135.0";
import { gsap } from "https://cdn.skypack.dev/gsap@3.8.0";
import { GLTFLoader } from "https://cdn.skypack.dev/three@0.135.0/examples/jsm/loaders/GLTFLoader";
class World {
  constructor({
    canvas,
    width,
    height,
    cameraPosition,
    fieldOfView = 75,
    nearPlane = 0.1,
    farPlane = 100 }) {
    this.parameters = {
      count: 1500,
      max: 12.5 * Math.PI,
      a: 2,
      c: 4.5
    };

    this.textureLoader = new THREE.TextureLoader();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x16000a);
    this.clock = new THREE.Clock();
    this.data = 0;
    this.time = { current: 0, t0: 0, t1: 0, t: 0, frequency: 0.0005 };
    this.angle = { x: 0, z: 0 };
    this.width = width || window.innerWidth;
    this.height = height || window.innerHeight;
    this.aspectRatio = this.width / this.height;
    this.fieldOfView = fieldOfView;
    this.camera = new THREE.PerspectiveCamera(
      fieldOfView,
      this.aspectRatio,
      nearPlane,
      farPlane);

    this.camera.position.set(
      cameraPosition.x,
      cameraPosition.y,
      cameraPosition.z);

    this.scene.add(this.camera);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true
    });

    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height);
    this.timer = 0;
    this.addToScene();
    this.addButton();

    this.render();
    this.listenToResize();
    this.listenToMouseMove();
  }
  start() { }
  render() {
    this.renderer.render(this.scene, this.camera);
    this.composer && this.composer.render();
  }
  loop() {
    this.time.elapsed = this.clock.getElapsedTime();
    this.time.delta = Math.min(
      60,
      (this.time.current - this.time.elapsed) * 1000);

    if (this.analyser && this.isRunning) {
      this.time.t = this.time.elapsed - this.time.t0 + this.time.t1;
      this.data = this.analyser.getAverageFrequency();
      this.data *= this.data / 2000;
      this.angle.x += this.time.delta * 0.001 * 0.63;
      this.angle.z += this.time.delta * 0.001 * 0.39;
      const justFinished = this.isRunning && !this.sound.isPlaying;
      if (justFinished) {
        this.time.t1 = this.time.t;
        this.audioBtn.disabled = false;
        this.isRunning = false;
        const tl = gsap.timeline();
        this.angle.x = 0;
        this.angle.z = 0;
        tl.to(this.camera.position, {
          x: 0,
          z: 4.5,
          duration: 4,
          ease: "expo.in"
        });

        tl.to(this.audioBtn, {
          opacity: () => 1,
          duration: 1,
          ease: "power1.out"
        });

      } else {
        this.camera.position.x = Math.sin(this.angle.x) * this.parameters.a;
        this.camera.position.z = Math.min(
          Math.max(Math.cos(this.angle.z) * this.parameters.c, 1.75),
          6.5);

      }
    }
    this.camera.lookAt(this.scene.position);
    if (this.heartMaterial) {
      this.heartMaterial.uniforms.uTime.value +=
        this.time.delta * this.time.frequency * (1 + this.data * 0.2);
    }
    if (this.model) {
      this.model.rotation.y -= 0.0005 * this.time.delta * (1 + this.data);
    }
    if (this.snowMaterial) {
      this.snowMaterial.uniforms.uTime.value +=
        this.time.delta * 0.0004 * (1 + this.data);
    }

    // Sync lyrics
    if (this.isRunning && this.sound && this.sound.context) {
      const currentSec = this.sound.context.currentTime - this.sound._startedAt;
      this.updateLyrics(currentSec);
    }

    this.render();

    this.time.current = this.time.elapsed;
    requestAnimationFrame(this.loop.bind(this));
  }
  listenToResize() {
    window.addEventListener("resize", () => {
      // Update sizes
      this.width = window.innerWidth;
      this.height = window.innerHeight;

      // Update camera
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    });
  }
  listenToMouseMove() {
    window.addEventListener("mousemove", e => {
      const x = e.clientX;
      const y = e.clientY;
      gsap.to(this.camera.position, {
        x: gsap.utils.mapRange(0, window.innerWidth, 0.2, -0.2, x),
        y: gsap.utils.mapRange(0, window.innerHeight, 0.2, -0.2, -y)
      });

    });
  }
  addHeart() {
    this.heartMaterial = new THREE.ShaderMaterial({
      fragmentShader: document.getElementById("fragmentShader").textContent,
      vertexShader: document.getElementById("vertexShader").textContent,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.2 },
        uTex: {
          value: new THREE.TextureLoader().load(
            "https://assets.codepen.io/74321/heart.png")
        }
      },



      depthWrite: false,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const count = this.parameters.count; //2000
    const scales = new Float32Array(count * 1);
    const colors = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const randoms = new Float32Array(count);
    const randoms1 = new Float32Array(count);
    const colorChoices = [
      "white",
      "red",
      "pink",
      "crimson",
      "hotpink",
      "green"];


    const squareGeometry = new THREE.PlaneGeometry(1, 1);
    this.instancedGeometry = new THREE.InstancedBufferGeometry();
    Object.keys(squareGeometry.attributes).forEach(attr => {
      this.instancedGeometry.attributes[attr] = squareGeometry.attributes[attr];
    });
    this.instancedGeometry.index = squareGeometry.index;
    this.instancedGeometry.maxInstancedCount = count;

    for (let i = 0; i < count; i++) {
      const phi = Math.random() * Math.PI * 2;
      const i3 = 3 * i;
      randoms[i] = Math.random();
      randoms1[i] = Math.random();
      scales[i] = Math.random() * 0.35;
      const colorIndex = Math.floor(Math.random() * colorChoices.length);
      const color = new THREE.Color(colorChoices[colorIndex]);
      colors[i3 + 0] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
      speeds[i] = Math.random() * this.parameters.max;
    }
    this.instancedGeometry.setAttribute(
      "random",
      new THREE.InstancedBufferAttribute(randoms, 1, false));

    this.instancedGeometry.setAttribute(
      "random1",
      new THREE.InstancedBufferAttribute(randoms1, 1, false));

    this.instancedGeometry.setAttribute(
      "aScale",
      new THREE.InstancedBufferAttribute(scales, 1, false));

    this.instancedGeometry.setAttribute(
      "aSpeed",
      new THREE.InstancedBufferAttribute(speeds, 1, false));

    this.instancedGeometry.setAttribute(
      "aColor",
      new THREE.InstancedBufferAttribute(colors, 3, false));

    this.heart = new THREE.Mesh(this.instancedGeometry, this.heartMaterial);
    console.log(this.heart);
    this.scene.add(this.heart);
  }
  addToScene() {
    this.addModel();
    this.addHeart();
    this.addSnow();
  }
  async addModel() {
    this.model = await this.loadObj(
      "https://assets.codepen.io/74321/heart.glb");

    this.model.scale.set(0.01, 0.01, 0.01);
    this.model.material = new THREE.MeshMatcapMaterial({
      matcap: this.textureLoader.load(
        "https://assets.codepen.io/74321/3.png",
        () => {
          gsap.to(this.model.scale, {
            x: 0.35,
            y: 0.35,
            z: 0.35,
            duration: 1.5,
            ease: "Elastic.easeOut"
          });

        }),

      color: "#ff89aC"
    });

    this.scene.add(this.model);
  }
addButton() {
  this.lyricsLines = Array.from(document.querySelectorAll(".lyric-line"));
  this.lastLyricIndex = -1;
  this.audioBtn = document.querySelector("#play-music");

  // Cualquier click inicia la música (solo una vez)
  // stopPropagation en lyric lines evita conflicto
  window.addEventListener("click", () => {
    if (this.analyser) return;
    this.loadMusic().then(() => {
      console.log("music loaded");
    });
  }, { once: true });
}

setupLyricClicks() {
  this.lyricsLines.forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.sound || !this.sound.buffer) return;
      const targetTime = parseFloat(el.dataset.time);

      // Three.js Audio no soporta offset en play()
      // Hay que parar, reconectar la fuente y reproducir con offset manualmente
      if (this.sound.isPlaying) this.sound.stop();
      this.sound.offset = targetTime;
      this.sound.play();
      this.sound._startedAt = this.sound.context.currentTime - targetTime;
      this.isRunning = true;
      this.lyricsLines.forEach(l => l.classList.remove("active-lyric"));
      el.classList.add("active-lyric");
      this.lastLyricIndex = this.lyricsLines.indexOf(el);
    });
  });
}

updateLyrics(currentSec) {
  let activeIndex = -1;
  for (let i = 0; i < this.lyricsLines.length; i++) {
    if (currentSec >= parseFloat(this.lyricsLines[i].dataset.time)) {
      activeIndex = i;
    }
  }
  if (activeIndex !== -1 && activeIndex !== this.lastLyricIndex) {
    this.lyricsLines.forEach(el => el.classList.remove("active-lyric"));
    this.lyricsLines[activeIndex].classList.add("active-lyric");
    this.lyricsLines[activeIndex].scrollIntoView({ behavior: "smooth", block: "center" });
    this.lastLyricIndex = activeIndex;
  }
}
  loadObj(path) {
    const loader = new GLTFLoader();
    return new Promise(resolve => {
      loader.load(
        path,
        response => {
          resolve(response.scene.children[0]);
        },
        xhr => { },
        err => {
          console.log(err);
        });

    });
  }
  loadMusic() {
    return new Promise(resolve => {
      const listener = new THREE.AudioListener();
      this.camera.add(listener);
      // create a global audio source
      this.sound = new THREE.Audio(listener);
      const audioLoader = new THREE.AudioLoader();
      audioLoader.load(
        "./cancion.mp3",
        buffer => {
          this.sound.setBuffer(buffer);
          this.sound.setLoop(false);
          this.sound.setVolume(0.5);
          this.sound.play();
          this.analyser = new THREE.AudioAnalyser(this.sound, 32);
          // get the average frequency of the sound
          const data = this.analyser.getAverageFrequency();
          this.isRunning = true;
          this.t0 = this.time.elapsed;
          this.setupLyricClicks();
          resolve(data);
        },
        progress => {
          gsap.to(this.audioBtn, {
            opacity: () => 1 - progress.loaded / progress.total,
            duration: 1,
            ease: "power1.out"
          });

        },

        error => {
          console.log(error);
        });

    });
  }
  addSnow() {
    this.snowMaterial = new THREE.ShaderMaterial({
      fragmentShader: document.getElementById("fragmentShader1").textContent,
      vertexShader: document.getElementById("vertexShader1").textContent,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 0.3 },
        uTex: {
          value: new THREE.TextureLoader().load(
            "https://assets.codepen.io/74321/heart.png")
        }
      },



      depthWrite: false,
      blending: THREE.AdditiveBlending,
      transparent: true
    });

    const count = 550;
    const scales = new Float32Array(count * 1);
    const colors = new Float32Array(count * 3);
    const phis = new Float32Array(count);
    const randoms = new Float32Array(count);
    const randoms1 = new Float32Array(count);
    const colorChoices = ["red", "pink", "hotpink", "green"];

    const squareGeometry = new THREE.PlaneGeometry(1, 1);
    this.instancedGeometry = new THREE.InstancedBufferGeometry();
    Object.keys(squareGeometry.attributes).forEach(attr => {
      this.instancedGeometry.attributes[attr] = squareGeometry.attributes[attr];
    });
    this.instancedGeometry.index = squareGeometry.index;
    this.instancedGeometry.maxInstancedCount = count;

    for (let i = 0; i < count; i++) {
      const phi = (Math.random() - 0.5) * 10;
      const i3 = 3 * i;
      phis[i] = phi;
      randoms[i] = Math.random();
      randoms1[i] = Math.random();
      scales[i] = Math.random() * 0.35;
      const colorIndex = Math.floor(Math.random() * colorChoices.length);
      const color = new THREE.Color(colorChoices[colorIndex]);
      colors[i3 + 0] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }
    this.instancedGeometry.setAttribute(
      "phi",
      new THREE.InstancedBufferAttribute(phis, 1, false));

    this.instancedGeometry.setAttribute(
      "random",
      new THREE.InstancedBufferAttribute(randoms, 1, false));

    this.instancedGeometry.setAttribute(
      "random1",
      new THREE.InstancedBufferAttribute(randoms1, 1, false));

    this.instancedGeometry.setAttribute(
      "aScale",
      new THREE.InstancedBufferAttribute(scales, 1, false));

    this.instancedGeometry.setAttribute(
      "aColor",
      new THREE.InstancedBufferAttribute(colors, 3, false));

    this.snow = new THREE.Mesh(this.instancedGeometry, this.snowMaterial);
    this.scene.add(this.snow);
  }
}


const world = new World({
  canvas: document.querySelector("canvas.webgl"),
  cameraPosition: { x: 0, y: 0, z: 4.5 }
});


world.loop();

const lyricsBtn = document.getElementById("lyricsBtn");
const lyricsModal = document.getElementById("lyricsModal");
const closeLyrics = document.getElementById("closeLyrics");

lyricsBtn.addEventListener("click", () => {
  lyricsModal.classList.add("show");
});

closeLyrics.addEventListener("click", () => {
  lyricsModal.classList.remove("show");
});

// ── LETTER ──
const letterBtn = document.getElementById("letterBtn");
const letterModal = document.getElementById("letterModal");
const closeLetter = document.getElementById("closeLetter");

letterBtn.addEventListener("click", () => {
  letterModal.classList.add("show");
  setTimeout(() => letterModal.classList.add("opened"), 50);
});

closeLetter.addEventListener("click", () => {
  letterModal.classList.remove("opened");
  setTimeout(() => letterModal.classList.remove("show"), 400);
});

letterModal.addEventListener("click", (e) => {
  if (e.target === letterModal) {
    letterModal.classList.remove("opened");
    setTimeout(() => letterModal.classList.remove("show"), 400);
  }
});

// ── MEMORIES ──
const memoriesBtn = document.getElementById("memoriesBtn");
const memoriesPanel = document.getElementById("memoriesPanel");
const closeMemories = document.getElementById("closeMemories");
const carouselTrack = document.getElementById("carouselTrack");
const dotsContainer = document.getElementById("carouselDots");

const slides = Array.from(carouselTrack.querySelectorAll(".mem-slide"));
slides.forEach((_, i) => {
  const dot = document.createElement("div");
  dot.className = "dot" + (i === 0 ? " active" : "");
  dot.addEventListener("click", () => {
    carouselTrack.scrollTo({ top: i * carouselTrack.clientHeight, behavior: "smooth" });
  });
  dotsContainer.appendChild(dot);
});

carouselTrack.addEventListener("scroll", () => {
  const index = Math.round(carouselTrack.scrollTop / carouselTrack.clientHeight);
  dotsContainer.querySelectorAll(".dot").forEach((d, i) => {
    d.classList.toggle("active", i === index);
  });
});

memoriesBtn.addEventListener("click", () => memoriesPanel.classList.add("show"));
closeMemories.addEventListener("click", () => memoriesPanel.classList.remove("show"));