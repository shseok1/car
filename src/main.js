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

// --- Car (Ferrari SF90 Stradale) ---
const carGroup = new THREE.Group();

// Load GLTF Model (kart-oobi.glb)
const loader = new THREE.GLTFLoader();

loader.load(
    'kart-oobi.glb',
    function (gltf) {
        const kart = gltf.scene;
        
        // Scale and rotation adjustment for the kart
        kart.scale.set(1, 1, 1); // User might need to tweak this scale
        kart.rotation.y = Math.PI; // Face the correct forward direction initially
        kart.position.y = 0.2; // slightly elevate if wheels clip into the ground
        
        // Enable shadows for the loaded model
        kart.traverse(function(child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        carGroup.add(kart);
    },
    undefined, // progress callback
    function (error) {
        console.error('An error happened loading the GLTF', error);
    }
);

carGroup.position.set(0, 0, 45); // Start position
scene.add(carGroup);

// --- Game Logic ---
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
let velocity = 0;
let rotation = 0;
const stats = {
    acceleration: 0.012,
    deceleration: 0.005,
    maxSpeed: 1.5, // 300 km/h
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
    maxGears: 8, // 8-speed DCT
    rpm: 0,
    ratios: [0, 0.12, 0.25, 0.38, 0.52, 0.65, 0.78, 0.9, 1.0], // Gear speed limits
    shiftCooldown: 0,
};

function updateGearbox() {
    const absVelocity = Math.abs(velocity);
    const speedRatio = absVelocity / stats.maxSpeed;
    
    const gearMin = gearbox.ratios[gearbox.currentGear - 1];
    const gearMax = gearbox.ratios[gearbox.currentGear];
    
    // Calculate RPM within current gear
    gearbox.rpm = (speedRatio - gearMin) / (gearMax - gearMin || 0.1);
    gearbox.rpm = Math.max(0, Math.min(1.2, gearbox.rpm)); // Allow slight over-rev
    
    if (gearbox.shiftCooldown > 0) {
        gearbox.shiftCooldown--;
    } else {
        // Upshift logic
        if (gearbox.rpm > 0.9 && gearbox.currentGear < gearbox.maxGears) {
            gearbox.currentGear++;
            gearbox.shiftCooldown = 30; // 0.5s cooldown at 60fps
        }
        // Downshift logic
        else if (gearbox.rpm < 0.25 && gearbox.currentGear > 1) {
            gearbox.currentGear--;
            gearbox.shiftCooldown = 30;
        }
    }
    
    gearDisplay.textContent = `GEAR: ${gearbox.currentGear}`;
    revBar.style.width = `${Math.min(100, gearbox.rpm * 100)}%`;
}

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

    // Pitch depends on RPM + Gear base frequency
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
animate();
