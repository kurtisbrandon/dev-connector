const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');
const Post = require('../../models/Post');
const Profile = require('../../models/Profile');
const User = require('../../models/User');

// @route   POST api/posts
// @desc    Create a post
// @access  Private
router.post('/',
  [auth,
    [
      check('text', 'Text is required').not().isEmpty()
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const user = await User.findById(req.user.id).select('-password');

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      });

      const post = await newPost.save();

      res.json(post);

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

// @route   GET api/posts
// @desc    Get all posts
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/posts/:id
// @desc    Get post by id
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ msg: 'Post not found' });

    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') res.status(404).json({ msg: 'Post not found' });

    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/posts
// @desc    Delete post by id
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ msg: 'Post not found' });

    if (post.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not your post' });

    await post.remove();

    res.json({ msg: 'Post deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') res.status(404).json({ msg: 'Post not found' });

    res.status(500).send('Server Error');
  }
});

// @route   PUT api/posts/:id/tlike
// @desc    Toggle post liked status
// @access  Private
router.put('/:id/tlike', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (post.likes.filter(liker => liker.id === req.user.id).length === 0) {
      // If not currently liked: add like
      post.likes.unshift(req.user.id);
    } else {
      // If was already liked: remove like
      post.likes = post.likes.filter(liker => liker.id !== req.user.id);
    }
    await post.save();

    res.json(post.likes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/posts/:id/
// @desc    Comment on a post
// @access  Private
router.post('/:id',
  [
    auth,
    [
      check('text', 'Text is required').not().isEmpty()
    ],
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const user = await User.findById(req.user.id).select('-password');
      const post = await Post.findById(req.params.id);

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };

      post.comments.unshift(newComment);

      await post.save();

      res.json(post.comments);

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });


// @route   DELETE api/posts/:p_id/:c_id/
// @desc    Delete post by id
// @access  Private
router.delete('/:p_id/:c_id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.p_id);

    if (!post) return res.status(404).json({ msg: 'Post not found' });

    const commentsMatched = post.comments.filter(cmt => cmt.id === req.params.c_id);
    if (commentsMatched.length !== 1) return res.status(404).json({ msg: 'Comment not found' });
    const comment = commentsMatched[0];

    if (comment.user.toString() !== req.user.id) return res.status(401).json({ msg: 'Not your comment' });

    post.comments = post.comments.filter(cmt => cmt.id !== req.params.c_id);

    await post.save();

    res.json({ msg: 'Comment deleted' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') res.status(404).json({ msg: 'Couldn\'t locate resource' });

    res.status(500).send('Server Error');
  }
});

module.exports = router;