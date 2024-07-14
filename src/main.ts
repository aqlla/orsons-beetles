// import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Stats from 'three/addons/libs/stats.module.js'
import { GUI } from 'dat.gui'
import { getEarth } from './earth.js'

const uni = {
    n: 89,
    r: 25,
    fov: 15,
    scale: 1,
    atmo_scale: 1.218,
    wireframe: false,
    flat_shading: false,
    outlines: false,
    moveSpeed: .01,
    rotationSpeed: .02,
    zoomSpeed: .5,
    rotateEarth: true,
}

const scene = new THREE.Scene()

const camera = new THREE.PerspectiveCamera(uni.fov, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.z = 250

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
const controls = new OrbitControls(camera, renderer.domElement)
// controls.autoRotate = true
document.body.appendChild(renderer.domElement)


// Basic Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 2);
sunLight.position.set(500, 0, 500);
sunLight.castShadow = true
scene.add(sunLight);

const helper = new THREE.DirectionalLightHelper( sunLight, 5 );
scene.add(helper);

const stats = new Stats()
document.body.appendChild(stats.dom)

const gui = new GUI()

const ocFolder = gui.addFolder('Controls')
ocFolder.add(controls, 'autoRotate')

const cameraFolder = gui.addFolder('Camera')
cameraFolder.add(camera, 'fov', 1, 360).onChange(() => {
    camera.updateProjectionMatrix()
})
cameraFolder.add(camera, 'aspect', 0.00001, 10).onChange(() => {
    camera.updateProjectionMatrix()
})

// const camLookAtFolder = cameraFolder.addFolder('Look At')
// camLookAtFolder.add(camera.rotation, 'x', 0, Math.PI * 2)
// camLookAtFolder.add(camera.rotation, 'y', 0, Math.PI * 2)
// camLookAtFolder.add(camera.rotation, 'z', 0, Math.PI * 2)

const camPositionFolder = cameraFolder.addFolder('Position')
camPositionFolder.add(camera.position, 'x', -20, 20)
camPositionFolder.add(camera.position, 'y', -20, 20)
camPositionFolder.add(camera.position, 'z', 0, 20)

cameraFolder.open()

// const sunFolder = gui.addFolder('Sun')
// sunFolder.add()
// const ambientLight = gui.addFolder('Ambient Light')


const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 0, 1);
const Z_AXIS = new THREE.Vector3(0, 1, 0);


getEarth().then(({ earth, glowMesh }) => {
    earth?.rotateOnWorldAxis(Z_AXIS, 23.4 * Math.PI / 180)
    scene.add(earth!)
    scene.add(glowMesh!)
    
    const clock = new THREE.Clock()
    let delta
    
    function animate() {
        requestAnimationFrame(animate)
    
        delta = clock.getDelta()
    
        if (uni.rotateEarth) {
            // earth?.rotateOnAxis()
            earth!.rotation.y += uni.rotationSpeed * delta
        }
    
        camera.lookAt(0, 0, 0)
        renderer.render(scene, camera)
        stats.update()
    }

    animate()
})


const keys: Record<string, boolean> = { w: false, a: false, s: false, d: false };

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('keydown', (event) => {
    if (event.key === ' ') {
        uni.rotateEarth = !uni.rotateEarth
    }
    keys[event.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (event) => {
    keys[event.key.toLowerCase()] = false;
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

