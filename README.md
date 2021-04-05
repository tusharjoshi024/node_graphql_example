# GraphQL API example with NodeJS and MongoDB

This code is an example of GraphQL server, backend for any modern web app. We are leveraging the `apollo-server-express` library for this development.

## Steps to set up and build the project

1. Checkout the code

2. Use npm install to resolve dependencies

  #####
    npm install

3. Go to the root of this project and start the docker image of mongo

  #####
    docker-compose up -d

4. Once the docker image is up, we can start the server.

  #####
    npm start

## Important inclusions in this example to consider

#### 1. Mongoose library and connection with MongoDB

  ###### app.js

    mongoose
    .connect(
        'mongodb://localhost:27017/restExample?authSource=admin', {
            useNewUrlParser: true,
            user: 'root',
            pass: 'example'
        }
    )
    .then(result => {
        app.listen(8080);
    })
    .catch(err => {
        console.log('Cant connect to MongoDB');
        console.log(err);
    });

  ###### Data models example - post.js
    const mongoose = require('mongoose');
    const Schema = mongoose.Schema;

    const postSchema = new Schema(
    {
        title: {
            type: String,
            required: true
        },
        imageUrl: {
            type: String,
            required: false
        },
        ...
    },
    
    {timestamps: true});

    module.exports = mongoose.model('Post', postSchema);

#### 2. Authentication filter and its usage
  ###### app.js
    ...
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
    ...

  ###### graphql/resolvers.js
    ...
    RootMutation:{
        ...
        createPost: async function (root, {postInput}, req) {
            if (!req.isAuth) {
                const error = new Error('Not authenticated!');
                error.code = 401;
                throw error;
            }
    ...

#### 3. File Operations 
  ###### app.js
    ...
    const path = require('path');
    const multer = require('multer');
    const { v4 : uuidv4 } = require('uuid');
    ...
    const fileStorage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'images');
        },
        filename: (req, file, cb) => {
            cb(null, uuidv4()+"-"+file.originalname);
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
    ...
    app.use(
        multer({storage: fileStorage, fileFilter: fileFilter}).single('image')
    );
    app.use('/images', express.static(path.join(__dirname, 'images')));
    ...


#### 4. CORS Fixes 
  ###### app.js 
    ...
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader(
            'Access-Control-Allow-Methods',
            'OPTIONS, GET, POST, PUT, PATCH, DELETE'
        );
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        next();
    });
    ...

#### 5. Generic error handler
  ###### app.js
    ...
    app.use((error, req, res, next) => {
        console.log(error);
        const status = error.statusCode || 500;
        const message = error.message;
        const data = error.data;
        res.status(status).json({message: message, data: data});
    });
    ...

## Sample queries

#### 1. Create a new User

  ###### 
    mutation{
        createUser(userInput:{
            name:"Tester",
            email:"tester1@test.com",
            password:"tester"
        }){
            name
        }
    }

#### 2. Login

  ###### 
    query{
        login(email:"tester1@test.com",password:"tester"){
            token
        }
    }

#### 3. Retrive list of all posts/articles

  ###### 
    query{
        posts{
            totalPosts
            posts{
                _id
                title
                content
                creator{
                    name
                }
            }
        }
    }
