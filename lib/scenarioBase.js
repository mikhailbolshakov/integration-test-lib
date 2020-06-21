'use strict';

const fs = require('fs');
const path = require('path');
const schemaValidator = require('./schemaValidator');
const testUtils = require('./testUtils');
const glob = require('glob');

class ScenarioBase {

    constructor(scenarioFolder) {
        this._load(scenarioFolder);
    }

    _resolvePath(relPath) {
        return path.resolve(this._scenarioFolder, relPath);
    }

    _validate() {
        let schemaPath = path.resolve('./test/api/infrastructure/schema');
        let configPath = this._resolvePath('configuration.json');
        schemaValidator.validate(schemaPath, configPath);
    }

    _loadRequestsToContext(step, context, stepCtx) {

        (step.requests || []).forEach(request => {

            let requestPath = this._resolvePath(request.path);
            let requestBody = JSON.parse(fs.readFileSync(requestPath, 'utf8'));

            if (request.schema) {

                let schemaPath = this._resolvePath(request.schema);

                // validate request against schema
                schemaValidator.validate(schemaPath, requestPath);

            }

            // handle macroses in the request
            let processedRequest = testUtils.handleJsonPathMacros(requestBody, context);

            stepCtx.requests[request.code] = processedRequest;

        });
    }

    _initStepCtx(step) {
        return {
            actor: step.actor,
            requests: {},
            response: {}
        };
    }

    async _executor(step, context, stepCtx) {

        let executorModule = require(this._resolvePath(step.executor.module));
        let executorFunction = executorModule[step.executor.function];

        stepCtx.response = await executorFunction(step, context, stepCtx);
    }

    async _doAssert(asserts, step, context, stepCtx) {

        for (const assert of asserts) {

            if (assert.expected) {

                let expectedPath = this._resolvePath(assert.expected);
                let expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
                stepCtx.expected = testUtils.handleJsonPathMacros(expected, context);
            }

            let assertModule = require(this._resolvePath(assert.module));
            let assertFunction = assertModule[assert.function];

            await assertFunction(step, context, stepCtx);
        }

    }

    async _assert(step, context, stepCtx) {

        if (step.assert) {

            let asserts = Array.isArray(step.assert)
                ? step.assert
                : ( typeof step.assert === 'object' ? [step.assert] : null);

            if (asserts)
                await this._doAssert(asserts, step, context, stepCtx);

        }
    }

    _load(scenarioFolder) {

        // setup scenario folder
        this._scenarioFolder = scenarioFolder;

        // validate scenario against schema
        this._validate();

        // load scenario configuration
        this.config = JSON.parse(fs.readFileSync(this._resolvePath('configuration.json'), 'utf8'));

        return this;

    }

    _setStepReport(report, step, context, stepCtx, mochaCtx) {

        report.push({
            uuid: mochaCtx.test.uuid,
            identity: step.identityExpression
                ? testUtils.retrieve(context, step.identityExpression)
                : undefined
        });
    }

    _executeSteps(context, report) {

        for (const step of this.config.steps.filter(s => !s.skip)) {

            let scenario = this;

            it(step.description, async function() {

                if (context.bypassOnError)
                    throw new Error("Failed on the previous step");

                try {

                    let mochaContext = this;

                    // initialize step    
                    let stepCtx = scenario._initStepCtx(step);
                    context[step.code] = stepCtx;
    
                    // load requests
                    scenario._loadRequestsToContext(step, context, stepCtx);
    
                    // run executor
                    await scenario._executor(step, context, stepCtx);
    
                    // set report
                    scenario._setStepReport(report, step, context, stepCtx, mochaContext);    
    
                    // assert
                    await scenario._assert(step, context, stepCtx);
                    
                } catch (error) {

                    // stop scenario execution in case of error
                    context.bypassOnError = true;
                    throw(error);
                }

            });

        }

    }

    _initContext(context) {

        let retContext = context || {};

        if (this.config.initContext) {
            let initContextModule = require(this._resolvePath(this.config.initContext.module));
            let initContextFunction = initContextModule[this.config.initContext.function];

            initContextFunction(retContext);
        }

        return retContext;

    }

    _executeBefore(context, report) {

        if (this.config.executeBefore && this.config.executeBefore.length > 0) {

            let folders = glob
                .sync(`${path.resolve("./")}/test/api/scenarious/**/configuration.json`)
                .map(f => path.dirname(f));

            for (const scenarioFolder of this.config.executeBefore) {

                let folder = folders.find(f => path.basename(f) == scenarioFolder);

                if (!folder)
                    throw new Error(`Scenario folder ${scenarioFolder} isn't found`);

                new ScenarioBase(folder).execute(context, report);
            }   

        }

    }

    execute(ctx, report) {

        let context = this._initContext(ctx);

        // execute "before" scenarios
        this._executeBefore(context, report);

        describe(this.config.description, () => {

            // execute steps 
            this._executeSteps(context, report);

        });

    }

}

module.exports = {
    ScenarioBase
};

