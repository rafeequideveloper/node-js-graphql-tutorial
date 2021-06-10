const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

exports.signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed');
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;
    const status = 'I am new';
    const createdAt = new Date();
    try {
        const hashedPw = await bcrypt.hash(password, 12);
        const user = new User(null, email, hashedPw, name, status, createdAt);
        const result = await user.save();
        res.status(201).json({
            message: 'user created',
            userId: result[0].insertId
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}


exports.login = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    try {
        let loadedUserData = await User.findByEmail(email);
        let loadedUser;
        if (loadedUserData[0].length == 0) {
            const error = new Error('A user with this email could not be found');
            error.statusCode = 500;
            throw error;
        }
        loadedUser = loadedUserData[0][0];
        const isEqual = await bcrypt.compare(password, loadedUserData[0][0].password);
        if (!isEqual) {
            const error = new Error('Wrong password');
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
        res.status(200).json({ token: token, userId: loadedUser.id.toString() })
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getUserStatus = async (req, res, next) => {
    try {
        const usrLength = await User.findById(req.userId);
        if (usrLength[0].length == 0) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }
        res.status(200).json({
            status: usrLength[0][0].status
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.updateUserStatus = async (req, res, next) => {
    const newStatus = req.body.status;
    try {
        const usrLength = await User.findById(req.userId);
        if (usrLength[0].length == 0) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }
        await User.update(newStatus, usrLength[0][0].id);
        res.status(200).json({ message: 'User updated.' });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
}