const mongoConnection = require('./mongoConnection');
const {ObjectId} = require("mongodb");

async function isAdmin (req, res, next) {
    const username = req.username;

    try {
        const user = await mongoConnection.getDB()
            .collection('users')
            .findOne({
                username: username,
            });
        if (user) {
            const admin = user.admin;

            if (admin) {
                next();
            } else {
                res.status(401).json({error: 'Unauthorized'});
            }
        }
        else {
            res.status(401).json({error: 'Unauthorized'});
        }
    } catch (e) { next(e); }
}

async function isOwner (req, res, next) {
    const username = req.username;

    let user;
    try {
        user = await mongoConnection.getDB().collection('users').findOne({
            username: username,
        });
    } catch (e) { next(e); }

    let resource;

    if (user && !user.admin) {
        const urlSegments = req.originalUrl.split('/').filter(segment => segment);

        //console.log("\t>> URL Segments:", urlSegments);

        if (urlSegments.length < 2) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }

        const resourceType = urlSegments[urlSegments.length - 2];
        const resourceId = urlSegments[urlSegments.length - 1];

        //console.log("\t>> resourceType:", resourceType);
        //console.log("\t>> resourceId:", resourceId);

        try {
            resource = await mongoConnection.getDB()
                .collection(resourceType)
                .findOne({
                    _id: new ObjectId(resourceId),
                });

            if (!resource) {
                return res.status(404).json({error: 'Resource not found'});
            }

            //console.log("\t>> resource:",resource);
            //console.log("\t>> req.username:", req.username);
            //console.log("\t>> resource.userid:", resource.userid);
            //console.log("\t>> id vs id:", resource.userid !== req.username)
            if (resource.ownerid !== req.username && resource.userid !== req.username) {
                return res.status(403).json({error: 'You do not have access to this resource'});
            }
        } catch (e) { next(e); }
    }
    req.resource = resource;
    next();
}


module.exports = { isAdmin: isAdmin, isOwner: isOwner };