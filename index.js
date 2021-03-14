/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
"use strict";

const translator = require("./modules/translate");
const visioner = require("./modules/vision");
const speech = require("./modules/speech");
const facer = require("./modules/face");
const express = require("express");
const app = express();
const PORT = process.env.PORT || 1337;
const bodyParser = require("body-parser");
const BOSS_ID = "1f436749-81e6-4c12-b446-5c7c26eb8e23";
const NOT_BOSS_ID = "a938e2d1-6fd7-4df7-8459-d79c315c7b93";
const BOSS_DETECTED_PHRASE = "Boss detected, time for work";
const NOT_BOSS_DETECTED_PHRASE = "Dima detected, time for coffee";

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.raw({ limit: "10MB" }));
app.use(express.static("public"));

app.use(function (req, res, next) {
  // TODO: fix the header to deny requests from other sites
  res.header("Access-Control-Allow-Origin", "*");
  // res.header("Access-Control-Allow-Origin", "https://sailwebapp.azurewebsites.net/");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  res.header("Vary", "Origin");
  next();
});
app.post("/token", async (request, response) => {
  const token = await speech.issueToken();
  response.setHeader("Content-Type", "text/json");
  response.end(`{ "token": "${token}" }`);
});
app.post("/sail", async (request, response) => {
  try {
    const imageData = request.body;
    // Uncomment for debugging the image quality
    // const fs = require("fs");
    // fs.writeFileSync("test.png", imageData);

    const languageLocale = request.query.language;
    const [language] = languageLocale.split("-");
    const results = await visioner.vision(imageData);
    const { description, objects } = results;
    const caption = description.captions[0].text;
    const tags = description.tags;

    const translationResults = await translator.translateText(
      caption,
      language
    );
    const { translations } = translationResults[0];
    const descriptionTranslation = translations[0].text;
    const tagTranslations = [];
    const objectTranslations = [];
    const personsTranslations = [];
    const faceDetection = await facer.detectFace(imageData);
    const faceDetectionResult = JSON.parse(faceDetection);
    if (faceDetectionResult[0]) {
      const { faceId } = faceDetectionResult[0];
      const faceIdentification = await facer.identifyFace([faceId], "boss");
      const candidates = faceIdentification.filter(
        (item) => item.faceId === faceId
      )[0].candidates;
      const bestMatchCandidate = candidates[0];
      console.log(bestMatchCandidate);
      if (bestMatchCandidate) {
        let personDetectedString = "";
        if (bestMatchCandidate.personId === BOSS_ID) {
          personDetectedString = BOSS_DETECTED_PHRASE;
        } else if (bestMatchCandidate.personId === NOT_BOSS_ID) {
          personDetectedString = NOT_BOSS_DETECTED_PHRASE;
        }
        console.log(personDetectedString);
        if (personDetectedString !== "") {
          const translationResults = await translator.translateText(
            personDetectedString,
            language
          );
          const { translations } = translationResults[0];
          personsTranslations.push(translations[0].text);
        }
      }
    }
    for (const tag of tags) {
      const translationResults = await translator.translateText(tag, language);
      const { translations } = translationResults[0];
      tagTranslations.push(translations[0].text);
    }
    for (const object of objects) {
      const translationResults = await translator.translateText(
        object.object,
        language
      );
      const { translations } = translationResults[0];
      objectTranslations.push(translations[0].text);
    }
    response.setHeader("Content-Type", "text/json");
    const responseObject = {
      description: descriptionTranslation,
      tags: tagTranslations,
      objects: objectTranslations,
      persons: personsTranslations,
    };
    response.end(JSON.stringify(responseObject));
  } catch (err) {
    console.log(err);
    response.status(404).send("Failed to process request.");
  }
});

app.listen(PORT, () => console.log(`Listening on ${PORT}`));
