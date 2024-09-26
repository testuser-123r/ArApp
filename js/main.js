// js/main.js

let scene, camera, renderer, arSource, arContext;
const cards = [];
const totalPairs = 6; // Anzahl der Paare
let score = 0;
let firstCard = null;
let secondCard = null;
let lockBoard = false;

// UI-Elemente
const scoreElement = document.getElementById('score');
const messageElement = document.getElementById('message');
const restartButton = document.getElementById('restart');

// Initialisiere die Szene, Kamera und Renderer
function initThreeJS() {
    scene = new THREE.Scene();

    camera = new THREE.Camera();
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('threejs-container').appendChild(renderer.domElement);

    // Licht hinzufügen (optional, verbessert die Darstellung)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1).normalize();
    scene.add(directionalLight);

    // AR.js Initialisierung
    arSource = new THREEx.ArToolkitSource({
        sourceType: 'webcam',
        sourceWidth: 640,
        sourceHeight: 480
    });

    arSource.init(() => {
        onResize();
        // Starte AR Context
        initARContext();
    });

    window.addEventListener('resize', onResize); // Registriere den Event-Listener
}

// Definiere die onResize() Funktion
function onResize() {
    arSource.onResizeElement();
    arSource.copyElementSizeTo(renderer.domElement);
    if (arContext.arController !== null) {
        arSource.copyElementSizeTo(arContext.arController.canvas);
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    console.log('Resize durchgeführt.');
}

// Initialisiere den AR-Kontext
function initARContext() {
    arContext = new THREEx.ArToolkitContext({
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

    console.log('Marker hinzugefügt.');

    // Erstelle Karten
    createCards();
}

// Karten erstellen und platzieren
function createCards() {
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
    const gridCols = 3; // Anzahl der Spalten
    const gridRows = Math.ceil(deck.length / gridCols);
    const spacingX = 1.2; // kleinere Karten
    const spacingY = 1.8; // angepasste Reihenhöhe
    const cardWidth = 1; // kleinere Breite
    const cardHeight = 1.5; // kleinere Höhe
    const geometry = new THREE.PlaneGeometry(cardWidth, cardHeight);

    deck.forEach((img, index) => {
        const texture = new THREE.TextureLoader().load('assets/images/back.png');
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
        const card = new THREE.Mesh(geometry, material);
        const row = Math.floor(index / gridCols);
        const col = index % gridCols;
        // Anpassen der Position, damit alle Karten sichtbar sind
        card.position.set((col - (gridCols - 1) / 2) * spacingX, (row - (gridRows - 1) / 2) * spacingY, 0);
        card.userData = { img, flipped: false, matched: false };
        scene.add(card);
        cards.push(card);
    });

    console.log('Karten erstellt und platziert.');
}

// Funktion zum Mischen der Karten
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
    const texture = new THREE.TextureLoader().load(card.userData.img);
    card.material.map = texture;

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
        // Karten nach kurzer Verzögerung wieder umdrehen
        setTimeout(() => {
            firstCard.userData.flipped = false;
            secondCard.userData.flipped = false;
            firstCard.material.map = new THREE.TextureLoader().load('assets/images/back.png');
            secondCard.material.map = new THREE.TextureLoader().load('assets/images/back.png');
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
    resetGame();
});

function resetGame() {
    cards.forEach(card => {
        card.userData.flipped = false;
        card.userData.matched = false;
        card.material.map = new THREE.TextureLoader().load('assets/images/back.png');
        card.rotation.set(0, 0, 0); // Setze Rotation zurück, falls animiert
    });
    firstCard = null;
    secondCard = null;
    lockBoard = false;
    score = 0;
    updateScore();
    messageElement.textContent = '';
}

// Funktion zur Erkennung von Klicks oder Touches auf Karten
function onDocumentMouseDown(event) {
    event.preventDefault();

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(cards);

    if (intersects.length > 0) {
        const selectedCard = intersects[0].object;
        flipCard(selectedCard);
    }
}

// Touch-Event Listener hinzufügen
function onDocumentTouchStart(event) {
    event.preventDefault();

    if (event.touches.length > 0) {
        const touch = event.touches[0];
        const mouse = new THREE.Vector2();
        mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
        mouse.y = - (touch.clientY / window.innerHeight) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects(cards);

        if (intersects.length > 0) {
            const selectedCard = intersects[0].object;
            flipCard(selectedCard);
        }
    }
}

// Event Listener für Mausklicks und Touches hinzufügen
renderer.domElement.addEventListener('mousedown', onDocumentMouseDown, false);
renderer.domElement.addEventListener('touchstart', onDocumentTouchStart, false);

// Render-Schleife
function animate() {
    requestAnimationFrame(animate);
    TWEEN.update(); // Aktualisiere Tween.js
    if (arSource.ready === false) return;

    arContext.update(arSource.domElement);
    renderer.render(scene, camera);
}
initThreeJS();
animate();
