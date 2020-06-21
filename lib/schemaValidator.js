'use strict';


const testRoot = require('@adinsure-tools/test-framework');
const mockery = require('mockery');

function validate(schemaPath, filePath) {
    let validator = new testRoot.Validate(mockery);
    validator.dataSchemaFile = schemaPath;
    validator.validateExamplesAgainstDataSchema(filePath);
}

module.exports = {
    validate
};