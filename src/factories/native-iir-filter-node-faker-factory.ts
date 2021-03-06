import { computeBufferSize } from '../helpers/compute-buffer-size';
import { filterBuffer } from '../helpers/filter-buffer';
import { interceptConnections } from '../helpers/intercept-connections';
import { TNativeAudioNode, TNativeIIRFilterNode, TNativeIIRFilterNodeFakerFactoryFactory, TTypedArray } from '../types';

function divide (a: [ number, number ], b: [ number, number ]): [ number, number ] {
    const denominator = (b[0] * b[0]) + (b[1] * b[1]);

    return [ (((a[0] * b[0]) + (a[1] * b[1])) / denominator), (((a[1] * b[0]) - (a[0] * b[1])) / denominator) ];
}

function multiply (a: [ number, number ], b: [ number, number ]): [ number, number ] {
    return [ ((a[0] * b[0]) - (a[1] * b[1])), ((a[0] * b[1]) + (a[1] * b[0])) ];
}

function evaluatePolynomial (coefficient: number[] | TTypedArray, z: [ number, number ]): [ number, number ] {
    let result: [ number, number ] = [ 0, 0 ];

    for (let i = coefficient.length - 1; i >= 0; i -= 1) {
        result = multiply(result, z);

        result[0] += coefficient[i];
    }

    return result;
}

export const createNativeIIRFilterNodeFakerFactory: TNativeIIRFilterNodeFakerFactoryFactory = (
    createInvalidAccessError,
    createInvalidStateError,
    createNativeScriptProcessorNode,
    createNotSupportedError
) => {
    return (nativeContext, baseLatency, { channelCount, channelCountMode, channelInterpretation, feedback, feedforward }) => {
        const bufferSize = computeBufferSize(baseLatency, nativeContext.sampleRate);
        const feedbackLength = feedback.length;
        const feedforwardLength = feedforward.length;
        const minLength = Math.min(feedbackLength, feedforwardLength);

        if (feedback.length === 0 || feedback.length > 20) {
            throw createNotSupportedError();
        }

        if (feedback[0] === 0) {
            throw createInvalidStateError();
        }

        if (feedforward.length === 0 || feedforward.length > 20) {
            throw createNotSupportedError();
        }

        if (feedforward[0] === 0) {
            throw createInvalidStateError();
        }

        if (feedback[0] !== 1) {
            for (let i = 0; i < feedforwardLength; i += 1) {
                feedforward[i] /= feedback[0];
            }

            for (let i = 1; i < feedbackLength; i += 1) {
                feedback[i] /= feedback[0];
            }
        }

        const scriptProcessorNode = createNativeScriptProcessorNode(nativeContext, bufferSize, channelCount, channelCount);

        scriptProcessorNode.channelCount = channelCount;
        scriptProcessorNode.channelCountMode = channelCountMode;
        scriptProcessorNode.channelInterpretation = channelInterpretation;

        const bufferLength = 32;
        const bufferIndexes: number[] = [ ];
        const xBuffers: Float32Array[] = [ ];
        const yBuffers: Float32Array[] = [ ];

        for (let i = 0; i < channelCount; i += 1) {
            bufferIndexes.push(0);

            const xBuffer = new Float32Array(bufferLength);
            const yBuffer = new Float32Array(bufferLength);

            xBuffer.fill(0);
            yBuffer.fill(0);

            xBuffers.push(xBuffer);
            yBuffers.push(yBuffer);
        }

        scriptProcessorNode.onaudioprocess = (event: AudioProcessingEvent) => { // tslint:disable-line:deprecation
            const inputBuffer = event.inputBuffer;
            const outputBuffer = event.outputBuffer;

            const numberOfChannels = inputBuffer.numberOfChannels;

            for (let i = 0; i < numberOfChannels; i += 1) {
                const input = inputBuffer.getChannelData(i);
                const output = outputBuffer.getChannelData(i);

                bufferIndexes[i] = filterBuffer(
                    feedback,
                    feedbackLength,
                    feedforward,
                    feedforwardLength,
                    minLength,
                    xBuffers[i],
                    yBuffers[i],
                    bufferIndexes[i],
                    bufferLength,
                    input,
                    output
                );
            }
        };

        const nyquist = nativeContext.sampleRate / 2;

        const nativeIIRFilterNodeFaker = {
            get bufferSize (): number {
                return bufferSize;
            },
            get channelCount (): number {
                return scriptProcessorNode.channelCount;
            },
            set channelCount (value) {
                scriptProcessorNode.channelCount = value;
            },
            get channelCountMode (): TNativeIIRFilterNode['channelCountMode'] {
                return scriptProcessorNode.channelCountMode;
            },
            set channelCountMode (value) {
                scriptProcessorNode.channelCountMode = value;
            },
            get channelInterpretation (): TNativeIIRFilterNode['channelInterpretation'] {
                return scriptProcessorNode.channelInterpretation;
            },
            set channelInterpretation (value) {
                scriptProcessorNode.channelInterpretation = value;
            },
            get context (): TNativeIIRFilterNode['context'] {
                return scriptProcessorNode.context;
            },
            get inputs (): TNativeAudioNode[] {
                return [ scriptProcessorNode ];
            },
            get numberOfInputs (): number {
                return scriptProcessorNode.numberOfInputs;
            },
            get numberOfOutputs (): number {
                return scriptProcessorNode.numberOfOutputs;
            },
            addEventListener (...args: any[]): void {
                // @todo Dissallow adding an audioprocess listener.
                return scriptProcessorNode.addEventListener(args[0], args[1], args[2]);
            },
            dispatchEvent (...args: any[]): boolean {
                return scriptProcessorNode.dispatchEvent(args[0]);
            },
            getFrequencyResponse (frequencyHz: Float32Array, magResponse: Float32Array, phaseResponse: Float32Array): void {
                if ((frequencyHz.length !== magResponse.length) || (magResponse.length !== phaseResponse.length)) {
                    throw createInvalidAccessError();
                }

                const length = frequencyHz.length;

                for (let i = 0; i < length; i += 1) {
                    const omega = -Math.PI * (frequencyHz[i] / nyquist);
                    const z: [ number, number ] = [ Math.cos(omega), Math.sin(omega) ];
                    const numerator = evaluatePolynomial(feedforward, z);
                    const denominator = evaluatePolynomial(feedback, z);
                    const response = divide(numerator, denominator);

                    magResponse[i] = Math.sqrt((response[0] * response[0]) + (response[1] * response[1]));
                    phaseResponse[i] = Math.atan2(response[1], response[0]);
                }
            },
            removeEventListener (...args: any[]): void {
                return scriptProcessorNode.removeEventListener(args[0], args[1], args[2]);
            }
        };

        return interceptConnections(nativeIIRFilterNodeFaker, scriptProcessorNode);
    };
};
