import { SelectableValue } from '@grafana/data';

export interface SelectableRun extends SelectableValue<string> {
    experimentId: string;
}