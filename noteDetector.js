/*
 * NoteDetector is a helper class that listens to the user's microphone
 * and performs real‑time pitch detection. It uses the Pitchy library to
 * extract the dominant frequency from a short audio buffer. When a
 * reliable pitch is found, it invokes the provided callback with the
 * frequency value in Hertz. The consumer of this class can then
 * translate the frequency into a musical note using tonal.js.
 *
 * The class exposes start() and stop() methods. start() requests
 * microphone access, sets up a Web Audio processing chain and begins
 * analysing audio frames. stop() tears down all resources.
 */

export class NoteDetector {
  /**
   * Create a new note detector.
   *
   * @param {Object} options Configuration options
   * @param {(freq: number) => void} options.onFrequency Callback invoked when a
   *         pitch is detected (in Hz).
   * @param {number} [options.clarityThreshold=0.85] Minimum clarity to treat a
   *         detection as valid. Values range from 0 to 1.
   */
  constructor({ onFrequency, clarityThreshold = 0.85 }) {
    this.onFrequency = onFrequency;
    this.clarityThreshold = clarityThreshold;
    this.bufferLength = 1024;
    this.audioCtx = null;
    this.stream = null;
    this.source = null;
    this.processor = null;
    this.detector = null;
    this.buffer = new Float32Array(this.bufferLength);
    this.lastDetectTime = 0;
  }

  /**
   * Load the Pitchy module dynamically. This is deferred until the first
   * time start() is called to avoid unnecessary network requests.
   */
  async _loadPitchy() {
    if (this.detector) return;
    // Dynamically import pitchy from jsDelivr. The module exports
    // PitchDetector, which we use to create detectors for Float32 arrays.
    // Import the local copy of pitchy. This avoids network requests and
    // ensures the detector works offline. The file is provided in
    // piano-app/js/lib/pitchy.js and re‑exported by the build script.
    const { PitchDetector } = await import('./lib/pitchy.js');
    this.detectorClass = PitchDetector;
  }

  /**
   * Start listening to the microphone and processing audio.
   */
  async start() {
    await this._loadPitchy();
    // Create an audio context (resume if it already exists and is suspended).
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Prepare pitch detector for the given buffer length.
    this.detector = this.detectorClass.forFloat32Array(this.bufferLength);
    // Request microphone access.
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('Microphone access denied:', err);
      alert('Nie można uzyskać dostępu do mikrofonu. Upewnij się, że udzieliłeś zgody.');
      return;
    }
    this.source = this.audioCtx.createMediaStreamSource(this.stream);
    // Create script processor for real‑time analysis.
    this.processor = this.audioCtx.createScriptProcessor(
      this.bufferLength,
      1,
      1
    );
    this.source.connect(this.processor);
    this.processor.connect(this.audioCtx.destination);
    this.processor.onaudioprocess = (event) => {
      // Copy data from the input buffer into our local array.
      const input = event.inputBuffer.getChannelData(0);
      this.buffer.set(input);
      // Estimate pitch using Pitchy. findPitch returns [frequency, clarity].
      const [pitch, clarity] = this.detector.findPitch(
        this.buffer,
        this.audioCtx.sampleRate
      );
      if (pitch && clarity >= this.clarityThreshold) {
        const now = performance.now();
        // Throttle detections to avoid firing too often on the same note.
        if (now - this.lastDetectTime > 250) {
          this.lastDetectTime = now;
          try {
            this.onFrequency(pitch);
          } catch (callbackErr) {
            console.error('Error in onFrequency callback:', callbackErr);
          }
        }
      }
    };
  }

  /**
   * Stop processing and release resources.
   */
  stop() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.audioCtx) {
      // Gracefully close the audio context. Some browsers throw if closed
      // prematurely.
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.detector = null;
  }
}