/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

function init() {
  // Global variables
  let webcamStream;
  let authToken;
  let isProcessing = false;
  const appContainer = document.getElementById("appContainer");
  const videoElement = document.querySelector("video");

  const getToken = () => {
    const request = new XMLHttpRequest();
    request.open("POST", "/token", true);
    request.onload = (response) => {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        authToken = JSON.parse(request.responseText).token;
      } else {
        console.error(request);
      }
    };
    request.onerror = function (error) {
      console.error(error);
    };

    request.send();
  };

  const synthsizeText = (text) => {
    var speechConfig;
    speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
      authToken,
      "westeurope"
    );

    speechConfig.speechSynthesisVoiceName =
      "Microsoft Server Speech Text to Speech Voice (cs-CZ, VlastaNeural)";

    player = new SpeechSDK.SpeakerAudioDestination();
    player.onAudioEnd = function (_) {
      window.console.log("playback finished");
      // Reset elements
      document.querySelector("canvas").classList.add("hide");
      isProcessing = false;
    };

    var audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(player);

    synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);

    // The event synthesizing signals that a synthesized audio chunk is received.
    // You will receive one or more synthesizing events as a speech phrase is synthesized.
    // You can use this callback to streaming receive the synthesized audio.
    synthesizer.synthesizing = function (s, e) {
      window.console.log(e);
    };

    // The synthesis started event signals that the synthesis is started.
    synthesizer.synthesisStarted = function (s, e) {
      window.console.log(e);
    };

    // The event synthesis completed signals that the synthesis is completed.
    synthesizer.synthesisCompleted = function (s, e) {
      console.log(e);
    };

    // The event signals that the service has stopped processing speech.
    // This can happen when an error is encountered.
    synthesizer.SynthesisCanceled = function (s, e) {
      const cancellationDetails = SpeechSDK.CancellationDetails.fromResult(
        e.result
      );
      window.console.log(e, cancellationDetails);
    };

    // This event signals that word boundary is received. This indicates the audio boundary of each word.
    // The unit of e.audioOffset is tick (1 tick = 100 nanoseconds), divide by 10,000 to convert to milliseconds.
    synthesizer.wordBoundary = function (s, e) {
      window.console.log(e);
    };

    const complete_cb = function (result) {
      window.console.log(result);
      synthesizer.close();
      synthesizer = undefined;
    };
    const err_cb = function (err) {
      startSynthesisAsyncButton.disabled = false;
      window.console.log(err);
      synthesizer.close();
      synthesizer = undefined;
    };
    synthesizer.speakTextAsync(text, complete_cb, err_cb);
  };

  const submitImageFromCanvas = (canvasElement) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/sail", true);
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.onload = function () {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        console.log(request.responseText);
        const { description, tags, objects } = JSON.parse(request.responseText);
        const allItems = `${description}. ${tags.join(",")}. ${objects.join(
          ","
        )}`;
        synthsizeText(allItems);
      } else {
        console.error(request);
      }
    };

    request.onerror = function (error) {
      console.error(error);
    };

    canvasElement.toBlob(function (blob) {
      request.send(blob);
    });
  };

  const takePhoto = (videoElement, canvasElement) => {
    appContainer.querySelector(".appCanvas").classList.remove("hide");
    const canvasContext = canvasElement.getContext("2d");
    const videoSettings = webcamStream.getVideoTracks()[0].getSettings();
    canvasContext.drawImage(
      videoElement,
      0,
      0,
      videoSettings.width,
      videoSettings.height,
      0,
      0,
      canvasElement.width,
      canvasElement.height
    );
    submitImageFromCanvas(canvasElement);
  };

  // Initialize camera
  function bindCamera(videoElement) {
    // getMedia polyfill
    navigator.getUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia;

    // Check that getUserMedia is supported
    if (navigator.getUserMedia) {
      navigator.getUserMedia(
        // constraints
        {
          video: { facingMode: "environment" },
          audio: false,
        },
        // successCallback
        function (localMediaStream) {
          try {
            videoElement.srcObject = localMediaStream;
          } catch (error) {
            videoElement.src = window.URL.createObjectURL(localMediaStream);
          }
          webcamStream = localMediaStream;
        },
        // errorCallback
        function (err) {
          console.log("The following error occured: " + err);
        }
      );
    } else {
      console.log("getUserMedia not supported");
      appContainer.querySelector(".appCanvasContainer").classList.add("hide");
      appContainer.querySelector(".photoUploadLabel").classList.remove("hide");
      const canvasElement = document.querySelector("canvas");
      const canvasContext = canvasElement.getContext("2d");
      const image = new Image();
      image.onload = () => {
        appContainer
          .querySelector(".appCanvasContainer")
          .classList.remove("hide");
        appContainer.querySelector(".photoUploadLabel").classList.add("hide");
        canvasElement.classList.remove("hide");
        canvasContext.drawImage(
          image,
          0,
          0,
          image.width,
          image.height,
          0,
          0,
          canvasElement.width,
          canvasElement.height
        );
        submitImageFromCanvas(canvasElement);
        URL.revokeObjectURL(image.src);
      };
      document
        .getElementById("photoUpload")
        .addEventListener("change", (event) => {
          const file = event.target.files[0];
          image.src = URL.createObjectURL(file);
        });
    }
  }

  bindCamera(videoElement);
  getToken();

  if (navigator.getUserMedia) {
    document.addEventListener("click", function () {
      const videoElement = document.querySelector("video");
      const canvasElement = document.querySelector("canvas");
      if(!isProcessing) {
        isProcessing = true;
        takePhoto(videoElement, canvasElement);
      }
    });
  }
}

function onDocumentReady(fn) {
  if (
    document.attachEvent
      ? document.readyState === "complete"
      : document.readyState !== "loading"
  ) {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}

onDocumentReady(init);
