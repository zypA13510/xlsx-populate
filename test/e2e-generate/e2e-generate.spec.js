"use strict";

process.chdir(__dirname);

const fs = require("fs");
const glob = require("glob");
const path = require("path");
const edge = require('edge-js');

const XlsxPopulate = require("../../lib/XlsxPopulate");

const interopPath = glob.sync("C:\\Program Files (x86)\\Microsoft Office\\root\\Office*\\DCF\\Microsoft.Office.Interop.Excel.dll")[0];
if (!interopPath) throw new Error("Unable to find the Microsoft.Office.Interop.Excel.dll!");

// const testCases = ["./preserve-existing/"]; // To focus
const testCases = glob.sync("./*/");

describe("e2e-generate", () => {
    testCases.map(testCase => {
        itAsync(testCase, () => {
            return Promise.resolve()
                .then(() => {
                    if (fs.existsSync(`${testCase}template.xlsx`)) {
                        return XlsxPopulate.fromFileAsync(`${testCase}template.xlsx`);
                    } else {
                        return XlsxPopulate.fromBlankAsync();
                    }
                })
                .then(workbook => {
                    const generate = require(`${testCase}generate`);
                    generate(workbook);
                    return workbook;
                })
                .then(workbook => workbook.toFileAsync(`${testCase}out.xlsx`))
                .then(() => new Promise((resolve, reject) => {
                    const wbPath = path.resolve(`${testCase}out.xlsx`);
                    const parseSource = fs.readFileSync(`${testCase}parse.cs`);
                    const parseTemplate = fs.readFileSync("./template.cs");
                    const source = parseTemplate + parseSource;

                    const parse = edge.func({
                        source,
                        references: ["System.Drawing.dll", interopPath]
                    });

                    parse(wbPath, (err, results) => {
                        if (err) return reject(err);
                        resolve(results);
                    });
                }))
                .then(results => {
                    const expected = JSON.parse(fs.readFileSync(`${testCase}expected.json`));
                    expect(results).toEqualJson(expected);
                });
        });
    });
});
