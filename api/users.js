const router = require('express').Router();

exports.router = router;
const mongoConnection = require("../lib/mongoConnection");
const {validateAgainstSchema} = require("../lib/validation");
const bcrypt = require('bcrypt');
const e = require("express");
const { ObjectId } = require("mongodb");
const {generateAuthToken, isAuthenticated} = require("../lib/authenicator");
const {isAdmin} = require("../lib/authorizer");

const userSchema = {
    username: {required: true},
    password: {required: true},
    email: {required: true},
}

/* login route */
router.post('/login', async (req, res, next) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        res.status(400).json({
            status: 'Username and password is required to login, silly.'
        })
    }
    else {
        let authRequester;

        try {
            authRequester = await mongoConnection.getDB()
                .collection("users")
                .findOne({
                    username: username,
                });

        } catch (err) { next(err); }

        if (authRequester) {
            let authenticatedUser;

            try {
                authenticatedUser = await bcrypt.compare(password, authRequester.password);

            } catch (error) {next(error)}

            if (authenticatedUser) {
                const token = await generateAuthToken(authRequester.username);
                res.status(201).send({status: 'successful login', token: token})
            } else { res.status(401).send({status: 'login attempt failed'}) }
        } else {
            res.status(401).send({status: 'user not found.'})
        }
    }
})

router.post('/', isCreatingAdmin, async (req, res, next) => {
    if (validateAgainstSchema(req.body, userSchema)) {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const username = req.body.username;
        const email = req.body.email;
        const admin = req.body.admin || false;

        try {
            mongoConnection.getDB().collection("users").insertOne({
                username: username,
                email: email,
                password: hashedPassword,
                admin: admin,
            }).then(() => {
                /* DONE: route covered */
                res.status(201).json({
                    username: username,
                    email: email,
                    admin: admin,
                });
            });
        }
        catch (e) {
            next(e);
        }
    }
    else {
        /* DONE: route covered */
        res.status(400).json({ error: "Request body does not validate." });
    }
})

router.use(isAuthenticated);

/* get a user by their id */
router.get('/:userid', async (req, res, next) => {
    try {
        const userWithPassword = await mongoConnection.getDB()
            .collection("users")
            .findOne({
                username: req.params.userid
            });

        const {password, ...user} = userWithPassword;
        res.status(200).json(user)
        /* DONE: path covered by test */
    }
    catch (e) { next(e); }
});

/* get a collection for a user */
router.get('/:userid/:collection', async (req, res, next) => {
    try {
        const collection = req.params.collection;

        const ownerId = req.params.userid;

        const userCollection = await mongoConnection.getDB().collection(collection)
            .find({ $or: [
                { ownerid: ownerId },
                { userid: ownerId }
            ]}).toArray();

        /* TODO: cover route */
        res.status(200).json({
        [collection]: userCollection
        });
    }
    catch (e) {
        next(e);
    }
});

function isCreatingAdmin(req, res, next) {
    if (req.body.admin === true) {
        return isAuthenticated(req, res, (err) => {
            if (err) return next(err);
            return isAdmin(req, res, next);
        });
    }
    next();
}

