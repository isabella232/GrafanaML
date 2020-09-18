import { expect } from 'chai';
import { getShiftedTimeRange, getZoomedTimeRange, shiftDirections } from '../src/utils/timeRangePicker';
import { toUtc, AbsoluteTimeRange } from '@grafana/data';

export const initOptions = (options?: any) => {
    const defaultOptions = {
        range: {
            from: toUtc('2020-08-20 10:00:00'),
            to: toUtc('2020-08-20 16:00:00'),
            raw: {
                from: 'now-6h',
                to: 'now',
            },
        },
        direction: shiftDirections.Forward,
    };

    return { ...defaultOptions, ...options };
};

describe('getShiftedTimeRange', () => {
    describe('When called with a direction of Backward', () => {
        it('should shift time backward by half the range length', () => {
            const { range, direction } = initOptions({ direction: shiftDirections.Backward });
            const expectedRange: AbsoluteTimeRange = {
                from: toUtc('2020-08-20 07:00:00').valueOf(),
                to: toUtc('2020-08-20 13:00:00').valueOf(),
            };
            const actualRange = getShiftedTimeRange(direction, range);

            expect(actualRange).to.deep.equal(expectedRange);
        });
    });

    describe('When called with a direction of Forward', () => {
        it('should shift time forward by half the range length', () => {
            const { range, direction } = initOptions({ direction: shiftDirections.Forward });
            const expectedRange: AbsoluteTimeRange = {
                from: toUtc('2020-08-20 13:00:00').valueOf(),
                to: toUtc('2020-08-20 19:00:00').valueOf(),
            };
            const actualRange = getShiftedTimeRange(direction, range);

            expect(actualRange).to.deep.equal(expectedRange);
        });
    });

    describe('When called with any other direction value', () => {
        it('should not modify original time range', () => {
            const { range, direction } = initOptions({ direction: -1 });
            const expectedRange: AbsoluteTimeRange = {
                from: toUtc('2020-08-20 10:00:00').valueOf(),
                to: toUtc('2020-08-20 16:00:00').valueOf(),
            };
            const actualRange = getShiftedTimeRange(direction, range);

            expect(actualRange).to.deep.equal(expectedRange);
        });
    });
});

describe('getZoomedTimeRange', () => {
    describe('When called', () => {
        it('should return the transformed range', () => {
            const { range } = initOptions();
            const expectedRange: AbsoluteTimeRange = {
                from: toUtc('2020-08-20 07:00:00').valueOf(),
                to: toUtc('2020-08-20 19:00:00').valueOf(),
            };
            const actualRange = getZoomedTimeRange(range, 2);

            expect(actualRange).to.deep.equal(expectedRange);
        });
    });
});