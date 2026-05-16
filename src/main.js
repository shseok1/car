// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue
scene.fog = new THREE.Fog(0x87ceeb, 50, 150);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.outputEncoding = THREE.sRGBEncoding; // Crucial for correct GLTF color rendering
document.body.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5); // Boosted ambient light
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0); // Natural sky/ground lighting
hemiLight.position.set(0, 200, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 2.5); // Boosted sun light
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
const groundGeo = new THREE.PlaneGeometry(3000, 3000);
const groundMat = new THREE.MeshPhongMaterial({ color: 0x348C31 }); // Grass green
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// --- Track (Original Circular Layout) ---
const trackGeo = new THREE.RingGeometry(40, 60, 64);
const trackMat = new THREE.MeshPhongMaterial({ color: 0x333333, side: THREE.DoubleSide });
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

for (let i = 0; i < 50; i++) {
    const angle = (i / 50) * Math.PI * 2;
    createTree(Math.cos(angle) * 70, Math.sin(angle) * 70);
    createTree(Math.cos(angle) * 30, Math.sin(angle) * 30);
}

// --- Car ---
const carGroup = new THREE.Group();

// Load Model
const loader = new THREE.GLTFLoader();
const redMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });

loader.load(
    'race-future.glb',
    function (gltf) {
        const model = gltf.scene;
        model.scale.set(1, 1, 1);
        model.rotation.y = Math.PI;
        model.position.y = 0.2;
        model.traverse(child => {
            if (child.isMesh) {
                child.material = redMaterial; // Apply red color
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        carGroup.add(model);
    },
    undefined,
    error => console.error(error)
);

carGroup.position.set(0, 0, 50); // Start on the original track position
scene.add(carGroup);

// --- Game Logic ---
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
let velocity = 0;
let rotation = 0; // Face forward along Z axis
const stats = {
    acceleration: 0.012,
    deceleration: 0.005,
    maxSpeed: 1.0, // 200 km/h
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
const gearDisplay = document.getElementById('gear-display');
const revBar = document.getElementById('rev-bar');

// --- Gearbox System ---
const gearbox = {
    currentGear: 1,
    maxGears: 8, 
    rpm: 0,
    ratios: [0, 0.12, 0.25, 0.38, 0.52, 0.65, 0.78, 0.9, 1.0], 
    shiftCooldown: 0,
};

function updateGearbox() {
    const absVelocity = Math.abs(velocity);
    const speedRatio = absVelocity / stats.maxSpeed;
    
    const gearMin = gearbox.ratios[gearbox.currentGear - 1];
    const gearMax = gearbox.ratios[gearbox.currentGear];
    
    gearbox.rpm = (speedRatio - gearMin) / (gearMax - gearMin || 0.1);
    gearbox.rpm = Math.max(0, Math.min(1.2, gearbox.rpm)); 
    
    if (gearbox.shiftCooldown > 0) {
        gearbox.shiftCooldown--;
    } else {
        if (gearbox.rpm > 0.9 && gearbox.currentGear < gearbox.maxGears) {
            gearbox.currentGear++;
            gearbox.shiftCooldown = 30; 
        }
        else if (gearbox.rpm < 0.25 && gearbox.currentGear > 1) {
            gearbox.currentGear--;
            gearbox.shiftCooldown = 30;
        }
    }
    
    gearDisplay.textContent = `GEAR: ${gearbox.currentGear}`;
    revBar.style.width = `${Math.min(100, gearbox.rpm * 100)}%`;
}

// --- Audio System ---
let audioCtx;
let oscillator;
let gainNode;
let engineStarted = false;

function initAudio() {
    if (engineStarted) return;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(40, audioCtx.currentTime);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    engineStarted = true;
}

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
    const freq = 40 + (gearbox.rpm * 200) + (gearbox.currentGear * 8);
    oscillator.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.1);
    const volume = 0.05 + (Math.abs(velocity) * 0.2);
    gainNode.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.1);
}

function animate() {
    requestAnimationFrame(animate);
    const isUp = keys.w || keys.ArrowUp;
    const isDown = keys.s || keys.ArrowDown;
    const isLeft = keys.a || keys.ArrowLeft;
    const isRight = keys.d || keys.ArrowRight;

    if (isUp) velocity += stats.acceleration;
    else if (isDown) velocity -= stats.acceleration;
    else {
        if (velocity > 0) velocity = Math.max(0, velocity - stats.deceleration);
        if (velocity < 0) velocity = Math.min(0, velocity + stats.deceleration);
    }

    velocity = Math.max(-stats.maxSpeed / 3, Math.min(stats.maxSpeed, velocity));

    if (Math.abs(velocity) > 0.01) {
        const turnDir = (velocity > 0 ? 1 : -1) * (0.5 + Math.abs(velocity) / stats.maxSpeed);
        if (isLeft) rotation += stats.turnSpeed * turnDir * 0.8;
        if (isRight) rotation -= stats.turnSpeed * turnDir * 0.8;
    }

    carGroup.rotation.y = rotation;
    carGroup.position.x += Math.sin(rotation) * velocity;
    carGroup.position.z += Math.cos(rotation) * velocity;

    const cameraOffset = new THREE.Vector3(0, 5, -10);
    cameraOffset.applyQuaternion(carGroup.quaternion);
    const targetCameraPos = carGroup.position.clone().add(cameraOffset);
    camera.position.lerp(targetCameraPos, 0.1);
    camera.lookAt(carGroup.position);

    speedMeter.textContent = `${Math.round(Math.abs(velocity) * 200)} km/h`;
    updateGearbox();
    updateEngineSound();
    renderer.render(scene, camera);
}
animate();
