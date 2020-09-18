import React, { ChangeEvent } from 'react';
import { Button, Field, Label, Checkbox, TimeRangePicker } from '@grafana/ui';
import { SelectableValue, dateTime, TimeFragment, dateTimeForTimeZone, TimeRange } from '@grafana/data';
import { getShiftedTimeRange, getZoomedTimeRange, shiftDirections } from '../utils/timeRangePicker';
import { RunProperties, numericOperations, PropertyType, FilterOperations, propertyDetailsDict, propertiesOptions, timePicker, horizDivForTimePicker, timePickerContainer, timePickerLabel, h2, h3, IFilter } from 'types';
import { SelectField } from './SelectField';
import { InputField } from './InputField';

export interface IFilterControlProps {
    filters: IFilter[];
    includeChildRuns: boolean;
    onFiltersUpdate: (filters: IFilter[]) => void;
    onChildRunsUpdate: (include: boolean) => void;
}

export interface IFilterControlState {
    editorOpen: boolean;
    selectedProperty: RunProperties;
    operation: SelectableValue;
    value?: string;
    timerangeValue: TimeRange;
    additionalValue?: string;
    filterValidationError?: string;
}

export class FilterControl extends React.PureComponent<IFilterControlProps, IFilterControlState> {
    constructor(props: IFilterControlProps) {
        super(props);
        this.state = {
            editorOpen: false,
            selectedProperty: RunProperties.number,
            operation: numericOperations[0],
            value: undefined,
            timerangeValue: {
                from: dateTime().subtract(6, "hours"),
                to: dateTime(),
                raw: { from: 'now-6h' as TimeFragment, to: 'now' as TimeFragment },
            }
        }
    }

    /* On filter control editor change functions */

    openEditor = () => {
        this.setState({ editorOpen: true });
    }

    closeEditor = () => {
        this.setState({ editorOpen: false, value: undefined, filterValidationError: undefined });
    }

    deleteFilter = (index: number) => {
        const filters = [...this.props.filters];
        filters.splice(index, 1);
        this.props.onFiltersUpdate(filters);
    }

    setProperty = (selection: SelectableValue) => {
        const newProp = propertyDetailsDict[selection.value];
        this.setState({
            selectedProperty: selection.value,
            operation: newProp.options[0]
        });
    }

    setOperation = (selection: SelectableValue) => {
        this.setState({ operation: selection });
    }

    setSelectValue = (selection: SelectableValue) => {
        this.setState({ value: selection.value });
    }

    setValue = (event: ChangeEvent<HTMLInputElement>) => {
        this.setState({ value: event.target.value, filterValidationError: undefined });
    }

    setAdditionalValue = (event: ChangeEvent<HTMLInputElement>) => {
        this.setState({ additionalValue: event.target.value });
    }

    onChildRunsChange = (event: ChangeEvent<HTMLInputElement>) => {
        this.props.onChildRunsUpdate(event.currentTarget.checked);
    };

    onMoveTimePicker = (direction: shiftDirections) => {
        const { from, to } = getShiftedTimeRange(direction, this.state.timerangeValue);
        const nextTimeRange = {
            from: dateTimeForTimeZone("browser", from),
            to: dateTimeForTimeZone("browser", to),
            raw: this.state.timerangeValue.raw,
        };
        this.setState({ timerangeValue: nextTimeRange });
    }

    onZoom = () => {
        const { from, to } = getZoomedTimeRange(this.state.timerangeValue, 2);
        const nextTimeRange = {
            from: dateTimeForTimeZone("browser", from),
            to: dateTimeForTimeZone("browser", to),
            raw: this.state.timerangeValue.raw,
        };
        this.setState({ timerangeValue: nextTimeRange })
    };

    /* Render control functions */

    getPropertyDetailsControl(propertyDetails): React.ReactNode {
        if (propertyDetails.type === PropertyType.date) {
            return (
                <></> // we don't allow property detail selection or direct string input for date, for ease of use 
            );
        } else {
            return (
                <SelectField value={this.state.value} onChange={this.setOperation} options={propertyDetails.options} displayError={this.state.filterValidationError} />
            );
        }
    }

    getValueInputControl(propertyDetails): React.ReactNode {
        switch (propertyDetails.type) {
            case PropertyType.number:
                return <InputField inputType="number" placeholderText="value" value={this.state.value} onChange={this.setValue} displayError={this.state.filterValidationError} />;
            case PropertyType.tag:
                return (
                    <>
                        <InputField inputType="text" placeholderText="key" value={this.state.value} onChange={this.setValue} displayError={this.state.filterValidationError} />
                        {this.state.operation.value === FilterOperations.equals ?
                            <InputField inputType="text" placeholderText="value" value={this.state.additionalValue} onChange={this.setAdditionalValue} displayError={this.state.filterValidationError} />
                            : <></>
                        }
                    </>
                );
            case PropertyType.date:
                return (
                    <div style={timePickerContainer}>
                        <hr style={horizDivForTimePicker}></hr>
                        <div style={timePicker}>
                            <Label style={timePickerLabel}>Choose Time Range</Label>
                            <Field
                                invalid={this.state.filterValidationError !== undefined}
                                error={this.state.filterValidationError}
                            >
                                <TimeRangePicker
                                    timeZone="browser"
                                    value={this.state.timerangeValue}
                                    onChange={timeRange => {
                                        this.setState({ timerangeValue: timeRange });
                                    }}
                                    onMoveBackward={() => this.onMoveTimePicker(shiftDirections.Backward)}
                                    onMoveForward={() => this.onMoveTimePicker(shiftDirections.Forward)}
                                    onZoom={() => this.onZoom()}
                                />
                            </Field>
                        </div>
                    </div>
                );
            default:
            case PropertyType.string:
                switch (this.state.selectedProperty) {
                    case RunProperties.runType:
                        return <SelectField value={this.state.value} onChange={this.setSelectValue} options={propertyDetails.allowedValues} displayError={this.state.filterValidationError} />
                    case RunProperties.status:
                        return <SelectField value={this.state.value} onChange={this.setSelectValue} options={propertyDetails.allowedValues} displayError={this.state.filterValidationError} />
                    default:
                        return <InputField inputType="text" placeholderText="value" value={this.state.value} onChange={this.setValue} displayError={this.state.filterValidationError} />
                }
        }
    }

