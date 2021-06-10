const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator/check');

const io = require('../socket');

const Posts = require('../models/post');
const { post } = require('../routes/feed');

//implement async and await
exports.getPosts = async (req, res, next) => {
  try {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    let skip = (currentPage - 1) * perPage
    let limit = perPage;
    let totalArray = await Posts.postCount();
    const totalItems = totalArray[0][0].numRows;
    let postsArray = await Posts.fetchAll(limit, skip);
    const postItems = postsArray[0];
    res.status(200).json({
      message: 'Fetched posts successfully.',
      posts: postItems,
      totalItems: totalItems
    })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const postArray = await Posts.findById(postId);
    if (postArray[0].length == 0) {
      const error = new Error('Could not find post');
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: 'Post fetched.', post: postArray[0][0] });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
}

exports.createPost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error('No image provided');
    error.statusCode = 422;
    throw error;
  }
  const imageUrl = req.file.path.replace("\\", "/");
  const title = req.body.title;
  const content = req.body.content;
  const creator = req.userName;
  const createdAt = new Date();
  const userId = req.userId;
  const post = new Posts(null, title, content, creator, createdAt, imageUrl, userId);
  try {
    const insertedPostId = await post.save();
    const postSent = {
      id: insertedPostId[0].insertId,
      title: title,
      content: content,
      creator: req.userName,
      createdAt: createdAt,
      imageUrl: imageUrl
    };
    io.getIO().emit('posts', { action: 'create', post: postSent })
    res.status(201).json({
      message: 'Post created successfully!',
      post: postSent
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed, entered data is incorrect.');
    error.statusCode = 422;
    throw error;
  }
  const postId = req.params.postId;
  const title = req.body.title;
  const content = req.body.content;
  const creator = req.userName;
  const createdAt = new Date();
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path;
  }
  if (!imageUrl) {
    const error = new Error('No file picked.');
    error.statusCode = 422;
    throw error;
  }
  try {
    const findPost = await Posts.findById(postId);
    if (findPost[0].length == 0) {
      const error = new Error('Could not find post');
      error.statusCode = 404;
      throw error;
    }
    if (req.userId != findPost[0][0].user_id) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== findPost[0][0].imageUrl) {
      clearImage(findPost[0][0].imageUrl);
    }
    const post = new Posts(postId, title, content, creator, createdAt, imageUrl);
    await post.update();
    const updatedPost = {
      id: parseInt(postId),
      title: title,
      content: content,
      creator: creator,
      createdAt: new Date(),
      imageUrl: imageUrl
    }
    io.getIO().emit('posts', { action: 'update', post: updatedPost });
    res.status(200).json({
      message: 'Post updated!',
      post: updatedPost
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
}

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  try {
    const findPost = await Posts.findById(postId);
    if (findPost[0].length == 0) {
      const error = new Error('Could not find post');
      error.statusCode = 404;
      throw error;
    }
    if (req.userId != findPost[0][0].user_id) {
      const error = new Error('Not authorized');
      error.statusCode = 403;
      throw error;
    }

    clearImage(findPost[0][0].imageUrl);
    await Posts.delete(postId);
    io.getIO().emit('posts', { action: 'delete', post: postId });
    res.status(200).json({
      message: 'Post Deleted'
    })
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
}

const clearImage = filePath => {
  filePath = path.join(__dirname, '..', filePath);
  fs.unlink(filePath, err => {
    console.log(err)
  });
}