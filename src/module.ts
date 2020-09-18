import { DataSourcePlugin } from '@grafana/data';
import { AzureMLDataSource } from './AzureMLDataSource';
import { ConfigEditor } from './ConfigEditor';
import { QueryEditor } from './QueryEditor';
import { AzureMLRunQuery, AzureMLDataSourceJsonData } from 'types';

export const plugin = new DataSourcePlugin<AzureMLDataSource, AzureMLRunQuery, AzureMLDataSourceJsonData>(AzureMLDataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
