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
  const appCanvasContainer = document.querySelector(".appCanvasContainer");
  const languageSelector = document.getElementById("languageSelector");
  const languages = [];

  const renderLanguages = (languagesList, isNeural) => {
    let selectedLanguageId = 0;
    const defaultVoice = isNeural ? defaultNeuralLanguage : defaultLanguage;
    languageSelector.innerHTML = "";
    languagesList.forEach((voice, index) => {
      languageSelector.innerHTML +=
        '<option value="' + index + '">' + voice.Name + "</option>";
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
        const { description, tags, objects } = JSON.parse(request.responseText);
        const allItems = `${description}. ${tags.join(",")}. ${objects.join(
          ","
        )}`;
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
      appCanvasContainer.classList.add("hide");
      appContainer.querySelector(".photoUploadLabel").classList.remove("hide");
      const canvasElement = document.querySelector("canvas");
      const canvasContext = canvasElement.getContext("2d");
      const image = new Image();
      image.onload = () => {
        appCanvasContainer.classList.remove("hide");
        appContainer.querySelector(".photoUploadLabel").classList.add("hide");
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
  getToken(() => {
    getLanguages(authToken, region, renderLanguages);
  });

  if (navigator.getUserMedia) {
    appCanvasContainer.classList.add("hide");
    videoElement.addEventListener("click", function () {
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
