import React from 'react';
import { Field, Select } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

export interface ISelectFieldProps {
    value?: string | undefined;
    onChange: (selection: SelectableValue) => void;
    options: SelectableValue[];
    displayError?: string | undefined;
}


export function SelectField(props: ISelectFieldProps) {
    return (
        <Field className="gf-form-inline width-10"
            invalid={props.displayError !== undefined}
            error={props.displayError}
        >
            <Select
                className="width-9"
                options={props.options}
                value={props.value}
                onChange={props.onChange}
            />
        </Field>
    );
}
