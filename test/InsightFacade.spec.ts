import { fail } from "assert";
import { expect } from "chai";
import * as fs from "fs";
import { InsightDatasetKind, InsightResponse, InsightResponseSuccessBody } from "../src/controller/IInsightFacade";
import InsightFacade from "../src/controller/InsightFacade";
import Log from "../src/Util";
import TestUtil from "./TestUtil";

// This should match the JSON schema described in test/query.schema.json
// except 'filename' which is injected when the file is read.
export interface ITestQuery {
    title: string;
    query: any;  // make any to allow testing structurally invalid queries
    response: InsightResponse;
    filename: string;  // This is injected when reading the file
}

describe("InsightFacade Add/Remove/List Dataset", function () {
    // Reference any datasets you've added to test/data here and they will
    // automatically be loaded in the Before All hook.
    const datasetsToLoad: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        repeat: "./test/data/courses.zip",
        invalid: "./test/data/invalid",
        invalidCourseSection: "./test/data/invalid-course-section.zip",
        invalidFolder: "./test/data/invalidFolder.zip",
        empty: "./test/data/empty.zip",
        noSection: "./test/data/no-section.zip",
        rooms: "./test/data/rooms.zip",
    };

    let insightFacade: InsightFacade;
    let datasets: { [id: string]: string };

    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToLoad)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return { [Object.keys(datasetsToLoad)[i]]: buf.toString("base64") };
            });
            datasets = Object.assign({}, ...loadedDatasets);
            expect(Object.keys(datasets)).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    // addDataset tests

    it("Should add a valid dataset", async () => {
        const id: string = "courses";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should fail to add courses dataset again", async () => {
        const id: string = "repeat";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            insightFacade.removeDataset(id);
        }
    });

    it("Should add a valid Rooms dataset", async () => {
        const id: string = "rooms";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Rooms);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should fail to add a dataset from a non zip file", async () => {
        const id: string = "invalid";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should fail to add a dataset from a folder not called courses", async () => {
        const id: string = "invalidFolder";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should fail to add an empty folder", async () => {
        const id: string = "empty";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should not add a dataset with no course section", async () => {
        const id: string = "noSection";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should fail to add a dataset with an an invalid course section", async () => {
        const id: string = "invalidCourseSection";
        const expectedCode: number = 400;
        let response: InsightResponse;

        try {
            response = await insightFacade.addDataset(id, datasets[id], InsightDatasetKind.Courses);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // removeDataset tests

    // Dataset not loaded -> 404
    it("Should fail to remove the empty dataset", async () => {
        const id: string = "empty";
        const expectedCode: number = 404;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // Loaded dataset -> 204
    it("Should remove the courses dataset", async () => {
        const id: string = "courses";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    it("Should remove the rooms dataset", async () => {
        const id: string = "rooms";
        const expectedCode: number = 204;
        let response: InsightResponse;

        try {
            response = await insightFacade.removeDataset(id);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
        }
    });

    // listDatasets Tests

    // Return empty list if no datasets loaded
    it("Should return empty list of datasets", async () => {
        const expectedCode: number = 200;
        const expectedResult: any = [];
        let response: InsightResponse;

        try {
            response = await insightFacade.listDatasets();
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("result");
            const actualResult = (response.body as InsightResponseSuccessBody).result;
            expect(actualResult).to.deep.equal(expectedResult);
        }
    });
});

describe("InsightFacade List Courses Dataset", function () {
    let insightFacadeNew: InsightFacade;
    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);
        fs.writeFileSync("src/controller/datasets.cache", fs.readFileSync("test/data/courses.cache"));
        try {
            insightFacadeNew = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacadeNew).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        fs.unlinkSync("src/controller/datasets.cache");
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("Should return list with courses dataset", async () => {
        const expectedCode: number = 200;
        const expectedResult = [{
            id: "courses",
            kind: InsightDatasetKind.Courses,
            numRows: 64612,
        }];
        let response: InsightResponse;
        try {
            response = await insightFacadeNew.listDatasets();
        } catch (err) {
            response = err;
            fail("test failed");
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("result");
            const actualResult = (response.body as InsightResponseSuccessBody).result;
            expect(actualResult).to.deep.equal(expectedResult);
        }

    });
});

describe("InsightFacade List Multiple Datasets", function () {
    let insightFacadeNew: InsightFacade;
    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);
        fs.writeFileSync("src/controller/datasets.cache", fs.readFileSync("test/data/multiple.cache"));
        try {
            insightFacadeNew = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacadeNew).to.be.instanceOf(InsightFacade);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        fs.unlinkSync("src/controller/datasets.cache");
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
    });

    it("Should return list with multiple datasets", async () => {
        const expectedCode: number = 200;
        const expectedResult = [
            {
                id: "one",
                kind: InsightDatasetKind.Courses,
                numRows: 1,
            },
            {
                id: "two",
                kind: InsightDatasetKind.Courses,
                numRows: 2,
            },
            {
                id: "three",
                kind: InsightDatasetKind.Courses,
                numRows: 3,
            },
        ];
        let response: InsightResponse;
        try {
            response = await insightFacadeNew.listDatasets();
        } catch (err) {
            response = err;
            fail("test failed");
        } finally {
            expect(response.code).to.equal(expectedCode);
            expect(response.body).to.have.property("result");
            const actualResult = (response.body as InsightResponseSuccessBody).result;
            expect(actualResult).to.deep.equal(expectedResult);
        }

    });
});

