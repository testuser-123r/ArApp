let camera, scene, renderer;
let controller;
let reticle;
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
        }).then(onSessionStarted);
    });

    const buttons = document.querySelectorAll('#ui button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            selectedObject = button.getAttribute('data-obj');
        });
    });

    // Hit-Test Initialisierung
    navigator.xr && navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        if (supported) {
            enterAR.style.display = 'block';
        } else {
            enterAR.style.display = 'none';
            alert('AR wird auf diesem Gerät nicht unterstützt.');
        }
    });
}

function onSessionStarted(session) {
    renderer.xr.setSession(session);
    session.addEventListener('end', () => {
        reticle.visible = false;
    });

    // Hit-Test Quelle und Ziele
    let xrReferenceSpace = null;
    session.requestReferenceSpace('viewer').then((refSpace) => {
        xrReferenceSpace = refSpace;
        return session.requestReferenceSpace('local').then((localRefSpace) => {
            const xrHitTestSource = session.requestHitTestSource({ space: localRefSpace });
            xrHitTestSource.then((source) => {
                session.addEventListener('select', onSelect);
                session.requestAnimationFrame(onXRFrame);
            });
        });
    });
}

function onXRFrame(time, frame) {
    const session = frame.session;
    const referenceSpace = renderer.xr.getReferenceSpace();
    const hitTestResults = frame.getHitTestResults(renderer.xr.getSession().requestHitTestSource({ space: referenceSpace }));

    if (hitTestResults.length > 0) {
        const hit = hitTestResults[0].getPose(referenceSpace);
        reticle.visible = true;
        reticle.position.copy(hit.transform.position);
    } else {
        reticle.visible = false;
    }

    renderer.render(scene, camera);
    session.requestAnimationFrame(onXRFrame);
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
        mesh.position.copy(reticle.position);
        scene.add(mesh);
    }
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    renderer.render(scene, camera);
}

// Fenstergröße anpassen
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
