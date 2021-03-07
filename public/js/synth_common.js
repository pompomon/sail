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

const initPlayer = ({language, authToken, region}) => {
  var speechConfig = SpeechSDK.SpeechTranslationConfig.fromAuthorizationToken(
    authToken,
    region
  );
  speechConfig.speechSynthesisVoiceName = language;

  o = new SpeechSDK.SpeakerAudioDestination();
  o.onAudioEnd = function () {
    console.log("audioEnd");
  };
  i = SpeechSDK.AudioConfig.fromSpeakerOutput(o);
  n = new SpeechSDK.SpeechSynthesizer(speechConfig, i);
  n.synthesisCompleted = function () {
    n.close();
    n = null;
  };
  n.SynthesisCanceled = function (n, i) {
    var r;
    r = e.CancellationDetails.fromResult(i);
    r.reason === e.CancellationReason.Error &&
      (a.innerText = t.srTryAgain);
  };

  return n;
};