import { TNativeAudioWorkletNodeFactoryFactory } from '../types';

export const createNativeAudioWorkletNodeFactory: TNativeAudioWorkletNodeFactoryFactory = (
    createInvalidStateError,
    createNativeAudioWorkletNodeFaker,
    createNotSupportedError
) => {
    return (nativeContext, nativeAudioWorkletNodeConstructor, name, processorDefinition, options) => {
        if (nativeAudioWorkletNodeConstructor !== null) {
            try {
                const nativeNode = new nativeAudioWorkletNodeConstructor(nativeContext, name, options);

                /*
                 * Bug #61: Overwriting the property accessors is necessary as long as some browsers have no native implementation to
                 * achieve a consistent behavior.
                 */
                Object.defineProperties(nativeNode, {
                    channelCount: {
                        get: () => options.channelCount,
                        set: () => {
                            throw createInvalidStateError();
                        }
                    },
                    channelCountMode: {
                        get: () => 'explicit',
                        set: () => {
                            throw createInvalidStateError();
                        }
                    }
                });

                return nativeNode;
            } catch (err) {
                // Bug #60: Chrome Canary throws an InvalidStateError instead of a NotSupportedError.
                if (err.code === 11 && nativeContext.state !== 'closed') {
                    throw createNotSupportedError();
                }

                throw err;
            }
        }

        // Bug #61: Only Chrome Canary has an implementation of the AudioWorkletNode yet.
        if (processorDefinition === undefined) {
            throw createNotSupportedError();
        }

        return createNativeAudioWorkletNodeFaker(nativeContext, processorDefinition, options);
    };
};