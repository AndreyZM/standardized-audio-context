import { connectAudioParam } from '../helpers/connect-audio-param';
import { getNativeAudioNode } from '../helpers/get-native-audio-node';
import { isOwnedByContext } from '../helpers/is-owned-by-context';
import { renderAutomation } from '../helpers/render-automation';
import { renderInputsOfAudioNode } from '../helpers/render-inputs-of-audio-node';
import { IDynamicsCompressorNode, IMinimalOfflineAudioContext } from '../interfaces';
import { TDynamicsCompressorNodeRendererFactoryFactory, TNativeDynamicsCompressorNode, TNativeOfflineAudioContext } from '../types';

export const createDynamicsCompressorNodeRendererFactory: TDynamicsCompressorNodeRendererFactoryFactory = (
    createNativeDynamicsCompressorNode
) => {
    return <T extends IMinimalOfflineAudioContext>() => {
        const renderedNativeDynamicsCompressorNodes = new WeakMap<TNativeOfflineAudioContext, TNativeDynamicsCompressorNode>();

        const createDynamicsCompressorNode = async (
            proxy: IDynamicsCompressorNode<T>,
            nativeOfflineAudioContext: TNativeOfflineAudioContext
        ) => {
            let nativeDynamicsCompressorNode = getNativeAudioNode<T, TNativeDynamicsCompressorNode>(proxy);

            /*
             * If the initially used nativeDynamicsCompressorNode was not constructed on the same OfflineAudioContext it needs to be
             * created again.
             */
            const nativeDynamicsCompressorNodeIsOwnedByContext = isOwnedByContext(nativeDynamicsCompressorNode, nativeOfflineAudioContext);

            if (!nativeDynamicsCompressorNodeIsOwnedByContext) {
                const options = {
                    attack: nativeDynamicsCompressorNode.attack.value,
                    channelCount: nativeDynamicsCompressorNode.channelCount,
                    channelCountMode: nativeDynamicsCompressorNode.channelCountMode,
                    channelInterpretation: nativeDynamicsCompressorNode.channelInterpretation,
                    knee: nativeDynamicsCompressorNode.knee.value,
                    ratio: nativeDynamicsCompressorNode.ratio.value,
                    release: nativeDynamicsCompressorNode.release.value,
                    threshold: nativeDynamicsCompressorNode.threshold.value
                };

                nativeDynamicsCompressorNode = createNativeDynamicsCompressorNode(nativeOfflineAudioContext, options);
            }

            renderedNativeDynamicsCompressorNodes.set(nativeOfflineAudioContext, nativeDynamicsCompressorNode);

            if (!nativeDynamicsCompressorNodeIsOwnedByContext) {
                await renderAutomation(proxy.context, nativeOfflineAudioContext, proxy.attack, nativeDynamicsCompressorNode.attack);
                await renderAutomation(proxy.context, nativeOfflineAudioContext, proxy.knee, nativeDynamicsCompressorNode.knee);
                await renderAutomation(proxy.context, nativeOfflineAudioContext, proxy.ratio, nativeDynamicsCompressorNode.ratio);
                await renderAutomation(proxy.context, nativeOfflineAudioContext, proxy.release, nativeDynamicsCompressorNode.release);
                await renderAutomation(
                    proxy.context,
                    nativeOfflineAudioContext,
                    proxy.threshold,
                    nativeDynamicsCompressorNode.threshold
                );
            } else {
                await connectAudioParam(proxy.context, nativeOfflineAudioContext, proxy.attack);
                await connectAudioParam(proxy.context, nativeOfflineAudioContext, proxy.knee);
                await connectAudioParam(proxy.context, nativeOfflineAudioContext, proxy.ratio);
                await connectAudioParam(proxy.context, nativeOfflineAudioContext, proxy.release);
                await connectAudioParam(proxy.context, nativeOfflineAudioContext, proxy.threshold);
            }

            await renderInputsOfAudioNode(proxy, nativeOfflineAudioContext, nativeDynamicsCompressorNode);

            return nativeDynamicsCompressorNode;
        };

        return {
            render (
                proxy: IDynamicsCompressorNode<T>,
                nativeOfflineAudioContext: TNativeOfflineAudioContext
            ): Promise<TNativeDynamicsCompressorNode> {
                const renderedNativeDynamicsCompressorNode = renderedNativeDynamicsCompressorNodes.get(nativeOfflineAudioContext);

                if (renderedNativeDynamicsCompressorNode !== undefined) {
                    return Promise.resolve(renderedNativeDynamicsCompressorNode);
                }

                return createDynamicsCompressorNode(proxy, nativeOfflineAudioContext);
            }
        };
    };
};
