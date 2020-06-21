'use strict';

const path = require('path');
const fs = require('fs');
const jiraUtils = require('./jiraUtils');

function readReportObject(reportFileName) {

    let reportFullPath = `${path.resolve("../../../")}/api-test-report/${reportFileName}`;

    let report;

    if (fs.existsSync(reportFullPath))
        report = JSON.parse(fs.readFileSync(reportFullPath, 'utf8'));
    else
        throw new Error(`Report file ${reportFullPath} not found`);

    if (!report)
        throw new Error("Report object isn't valid");

    return report;
}

function readCustomTestReport(fileName) {

    let reportFolderPath = `${path.resolve("./")}/test/api/test-suites/reports`;

    if (!fs.existsSync(reportFolderPath)){
        fs.mkdirSync(reportFolderPath);
    }

    let reportFullPath = `${reportFolderPath}/${fileName}`;

    let report;

    if (fs.existsSync(reportFullPath))
        report = JSON.parse(fs.readFileSync(reportFullPath, 'utf8'));

    return report;

}

function getIdenity(customIdentities, uuid) {

    let identityItem = customIdentities
        ? customIdentities.find(ci => ci.uuid === uuid)
        : undefined;

    return identityItem ? identityItem.identity : undefined;

}

function parseRecurs(items, customIdentities) {

    let result = [];

    if (items && Array.isArray(items)) {

        items.forEach(item => {

            let identity = getIdenity(customIdentities, item.uuid);

            let itemRes = { title: item.title + (identity ? ` (${identity})` : "") };

            if (item.pass !== undefined) {
                itemRes.pass = item.pass;
            }

            if (item.suites && item.suites.length > 0) {
                itemRes.items = ([] || itemRes.items).concat(parseRecurs(item.suites, customIdentities));
            }

            if (item.tests && item.tests.length > 0) {
                itemRes.items = ([] || itemRes.items).concat(parseRecurs(item.tests, customIdentities));
            }

            result.push(itemRes);

        });

    }

    return result;

}

function consoleLogRecurse(items, level) {

    if (level === 0)
        console.log('\n');

    items.forEach(item => {

        let spaces = new Array(level + 1).join('  ');
        let logTxt = spaces + (item.title + (item.pass !== undefined ? (item.pass ? `: \x1b[32mpassed\x1b[0m` : `: \x1b[31mfailed\x1b[0m`) : ``));
        console.log(logTxt);

        if (item.items && item.items.length > 0)
            consoleLogRecurse(item.items, level + 1);

        if (level < 2)
            console.log('\n');
    });

}

function parseReport(reportFileName, customReportFileName) {

    let report = readReportObject(reportFileName);
    let customReport = readCustomTestReport(customReportFileName);
    let result = parseRecurs(report.suites.suites, customReport);

    return result;

}

function logToConsole(reportFileName, customReportFileName) {

    let parsedReport = parseReport(reportFileName, customReportFileName);
    consoleLogRecurse(parsedReport, 0);

}

async function getJiraTasksHtml(title) {

    let scenario = (title.match(/\[.*\]/g) || []).map(m => m.replace(/\[|\]/g, "")).find(a => true);

    let jiraTaskHtml = "";

    if (scenario) {

        let jiraTasks = await jiraUtils.getTaskForTestScenario(scenario);
    
        jiraTasks.forEach(j => {
            jiraTaskHtml += `<a href="${j.link}">${j.key} </a>`;
        });

    }

    return jiraTaskHtml;
}

async function toHtmlRecurs(items, level) {
    
    let list = "";

    for (const item of items) {

        if (item.pass === undefined) 

            if (level === 0) {
                let jiraTasks = await getJiraTasksHtml(item.title);
                list += `<br><li><span><strong>${item.title.replace(/\[|\]/g, "")}</strong></span>${ ' ' + jiraTasks || '' }</li>`;   
            }
            else {
                list += `<li>${item.title}</li>`; 
            }

        else {
            if (item.pass)
                list += `<li>${item.title} <span style="color: #008000;"><strong>passed</strong></span></li>`;
            else    
                list += `<li>${item.title} <span style="color: #ff0000;"><strong> failed</strong></span></li>`;
        }

        if (item.items)
            list += await toHtmlRecurs(item.items, level + 1);
    }

    let ol = `<ul>${list}</ul>`;

    return ol;
}

async function toHtml(parsedReport) {
    return await toHtmlRecurs(parsedReport[0].items, 0);
}

async function saveToFile(reportFileName, customReportFileName, path) {

    let parsedReport = parseReport(reportFileName, customReportFileName);
    fs.writeFileSync(path, await toHtml(parsedReport), 'utf8');

}

module.exports = {
    parseReport,
    logToConsole,
    saveToFile
};