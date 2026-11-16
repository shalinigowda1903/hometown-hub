const crypto = require('crypto');
const { promisify } = require('util');
const { readDb, writeDb } = require('../config/database');

const scrypt = promisify(crypto.scrypt);
const normalizeEmail = (email = '') => String(email).trim().toLowerCase();
const PASSWORD_ALGORITHM = 'scrypt';
const PASSWORD_KEY_LENGTH = 64;

const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  return `${PASSWORD_ALGORITHM}$${salt}$${key.toString('hex')}`;
};

const verifyPassword = async (password, savedPassword) => {
  if (typeof savedPassword !== 'string') {
    return { matches: false, needsRehash: false };
  }

  const [algorithm, salt, hash] = savedPassword.split('$');
  if (algorithm !== PASSWORD_ALGORITHM) {
    return {
      matches: savedPassword === password,
      needsRehash: savedPassword === password
    };
  }

  if (!/^[\da-f]{32}$/i.test(salt || '') || !/^[\da-f]{128}$/i.test(hash || '')) {
    return { matches: false, needsRehash: false };
  }

  const savedKey = Buffer.from(hash, 'hex');
  const candidateKey = await scrypt(password, salt, savedKey.length);
  return {
    matches: crypto.timingSafeEqual(candidateKey, savedKey),
    needsRehash: false
  };
};

const registerUser = async (req, res, next) => {
  const { name, email, hometown, password } = req.body || {};

  if (!name || !email || !hometown || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const safeName = String(name).trim();
  const safeHometown = String(hometown).trim();
  const safeEmail = normalizeEmail(email);

  if (safeName.length < 2) {
    return res.status(400).json({ message: 'Name must be at least 2 characters long.' });
  }

  if (safeHometown.length < 2) {
    return res.status(400).json({ message: 'Hometown must be at least 2 characters long.' });
  }

  if (String(password).length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  try {
    const db = readDb();
    const exists = db.users.some((user) => user.email === safeEmail);

    if (exists) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const newUser = {
      id: crypto.randomUUID(),
      name: safeName,
      email: safeEmail,
      hometown: safeHometown,
      password: await hashPassword(String(password))
    };

    db.users.push(newUser);
    writeDb(db);

    return res.status(201).json({
      message: 'User registered successfully.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        hometown: newUser.hometown
      }
    });
  } catch (error) {
    return next(error);
  }
};

const loginUser = async (req, res, next) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const db = readDb();
    const user = db.users.find((item) => item.email === normalizeEmail(email));
    const verification = user
      ? await verifyPassword(String(password), user.password)
      : null;

    if (!user || !verification || !verification.matches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (verification.needsRehash) {
      user.password = await hashPassword(String(password));
      writeDb(db);
    }

    return res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hometown: user.hometown
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { registerUser, loginUser };
