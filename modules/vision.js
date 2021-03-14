/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
"use strict";

const config = require("../config.json");

const ComputerVisionClient = require("@azure/cognitiveservices-computervision")
  .ComputerVisionClient;
const ApiKeyCredentials = require("@azure/ms-rest-js").ApiKeyCredentials;
module.exports = {
  vision: async (imageStream) => {
    const key = config.visionKey;
    const endpoint = config.visionEndpoint;
    const computerVisionClient = new ComputerVisionClient(
      new ApiKeyCredentials({ inHeader: { "Ocp-Apim-Subscription-Key": key } }),
      endpoint
    );

    const analyzeResult = await computerVisionClient.analyzeImageInStream(
      imageStream,
      { visualFeatures: ["Description","Objects"] }
    );
    console.log(analyzeResult);
    return analyzeResult;
  },
};
