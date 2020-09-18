import { DataSourceJsonData } from "@grafana/data";
import { AuthOption } from './AuthOption';
import { DatasourceOption } from './DatasourceOption';
import { ITargetRunInfo } from './ITargetRunInfo';

/**
 * These are options configured for each DataSource instance
 */
export interface AzureMLDataSourceJsonData extends DataSourceJsonData {
    authMethod: AuthOption;
    datasourceType: DatasourceOption;
    subscriptionId?: string;
    clientId?: string;
    tenantId?: string;
    workspace?: string;
    runHistoryUrl?: string;
    apiUrl?: string;
    targetRuns?: ITargetRunInfo[]
}