import { AudioBuffer, AudioBufferSourceNode, MinimalOfflineAudioContext, OfflineAudioContext } from '../../src/module';
import { BACKUP_NATIVE_CONTEXT_STORE } from '../../src/globals';
import { createAudioContext } from '../helper/create-audio-context';
import { createMinimalOfflineAudioContext } from '../helper/create-minimal-offline-audio-context';
import { createNativeAudioContext } from '../helper/create-native-audio-context';
import { createNativeOfflineAudioContext } from '../helper/create-native-offline-audio-context';
import { createOfflineAudioContext } from '../helper/create-offline-audio-context';
import { isSafari } from '../helper/is-safari';
import { loadFixtureAsArrayBuffer } from '../helper/load-fixture';

const createAudioBufferWithDecodeAudioDataPromiseFunction = (context, { length, numberOfChannels = 1, sampleRate }) => {
    if (length !== 1000) {
        throw new Error("The length can't be changed when creating an AudioBuffer through decoding.");
    }

    if (numberOfChannels !== 1) {
        throw new Error("The numberOfChannels can't be changed when creating an AudioBuffer through decoding.");
    }

    if (sampleRate !== context.sampleRate) {
        throw new Error("The sampleRate can't be changed when creating an AudioBuffer through decoding.");
    }

    return loadFixtureAsArrayBuffer('1000-frames-of-noise-mono.wav')
        .then((arrayBuffer) => context.decodeAudioData(arrayBuffer));
};
const createAudioBufferWithDecodeAudioDataSuccessCallbackFunction = (context, { length, numberOfChannels = 1, sampleRate }) => {
    if (length !== 1000) {
        throw new Error("The length can't be changed when creating an AudioBuffer through decoding.");
    }

    if (numberOfChannels !== 1) {
        throw new Error("The numberOfChannels can't be changed when creating an AudioBuffer through decoding.");
    }

    if (sampleRate !== context.sampleRate) {
        throw new Error("The sampleRate can't be changed when creating an AudioBuffer through decoding.");
    }

    return loadFixtureAsArrayBuffer('1000-frames-of-noise-mono.wav')
        .then((arrayBuffer) => context.decodeAudioData(arrayBuffer));
};
const createAudioBufferWithConstructor = (_, { length, numberOfChannels = 1, sampleRate }) => {
    return Promise.resolve(new AudioBuffer({ length, numberOfChannels, sampleRate }));
};
const createAudioBufferWithFactoryFunction = (context, { length, numberOfChannels = 1, sampleRate }) => {
    return Promise.resolve(context.createBuffer(numberOfChannels, length, sampleRate));
};
const createAudioBufferWithStartRenderingFunction = (context, { length, numberOfChannels = 1, sampleRate }) => {
    if (context instanceof MinimalOfflineAudioContext) {
        return (new MinimalOfflineAudioContext({ length, numberOfChannels, sampleRate })).startRendering();
    }

    return (new OfflineAudioContext({ length, numberOfChannels, sampleRate })).startRendering();
};
const testCases = {
    'constructor': {
        createAudioBuffer: createAudioBufferWithConstructor,
        createContext: null
    },
    'decodeAudioData function promise of an AudioContext': {
        createAudioBuffer: createAudioBufferWithDecodeAudioDataPromiseFunction,
        createContext: createAudioContext
    },
    'decodeAudioData function promise of an OfflineAudioContext': {
        createAudioBuffer: createAudioBufferWithDecodeAudioDataPromiseFunction,
        createContext: createOfflineAudioContext
    },
    'decodeAudioData function success callback of an AudioContext': {
        createAudioBuffer: createAudioBufferWithDecodeAudioDataSuccessCallbackFunction,
        createContext: createAudioContext
    },
    'decodeAudioData function success callback of an OfflineAudioContext': {
        createAudioBuffer: createAudioBufferWithDecodeAudioDataSuccessCallbackFunction,
        createContext: createOfflineAudioContext
    },
    'factory function of an AudioContext': {
        createAudioBuffer: createAudioBufferWithFactoryFunction,
        createContext: createAudioContext
    },
    'factory function of an OfflineAudioContext': {
        createAudioBuffer: createAudioBufferWithFactoryFunction,
        createContext: createOfflineAudioContext
    },
    'startRendering function of a MinimalOfflineAudioContext': {
        createAudioBuffer: createAudioBufferWithStartRenderingFunction,
        createContext: createMinimalOfflineAudioContext
    },
    'startRendering function of an OfflineAudioContext': {
        createAudioBuffer: createAudioBufferWithStartRenderingFunction,
        createContext: createOfflineAudioContext
    }
};

