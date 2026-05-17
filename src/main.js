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

// --- Track (Banked NASCAR Style) ---
const innerRadius = 40;
const outerRadius = 60;
const segments = 128;
const bankingAngle = 0.15; // NASCAR style banking

const trackGeo = new THREE.BufferGeometry();
const vertices = [];
const indices = [];
const uvs = [];

for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Inner point (Lowered for banking)
    vertices.push(innerRadius * cos, 0, innerRadius * sin);
    // Outer point (Raised for steeper banking)
    vertices.push(outerRadius * cos, 8, outerRadius * sin);

    uvs.push(0, i / segments);
    uvs.push(1, i / segments);

    if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
    }
}

trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
trackGeo.setIndex(indices);
trackGeo.computeVertexNormals();

const trackMat = new THREE.MeshPhongMaterial({ color: 0x333333, side: THREE.DoubleSide });
const track = new THREE.Mesh(trackGeo, trackMat);
track.position.y = 0.05; 
track.receiveShadow = true;
scene.add(track);

// --- Catch Fence (Outer Barrier) ---
const fenceGeo = new THREE.CylinderGeometry(outerRadius, outerRadius, 12, 128, 1, true);
const fenceMat = new THREE.MeshPhongMaterial({ 
    color: 0xcccccc, 
    transparent: true, 
    opacity: 0.5, 
    side: THREE.DoubleSide 
});
const fence = new THREE.Mesh(fenceGeo, fenceMat);
fence.position.y = 14; 
scene.add(fence);

// Add Top Rail
const railGeo = new THREE.TorusGeometry(outerRadius, 0.5, 8, 128);
const railMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
const rail = new THREE.Mesh(railGeo, railMat);
rail.rotation.x = Math.PI / 2;
rail.position.y = 20;
scene.add(rail);

// --- Finish Line ---
const slopeAngle = Math.atan2(8, outerRadius - innerRadius);
const finishLineGeo = new THREE.PlaneGeometry(8, outerRadius - innerRadius); // 8 units wide along track
const finishLineMat = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide });
const finishLine = new THREE.Mesh(finishLineGeo, finishLineMat);

// Radial line at x=0, z=50 (spanning z=40 to z=60)
finishLine.position.set(0, 4.05, 50); 
finishLine.rotation.x = -Math.PI / 2 - slopeAngle;
scene.add(finishLine);

// Add checkerboard pattern to finish line
const loaderImg = new THREE.TextureLoader();
const checkerTexture = loaderImg.load('https://threejs.org/examples/textures/checker.png');
checkerTexture.wrapS = checkerTexture.wrapT = THREE.RepeatWrapping;
checkerTexture.repeat.set(1, 4); // 4 checkers across the track
finishLine.material.map = checkerTexture;

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
createBillboard(85, 30, -Math.PI / 2);
createBillboard(-85, -30, Math.PI / 2);
createBillboard(-30, 85, Math.PI);
createBillboard(30, -85, 0);

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
const nicknameInput = document.getElementById('nickname-input');
const leaderboardList = document.getElementById('leaderboard-list');
let gameStarted = false;
let userNickname = "Guest";

// --- Firebase Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyDT0FpXeO5KOw4TZs4gkaA9HTNgu4n-UpI",
    authDomain: "sheosk-c600c.firebaseapp.com",
    projectId: "sheosk-c600c",
    storageBucket: "sheosk-c600c.firebasestorage.app",
    messagingSenderId: "797411429608",
    appId: "1:797411429608:web:53fad5a2a414ce9e284d5d",
    measurementId: "G-2SSFCXFZX7"
};

