import * as JSZip from "jszip";
import {IInsightFacade, InsightDataset, InsightDatasetKind,
    InsightDatasetWrapper, InsightResponse} from "./controller/IInsightFacade";
import Log from "./Util";

export interface ICoursesDataset {
    parseDataset(id: string, zipContents: JSZip, kind: InsightDatasetKind): Promise<InsightDatasetWrapper>;
}

export default class CoursesDataset implements ICoursesDataset {

    public async parseDataset(id: string, zipContents: JSZip, kind: InsightDatasetKind):
     Promise<InsightDatasetWrapper> {
        const zipKeys = Object.keys(zipContents.files);

        // If the the first folder isn't named "courses" the zip, reject
        if (zipKeys[0] !== "courses/") {
            return Promise.reject("failed"); // TODO: Surface these error messages at the top
        }

        return Promise.resolve({
            data: await this.parseDatasetData(zipContents),
            details: {...{id}, ...{kind}, numRows: 0}, // We'll handle numRows in this.handleParse
        });
    }

    private async parseDatasetData(zipContents: JSZip): Promise<[any]> {
        const data: any = [];
        const rowPromises: any = []; // TODO: better typing
        zipContents.forEach((relativePath: any, file: any) => {
            const rowPromise = this.parseRows(relativePath, file)
            .then((dataRows) => {
                if (dataRows.length > 0) {
                    dataRows.map((dataRow: any) => {
                        data.push(dataRow);
                    });
                }
            });
            rowPromises.push(rowPromise);
        });

        return await Promise.all(rowPromises)
        .catch(() => {
            return Promise.resolve({});
        }).then(() => {
            return Promise.resolve(data);
        });
    }

    private async parseRows(relativePath: string, file: JSZip.JSZipObject): Promise<any> {
        const dataRows: any = [];

        return file.async("text").then((fileData: any) => {
            // Makes the key the name of the file
            const re = new RegExp("\/([A-Z])", "g");
            const fileNames = relativePath.split(re);
            const fileName = fileNames[1] + fileNames[2];
            if (fileName) {
                // If a valid file name exists (e.g. not a folder), then added it
                const data = JSON.parse(fileData);
                const result = data.result ? data.result : null;
                if (data.result) { // TODO: two loops here: can optimize?
                    data.result.map((row: any) => {
                        row["id"] = row.id.toString();
                        row["rank"] = data.rank; // TODO: how do we know rank exists?
                        // Transform year property
                        if (row["Section"] === "overall") {
                            row["Year"] = 1900;
                        } else {
                            row["Year"] = parseInt(row["Year"], 10);
                        }
                        dataRows.push(row);
                    });
                }
                return Promise.resolve(dataRows);
            } else {
                return Promise.resolve(dataRows); // TODO: Better handling?
            }
        });
    }
}
