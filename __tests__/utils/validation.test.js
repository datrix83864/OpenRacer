const { validateEmail, validatePassword } = require('../../utils/validation');

test('valid email', () => {
	expect(validateEmail('test@example.com')).toBe(true);
});

test('invalid email', () => {
	expect(validateEmail('invalid-email')).toBe(false);
});

test('valid password', () => {
	expect(validatePassword('StrongPass123!')).toBe(true);
});

test('invalid password', () => {
	expect(validatePassword('weak')).toBe(false);
});