describe("Empty InsightFacade PerformQuery", () => {
    let insightFacade: InsightFacade;
    const testQuery: ITestQuery = {
        title: "Test",
        query: {
            WHERE: {
                GT: {
                    courses_avg: 90,
                },
            },
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_avg",
                ],
                ORDER: "courses_avg",
            },
        },
        response: null,
        filename: "mock file",
    };

    before(async function () {
        Log.test(`BeforeEach: ${this.test.parent.title}`);
        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    afterEach(function () {
        Log.test(`AfterEach: ${this.test.parent.title}`);
    });
    it("Should return an test query on empty InsightFacade", async () => {
        let response: InsightResponse;

        try {
            response = await insightFacade.performQuery(testQuery.query);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(400);
        }
    });

    it("Should fail test query on recently empty InsightFacade", async () => {
        let response: InsightResponse;

        const coursesFile = await TestUtil.readFileAsync("./test/data/courses.zip");
        const roomsFile = await TestUtil.readFileAsync("./test/data/rooms.zip");
        await insightFacade.addDataset("courses", coursesFile.toString("base64"), InsightDatasetKind.Courses);
        await insightFacade.addDataset("rooms", roomsFile.toString("base64"), InsightDatasetKind.Rooms);
        insightFacade.removeDataset("courses");
        try {
            response = await insightFacade.performQuery(testQuery.query);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(400);
            insightFacade.removeDataset("rooms");
        }
    });
});

describe("InsightFacade empty WHERE Query", () => {
    let insightFacade: InsightFacade;
    const testQuery: ITestQuery = {
        title: "Test",
        query: {
            WHERE: {},
            OPTIONS: {
                COLUMNS: [
                    "courses_dept",
                    "courses_avg",
                ],
                ORDER: "courses_avg",
            },
        },
        response: null,
        filename: "mock file",
    };

    before(async function () {
        Log.test(`BeforeEach: ${this.test.parent.title}`);
        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }
    });

    afterEach(function () {
        Log.test(`AfterEach: ${this.test.parent.title}`);
        insightFacade.removeDataset("courses");
    });

    it("Should return all results on empty WHERE", async () => {
        let response: InsightResponse;

        const coursesFile = await TestUtil.readFileAsync("./test/data/courses.zip");
        await insightFacade.addDataset("courses", coursesFile.toString("base64"), InsightDatasetKind.Courses);

        try {
            response = await insightFacade.performQuery(testQuery.query);
        } catch (err) {
            response = err;
        } finally {
            expect(response.code).to.equal(200);
            expect((response.body as InsightResponseSuccessBody).result.length).to.equal(64612);
        }
    });
});

