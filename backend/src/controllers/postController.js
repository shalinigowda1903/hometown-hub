const crypto = require('crypto');
const { readDb, writeDb } = require('../config/database');

const getPosts = (req, res) => {
  const db = readDb();
  const posts = db.posts.map((post) => ({
    ...post,
    comments: Array.isArray(post.comments) ? post.comments : []
  }));
  return res.status(200).json({ posts: posts.reverse() });
};

const createPost = (req, res) => {
  const { author, text } = req.body || {};
  const safeAuthor = typeof author === 'string' ? author.trim() : '';
  const safeText = typeof text === 'string' ? text.trim() : '';

  if (!safeAuthor || !safeText) {
    return res.status(400).json({ message: 'Author and post text are required.' });
  }

  if (safeText.length > 5000) {
    return res.status(400).json({ message: 'Post text must be 5,000 characters or fewer.' });
  }

  const db = readDb();
  const newPost = {
    id: crypto.randomUUID(),
    author: safeAuthor,
    text: safeText,
    date: new Date().toISOString(),
    likes: 0,
    comments: []
  };

  db.posts.push(newPost);
  writeDb(db);

  return res.status(201).json({
    message: 'Post created successfully.',
    post: newPost
  });
};

const likePost = (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const postIndex = db.posts.findIndex((post) => post.id === id);

  if (postIndex === -1) {
    return res.status(404).json({ message: 'Post not found.' });
  }

  db.posts[postIndex].likes = (db.posts[postIndex].likes || 0) + 1;
  writeDb(db);

  return res.status(200).json({
    message: 'Post liked successfully.',
    post: db.posts[postIndex]
  });
};

const addComment = (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body || {};
  const safeAuthor = typeof author === 'string' ? author.trim() : '';
  const safeText = typeof text === 'string' ? text.trim() : '';

  if (!safeAuthor || !safeText) {
    return res.status(400).json({ message: 'Author and comment text are required.' });
  }

  if (safeText.length > 1000) {
    return res.status(400).json({ message: 'Comment text must be 1,000 characters or fewer.' });
  }

  const db = readDb();
  const post = db.posts.find((item) => item.id === id);
  if (!post) {
    return res.status(404).json({ message: 'Post not found.' });
  }

  if (!Array.isArray(post.comments)) post.comments = [];
  const comment = {
    id: crypto.randomUUID(),
    author: safeAuthor,
    text: safeText,
    date: new Date().toISOString()
  };
  post.comments.push(comment);
  writeDb(db);

  return res.status(201).json({
    message: 'Comment added successfully.',
    comment
  });
};

module.exports = { getPosts, createPost, likePost, addComment };
