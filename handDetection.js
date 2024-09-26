// js/handDetection.js

let detector;
const video = document.getElementById('video');
let isFlipping = false;

// Karten und Kamera aus main.js importieren
// Da main.js und handDetection.js im globalen Scope laufen, sind die Variablen verfügbar

// Initialisiere die Handgestenerkennung
async function initHandDetection() {
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
        runtime: 'mediapipe', // 'tfjs' oder 'mediapipe'
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        modelType: 'lite',
        maxHands: 1
    };
    detector = await handPoseDetection.createDetector(model, detectorConfig);
    console.log('Hand Detector geladen');

    // Starte die Videoaufnahme
    await setupCamera();
    video.play();
    detectHands();
}

// Kamera einrichten
async function setupCamera() {
    if (navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false
        });
        video.srcObject = stream;
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve(video);
            };
        });
    } else {
        alert('Kamera nicht verfügbar');
    }
}

// Handgestenerkennung und Aktion auslösen
async function detectHands() {
    const predictions = await detector.estimateHands(video, { flipHorizontal: true });

    if (predictions.length > 0) {
        const landmarks = predictions[0].keypoints3D; // Verwende 3D-Landmarks für genauere Position
        // Beispiel: Erkenne eine bestimmte Geste, z.B. eine offene Hand
        if (isHandOpen(landmarks) && !isFlipping) {
            isFlipping = true;
            // Finde die Karte unter dem Finger und flippe sie
            flipCardUnderFinger(landmarks);
            setTimeout(() => { isFlipping = false; }, 1000); // Verhindere schnelles mehrfaches Flipping
        }
    }

    requestAnimationFrame(detectHands);
}

// Beispiel: Erkennung einer offenen Hand
function isHandOpen(landmarks) {
    // Einfache Logik: Prüfe, ob die Finger gestreckt sind
    // Dies kann je nach Modell und Genauigkeit variieren
    // Hier wird vereinfacht überprüft, ob die Fingerendpunkte über den Gelenken sind
    // Landmarks-Indices für MediaPipe Hands:
    // 0: Handgelenk, 1-4: Daumen, 5-8: Zeigefinger, 9-12: Mittelfinger, 13-16: Ringfinger, 17-20: kleiner Finger
    const thumbTip = landmarks[4].y;
    const indexTip = landmarks[8].y;
    const middleTip = landmarks[12].y;
    const ringTip = landmarks[16].y;
    const pinkyTip = landmarks[20].y;

    const thumbMcp = landmarks[2].y;
    const indexMcp = landmarks[5].y;
    const middleMcp = landmarks[9].y;
    const ringMcp = landmarks[13].y;
    const pinkyMcp = landmarks[17].y;

    return (
        thumbTip < thumbMcp &&
        indexTip < indexMcp &&
        middleTip < middleMcp &&
        ringTip < ringMcp &&
        pinkyTip < pinkyMcp
    );
}

// Funktion zum Umdrehen der Karte unter dem Finger
function flipCardUnderFinger(landmarks) {
    const indexFinger = landmarks[8]; // Zeigefinger Spitze
    const x = (indexFinger.x / video.width) * 2 - 1;
    const y = - (indexFinger.y / video.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(x, y);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cards);

    if (intersects.length > 0) {
        const selectedCard = intersects[0].object;
        flipCard(selectedCard);
    }
}

// Starte die Handgestenerkennung
initHandDetection();
