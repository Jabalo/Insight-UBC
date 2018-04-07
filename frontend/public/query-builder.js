/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */

// READ HERE!
// THINGS MISSING:
// - Empty where case.
// - tab-panel active to find course/room for custom. *****

CampusExplorer.buildQuery = function() {
    let query = {};

    let form = document.getElementsByClassName("tab-panel active")[0].childNodes[0].nextSibling;

    let where = query["WHERE"] = CampusExplorer.getConditions(form);
    if (where === null) {
        query["WHERE"] = {};
    }
    query["OPTIONS"] = CampusExplorer.getOptions(form);
    if (CampusExplorer.getTransformation(form) !== null) {
        query["TRANSFORMATIONS"] = CampusExplorer.getTransformation(form);
    }

    return query;
};

CampusExplorer.getConditions = function(form) {
    let datatype = form.getAttribute("data-type");
    let condition_list = [];
    let condition;
    let none = false;

    let condition_all = form[0];
    let condition_any = form[1];
    let condition_none = form[2];

    //AND - All of the following.
    if (condition_all.checked) {
        condition = "AND";
    }
    //OR  - Any of the following.
    else if (condition_any.checked) {
        condition = "OR";
    }
    //NOT(OR) - None of the following.
    else if (condition_none.checked) {
        condition = "OR";
        none = true;
    }

    // Gets all added conditions.
    let all_conditions = form.getElementsByClassName("condition");
    if (all_conditions.length === 0) {
        return null;
    }

    // Iterate through all conditions.
    for (let i = 0; i < all_conditions.length; i++) {

        // For each condition.
        // Each condition should have 11 child nodes (HTML elements).
        let children = all_conditions[i].childNodes;

        // Gets key type.
        let key_select = children[3].childNodes[1];
        let key_selected = key_select.options[key_select.selectedIndex].value;

        // Gets the filter type.
        let filter_select = children[5].childNodes[1];
        let filter_selected = filter_select.options[filter_select.selectedIndex].value;

        // Gets value.
        let value = children[7].childNodes[1].value;

        // Check if selected key is an integer.
        if (CampusExplorer.isInt(key_selected)) {
            value = (value) * 1;
        }

        // Creates {courses_dept: "cpsc"}.
        let key_withtag = CampusExplorer.addTag(key_selected, datatype);
        let key_value = {};
        key_value[key_withtag] = value;

        // Adds filter to object, {IS: {courses_dept: "cpsc"}}.
        let object = {};
        object[filter_selected] = key_value;


        // If "NOT" box is checked off, add "NOT" to object. {"NOT": {{IS: {courses_dept: "cpsc"}}).
        let not_object = {};
        let not_element = form.getElementsByClassName("control not")[i];
        if (not_element.getElementsByTagName("input")[0].checked) {
            not_object["NOT"] = object;
            object = not_object;
        }

        // If more than one condition, push into a list and loop again.
        if (all_conditions.length > 1) {
            condition_list.push(object);
        }
        // Otherwise, if just one element, can just return that object.
        else {
            // If "None of the following" was selected, add "NOT" to object.
            if (none) {
                let none_object = {};
                none_object["NOT"] = object;
                object = none_object;
            }
            return object;
        }
    }

    // If there was more than one object, should come here.
    let multiple_object = {};
    multiple_object[condition] = condition_list;

    // If "None of the following" was selected, add "NOT" to object.
    if (none) {
        let none_object = {};
        none_object["NOT"] = multiple_object;
        multiple_object = none_object;
    }

    return multiple_object;
};



CampusExplorer.getOptions = function(form) {
    let datatype = form.getAttribute("data-type");
    let options = {};
    let columns = [];
    let orders = {};
    let orders_list = [];

    // COLUMNS
    // Gets all checked elements, push into list.
        let c = form.getElementsByClassName("form-group columns")[0];
        let c_input = c.getElementsByTagName("input");
        for (let i = 0; i < c_input.length; i++) {
            if (c_input[i].checked) {
                let tag = CampusExplorer.addTag(c_input[i].value, datatype);
                if (tag === "") {
                    columns.push(c_input[i].value);
                }
                else {
                    columns.push(tag);
                }
            }
        }

    // Add "COLUMNS" object to OPTIONS.
    options["COLUMNS"] = columns;


    // ORDER
    // Gets all selected elements, push into list.
        let o = form.getElementsByClassName("form-group order")[0];
        let o_option = o.getElementsByTagName("option");

        for (let h = 0; h < o_option.length; h++) {
            if (o_option[h].selected) {
                let value = o_option[h].value;
                orders_list.push(CampusExplorer.addTag(value, datatype));
            }
        }

    // Checked if "descended" box ic checked, put "dir" object into ORDER.
    let desc = form.getElementsByClassName("control descending")[0];
        let desc_input = desc.getElementsByTagName("input")[0];
    if (desc_input.checked) {
        orders["dir"] = "DOWN";
    }
    else {
        orders["dir"] = "UP";
    }

    // Puts "keys" object into ORDER.
    orders["keys"] = orders_list;

    // If orders_list if empty (no order selected), don't put ORDER object.
    if (orders_list.length !== 0) {
        options["ORDER"] = orders;
    }

    return options;
};


CampusExplorer.getTransformation = function(form) {
    let datatype = form.getAttribute("data-type");
    let transformation = {};
    let group = [];
    let apply = [];

    // GROUPS
    // Gets all checked elements, push into list.
        let g = form.getElementsByClassName("form-group groups")[0];
        let g_input = g.getElementsByTagName("input");
        for (let i = 0; i < g_input.length; i++) {
            if (g_input[i].checked) {
                group.push(CampusExplorer.addTag(g_input[i].value, datatype));
            }
        }

        // Add "GROUP" object to TRANSFORMATIONS.
        transformation["GROUP"] = group;

        // APPLY
        // If APPLY input exists, make APPLY object.
        let thing1 = form.getElementsByClassName("form-group transformations")[0];
        let thing = thing1.getElementsByClassName("transformation");
        for (let h = 0; h < thing.length; h++) {
            let container = {};
            let container1 = {};
            let multiple = thing[h];
            try {
                let term = multiple.getElementsByTagName("input")[0].value;
            }
            catch (err) {
                continue;
            }

            let filter = multiple.getElementsByTagName("select")[0];
            let filter_selected = filter.options[filter.selectedIndex].value;
            let key = multiple.getElementsByTagName("select")[1];
            let key_selected = key.options[key.selectedIndex].value;

            let term = multiple.getElementsByTagName("input")[0].value;
            container[filter_selected] = CampusExplorer.addTag(key_selected, datatype);
            container1[term] = container;

            apply.push(container1);

        }


        // Adds APPLY object to TRANSFORMATION.
        transformation["APPLY"] = apply;

    // If APPLY or GROUP is empty, no TRANSFORMATION object, so return null.
    if (apply.length === 0 || group.length === 0) {
        return null;
    }
    else {
        return transformation;
    }
};

// Checks if int key in kind of an inefficient way.
CampusExplorer.isInt = function(value) {
    let list = ["lat", "lon", "seats", "avg", "pass", "fail", "audit", "year"];
    return list.includes(value);
};

CampusExplorer.addTag = function(key, datatype) {
    let list = ["dept", "id", "avg", "instructor", "title", "pass", "fail", "year", "audit", "uuid", "year",
    "fullname", "shortname", "number", "name", "address", "lat", "lon", "seats", "type", "furniture", "href"];

    if (list.includes(key)) {
        return datatype + "_" + key;
    }
    else {
        return key;
    }
}
