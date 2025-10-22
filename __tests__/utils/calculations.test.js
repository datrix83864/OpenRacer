const { add, subtract, multiply, divide } = require('../../utils/calculations');

describe('Calculations Utility Functions', () => {
    it('should add two numbers correctly', () => {
        expect(add(1, 1)).toBe(2);
    });

    it('should subtract two numbers correctly', () => {
        expect(subtract(5, 3)).toBe(2);
    });

    it('should multiply two numbers correctly', () => {
        expect(multiply(3, 4)).toBe(12);
    });

    it('should divide two numbers correctly', () => {
        expect(divide(10, 2)).toBe(5);
    });
});