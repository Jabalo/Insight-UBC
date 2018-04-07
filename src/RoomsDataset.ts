import * as http from "http";
import * as JSZip from "jszip";
import * as parse5 from "parse5";
import {IInsightFacade, InsightDataset, InsightDatasetKind,
    InsightDatasetWrapper, InsightResponse} from "./controller/IInsightFacade";
import Log from "./Util";

export interface IRoomsDataset {
    parseDataset(id: string, zipContents: JSZip, kind: InsightDatasetKind): Promise<InsightDatasetWrapper>;
}

export default class RoomsDataset implements IRoomsDataset {

    public async parseDataset(id: string, zipContents: JSZip, kind: InsightDatasetKind):
     Promise<InsightDatasetWrapper> {
        const zipKeys = Object.keys(zipContents.files);

        // If there isn't an index.htm, fail
        if (zipKeys.indexOf("index.htm") === -1) {
            return Promise.reject("failed"); // TODO: Surface these error messages at the top
        }

        const parsedIndex: any = parse5.parse(
            await zipContents.file("index.htm").async("text").catch(() =>
            Promise.reject("Failed")));

        const buildingsContainer = parsedIndex.childNodes[6].childNodes[3].childNodes[31].
        childNodes[10].childNodes[1].childNodes[3].childNodes[1].childNodes[5].childNodes[1];

        // Fail if the file has no buildings
        if (buildingsContainer.childNodes.length < 3) {
            return Promise.reject("failed");
        }

        const buildingsTable = buildingsContainer.childNodes[3].childNodes.filter((building: any) => {
            return building.nodeName === "tr";
        });

        const listOfBuildings = buildingsTable.map((building: any) => {
            return {
                name: building.childNodes[3].childNodes[0].value.trim(),
                path: building.childNodes[9].childNodes[1].attrs[0].value.trim().slice(2),
            };
        });

        return Promise.resolve({
            data: await this.parseDatasetBuildings(listOfBuildings, zipContents),
            details: {...{id}, ...{kind}, numRows: 0}, // We'll handle numRows later
        });
    }

    private async parseDatasetBuildings(listOfBuildings: any[], zipContents: JSZip): Promise<any[]> {
        const data: any[] = [];
        const buildingPromises: any[] = [];

        listOfBuildings.forEach((buildingDetails: any) => {
            buildingPromises.push(
                this.parseBuilding(buildingDetails.name, zipContents.file(buildingDetails.path))
                .catch(() => Promise.resolve({}))
                .then((buildingRooms) => {
                    if (buildingRooms.length > 0) {
                        buildingRooms.map((buildingRoom: any) => {
                            data.push(buildingRoom);
                        });
                    }
                }),
            );
        });

        return await Promise.all(buildingPromises)
        .catch(() => Promise.resolve({}))
        .then(() => Promise.resolve(data));
    }

    private async parseBuilding(buildingShort: string, file: JSZip.JSZipObject): Promise<any> {
        const instance = this;

        return file.async("text").then( async (fileData: any) => {
            const parsedFileData: any = parse5.parse(fileData);
            const sectionWrapper = parsedFileData.childNodes[6].childNodes[3].childNodes[31];

            // Special case fo UCLL - table is in different place in the dom
            const sectionContainer = sectionWrapper.childNodes[10].childNodes.length === 1 ?
            sectionWrapper.childNodes[12].childNodes[1].childNodes[3].childNodes[1]
            : sectionWrapper.childNodes[10].childNodes[1].childNodes[3].childNodes[1];

            const roomsContainer = sectionContainer.childNodes[5].childNodes[1];

            // Fail if the building has no rooms
            if (roomsContainer.childNodes.length < 2) {
                return Promise.reject("failed");
            }

            const roomsTable = roomsContainer.childNodes[3].childNodes[1].childNodes[3].childNodes
            .filter((room: any) => {
                return room.nodeName === "tr";
            });

            const buildingFull = sectionContainer.childNodes[3].childNodes[1]
                .childNodes[1].childNodes[1].childNodes[1].childNodes[0].childNodes[0].value.trim();

            const buildingAddr = sectionContainer.childNodes[3].childNodes[1]
                .childNodes[1].childNodes[1].childNodes[3].childNodes[0].childNodes[0].value.trim();

            let buildingGeo: any;

            buildingGeo = await instance.getGeo("http://skaha.cs.ubc.ca:11316/api/v1/team15/"
                + encodeURI(buildingAddr));

            const listOfRooms = roomsTable.map((roomRow: any) => {
                const roomNumber = roomRow.childNodes[1].childNodes[1].childNodes[0].value.trim();
                return {
                    fullname: buildingFull,
                    shortname: buildingShort,
                    number: roomNumber,
                    name: buildingShort + "_" + roomNumber,
                    address: buildingAddr,
                    lat: buildingGeo.error ? 0 : buildingGeo.lat,
                    lon: buildingGeo.error ? 0 : buildingGeo.lon,
                    seats: parseInt(roomRow.childNodes[3].childNodes[0].value.trim(), 10),
                    type: roomRow.childNodes[7].childNodes[0].value.trim(),
                    furniture: roomRow.childNodes[5].childNodes[0].value.trim(),
                    href: roomRow.childNodes[9].childNodes[1].attrs[0].value.trim(),
                };
            });
            return Promise.resolve([...listOfRooms]);
        });
    }

    private getGeo(url: string): Promise<any> {
        return new Promise((resolve, reject) => {
          const request = http.get(url, (response) => {
            const body: any[] = [];
            response.on("data", (chunk) => body.push(chunk));
            response.on("end", () => resolve(JSON.parse(body.join(""))));
          });
          request.on("end", (err) => reject(err));
          });
      }
}
