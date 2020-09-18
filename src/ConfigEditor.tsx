import React, { ChangeEvent, PureComponent } from 'react';
import { Select, Legend, Input, Button, InlineFormLabel, Field } from '@grafana/ui';
import {
  SelectableValue,
  DataSourcePluginOptionsEditorProps,
  updateDatasourcePluginOption,
  updateDatasourcePluginJsonDataOption,
  updateDatasourcePluginSecureJsonDataOption,
  onUpdateDatasourceResetOption,
} from '@grafana/data';
import { RunHistoryClient } from './utils/RunHistoryClient';
import { getBackendSrv } from '@grafana/runtime';
import { AzureMLDataSourceJsonData, AzureMLSecureJsonData, CLIENT_CREDENTIAL_ROUTE } from 'types';

export interface Props extends DataSourcePluginOptionsEditorProps<AzureMLDataSourceJsonData, AzureMLSecureJsonData> {

}

interface State {
  subscriptions?: SelectableValue[];
  workspaces?: SelectableValue[];
  loadingWorkspaceDetails: boolean;
  loadResourcesError: string | undefined;
}

export class ConfigEditor extends PureComponent<Props, State> {
  authOptions = [
    {
      label: "Client credentials",
      value: CLIENT_CREDENTIAL_ROUTE
    }];
  constructor(props: Props) {
    super(props);
    this.state = {
      subscriptions: [],
      workspaces: [],
      loadingWorkspaceDetails: false,
      loadResourcesError: undefined
    };
    if (this.props.options.id) {
      updateDatasourcePluginOption(this.props as any, 'url', '/api/datasources/proxy/' + this.props.options.id);
    }
  }

  componentDidMount() {
    if (this.props.options.jsonData.datasourceType !== 'runtoken') {
      this.loadSubscriptionsAndWorkspaces();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.options.jsonData.subscriptionId !== this.props.options.jsonData.subscriptionId) {
      this.loadWorkspaces();
    }
  }

  onAuthChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateDatasourcePluginSecureJsonDataOption(this.props, 'authToken', event.target.value);
    this.setState({loadResourcesError: undefined});
  }

  onAuthRouteChange = (selection: SelectableValue) => {
    updateDatasourcePluginJsonDataOption(this.props, 'authMethod', selection.value);
  }

  onClientSecretChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateDatasourcePluginSecureJsonDataOption(this.props, 'clientSecret', event.target.value);
    this.setState({loadResourcesError: undefined});
  };

  onSubscriptionSelected = (selection: any) => {
    const {options} = this.props;
    this.props.onOptionsChange({
      ...options,
      jsonData: {
        ...options.jsonData,
        workspace: undefined,
        subscriptionId: selection.value
      }
    });
  }

  onWorkspaceSelected = (selection: any) => {
    this.setState({loadingWorkspaceDetails: true}, async () => {
      const discoveryUrls = await RunHistoryClient.getDiscoveryUrls(
        '/api/datasources/proxy/' + this.props.options.id,
        this.props.options.jsonData.authMethod,
        selection.value
      );
      const runHistoryUrl = discoveryUrls["history"].replace('https://', '');
      const apiUrl = discoveryUrls["api"].replace('https://', '');
      const {options} = this.props
      this.props.onOptionsChange({
        ...options,
        jsonData: {
          ...options.jsonData,
          workspace: selection.value,
          runHistoryUrl,
          apiUrl
        }
      });
      await getBackendSrv()
        .put(`/api/datasources/${this.props.options.id}`, this.props.options)
        .then((result) => {
          updateDatasourcePluginOption(this.props as any, 'version', result.version);
      });
      this.setState({loadingWorkspaceDetails: false});
    });
  }

  onTenantIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateDatasourcePluginJsonDataOption(this.props, 'tenantId', event.target.value);
  };

  onClientIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateDatasourcePluginJsonDataOption(this.props, 'clientId', event.target.value);
  };

  hasNecessaryCredentials = () => {
    if (this.props.options.jsonData.authMethod === 'clientcred') {
      if (!this.props.options.secureJsonFields?.clientSecret && !this.props.options.secureJsonData?.clientSecret) {
        return false;
      }
      if (!this.props.options.jsonData.clientId || !this.props.options.jsonData.tenantId) {
        return false;
      }
    } else {
      if (!this.props.options.secureJsonFields?.authToken && !this.props.options.secureJsonData?.authToken) {
        return false;
      }
    }

    return true;
  }

  loadSubscriptionsAndWorkspaces = async () => {
    await this.loadSubscriptions();
    this.loadWorkspaces();
  }

  loadSubscriptions = async () => {
    await getBackendSrv()
      .put(`/api/datasources/${this.props.options.id}`, this.props.options)
      .then((result) => {
        updateDatasourcePluginOption(this.props as any, 'version', result.version);
    });
    if (this.hasNecessaryCredentials()) {
      this.setState({subscriptions: undefined}, async () => {
        const baseUrl = '/api/datasources/proxy/' + this.props.options.id;
        try {
          const subscriptions = await RunHistoryClient.fetchSubscriptions(baseUrl, this.props.options.jsonData.authMethod);
          this.setState({subscriptions, loadResourcesError: undefined });
          if (this.props.options.jsonData.subscriptionId === undefined) {
            updateDatasourcePluginJsonDataOption(this.props, 'subscriptionId', subscriptions[0].value);
          }
        } catch (err) {
          if (err.status === 401) {
            this.setState({loadResourcesError: "Authorization failed, cannot load subscriptions"})
          } else {
            this.setState({loadResourcesError: JSON.stringify(err)})
          }
        }
      });
    }
  };

  loadWorkspaces = () => {
    const subscriptionId = this.props.options.jsonData.subscriptionId;
    if (this.hasNecessaryCredentials() && subscriptionId !== undefined) {
      this.setState({workspaces: undefined}, async () => {
        const baseUrl = '/api/datasources/proxy/' + this.props.options.id;
        try {
          const workspaces = await RunHistoryClient.fetchWorkspaces(baseUrl, this.props.options.jsonData.authMethod, subscriptionId);
          this.setState({ workspaces, loadResourcesError: undefined });
          const selectedWsId = this.props.options.jsonData.workspace
          if (selectedWsId === undefined || workspaces.find(ws => ws.value === selectedWsId) === undefined) {
            this.onWorkspaceSelected(workspaces[0])
          }
        } catch (err) {
          if (err.status === 401) {
            this.setState({loadResourcesError: "Authorization failed, cannot load workspaces", workspaces: []})
          } else {
            this.setState({loadResourcesError: JSON.stringify(err), workspaces: []})
          }
        }
      });
    }
  }

  renderRunTokenPage = (): React.ReactNode => {
    return (<>
      <Legend>Azure Machine Learning Metrics</Legend>
      <div>This data source was generated using the AzureML SDK, and can not be further configured. If the authorization has expired, it can be refreshed by re-submitting using the SDK. Additional refresh options are being developed.</div>
    </>);
  }

  render() {
    const { options } = this.props;

    options.jsonData.authMethod = options.jsonData.authMethod || CLIENT_CREDENTIAL_ROUTE;
    options.secureJsonData = (options.secureJsonData || {}) as AzureMLSecureJsonData;
    const clientSecretConfigured = options.secureJsonFields?.clientSecret;
    const authTokenConfigured = options.secureJsonFields?.authToken;
    const hasNecessaryCredentials = this.hasNecessaryCredentials();

    if (options.jsonData.datasourceType === 'runtoken') {
      return this.renderRunTokenPage();
    }

    return (
      <div>
        <Legend>Azure Machine Learning Metrics</Legend>
        <div className="gf-form-group">
          {options.jsonData.authMethod === 'clientcred' && 
          <>
          <div className="gf-form-inline">
            <div className="gf-form">
            <InlineFormLabel className="width-12">
              Directory (tenant) ID
            </InlineFormLabel>
            <div className="width-15">
              <Input
                className="width-30"
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                value={this.props.options.jsonData.tenantId}
                onChange={this.onTenantIdChange}
              />
            </div>
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form">
            <InlineFormLabel className="width-12">
              Application (client) ID
            </InlineFormLabel>
            <div className="width-15">
              <Input
                className="width-30"
                placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                value={this.props.options.jsonData.clientId}
                onChange={this.onClientIdChange}
              />
            </div>
          </div>
        </div>
        <div className="gf-form-inline">
          <div className="gf-form">
            {clientSecretConfigured ? (
              <div className="gf-form-inline">
                <div className="gf-form">
                  <InlineFormLabel className="width-12">Client Secret</InlineFormLabel>
                  <Input 
                    className="width-25" 
                    placeholder="configured" 
                    disabled={true} 
                    invalid={this.state.loadResourcesError !== undefined}/>
                </div>
                <div className="gf-form">
                  <div className="max-width-30 gf-form-inline">
                    <Button 
                      variant={this.state.loadResourcesError ? "destructive" : "secondary"} 
                      type="button" 
                      onClick={onUpdateDatasourceResetOption(this.props as any, 'clientSecret')}>
                      reset
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="gf-form-inline">
                <div className="gf-form">
                  <InlineFormLabel className="width-12">
                    Client Secret
                  </InlineFormLabel>
                  <Field className="width-15"
                    invalid={this.state.loadResourcesError !== undefined}
                    error={this.state.loadResourcesError}
                  >
                    <Input
                      className="width-30"
                      placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                      value={options.secureJsonData.clientSecret || ''}
                      onChange={this.onClientSecretChange}
                    />
                  </Field>
                </div>
              </div>
            )}
            </div>
            </div>
            </>
          }
          {options.jsonData.authMethod === 'authtoken' && 
          <div className="gf-form">
            {authTokenConfigured ? (
            <div className="gf-form-inline">
              <div className="gf-form">
                <InlineFormLabel className="width-12">Authorization Token</InlineFormLabel>
                <Input
                  className="width-25"
                  placeholder="configured"
                  disabled={true} 
                  invalid={this.state.loadResourcesError !== undefined}/>
              </div>
              <div className="gf-form">
                <div className="max-width-30 gf-form-inline">
                  <Button 
                    variant={this.state.loadResourcesError ? "destructive" : "secondary"}
                    type="button"
                    onClick={onUpdateDatasourceResetOption(this.props as any, 'authToken')}
                  >
                    reset
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="gf-form-inline">
              <div className="gf-form">
                <InlineFormLabel className="width-12">Authorization Token</InlineFormLabel>
                  <Field className="width-15"
                    invalid={this.state.loadResourcesError !== undefined}
                    error={this.state.loadResourcesError}
                  >
                  <Input
                    className="width-30"
                    placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                    value={options.secureJsonData.authToken || ''}
                    onChange={this.onAuthChange}
                  />
                </Field>
              </div>
            </div>
          )}
          </div>}
          <div className="gf-form-inline">
            <div className="gf-form">
              <InlineFormLabel className="width-12">Default Subscription</InlineFormLabel>
              <div className="width-25">
                <Select
                  className="width-30"
                  value={options.jsonData.subscriptionId}
                  options={this.state.subscriptions}
                  onChange={this.onSubscriptionSelected}
                  placeholder="Select Subscription"
                  isLoading={this.state.subscriptions === undefined}
                />
              </div>
            </div>
          </div>
          <div className="gf-form-inline">
            <div className="gf-form">
              <div className="max-width-30 gf-form-inline">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={this.loadSubscriptionsAndWorkspaces}
                  disabled={!hasNecessaryCredentials}
                >
                  Load Subscriptions
                </Button>
              </div>
            </div>
          </div>
          <div className="gf-form-inline" style={{width: 300}}>
            <div className="gf-form">
              <InlineFormLabel className="width-12">Workspace</InlineFormLabel>
              <div className="width-25">
                <Select
                  key={options.jsonData.subscriptionId}
                  className="width-30"
                  value={options.jsonData.workspace}
                  options={this.state.workspaces}
                  onChange={this.onWorkspaceSelected}
                  placeholder="Select Workspace"
                  isLoading={this.state.workspaces === undefined}
                />
              </div>
            </div>
          </div>
          {this.state.loadingWorkspaceDetails && 
            <div className="gf-form-inline" style={{width: 300}}>
              <InlineFormLabel className="width-12">Loading details...</InlineFormLabel>
            </div>
          }
        </div>
      </div>
    );
  }
}
