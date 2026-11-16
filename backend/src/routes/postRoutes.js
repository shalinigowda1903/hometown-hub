const express = require('express');
const { getPosts, createPost, likePost, addComment } = require('../controllers/postController');

const router = express.Router();

router.get('/', getPosts);
router.post('/', createPost);
router.post('/:id/like', likePost);
router.post('/:id/comments', addComment);

module.exports = router;
