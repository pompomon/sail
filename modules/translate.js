/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
"use strict";

const request = require("request-promise");
const uuidv4 = require("uuid/v4");
const config = require("../config.json");

const subscriptionKey = config.translateKey;
const endpoint = config.translateEndpoint;
const region = config.translateRegion;

module.exports = {
  translateText: async function (text = "Test text", languageTo = "cs", callback = () => {}) {
    const options = {
      method: "POST",
      baseUrl: endpoint,
      url: "translate",
      qs: {
        "api-version": "3.0",
        to: [languageTo],
        from: "en",
      },
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Ocp-Apim-Subscription-Region": region,
        "Content-type": "application/json",
        "X-ClientTraceId": uuidv4().toString(),
      },
      body: [
        {
          text: text,
        },
      ],
      json: true,
    };

    return await request(options, function (err, res, body) {
      callback(body);
    }).catch(err => console.log(err));
  },
};
