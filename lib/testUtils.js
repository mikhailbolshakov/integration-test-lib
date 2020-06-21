'use strict';
const jsonPath = require('jsonPath');

function handleJsonPathMacros(request, context) {
    let requestTxt = JSON.stringify(request);

    (requestTxt.match(/\{{2}[a-z|A-Z|$|.|0-9|[|\]]*?\}{2}/g) || []).forEach(macros => {

        let jsonPathExpr = macros.replace(/\{|\}/g, "");

        let value = retrieve(context, jsonPathExpr);

        if (value) {
            requestTxt = requestTxt.replace(macros, value);
        }

    });

    return JSON.parse(requestTxt);

}

function retrieve(context, jsonPathExpr) {

    let matches = jsonPath.query(context, jsonPathExpr);

    return matches && matches.length > 0
        ? matches[0]
        : undefined;

}

module.exports = {
    handleJsonPathMacros,
    retrieve
};
