import { getBackendSrv } from '@grafana/runtime';
import { SelectableValue } from '@grafana/data';
import { AzureMLDataSource } from 'AzureMLDataSource';
import { AuthOption, AzureMLRunQuery, IFilterProps, SelectableRun } from 'types';

export class RunHistoryClient {
    private static get headers() {
        return new Headers({
            'User-Agent': 'filler',
            'Accept': "application/json, text/plain, */*",
            // 'Content-Type': 'application/json; charset=UTF-8'
        });
    }

    public static async getDiscoveryUrls(baseUrl: string, authMethod: AuthOption, workspaceId: string): Promise<{[key:string]: string}> {
        try {
            const path = `${baseUrl}/management${authMethod}${workspaceId}?api-version=2020-04-01`;
            const response = await getBackendSrv().datasourceRequest({
                url: path,
                headers: this.headers,
                method: 'GET',
                requestId: Date.now().toString()
            });
            if (response && response.data.id === workspaceId) {
                const discoveryResponse = await getBackendSrv().datasourceRequest({
                    url: response.data.properties.discoveryUrl,
                    headers: this.headers,
                    method: 'GET',
                    requestId: Date.now().toString()
                });
                // trim the url to enable calling via proxy when applicable
                return (discoveryResponse.data)
            } else {
                console.warn(response);
                throw new Error(response);
            }
        } catch (err) {
            console.warn(err);
            throw err;
        }
    }

    public static async fetchSubscriptions(baseUrl:string, authMethod: AuthOption): Promise<SelectableValue[]> {
        const path = `${baseUrl}/management${authMethod}/subscriptions?api-version=2019-03-01`;
        const response = await getBackendSrv().datasourceRequest({
          url: path,
          headers: this.headers,
          method: 'GET',
          requestId: Date.now().toString()
        });
        return response.data.value.map(sub => {
            return {
                value: sub.subscriptionId,
                label: sub.displayName
            };
        });
    }

    public static async fetchWorkspaces(baseUrl: string, authMethod: AuthOption, subscriptionId): Promise<SelectableValue[]> {
        const path = `${baseUrl}/management${authMethod}/subscriptions/${subscriptionId}/providers/Microsoft.MachineLearningServices/workspaces?api-version=2020-04-01`;
        const response = await getBackendSrv().datasourceRequest({
          url: path,
          headers: this.headers,
          method: 'GET',
          requestId: Date.now().toString()
        });
        return response.data.value.map(ws => {
            return {
              value: ws.id,
              label: ws.name
            };
        });
    };

    public static async fetchExperiments(datasource: AzureMLDataSource, nameFilter?: string, continuationToken?: string): Promise<{experiments: SelectableValue[], continuationToken: string | undefined}> {
        try {
            const path = `${datasource.baseUrl}/runhistory${datasource.authMethod}/history/v1.0/private${datasource.workspace}/experiments:query?urlSafeExperimentNamesOnly=false`;
            const data = {
                "experimentFilterParams":{},
                "viewType":"ActiveOnly",
                "filter": nameFilter ? `(contains(Name,'${nameFilter}'))` : "",
                "orderBy":"LatestCreatedRunCreatedUtc desc",
                "top":200
            };
            if (continuationToken) {
                data["continuationToken"] = continuationToken
            }
            const response = await getBackendSrv().datasourceRequest({
                url: path,
                headers: this.headers,
                method: 'POST',
                requestId: Date.now().toString(),
                data: JSON.stringify(data)
            });
            const experiments = response.data.value.map(ex => {
                return {
                value: ex.experimentId,
                label: ex.name
                }
            });
            return {
                experiments,
                continuationToken: response.data.continuationToken
            }
        } catch(err) {
            console.warn(err);
            throw err;
        }
    }
    
    public static async fetchMetrics(datasource: AzureMLDataSource, query: AzureMLRunQuery,experimentId: string,  runIds: string[]): Promise<string[]> {
        try {
            const runFilter = 'runIds=' + runIds.join('&runIds=');
            const path = `${datasource.baseUrl}/runhistory${datasource.authMethod}/history/v2.0${datasource.workspace}/experimentids/${experimentId}/metricsmeta?${runFilter}&withRetries=false`;
            const response = await getBackendSrv().datasourceRequest({
                url: path,
                headers: this.headers,
                method: 'GET',
                requestId: Date.now().toString()
            });
            return response.data.result.value.filter(metric => {
                return metric.type == "azureml.v1.scalar"
            }).map(metric => metric.name);
        } catch (err) {
            console.warn(err);
            return [];
        }
    }

    public static async fetchRunsFromIndexService(datasource: AzureMLDataSource, query: AzureMLRunQuery):Promise<{runs: SelectableRun[], continuationToken}> {
        try {
            const path = `${datasource.baseUrl}/api${datasource.authMethod}/index/v1.0${datasource.workspace}/entities`;
            const filters: IFilterProps[] = [
                {"field":"type","operator":"eq","values":["runs"]},
                {"field":"annotations/archived","operator":"eq","values":[false]}
            ];
            if (query.experiments && query.experiments.length > 0) {
                const expIds = query.experiments.map(exp => exp.value);
                filters.push({"field":"properties/experimentId","operator":"eq","values": expIds });
            }
            if (!query.listChildRuns) {
                filters.push({"field":"properties/parentRunId","operator":"eq","values":[null]});
            }
            if (query.runFilters) {
                query.runFilters.forEach(filter => {
                    filter.filterProps.forEach(fp => {filters.push(fp);});
                });
            }
            const body = {
                "filters": filters,
                "order":[
                    {"field":"properties/experimentName","direction":"Asc"},
                    {"field":"properties/runNumber","direction":"Desc"}],
                "pageSize":2000,
                "skip":0,
                "includeTotalResultCount":true
            }

            const response = await getBackendSrv().datasourceRequest({
                url: path,
                headers: this.headers,
                method: 'POST',
                requestId: Date.now().toString(),
                data: JSON.stringify(body)
            });
            const runs = response.data.value.map(run => {
                const label = run.properties.runName ?? `${run.properties.experimentName} ${run.properties.runNumber}`;
                return { 
                    label,
                    experimentId: run.properties.experimentId,
                    value: run.properties.runId
                };
            });
            return {runs, continuationToken: response.data.continuationToken}
        } catch (err) {
            console.warn(err);
            return {runs: [], continuationToken: undefined};
        }
    }

    public static async fetchData(datasource: AzureMLDataSource, query: AzureMLRunQuery, runId: string): Promise<any[]> {
        try {
            const path = `${datasource.baseUrl}/runhistory${datasource.authMethod}/metric/v2.0${datasource.workspace}/runs/${runId}/sample`;
            const response = await getBackendSrv().datasourceRequest({
                url: path,
                headers: this.headers,
                method: 'POST',
                requestId: Date.now().toString(),
                data: JSON.stringify({ metricName: query.metricName })
            });
            return response.data.value;
        } catch (err) {
            console.warn(err);
            throw err;
        }
    }

    public static async getNewToken(datasource: AzureMLDataSource): Promise<string> {
        const run_info = datasource.instanceSettings.jsonData.targetRuns![0]
        try {
            const path = `${datasource.baseUrl}/runhistory${datasource.authMethod}/history/v1.0${datasource.workspace}/experimentids/${run_info.experiment}/runs/${run_info.run}/token`;
            const response = await getBackendSrv().datasourceRequest({
                url: path,
                headers: this.headers,
                method: 'GET',
                requestId: Date.now().toString(),
            });
            return response.data.token;
        } catch (err) {
            console.warn(err);
            return "";
        }
    }
}