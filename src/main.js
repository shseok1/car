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

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
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

// --- Decoration (Trees & Stadium) ---
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

function createGrandstand(x, z, rotation) {
    const stand = new THREE.Group();
    const stepCount = 5;
    const stepWidth = 30;
    const stepHeight = 0.8;
    const stepDepth = 2;
    
    for (let i = 0; i < stepCount; i++) {
        // Seat row
        const stepGeo = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
        const stepMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const step = new THREE.Mesh(stepGeo, stepMat);
        step.position.set(0, (i + 1) * stepHeight, i * stepDepth);
        step.castShadow = true;
        step.receiveShadow = true;
        stand.add(step);
        
        // Spectators
        for (let j = 0; j < 15; j++) {
            const personGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.7);
            const personMat = new THREE.MeshPhongMaterial({ color: new THREE.Color().setHSL(Math.random(), 0.7, 0.5) });
            const person = new THREE.Mesh(personGeo, personMat);
            person.position.set(-12 + j * 1.8, (i + 1) * stepHeight + 0.7, i * stepDepth);
            stand.add(person);
        }
    }
    
    // Pillars & Roof
    const roofGeo = new THREE.BoxGeometry(stepWidth + 2, 0.3, stepDepth * stepCount + 2);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0xeeeeee });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, stepCount * stepHeight + 5, (stepCount * stepDepth) / 2 - 1);
    stand.add(roof);

    const pillarGeo = new THREE.CylinderGeometry(0.2, 0.2, 6);
    const pillarMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
    [-1, 1].forEach(side => {
        const p = new THREE.Mesh(pillarGeo, pillarMat);
        p.position.set(side * (stepWidth / 2 - 1), 3, (stepCount * stepDepth) - 1); // Move to the back
        stand.add(p);
    });

    stand.position.set(x, 0, z);
    stand.rotation.y = rotation;
    scene.add(stand);
}

function createBillboard(x, z, rotation) {
    const billboard = new THREE.Group();
    
    // Create Canvas for Text
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 256;
    
    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Border
    ctx.strokeStyle = '#ffcc00';
    ctx.lineWidth = 20;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 15;
    ctx.fillText('이수현', canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    
    // Screen Mesh
    const screenGeo = new THREE.PlaneGeometry(20, 10);
    const screenMat = new THREE.MeshPhongMaterial({ 
        map: texture,
        emissive: 0x555555,
        side: THREE.DoubleSide 
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.y = 15;
    billboard.add(screen);
    
    // Frame
    const frameGeo = new THREE.BoxGeometry(21, 11, 1);
    const frameMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 15;
    frame.position.z = -0.6;
    billboard.add(frame);
    
    // Stand/Pillar
    const standGeo = new THREE.BoxGeometry(2, 10, 2);
    const standMat = new THREE.MeshPhongMaterial({ color: 0x555555 });
    const stand = new THREE.Mesh(standGeo, standMat);
    stand.position.y = 5;
    billboard.add(stand);
    
    billboard.position.set(x, 0, z);
    billboard.rotation.y = rotation;
    scene.add(billboard);
}

// Place Stadium Parts (Corrected to face center)
createGrandstand(85, 0, Math.PI / 2);
createGrandstand(-85, 0, -Math.PI / 2);
createGrandstand(0, 85, 0);
createGrandstand(0, -85, Math.PI);

// Place Billboards next to grandstands
createBillboard(85, 30, Math.PI / 2);
createBillboard(-85, -30, -Math.PI / 2);
createBillboard(-30, 85, 0);
createBillboard(30, -85, Math.PI);

for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    // Avoid placing trees where grandstands are
    if (Math.abs(angle % (Math.PI / 2)) > 0.2) {
        createTree(Math.cos(angle) * 110, Math.sin(angle) * 110);
    }
    createTree(Math.cos(angle) * 30, Math.sin(angle) * 30);
}

// --- Car ---
const carGroup = new THREE.Group();

// Load Model
const loader = new THREE.GLTFLoader();
const darkRedMaterial = new THREE.MeshPhongMaterial({ color: 0x8b0000, shininess: 50 }); // Dark Red

loader.load(
    'race-future.glb',
    function (gltf) {
        const model = gltf.scene;
        model.scale.set(1.1, 1, 1.2); 
        model.rotation.y = 0; // Fix orientation to face forward
        model.position.y = 0.2;
        
        model.traverse(child => {
            if (child.isMesh) {
                child.material = darkRedMaterial;
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
carGroup.scale.set(2, 2, 2); // Double the size
scene.add(carGroup);

// --- Game Logic ---
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
let velocity = 0;
let rotation = 0; // Face forward along Z axis
let viewMode = 0; // 0: 3rd person, 1: 1st person
const stats = {
    acceleration: 0.012,
    deceleration: 0.005,
    maxSpeed: 1.0, // 200 km/h
    turnSpeed: 0.04
};

window.addEventListener('keydown', (e) => { 
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(e.key)) keys[e.key] = true; 
    if (keys.hasOwnProperty(key)) keys[key] = true; // Support case-insensitive (W/A/S/D)
    
    if (key === 'c' || key === 'ㅊ') {
        viewMode = (viewMode + 1) % 2; // Toggle view
    }
});
window.addEventListener('keyup', (e) => { 
    const key = e.key.toLowerCase();
    if (keys.hasOwnProperty(e.key)) keys[e.key] = false;
    if (keys.hasOwnProperty(key)) keys[key] = false;
});
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

const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
let gameStarted = false;

startButton.addEventListener('click', () => {
    initAudio();
    startScreen.style.display = 'none';
    gameStarted = true;
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
    if (!gameStarted) return;
    
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

    // Camera follow logic based on viewMode
    let cameraOffset;
    if (viewMode === 0) {
        // 3rd Person (Chase)
        cameraOffset = new THREE.Vector3(0, 10, -20);
    } else {
        // 1st Person (Cockpit)
        cameraOffset = new THREE.Vector3(0, 2.5, 0.5); // Inside the car
    }
    
    cameraOffset.applyQuaternion(carGroup.quaternion);
    const targetCameraPos = carGroup.position.clone().add(cameraOffset);
    
    if (viewMode === 0) {
        camera.position.lerp(targetCameraPos, 0.1);
        camera.lookAt(carGroup.position);
    } else {
        camera.position.copy(targetCameraPos);
        // Look forward in 1st person
        const lookOffset = new THREE.Vector3(0, 1.5, 10).applyQuaternion(carGroup.quaternion);
        camera.lookAt(carGroup.position.clone().add(lookOffset));
    }

    speedMeter.textContent = `${Math.round(Math.abs(velocity) * 200)} km/h`;
    updateGearbox();
    updateEngineSound();
    renderer.render(scene, camera);
}
animate();