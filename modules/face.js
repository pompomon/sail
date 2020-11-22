/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
"use strict";

const request = require("request-promise");
const config = require("../config.json");

const subscriptionKey = config.faceKey;
const endpoint = config.faceEndpoint;
const detectionModel = config.faceDetectionModel;

module.exports = {
  detectFace: async function (image, callback = () => {}) {
    const options = {
      method: "POST",
      baseUrl: endpoint,
      url: "detect",
      qs: {
        detectionModel: detectionModel,
        returnFaceAttributes: "age,gender"
      },
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Content-type": "application/octet-stream",
      },
      body: image,
    };

    return await request(options, function (err, res, body) {
      callback(body);
    }).catch((err) => console.log(err));
  },
  identifyFace: async function (faceIds, group, callback = () => {}) {
    const options = {
      method: "POST",
      baseUrl: endpoint,
      url: "identify",
      qs: {
        detectionModel: detectionModel,
      },
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Content-type": "application/json",
      },
      body: {
        "personGroupId": group,
        "faceIds": faceIds,
        "maxNumOfCandidatesReturned": 1,
        "confidenceThreshold": 0.5
      },
      json: true,
    };

    return await request(options, function (err, res, body) {
      callback(body);
    }).catch((err) => console.log(err));
  },
};
