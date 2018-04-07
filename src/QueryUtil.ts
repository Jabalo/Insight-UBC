export default class QueryUtil {

    public static translate(s: string): string {
        let key = "";
        if (s === "dept") {
            key = "Subject";
        } else if (s === "instructor") {
            key = "Professor";
        } else if (s === "uuid") {
            key = "id";
        } else if (s === "id") {
            key = "Course";
        } else if (s === "avg" || s === "title" || s === "pass" || s === "fail" || s === "audit" || s === "year") {
            key = s.charAt(0).toUpperCase() + s.slice(1);
        } else {
            key = s;
        }
        return key;
    }

    public static validKey(query: any) {
        const valueSplit = Object.keys(query)[0];
        let value;
        if (valueSplit.indexOf("_") >= 0) {
            value = valueSplit.split("_")[1];
        } else {
            value = valueSplit;
        }
        const validKeys = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "audit", "uuid",
        "fullname", "shortname", "number", "name", "address", "lat", "lon", "seats", "type", "furniture", "href",
        "year"];
        if (validKeys.indexOf(value) !== -1) {
            return null;
        } else {
            return value;
        }
    }

    public static returnSelectedColumns(data: any, columns: any[], apply: any): any {
        const results: any = {};
        let id: any;
        columns.map((column: any) => {
            id = column.split("_")[0];
            if (column.indexOf("_") >= 0) {
                results[column] = data[this.translate(column.split("_")[1])];
            } else {
                const uniqueKey: any = Object.keys(apply[0])[0];
                const applyKeyKey: any = Object.keys(apply[0][uniqueKey])[0];
                const applyKey: any = apply[0][uniqueKey][applyKeyKey];
                results[column] = data[this.translate(applyKey.split("_")[1])];
            }
        });
        return results;
    }

    public static isString(order: any): any {
        const o = order.split("_")[1];
        const stringKeys = ["dept", "id", "instructor", "title", "name", "uuid", "fullname", "shortname", "number",
            "address", "type", "furniture", "href"];
        if (stringKeys.indexOf(o) >= 0 ) {
            return true;
        } else {
            return false;
        }
    }

    public static returnOrdered(items: any[], orderProp: any): any {
        if (QueryUtil.isString(orderProp)) {
            items.sort((a, b) => {
                const A = a[orderProp].toUpperCase();
                const B = b[orderProp].toUpperCase();
                if (A < B) {
                    return -1;
                }
                if (A > B) {
                    return 1;
                }
                return 0;
            });
        } else {
            items.sort((a, b) => {
                return a[orderProp] - b[orderProp];
            });
        }
        return items;
    }

    public static returnMultipleDown(items: any[], orderProp: any[]): any {
        items.sort((a, b) => {

            let A = a[orderProp[0]];
            let B = b[orderProp[0]];

            if (this.isString(orderProp[0])) {
                A = A.toUpperCase();
                B = B.toUpperCase();
            }
            if (A < B) {
                return 1;
            }
            if (A > B) {
                return -1;
            } else if (orderProp.length > 1) {
                let i = 1;
                for (i; i < orderProp.length; i++) {
                    if (a[orderProp[i]] < b[orderProp[i]]) {
                        return 1;
                    } else if (a[orderProp[i]] > b[orderProp[i]]) {
                        return -1;
                    }
                }
                return 0;
            }
        });
        return items;
    }

    public static returnMultipleUp(items: any[], orderProp: any[]): any {
        items.sort((a, b) => {

            let A = a[orderProp[0]];
            let B = b[orderProp[0]];

            if (this.isString(orderProp[0])) {
                A = A.toUpperCase();
                B = B.toUpperCase();
            }

            if (A < B) {
                return -1;
            }
            if (A > B) {
                return 1;
            } else {
                let i = 1;
                for (i; i < orderProp.length; i++) {
                    if (a[orderProp[i]] > b[orderProp[i]]) {
                        return 1;
                    } else if (a[orderProp[i]] < b[orderProp[i]]) {
                        return -1;
                    }
                }
                return 0;
            }
        });
        return items;
    }

    public static returnOrderedDeluxe(items: any[], order: any): any {
        const dir = order.dir;
        const keys = order.keys;

        if (dir === "DOWN") {
            return this.returnMultipleDown(items, keys);
        } else {
            return this.returnMultipleUp(items, keys);
        }
    }

    public static returnDuplicates(toCompare: any[]): any {
        const result = [];
        let k = 0;
        for (k; k < toCompare.length; k++) {
            if (toCompare[k] === null) {
                return null;
            }
        }
        let i = toCompare[0].length - 1;
        for (i; i > -1; i--) {
            let j = toCompare.length - 1;
            for (j; j > -1; j--) {
                if (toCompare[j].indexOf(toCompare[0][i]) === -1) {
                    break;
                }
            }

            if (j === -1) {
                result.push(toCompare[0][i]);
            }
        }
        return result;
    }

    public static addData(data: any, columns: any[], result: any[], apply: any) {
        result.push(columns.length > 0 ?
            QueryUtil.returnSelectedColumns(data, columns, apply)
            : data);
    }

    public static returnTransformation(query: any, group: any, apply: any): any {
        const grouped: any[] = [];
        const anotherGroupValues: any[] = [];
        const keysSeen: any[] = [];
        let i = 0;
        for (i; i < query.length; i++) {
            const groupValues: any[] = [];
            let j = 0;
            for (j; j < group.length; j++) {
                const current: any = query[i];
                const key: any = current[group[j]];
                const groupThing: any[] = [];
                groupValues.push(key);
                groupThing.push(key);
            }
            if (groupValues.length !== 0 && (!(this.isDuplicateList(groupValues, anotherGroupValues)))) {
                anotherGroupValues.push(groupValues);
            }
        }

        let k = 0;
        for (k; k < anotherGroupValues.length; k++) {
            const valuesGroup: any[] = [];
            let l = 0;
            for (l; l < query.length; l++) {
                if (this.hasValues(query[l], group, anotherGroupValues[k])) {
                    valuesGroup.push(query[l]);
                }
            }
            grouped.push(valuesGroup);
        }
        return this.performApply(query, grouped, apply);
    }

    public static hasValues(query: any, keys: any, values: any) {
        let i = 0;
        for (i; i < keys.length; i++) {
            if (values.indexOf(query[keys[i]]) < 0) {
                return false;
            }
        }
        return true;
    }

    public static isDuplicateList(values: any, group: any) {
        if (group.length === 0) {
            return false;
        }
        let j = 0;
        for (j; j < group.length; j++) {
            if (this.duplicateItem(values, group[j])) {
                return true;
            }
        }
        return false;
    }

    public static duplicateItem(value: any, group: any) {
        let i = 0;
        for (i; i < group.length; i++) {
            if (group[i] !== value[i]) {
                return false;
            }
        }
        return true;
    }

    public static performApply(query: any, grouped: any, apply: any): any {
        let result =  grouped;
        if (apply.length > 0) {
            let i = 0;
            for (i; i < apply.length; i++) {
                const applyKey: any = Object.keys(apply[i])[0];
                const applyFilter: any = Object.keys(apply[i][applyKey])[0];
                const applyValue: any = apply[i][applyKey][applyFilter];

                if (applyFilter === "MAX" || applyFilter === "MIN") {
                    if (i > 0) {
                        result = this.performMINMAXMultiple(applyFilter, result, grouped, apply[i], applyValue);
                    } else {
                        result = this.performMINMAX(applyFilter, grouped, apply[i], applyValue);
                    }
                } else if (applyFilter === "AVG" || applyFilter === "SUM") {
                    if (i > 0) {
                        result = this.performSUMAVGMultiple(applyFilter, result, grouped, apply[i], applyValue);
                    } else {
                        result = this.performSUMAVG(applyFilter, grouped, apply[i], applyValue);
                    }
                } else if (applyFilter === "COUNT") {
                    if (i > 0) {
                        result = this.performCOUNTMultiple(result, grouped, apply[i], applyValue);
                    } else {
                        result = this.performCOUNT(result, apply[i], applyValue);
                    }
                } else {
                    result = null;
                }
            }
            return result;
        } else {
            const emptyList = [];
            let i = 0;
            for (i; i < grouped.length; i++) {
                let j = 0;
                for (j; j < grouped[i].length; j++) {
                    const keys = Object.keys(grouped[0][0]);
                    if (!(this.isDuplicateObject(emptyList, grouped[i][j], keys))) {
                        emptyList.push(grouped[i][j]);
                    }
                }
            }
            return emptyList;
        }
    }

    public static isDuplicateObject(list: any, grouped: any, keys: any) {
        let i = 0;
        if (list.length === 0) {
            return false;
        }
        for (i; i < list.length; i++) {
            if (this.duplicateObject(list[i], grouped, keys)) {
                return true;
            }
        }
        return false;
    }

    public static duplicateObject(a: any, b: any, keys: any) {
        let i = 0;
        for (i; i < keys.length; i++) {
            if (a[keys[i]] !== b[keys[i]]) {
                return false;
            }
        }
        return true;
    }

    // TODO: There can be formated later, only two lines have changed.
    public static performMINMAXMultiple(m: any, query: any, grouped: any, apply: any, applyValue: any) {
        const result: any[] = [];
        let i = 0;
        for (i; i < query.length; i++) {
            const index: any = query[i];
            let j = 0;
            if (!(this.isString(applyValue))) {
                const uniqueKey: any = Object.keys(apply)[0];
                let max: any = query[i][uniqueKey];
                let min: any = query[i][uniqueKey];
                for (j; j < grouped[i].length; j++) {
                    const compare = grouped[i][j][uniqueKey];
                    if (m === "MAX") {
                        if (compare > max) {
                            max = compare;
                        }
                        index[uniqueKey] = max;
                    } else {
                        if (compare < max) {
                            min = compare;
                        }
                        index[uniqueKey] = min;
                    }
                }
            } else {
                return null;
            }
            result.push(index);
        }
        return result;
    }

    public static performMINMAX(m: any, grouped: any, apply: any, applyValue: any) {
        const result: any[] = [];
        let i = 0;
        for (i; i < grouped.length; i++) {
            let index: any = grouped[i][0];
            let j = 1;
            if (!(this.isString(applyValue))) {
                const uniqueKey: any = Object.keys(apply)[0];
                let max: any = grouped[i][0][uniqueKey];
                for (j; j < grouped[i].length - 1; j++) {
                    const compare = grouped[i][j][uniqueKey];
                    if (m === "MAX") {
                        if (compare > max) {
                            max = compare;
                            index = grouped[i][j];
                        }
                    } else {
                        if (compare < max) {
                            max = compare;
                            index = grouped[i][j];
                        }
                    }
                }
            } else {
                return null;
            }
            result.push(index);
        }
        return result;
    }

    // TODO: There can be formated later, only two lines have changed.
    public static performCOUNTMultiple(query: any, grouped: any, apply: any, applyValue: any) {
        const result: any[] = [];

        let i = 0;
        const uniqueKey: any = Object.keys(apply)[0];
        for (i; i < query.length; i++) {
            const track: any[] = [];
            let count = 0;
            let j = 0;
            for (j; j < grouped[i].length; j++) {
                if (track.indexOf(grouped[i][j][uniqueKey]) < 0) {
                    count += 1;
                    track.push(grouped[i][j][uniqueKey]);
                }
            }
            const newThing = query[i];
            newThing[uniqueKey] = count;
            result.push(newThing);
        }
        return result;
    }

    public static performCOUNT(grouped: any, apply: any, applyValue: any) {
        const result: any[] = [];

        let i = 0;
        const uniqueKey: any = Object.keys(apply)[0];
        for (i; i < grouped.length; i++) {
            const track: any[] = [];
            let count = 0;
            let j = 0;
            for (j; j < grouped[i].length; j++) {
                if (track.indexOf(grouped[i][j][uniqueKey]) < 0) {
                    count += 1;
                    track.push(grouped[i][j][uniqueKey]);
                }
            }
            const newThing = grouped[i][0];
            newThing[uniqueKey] = count;
            result.push(newThing);
        }
        return result;
    }

    public static moreThanOneDataset(col: any, apply: any): any {
        let i = 0;
        const datasets = [];
        for (i; i < col.length; i++) {
            if (col[i].indexOf("_") > -1) {
                datasets.push(col[i].split("_")[0]);
            }
        }
        if (apply) {
            if (apply.length > 0) {
                const applyKey = Object.keys(apply[0])[0];
                const applyData = Object.keys(apply[0][applyKey])[0];
                const applyThing = apply[0][applyKey][applyData];

                datasets.push(applyThing.split("_")[0]);
            }
        }

        let j = 0;
        for (j; j < datasets.length; j++) {
            let k = 0;
            for (k; k < datasets.length; k++) {
                if (datasets[j] !== datasets[k]) {
                return true;
                }
            }
        }
        return false;
    }
    // TODO: There can be formated later, only two lines have changed.
    public static performSUMAVGMultiple(m: any, query: any, grouped: any, apply: any, applyValue: any) {
        const Decimal = require("decimal.js");
        if (!(QueryUtil.isString(applyValue))) {
            const result: any[] = [];
            let i = 0;
            const uniqueKey: any = Object.keys(apply)[0];
            for (i; i < query.length; i++) {
                let sum = new Decimal(0);
                let j = 0;
                for (j; j < grouped[i].length; j++) {
                    sum = sum.plus(new Decimal(grouped[i][j][uniqueKey]));
                }
                const newThing = query[i];
                if (m === "SUM") {
                    const decimal = Number(sum.toFixed(2));
                    newThing[uniqueKey] = decimal;
                } else {
                    const avg = sum.toNumber() / grouped[i].length;
                    const decimal = Number(avg.toFixed(2));
                    newThing[uniqueKey] = decimal;
                }
                result.push(newThing);
            }
            return result;
        } else {
            return null;
        }
    }

    public static performSUMAVG(m: any, grouped: any, apply: any, applyValue: any) {
        const Decimal = require("decimal.js");
        if (!(QueryUtil.isString(applyValue))) {
            const result: any[] = [];
            let i = 0;
            const uniqueKey: any = Object.keys(apply)[0];
            for (i; i < grouped.length; i++) {
                let sum = new Decimal(0);
                let j = 0;
                for (j; j < grouped[i].length; j++) {
                    sum = sum.plus(new Decimal(grouped[i][j][uniqueKey]));
                }
                const newThing = grouped[i][0];
                if (m === "SUM") {
                    const decimal = Number(sum.toFixed(2));
                    newThing[uniqueKey] = decimal;
                } else {
                    const avg = sum.toNumber() / grouped[i].length;
                    const decimal = Number(avg.toFixed(2));
                    newThing[uniqueKey] = decimal;
                }
                result.push(newThing);
            }
            return result;
        } else {
            return null;
        }
    }
}
