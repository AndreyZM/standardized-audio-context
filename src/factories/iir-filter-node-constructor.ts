import { getNativeContext } from '../helpers/get-native-context';
import { wrapIIRFilterNodeGetFrequencyResponseMethod } from '../helpers/wrap-iir-filter-node-get-frequency-response-method';
import { IIIRFilterNode, IIIRFilterOptions, IMinimalAudioContext, IMinimalBaseAudioContext } from '../interfaces';
import { TAudioNodeRenderer, TIIRFilterNodeConstructorFactory, TNativeIIRFilterNode } from '../types';

const DEFAULT_OPTIONS = {
    channelCount: 2,
    channelCountMode: 'max',
    channelInterpretation: 'speakers'
} as const;

export const createIIRFilterNodeConstructor: TIIRFilterNodeConstructorFactory = (
    createNativeIIRFilterNode,
    createIIRFilterNodeRenderer,
    isNativeOfflineAudioContext,
    noneAudioDestinationNodeConstructor
) => {

    return class IIRFilterNode<T extends IMinimalBaseAudioContext>
            extends noneAudioDestinationNodeConstructor<T>
            implements IIIRFilterNode<T> {

        private _nativeIIRFilterNode: TNativeIIRFilterNode;

        constructor (
            context: T,
            options: { feedback: IIIRFilterOptions['feedback']; feedforward: IIIRFilterOptions['feedforward'] } & Partial<IIIRFilterOptions>
        ) {
            const nativeContext = getNativeContext(context);
            const isOffline = isNativeOfflineAudioContext(nativeContext);
            const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
            const nativeIIRFilterNode = createNativeIIRFilterNode(
                nativeContext,
                isOffline ? null : (<IMinimalAudioContext> (<any> context)).baseLatency,
                mergedOptions
            );
            const iirFilterNodeRenderer = <TAudioNodeRenderer<T, this>> ((isOffline)
                ? createIIRFilterNodeRenderer(mergedOptions.feedback, mergedOptions.feedforward)
                : null);

            super(context, 'passive', nativeIIRFilterNode, iirFilterNodeRenderer);

            // Bug #23 & #24: FirefoxDeveloper does not throw an InvalidAccessError.
            // @todo Write a test which allows other browsers to remain unpatched.
            wrapIIRFilterNodeGetFrequencyResponseMethod(nativeIIRFilterNode);

            this._nativeIIRFilterNode = nativeIIRFilterNode;
        }

        public getFrequencyResponse (frequencyHz: Float32Array, magResponse: Float32Array, phaseResponse: Float32Array): void  {
            return this._nativeIIRFilterNode.getFrequencyResponse(frequencyHz, magResponse, phaseResponse);
        }

    };

};
