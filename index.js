/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
"use strict";

const translator =  require('./modules/translate');
const visioner =  require('./modules/vision');
const speech = require('./modules/speech');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 1337;
const bodyParser = require('body-parser')

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.raw({ limit: '10MB' }));
app.use(express.static('public'));

app.use(function(req, res, next) {
    // TODO: fix the header to deny requests from other sites
    res.header("Access-Control-Allow-Origin", "*");
    // res.header("Access-Control-Allow-Origin", "https://sailwebapp.azurewebsites.net/");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Vary", "Origin");
    next();
});
app.post('/token', async (request, response) => {
    const token = await speech.issueToken();
    response.setHeader('Content-Type', 'text/json');
    response.end(`{ "token": "${token}" }`);
});
app.post('/sail', (request, response) => {
    const imageData = request.body;
    // Uncomment for debugging the image quality
    // const fs = require("fs");
    // fs.writeFileSync("test.png", imageData);

    const languageLocale = request.query.language;
    const [language] = languageLocale.split('-');
    visioner.vision(imageData, async (results) => {
        const {description, objects} = results;
        const caption = description.captions[0].text;
        const tags = description.tags;

        const translationResults = await translator.translateText(caption, language);
        const {translations} = translationResults[0];
        const descriptionTranslation = translations[0].text;
        const tagTranslations = [];
        const objectTranslations = [];
        console.log(tags)
        for (const tag of tags) {
            const translationResults = await translator.translateText(tag, language);
            const {translations} = translationResults[0];
            tagTranslations.push(translations[0].text);
        };
        for (const object of objects) {
            const translationResults = await translator.translateText(object.object, language);
            const {translations} = translationResults[0];
            objectTranslations.push(translations[0].text);
        };
        response.setHeader('Content-Type', 'text/json');
        const responseObject = {
            description: descriptionTranslation,
            tags: [tagTranslations],
            objects: [objectTranslations]
        }
        response.end(JSON.stringify(responseObject));
    });
});

app.listen(PORT, () => console.log(`Listening on ${ PORT }`));