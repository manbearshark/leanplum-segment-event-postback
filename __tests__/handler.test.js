// Unit testing is a good thing.
const handler = require("../handler");

test('handles null fields', () => {
    expect(handler.mapToSegment({})).toBe(null);
});

test('maps event fields for mail events', () => {

    const returnValue = {
        timestamp: '2019-05-10T17:45:39.000Z',
        event: 'Email Delivered',
        userId: 'igor@segment.com',
        context: {},
        properties: {},
    };

    expect(handler.mapToSegment({
        timestamp: '1557510339000',
        userId: 'igor@segment.com',
        template_name: '',
        parameters: '{}',
        channel: 'Email',
        device_id: '',
        event: 'Delivered'
    })).toStrictEqual(returnValue);
});

test('handles A/B test events', () => {

    const returnValue = {
        timestamp: '2019-05-10T17:45:39.000Z',
        abTestID: '123456678',
        variantID: '12345678',
        event: 'AB Test',
        userId: 'igor@segment.com',
        context: { device: { id: '00284B13-ADAA-4FA0-AB01-1005B1B0802C' } },
        properties: {

        },
    };

    expect(handler.mapToSegment({
        timestamp: '1557510339000',
        userId: 'igor@segment.com',
        parameters: '{}',
        channel: '',
        device_id: '00284B13-ADAA-4FA0-AB01-1005B1B0802C',
        event: ''
    })).toStrictEqual(returnValue);
});
