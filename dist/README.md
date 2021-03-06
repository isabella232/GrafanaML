# AzureML Metrics Data Source For Grafana
This is a Grafana data source plug-in for AzureML Metrics. By integrating AzureML with Grafana, we not only grant users more customization in visualizing their run data with dashboards, but also allow them to monitor their metrics in real-time.  

# Usage
## Configure the data source
 - Create a service principal in [Azure Portal](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)
 - Enter the service principal's client ID and secret into the datasource config.

![](https://raw.githubusercontent.com/Azure/GrafanaML/main/src/img/usage/config_view.png)
## Select metrics to query
![](https://raw.githubusercontent.com/Azure/GrafanaML/main/src/img/usage/filtercontrol_selection.PNG)
### Filter runs by:
- Created By
- Created Time
- Run Number
- Run Type (Automated ML, Notebook run, Hyperdrive, Pipeline, Pipeline Step, Script)
- Status (Cancel requested, Canceled, Completed, Failed, Finalizing, Not responding, Not started, Other, Preparing, Provisioning, Queued, Running, Starting)
- Target Name
- Tags

![](https://raw.githubusercontent.com/Azure/GrafanaML/main/src/img/usage/timerange_picker.PNG)
## Visualized selected metric(s)
![](https://raw.githubusercontent.com/Azure/GrafanaML/main/src/img/usage/multirun.png)

# Development
1. Install dependencies
```BASH
yarn install
```
2. Build plugin in development mode or run in watch mode
```BASH
yarn dev
```
or
```BASH
yarn watch
```
3. Build plugin in production mode
```BASH
yarn build
```
4. Run Tests
```
npm run tests
```

## API References
- [RunHistory API](https://master.api.azureml-test.ms/history/swagger/private/index.html)
- [IndexService API](https://master.experiments.azureml-test.net/index/swagger/index.html)

## Helpful Development Links
- [Build a data source plugin in Grafana](https://grafana.com/tutorials/build-a-data-source-plugin)
- [Grafana Documentation](https://grafana.com/docs/)
- [Grafana Tutorials](https://grafana.com/tutorials/) - Grafana Tutorials are step-by-step guides that help you make the most of Grafana
- [Grafana UI Library](https://developers.grafana.com/ui) - UI components to help you build interfaces using Grafana Design System
