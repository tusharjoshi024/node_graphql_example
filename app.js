const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const {v4: uuidv4} = require('uuid');
const {ApolloServer} = require('apollo-server-express');
const jwt = require('jsonwebtoken');

const typeDefs = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const {clearImage} = require('./util/file');

const app = express();

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + "-" + file.originalname);
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
};

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json()); // application/json
app.use(
    multer({storage: fileStorage, fileFilter: fileFilter}).single('image')
);
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Methods',
        'OPTIONS, GET, POST, PUT, PATCH, DELETE'
    );
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});


app.put('/post-image', (req, res, next) => {
    if (!req.isAuth) {
        throw new Error('Not authenticated!');
    }
    if (!req.file) {
        return res.status(200).json({message: 'No file provided!'});
    }
    if (req.body.oldPath) {
        clearImage(req.body.oldPath);
    }
    return res
        .status(201)
        .json({message: 'File stored.', filePath: req.file.path});
});

// GraphQL: Schema
const SERVER = new ApolloServer({
    typeDefs: typeDefs,
    resolvers: graphqlResolver,
    context: ({req}) => {
        const authHeader = req.get('Authorization');
        if (!authHeader) {
          return {isAuth: false, userId: ''};
        }
        const token = authHeader.split(' ')[1];
        let decodedToken;
        try {
            decodedToken = jwt.verify(token, 'somesupersecretsecret');
        } catch (err) {
            console.log(err);
        }
        if (!decodedToken) {
          return {isAuth: false, userId: ''}
        } else {
            return {isAuth: true, userId: decodedToken.userId};
        }
    },
    playground: {
        endpoint: `http://localhost:8080/graphql`,
        settings: {
            'editor.theme': 'light'
        }
    }
});

SERVER.applyMiddleware({
    app: app
});

app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({message: message, data: data});
});

mongoose
    .connect(
        'mongodb://localhost:27017/restExample?authSource=admin', {
            useNewUrlParser: true, useUnifiedTopology: true
            // user: 'root',
            // pass: 'example'
        }
    )
    .then(result => {
        app.listen(8080);
    })
    .catch(err => {
        console.log('Cant connect to MongoDB');
        console.log(err);
    });