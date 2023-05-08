import * as THREE from 'three'
import tinycolor from "https://esm.sh/tinycolor2";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/examples/jsm/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'

import { colorOffset, colorComplement, gaussianRandom, clamp, randomSign, roundToTwo } from './dataProcessing.js';
import { currentQuestionPercentage, currentQuestionAllPercentage } from './buttons.js';

const data = await d3.json("data.json")

let isFirstRun = true;

const noise = new ImprovedNoise();
const perlinNoise = (x, y, z) => noise.noise(x, y, z);

let canvas, renderer, camera, scene, orbit, cluster, baseComposer, bloomComposer, afterimagePass;
let autoRotateAngle = 0;
let rotationSpeed = 0;
let afterimagePassDamp = 0.8;
const clock = new THREE.Clock();

//render Config
let numCells = data.length;
let cellSizeMin = 0.25;
let cellSizeMax = 5.0;
let hazeSizeMin = 10.0;
let hazeSizeMax = 20.0;
let hazeOpacity = 0.1;
let BASE_LAYER = 0;
let BLOOM_LAYER = 1;
let brightness = 0.8;

const HAZE_RATIO = 1;

let coreDistances = [100, 150, 200, 400];
let Sizes = [10, 7, 4, 1];

let renderPercentage = [];
let cellScalePercentage = [];
let fearCriteria = "";

export function initClusters(criteria) {
    if (isFirstRun) {
        setValues(criteria);
        isFirstRun = false;
        initThree();
        cluster = new Cluster(scene);
        requestAnimationFrame(render);
    }
}

export function updateClusters(criteria) {
    setValues(criteria);
    cluster.resetObjects();
}

function setValues(criteria) {
    for (let i = 1; i <= 4; i++) {
        renderPercentage[i - 1] = (currentQuestionAllPercentage[i]);
    }

    let cellScaler = d3.scaleLinear()
        .domain([d3.min(renderPercentage), d3.max(renderPercentage)])
        .range([50, 0.2]);

    for (let i = 1; i <= 4; i++) {
        cellScalePercentage[i - 1] = cellScaler(currentQuestionAllPercentage[i]);
    }

    let rotationScaler = d3.scaleLinear()
        .domain([0, 0.5])
        .range([0.001, 0.009]);

    rotationSpeed = rotationScaler(renderPercentage[0]);

    fearCriteria = criteria;
}

const hazeTexture = new THREE.TextureLoader().load('../resources/feathered60.png');
const cellTexture = new THREE.TextureLoader().load('../resources/sprite120.png');

class Cluster {
    constructor(scene) {
        this.scene = scene
        this.cells = this.generateObject(numCells, (pos, scale, color) => new Cell(pos, scale, color))
        this.haze = this.generateObject(numCells * HAZE_RATIO, (pos, scale, color) => new Haze(pos, scale, color))
        this.cells.forEach((cell) => cell.toThreeObject(scene))
        this.haze.forEach((haze) => haze.toThreeObject(scene))
    }
    updateScale(camera) {
        this.cells.forEach((cell) => { cell.updateScale(camera) })
        this.haze.forEach((haze) => { haze.updateScale(camera) })
    }
    generateObject(numCells, generator) {
        let objects = [];
        for (let i = 0; i < coreDistances.length; i++) {
            for (let j = 0; j < numCells * renderPercentage[i]; j++) {
                let pos = new THREE.Vector3(
                    gaussianRandom(0, coreDistances[i]),
                    gaussianRandom(0, coreDistances[i]),
                    gaussianRandom(0, coreDistances[i])
                );
                let scale = new THREE.Vector3(Sizes[i], Sizes[i], Sizes[i]);

                const colorScaler = d3.scaleSequential()
                    .domain([d3.min(renderPercentage), d3.max(renderPercentage)])

                if (fearCriteria === "Health") colorScaler.interpolator(d3.interpolateRgb("mediumseagreen", "firebrick"));
                if (fearCriteria === "Environment") colorScaler.interpolator(d3.interpolateRgb("forestgreen", "darkorange"));
                if (fearCriteria === "Financial") colorScaler.interpolator(d3.interpolateRgb("limegreen", "whitesmoke"));
                if (fearCriteria === "Technological") colorScaler.interpolator(d3.interpolateRgb("dodgerblue", "lightsteelblue"));
                if (fearCriteria === "Calamities") colorScaler.interpolator(d3.interpolateRgb("slategray", "indianred"));
                if (fearCriteria === "Personal Phobias") colorScaler.interpolator(d3.interpolateRgb("orchid", "gold"));
                if (fearCriteria === "Crime") colorScaler.interpolator(d3.interpolateRgb("mediumslateblue", "crimson"));
                if (fearCriteria === "Society") colorScaler.interpolator(d3.interpolateRgb("cornflowerblue", "tomato"));

                let color = (colorScaler(renderPercentage[i]));

                let obj = generator(pos, scale, color);
                objects.push(obj);
            }
        }
        // console.log(objects);
        return objects;
    }
    resetObjects() {
        // Remove old objects from the scene
        this.cells.forEach((cell) => {
            cell.obj.visible = false;
            this.scene.remove(cell.obj);
        });
        this.haze.forEach((haze) => {
            haze.obj.visible = false;
            this.scene.remove(haze.obj);
        });

        // Generate new objects
        this.cells = this.generateObject(numCells, (pos, scale, color) => new Cell(pos, scale, color));
        this.haze = this.generateObject(numCells * HAZE_RATIO, (pos, scale, color) => new Haze(pos, scale, color));

        // Add new objects to the scene
        this.cells.forEach((cell) => cell.toThreeObject(this.scene));
        this.haze.forEach((haze) => haze.toThreeObject(this.scene));
    }
}

