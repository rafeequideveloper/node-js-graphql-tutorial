const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Posts = require('../models/post');

const { clearImage } = require('../util/file');

module.exports = {
    createUser: async function ({ userInput }, req) {
        //   const email = args.userInput.email;
        const errors = [];
        if (!validator.isEmail(userInput.email)) {
            errors.push({ message: 'E-mail is invalid.' });
        }

        if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, { min: 5 })) {
            errors.push({ message: 'Password is too short.' });
        }

        if (errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.code = 422;
            throw error;
        }
        let loadedUserData = await User.findByEmail(userInput.email);
        if (loadedUserData[0].length > 0) {
            const error = new Error('User exists already!');
            throw error;
        }
        const hashedPw = await bcrypt.hash(userInput.password, 12);
        const email = userInput.email;
        const name = userInput.name;
        const password = hashedPw;
        const status = 'I am new';
        const createdAt = new Date();
        const user = new User(null, email, hashedPw, name, status, createdAt);
        const result = await user.save();
        return {
            id: result[0].insertId.toString(),
            email: userInput.email,
            name: userInput.name,
            status: status
        };
    },
    login: async function ({ email, password }) {
        let loadedUserData = await User.findByEmail(email);
        let loadedUser;
        if (loadedUserData[0].length == 0) {
            const error = new Error('User not found.');
            error.statusCode = 401;
            throw error;
        }
        loadedUser = loadedUserData[0][0];
        const isEqual = await bcrypt.compare(password, loadedUserData[0][0].password);
        if (!isEqual) {
            const error = new Error('Password is incorrect.');
            error.statusCode = 401;
            throw error;
        }
        const token = jwt.sign(
            {
                email: loadedUser.email,
                userId: loadedUser.id.toString(),
                userName: loadedUser.name
            },
            'somesupersecretsecret',
            { expiresIn: '1h' }
        );
        return { token: token, userId: loadedUser.id.toString(), userName: loadedUser.name }
    },
    createPost: async function ({ postInput }, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }

        const errors = [];
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: 'Title is invalid' });
        }

        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
            errors.push({ message: 'Content is invalid' });
        }

        if (errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.code = 422;
            throw error;
        }
        const imageUrlString = postInput.imageUrl;
        const imageUrl = imageUrlString.replace('images__', 'images/');
        const title = postInput.title;
        const content = postInput.content;
        const creator = req.userName;
        const createdAt = new Date();
        const userId = req.userId;
        const usrLength = await User.findById(userId);
        if (usrLength[0].length == 0) {
            const error = new Error('Invalid user.');
            error.statusCode = 401;
            throw error;
        }

        const post = new Posts(null, title, content, creator, createdAt, imageUrl, userId);
        const insertedPostId = await post.save();
        return {
            id: insertedPostId[0].insertId,
            title: title,
            content: content,
            creator: req.userName,
            createdAt: createdAt.toISOString(),
            imageUrl: imageUrl
        }
    },
    posts: async function ({ page }, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }
        if (!page) {
            page = 1;
        }
        const perPage = 2;
        let skip = (page - 1) * perPage
        let limit = perPage;
        let totalArray = await Posts.postCount();
        const totalItems = totalArray[0][0].numRows;
        let postsArray = await Posts.fetchAll(limit, skip);
        const postItems = postsArray[0];
        return {
            posts: postItems.map(p => {
                return {
                    id: p.id,
                    title: p.title,
                    content: p.content,
                    imageUrl: p.imageUrl,
                    creator: p.creator,
                    createdAt: p.createdAt.toISOString()
                }
            }),
            totalPosts: totalItems
        }
    },
    post: async function ({ id }, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }

        const postArray = await Posts.findById(id);
        if (postArray[0].length == 0) {
            const error = new Error('No post found!');
            error.statusCode = 404;
            throw error;
        }
        return {
            id: postArray[0][0].id,
            title: postArray[0][0].title,
            content: postArray[0][0].content,
            imageUrl: postArray[0][0].imageUrl,
            creator: postArray[0][0].creator,
            createdAt: postArray[0][0].createdAt.toISOString()
        }
    },
    updatePost: async function ({ id, postInput }, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }

        const postArray = await Posts.findById(id);
        if (postArray[0].length == 0) {
            const error = new Error('No post found!');
            error.statusCode = 404;
            throw error;
        }

        if (req.userId != postArray[0][0].user_id) {
            const error = new Error('Not authorized');
            error.statusCode = 403;
            throw error;
        }
        const errors = [];
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: 'Title is invalid' });
        }

        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
            errors.push({ message: 'Content is invalid' });
        }

        if (errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.code = 422;
            throw error;
        }

        if (postInput.imageUrl !== 'undefined') {
            const imageUrl = postInput.imageUrl;
        }
        imageUrl = postInput.imageUrl;
        const postId = id;
        const title = postInput.title;
        const content = postInput.content;
        const creator = req.userName;
        const createdAt = new Date();

        const post = new Posts(postId, title, content, creator, createdAt, imageUrl);
        await post.update();

        return {
            id: postId,
            title: title,
            content: content,
            imageUrl: imageUrl,
            creator: creator,
            createdAt: createdAt.toISOString()
        }
    },
    deletePost: async function ({ id }, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }

        const postArray = await Posts.findById(id);
        if (postArray[0].length == 0) {
            const error = new Error('No post found!');
            error.statusCode = 404;
            throw error;
        }

        if (req.userId != postArray[0][0].user_id) {
            const error = new Error('Not authorized');
            error.statusCode = 403;
            throw error;
        }
        clearImage(postArray[0][0].imageUrl);
        await Posts.delete(id);
        return true;
    },
    user: async function (args, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }
        const usrLength = await User.findById(req.userId);
        if (usrLength[0].length == 0) {
            const error = new Error('No user found!');
            error.statusCode = 404;
            throw error;
        }
        return {
            id: usrLength[0][0].id,
            name: usrLength[0][0].name,
            email: usrLength[0][0].email,
            password: usrLength[0][0].password,
            status: usrLength[0][0].status
        }
    },
    updateStatus: async function({ status }, req) {
        if (!req.isAuth) {
            const error = new Error('Not authenticated');
            error.code = 401;
            throw error;
        }
        const usrLength = await User.findById(req.userId);
        if (usrLength[0].length == 0) {
            const error = new Error('No user found!');
            error.statusCode = 404;
            throw error;
        }
        await User.update(status, usrLength[0][0].id);
        return {
            id: usrLength[0][0].id,
            name: usrLength[0][0].name,
            email: usrLength[0][0].email,
            password: usrLength[0][0].password,
            status: status
        }
    }
};
