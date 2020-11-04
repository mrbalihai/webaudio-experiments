import * as THREE from './lib/three/build/three.module.js';
import { FlyControls } from './lib/three/examples/jsm/controls/FlyControls.js';

let context = undefined;
let analyser = undefined;
let ctx = undefined;

const initContext = () => {
    if (context === undefined)
        context = new AudioContext();
    if (analyser === undefined) {
        analyser = context.createAnalyser();
        analyser.fftSize = 256;
    }
}

const createButton = (text, fn) => {
    const button = document.createElement('button');
    button.innerText = text;
    button.addEventListener('click', fn);
    return button;
}

const handleKeyPress = (e) => {
    switch(e.key) {
        case 'j':
            initContext();
            kick(context.currentTime);
            break;
        case 'k':
            initContext();
            snare(context.currentTime);
            break;
        case 'l':
            initContext();
            hihat(context.currentTime);
            break;
    }
}

const createNoiseBuffer = (context) => {
    const bufferSize = context.sampleRate;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

const kick = (time) => {
    const freq = 150,
        len = 0.5,
        release = 0.1,
        gainNode = context.createGain(),
        oscNode = context.createOscillator();

    oscNode.type = "sine";
    oscNode.frequency.value = freq;
    oscNode.connect(gainNode)
        .connect(analyser)
        .connect(context.destination);

    gainNode.gain.cancelScheduledValues(time);
    oscNode.frequency.setValueAtTime(freq, time);
    gainNode.gain.setValueAtTime(1, time);
    oscNode.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + len - release);

    oscNode.start(time);
    oscNode.stop(time + len);
}

const snare = (time) => {
    const noise = context.createBufferSource(),
        noiseFilter = context.createBiquadFilter(),
        noiseEnvelope = context.createGain(),
        oscNode = context.createOscillator(),
        oscEnvelope = context.createGain();

    noise.buffer = createNoiseBuffer(context);

    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    noise.connect(noiseFilter);
    oscNode.type = 'triangle';

    noiseFilter
        .connect(noiseEnvelope)
        .connect(analyser)
        .connect(context.destination);

    oscNode
        .connect(oscEnvelope)
        .connect(analyser)
        .connect(context.destination);

    noiseEnvelope.gain.setValueAtTime(1, time);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    noise.start(time)

    oscNode.frequency.setValueAtTime(100, time);
    oscEnvelope.gain.setValueAtTime(0.7, time);
    oscEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    oscNode.start(time)

    oscNode.stop(time + 0.2);
    noise.stop(time + 0.2);
}

const hihat = (time) => {
    const fundamental = 40;
    const ratios = [2, 3, 4.16, 5.43, 6.79, 8.21];

    const bandPass = context.createBiquadFilter();
    bandPass.type = "bandpass";
    bandPass.frequency.value = 10000;

    const oscEnvelope = context.createGain();
    oscEnvelope.gain.setValueAtTime(1, time);
    oscEnvelope.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    const highpass = context.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 7000;

    ratios.forEach((ratio) => {
        const osc = context.createOscillator();
        osc.type = "square";
        osc.frequency.value = fundamental * ratio;
        osc.connect(bandPass)
            .connect(oscEnvelope)
            .connect(highpass)
            .connect(analyser)
            .connect(context.destination);

        osc.start(time);
        osc.stop(time + 0.05);
    });
}

const init = () => {
    Object.assign(document.body.style, { margin: 0, backgroundColor: '#000000' });

    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, {
        position: 'absolute'
    });

    buttonContainer.appendChild(createButton('bum (j)', () => (initContext(), kick(context.currentTime))));
    buttonContainer.appendChild(createButton('tish (k)', () => (initContext(), snare(context.currentTime))));
    buttonContainer.appendChild(createButton('tap (l)', () => (initContext(), hihat(context.currentTime))));

    document.body.appendChild(buttonContainer);

    const clock = new THREE.Clock();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 50);
    camera.position.set(2.5, 1, 2);
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    const controls = new FlyControls(camera, document.body);
    controls.movementSpeed = 2;
    controls.rollSpeed = Math.PI / 14;
    controls.autoForward = false;
    controls.dragToLook = true;

    document.body.append(renderer.domElement);

    window.addEventListener('resize', () => (renderer.setSize(window.innerWidth, window.innerHeight)));
    window.addEventListener('keypress', handleKeyPress);

    const bars = [];
    const barGeom = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const barMat = new THREE.MeshNormalMaterial();
    for(let i=0; i<50; i++) {
        const barMesh = new THREE.Mesh(barGeom, barMat);
        barMesh.position.set((i * 0.11), 0, 0);
        barMesh.scale.y = 0.1;
        scene.add(barMesh);
        bars.push(barMesh);
    }
    camera.lookAt(bars[24].position);
    renderer.render(scene, camera);

    function draw() {
        const delta = clock.getDelta();
        requestAnimationFrame(draw);

        if (analyser === undefined)
            return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        analyser.getByteFrequencyData(dataArray);

        const maxHeight = 5;
        let x = 0;
        for(let i = 0; i < bufferLength; i++) {
            const barHeight = maxHeight * (dataArray[i] / 255);
            if (bars[i] && bars[i].scale) {
                if (barHeight < 0.1)
                    bars[i].scale.y = 0.1;
                else
                    bars[i].scale.y = barHeight;

            }
        }

        controls.update(delta);
        renderer.render(scene, camera);
    }
    draw();
}

init();
