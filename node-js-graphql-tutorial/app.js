const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const db = require('./util/database');
const multer = require('multer');
const graphql = require('express-graphql');
const cors = require('cors');

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');

const auth = require('./middleware/auth');
const { clearImage } = require('./util/file');

const { v4: uuidv4 } = require('uuid');

const app = express();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images')
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4());
    }
});

const fileFilter = (req, file, cb) => {
    if (
        file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    } else {
        cb(null, false);
    }
}

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json

app.use(
    multer({ storage: fileStorage, fileFilter: fileFilter }).single('image')
)

app.use('/images', express.static(path.join(__dirname, 'images')))

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    // if(req.method === 'OPTIONS') {
    //     return res.status(200);
    // }
    next();
});

app.use(cors());

app.use(auth);

app.put('/post-image', (req, res, next) => {
    if (!req.isAuth) {
        throw new Error('Not authenticated!');
    }

    if (!req.file) {
        return res.status(200).json({ message: 'No file provided!' });
    }

    if (req.body.oldPath) {
        clearImage(req.body.oldPath);
    }
    return res.status(201).json({ message: 'File stored.', filePath: req.file.path })
})

app.use('/graphql', graphql.graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(err) {
        if (!err.originalError) {
            return err;
        }
        const data = err.originalError.data;
        const message = err.message || 'An error occured.';
        const code = err.originalError.code || 500;
        return { message: message, status: code, data: data };
    }
}));

app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({ message: message, data: data })
})

app.listen(3000);

// const clearImage = filePath => {
//     filePath = path.join(__dirname, '..', filePath);
//     fs.unlink(filePath, err => {
//         console.log(err)
//     });
// }
