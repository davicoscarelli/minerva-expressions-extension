import * as faceapi from '../lib/face-api.esm.js';
let optionsSSDMobileNet;

async function initModel(){
  Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'),
      faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model')
  ]).then((val) => {
    startCamera()
  }).catch((err) => {
      console.log(err)
  })
  
}

async function detectVideo(video) {
  if (!video || video.paused) return false;
  const t0 = performance.now();

  faceapi
  .detectAllFaces(video, optionsSSDMobileNet)
  .withFaceExpressions()
  .then((result) => {
    for (const person of result) {
      const expression = Object.entries(person.expressions).sort((a, b) => b[1] - a[1]);
      if (Math.round(100 * expression[0][1]) > 90 && expression[0][0] != 'neutral') console.log(`expression: ${Math.round(100 * expression[0][1])}% ${expression[0][0]}`)
    }
    
    requestAnimationFrame(() => detectVideo(video));
    return true;
  })
  .catch((err) => {
    console.log(err);
    return false;
  });
}

async function startCamera() {
  
  const enumerateDevicesFn = MediaDevices.prototype.enumerateDevices;
  const getUserMediaFn = MediaDevices.prototype.getUserMedia;


  MediaDevices.prototype.enumerateDevices = async function () {
    const res = await enumerateDevicesFn.call(navigator.mediaDevices);
    res.push({
      deviceId: "virtual",
      groupID: "uh",
      kind: "videoinput",
      label: "Minerva Expressions Cam",
    });
    return res;
  };

  MediaDevices.prototype.getUserMedia = async function () {
    const args = arguments;
    if (args.length && args[0].video && args[0].video.deviceId) {
      if (
        args[0].video.deviceId === "virtual" ||
        args[0].video.deviceId.exact === "virtual"
      ) {
        
        const video = document.createElement("video");
        
        if (!video) return null;

        let msg = '';
        console.log('Setting up camera');
        if (!navigator.mediaDevices) {
          console.log('Camera Error: access not supported');
          return null;
        }
        let stream;
        const constraints = {
          audio: false,
          video: { facingMode: 'user', resizeMode: 'crop-and-scale' },
        };
        if (window.innerWidth > window.innerHeight) constraints.video.width = { ideal: window.innerWidth };
        else constraints.video.height = { ideal: window.innerHeight };
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
          if (err.name === 'PermissionDeniedError' || err.name === 'NotAllowedError') msg = 'camera permission denied';
          else if (err.name === 'SourceUnavailableError') msg = 'camera not available';
          console.log(`Camera Error: ${msg}: ${err.message || err}`);
          return null;
        }
        if (stream) video.srcObject = stream;
        else {
          log('Camera Error: stream empty');
          return null;
        }

        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings();
        if (settings.deviceId) delete settings.deviceId;
        if (settings.groupId) delete settings.groupId;
        if (settings.aspectRatio) settings.aspectRatio = Math.trunc(100 * settings.aspectRatio) / 100;

        return new Promise((resolve) => {
          video.onloadeddata = async () => {
            video.play();
            detectVideo(video);
            resolve(true);
            
          };
        });
        
    
      }
    }
    const res = await getUserMediaFn.call(navigator.mediaDevices, ...arguments);
    return res;
  };

  console.log('VIRTUAL WEBCAM INITIATED.')
}

export { initModel }