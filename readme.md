# decibel-monitor
A javascript tool for reading the current decibel volume via the users microphone

*A work in progress*

See https://reustle.github.io/decibel-monitor/ for a demo.

Heavily inspired by https://github.com/takispig/db-meter

### Usage

```
// Initialize
let dbMonitor = new DecibelMonitor();

// Connect to the microphone
dbMonitor.connectMic();

// Read the current volume
// TODO Maybe this is the avg volume since the last reading
dbMonitor.getVolume();

// Close the connection to the mic
dbMonitor.disconnectMic();
```
