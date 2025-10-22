const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function validateEmail(email) {
    if (typeof email !== 'string') return false;
    return EMAIL_REGEX.test(email);
}

function validatePassword(password) {
    const s = String(password);
    if (s.length < 8) return false;
    if (!/[A-Z]/.test(s)) return false;
    if (!/[a-z]/.test(s)) return false;
    if (!/[0-9]/.test(s)) return false;
    if (!/[!@#$%^&*()\-+]/.test(s)) return false;
    return true;
}

module.exports = { validateEmail, validatePassword };