class Cell {
    constructor(position, scale, color) {
        this.position = position;
        this.scaling = scale;

        this.startingPosition = position.clone();

        this.cellColor = colorOffset(colorComplement(color));
        // this.cellColor = Math.floor(Math.random() * 0xFFFFFF);
        // this.cellColor = colorOffset(colorComplement("A020F0"));
        // console.log(this.cellColor);
        this.cellSize = 1;

        this.lifeLength = Math.random() * 2 + 2;
        this.birthDelay = Math.random() * 2;
        this.rebirthDelay = Math.random() * 0.01;

        this.obj = null;
    }
    reincarnation() {
        this.position.copy(this.startingPosition);
        this.obj.visible = false;
        this.lifeLength = Math.random() * 2 + 3;
        this.birthDelay = this.rebirthDelay;
        this.lifetime();
    }
    lifetime() {
        // setTimeout(() => {
        this.obj.visible = true;
        setTimeout(() => {
            this.obj.visible = false;
            this.reincarnation();
        }, this.lifeLength * 1000);
        // }, this.birthDelay * 1000);
    }
    updateScale(camera) {
        let dist = this.position.distanceTo(camera.position) / 250
        // let dist = 100
        // console.log(dist);
        let cellSize = dist * this.cellSize
        // cellSize = clamp(cellSize, cellSizeMin, cellSizeMax)
        // this.obj?.scale.copy(new THREE.Vector3(cellSize, cellSize, cellSize))
    }
    updatePosition(delta) {
        const noiseScale = 0.05;
        const noiseStrength = 40;
        const noiseVelocity = new THREE.Vector3(
            perlinNoise(this.position.x * noiseScale, this.position.y * noiseScale, this.position.z * noiseScale) * noiseStrength,
            perlinNoise(this.position.y * noiseScale, this.position.z * noiseScale, this.position.x * noiseScale) * noiseStrength,
            perlinNoise(this.position.z * noiseScale, this.position.x * noiseScale, this.position.y * noiseScale) * noiseStrength
        );
        this.position.add(noiseVelocity.clone().multiplyScalar(delta));
        this.obj.position.copy(this.position);
    }
    toThreeObject(scene) {
        let sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: cellTexture, color: this.cellColor }));
        sprite.layers.set(BLOOM_LAYER);
        // sprite.scale.multiplyScalar(clamp(CELL_MAX * Math.random(), CELL_MIN, CELL_MAX))
        sprite.position.copy(this.position);
        sprite.scale.copy(this.scaling)
        // console.log(sprite.scale);
        this.obj = sprite;
        // sprite.scale.multiplyScalar(this.scaling); //USE LATER
        this.obj.visible = false;
        scene.add(sprite);
        setTimeout(() => {
            this.lifetime();
        }, this.birthDelay * 1000);

    }
}

class Haze {
    constructor(position, scale, hazeColor) {
        this.startingPosition = position.clone(); // Save the initial position
        this.position = position;
        this.lifeLength = Math.random() * 2 + 10;
        this.birthDelay = Math.random() * 0.01;
        this.rebirthDelay = Math.random() * 0.01;
        this.obj = null;
        this.scaling = scale;
        this.hazeColor = hazeColor
    }
    reincarnation() {
        this.position.copy(this.startingPosition);
        this.obj.visible = false;
        this.lifeLength = Math.random() * 2 + 3;
        this.birthDelay = this.rebirthDelay;
        this.lifetime();
    }
    lifetime() {
        setTimeout(() => {
            this.obj.visible = true;
            setTimeout(() => {
                this.obj.visible = false;
                this.reincarnation();
            }, this.lifeLength * 1000);
        }, this.birthDelay * 1000);
    }
    updateScale(camera) {
        let dist = this.position.distanceTo(camera.position) / 700
        this.obj.material.opacity = clamp(hazeOpacity * Math.pow(dist / 2.5, 2), 0, hazeOpacity)
        this.obj.material.needsUpdate = true
    }
    updatePosition(delta) {
        const noiseScale = 0.01;
        const noiseStrength = 100;
        const noiseVelocity = new THREE.Vector3(
            perlinNoise(this.position.x * noiseScale, this.position.y * noiseScale, this.position.z * noiseScale) * noiseStrength,
            perlinNoise(this.position.y * noiseScale, this.position.z * noiseScale, this.position.x * noiseScale) * noiseStrength,
            perlinNoise(this.position.z * noiseScale, this.position.x * noiseScale, this.position.y * noiseScale) * noiseStrength
        );
        this.position.add(noiseVelocity.clone().multiplyScalar(delta));
        this.obj.position.copy(this.position);
    }
    toThreeObject(scene) {
        // console.log(this.hazeColor);
        let sprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: hazeTexture,
            // color: colorOffset(colorComplement("FF0000")),
            color: this.hazeColor,
            // color: colorOffset(tinycolor(fearColorScale(listOfAvgOfFears[fearNumber])).toRgbString()),
            opacity: hazeOpacity,
            depthTest: true,
            depthWrite: false
        }))

        let hazeScaler = d3.scaleLinear()
            .domain([d3.min(Sizes), d3.max(Sizes)])
            .range([hazeSizeMin, hazeSizeMax]);

        sprite.layers.set(BASE_LAYER)
        sprite.position.copy(this.position)
        // varying size of dust clouds
        // sprite.scale.multiplyScalar(clamp(hazeSizeMax * Math.random(), hazeSizeMin, hazeSizeMax))
        sprite.scale.copy(this.scaling)
        sprite.scale.multiplyScalar(hazeScaler(this.scaling.x))
        this.obj = sprite
        this.obj.visible = false;
        scene.add(sprite)
        // console.log(this.obj.material.color)
        setTimeout(() => {
            this.lifetime();
        }, this.birthDelay * 1000);
    }
}

