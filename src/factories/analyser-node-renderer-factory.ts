import { getNativeAudioNode } from '../helpers/get-native-audio-node';
import { isOwnedByContext } from '../helpers/is-owned-by-context';
import { renderInputsOfAudioNode } from '../helpers/render-inputs-of-audio-node';
import { IAnalyserNode, IMinimalOfflineAudioContext } from '../interfaces';
import { TAnalyserNodeRendererFactoryFactory, TNativeAnalyserNode, TNativeOfflineAudioContext } from '../types';

export const createAnalyserNodeRendererFactory: TAnalyserNodeRendererFactoryFactory = (createNativeAnalyserNode) => {
    return <T extends IMinimalOfflineAudioContext>() => {
        const renderedNativeAnalyserNodes = new WeakMap<TNativeOfflineAudioContext, TNativeAnalyserNode>();

        const createAnalyserNode = async (proxy: IAnalyserNode<T>, nativeOfflineAudioContext: TNativeOfflineAudioContext) => {
            let nativeAnalyserNode = getNativeAudioNode<T, TNativeAnalyserNode>(proxy);

            // If the initially used nativeAnalyserNode was not constructed on the same OfflineAudioContext it needs to be created again.
            const nativeAnalyserNodeIsOwnedByContext = isOwnedByContext(nativeAnalyserNode, nativeOfflineAudioContext);

            if (!nativeAnalyserNodeIsOwnedByContext) {
                const options = {
                    channelCount: nativeAnalyserNode.channelCount,
                    channelCountMode: nativeAnalyserNode.channelCountMode,
                    channelInterpretation: nativeAnalyserNode.channelInterpretation,
                    fftSize: nativeAnalyserNode.fftSize,
                    maxDecibels: nativeAnalyserNode.maxDecibels,
                    minDecibels: nativeAnalyserNode.minDecibels,
                    smoothingTimeConstant: nativeAnalyserNode.smoothingTimeConstant
                };

                nativeAnalyserNode = createNativeAnalyserNode(nativeOfflineAudioContext, options);
            }

            renderedNativeAnalyserNodes.set(nativeOfflineAudioContext, nativeAnalyserNode);

            await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeAnalyserNode);

            return nativeAnalyserNode;
        };

        return {
            render (proxy: IAnalyserNode<T>, nativeOfflineAudioContext: TNativeOfflineAudioContext): Promise<TNativeAnalyserNode> {
                const renderedNativeAnalyserNode = renderedNativeAnalyserNodes.get(nativeOfflineAudioContext);

                if (renderedNativeAnalyserNode !== undefined) {
                    return Promise.resolve(renderedNativeAnalyserNode);
                }

                return createAnalyserNode(proxy, nativeOfflineAudioContext);
            }
        };
    };
};
