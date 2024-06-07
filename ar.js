//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


// Import three.js and ARButton module
import * as THREE from './libs/three.module.js';
import { ARButton } from './libs/ARButton.js';

// Replace with secure way of handling API keys
const KEY = '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';

let container, camera, scene, renderer;
let reticle, hitTestSource, localSpace, hitTestSourceInitialized = false;

init();
animate();

function init() {
    container = document.getElementById('ar-container');

    // Check if container is available
    if (!container) {
        console.error('Container element not found');
        return;
    }

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        20
    );

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    addReticleToScene();

    // Create AR button
    const button = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: {
            root: document.getElementById('content')
        }
    });
    document.body.appendChild(button);

    // Ensure the session start visibility change
    renderer.xr.addEventListener('sessionstart', visibleContent);
    window.addEventListener("resize", onWindowResize, false);

    // Generate image on button click
    const generateButton = document.getElementById('generate');
    generateButton.addEventListener('click', async () => {
        try {
            const result = await generateImage('cat');
            if (result && result.data && result.data[0] && result.data[0].url) {
                placePictureToScene(result.data[0].url);
            } else {
                alert('Failed to generate image');
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        }
    });

    // Debugging info
    console.log('Initialization complete');
}

async function generateImage(text) {
    try {
        const response = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${KEY}`
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt: text,
                n: 1
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        return response.json();
    } catch (error) {
        throw new Error(`Failed to generate image: ${error.message}`);
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

function visibleContent() {
    const content = document.getElementById('content');
    if (content) {
        content.style.visibility = 'visible';
        console.log('AR session started');
    } else {
        console.error('Content element not found');
    }
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
            console.log('Picture placed in scene');
        }, undefined, (error) => {
            console.error(`Texture load error: ${error.message}`);
        });
    } else {
        console.warn('Reticle not visible; picture not placed');
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
            } else {
                reticle.visible = false;
            }
        }
    }
    renderer.render(scene, camera);
}
