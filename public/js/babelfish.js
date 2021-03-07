// status fields and start button in UI
var phraseDiv;
var startRecognizeOnceAsyncButton;

// subscription key and region for speech services.
var languageTargetOptions, languageSourceOptions;
var authenticationToken;
var SpeechSDK;
var recognizer;

// Note: Replace the URL with a valid endpoint to retrieve
//       authorization tokens for your subscription.
const authorizationEndpoint = "/token";
const region = "westeurope";
let languages = [];
let isNeuralSynth = false;

function RequestauthenticationToken() {
  if (authorizationEndpoint) {
    var a = new XMLHttpRequest();
    a.open("POST", authorizationEndpoint);
    a.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    a.send("");
    a.onload = function () {
      authenticationToken = JSON.parse(this.responseText).token;
      console.log("Got an authorization token: " + authenticationToken);
      getLanguages(authenticationToken, region, (languagesList, isNeural) => {
        languages = languagesList;
        isNeuralSynth = isNeural;
      });
    };
  }
}

document.addEventListener("DOMContentLoaded", function () {
  startRecognizeOnceAsyncButton = document.getElementById(
    "startRecognizeOnceAsyncButton"
  );
  languageTargetOptions = document.getElementById("languageTargetOptions");
  languageSourceOptions = document.getElementById("languageSourceOptions");
  phraseDiv = document.getElementById("phraseDiv");

  startRecognizeOnceAsyncButton.addEventListener("click", function () {
    const language = languageTargetOptions.value;
    const voiceLanguage = languages.find(
      (languageItem) =>
        languageItem.Name.indexOf(language) > -1 &&
        (languageItem.Name.indexOf("Neural") > -1 || !isNeuralSynth)
    ).Name;

    const player = initPlayer({language: voiceLanguage, authToken: authenticationToken, region});
    startRecognizeOnceAsyncButton.disabled = true;
    phraseDiv.innerHTML = "";

    // if we got an authorization token, use the token. Otherwise use the provided subscription key
    var speechConfig = SpeechSDK.SpeechTranslationConfig.fromAuthorizationToken(
      authenticationToken,
      region
    );

    speechConfig.speechRecognitionLanguage = languageSourceOptions.value;
    speechConfig.addTargetLanguage(language);

    var audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    recognizer = new SpeechSDK.TranslationRecognizer(speechConfig, audioConfig);

    recognizer.recognizeOnceAsync(
      function (result) {
        startRecognizeOnceAsyncButton.disabled = false;
        let translation = result.translations.get(language);
        window.console.log(translation);
        phraseDiv.innerHTML += translation;
        player.speakTextAsync(translation);
        recognizer.close();
        recognizer = undefined;
      },
      function (err) {
        startRecognizeOnceAsyncButton.disabled = false;
        phraseDiv.innerHTML += err;
        window.console.log(err);

        recognizer.close();
        recognizer = undefined;
      }
    );
  });

  if (!!window.SpeechSDK) {
    SpeechSDK = window.SpeechSDK;
    startRecognizeOnceAsyncButton.disabled = false;

    document.getElementById("content").style.display = "block";
    document.getElementById("warning").style.display = "none";

    // in case we have a function for getting an authorization token, call it.
    if (typeof RequestauthenticationToken === "function") {
      RequestauthenticationToken();
    }
  }
});
