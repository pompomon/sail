const defaultNeuralLanguage = 'VlastaNeural';
const defaultLanguage = 'Jakub';

const getLanguages = (authenticationToken, region, onLoadCallback) => {
  var request = new XMLHttpRequest();
  request.open(
    "GET",
    "https://" +
      region +
      ".tts.speech.microsoft.com/cognitiveservices/voices/list",
    true
  );
  request.setRequestHeader("Authorization", "Bearer " + authenticationToken);

  request.onload = function () {
    if (request.status >= 200 && request.status < 400) {
      const response = this.response;
      const neuralSupport = response.indexOf(defaultNeuralLanguage) > 0;
      const data = JSON.parse(response);
      onLoadCallback(data, neuralSupport);
    } else {
      window.console.log(this);
      eventsDiv.innerHTML +=
        "cannot get voice list, code: " +
        this.status +
        " detail: " +
        this.statusText +
        "\r\n";
    }
  };

  request.send();
};

const synthsizeText = ({text, language, region, authenticationToken, onEndCallback}) => {
  var speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(
    authenticationToken,
    region
  );

  speechConfig.speechSynthesisVoiceName = language;

  const player = new SpeechSDK.SpeakerAudioDestination();
  player.onAudioEnd = function (_) {
    window.console.log("playback finished");
    // Reset elements
    if (typeof onEndCallback === "function") {
        onEndCallback();
    }
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
