'use strict';

const fetch = require('node-fetch');
const colors = require('colors');

const jiraUrl = "https://jira.com";
const jiraUrlBrowse = jiraUrl + "/browse/";
const jiraUrlSearch = jiraUrl + "/rest/api/2/search";

async function apiRequest(options, postData) {

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

    try {
        const response = await fetch(options.url, {
            method: options.method,
            body: postData,
            headers: options.headers,
        });
    
        if (response.status < 200 || response.status >= 300){
            throw await response.text();
        }
    
        return await response.text();

    } catch (error) {
        console.error(colors.red(error));
        return {};
    }

}

async function getTaskForTestScenario(scenario) 
{

    let url = jiraUrlSearch + `?jql=project=TASK+and+status+in+(Open,Reported,"In Progress",Reopened)+and+summary~${scenario}&fields=key,summary`;

    console.log(url);

    let options = {
        url: url,
        method: "GET",
        headers: {
            // rlTester user is used
            'Authorization': 'Basic ...',
            'Content-Type': 'application/json'
        } 
    };

    let response = await apiRequest(options);

    let respJson = JSON.parse(response);

    return (respJson.issues || []).map(i => {
        return {
            key: i.key,
            link: jiraUrlBrowse + i.key
        };
    });
}

module.exports = {
    getTaskForTestScenario
};