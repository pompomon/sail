/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

function init() {
  // Global variables
  let webcamStream;
  let authToken;
  let isProcessing = false;
  const region = "westeurope";
  const appContainer = document.getElementById("appContainer");
  const videoElement = document.getElementById("video");
  const videoOverlayElement = document.querySelector(".videoOverlay");
  const appCanvasContainer = document.querySelector(".appCanvasContainer");
  const languageSelector = document.getElementById("languageSelector");
  const languages = [];
  const languageRegex = new RegExp(/\(([A-Za-z-]+), ([A-Za-z]+)/i);
  const storageModeName = "uploadFromFile";

  const getLanguageName = (languageFullString) => {
    const matches = languageFullString.match(languageRegex);
    if (matches.length > 2) {
      return `${matches[2]} (${matches[1]})`;
    }
    return languageFullString;
  };

  const renderLanguages = (languagesList, isNeural) => {
    let selectedLanguageId = 0;
    const defaultVoice = isNeural ? defaultNeuralLanguage : defaultLanguage;
    languageSelector.innerHTML = "";
    languagesList.forEach((voice, index) => {
      languageSelector.innerHTML +=
        '<option value="' +
        index +
        '">' +
        getLanguageName(voice.Name) +
        "</option>";
      if (voice.Name.indexOf(defaultVoice) > 0) {
        selectedLanguageId = index;
      }
      languages.push(voice);
    });
    languageSelector.selectedIndex = selectedLanguageId;
    languageSelector.onselect = () => {};
  };

  const getToken = (callback) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/token", true);
    request.onload = (response) => {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        authToken = JSON.parse(request.responseText).token;
        if (typeof callback === "function") {
          callback();
        }
      } else {
        console.error(request);
      }
    };
    request.onerror = function (error) {
      console.error(error);
    };

    request.send();
  };

  const submitImageFromCanvas = (canvasElement) => {
    const request = new XMLHttpRequest();
    const language = languages[languageSelector.selectedIndex].Locale;
    request.open("POST", `/sail?language=${language}`, true);
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.onload = function () {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        console.log(request.responseText);
        const { description, tags, objects, persons } = JSON.parse(request.responseText);
        const allItems = `${description}. ${tags.join(",")}. ${objects.join(
          ","
        )}. ${persons}`;
        const selectedLanguage = languages[languageSelector.selectedIndex].Name;
        synthsizeText({
          text: allItems,
          language: selectedLanguage,
          region,
          authenticationToken: authToken,
          onEndCallback: () => {
            appCanvasContainer.classList.add("hide");
            isProcessing = false;
          },
        });
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
    appCanvasContainer.classList.remove("hide");
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

  const initImageUpload = () => {
    appCanvasContainer.classList.add("hide");
    appContainer.querySelector(".photoUploadLabel").classList.remove("hide");
    const canvasElement = document.querySelector("canvas");
    const canvasContext = canvasElement.getContext("2d");
    const image = new Image();
    image.onload = () => {
      appCanvasContainer.classList.remove("hide");
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
  };

  const initVideoOverlay = (videoElement) => {
    // Polyfil was taken from https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    // Older browsers might not implement mediaDevices at all, so we set an empty object first
    if (navigator.mediaDevices === undefined) {
      navigator.mediaDevices = {};
    }

    // Some browsers partially implement mediaDevices. We can't just assign an object
    // with getUserMedia as it would overwrite existing properties.
    // Here, we will just add the getUserMedia property if it's missing.
    if (navigator.mediaDevices.getUserMedia === undefined) {
      navigator.mediaDevices.getUserMedia = function (constraints) {
        // First get ahold of the legacy getUserMedia, if present
        var getUserMedia =
          navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

        // Some browsers just don't implement it - return a rejected promise with an error
        // to keep a consistent interface
        if (!getUserMedia) {
          return Promise.reject(
            new Error("getUserMedia is not implemented in this browser")
          );
        }

        // Otherwise, wrap the call to the old navigator.getUserMedia with a Promise
        return new Promise(function (resolve, reject) {
          getUserMedia.call(navigator, constraints, resolve, reject);
        });
      };
    }

    const cameraConstraints = {
      audio: false,
      video: {
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 480, ideal: 720, max: 1080 }
      }
    };

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      .then(function (localMediaStream) {
        try {
          videoElement.srcObject = localMediaStream;
        } catch (error) {
          videoElement.src = window.URL.createObjectURL(localMediaStream);
        }
        webcamStream = localMediaStream;
        videoElement.onloadedmetadata = function (e) {
          videoElement.play();
        };
      })
      .catch(function (err) {
        console.log(err.name + ": " + err.message);
        initImageUpload();
      });
  };

  // Initialize camera
  function initApp(videoElement) {
    const uploadFromFile = localStorage.getItem(storageModeName);
    document.getElementById("switchMode").addEventListener("click", () => {
      localStorage.setItem(
        storageModeName,
        uploadFromFile === "true" ? "false" : "true"
      );
      document.location.reload();
    });
    // Check what mode is selected
    if (uploadFromFile !== "true") {
      initVideoOverlay(videoElement);
    } else {
      initImageUpload();
    }
  }

  initApp(videoElement);
  getToken(() => {
    getLanguages(authToken, region, renderLanguages);
  });

  if (navigator.getUserMedia) {
    appCanvasContainer.classList.add("hide");
    videoOverlayElement.addEventListener("click", function () {
      const canvasElement = document.querySelector("canvas");
      if (!isProcessing) {
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    navigator.serviceWorker
      .register("/serviceWorker.js?v=1")
      .then((res) => console.log("service worker registered"))
      .catch((err) => console.log(err));
  });
}
