import _ from 'lodash';
import React, { PureComponent, ChangeEvent } from 'react';
import { Select, Field, MultiSelect, Checkbox, Label, AsyncMultiSelect } from '@grafana/ui';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { AzureMLDataSource } from './AzureMLDataSource';
import { RunHistoryClient } from 'utils/RunHistoryClient';
import { FilterControl } from 'controls/FilterControl';
import { AzureMLRunQuery, AzureMLDataSourceJsonData, SelectableRun, IFilter, SELECT_ALL_LABEL, h2, h3 } from 'types';


type Props = QueryEditorProps<AzureMLDataSource, AzureMLRunQuery, AzureMLDataSourceJsonData>;

interface State {
  experiments?: SelectableValue<string>[];
  runs?: SelectableRun[];
  metrics?: SelectableValue[];
  showRunCountWarning: boolean;
  showExperimentCountWarning: boolean;
}

export class QueryEditor extends PureComponent<Props, State> {
  constructor(props) {
    super(props);
    this.state = {
      experiments: [],
      runs: [],
      metrics: [],
      showExperimentCountWarning: false,
      showRunCountWarning: false
    };
    this.loadFilteredExperiments = this.loadFilteredExperiments.bind(this)//_.debounce(this.loadFilteredExperiments.bind(this), 300);
  }

  private static allExperimentsKey = 'AllExperiments';
  private static allRunsKey = 'AllRuns';

  componentDidMount() {
    // populate selection to the runs set via the SDK
    if (this.props.datasource.targetRuns !== undefined) {
      this.initByTargetRuns();
    }
    else {
      const { onChange, query } = this.props;
      onChange({
        ...query,
        runs: [],
        experiments: []
      });
    }
    this.fetchRuns();
    if (this.props.query.runs) {
      this.fetchMetrics();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.query.experiments !== prevProps.query.experiments ||
      this.props.query.runFilters !== prevProps.query.runFilters ||
      this.props.query.listChildRuns !== prevProps.query.listChildRuns) {
      this.fetchRuns();
    }
    if (this.props.query.runs !== prevProps.query.runs) {
      this.fetchMetrics();
      if (this.props.query.metricName) {
        this.props.onRunQuery();
      }
    }
  }

  private initByTargetRuns(): void {
    if (this.props.datasource.targetRuns !== undefined) {
      const expDict: {[key: string]: string} = {};
      this.props.datasource.targetRuns.forEach(runItem => {
        if (expDict[runItem.experiment] === undefined) {
          expDict[runItem.experiment] = runItem.experimentName
        }
      });
      const experiments: SelectableValue[string] = Object.keys(expDict).map(expId => {
        return {
          label: expDict[expId],
          value: expId
        }
      });
      const selectedRuns = this.props.datasource.targetRuns.map(runInfo => {
        return {
          label: runInfo.label,
          experimentId: runInfo.experiment,
          value: runInfo.run
        }
      });
      const { onChange, query } = this.props;
      onChange({
        ...query,
        experiments,
        runs: selectedRuns
      });
    }
  }

  private async fetchRuns(): Promise<void> {
    this.setState({ runs: undefined, metrics: [] }, async () => {
      const {runs, continuationToken} = await RunHistoryClient.fetchRunsFromIndexService(this.props.datasource, this.props.query);
      // Keep all runs that are selected but no longer match filters
      // to enable user building heterogeneus collections
      const selectedRuns = this.props.query.runs || [];
      const retainedRuns = selectedRuns.filter(run => {
        return !runs.some(runOption => runOption.value === run.value)
      })
      this.setState({
        runs: runs.concat(retainedRuns),
        metrics: [],
        showRunCountWarning: !!continuationToken
      });
    });
  }

  private async fetchMetrics(): Promise<void> {
    this.setState({ metrics: undefined }, async () => {
      const selectedRuns = this.props.query.runs || [];
      const expDict: {[key: string]: string[]} = {};
      selectedRuns.forEach(run => {
        if (expDict[run.experimentId] === undefined) {
          expDict[run.experimentId] = [];
        }
        expDict[run.experimentId].push(run.value!)
      });

      const promises = Object.entries(expDict).map(([expId, runIds]) => {
        return RunHistoryClient.fetchMetrics(this.props.datasource, this.props.query, expId, runIds);
      });
      const metricArray = await Promise.all(promises);
      const metrics = _.uniq(metricArray.flat())
        .sort()
        .map(label => {return { label, value: label};});
      this.setState({metrics});
    });
  }

  private async loadFilteredExperiments(input: string): Promise<SelectableValue[]> {
    const {experiments, continuationToken} = await RunHistoryClient.fetchExperiments(this.props.datasource, input);
    this.setState({
      showExperimentCountWarning: !!continuationToken,
      experiments: [...experiments]
    });
    if (experiments !== undefined &&
      (this.props.query.experiments === undefined ||
        experiments.some(exp => {
           return (this.props.query.experiments.indexOf(exp.value) == -1);
        })
      )
    ) {
      experiments.unshift(
        {
          label: SELECT_ALL_LABEL,
          value: QueryEditor.allExperimentsKey
        }
      );
    }
    return experiments;
  }

