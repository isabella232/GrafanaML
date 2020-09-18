import { SelectableValue } from '@grafana/data';


/* Type info for run filters */


export interface IFilter {
    displayString: string;
    filterProps: IFilterProps[];
}

export interface IFilterProps {
    field: string;
    operator: string;
    values: any[];
}

export interface IPropertyDetails {
    options: SelectableValue[],
    type: PropertyType,
    queryPath: string,
    allowedValues?: SelectableValue[]
}

export enum PropertyType {
    number,
    date,
    string,
    tag
}

export enum RunProperties {
    number = "Run number",
    targetName = "Target name",
    runType = "Run type",
    status = "Status",
    createdDate = "Created time",
    tags = "Tags",
    createdBy = "Created by"
}

export enum FilterOperations {
    equals = "eq",
    lessThan = "lt",
    notEqual = "ne",
    greaterThan = "gt",
    lessOrEqual = 'le',
    greaterOrEqual = "ge"
}

/**
 * Common filter operators used for numerical fields
 */
export const numericOperations: SelectableValue[] = [
    {
        label: "==",
        value: FilterOperations.equals
    },
    {
        label: "!=",
        value: FilterOperations.notEqual
    },
    {
        label: "<",
        value: FilterOperations.lessThan
    },
    {
        label: ">",
        value: FilterOperations.greaterThan
    },
    {
        label: "<=",
        value: FilterOperations.lessOrEqual
    },
    {
        label: ">=",
        value: FilterOperations.greaterOrEqual
    }
];

/**
* Common filter operators used for datetime fields
* NOTE: Not all the dateFieldOperations are being used (only the >= and <= ops are used) because TimeRangePicker requires that users select both a before and after value. Rather than direct input of "before" or "after" a certain time, we let users choose a range which may be more intuitive to use.
*/
export const dateFieldOperations: SelectableValue[] = [
    {
        label: "After",
        value: FilterOperations.greaterThan
    },
    {
        label: "On date or after",
        value: FilterOperations.greaterOrEqual
    },
    {
        label: "Before",
        value: FilterOperations.lessThan
    },
    {
        label: "On date or before",
        value: FilterOperations.lessOrEqual
    }
];

/*
 * Run configuration types from azureml.core.Run (https://docs.microsoft.com/en-us/python/api/azureml-core/azureml.core.run(class)?view=azure-ml-py)
 */
export const runTypeValueOptions: SelectableValue[] = [
    { label: "Automated ML", value: "Automated ML" },
    { label: "Hyperdrive", value: "Hyperdrive" },
    { label: "Pipeline", value: "Pipeline" },
    { label: "Pipeline Step", value: "Pipeline step" },
    { label: "Script", value: "Script" }
]

/*
 * Run statuses from azureml.core.run.Run get_status() (https://docs.microsoft.com/en-us/python/api/azureml-core/azureml.core.run.run?view=azure-ml-py#get-status--)
 */
export const statusValueOptions: SelectableValue[] = [
    { label: "Cancel Requested", value: "Cancel requested" },
    { label: "Canceled", value: "Canceled" },
    { label: "Completed", value: "Completed" },
    { label: "Failed", value: "Failed" },
    { label: "Finalizing", value: "Finalizing" },
    { label: "Not Responding", value: "Not responding" },
    { label: "Not Started", value: "Not started" },
    { label: "Preparing", value: "Preparing" },
    { label: "Provisioning", value: "Provisioning" },
    { label: "Queued", value: "Queued" },
    { label: "Running", value: "Running" },
    { label: "Starting", value: "Starting" },
    { label: "Succeeded", value: "Succeeded" },
    { label: "Timed Out", value: "Timed out" }
]

/**
 * Common filter operators used for tag fields
 */
export const tagOperations: SelectableValue[] = [
    {
        label: "key is defined",
        value: FilterOperations.notEqual
    }, 
    {
        label: "key == value",
        value: FilterOperations.equals
    }
];

/**
 * Common filter operators used for string fields
 */
export const stringOperations: SelectableValue[] = [
    {
        label: "==",
        value: FilterOperations.equals
    },
    {
        label: "!=",
        value: FilterOperations.notEqual
    }
];

export const propertyDetailsDict: { [key: string]: IPropertyDetails } = {
    [RunProperties.number]: {
        options: numericOperations,
        type: PropertyType.number,
        queryPath: "properties/runNumber"
    },
    [RunProperties.runType]: {
        options: stringOperations,
        type: PropertyType.string,
        queryPath: "properties/runType",
        allowedValues: runTypeValueOptions
    },
    [RunProperties.targetName]: {
        options: stringOperations,
        type: PropertyType.string,
        queryPath: "properties/targetName"
    },
    [RunProperties.createdDate]: {
        options: [dateFieldOperations],
        type: PropertyType.date,
        queryPath: "properties/creationContext/createdTime"
    },
    [RunProperties.createdBy]: {
        options: stringOperations,
        type: PropertyType.string,
        queryPath: "properties/creationContext/createdBy/userName"
    },
    [RunProperties.tags]: {
        options: tagOperations,
        type: PropertyType.tag,
        queryPath: "annotations/tags/"
    },
    [RunProperties.status]: {
        options: stringOperations,
        type: PropertyType.string,
        queryPath: "annotations/status",
        allowedValues: statusValueOptions
    },
};

export const propertiesOptions: SelectableValue[] = [
    {
        label: RunProperties.createdBy,
        value: RunProperties.createdBy
    }, 
    {
        label: RunProperties.createdDate,
        value: RunProperties.createdDate
    }, 
    {
        label: RunProperties.number,
        value: RunProperties.number
    }, 
    {
        label: RunProperties.runType,
        value: RunProperties.runType
    }, 
    {
        label: RunProperties.status,
        value: RunProperties.status
    }, 
    {
        label: RunProperties.targetName,
        value: RunProperties.targetName
    }, 
    {
        label: RunProperties.tags,
        value: RunProperties.tags
    }
];

