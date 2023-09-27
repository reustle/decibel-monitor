class DecibelMonitor {
  // TODO  The ScriptProcessorNode is deprecated.
  // Use AudioWorkletNode instead. (https://bit.ly/audio-worklet)

  constructor(options = {}) {
    // When we create an instance of the class, we set some class-wide variables

    this.localDbValues = []; // Array to store db values for each loop
    this.offset = 0; // Offset to add to the RMS value (in DB)
    this.analyser = null;
    this.audioSource = null;
    this.processor = null;
    this.audioStream = null;
    this.isConnected = false;
    this.readingsPerSecond = 25; // This is roughly how many readings are happening per second, used to calc avg
    this.sampleWindow = options?.sampleWindow || 2000; // How long should we sample for. Default 2sec
    this.sampleReadingsCount = (this.sampleWindow/1000) * this.readingsPerSecond;
  }

  async connectMic() {
    // This method connects to the user's microphone, sets up the audio context, 
    // and starts processing the audio input. It doesn't return anything. 
    // If it fails to connect to the microphone, it alerts the user and logs the error.

    if(this.isConnected) {
      console.error('ERROR: Cannot connect to microphone because it is already connected.');
      return;
    }

    try {
      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // Create an AudioContext
      this.context = new AudioContext();
      // Create a MediaStreamSource from the audio stream
      this.audioSource = this.context.createMediaStreamSource(this.audioStream);
      // Create a ScriptProcessor node with buffer size 2048, 1 input channel, and 1 output channel
      this.processor = this.context.createScriptProcessor(2048, 1, 1);
      // Create an Analyser node
      this.analyser = this.context.createAnalyser();

      this.analyser.smoothingTimeConstant = 0.8;
      this.analyser.fftSize = 256;

      // Connect the source to the analyser
      this.audioSource.connect(this.analyser);
      // Connect the analyser to the processor
      this.analyser.connect(this.processor);
      // Connect the processor to the destination (speakers)
      this.processor.connect(this.context.destination);

      // Every time there is an audio input (very often), call handleAudioProcess
      // NOTE: The way this works is, we are saving the function handleAudioProcess as a variable,
      // that's why it is handleAudioProcess and not handleAudioProcess. If we used (), it would
      // only run once when we set it. Instead, the internal processor will call
      // onaudioprocess every time it needs to use the function.
      this.processor.onaudioprocess = this._handleAudioProcess.bind(this);

      this.isConnected = true;

    } catch (e) {
      alert("Oops! There was an error while connecting to your microphone. Please try again.");
      console.error(e);
    }
  }

  _handleAudioProcess() {
    // This method is called every time the audio processor receives input. 
    // It calculates the root mean square (RMS) of the frequency data and adds it to the localDbValues array.
    // It doesn't return anything.

    // Create a Uint8Array to store the frequency data
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    // Get the frequency data from the analyser
    this.analyser.getByteFrequencyData(data);
    let rms = 0;

    const maxFrequency = 120;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > maxFrequency){
        data[i] = maxFrequency;
      }
      rms += data[i] * data[i];
    }

    rms = Math.sqrt(rms / data.length);
    //console.log("RMS: " + rms);
    
    // Calculate the value by adding the offset to the RMS
    let value = rms + this.offset;
    // Push the value to the localDbValues array
    this.localDbValues.push(value);

    // Make sure the localDbValues array is at most double the length of this.sampleReadingsCount
    if (this.localDbValues.length > (this.sampleReadingsCount * 2)) {
      this.localDbValues = this.localDbValues.slice(-1 * (this.sampleReadingsCount*2));
    }

  }

  disconnectMic() {
    // Stop all audio tracks from the microphone
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
    }

    // Disconnect the analyser, audio source, and processor
    if (this.analyser) {
      this.analyser.disconnect();
    }
    if (this.audioSource) {
      this.audioSource.disconnect();
    }
    if (this.processor) {
      this.processor.disconnect();
    }

    // Clear the localDbValues array
    this.localDbValues = [];

    // Nullify the audio context and stream to allow future connections
    this.audioStream = null;
    this.context = null;

    this.isConnected = false;
  }

  getVolume() {
    // This method calculates and returns the average volume based on the values in the localDbValues array.
    // If the array is empty, it returns 0. After calculating the volume, it clears the array.

    if(!this.isConnected) {
      console.error('ERROR: Cannot read volume because the microphone is not connected.');
      return null;
    }

    if(!this.localDbValues.length) {
      return 0;
    }

    // Grab the last X elements of the localDbValues array,
    // where X is (this.sampleWindow/1000) * this.readingsPerSecond
    let slicedDbValues = this.localDbValues.slice(-1 * this.sampleReadingsCount); // The last X elements of the array

    // Calculate the average of the localDbValues array
    let volume = Math.round(slicedDbValues.reduce((a,b) => a+b) / slicedDbValues.length);

    // We don't want/need negative decibels in that case
    if(!isFinite(volume)) {
      volume = 0;
    }
    
    return volume;
  }
}

