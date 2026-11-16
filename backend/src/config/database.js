const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'data', 'store.json');

const ensureDataFile = () => {
  if (!fs.existsSync(dataFile)) {
    fs.mkdirSync(path.dirname(dataFile), { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify({ users: [], posts: [] }, null, 2));
  }
};

const readDb = () => {
  ensureDataFile();
  const raw = fs.readFileSync(dataFile, 'utf8');

  try {
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.users) || !Array.isArray(data.posts)) {
      throw new Error('The data file must contain users and posts arrays.');
    }
    return data;
  } catch (error) {
    throw new Error(`Unable to read the data file: ${error.message}`);
  }
};

const writeDb = (data) => {
  ensureDataFile();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

module.exports = { readDb, writeDb };
