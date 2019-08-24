import { connectAudioParam } from '../helpers/connect-audio-param';
import { getNativeAudioNode } from '../helpers/get-native-audio-node';
import { isOwnedByContext } from '../helpers/is-owned-by-context';
import { renderAutomation } from '../helpers/render-automation';
import { renderInputsOfAudioNode } from '../helpers/render-inputs-of-audio-node';
import { IMinimalOfflineAudioContext, IOscillatorNode, IPeriodicWave } from '../interfaces';
import { TNativeOfflineAudioContext, TNativeOscillatorNode, TOscillatorNodeRendererFactoryFactory } from '../types';

export const createOscillatorNodeRendererFactory: TOscillatorNodeRendererFactoryFactory = (
    createNativeOscillatorNode
) => {
    return <T extends IMinimalOfflineAudioContext>() => {
        const renderedNativeOscillatorNodes = new WeakMap<TNativeOfflineAudioContext, TNativeOscillatorNode>();

        let periodicWave: null | IPeriodicWave = null;
        let start: null | number = null;
        let stop: null | number = null;

        const createOscillatorNode = async (proxy: IOscillatorNode<T>, nativeOfflineAudioContext: TNativeOfflineAudioContext) => {
            let nativeOscillatorNode = getNativeAudioNode<T, TNativeOscillatorNode>(proxy);

            // If the initially used nativeOscillatorNode was not constructed on the same OfflineAudioContext it needs to be created again.
            const nativeOscillatorNodeIsOwnedByContext = isOwnedByContext(nativeOscillatorNode, nativeOfflineAudioContext);

            if (!nativeOscillatorNodeIsOwnedByContext) {
                const options = {
                    channelCount: nativeOscillatorNode.channelCount,
                    channelCountMode: nativeOscillatorNode.channelCountMode,
                    channelInterpretation: nativeOscillatorNode.channelInterpretation,
                    detune: nativeOscillatorNode.detune.value,
                    frequency: nativeOscillatorNode.frequency.value,
                    periodicWave: (periodicWave === null) ? undefined : periodicWave,
                    type: nativeOscillatorNode.type
                };

                nativeOscillatorNode = createNativeOscillatorNode(nativeOfflineAudioContext, options);

                if (start !== null) {
                    nativeOscillatorNode.start(start);
                }

                if (stop !== null) {
                    nativeOscillatorNode.stop(stop);
                }
            }

            renderedNativeOscillatorNodes.set(nativeOfflineAudioContext, nativeOscillatorNode);

            if (!nativeOscillatorNodeIsOwnedByContext) {
                await renderAutomation(proxy.context, nativeOfflineAudioContext, proxy.detune, nativeOscillatorNode.detune);
                await renderAutomation(proxy.context, nativeOfflineAudioContext, proxy.frequency, nativeOscillatorNode.frequency);
            } else {
                await connectAudioParam(proxy.context, nativeOfflineAudioContext, proxy.detune);
                await connectAudioParam(proxy.context, nativeOfflineAudioContext, proxy.frequency);
            }

            await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeOscillatorNode);

            return nativeOscillatorNode;
        };

        return {
            set periodicWave (value: null | IPeriodicWave) {
                periodicWave = value;
            },
            set start (value: number) {
                start = value;
            },
            set stop (value: number) {
                stop = value;
            },
            render (proxy: IOscillatorNode<T>, nativeOfflineAudioContext: TNativeOfflineAudioContext): Promise<TNativeOscillatorNode> {
                const renderedNativeOscillatorNode = renderedNativeOscillatorNodes.get(nativeOfflineAudioContext);

                if (renderedNativeOscillatorNode !== undefined) {
                    return Promise.resolve(renderedNativeOscillatorNode);
                }

                return createOscillatorNode(proxy, nativeOfflineAudioContext);
            }
        };
    };
};
