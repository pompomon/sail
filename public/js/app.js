/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

const init = () => {
  // Global variables
  let webcamStream;
  let authToken;
  let isProcessing = false;
  const region = "westeurope";
  const appContainer = document.getElementById("appContainer");
  const videoElement = document.getElementById("video");
  const loaderElement = document.getElementById("loader");
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
    request.onerror = (error) => {
      console.error(error);
    };

    request.send();
  };

  const submitBlobImage = (blob, player) => {
    loaderElement.classList.remove("hide");
    const request = new XMLHttpRequest();
    const language = languages[languageSelector.selectedIndex].Locale;
    request.open("POST", `/sail?language=${language}`, true);
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.onload = () => {
      if (request.status >= 200 && request.status < 400) {
        // Success!
        console.log(request.responseText);
        const { description, tags, objects, persons } = JSON.parse(
          request.responseText
        );
        const text = `${description}. ${tags.join(",")}. ${objects.join(
          ","
        )}. ${persons}`;
        loaderElement.classList.add("hide");
        player.speakTextAsync(
          text,
          () => {},
          (error) => {
            console.log(error);
          }
        );
      } else {
        console.error(request);
      }
    };

    request.onerror = (error) => {
      console.error(error);
    };
    request.send(blob);
  };

  const initImageUpload = () => {
    appCanvasContainer.classList.add("hide");
    appContainer.querySelector(".photoUploadLabel").classList.remove("hide");
    const canvasElement = document.querySelector("canvas");
    const canvasContext = canvasElement.getContext("2d");
    const image = new Image();
    let player = null;
    const clickCallback = () => {
      // Binding onClick function to properly initialize voice synthesis on iOS Safari
      const language = languages[languageSelector.selectedIndex].Name;
      player = initPlayer({
        language,
        authToken,
        region,
        onAudioEndCallback: () => {
          appCanvasContainer.classList.add("hide");
        },
      });
      //document.body.removeEventListener("click", clickCallback);
    };
    document.body.addEventListener("click", clickCallback);
    document
      .getElementById("photoUpload")
      .addEventListener("change", (inputChangeEvent) => {
        const imageSrc = inputChangeEvent.target.files[0];
        const file = inputChangeEvent.target.files[0];
        const fileReader = new FileReader();
        fileReader.addEventListener("load", (fileReadEvent) => {
          submitBlobImage(fileReadEvent.target.result, player);
          image.addEventListener("load", () => {
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
            URL.revokeObjectURL(image.src);
          });
          image.src = URL.createObjectURL(imageSrc);
        });
        fileReader.readAsArrayBuffer(file);
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
      navigator.mediaDevices.getUserMedia = (constraints) => {
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
        return new Promise((resolve, reject) => {
          getUserMedia.call(navigator, constraints, resolve, reject);
        });
      };
    }

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      .then((localMediaStream) => {
        try {
          videoElement.srcObject = localMediaStream;
        } catch (error) {
          videoElement.src = window.URL.createObjectURL(localMediaStream);
        }
        webcamStream = localMediaStream;
        videoElement.onloadedmetadata = (e) => {
          videoElement.play();
        };
      })
      .catch((err) => {
        console.log(err.name + ": " + err.message);
        initImageUpload();
      });
  };

  // Initialize camera
  const initApp = (videoElement) => {
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
  };

  getToken(() => {
    getLanguages(authToken, region, (data, neuralSupport) => {
      renderLanguages(data, neuralSupport);
      initApp(videoElement);
    });
  });

  if (navigator.mediaDevices.getUserMedia) {
    appCanvasContainer.classList.add("hide");
    videoOverlayElement.addEventListener("click", () => {
      const language = languages[languageSelector.selectedIndex].Name;
      const player = initPlayer({
        language,
        authToken,
        region,
        onAudioEndCallback: () => {
          isProcessing = false;
          appCanvasContainer.classList.add("hide");
        },
      });
      const canvasElement = document.querySelector("canvas");
      if (!isProcessing) {
        isProcessing = true;
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
        canvasElement.toBlob((blob) => {
          submitBlobImage(blob, player);
        });
      }
    });
  }
};

const onDocumentReady = (fn) => {
  if (
    document.attachEvent
      ? document.readyState === "complete"
      : document.readyState !== "loading"
  ) {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
};

onDocumentReady(init);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/serviceWorker.js?v=1")
      .then((res) => console.log("service worker registered"))
      .catch((err) => console.log(err));
  });
}
