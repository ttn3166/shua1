const fs = require('fs');
const path = require('path');

const languagePath = path.join(__dirname, '..', '..', 'assets', 'languages.json');

function loadLanguages() {
  const raw = fs.readFileSync(languagePath, 'utf8');
  return JSON.parse(raw);
}

module.exports = { loadLanguages };
