/**
 * Funktion zum Platzieren von Objekten bei einem Klick oder Touch
 * @param {Event} evt - Das Klick- oder Touch-Event
 */
function placeObject(evt) {
  const sceneEl = document.querySelector('a-scene');
  const objectContainer = document.getElementById('object-container');

  // Erstellen eines Raycasters
  const raycaster = new THREE.Raycaster();
  const camera = sceneEl.camera;
  const mouse = new THREE.Vector2();

  // Bestimmen der Klick- oder Touch-Position
  if (evt.type === 'touchend') {
    const touch = evt.changedTouches[0];
    mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (touch.clientY / window.innerHeight) * 2 + 1;
  } else {
    mouse.x = (evt.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (evt.clientY / window.innerHeight) * 2 + 1;
  }

  raycaster.setFromCamera(mouse, camera);

  // Suche nach Schnittpunkten mit der Umgebung
  const intersects = raycaster.intersectObjects(sceneEl.object3D.children, true);

  let position;
  if (intersects.length > 0) {
    // Platzieren des Objekts an der Schnittstelle
    position = intersects[0].point;
  } else {
    // Platzieren des Objekts 0,5 Meter vor der Kamera, wenn keine Schnittpunkte gefunden wurden
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    position = new THREE.Vector3().copy(camera.position).add(direction.multiplyScalar(0.5));
  }

  createBox(position);
}

/**
 * Funktion zum Erstellen und Hinzufügen eines Box-Objekts zur Szene
 * @param {THREE.Vector3} position - Die Position, an der das Objekt platziert werden soll
 */
function createBox(position) {
  const box = document.createElement('a-box');
  box.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
  box.setAttribute('rotation', '0 45 0');
  box.setAttribute('color', '#4CC3D9');
  box.setAttribute('depth', '0.2');   // Realistischere Größe
  box.setAttribute('height', '0.2');  // Realistischere Größe
  box.setAttribute('width', '0.2');   // Realistischere Größe
  box.setAttribute('shadow', 'cast: true; receive: true');
  objectContainer.appendChild(box);
}

// Event Listener für Klick oder Touch auf die Szene
const scene = document.querySelector('a-scene');
scene.addEventListener('click', placeObject);
scene.addEventListener('touchend', placeObject);