function initThree() {
    canvas = document.querySelector('#fear');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#EBE2DB", 0.00003);
    // camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 5000000); instead of window, pass the width and height of the canvas element
    camera = new THREE.PerspectiveCamera(80, canvas.clientWidth / canvas.clientHeight, 0.1, 5000000);
    camera.position.set(750, 750, 750);
    camera.up.set(0, 0, 1);

    // orbit = new MapControls(camera, canvas)
    orbit = new TrackballControls(camera, canvas)
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;
    orbit.screenSpacePanning = false;
    orbit.minDistance = 10;
    orbit.maxDistance = 3000;
    orbit.noPan = true;
    orbit.maxPolarAngle = (Math.PI / 2) - (Math.PI / 360)
    initRenderPipeline()
}

function initRenderPipeline() {
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas,
        logarithmicDepthBuffer: true,
    })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = brightness //for the bloom

    const renderPass = new RenderPass(scene, camera)

    // Rendering pass for bloom
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85)
    bloomPass.threshold = 0.4;
    bloomPass.strength = 0.5;
    bloomPass.radius = 0;

    // bloom composer
    bloomComposer = new EffectComposer(renderer)
    bloomComposer.renderToScreen = false
    bloomComposer.addPass(renderPass)
    bloomComposer.addPass(bloomPass)

    // Shader pass to combine base layer, bloom layers
    const finalPass = new ShaderPass(
        new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
                }
            `,
            fragmentShader: `
                uniform sampler2D baseTexture;
                uniform sampler2D bloomTexture;
                varying vec2 vUv;
                void main() {
                    // BaseLayer + bloomLayer
                    gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv )  );
                }
            `,
            defines: {}
        }), 'baseTexture'
    );
    finalPass.needsSwap = true;

    // base layer composer
    baseComposer = new EffectComposer(renderer)
    baseComposer.addPass(renderPass)
    baseComposer.addPass(finalPass)

    // Add the AfterimagePass to create ghost trails
    afterimagePass = new AfterimagePass();
    baseComposer.addPass(afterimagePass);
    afterimagePass.uniforms['damp'].value = afterimagePassDamp;
}

function render() {
    orbit.update()

    autoRotateAngle += rotationSpeed;
    // Calculate new camera position using polar coordinates
    const radius = camera.position.distanceTo(new THREE.Vector3(0, 0, 0));

    camera.position.x = radius * Math.sin(autoRotateAngle) * Math.cos(autoRotateAngle);
    camera.position.y = radius * Math.sin(autoRotateAngle) * Math.sin(autoRotateAngle);
    camera.position.z = radius * Math.cos(autoRotateAngle);
    camera.lookAt(0, 0, 0);

    const delta = clock.getDelta();
    // fix buffer size
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }
    // fix aspect ratio
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();

    cluster.updateScale(camera)

    const elapsedTime = clock.getElapsedTime();

    let heartbeatFrequency = 1.5; //speed
    let heartbeatIntensity = 0.02; //size
    const heartbeat = 1 + heartbeatIntensity * Math.sin(heartbeatFrequency * elapsedTime * Math.PI);

    cluster.cells.forEach(cell => {
        cell.updatePosition(delta);
        cell.updateScale(camera);
        cell.obj.scale.multiplyScalar(heartbeat);
    });
    cluster.haze.forEach(haze => {
        haze.updatePosition(delta);
        haze.updateScale(camera);
        haze.obj.scale.multiplyScalar(heartbeat);
    });

    renderPipeline()
    requestAnimationFrame(render)
}

function renderPipeline() {
    camera.layers.set(BLOOM_LAYER)
    bloomComposer.render()
    camera.layers.set(BASE_LAYER)
    baseComposer.render()
}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
        renderer.setSize(width, height, false);
    }
    return needResize;
}