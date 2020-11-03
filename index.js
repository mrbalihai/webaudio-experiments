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

const dubstep = () => {
    // for(let i = 1; i < 10; i++) {
    //     let offset = i * ;
    // }
};

const init = () => {
    Object.assign(document.body.style, { margin: 0, backgroundColor: '#000000' });
    const canvas = document.createElement('canvas');
    canvas.id = 'canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    Object.assign(canvas.style, {
        width: `${window.innerWidth}px`,
        height: `${window.innerHeight}px`,
        display: 'block',
    });

    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, {
        position: 'absolute'
    });

    buttonContainer.appendChild(createButton('bum (j)', () => (initContext(), kick(context.currentTime))));
    buttonContainer.appendChild(createButton('tish (k)', () => (initContext(), snare(context.currentTime))));
    buttonContainer.appendChild(createButton('tap (l)', () => (initContext(), hihat(context.currentTime))));
    buttonContainer.appendChild(createButton('Dubstep', () => (initContext(), dubstep())));

    document.body.appendChild(buttonContainer);
    document.body.appendChild(canvas);

    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeigh);

    window.addEventListener('resize', () =>
        (canvas.width = canvas.style.width = window.innerWidth,
        canvas.height = canvas.style.height = window.innerHeight));

    window.addEventListener('keypress', handleKeyPress);

    function draw() {
        requestAnimationFrame(draw);

        if (analyser === undefined)
            return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        analyser.getByteFrequencyData(dataArray);
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        const barWidth = (window.innerWidth / bufferLength) * 2.5;
        let x = 0;
        for(let i = 0; i < bufferLength; i++) {
            const barHeight = window.innerHeight * (dataArray[i] / 255);

            ctx.fillStyle = `rgb(50, 50, 50)`;
            ctx.fillRect(x, window.innerHeight - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }
    draw();
}

init();
