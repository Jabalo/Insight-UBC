import * as fs from "fs";
import * as JSZip from "jszip";
import CoursesDataset, {ICoursesDataset} from "../CoursesDataset";
import QueryUtil from "../QueryUtil";
import RoomsDataset, {IRoomsDataset} from "../RoomsDataset";
import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind,
    InsightDatasetWrapper, InsightResponse} from "./IInsightFacade";

/**
 * This is the main programmatic entry point for the project.
 */

export default class InsightFacade implements IInsightFacade {

    private insightDatasets: any = {}; // better typing

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        try {
            this.insightDatasets = JSON.parse(fs.readFileSync("src/controller/datasets.cache", "utf8"));
        } catch (e) {
            this.insightDatasets = {};
        }
    }

    public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<InsightResponse> {
        const instance = this;
        const jsZip = new JSZip();
        const jsZipPromises: any[] = [];
        if (instance.insightDatasets[id]) {
            return Promise.reject({code: 400, body: {error: "Dataset has already been loaded"}});
        }

        const jsZipPromise = await jsZip.loadAsync(content, {base64: true}).catch(() => {
            return Promise.reject({code: 400, body: {error: "Dataset zip file failed to be loaded"}});
        });
        jsZipPromises.push(jsZipPromise);
        let parsePromise;

        switch (kind) {
            case InsightDatasetKind.Courses:
                parsePromise = await new CoursesDataset().parseDataset(id, jsZipPromise, kind).catch(() => {
                    return Promise.reject({code: 400, body: {error: "Courses Dataset failed to be parsed"}});
                });
                break;

            case InsightDatasetKind.Rooms:
                parsePromise = await new RoomsDataset().parseDataset(id, jsZipPromise, kind).catch(() => {
                    return Promise.reject({code: 400, body: {error: "Rooms Dataset failed to be parsed"}});
                });
                break;

            default:
                return Promise.reject({code: 400, body: {error: "Dataset has invalid Kind"}});
        }
        jsZipPromises.push(parsePromise);
        jsZipPromises.push(await this.handleDatasetParse(id, parsePromise).catch(() => {
            return Promise.reject({code: 400, body: {error: "Dataset zip file failed to be loaded"}});
        }));

        return Promise.all(jsZipPromises)
        .catch(() =>  Promise.reject({code: 400, body: {error: "Dataset zip file failed to be loaded"}}))
        .then(() => Promise.resolve({code: 204, body: {result: "Dataset successfully added"}}));
    }

    public removeDataset(id: string): Promise<InsightResponse> {
        const instance = this;
        if (instance.insightDatasets[id]) {
            delete instance.insightDatasets[id];
            return instance.writeAsyncFile("src/controller/datasets.cache", JSON.stringify(instance.insightDatasets))
            .catch((err) => Promise.reject({code: 400, body: {error: "Dataset cache failed to update"}}))
            .then(() => Promise.resolve({code: 204, body: {result: "Dataset successfully removed"}}));
        } else {
            return Promise.reject({code: 404, body: {error: "Dataset not removed - not found in instance"}});
       }
    }

    public listDatasets(): Promise<InsightResponse> {
        const instance = this;
        const datasets: InsightDataset[] = [];
        Object.keys(instance.insightDatasets).forEach((key) => {
            datasets.push(instance.insightDatasets[key].details);
        });

        return Promise.resolve({code: 200, body: {result: datasets}});
    }

    public performQuery(query: any): Promise<InsightResponse> {
        const instance = this;
        let queryResult = [];

        if (Object.keys(instance.insightDatasets).length < 1) {
            return Promise.reject({code: 400, body: {error: "No stored datasets"}});
        }

        // Check to make sure query form is valid
        if (!query.WHERE || !query.OPTIONS) {
            return Promise.reject({code: 400, body: {error: "Query format is wrong"}});
        }

        if (Object.keys(query.OPTIONS.COLUMNS).length === 0) {
            return Promise.reject({code: 400, body: {error: "Columns cannot be empty"}});
        }

        if (query.OPTIONS.ORDER && !query.OPTIONS.ORDER.dir && !(query.OPTIONS.COLUMNS.includes(query.OPTIONS.ORDER))) {
            return Promise.reject({code: 400, body: {error: "Order key needs to be included in columns"}});
        }

        // Checks to see if query is asking for a dataset that exists
        const datasetId = query.OPTIONS.COLUMNS[0].split("_")[0];
        if (!(datasetId && instance.insightDatasets[datasetId])) {
            return Promise.reject({code: 400, body: {error: "Queried dataset doesn't exist"}});
        }

        // Checks to see if more than one dataset is being accessed
        if (QueryUtil.moreThanOneDataset(query.OPTIONS.COLUMNS,
            query.TRANSFORMATIONS ? query.TRANSFORMATIONS.APPLY : null)) {
            return Promise.reject({code: 400, body: {error: "Query is trying to query two datasets at the same time"}});
        }

        // Execute query
        const isWhereEmpty = Object.keys(query.WHERE).length === 0;
        if (query.TRANSFORMATIONS) {
            queryResult = instance.performFilter(isWhereEmpty ? "ALL" : Object.keys(query.WHERE)[0],
                query.WHERE, query.OPTIONS.COLUMNS, query.TRANSFORMATIONS.APPLY);
        } else {
            queryResult = instance.performFilter(isWhereEmpty ? "ALL" : Object.keys(query.WHERE)[0],
                query.WHERE, query.OPTIONS.COLUMNS, null);
        }

        // Review query response
        if (queryResult === null) {
            return Promise.reject({code: 400, body: {error: "Query format is wrong"}});
        }
        if (queryResult === "is_error") {
            return Promise.reject({code: 400, body: {error: "Invalid query: IS value should be a string"}});
        }
        if (queryResult.indexOf("NOTNUMBER") >= 0) {
            const key = queryResult.split("_")[1];
            const message = "Invalid query:" + key + "value should be a number";
            return Promise.reject({code: 400, body: {error: message}});
        }
        if (queryResult === "TOOMANY") {
            return Promise.reject({code: 400, body: {error: "Query contains too many parameters"}});
        }
        if (queryResult.indexOf("INVALIDKEY") >= 0) {
            const key = queryResult.split("_")[1];
            const message = key + "is not a valid key";
            return Promise.reject({code: 400, body: {error: message}});
        }
        if (queryResult.indexOf("WHYEMPTY") >= 0) {
            const key = queryResult.split("_")[1];
            const message = "Invalid query:" + key + "should contain at least one condition";
            return Promise.reject({code: 400, body: {error: message}});
        }

        // Order results if needed
        if (query.OPTIONS.ORDER) {
            if (query.OPTIONS.ORDER.dir && query.OPTIONS.ORDER.keys) {
                queryResult = QueryUtil.returnOrderedDeluxe(queryResult, query.OPTIONS.ORDER);
            } else {
                queryResult = QueryUtil.returnOrdered(queryResult, query.OPTIONS.ORDER);
            }
        }

        // Group the results
        if (query.TRANSFORMATIONS) {
            const transformation: any = query.TRANSFORMATIONS.GROUP;
            const apply: any = query.TRANSFORMATIONS.APPLY;
            const applyKeys: any = [];

            let j = 0;
            for (j; j < apply.length; j++) {
                applyKeys.push(Object.keys(apply[j])[0]);
            }

            const columns: any = query.OPTIONS.COLUMNS;
            let i = 0;
            for (i; i < columns.length; i++) {
                const A = transformation.indexOf(columns[i]);
                const B = applyKeys.indexOf(columns[i]);
                if ((A < 0) && (B < 0)) {
                    return Promise.reject({code: 400, body:
                            {error: "All COLUMNS keys need to be either in GROUP or in APPLY"}});
                }
            }

            queryResult = QueryUtil.returnTransformation(queryResult, transformation, apply);

        }

        if (queryResult === null) {
            return Promise.reject({code: 400, body: {error: ""}});
        }

        return Promise.resolve({code: 200, body: {result: queryResult}});
    }

    private performFilter(filter: any, query: any, columns: any, apply: any): any {
        const instance = this;

        switch (filter) {
            case "ALL":
                const dataset = instance.insightDatasets[columns[0].split("_")[0]].data;
                const result: any[] = [];
                for (let i = 0, len = dataset.length; i < len; i++) {
                    QueryUtil.addData(dataset[i], columns, result, apply);
                }
                return result;
            case "AND":
            case "OR":
                return instance.performLogicComp(filter, query[filter], columns, apply);
            case "LT":
            case "EQ":
            case "GT":
                const isValid1 = QueryUtil.validKey(query[filter]);
                if (query[filter].length > 1) {
                    return "TOOMANY";
                }
                if (isValid1 === null) {
                    return instance.performMComp(filter, query[filter], columns, apply);
                } else {
                    return "INVALIDKEY_" + isValid1;
                }
            case "IS":
                const isValid2 = QueryUtil.validKey(query[filter]);
                if (query[filter].length > 1) {
                    return "TOOMANY";
                }
                if (isValid2 === null) {
                    return instance.performSComp(filter, query[filter], columns, apply);
                } else {
                    return "INVALIDKEY_" + isValid2;
                }
            case "NOT":
                if (query[filter].length > 1) {
                    return "TOOMANY";
                } else {
                    return instance.performNOT(filter, query[filter], columns, apply);
                }
            default:
                return null;
        }
    }

    private performLogicComp(logic: any, query: any, columns: any, apply: any): any { // private, typing
        const instance = this;
        let andResult: any = [];
        let logicResult: any = [];
        let check = "";
        let nullCheck = "";
        if (query.length < 1) {
            return "WHYEMPTY_" + logic;
        }
        if (logic === "AND") {
            query.map((q: any) => {
                const result = instance.performFilter(Object.keys(q)[0], q, [], apply);
                if (result === null) {
                    nullCheck = null;
                }
                if (result !== null && result.indexOf("TOOMANY") >= 0) {
                    check = "TOOMANY";
                }
                andResult.push(result);
            });
            if (andResult.length > 0) {
                andResult = QueryUtil.returnDuplicates(andResult);
                if (andResult === null) {
                    nullCheck = null;
                } else {
                    andResult.map((result: any) => {
                        logicResult.push(QueryUtil.returnSelectedColumns(result, columns, apply));
                    });
                }
            }
        } else if (logic === "OR") {
            query.map((q: any) => {
                const result = instance.performFilter(Object.keys(q)[0], q, columns, apply);
                if (result === null) {
                    nullCheck = null;
                }
                if (result !== null && result.indexOf("TOOMANY") >= 0) {
                    check = "TOOMANY";
                } else {
                    Array.prototype.push.apply(logicResult, result);
                }
            });
        } else {
            logicResult = null;
        }
        if (nullCheck === null) {
            return null;
        }
        if (check === "TOOMANY") {
            return check;
        } else {
            return logicResult;
        }
    }

    private performMComp(m: any, query: any, columns: any, apply: any): any { // TODO: typing
        // TODO move this planning to performFilter
        const instance = this;
        const mResult: any = [];
        const keySplit: string = Object.keys(query)[0];
        const key: string = keySplit.split("_")[1];
        if (!key) {
            return null;
        }
        const dKey = QueryUtil.translate(key);
        const id = keySplit.split("_")[0];
        const dataset = this.insightDatasets[id].data;
        const value = query[keySplit];
        if (!(typeof value === "number")) {
            return "NOTNUMBER_" + m;
        }
        if (m === "GT") {
            for (let i = 0, len = dataset.length; i < len; i++) {
                if (dataset[i][dKey] > value) {
                    QueryUtil.addData(dataset[i], columns, mResult, apply);
                }
            }
        } else if (m === "LT") {
            for (let i = 0, len = dataset.length; i < len; i++) {
                if (dataset[i][dKey] < value) {
                    QueryUtil.addData(dataset[i], columns, mResult, apply);
                }
            }
        } else if (m === "EQ") {
            for (let i = 0, len = dataset.length; i < len; i++) {
                if (dataset[i][dKey] === value) {
                    QueryUtil.addData(dataset[i], columns, mResult, apply);
                }
            }
        }

        return mResult;
    }

    private performSComp(s: any, query: any, columns: any, apply: any): any { // private, typing
        const instance = this;
        const sResult: any = [];
        const keySplit: string = Object.keys(query)[0];
        const key: string = keySplit.split("_")[1];
        if (!key) {
            return null;
        }
        const dKey = QueryUtil.translate(key);
        const id = keySplit.split("_")[0];
        const dataset = this.insightDatasets[id].data;
        const value = query[keySplit];
        let nullCheck = "";

        if (!(typeof value === "string")) {
            return "is_error";
        }

        const wildcardCount = value.replace(/[^*]/g, "").length;
        const hasWildcard = wildcardCount > 0;

        if (hasWildcard) {
            // One WildCard
            if (wildcardCount === 1) {
                const wildcardPos = value.indexOf("*");
                let reValue;
                switch (wildcardPos) {
                    // Wildcard at beginning
                    case 0:
                        reValue = new RegExp("^.*" + value.split("*")[1] + "$");
                        break;
                    // Wildcard  at the end
                    case value.length - 1:
                        reValue = new RegExp("^" + value.split("*")[0] + ".*$");
                        break;
                    // Fail if wildcard in the middle
                    default:
                        return null;
                }
                for (let i = 0, len = dataset.length; i < len; i++) {
                    const dValue = dataset[i][dKey];
                    if (reValue.test(dValue)) {
                        QueryUtil.addData(dataset[i], columns, sResult, apply);
                    }
                }

                // Two WildCard
                // Wildcard at beginning and end
            } else if (wildcardCount === 2) {
                const firstWildcardPos = value.indexOf("*");
                const lastWildcardPos = value.lastIndexOf("*");

                // Ensure the two wildcards are at the beginning and end of value
                if (firstWildcardPos === 0 && lastWildcardPos === value.length - 1) {
                    const valueTrimmed = value.slice(1, value.length - 1);
                    const reValue = new RegExp("^.*(" + valueTrimmed + ").*$");

                    for (let i = 0, len = dataset.length; i < len; i++) {
                        const dValue = dataset[i][dKey];
                        if (reValue.test(dValue)) {
                            QueryUtil.addData(dataset[i], columns, sResult, apply);
                        }
                    }
                } else {
                    return null;
                }
            } else {
                nullCheck = null;
                return null;
            }
            // it does not have * at all
        } else {
            for (let i = 0, len = dataset.length; i < len; i++) {
                const dValue = dataset[i][dKey];
                if (dValue === value) {
                    QueryUtil.addData(dataset[i], columns, sResult, apply);
                }
            }
        }

        if (nullCheck === null) {
            return null;
        } else {
            return sResult;
        }
    }

    private performNOT(s: any, query: any, columns: any, apply: any): any { // private, typing
        const instance = this;
        const filter = Object.keys(query)[0];
        const filter1 = Object.keys(query[Object.keys(query)[0]])[0];
        let notResult: any = [];
        if (filter === "NOT") {
            notResult = instance.performFilter(filter1, query.NOT, columns, apply);
        } else {
            const inverseResult = instance.performFilter(filter, query, [], apply);
            const id = Object.keys(query[Object.keys(query)[0]])[0].split("_")[0];
            const dataset = this.insightDatasets[id].data;
            let i = 0;
            for (i; i < dataset.length; i++) {
                const item = dataset[i];
                if (!(inverseResult.includes(item))) {
                    QueryUtil.addData(dataset[i], columns, notResult, apply);
                }
            }
        }
        return notResult;
    }

    private async handleDatasetParse(id: string, dataset: InsightDatasetWrapper): Promise<InsightResponse> {
        const instance = this;

        dataset.details.numRows = dataset.data.length; // Properly set NumRows
        if (dataset.details.numRows === 0) {
            return Promise.reject({code: 400, body: {error: "Dataset zip file failed to be loaded"}});
        }
        instance.insightDatasets[id] = dataset;

        return instance.writeAsyncFile("src/controller/datasets.cache", JSON.stringify(instance.insightDatasets))
        .catch((err) => Promise.reject({code: 400, body: {error: "Dataset zip file failed to be loaded"}}))
        .then(() => Promise.resolve({code: 200, body: {result: "Dataset handled"}}));

    }

    private writeAsyncFile(destination: string, content: string): Promise<any> {
        const instance = this;

        return new Promise((resolve, reject) => {
            fs.writeFile(destination, content, (err) => {
                if (err) {
                    return reject(err);
                } else {
                    return resolve();
                }
            });
        });
    }
}
