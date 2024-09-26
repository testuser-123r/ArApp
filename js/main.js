// js/main.js

// Szene, Kamera und Renderer erstellen
const scene = new THREE.Scene();

const camera = new THREE.Camera();
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.domElement.style.position = 'absolute';
renderer.domElement.style.top = '0px';
renderer.domElement.style.left = '0px';
document.body.appendChild(renderer.domElement);

// AR.js Initialisierung
const arSource = new THREEx.ArToolkitSource({
    sourceType: 'webcam'
});

arSource.init(() => {
    setTimeout(onResize, 2000);
});

window.addEventListener('resize', () => {
    onResize();
});

function onResize() {
    arSource.onResizeElement();
    arSource.copyElementSizeTo(renderer.domElement);
    if (arContext.arController !== null) {
        arSource.copyElementSizeTo(arContext.arController.canvas);
    }
}

// AR Context
const arContext = new THREEx.ArToolkitContext({
    cameraParametersUrl: 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.3.2/data/camera_para.dat',
    detectionMode: 'mono'
});

arContext.init(() => {
    camera.projectionMatrix.copy(arContext.getProjectionMatrix());
});

// Marker hinzufügen
const markerRoot = new THREE.Group();
scene.add(markerRoot);
const arMarker = new THREEx.ArMarkerControls(arContext, markerRoot, {
    type: 'pattern',
    patternUrl: 'https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.3.2/data/patt.hiro'
});

// Spielvariablen
const totalPairs = 6; // Anzahl der Paare
let score = 0;
let firstCard = null;
let secondCard = null;
let lockBoard = false;

// UI-Elemente
const scoreElement = document.getElementById('score');
const messageElement = document.getElementById('message');
const restartButton = document.getElementById('restart');

// Kartenbilder laden
const cardImages = [];
for (let i = 1; i <= totalPairs; i++) {
    cardImages.push(`assets/images/card${i}.png`);
}

// Kartenpaar erstellen und mischen
let deck = [];
cardImages.forEach(img => {
    deck.push(img);
    deck.push(img);
});
deck = shuffle(deck);

// Karten erstellen und platzieren
const cards = [];
const gridSize = 3; // 3x4 Gitter (6 Paare = 12 Karten)
const spacing = 1.5;
const geometry = new THREE.PlaneGeometry(1, 1.5);

deck.forEach((img, index) => {
    const texture = new THREE.TextureLoader().load('assets/images/back.png');
    const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
    const card = new THREE.Mesh(geometry, material);
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;
    card.position.set((col - (gridSize - 1) / 2) * spacing, (row - 1) * spacing, 0);
    card.userData = { img, flipped: false, matched: false };
    scene.add(card);
    cards.push(card);
});

// Rückseite der Karten vorbereiten
const backTexture = new THREE.TextureLoader().load('assets/images/back.png');

// Funktion zum Mischen
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Karten umdrehen
function flipCard(card) {
    if (lockBoard || card.userData.flipped || card.userData.matched) return;

    card.userData.flipped = true;
    card.material.map = new THREE.TextureLoader().load(card.userData.img);

    if (!firstCard) {
        firstCard = card;
    } else {
        secondCard = card;
        checkForMatch();
    }
}

// Überprüfung auf ein Paar
function checkForMatch() {
    lockBoard = true;
    const isMatch = firstCard.userData.img === secondCard.userData.img;

    if (isMatch) {
        firstCard.userData.matched = true;
        secondCard.userData.matched = true;
        score += 10;
        updateScore();
        resetBoard();
        checkGameEnd();
    } else {
        setTimeout(() => {
            firstCard.userData.flipped = false;
            secondCard.userData.flipped = false;
            firstCard.material.map = backTexture;
            secondCard.material.map = backTexture;
            resetBoard();
        }, 1000);
    }
}

// Reset Board
function resetBoard() {
    [firstCard, secondCard] = [null, null];
    lockBoard = false;
}

// Spielende prüfen
function checkGameEnd() {
    const allMatched = cards.every(card => card.userData.matched);
    if (allMatched) {
        messageElement.textContent = 'Glückwunsch! Spiel beendet.';
    }
}

// Score aktualisieren
function updateScore() {
    scoreElement.textContent = `Punkte: ${score}`;
}

// Restart-Funktion
restartButton.addEventListener('click', () => {
    location.reload();
});

// Klick-Interaktion (optional, kann beibehalten werden)
renderer.domElement.addEventListener('click', (event) => {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = - (event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cards);

    if (intersects.length > 0) {
        const selectedCard = intersects[0].object;
        flipCard(selectedCard);
    }
}, false);

// Render-Schleife
function animate() {
    requestAnimationFrame(animate);
    if (arSource.ready === false) return;

    arContext.update(arSource.domElement);
    renderer.render(scene, camera);
}
animate();
