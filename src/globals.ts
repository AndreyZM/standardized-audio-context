import {
    IAudioGraph,
    IAudioNode,
    IAudioParam,
    IAudioWorkletProcessor,
    IAudioWorkletProcessorConstructor,
    IMinimalBaseAudioContext
} from './interfaces';
import {
    TAudioBufferStore,
    TAudioNodeStore,
    TAudioParamStore,
    TContextStore,
    TInternalStateEventListener,
    TNativeAudioWorkletNode,
    TNativeContext,
    TNativeGainNode,
    TPeriodicWaveStore
} from './types';

export const ACTIVE_AUDIO_NODE_STORE: WeakSet<IAudioNode<IMinimalBaseAudioContext>> = new WeakSet();

export const AUDIO_BUFFER_STORE: TAudioBufferStore = new WeakSet();

export const AUDIO_NODE_STORE: TAudioNodeStore = new WeakMap();

export const AUDIO_GRAPHS: WeakMap<IMinimalBaseAudioContext, IAudioGraph<IMinimalBaseAudioContext>> = new WeakMap();

export const AUDIO_PARAM_STORE: TAudioParamStore = new WeakMap();

export const AUDIO_PARAM_AUDIO_NODE_STORE: WeakMap<IAudioParam, IAudioNode<IMinimalBaseAudioContext>> = new WeakMap();

export const AUXILIARY_GAIN_NODE_STORE: WeakMap<TNativeAudioWorkletNode, Map<number, TNativeGainNode>> = new WeakMap();

export const BACKUP_NATIVE_CONTEXT_STORE: WeakMap<TNativeContext, TNativeContext> = new WeakMap();

export const CONTEXT_STORE: TContextStore = new WeakMap();

export const DETACHED_ARRAY_BUFFERS: WeakSet<ArrayBuffer> = new WeakSet();

export const EVENT_LISTENERS: WeakMap<IAudioNode<IMinimalBaseAudioContext>, Set<TInternalStateEventListener>> = new WeakMap();

// This clunky name is borrowed from the spec. :-)
export const NODE_NAME_TO_PROCESSOR_CONSTRUCTOR_MAPS: WeakMap<
    TNativeContext,
    Map<string, IAudioWorkletProcessorConstructor>
> = new WeakMap();

export const NODE_TO_PROCESSOR_MAPS: WeakMap<
    TNativeContext,
    WeakMap<TNativeAudioWorkletNode, Promise<IAudioWorkletProcessor>>
> = new WeakMap();

export const PERIODIC_WAVE_STORE: TPeriodicWaveStore = new WeakSet();

export const TEST_RESULTS: WeakMap<object, boolean> = new WeakMap();
