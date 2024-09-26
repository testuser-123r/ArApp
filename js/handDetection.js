
let detector;
const videoElement = arSource ? arSource.domElement : null; // Verwende arSource.domElement
let isFlipping = false;

// Überprüfe, ob arSource verfügbar ist
if (!videoElement) {
    console.error('AR Source ist nicht verfügbar.');
}

// Initialisiere die Handgestenerkennung
async function initHandDetection() {
    if (!videoElement) return;

    console.log('Starte Handgestenerkennung...');
    const model = handPoseDetection.SupportedModels.MediaPipeHands;
    const detectorConfig = {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
        modelType: 'lite',
        maxHands: 1
    };
    try {
        detector = await handPoseDetection.createDetector(model, detectorConfig);
        console.log('Hand Detector geladen');
    } catch (error) {
        console.error('Fehler beim Laden des Hand Detectors:', error);
        return;
    }

    detectHands();
}

// Handgestenerkennung und Aktion auslösen
async function detectHands() {
    if (!detector || !videoElement) return;

    try {
        const predictions = await detector.estimateHands(videoElement, { flipHorizontal: true });
        // console.log('Hand Predictions:', predictions);

        if (predictions.length > 0) {
            const landmarks = predictions[0].keypoints3D;
            // console.log('Landmarks:', landmarks);

            if (isHandOpen(landmarks) && !isFlipping) {
                console.log('Offene Hand erkannt');
                isFlipping = true;
                // Finde die Karte unter dem Finger und flippe sie
                flipCardUnderFinger(landmarks);
                setTimeout(() => { isFlipping = false; }, 1000); // Verhindere schnelles mehrfaches Flipping
            }
        }

    } catch (error) {
        console.error('Fehler bei der Handgestenerkennung:', error);
    }

    requestAnimationFrame(detectHands);
}

// Funktion zur Erkennung einer offenen Hand
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

    const isOpen =
        thumbTip < thumbMcp &&
        indexTip < indexMcp &&
        middleTip < middleMcp &&
        ringTip < ringMcp &&
        pinkyTip < pinkyMcp;

    console.log('Hand ist offen:', isOpen);
    return isOpen;
}

// Funktion zum Umdrehen der Karte unter dem Finger
function flipCardUnderFinger(landmarks) {
    const indexFinger = landmarks[8]; // Zeigefinger Spitze
    const videoWidth = videoElement.videoWidth || 640;
    const videoHeight = videoElement.videoHeight || 480;

    const x = (indexFinger.x / videoWidth) * 2 - 1;
    const y = - (indexFinger.y / videoHeight) * 2 + 1;

    console.log(`Raycaster Position: x=${x}, y=${y}`);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(x, y);
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cards);

    if (intersects.length > 0) {
        const selectedCard = intersects[0].object;
        console.log('Karte gefunden:', selectedCard.userData.img);
        flipCard(selectedCard);
    } else {
        console.log('Keine Karte unter dem Finger gefunden.');
    }
}

// Starte die Handgestenerkennung nach einer kurzen Verzögerung, um sicherzustellen, dass arSource initialisiert ist
setTimeout(() => {
    initHandDetection();
}, 3000); // Warte 3 Sekunden

