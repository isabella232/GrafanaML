import CSS from 'csstype';

/* Inline styles rather than CSS - every React HTML element has a style property that allows an object with styling. */


// Time Picker

export const timePickerContainer: CSS.Properties = {
    width: '50%',
    marginBottom: '-10px'
};

export const h2: CSS.Properties = {
    fontSize: '16px',
    fontWeight: 500,
    lineHeight: '1.25',
    maxWidth: '480px'
};

export const h3: CSS.Properties = {
    fontSize: '14px',
    fontWeight: 300,
    lineHeight: '1.25',
    maxWidth: '480px',
    marginTop: '5px'
};

export const horizDivForTimePicker: CSS.Properties = {
    height: '.25px',
    background: '#2a6cd1',
    borderTop: '#2a6cd1',
    textAlign: 'right',
    margin: '0',
    width: '56%'
};

export const timePicker: CSS.Properties = {
    marginLeft: '58%',
    marginTop: '-7px'
};

export const timePickerLabel: CSS.Properties = {
    fontWeight: 'lighter',
    color: '#2a6cd1'
};