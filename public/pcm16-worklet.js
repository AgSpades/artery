export function floatToPcm16(samples) {
  const pcm = new Int16Array(samples.length);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    pcm[index] = sample < 0 ? sample * 32768 : sample * 32767;
  }
  return pcm;
}

if ("AudioWorkletProcessor" in globalThis) {
  class Pcm16Processor extends globalThis.AudioWorkletProcessor {
    constructor() {
      super();
      this.pending = [];
      this.offset = 0;
    }

    process(inputs) {
      const input = inputs[0]?.[0];
      if (!input) return true;

      // ponytail: nearest-neighbour resampling is sufficient for the demo;
      // replace with a band-limited resampler if measured STT accuracy suffers.
      const ratio = globalThis.sampleRate / 16000;
      let position = this.offset;
      while (position < input.length) {
        this.pending.push(input[Math.floor(position)]);
        position += ratio;
      }
      this.offset = position - input.length;

      while (this.pending.length >= 320) {
        const pcm = floatToPcm16(new Float32Array(this.pending.splice(0, 320)));
        this.port.postMessage(pcm.buffer, [pcm.buffer]);
      }
      return true;
    }
  }

  globalThis.registerProcessor("artery-pcm16", Pcm16Processor);
}
