import Server from "../src/rest/Server";
import Log from "../src/Util";
import InsightFacade from "../src/controller/InsightFacade";
import fs = require("fs");
import chai = require("chai");
import { expect } from "chai";

import chaiHttp = require("chai-http");
import TestUtil from "./TestUtil";

describe("Facade D3", function () {

    let facade: InsightFacade = null;
    let server: Server = null;

    chai.use(chaiHttp);

    before(function () {
        facade = new InsightFacade();
        server = new Server(4321);
        server.start().catch((err) => err);
    });

    after(function () {
        server.stop();
    });

    beforeEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    afterEach(function () {
        // might want to add some process logging here to keep track of what"s going on
    });

    it("GET /datasets on empty insightFacade", function () {
        try {
            return chai.request("localhost:4321")
                .get("/datasets")
                .then((res: any) => {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result.length).to.be.equal(0);
                })
                .catch((err: any) => {
                    Log.error(err.message);
                    expect.fail();
                });
        } catch (err) {
            Log.error(err.message);
            expect.fail();
        }
    });

    it("DELETE non-existant dataset", function () {
        try {
            return chai.request("localhost:4321")
                .del("/dataset/courses")
                .then((res: any) => {
                    // some logging here please!
                    expect(res.status).to.be.equal(404);
                })
                .catch((err) => {
                    Log.test(err.message);
                    expect(err.status).to.be.equal(404);
                });
        } catch (err) {
            Log.error(err.message);
        }
    });

    const coursesFile =  TestUtil.readFileAsync("./test/data/courses.zip");

    it("Add courses dataset", async function () {
        try {
            return chai.request("localhost:4321")
                .put("/dataset/courses/courses")
                .attach("body", await coursesFile, "courses.zip")
                .then((res: any) => {
                    // some logging here please!
                    expect(res.status).to.be.equal(204);
                })
                .catch((err) => {
                    Log.test(err.message);
                    expect.fail(err.message);
                });
        } catch (err) {
            Log.error(err.message);
            expect.fail(err.message);
        }
    });

    it("GET /datasets on insightFacade with courses", function () {
        try {
            return chai.request("localhost:4321")
                .get("/datasets")
                .then((res: any) => {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result.length).to.be.equal(1);
                    expect(res.body.result[0].id).to.be.equal("courses");
                })
                .catch((err: any) => {
                    Log.error(err.message);
                    expect.fail(err);
                });
        } catch (err) {
            Log.error(err.message);
            expect.fail(err);
        }
    });

    it("POST courses query with bad query", function () {
        const query = JSON.stringify({
            WHERE: {
                GTd: {
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
        });

        try {
            return chai.request("localhost:4321")
                .post("/query")
                .send(query)
                .then((res: any) => {
                    // some logging here please!
                })
                .catch((err: any) => {
                    Log.error(err.message);
                    Log.test(err.message);
                    expect(err.status).to.be.equal(400);
                });
        } catch (err) {
            Log.error(err.message);
            expect.fail(err.message);
        }
    });

    it("POST courses query", function () {
        const query = {
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
        };

        try {
            return chai.request("localhost:4321")
                .post("/query")
                .send(query)
                .then((res: any) => {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result.length).to.be.equal(3127);
                })
                .catch((err: any) => {
                    Log.error(err.message);
                    expect.fail(err);
                });
        } catch (err) {
            Log.error(err.message);
            expect.fail(err);
        }
    });

    it("DELETE courses dataset", function () {
        try {
            return chai.request("localhost:4321")
                .del("/dataset/courses")
                .then((res: any) => {
                    // some logging here please!
                    expect(res.status).to.be.equal(204);
                })
                .catch((err) => {
                    Log.test(err.message);
                    expect.fail(err);
                });
        } catch (err) {
            Log.error(err.message);
            expect.fail(err);
        }
    });

    it("GET /datasets on empty insightFacade", function () {
        try {
            return chai.request("localhost:4321")
                .get("/datasets")
                .then((res: any) => {
                    // some logging here please!
                    expect(res.status).to.be.equal(200);
                    expect(res.body.result.length).to.be.equal(0);
                })
                .catch((err: any) => {
                    Log.error(err.message);
                    expect.fail(err);
                });
        } catch (err) {
            Log.error(err.message);
            expect.fail({err});
        }
    });

    // TODO: read your courses and rooms datasets here once!

    // Hint on how to test PUT requests
    /*
    it("PUT test for courses dataset", function () {
        try {
            return chai.request(URL)
                .put(YOUR_PUT_URL)
                .attach("body", YOUR_COURSES_DATASET, COURSES_ZIP_FILENAME)
                .then(function (res: Response) {
                    // some logging here please!
                    expect(res.status).to.be.equal(204);
                })
                .catch(function (err) {
                    // some logging here please!
                    expect.fail();
                });
        } catch (err) {
            // and some more logging here!
        }
    });
    */

    // The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
