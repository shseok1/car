// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue
scene.fog = new THREE.Fog(0x87ceeb, 50, 150);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(100, 100, 50);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -100;
dirLight.shadow.camera.right = 100;
dirLight.shadow.camera.top = 100;
dirLight.shadow.camera.bottom = -100;
scene.add(dirLight);

// --- Ground ---
const groundGeo = new THREE.PlaneGeometry(1000, 1000);
const groundMat = new THREE.MeshPhongMaterial({ color: 0x348C31 }); // Grass green
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- Track ---
const trackPoints = [
    new THREE.Vector2(0, 50),
    new THREE.Vector2(40, 40),
    new THREE.Vector2(50, 0),
    new THREE.Vector2(40, -40),
    new THREE.Vector2(0, -50),
    new THREE.Vector2(-40, -40),
    new THREE.Vector2(-50, 0),
    new THREE.Vector2(-40, 40),
];
const trackShape = new THREE.Shape();
trackShape.moveTo(trackPoints[0].x, trackPoints[0].y);
for (let i = 1; i < trackPoints.length; i++) {
    trackShape.lineTo(trackPoints[i].x, trackPoints[i].y);
}
trackShape.closePath();

const holePath = new THREE.Path();
const innerScale = 0.7;
holePath.moveTo(trackPoints[0].x * innerScale, trackPoints[0].y * innerScale);
for (let i = 1; i < trackPoints.length; i++) {
    holePath.lineTo(trackPoints[i].x * innerScale, trackPoints[i].y * innerScale);
}
holePath.closePath();
trackShape.holes.push(holePath);

const extrudeSettings = { depth: 0.2, bevelEnabled: false };
const trackGeo = new THREE.ExtrudeGeometry(trackShape, extrudeSettings);
const trackMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
const track = new THREE.Mesh(trackGeo, trackMat);
track.rotation.x = -Math.PI / 2;
track.position.y = 0.05;
track.receiveShadow = true;
scene.add(track);

// --- Decoration (Trees) ---
function createTree(x, z) {
    const tree = new THREE.Group();
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.2, 1);
    const trunkMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.5;
    tree.add(trunk);

    const leavesGeo = new THREE.ConeGeometry(1, 2, 8);
    const leavesMat = new THREE.MeshPhongMaterial({ color: 0x006400 });
    const leaves = new THREE.Mesh(leavesGeo, leavesMat);
    leaves.position.y = 2;
    tree.add(leaves);

    tree.position.set(x, 0, z);
    tree.castShadow = true;
    scene.add(tree);
}

for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    createTree(Math.cos(angle) * 70, Math.sin(angle) * 70);
    createTree(Math.cos(angle) * 30, Math.sin(angle) * 30);
}

// --- Car ---
const carGroup = new THREE.Group();

// Chassis
const bodyGeo = new THREE.BoxGeometry(2, 0.8, 4);
const bodyMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.position.y = 0.6;
body.castShadow = true;
carGroup.add(body);

// Cabin
const cabinGeo = new THREE.BoxGeometry(1.5, 0.7, 1.8);
const cabinMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
const cabin = new THREE.Mesh(cabinGeo, cabinMat);
cabin.position.set(0, 1.3, -0.2);
cabin.castShadow = true;
carGroup.add(cabin);

// Wheels
const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
const wheelPositions = [
    [-1, 0.4, 1.2], [1, 0.4, 1.2],
    [-1, 0.4, -1.2], [1, 0.4, -1.2]
];
wheelPositions.forEach(pos => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(...pos);
    wheel.castShadow = true;
    carGroup.add(wheel);
});

// Name Plate ('수현')
const canvas = document.createElement('canvas');
canvas.width = 256;
canvas.height = 128;
const context = canvas.getContext('2d');
context.fillStyle = '#ffffff';
context.fillRect(0, 0, 256, 128);
context.fillStyle = '#000000';
context.font = 'Bold 80px Arial';
context.textAlign = 'center';
context.textBaseline = 'middle';
context.fillText('수현', 128, 64);

const nameTexture = new THREE.CanvasTexture(canvas);
const nameGeo = new THREE.PlaneGeometry(1.2, 0.6);
const nameMat = new THREE.MeshBasicMaterial({ map: nameTexture });
const namePlate = new THREE.Mesh(nameGeo, nameMat);
namePlate.position.set(0, 0.7, -2.01); // Position at the very back
namePlate.rotation.y = Math.PI; // Face outwards
carGroup.add(namePlate);

carGroup.position.set(0, 0, 45); // Start position
scene.add(carGroup);

// --- Game Logic ---
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
let velocity = 0;
let rotation = 0;
const stats = {
    acceleration: 0.01,
    deceleration: 0.005,
    maxSpeed: 1.0,
    turnSpeed: 0.04
};

window.addEventListener('keydown', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

const speedMeter = document.getElementById('speed-meter');

// --- Audio System (V8 Engine Sound Synthesis) ---
let audioCtx;
let oscillator;
let gainNode;
let engineStarted = false;

function initAudio() {
    if (engineStarted) return;
    
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();

    oscillator.type = 'sawtooth'; // Rough sound for V8
    oscillator.frequency.setValueAtTime(40, audioCtx.currentTime); // Base idle freq
    
    // Low pass filter for more "rumble"
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, audioCtx.currentTime);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    engineStarted = true;
}

// UI for Audio Start
const startButton = document.createElement('button');
startButton.textContent = '엔진 시동 걸기 (V8 Sound)';
startButton.style.position = 'absolute';
startButton.style.bottom = '20px';
startButton.style.left = '50%';
startButton.style.transform = 'translateX(-50%)';
startButton.style.padding = '15px 30px';
startButton.style.fontSize = '1.2rem';
startButton.style.cursor = 'pointer';
startButton.style.zIndex = '100';
document.body.appendChild(startButton);

startButton.addEventListener('click', () => {
    initAudio();
    startButton.style.display = 'none';
});

function updateEngineSound() {
    if (!engineStarted) return;

    const absVelocity = Math.abs(velocity);
    
    // Pitch modulation (40Hz idle to 150Hz max)
    const freq = 40 + (absVelocity * 200);
    oscillator.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.1);

    // Volume modulation
    const volume = 0.05 + (absVelocity * 0.2);
    gainNode.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.1);
}

function animate() {
    requestAnimationFrame(animate);

    const isUp = keys.w || keys.ArrowUp;
...
    speedMeter.textContent = `${Math.round(Math.abs(velocity) * 200)} km/h`;
    
    updateEngineSound();
    
    renderer.render(scene, camera);
}
animate();
