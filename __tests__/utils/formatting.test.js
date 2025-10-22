const { formatString } = require('../../utils/formatting');

test('formatting function should format string correctly', () => {
	expect(formatString('hello')).toBe('Hello');
});

test('formatting function should handle empty string', () => {
	expect(formatString('')).toBe('');
});

test('formatting function should trim whitespace', () => {
	expect(formatString('   hello   ')).toBe('Hello');
});