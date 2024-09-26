let camera, scene, renderer;
let controller;
let reticle;
let hitTestSource = null;
let selectedObject = 'box'; // Standardobjekt

init();
animate();

function init() {
    // Szene und Kamera einrichten
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    // Renderer einrichten
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Licht hinzufügen
    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    // Reticle (Zielkreuz) hinzufügen
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0x0fff00 });
    reticle = new THREE.Mesh(geometry, material);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    // Controller einrichten
    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    // UI-Buttons
    const enterAR = document.getElementById('enter-ar');
    enterAR.addEventListener('click', () => {
        navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test']
        }).then(onSessionStarted).catch((err) => {
            console.error("AR Session konnte nicht gestartet werden:", err);
        });
    });

    const buttons = document.querySelectorAll('#ui button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            selectedObject = button.getAttribute('data-obj');
        });
    });

    // Überprüfen, ob WebXR AR unterstützt wird
    if (navigator.xr) {
        navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
            if (supported) {
                document.getElementById('enter-ar').style.display = 'block';
            } else {
                document.getElementById('enter-ar').style.display = 'none';
                alert('AR wird auf diesem Gerät nicht unterstützt.');
            }
        }).catch((err) => {
            console.error("Fehler beim Prüfen der Session-Unterstützung:", err);
        });
    } else {
        alert('WebXR wird von diesem Browser nicht unterstützt.');
    }

    // Fenstergröße anpassen
    window.addEventListener('resize', onWindowResize);
}

function onSessionStarted(session) {
    renderer.xr.setSession(session);
    reticle.visible = false;

    const referenceSpace = renderer.xr.getReferenceSpace();

    // Anfordern der Hit-Test Quelle
    session.requestReferenceSpace('viewer').then((viewerRefSpace) => {
        return session.requestHitTestSource({ space: viewerRefSpace });
    }).then((source) => {
        hitTestSource = source;
    }).catch((err) => {
        console.error("Hit-Test Source konnte nicht angefordert werden:", err);
    });

    session.addEventListener('end', () => {
        hitTestSource = null;
    });
}

function onSelect() {
    if (reticle.visible) {
        let geometry;
        if (selectedObject === 'box') {
            geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
        } else if (selectedObject === 'sphere') {
            geometry = new THREE.SphereGeometry(0.05, 32, 32);
        }

        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.setFromMatrixPosition(reticle.matrix);
        scene.add(mesh);
    }
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
    if (frame) {
        const session = frame.session;
        const referenceSpace = renderer.xr.getReferenceSpace();

        if (hitTestSource) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(referenceSpace);
                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                reticle.visible = false;
            }
        }
    }

    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
