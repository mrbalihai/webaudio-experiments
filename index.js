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

const createNoiseBuffer = (context) => {
    const bufferSize = context.sampleRate;
    const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    return buffer;
}

const kick = () => {
    initContext();
    const freq = 150,
        len = 0.5,
        release = 0.1,
        gainNode = context.createGain(),
        oscNode = context.createOscillator(),
        now = context.currentTime;

    oscNode.type = "sine";
    oscNode.frequency.value = freq;
    oscNode.connect(gainNode)
        .connect(analyser)
        .connect(context.destination);

    gainNode.gain.cancelScheduledValues(now);
    oscNode.frequency.setValueAtTime(freq, now);
    gainNode.gain.setValueAtTime(1, now);
    oscNode.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + len - release);

    oscNode.start(now);
    oscNode.stop(now + len);
}

const snare = () => {
    initContext();

    const noise = context.createBufferSource(),
        noiseFilter = context.createBiquadFilter(),
        noiseEnvelope = context.createGain(),
        oscNode = context.createOscillator(),
        oscEnvelope = context.createGain(),
        now = context.currentTime;

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

    noiseEnvelope.gain.setValueAtTime(1, now);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    noise.start(now)

    oscNode.frequency.setValueAtTime(100, now);
    oscEnvelope.gain.setValueAtTime(0.7, now);
    oscEnvelope.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    oscNode.start(now)

    oscNode.stop(now + 0.2);
    noise.stop(now + 0.2);
}

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

    const bumButton = createButton('bum', kick)
    const tishButton = createButton('tish', snare);
    buttonContainer.appendChild(bumButton);
    buttonContainer.appendChild(tishButton);

    document.body.appendChild(buttonContainer);
    document.body.appendChild(canvas);

    ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeigh);

    window.addEventListener('resize', () =>
        (canvas.width = canvas.style.width = window.innerWidth,
        canvas.height = canvas.style.height = window.innerHeight));

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
        let barHeight;
        let x = 0;
        for(let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;

            ctx.fillStyle = `rgb(50, 50, 50)`;
            ctx.fillRect(x, 0, barWidth, barHeight);

            x += barWidth + 1;
        }
    }
    draw();
}

init();
