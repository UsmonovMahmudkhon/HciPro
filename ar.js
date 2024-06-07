import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.151.3/build/three.module.js';
import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.151.3/examples/jsm/webxr/ARButton.js';

// Replace with your Unsplash Access Key
const UNSPLASH_ACCESS_KEY = 'gqEYNmX6p2vGAUvjyz-EntntGkwDA2noKPaZdzhuxQ0';

// Initialize AR environment
let container, camera, scene, renderer;
let reticle, hitTestSource, localSpace, hitTestSourceInitialized = false;

init();
animate();

async function init() {
    container = document.getElementById('ar-container');

    // Basic scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    // Lighting
    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    // Reticle for image placement
    addReticleToScene();

    // AR Button
    const button = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: document.getElementById('content') }
    });
    document.body.appendChild(button);

    renderer.xr.addEventListener('sessionstart', () => {
        document.getElementById('content').style.visibility = 'visible';
    });

    window.addEventListener("resize", onWindowResize, false);

    // Load and display Unsplash images
    await loadUnsplashImages();

    console.log('Initialization complete.');
}

async function loadUnsplashImages() {
    try {
        const response = await fetch(`https://api.unsplash.com/photos/random?count=10&client_id=${UNSPLASH_ACCESS_KEY}`);
        const images = await response.json();
        const imageSelector = document.getElementById('image-selector');

        images.forEach(image => {
            const imgElement = document.createElement('img');
            imgElement.src = image.urls.thumb;
            imgElement.alt = image.description || 'Unsplash Image';
            imgElement.addEventListener('click', () => {
                placePictureToScene(image.urls.full);
            });
            imageSelector.appendChild(imgElement);
        });
    } catch (error) {
        console.error('Error fetching images:', error);
    }
}

function addReticleToScene() {
    const geometry = new THREE.RingGeometry(0.05, 0.075, 360).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial();
    reticle = new THREE.Mesh(geometry, material);
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);
    console.log('Reticle added to scene');
}

function placePictureToScene(url) {
    if (reticle.visible) {
        const geometry = new THREE.PlaneGeometry(0.5, 0.5);
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(url, () => {
            const material = new THREE.MeshBasicMaterial({ map: texture });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.setFromMatrixPosition(reticle.matrix);
            mesh.quaternion.setFromRotationMatrix(reticle.matrix);
            scene.add(mesh);
            console.log('Picture placed in scene.');
        }, undefined, (error) => {
            console.error(`Texture load error: ${error.message}`);
        });
    } else {
        console.warn('Reticle not visible; picture not placed.');
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

async function initializeHitTestSource() {
    const session = renderer.xr.getSession();
    const viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
    localSpace = await session.requestReferenceSpace("local");
    hitTestSourceInitialized = true;
    session.addEventListener("end", () => {
        hitTestSourceInitialized = false;
        hitTestSource = null;
    });
    console.log('Hit test source initialized');
}

function render(timestamp, frame) {
    if (frame) {
        if (!hitTestSourceInitialized) {
            initializeHitTestSource();
        }

        if (hitTestSourceInitialized) {
            const hitTestResults = frame.getHitTestResults(hitTestSource);
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                const pose = hit.getPose(localSpace);
                reticle.visible = true;
                reticle.matrix.fromArray(pose.transform.matrix);
                console.log('Hit test successful. Reticle updated.');
            } else {
                reticle.visible = false;
                console.warn('No hit test results.');
            }
        }
    }
    renderer.render(scene, camera);
}
