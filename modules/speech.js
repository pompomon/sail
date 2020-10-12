/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
"use strict";

const request = require("request-promise");
const uuidv4 = require("uuid/v4");
const config = require("../config.json");

const subscriptionKey = config.speechKey;
const endpoint = config.speechEndpoint;
const region = config.speechRegion;

module.exports = {
  issueToken: async function (callback = () => {}) {
    const options = {
      method: "POST",
      baseUrl: endpoint,
      url: "issuetoken",
      headers: {
        "Ocp-Apim-Subscription-Key": subscriptionKey,
        "Ocp-Apim-Subscription-Region": region,
        "Content-type": "application/json",
        "X-ClientTraceId": uuidv4().toString(),
      },
      body: [{}],
      json: true,
    };

    return await request(options, function (err, res, body) {
      callback(body);
    }).catch(err => console.log(err));
  },
};
