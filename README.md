# Glossary

**scenario** - a configurable item which consists of one or multiple steps and can be executed and asserted by the test infrastructure either as a separate integration test or as a part of the complex scenario having multiple scenarios organized in a hierarchical structure.  

**step** - a building block of a test scenario which contains API call and assert logic. Steps are executed in order.

**suite** - a combination of test scenarios executed together. For example, financial suite contains all financial test scenarios. 

# Scenario

* Scenario is located in a separate folder. 
  The name of a scenario must be unqiue as scenarios are identified by its folder names.
  All scenario folders are located under `IntegrationTests\test\api\scenarios`.

* Scenario might have one or multiple **steps**.

* Scenario has `configuration.json` file which describes the scenario steps and must corresponds the schema  `IntegrationTests\test\api\infrastructure\schema\scenarioSchema.json`.

### How to configure a test scenario

Here are some simple steps you have to go through to configure a new test scenario:

* Prepare your business scenario broken into simple steps, so that each step corresponds one API call or single action.

* Create a new folder under `IntegrationTests\test\api\scenarios` with a unique name.

*Note. It's desirable to have scenario folders named conventionally to ensure their uniqueness.*

* Create `readme.md` file with a description of the test scenario.

* Create `configuration.json` file  under `scenario` folder.

* Create `steps` folder under the newly created scenario folder that will contain all needed files for each step. Each scenario step gets its own folder `steps \ [step_folder_name]`. 

* Create folders for all the steps according to the business scenario you are configuring.
The target folder structure of a single test scenario should be 

```
    IntegrationTests
        test
            api
                scenarious
                    ...
                        [ scenario_folder_name (unqiue) ]
                            steps
                                [ first_step_folder_name ]
                                    request.json
                                    executor.js
                                    asserter.js
                                    ...
                                [ second_step_folder_name ]
                                    request.json
                                    executor.js
                                    asserter.js
                                    ...                                    
                        readme.md

```

* Modify `configuration.json` according to the schema 

```json
{
  "$schema": "http://json-schema.org/draft-04/schema",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "code",
    "description",
    "steps"
  ],
  "properties": {
    "code": {
      "type": "string",
      "description": "Scenario code"
    },
    "description": {
      "type": "string",
      "description": "Scenario description"
    },
    "initContext": {
      "ref$": "./functionSchema.json#"
    },
    "executeBefore": {
      "type": "array",
      "description": "list of scenarious (folder names) which have to be executed before ",
      "items": {
        "items": {
          "type": "string"
        }
      }
    },
    "steps": {
      "type": "array",
      "description": "Scenario steps",
      "items": {
        "$ref": "./stepSchema.json#"
      }
    }
  }
}
```

**code** - scenario code. Uniqueness of this code isn't currently checked but it might be changed in the future, so try to keep it unique.

**description** - arbitrary text that will appear as a title of the scenario in the report.

