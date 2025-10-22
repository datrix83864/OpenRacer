function formatString(str) {
    if (str.length === 0) {
        return '';
    }
    return str.trim().charAt(0).toUpperCase() + str.trim().slice(1);
}

module.exports = { formatString };