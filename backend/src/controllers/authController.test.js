const assert = require('node:assert/strict');
const { beforeEach, test } = require('node:test');

const databasePath = require.resolve('../config/database');
const database = { users: [], posts: [] };
require.cache[databasePath] = {
  id: databasePath,
  filename: databasePath,
  loaded: true,
  exports: {
    readDb: () => database,
    writeDb: (updated) => {
      database.users = updated.users;
      database.posts = updated.posts;
    }
  }
};

const { loginUser, registerUser } = require('./authController');

beforeEach(() => {
  database.users = [];
  database.posts = [];
});

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

const next = (error) => {
  if (error) throw error;
};

test('registration hashes passwords and the account can log in', async () => {
  const registrationResponse = createResponse();
  await registerUser({
    body: {
      name: 'Test User',
      email: 'test@example.com',
      hometown: 'Riverside',
      password: 'secret123'
    }
  }, registrationResponse, next);

  assert.equal(registrationResponse.statusCode, 201);
  assert.match(database.users[0].password, /^scrypt\$/);
  assert.notEqual(database.users[0].password, 'secret123');

  const loginResponse = createResponse();
  await loginUser({
    body: { email: 'TEST@example.com', password: 'secret123' }
  }, loginResponse, next);

  assert.equal(loginResponse.statusCode, 200);
  assert.equal(loginResponse.body.user.email, 'test@example.com');
});

test('successful login upgrades a legacy plaintext password', async () => {
  database.users.push({
    id: 'legacy-user',
    name: 'Legacy User',
    email: 'legacy@example.com',
    hometown: 'Riverside',
    password: 'secret123'
  });

  const invalidResponse = createResponse();
  await loginUser({
    body: { email: 'legacy@example.com', password: 'wrong-password' }
  }, invalidResponse, next);

  assert.equal(invalidResponse.statusCode, 401);
  assert.equal(database.users[0].password, 'secret123');

  const response = createResponse();
  await loginUser({
    body: { email: 'legacy@example.com', password: 'secret123' }
  }, response, next);

  assert.equal(response.statusCode, 200);
  assert.match(database.users[0].password, /^scrypt\$/);
  assert.notEqual(database.users[0].password, 'secret123');
});
