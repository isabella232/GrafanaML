import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  FieldType,
  SelectableValue,
} from '@grafana/data';

import { RunHistoryClient } from './utils/RunHistoryClient';
import { AzureMLRunQuery, AzureMLDataSourceJsonData, AuthOption, DATASOURCE_RETRY_TIME, ITargetRunInfo } from './types';
import { getBackendSrv } from '@grafana/runtime';

const AUTH_REFRESH_PERIOD = 30 * 60 * 1000 // 30 minutes


export class AzureMLDataSource extends DataSourceApi<AzureMLRunQuery, AzureMLDataSourceJsonData> {
  public subscriptionId?: string;
  public authMethod: AuthOption;
  public baseUrl: string;
  public workspace?: string;
  public targetRuns?: ITargetRunInfo[];

  constructor(public instanceSettings: DataSourceInstanceSettings<AzureMLDataSourceJsonData>) {
    super(instanceSettings);
    this.subscriptionId = instanceSettings.jsonData.subscriptionId;
    this.authMethod = instanceSettings.jsonData.authMethod;
    this.baseUrl = instanceSettings.url || '';
    this.workspace = instanceSettings.jsonData.workspace;
    this.targetRuns
    if (instanceSettings.jsonData.datasourceType === "runtoken" && 
      instanceSettings.jsonData.targetRuns && 
      instanceSettings.jsonData.targetRuns.length > 0) {
      // set initial run and experiments to the logged runs
      this.targetRuns = instanceSettings.jsonData.targetRuns
      // refresh imediately 
      this.refreshToken();
      // refresh occasionally
      setInterval(async () => {
        await this.refreshToken();
      }, AUTH_REFRESH_PERIOD)
    }
  }

  private async refreshToken() {
    const token = await RunHistoryClient.getNewToken(this)
    const newBody = await getBackendSrv()
      .get(`/api/datasources/${this.instanceSettings.id}`)
    newBody["secureJsonData"] = {"authToken": token}
    getBackendSrv()
      .put(`/api/datasources/${this.instanceSettings.id}`, newBody)
  }

  private hasRequiredParameters(target: AzureMLRunQuery): boolean {
    return !!target.runs && !!target.metricName;
  }

  /**
   * Accepts a query from the user, retrieves the data from an external database,
   * and returns the data in a format that Grafana recognizes.
   * @param options
   */
  async query(options: DataQueryRequest<AzureMLRunQuery>): Promise<DataQueryResponse> {

    const data = await Promise.all(options.targets.map(async (target) => {
      if (!this.hasRequiredParameters(target)) {
        return [];
      }

      return await Promise.all(target.runs.map(async (run) => {
        const frame = new MutableDataFrame({
          refId: target.refId,
          name: run.label,
          fields: [
            { name: 'time', type: FieldType.time },
            { name: target.metricName, type: FieldType.number }
          ],
        });
        let metricValues: any[] = [];
        try {
          metricValues = await RunHistoryClient.fetchData(this, target, run.value!);
        } catch (err) {
          if (err.status !== undefined) {
            if (err.status === 404) {
              // Not found, set to empty array
              return;
            }
            if (err.status === 401) {
              throw Error('Authentication failed. Please reset authentication credentials.');
            }
            if (err.status === 502) {
              throw Error('Proxy request failed. Please reset the datasource.');
            }
            throw err;
          }
        }

        // Grabbing metric values and adding to the data frame:
        if (metricValues.length === 0) {
          return
        }

        metricValues.forEach(value => {
            frame.add({
              time: +new Date(value.createdUtc),
              [target.metricName]: value.data[target.metricName]
            });
        });
        return frame;
      }));
    }));

    const flattendData = data.flat().filter(x => x !== undefined);

    if (!flattendData || flattendData.length === 0) {
      return {data: []};
    }

    return { data: flattendData };
  }

  private async testExperiment(retryCount = 0): Promise<SelectableValue[]> {
    try {
      const { experiments } = await RunHistoryClient.fetchExperiments(this);
      return experiments;
    } catch (err) {
      if (retryCount > 0) {
        // changes to the settings do not seem to be set immediately on the proxy server,
        // so updating the workspace/discoveryUrl  may not be applied to the run history route
        // needed for validation. Try after a brief timeout.
        return await new Promise((resolve) => setTimeout(() => {
          resolve(this.testExperiment(retryCount - 1));
        }, DATASOURCE_RETRY_TIME));
      }
      throw err;
    }
  }

  /**
   * Implements a health check for the data source. Grafana calls this method whenever the users save the configuration settings.
   * Used during set-up to make sure 1) the connection has been established and that 2) the authentication has been successful.
   */
  async testDatasource(): Promise<{status: string, message: string}> {
    try {
      const experiments = await this.testExperiment(1);
      if (experiments.length === 0) {
        return {
          status: 'success',
          message: 'Updated. Workspace is empty.',
        };
      }
      return {
        status: 'success',
        message: 'Success',
      };
    } catch (err) {
      console.log(this.instanceSettings)
      if (err.status !== undefined) {
        if (err.status === 401) {
          return {
            status: 'error',
            message: 'Authentication failed. Reset auth credentials.'
          }
        }
        if (err.status >= 500) {
          const statusText = err.statusText !== undefined ? JSON.stringify(err.statusText) : "unknown"
          return {
            status: 'error',
            message: 'Service error: ' + statusText
          }
        }
      }
      return {
        status: 'error',
        message: 'Unexpected error : ' + JSON.stringify(err)
      }
    }
  }

}
