import { DataSourceSettings } from '@grafana/data';
import { AzureMLSecureJsonData } from './AzureMLSecureJsonData';
import { AzureMLDataSourceJsonData } from './AzureMLDataSourceJsonData';

export type AzureMLDataSourceSettings = DataSourceSettings<AzureMLDataSourceJsonData, AzureMLSecureJsonData>;