// src/main.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- Debug Console Overlay ---
const debugConsole = document.createElement('div');
debugConsole.style.position = 'fixed';
debugConsole.style.bottom = '10px';
debugConsole.style.left = '90px';
debugConsole.style.width = '320px';
debugConsole.style.maxHeight = '160px';
debugConsole.style.overflowY = 'auto';
debugConsole.style.background = 'rgba(0,0,0,0.8)';
debugConsole.style.color = '#0f0';
debugConsole.style.fontFamily = 'monospace';
debugConsole.style.fontSize = '12px';
debugConsole.style.padding = '8px';
debugConsole.style.borderRadius = '8px';
debugConsole.style.zIndex = '1000';
document.body.appendChild(debugConsole);

function logDebug(msg) {
  console.log(msg);
  const p = document.createElement('div');
  p.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  debugConsole.appendChild(p);
  debugConsole.scrollTop = debugConsole.scrollHeight;
}

// --- Scene & Camera ---
logDebug('Initializing scene and camera...');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaaaaaa);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, 1.8, 3);
logDebug('Camera initialized');

// --- Renderer ---
logDebug('Setting up renderer...');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
document.body.appendChild(renderer.domElement);
logDebug('Renderer added to DOM');

// --- Light ---
logDebug('Adding lights...');
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
hemiLight.position.set(0, 20, 0);
scene.add(hemiLight);

// --- GLTF Loader & Mixers ---
const loader = new GLTFLoader();
const mixers = [];
const clock = new THREE.Clock();

let fireplace, extinguisher;

// --- Load Room ---
logDebug('Loading room...');
loader.load(
  '/jungle_room.glb',
  gltf => {
    logDebug('Room loaded');
    const room = gltf.scene;
    room.scale.set(0.2, 0.2, 0.2);
    scene.add(room);
  },
  xhr => logDebug(`Room ${(xhr.loaded / xhr.total * 100).toFixed(2)}% loaded`),
  error => logDebug('Error loading room: ' + error)
);

// --- Load Fireplace ---
logDebug('Loading fireplace...');
loader.load(
  '/fireplace_01.glb',
  gltf => {
    logDebug('Fireplace loaded');
    fireplace = gltf.scene;
    fireplace.position.set(-4, -8, 1);
    fireplace.scale.set(0.7, 0.7, 0.7);
    scene.add(fireplace);

    if (gltf.animations.length > 0) {
      logDebug('Fireplace has animations');
      const mixer = new THREE.AnimationMixer(fireplace);
      gltf.animations.forEach(clip => mixer.clipAction(clip).play());
      mixers.push(mixer);
    }
  },
  undefined,
  error => logDebug('Error loading fireplace: ' + error)
);

// --- Load Fire Extinguisher ---
logDebug('Loading fire extinguisher...');
loader.load(
  '/fire_extinguisher.glb',
  gltf => {
    logDebug('Extinguisher loaded');
    extinguisher = gltf.scene;
    extinguisher.position.set(16, 4, 12);
    extinguisher.scale.set(0.5, 0.5, 0.5);
    scene.add(extinguisher);
  },
  undefined,
  error => logDebug('Error loading extinguisher: ' + error)
);

// --- Camera control variables ---
let rotateSpeed = 0.03;
let rotateLeft = false;
let rotateRight = false;
let moveForward = false;
let moveBackward = false;
let targetRotationX = 0;
let targetRotationY = 0;

// --- Orientation Handler ---
function handleOrientation(event) {
  const { alpha, beta, gamma } = event;
  logDebug(`DeviceOrientation → α:${alpha?.toFixed(1)} β:${beta?.toFixed(1)} γ:${gamma?.toFixed(1)}`);
  if (beta !== null && gamma !== null) {
    targetRotationY = THREE.MathUtils.degToRad(beta - 90);
    targetRotationX = THREE.MathUtils.degToRad(gamma);
  }
}

// --- Request Orientation Permission ---
function requestOrientationPermission() {
  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    logDebug('iOS: requesting device orientation permission...');
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') {
          logDebug('✅ Permission granted, listening for orientation');
          window.addEventListener('deviceorientation', handleOrientation);
        } else {
          logDebug('❌ Permission denied for device orientation');
        }
      })
      .catch(err => logDebug('Error: ' + err.message));
  } else if (typeof DeviceOrientationEvent !== 'undefined') {
    logDebug('✅ DeviceOrientationEvent supported. Listening...');
    window.addEventListener('deviceorientation', handleOrientation);
  } else {
    logDebug('❌ DeviceOrientationEvent NOT supported on this device/browser');
  }
}

// --- Add Enable Button ---
const enableBtn = document.createElement('button');
enableBtn.innerText = 'Enable Gyroscope';
enableBtn.style.position = 'absolute';
enableBtn.style.top = '20px';
enableBtn.style.left = '20px';
enableBtn.style.zIndex = '999';
enableBtn.style.padding = '10px';
enableBtn.style.borderRadius = '6px';
enableBtn.style.background = '#222';
enableBtn.style.color = '#0f0';
document.body.appendChild(enableBtn);
enableBtn.addEventListener('click', requestOrientationPermission);

// --- Keyboard movement ---
window.addEventListener('keydown', e => {
  if (e.key === 'w') moveForward = true;
  if (e.key === 's') moveBackward = true;
});
window.addEventListener('keyup', e => {
  if (e.key === 'w') moveForward = false;
  if (e.key === 's') moveBackward = false;
});

// --- Animate Loop ---
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  mixers.forEach(m => m.update(delta));

  // --- Apply device tilt ---
  camera.rotation.x = targetRotationY;
  camera.rotation.z = targetRotationX;

  // --- Move camera ---
  const speed = 2 * delta;
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  if (moveForward) camera.position.add(direction.multiplyScalar(speed));
  if (moveBackward) camera.position.add(direction.multiplyScalar(-speed));

  // --- Rotate camera with buttons ---
  if (rotateLeft) camera.rotation.y += rotateSpeed;
  if (rotateRight) camera.rotation.y -= rotateSpeed;

  renderer.render(scene, camera);
}
logDebug('Starting animation loop...');
animate();

// --- Window resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Look buttons ---
const btnLeft = document.createElement('button');
btnLeft.innerText = '⬅ Look Left';
btnLeft.style.position = 'fixed';
btnLeft.style.bottom = '20px';
btnLeft.style.left = '20px';
btnLeft.style.padding = '12px';
document.body.appendChild(btnLeft);

const btnRight = document.createElement('button');
btnRight.innerText = '➡ Look Right';
btnRight.style.position = 'fixed';
btnRight.style.bottom = '20px';
btnRight.style.right = '20px';
btnRight.style.padding = '12px';
document.body.appendChild(btnRight);

btnLeft.addEventListener('mousedown', () => { rotateLeft = true; });
btnLeft.addEventListener('mouseup', () => { rotateLeft = false; });
btnRight.addEventListener('mousedown', () => { rotateRight = true; });
btnRight.addEventListener('mouseup', () => { rotateRight = false; });

btnLeft.addEventListener('touchstart', () => { rotateLeft = true; });
btnLeft.addEventListener('touchend', () => { rotateLeft = false; });
btnRight.addEventListener('touchstart', () => { rotateRight = true; });
btnRight.addEventListener('touchend', () => { rotateRight = false; });