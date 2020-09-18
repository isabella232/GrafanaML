import { DataQuery, SelectableValue } from '@grafana/data';
import { IFilter } from './IFilter';
import { SelectableRun } from './SelectableRun';

export interface AzureMLRunQuery extends DataQuery {
    experiments: SelectableValue<string>[];
    runFilters: IFilter[];
    listChildRuns: boolean;
    filterByExperiments: boolean;
    runs: SelectableRun[];
    metricName: string;
}