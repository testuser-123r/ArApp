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

    // AR.js Initialisierung
    arSource = new THREEx.ArToolkitSource({
        sourceType: 'webcam',
        sourceWidth: 640,
        sourceHeight: 480
    });

    arSource.init(() => {
        onResize(); // Stelle sicher, dass onResize() definiert ist
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
    const spacingX = 1.5;
    const spacingY = 1.5;
    const geometry = new THREE.PlaneGeometry(1, 1.5);

    deck.forEach((img, index) => {
        const texture = new THREE.TextureLoader().load('assets/images/back.png');
        const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true });
        const card = new THREE.Mesh(geometry, material);
        const row = Math.floor(index / gridCols);
        const col = index % gridCols;
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

    // Drehe die Karte um die Y-Achse
    const flipAnimation = new TWEEN.Tween(card.rotation)
        .to({ y: card.rotation.y + Math.PI }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();

    // Ändere die Textur nach der Animation
    flipAnimation.onComplete(() => {
        card.material.map = new THREE.TextureLoader().load(card.userData.img);
    });

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

        // Beispiel: Karten pulsieren lassen
        const pulse = new TWEEN.Tween(firstCard.scale)
            .to({ x: 1.2, y: 1.2, z: 1.2 }, 300)
            .yoyo(true)
            .repeat(1)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();

        const pulse2 = new TWEEN.Tween(secondCard.scale)
            .to({ x: 1.2, y: 1.2, z: 1.2 }, 300)
            .yoyo(true)
            .repeat(1)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();

        pulse.onComplete(() => {
            resetBoard();
            checkGameEnd();
        });

    } else {
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
    location.reload();
});

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

// Interaktionen hinzufügen
renderer.domElement.addEventListener('click', (event) => {
    // Berechne die Mausposition im Normalized Device Coordinates (-1 bis +1) für beide Komponenten
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
});