    getAddFilter(): React.ReactNode {
        return (
            <Field>
                <Button
                    style={{ marginBottom: '10px', marginTop: '8px' }}
                    className="gf-form-inline"
                    icon={"filter"}
                    onClick={this.openEditor}
                >
                    Add filter
                </Button>
            </Field>
        );
    }

    validateAndSave = () => {
        const filter: IFilter = {} as any;
        const propertyDetails = propertyDetailsDict[this.state.selectedProperty]
        if (propertyDetails.type === PropertyType.date) {
            // The createdDate will always have a default timerangeValue in the picker, so only for the Date type do we skip checking whether state.value is populate3d
            filter.filterProps = [{
                field: propertyDetails.queryPath,
                operator: FilterOperations.greaterOrEqual,
                values: [this.state.timerangeValue.from]
            }, {
                field: propertyDetails.queryPath,
                operator: FilterOperations.lessOrEqual,
                values: [this.state.timerangeValue.to]
            }];
            filter.displayString = `${this.state.selectedProperty}: ${this.state.timerangeValue.from.toString()} - ${this.state.timerangeValue.to.toString()}`
        }
        else if (this.state.value !== undefined) {
            switch (propertyDetails.type) {
                case PropertyType.number: {
                    filter.filterProps = [{
                        field: propertyDetails.queryPath,
                        operator: this.state.operation.value,
                        values: [Number.parseFloat(this.state.value)]
                    }];
                    filter.displayString = `${this.state.selectedProperty} ${this.state.operation.label} ${this.state.value}`
                    break;
                }
                case PropertyType.tag: {
                    if (this.state.value === '') {
                        this.setState({ filterValidationError: "Value required" });
                        break;
                    }
                    const values = this.state.operation.value === FilterOperations.equals ?
                        [this.state.additionalValue] : [null];
                    const predicate = this.state.operation.value === FilterOperations.equals ?
                        `== ${this.state.additionalValue}` : "is defined";
                    const displayString = `Tags: ${this.state.value} ${predicate}`;
                    filter.filterProps = [{
                        field: propertyDetails.queryPath + this.state.value,
                        operator: this.state.operation.value,
                        values
                    }];
                    filter.displayString = displayString;
                    break;
                }
                default:
                case PropertyType.string: {
                    filter.filterProps = [{
                        field: propertyDetails.queryPath,
                        operator: this.state.operation.value,
                        values: [this.state.value]
                    }];
                    filter.displayString = `${this.state.selectedProperty} ${this.state.operation.label} ${this.state.value}`
                }
            }
        }
        else {
            this.setState({ filterValidationError: "Value required" });
            return;
        }

        this.props.onFiltersUpdate(this.props.filters.concat(filter));
    }

    render() {
        const propertyDetails = propertyDetailsDict[this.state.selectedProperty];
        return (
            <>
                {this.state.editorOpen ?
                    <>
                        <Label style={h3}>Add New Filter</Label>
                        <div className="gf-form-inline">
                            <SelectField value={this.state.selectedProperty as any} onChange={this.setProperty} options={propertiesOptions} displayError={this.state.filterValidationError} />
                            {this.getPropertyDetailsControl(propertyDetails)}
                            {this.getValueInputControl(propertyDetails)}
                        </div>
                        <div className="gf-form-inline" style={{ marginBottom: '20px' }}>
                            <Button
                                style={{ marginRight: '10px' }}
                                className="gf-form-inline "
                                onClick={this.validateAndSave}
                                icon={"plus"}
                            >Save</Button>
                            <Button
                                className="gf-form-inline"
                                onClick={this.closeEditor}
                                icon={"times"}
                                variant={"destructive"}
                            >Cancel</Button>
                        </div>
                    </> : this.getAddFilter()
                }
                <Label style={h2}>Run Filters</Label>
                <Checkbox
                    value={this.props.includeChildRuns}
                    onChange={this.onChildRunsChange}
                    label="Include child runs in list"
                />
                {this.props.filters.map((filter, i) => {
                    return (
                        <Button
                            style={{ margin: '0px 5px' }}
                            size={"sm"}
                            variant={"secondary"}
                            onClick={this.deleteFilter.bind(this, i)}
                            icon={"times"}
                        >
                            {filter.displayString}
                        </Button>
                    );
                })}
            </>
        );
    }
}