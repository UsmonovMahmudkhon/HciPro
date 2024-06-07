//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
// Import three.js and ARButton module
// Import three.js and ARButton module
import * as THREE from './libs/three.module.js';
import { ARButton } from './libs/ARButton.js';

// Use environment variable for the key
const KEY = process.env.OPENAI_API_KEY || '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';

let container;
let camera, scene, renderer;
let reticle;

init();
animate();

function init() {
    container = document.getElementById('ar-container');

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
    renderer.xr.addEventListener('sessionstart', visibleContent);
    container.appendChild(renderer.domElement);

    var light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    addReticleToScene();

    const button = ARButton.createButton(renderer, {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: {
            root: document.getElementById('content')
        }
    });
    document.body.appendChild(button);
    renderer.domElement.style.display = "none";

    const generateButton = document.getElementById('generate');
    generateButton.addEventListener('click', () => {
        generateImage('cat')
            .then(res => {
                if (res && res.data && res.data[0] && res.data[0].url) {
                    placePictureToScene(res.data[0].url);
                } else {
                    alert('Failed to generate image');
                }
            })
            .catch(e => {
                alert(`Error: ${e.message}`);
            });
    });

    window.addEventListener("resize", onWindowResize, false);

    // Add a check to make sure the XR session is supported
    if (!navigator.xr || !navigator.xr.isSessionSupported) {
        alert('WebXR not supported in this browser or device');
        return;
    }

    // Check if session is supported and provide feedback
    navigator.xr.isSessionSupported('immersive-ar').then((supported) => {
        if (!supported) {
            alert('AR not supported in this browser or device');
        }
    });
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
}

function visibleContent() {
    document.getElementById('content').style.visibility = 'visible';
}

function placePictureToScene(url) {
    if (reticle.visible) {
        try {
            const geometry = new THREE.BoxGeometry(0.5, 0, 0.5);
            const textureLoader = new THREE.TextureLoader();
            const texture = textureLoader.load(url, () => {
                const material = new THREE.MeshBasicMaterial({ map: texture });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.setFromMatrixPosition(reticle.matrix);
                mesh.quaternion.setFromRotationMatrix(reticle.matrix);
                scene.add(mesh);
            }, undefined, (error) => {
                alert(`Texture load error: ${error.message}`);
            });
        } catch (error) {
            alert(`Error placing picture: ${error.message}`);
        }
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

let hitTestSource = null;
let localSpace = null;
let hitTestSourceInitialized = false;

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


 