// This test suite dynamically generates tests from the JSON files in test/queries.
// You should not need to modify it; instead, add additional files to the queries directory.
describe("InsightFacade PerformQuery", () => {
    const datasetsToQuery: { [id: string]: string } = {
        courses: "./test/data/courses.zip",
        rooms: "./test/data/rooms.zip",
    };
    let insightFacade: InsightFacade;
    let testQueries: ITestQuery[] = [];

    // Create a new instance of InsightFacade, read in the test queries from test/queries and
    // add the datasets specified in datasetsToQuery.
    before(async function () {
        Log.test(`Before: ${this.test.parent.title}`);

        // Load the query JSON files under test/queries.
        // Fail if there is a problem reading ANY query.
        try {
            testQueries = await TestUtil.readTestQueries();
            expect(testQueries).to.have.length.greaterThan(0);
        } catch (err) {
            expect.fail("", "", `Failed to read one or more test queries. ${JSON.stringify(err)}`);
        }

        try {
            insightFacade = new InsightFacade();
        } catch (err) {
            Log.error(err);
        } finally {
            expect(insightFacade).to.be.instanceOf(InsightFacade);
        }

        // Load the datasets specified in datasetsToQuery and add them to InsightFacade.
        // Fail if there is a problem reading ANY dataset.
        try {
            const loadDatasetPromises: Array<Promise<Buffer>> = [];
            for (const [id, path] of Object.entries(datasetsToQuery)) {
                loadDatasetPromises.push(TestUtil.readFileAsync(path));
            }
            const loadedDatasets = (await Promise.all(loadDatasetPromises)).map((buf, i) => {
                return { [Object.keys(datasetsToQuery)[i]]: buf.toString("base64") };
            });
            expect(loadedDatasets).to.have.length.greaterThan(0);

            const responsePromises: Array<Promise<InsightResponse>> = [];
            const datasets: { [id: string]: string } = Object.assign({}, ...loadedDatasets);
            for (const [id, content] of Object.entries(datasets)) {
                if (id === "courses") {
                    responsePromises.push(insightFacade.addDataset(id, content, InsightDatasetKind.Courses));
                } else {
                    responsePromises.push(insightFacade.addDataset(id, content, InsightDatasetKind.Rooms));
                }
            }

            // This try/catch is a hack to let your dynamic tests execute enough the addDataset method fails.
            // In D1, you should remove this try/catch to ensure your datasets load successfully before trying
            // to run you queries.
            try {
                const responses: InsightResponse[] = await Promise.all(responsePromises);
                responses.forEach((response) => expect(response.code).to.equal(204));
            } catch (err) {
                Log.warn(`Ignoring addDataset errors. For D1, you should allow errors to fail the Before All hook.`);
            }
        } catch (err) {
            expect.fail("", "", `Failed to read one or more datasets. ${JSON.stringify(err)}`);
        }
    });

    beforeEach(function () {
        Log.test(`BeforeTest: ${this.currentTest.title}`);
    });

    after(function () {
        Log.test(`After: ${this.test.parent.title}`);
    });

    afterEach(function () {
        Log.test(`AfterTest: ${this.currentTest.title}`);
        fs.unlinkSync("src/controller/datasets.cache");
    });

    // Dynamically create and run a test for each query in testQueries
    it("Should run test queries", async () => {
        describe("Dynamic InsightFacade PerformQuery tests", () => {
            for (const test of testQueries) {
                it(`[${test.filename}] ${test.title}`, async () => {
                    let response: InsightResponse;
                    try {
                        response = await insightFacade.performQuery(test.query);
                    } catch (err) {
                        response = err;
                    } finally {
                        expect(response.code).to.equal(test.response.code);

                        if (test.response.code >= 400) {
                            expect(response.body).to.have.property("error");
                        } else {
                            expect(response.body).to.have.property("result");
                            const expectedResult = (test.response.body as InsightResponseSuccessBody).result;
                            const actualResult = (response.body as InsightResponseSuccessBody).result;
                            expect(actualResult).to.deep.equal(expectedResult);
                        }
                    }
                });
            }
        });
    });
});
