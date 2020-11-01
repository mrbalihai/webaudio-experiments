let context = undefined;

const createButton = (text, fn) => {
    const startButton = document.createElement('button');
    startButton.innerText = text;
    startButton.addEventListener('click', fn);
    document.body.appendChild(startButton);
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

const kick = (context) => () => {
    if (context === undefined)
        context = new AudioContext();

    const freq = 150,
        len = 0.5,
        release = 0.1,
        gainNode = context.createGain(),
        oscNode = context.createOscillator(),
        now = context.currentTime;

    oscNode.type = "sine";
    oscNode.frequency.value = freq;
    oscNode.connect(gainNode);
    gainNode.connect(context.destination);

    gainNode.gain.cancelScheduledValues(now);
    oscNode.frequency.setValueAtTime(freq, now);
    gainNode.gain.setValueAtTime(1, now);
    oscNode.frequency.exponentialRampToValueAtTime(0.01, now + 0.5);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + len - release);

    oscNode.start(now);
    oscNode.stop(now + len);
}

const snare = (context) => () => {
    if (context === undefined)
        context = new AudioContext();

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

    noiseFilter.connect(noiseEnvelope);

    noiseEnvelope.connect(context.destination);

    oscNode.type = 'triangle';

    oscNode.connect(oscEnvelope);
    oscEnvelope.connect(context.destination);

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

createButton('bum', kick(context))
createButton('tish', snare(context))