describe('AudioBuffer', () => {

    for (const [ description, { createAudioBuffer, createContext } ] of Object.entries(testCases)) {

        describe(`with the ${ description }`, () => {

            let context;

            afterEach(() => {
                if (context !== null && context.close !== undefined) {
                    return context.close();
                }
            });

            beforeEach(() => context = (createContext === null) ? null : createContext());

            describe('constructor()', () => {

                for (const audioContextState of (createContext === null) ? [ 'running' ] : [ 'closed', 'running' ]) {

                    describe(`with an audioContextState of "${ audioContextState }"`, () => {

                        afterEach(() => {
                            if (audioContextState === 'closed') {
                                const backupNativeContext = BACKUP_NATIVE_CONTEXT_STORE.get(context._nativeContext);

                                // Bug #94: Edge also exposes a close() method on an OfflineAudioContext which is why this check is necessary.
                                if (backupNativeContext !== undefined && backupNativeContext.startRendering === undefined) {
                                    context = backupNativeContext;
                                } else {
                                    context.close = undefined;
                                }
                            }
                        });

                        beforeEach(() => {
                            if (audioContextState === 'closed') {
                                if (context.close === undefined) {
                                    return context.startRendering();
                                }

                                return context.close();
                            }
                        });

                        describe('with minimal options', () => {

                            let audioBuffer;

                            beforeEach(async function () {
                                this.timeout(10000);

                                audioBuffer = await createAudioBuffer(context, { length: 1000, sampleRate: 44100 });
                            });

                            it('should return an instance of the AudioBuffer constructor', () => {
                                expect(audioBuffer).to.be.an.instanceOf(AudioBuffer);
                            });

                            it('should return an implementation of the AudioBuffer interface', () => {
                                const length = 1000;

                                expect(audioBuffer.duration).to.be.closeTo(length / 44100, 0.001);
                                expect(audioBuffer.length).to.equal(length);
                                expect(audioBuffer.numberOfChannels).to.equal(1);
                                expect(audioBuffer.sampleRate).to.equal(44100);
                                expect(audioBuffer.getChannelData).to.be.a('function');
                                expect(audioBuffer.copyFromChannel).to.be.a('function');
                                expect(audioBuffer.copyToChannel).to.be.a('function');
                            });

                            if (createContext !== null) {

                                it('should return an AudioBuffer which can be used with the same context', function () {
                                    const audioBufferSourceNode = (typeof context.createBufferSource === 'function') ?
                                        context.createBufferSource() :
                                        new AudioBufferSourceNode(context);

                                    audioBufferSourceNode.buffer = audioBuffer;
                                });

                                it('should return an AudioBuffer which can be used with another context', function () {
                                    const anotherContext = createContext();
                                    const audioBufferSourceNode = (typeof anotherContext.createBufferSource === 'function') ?
                                        anotherContext.createBufferSource() :
                                        new AudioBufferSourceNode(anotherContext);

                                    audioBufferSourceNode.buffer = audioBuffer;

                                    return (typeof anotherContext.startRendering === 'function') ?
                                        anotherContext.startRendering() :
                                        anotherContext.close();
                                });

                            }

                            it('should return an AudioBuffer which can be used with a native AudioContext', () => {
                                const nativeAudioContext = createNativeAudioContext();
                                const nativeAudioBufferSourceNode = nativeAudioContext.createBufferSource();

                                nativeAudioBufferSourceNode.buffer = audioBuffer;

                                return nativeAudioContext.close();
                            });

                            it('should return an AudioBuffer which can be used with a native OfflineAudioContext', () => {
                                const nativeOfflineAudioContext = createNativeOfflineAudioContext();
                                const nativeAudioBufferSourceNode = nativeOfflineAudioContext.createBufferSource();

                                nativeAudioBufferSourceNode.buffer = audioBuffer;

                                return nativeOfflineAudioContext.startRendering();
                            });

                        });

                        if (!description.startsWith('decodeAudioData') && !description.startsWith('startRendering')) {

                            describe('with valid options', () => {

                                it('should return an AudioBuffer with the given length', async function () {
                                    this.timeout(10000);

                                    const length = 250;
                                    const audioBuffer = await createAudioBuffer(context, { length, sampleRate: 44100 });

                                    expect(audioBuffer.length).to.equal(length);
                                });

                                it('should return an AudioBuffer with the given numberOfChannels', async function () {
                                    this.timeout(10000);

                                    const numberOfChannels = 32;
                                    const audioBuffer = await createAudioBuffer(context, { length: 1000, numberOfChannels, sampleRate: 44100 });

                                    expect(audioBuffer.numberOfChannels).to.equal(numberOfChannels);
                                });

                                // Bug #140: Safari does not support AudioBuffers with 8000 Hz.
                                if (!isSafari(navigator)) {

                                    it('should return an AudioBuffer with the given sampleRate of 8 kHz', async function () {
                                        this.timeout(10000);

                                        const sampleRate = 8000;
                                        const audioBuffer = await createAudioBuffer(context, { length: 1000, sampleRate });

                                        expect(audioBuffer.sampleRate).to.equal(sampleRate);
                                    });

                                }

                                it('should return an AudioBuffer with the given sampleRate of 96 kHz', async function () {
                                    this.timeout(10000);

                                    const sampleRate = 96000;
                                    const audioBuffer = await createAudioBuffer(context, { length: 1000, sampleRate });

                                    expect(audioBuffer.sampleRate).to.equal(sampleRate);
                                });

                            });

                        }

                        if (!description.startsWith('decodeAudioData') && !description.startsWith('startRendering')) {

                            describe('with invalid options', () => {

                                describe('with zero as the numberOfChannels', () => {

                                    it('should throw a NotSupportedError', (done) => {
                                        try {
                                            createAudioBuffer(context, { length: 1000, numberOfChannels: 0, sampleRate: 44100 });
                                        } catch (err) {
                                            expect(err.code).to.equal(9);
                                            expect(err.name).to.equal('NotSupportedError');

                                            done();
                                        }
                                    });

                                });

                                describe('with a length of zero', () => {

                                    it('should throw a NotSupportedError', (done) => {
                                        try {
                                            createAudioBuffer(context, { length: 0, sampleRate: 44100 });
                                        } catch (err) {
                                            expect(err.code).to.equal(9);
                                            expect(err.name).to.equal('NotSupportedError');

                                            done();
                                        }
                                    });

                                });

                                describe('with a sampleRate of zero', () => {

                                    it('should throw a NotSupportedError', (done) => {
                                        try {
                                            createAudioBuffer(context, { length: 1000, sampleRate: 0 });
                                        } catch (err) {
                                            expect(err.code).to.equal(9);
                                            expect(err.name).to.equal('NotSupportedError');

                                            done();
                                        }
                                    });

                                });

                            });

                        }

                    });

                }

            });

            describe('duration', () => {

                let audioBuffer;

                beforeEach(async function () {
                    this.timeout(10000);

                    audioBuffer = await createAudioBuffer(context, { length: 1000, sampleRate: 44100 });
                });

                it('should be readonly', () => {
                    expect(() => {
                        audioBuffer.duration = 10;
                    }).to.throw(TypeError);
                });

            });

            describe('length', () => {

                let audioBuffer;

                beforeEach(async function () {
                    this.timeout(10000);

                    audioBuffer = await createAudioBuffer(context, { length: 1000, sampleRate: 44100 });
                });

                it('should be readonly', () => {
                    expect(() => {
                        audioBuffer.length = 20;
                    }).to.throw(TypeError);
                });

            });

            describe('numberOfChannels', () => {

                let audioBuffer;

                beforeEach(async function () {
                    this.timeout(10000);

                    audioBuffer = await createAudioBuffer(context, { length: 1000, sampleRate: 44100 });
                });

                it('should be readonly', () => {
                    expect(() => {
                        audioBuffer.numberOfChannels = 6;
                    }).to.throw(TypeError);
                });

            });

            describe('sampleRate', () => {

                let audioBuffer;

                beforeEach(async function () {
                    this.timeout(10000);

                    audioBuffer = await createAudioBuffer(context, { length: 1000, sampleRate: 44100 });
                });

                it('should be readonly', () => {
                    expect(() => {
                        audioBuffer.sampleRate = 22050;
                    }).to.throw(TypeError);
                });

            });

            describe('getChannelData()', () => {

                let audioBuffer;

                beforeEach(async function () {
                    this.timeout(10000);

                    audioBuffer = await createAudioBuffer(context, { length: 1000, sampleRate: 44100 });
                });

                describe('with an index of an existing channel', () => {

                    it('should return a Float32Array', () => {
                        const channelData = audioBuffer.getChannelData(0);

                        expect(channelData).to.be.an.instanceOf(Float32Array);
                        expect(channelData.length).to.equal(1000);
                    });

                });

                describe('with an index of an unexisting channel', () => {

                    it('should throw an IndexSizeError', (done) => {
                        try {
                            audioBuffer.getChannelData(2);
                        } catch (err) {
                            expect(err.code).to.equal(1);
                            expect(err.name).to.equal('IndexSizeError');

                            done();
                        }
                    });

                });

            });

            describe('copyFromChannel()', () => {

                let audioBuffer;
                let destination;
                let destinationValues;

                beforeEach(async function () {
                    this.timeout(10000);

                    audioBuffer = await createAudioBuffer(context, { length: 1000, sampleRate: 44100 });
                    destinationValues = Array.from({ length: 10 }, () => Math.fround(Math.random()));
                    destination = new Float32Array(destinationValues);
                });

                it('should not allow to copy a channel with an index greater or equal than the number of channels', (done) => {
                    try {
                        audioBuffer.copyFromChannel(destination, 2);
                    } catch (err) {
                        expect(err.code).to.equal(1);
                        expect(err.name).to.equal('IndexSizeError');

                        done();
                    }
                });

                it('should allow to copy values with a negative bufferOffset', () => {
                    audioBuffer.copyFromChannel(destination, 0, -1000);

                    expect(Array.from(destination)).to.deep.equal(destinationValues);
                });

                it('should allow to copy values with a bufferOffset equal to the length', () => {
                    audioBuffer.copyFromChannel(destination, 0, 1000);

                    expect(Array.from(destination)).to.deep.equal(destinationValues);
                });

                it('should allow to copy values with a bufferOffset greater than the length', () => {
                    audioBuffer.copyFromChannel(destination, 0, 2000);

                    expect(Array.from(destination)).to.deep.equal(destinationValues);
                });

            });

            describe('copyToChannel()', () => {

                let audioBuffer;
                let source;
                let sourceValues;

                beforeEach(async function () {
                    this.timeout(10000);

                    audioBuffer = await createAudioBuffer(context, { length: 1000, sampleRate: 44100 });
                    sourceValues = Array.from({ length: 10 }, () => Math.fround(Math.random()));
                    source = new Float32Array(sourceValues);
                });

                it('should not allow to copy a channel with an index greater or equal than the number of channels', (done) => {
                    try {
                        audioBuffer.copyToChannel(source, 2);
                    } catch (err) {
                        expect(err.code).to.equal(1);
                        expect(err.name).to.equal('IndexSizeError');

                        done();
                    }
                });

                it('should allow to copy values with a negative bufferOffset', () => {
                    audioBuffer.copyToChannel(source, 0, -1000);

                    const channelData = audioBuffer.getChannelData(0);

                    for (const sourceValue of sourceValues) {
                        expect(Array.from(channelData)).to.not.contain(sourceValue);
                    }
                });

                it('should allow to copy values with a bufferOffset equal to the length', () => {
                    audioBuffer.copyToChannel(source, 0, 1000);

                    const channelData = audioBuffer.getChannelData(0);

                    for (const sourceValue of sourceValues) {
                        expect(Array.from(channelData)).to.not.contain(sourceValue);
                    }
                });

                it('should allow to copy values with a bufferOffset greater than the length', () => {
                    audioBuffer.copyToChannel(source, 0, 2000);

                    const channelData = audioBuffer.getChannelData(0);

                    for (const sourceValue of sourceValues) {
                        expect(Array.from(channelData)).to.not.contain(sourceValue);
                    }
                });

            });

            describe('copyFromChannel()/copyToChannel()', () => {

                let audioBuffer;
                let destination;
                let source;

                beforeEach(async function () {
                    this.timeout(10000);

                    audioBuffer = await createAudioBuffer(context, { length: 1000, sampleRate: 44100 });
                    destination = new Float32Array(10);
                    source = new Float32Array(10);

                    for (let i = 0; i < 10; i += 1) {
                        destination[i] = Math.random();
                        source[i] = Math.random();
                    }
                });

                it('should copy values with a bufferOffset of 0', () => {
                    audioBuffer.copyToChannel(source, 0);
                    audioBuffer.copyFromChannel(destination, 0);

                    for (let i = 0; i < 10; i += 1) {
                        expect(destination[i]).to.equal(source[i]);
                    }
                });

                it('should copy values with a bufferOffset of 50', () => {
                    audioBuffer.copyToChannel(source, 0, 50);
                    audioBuffer.copyFromChannel(destination, 0, 50);

                    for (let i = 0; i < 10; i += 1) {
                        expect(destination[i]).to.equal(source[i]);
                    }
                });

                it('should copy values with a bufferOffset large enough to leave a part of the destination untouched', () => {
                    const destinationCopy = Array.from(destination);

                    audioBuffer.copyToChannel(source, 0, 1000 - 5);
                    audioBuffer.copyFromChannel(destination, 0, 1000 - 5);

                    for (let i = 0; i < 5; i += 1) {
                        expect(destination[i]).to.equal(source[i]);
                    }

                    for (let i = 5; i < 10; i += 1) {
                        expect(destination[i]).to.equal(destinationCopy[i]);
                    }
                });

                it('should copy values with a bufferOffset small enough to get mapped to an existing bufferOffset', () => {
                    audioBuffer.copyToChannel(source, 0, 10 - (2 ** 32));
                    audioBuffer.copyFromChannel(destination, 0, 10);

                    for (let i = 0; i < 10; i += 1) {
                        expect(destination[i]).to.equal(source[i]);
                    }
                });

                it('should copy values with a bufferOffset large enough to get mapped to an existing bufferOffset', () => {
                    audioBuffer.copyToChannel(source, 0, (2 ** 32) + 10);
                    audioBuffer.copyFromChannel(destination, 0, 10);

                    for (let i = 0; i < 10; i += 1) {
                        expect(destination[i]).to.equal(source[i]);
                    }
                });

            });

        });

    }

});