**executeBefore** - array of scenario folder names which are executed before the current scenario. It allows to build a hierarchical structure of scenarios with the [shared context](#scenarioContext).   

**initContext** - allow to specify a js function that is executed each time when a new context is initialized. You can implement any logic to initilize a shared context.

**steps** - array of steps configured according to [Step configuration instruction](#stepConfiguration). 

### <a name="scenarioContext"></a>Scenario context

**Context** is a JSON object that is used to pass any data across steps as scenario is running. Context is shared between all the scenarios specified as `executed before`. 

For example, you might want to pass partyId from the scenario creating a party to the scenario registering an application. 

### <a name="stepConfiguration"></a>Step configuration

Step schema:

```json
{
    "$schema": "http://json-schema.org/draft-04/schema",
    "type": "object",
    "additionalProperties": false,
    "required": [
        "code",
        "actor",
        "description",
        "executor"        
    ],
    "properties": {
        "code": {
            "type": "string",
            "description": "Scenario code"
        },
        "description": {
            "type": "string",
            "description": "Scenario description"
        },
        "actor": {
            "type": "string",
            "description": "actor code with which step is executed"
        },
        "requests": {
            "type": "array",
            "description": "list of step requests",
            "items": {
                "description": "step request", 
                "$ref": "./requestSchema.json#"
            }
        },
        "executor": {
            "$ref": "./functionSchema.json#",
            "description": "executor function"
        },
        "assert": {
            "$ref": "./assertSchema.json#",
            "description": "assertion"
        },
        "skip": {
            "type": "boolean",
            "description": "if true step is skipped"
        }

    }
}
```

**code** - step code that is used for identifying steps and to access step's data. It must be unique within whole scenario tree (tree is defined by specifying `executeBefore`).

**description** - text description of the steps. It will be presented in the scenario report.

**actor** - actor code used for API call. 
*Use `SuperUser` actor unless you want to test operations under particular actor.*

**requests** - allows to specify request objects used as input data. See detailed description in [request configuration](#stepRequest).

**executor** - allows to specify js script executing the API call. See detailed description in [executor configuration](#stepExecutor).

**assert** - allows to specify js script with accertion logic. See detailed description in [assert configuration](#stepAsserter).

**skip** - if true, the given step is skipped as scenario is executed. 

#### <a name="stepRequest"></a>Request

By configuring step requests you are providing incoming data for API call to be executed.
To configure requests you have to populate `requests` array within the step configuration

e.g

```json
            "requests": [
                {
                    "code": "application_example",
                    "path": "./steps/contractActivation/application.json", 
                    "schema": "../../../../../../../../../Policy/document/Application/dataSchema.json"
                },
                {
                    "code": "metadata",
                    "path": "./steps/contractActivation/metadata.json"
                }
            ],
```

* **code** - request code. It's used to refer to the request data. It must be unique within the step.

* **path** - relative path (from `configuration.json`) to a json file of the request.

* **schema** - relative path to a schema file. Not obligatory. If specified, the request is validated against the provided schema.     

You can use [macroses](#macros) when configuring request objects. 

#### <a name="macros"></a>Macroses

`Macros` is a special JSON path expression that provides a text substitution within request object by addressing context attributes with help of json path language. 

It gives more flexibility in request configuration and provides a dynamic way to link entities across multiple scenarios without harcoding any specific values.   

Please, consider a fragment of an application request body where party attributes are substituted with values from context.  

```json
"common": {
        "checkDate": "2019-10-08",
        "dataSource": "DS",
        "partyTypeCode": "NaturalPerson",
        "personCode": "{{$.partyCode}}",
        "riskAssignmentDate": "2019-10-17",
        "riskLevelCode": "LowRisk",
        "segmentCode": "PI",
        "statusCode": "Active",
        "partyId": "{{$.partyId}}",
      },

```

Any valid JSON path expression enclosed with double curl brackets can be used to access context object. 
Please, ensure the context properly populated before accessing attributes from request macroses.

There are some examples of JSON path usages:

```

context = {
    "attribute": "value",
    "items": [
        {
            "name": "name1",
            "age": 10
        },
        {
            "name": "name2",
            "age": 20
        }
    ]
};

{{$.attribute}} - retrieves value of "attribute"
{{$.items[0].name}} - retrieves value of the attribute "name" of the first item
{{$.items[?(@.name == 'name1')].age}} - retrieves value of the attribute "age" of the items with name == "name1"  

```

Please, refer to the json path [documentation](https://github.com/json-path/JsonPath)

*Note, only a single value is currently supported as a result of JSON path expression. So, if your expression retrieves multiple values, the first one is taken.*  

#### <a name="stepExecutor"></a>Executor

`Executor` is a JavaScript function that is used to call API service or another logic according to the step goal.

To configure an executor you have to specify `executor` object within the step configuration:

```json
"executor": {
                "module": "../../lib/executor/contractExecutor.js",
                "function": "createActivateAmendmentWithMetadata"
            },
```

**module** - relative path to js file.

**function** - function name. The function must be exported from the same module and be marked as async. 

Executor function parameters:

**step** - step configuration object.

**context** - scenario shared context, available across the steps.

**stepContext** - step context, available within the step.

```javascript
async function createApplication(step, context, stepContext) {}

module.exports = {
    createApplication
};
```

To access a request object you can get it by code from `stepContext` parameter:

```json
"requests": [
                {
                    "code": "amendment_example",
                    "path": "./steps/01.amendment/amendment.json"
                },
                {
                    "code": "metadata",
                    "path": "./steps/01.amendment/metadata.json"
                }
            ],

```

```javascript
    let metadata = stepContext.requests["metadata"];
    let example = stepContext.requests["amendment_example"];
``` 

The value(object) returned from executor function is stored as `response` in the step context.

Step context of the particular step can be accessed from any step by requesting shared context by step code

```javascript

let fisrtStepRequest = context["first_step_code"].requests["request"];
let firstStepResponse = context["first_step_code"].response;

```

*While it's possible to have a separate executor for each scenario step, it makes sense to have reusable executors for the most popular cases. It simplifies the configuration and maintenance of integration tests.*

#### <a name="stepAsserter"></a>Asserter

`Asserter` is another javascript function that is configured on step level and used to assert fact results with expected values.

```json
"assert": {
                "expected": "./steps/01.paidup/expected.json",
                "module": "../../lib/asserter/finOperationAssert.js",
                "function": "assert"
            }
```

**expected** - relative path to json file that contains arbitrary object. 
This object is accessible from assert function by requesting `stepContext` and can be used to storing target results of the step execution.

```javascript
async function assert(step, context, stepContext) {
    
    let expected = stepContext.expected;
    ...
}
```

**module** - relative path to js file.

**function** - function name. The function must be exported from the same module and marked as async. 

*Note, as well as for executor it's preferable to have reusable executors.*

*If accertion involves getting some data from the database, a scpecial helper `ApiTestUtils.query2json` can ease retrieving data as JSON objects by specified a SQL query and parameters*.

```javascript
const { query2json } = require("../../../../../../../CommonItems/lib/ApiTestUtils");

async function getFinOperations(contractNumber) {
    const operationSql = `[you SQL query here]`;

    return await query2json(operationSql, { contractNumber: contractNumber });
}
```

*Since pagination isn't supported, be careful when retrieving much data from the database.* 

# Test suite

A test suite is a prepared set of test scenarios which are run together.
Test suites are located in `\IntegrationTests\test\api\test-suites` folder.

#### Prepared suites

|suite filename      | description             | how to run                      |
|--------------------|-------------------------|---------------------------------|
|testSuite.json |all scenarios                                   | `yarn run test-suite`            |

#### How to configure a new suite

* Prepare a list of scenarios which are going to be a part of a newly created suite 
Scenario is identified by its folder name (location of `configuration.json`).

* Prepare a json file and place it in `test-suites` folder 


```json

[
    {
        "scenario": "Scenario1",
        "skip": false
    },
    {
        "scenario": "Scenario2",
        "skip": false
    },
    {
        "scenario": "Scenario3",
        "skip": false
    }
]

```

**scenario** - folder name of your test scenario (folder where `configuration.json` is located)

**skip** - allows to skip a particular scenario while executing the suite 

* Prepare a npm task to run your suite with `yarn run` command. 

* Add a new script entry to `IntegrationTests\package.json` file

```javascript
"init-suite": "node run-suite.js --suite=./test-suites/initialSuite.json"
```

`--suite` - a relative path to a newly created suite.  

* As a result you are able to run a newly created suite with yarn command like

```javascript
yarn run init-suite
```

# Reporting

The last report can be showed on the console by executing yarn command

```javascript
yarn run test-api-report
```
