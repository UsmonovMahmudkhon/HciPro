// To start an AR scene with webXR, we can use a handy button provided by three.js
// We first have to import it because it is a javascript module
import * as THREE from './libs/three.module.js'
import {
    ARButton
} from './libs/ARButton.js';

const KEY = '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';

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
        requiredFeatures: ["hit-test"], // notice a new required feature
        optionalFeatures: ["dom-overlay"],
        domOverlay: {
            root: document.getElementById('content')
        }
    });
    document.body.appendChild(button);
    renderer.domElement.style.display = "none";
    
    const prompt = document.getElementById('prompt');
    const generateButton = document.getElementById('generate');
    generateButton.addEventListener('click', (_) => {
        generateImage('cat').then((res) => {
            // alert(JSON.stringify(res));
            placePictureToScene(res.data[0].url);
        }).catch(e => {
            alert(e);
        });
    });

    generateButton.click();

    window.addEventListener("resize", onWindowResize, false);
}

async function generateImage(text) {
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
            // size: '512x512'
        })
    });

    return response.json();
}

function addReticleToScene() {
    const geometry = new THREE.RingGeometry(0.05, 0.075, 360).rotateX(
        -Math.PI / 2
    );
    const material = new THREE.MeshBasicMaterial();

    reticle = new THREE.Mesh(geometry, material);

    // we will calculate the position and rotation of this reticle every frame manually
    // in the render() function so matrixAutoUpdate is set to false
    reticle.matrixAutoUpdate = false;
    reticle.visible = false; // we start with the reticle not visible
    scene.add(reticle);

    // optional axis helper you can add to an object
    // reticle.add(new THREE.AxesHelper(1));
}

function visibleContent() {
    // console.log("ads");
    document.getElementById('content').style.visibility = 'visible';
}

function placePictureToScene(url) {
    if (reticle.visible) {
        try {
            // alert(src);
            const geometry = new THREE.BoxGeometry(0.5, 0, 0.5);
            
            const textureLoader = new THREE.TextureLoader();

            // textureLoader.crossOrigin = 'anonymous';

            const texture = textureLoader.load(`http://localhost:3000/proxy?url=${encodeURIComponent(url)}`, () => {}, (e) => {alert(JSON.stringify(e))}, function(e) {
                alert(`Error: ${JSON.stringify(e)}`);
            });
    
            const material = new THREE.MeshBasicMaterial({ map: texture });
    
            const mesh = new THREE.Mesh(geometry, material);
    
            // set the position of the cylinder based on where the reticle is          
            mesh.position.setFromMatrixPosition(reticle.matrix);
            mesh.quaternion.setFromRotationMatrix(reticle.matrix);
    
            scene.add(mesh);
        } catch(e) {
            alert(e);
        }
         // cone added at the point of a hit test
        // replace the next lines to add your own object in space
        // const geometry = new THREE.CylinderGeometry(0, 0.05, 0.2, 32);
        // const material = new THREE.MeshPhongMaterial({
        //     color: 0xffffff * Math.random()
        // });
        // const mesh = new THREE.Mesh(geometry, material);
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

// read more about hit testing here:
// https://github.com/immersive-web/hit-test/blob/master/hit-testing-explainer.md
// https://web.dev/ar-hit-test/

// hit testing provides the position and orientation of the intersection point, but nothing about the surfaces themselves.

let hitTestSource = null;
let localSpace = null;
let hitTestSourceInitialized = false;

// This function gets called just once to initialize a hitTestSource
// The purpose of this function is to get a) a hit test source and b) a reference space
async function initializeHitTestSource() {
    const session = renderer.xr.getSession(); // XRSession

    // Reference spaces express relationships between an origin and the world.

    // For hit testing, we use the "viewer" reference space,
    // which is based on the device's pose at the time of the hit test.
    const viewerSpace = await session.requestReferenceSpace("viewer");
    hitTestSource = await session.requestHitTestSource({
        space: viewerSpace
    });

    // We're going to use the reference space of "local" for drawing things.
    // which gives us stability in terms of the environment.
    // read more here: https://developer.mozilla.org/en-US/docs/Web/API/XRReferenceSpace
    localSpace = await session.requestReferenceSpace("local");

    // set this to true so we don't request another hit source for the rest of the session
    hitTestSourceInitialized = true;

    // In case we close the AR session by hitting the button "End AR"
    session.addEventListener("end", () => {
        hitTestSourceInitialized = false;
        hitTestSource = null;
    });
}

// the callback from 'setAnimationLoop' can also return a timestamp
// and an XRFrame, which provides access to the information needed in
// order to render a single frame of animation for an XRSession describing
// a VR or AR sccene.
function render(timestamp, frame) {
    if (frame) {
        // 1. create a hit test source once and keep it for all the frames
        // this gets called only once
        if (!hitTestSourceInitialized) {
            initializeHitTestSource();
        }

        // 2. get hit test results
        if (hitTestSourceInitialized) {
            // we get the hit test results for a particular frame
            const hitTestResults = frame.getHitTestResults(hitTestSource);

            // XRHitTestResults The hit test may find multiple surfaces. The first one in the array is the one closest to the camera.
            if (hitTestResults.length > 0) {
                const hit = hitTestResults[0];
                // Get a pose from the hit test result. The pose represents the pose of a point on a surface.
                const pose = hit.getPose(localSpace);

                reticle.visible = true;
                // Transform/move the reticle image to the hit test position
                reticle.matrix.fromArray(pose.transform.matrix);
            } else {
                reticle.visible = false;
            }
        }

        renderer.render(scene, camera);
    }
}