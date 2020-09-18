import React, { ChangeEvent } from 'react';
import { Field, Input } from '@grafana/ui';

export interface IInputFieldProps {
    inputType: string;
    placeholderText: string;
    value?: string | undefined;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    displayError?: string | undefined;
}

export function InputField(props: IInputFieldProps) {
    return (
        <Field className="gf-form-inline width-10"
            invalid={props.displayError !== undefined}
            error={props.displayError}
        >
            <Input
                className="width-9"
                placeholder={props.placeholderText}
                type={props.inputType}
                value={props.value}
                onChange={props.onChange}
            />
        </Field>
    );
}