  getLabel = (option) => {
    return option.name;
  }

  getValue = (option) => {
    return option.id
  }

  onExperimentSelected = (selection: SelectableValue[]) => {
    const { onChange, query } = this.props;
    if (selection.findIndex(exp => exp.value === QueryEditor.allExperimentsKey) !== -1) {
      onChange({ ...query, experiments: [...this.state.experiments!] });
    } else {
      onChange({
        ...query,
        experiments: selection
      });
    }
  }

  onFiltersUpdated = (filters: IFilter[]) => {
    const { onChange, query } = this.props;
    onChange({ ...query, runFilters: filters });
  };

  onListChildRunsChange = (include: boolean) => {
    const { onChange, query } = this.props;
    onChange({ ...query, listChildRuns: include });
  }

  onFilterByExperimentsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({
      ...query,
      filterByExperiments: event.currentTarget.checked,
      experiments: event.currentTarget.checked ? (query.experiments || []) : []
    });
  }

  onRunSelected = (selection: SelectableRun[]) => {
    const { onChange, query } = this.props;
    if (selection.findIndex(run => run.value === QueryEditor.allRunsKey) !== -1) {
      onChange({ ...query, runs: [...this.state.runs] });
    } else {
      onChange({ ...query, runs: selection });
    }
    if (this.props.query.metricName) {
      this.props.onRunQuery();
    }
  }

  onMetricSelected = (selection: any) => {
    const { onChange, query, onRunQuery } = this.props;
    onChange({ ...query, metricName: selection.value });
    onRunQuery();
  }

  render() {
    const runOptions = this.state.runs ? [...this.state.runs] : undefined;
    if (runOptions !== undefined && runOptions.length !== 0 &&
      (this.props.query.runs === undefined ||
        this.props.query.runs.length !== runOptions.length)
    ) {
      runOptions.unshift(
        {
          label: SELECT_ALL_LABEL,
          value: QueryEditor.allRunsKey,
          experimentId: "0"
        }
      );
    }

    return (
      <div className="gf-form-group">
        <Label style={h2}>Filter Runs</Label>
        <div className="gf-form">
          <div className="gf-form-inline" style={{ width: 300 }}>
            <div>
              <Checkbox
                label="Filter by experiment"
                value={this.props.query.filterByExperiments}
                onChange={this.onFilterByExperimentsChange}
              />
              {this.props.query.filterByExperiments === true ?
                <div className="gf-form-inline">
                  <AsyncMultiSelect
                    width={35}
                    defaultOptions
                    isClearable={true}
                    // onInputChange={this.loadFilteredExperiments}
                    maxVisibleValues={2}
                    cacheOptions={false}
                    loadOptions={this.loadFilteredExperiments}
                    onChange={this.onExperimentSelected}
                    placeholder="Select experiment"
                    value={this.props.query.experiments || []}
                    // isLoading={this.state.experiments === undefined}
                  ></AsyncMultiSelect>
                  {this.state.showExperimentCountWarning ?
                    <span>Not all experiments can be shown. Type in dropdown to refine list.</span> : <></>
                  }
                </div> :
                <></>
              }
            </div>
          </div>
        </div>
        <FilterControl
          filters={this.props.query.runFilters || []}
          includeChildRuns={this.props.query.listChildRuns}
          onFiltersUpdate={this.onFiltersUpdated}
          onChildRunsUpdate={this.onListChildRunsChange}
        />
        <div className="gf-form">
          <div className="gf-form-inline" style={{ width: 300 }}>
            <Label style={h3}>Runs</Label>
            <Field
              invalid={this.state.showRunCountWarning}
              error={this.state.showRunCountWarning ? "Refine filtering further. Too many runs to display." : undefined}>
                <MultiSelect
                  width={35}
                  isClearable={true}
                  maxVisibleValues={2}
                  onChange={this.onRunSelected as any}
                  options={runOptions}
                  placeholder="Select run"
                  value={this.props.query.runs}
                  isLoading={this.state.runs === undefined}
                ></MultiSelect>
            </Field>
          </div>
          <div className="gf-form-inline" style={{ width: 300 }}>
            <Label style={h3}>Metric</Label>
            <Field>
              <Select
                width={35}
                onChange={this.onMetricSelected}
                options={this.state.metrics}
                placeholder="Select metric"
                value={this.props.query.metricName}
                isLoading={this.state.metrics === undefined}
                disabled={!this.state.metrics || this.state.metrics.length === 0}
              ></Select>
            </Field>
          </div>
        </div>
      </div>
    );
  }
}