// Use Compat version to match index.html scripts
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- Global Leaderboard System (Firebase) ---
async function saveRecord(nickname, time) {
    try {
        const leaderboardRef = db.collection('leaderboard');
        const q = leaderboardRef.where("nickname", "==", nickname);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
            // Existing user
            const doc = querySnapshot.docs[0];
            if (time < doc.data().time) {
                await doc.ref.update({ time: time, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
            }
        } else {
            // New user
            await leaderboardRef.add({
                nickname: nickname,
                time: time,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        displayLeaderboard();
    } catch (error) {
        console.error("Error saving record:", error);
    }
}

async function displayLeaderboard() {
    try {
        const querySnapshot = await db.collection('leaderboard')
            .orderBy("time", "asc")
            .limit(5)
            .get();
            
        leaderboardList.innerHTML = '';
        if (querySnapshot.empty) {
            leaderboardList.innerHTML = '<li>기록이 없습니다.</li>';
            return;
        }
        
        let index = 1;
        querySnapshot.forEach((doc) => {
            const rec = doc.data();
            const li = document.createElement('li');
            li.innerHTML = `<span>${index}. ${rec.nickname}</span> <span>${formatTime(rec.time)}</span>`;
            leaderboardList.appendChild(li);
            index++;
        });
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
    }
}

// Initial display
displayLeaderboard();

startButton.addEventListener('click', () => {
    userNickname = nicknameInput.value.trim() || "Guest";
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

// --- Lap Timing System ---
let lapStartTime = 0;
let bestLapTime = Infinity;
let lapCount = 0;
let hasPassedHalfway = false;
const currentLapDisplay = document.getElementById('current-lap');
const bestLapDisplay = document.getElementById('best-lap');
const lapCountDisplay = document.getElementById('lap-count');

function formatTime(ms) {
    if (ms === Infinity) return "--:--.--";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const hundredths = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${hundredths.toString().padStart(2, '0')}`;
}

function animate() {
    requestAnimationFrame(animate);
    if (!gameStarted) {
        lapStartTime = performance.now();
        return;
    }
    
    const currentTime = performance.now();
    const lapTime = currentTime - lapStartTime;
    currentLapDisplay.textContent = `LAP TIME: ${formatTime(lapTime)}`;
    
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

    // --- Banked Track Physics & Collision ---
    const dist = Math.sqrt(carGroup.position.x ** 2 + carGroup.position.z ** 2);
    
    // Hard boundary at Catch Fence (Outer) and Inner Grass
    const safeOuter = outerRadius - 1.5;
    const safeInner = innerRadius + 1;
    
    if (dist > safeOuter) {
        const factor = safeOuter / dist;
        carGroup.position.x *= factor;
        carGroup.position.z *= factor;
        velocity *= 0.98; // Slide along the wall with less friction
    } else if (dist < safeInner) {
        const factor = safeInner / dist;
        carGroup.position.x *= factor;
        carGroup.position.z *= factor;
        velocity *= 0.9; // Friction on inner edge
    }

    const currentDist = Math.sqrt(carGroup.position.x ** 2 + carGroup.position.z ** 2);
    if (currentDist >= innerRadius && currentDist <= outerRadius) {
        // Calculate height based on distance from center (linear interpolation)
        const t = (dist - innerRadius) / (outerRadius - innerRadius);
        const targetY = t * 8 + 0.2; // 8 is the height difference
        carGroup.position.y = targetY;
        
        // Tilt car to match banking
        const slopeAngle = Math.atan2(8, outerRadius - innerRadius);
        carGroup.rotation.z = -slopeAngle; 

        // --- Lap Detection Logic (Angle-based) ---
        const carAngle = Math.atan2(carGroup.position.x, carGroup.position.z);
        
        // Halfway point is the opposite side (around PI or -PI)
        if (Math.abs(carAngle) > 2.5) {
            hasPassedHalfway = true;
        }

        // Finish line is at angle 0. Detect crossing from halfway.
        if (hasPassedHalfway && Math.abs(carAngle) < 0.1) {
            const finalLapTime = currentTime - lapStartTime;
            
            // Update leaderboard if it's a new lap
            saveRecord(userNickname, finalLapTime);

            if (finalLapTime < bestLapTime) {
                bestLapTime = finalLapTime;
                bestLapDisplay.textContent = `BEST LAP: ${formatTime(bestLapTime)}`;
            }
            lapCount++;
            lapCountDisplay.textContent = `LAPS: ${lapCount}`;
            lapStartTime = currentTime;
            hasPassedHalfway = false;
        }
    } else {
        carGroup.position.y = 0.2;
        carGroup.rotation.z = 0;
    }

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