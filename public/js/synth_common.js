const defaultNeuralLanguage = "VlastaNeural";
const defaultLanguage = "Jakub";

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

  request.onload = () => {
    if (request.status >= 200 && request.status < 400) {
      const response = request.response;
      const neuralSupport = response.indexOf(defaultNeuralLanguage) > 0;
      const data = JSON.parse(response);
      onLoadCallback(data, neuralSupport);
    } else {
      window.console.log(request);
      eventsDiv.innerHTML +=
        "cannot get voice list, code: " +
        request.status +
        " detail: " +
        request.statusText +
        "\r\n";
    }
  };

  request.send();
};

const initPlayer = ({ language, authToken, region, onAudioEndCallback }) => {
  var speechConfig = SpeechSDK.SpeechTranslationConfig.fromAuthorizationToken(
    authToken,
    region
  );
  speechConfig.speechSynthesisVoiceName = language;

  const o = new SpeechSDK.SpeakerAudioDestination();
  o.onAudioEnd = () => {
    console.log("audioEnd");
    if (typeof onAudioEndCallback === "function") {
      onAudioEndCallback();
    }
  };
  const i = SpeechSDK.AudioConfig.fromSpeakerOutput(o);
  const n = new SpeechSDK.SpeechSynthesizer(speechConfig, i);
  n.synthesisCompleted = () => {
    n.close();
    n = null;
  };
  n.SynthesisCanceled = (n, i) => {
    console.log(e.CancellationDetails.fromResult(i));
  };

  return n;
};
