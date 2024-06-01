const jwt = require('jsonwebtoken')

async function isAuthenticated(req, res, next) {
    const authHeader = req.get('Authorization') || '';
    const headerParts = authHeader.split(' ');

    const token = headerParts[0] === "Bearer" ? headerParts[1]: null;

    //TODO: this doesn't accurately work as I can send tokens that look like "Bearer"
    if (token === null) {
        res.status(401).json({error: 'No token provided'});
    }
    else {
        try {
            req.username = await jwt.verify(token, process.env.JWT_SECRET).sub;

            //TODO verify that user actually is registered.
            next();
        } catch (err) {
            console.error(err);
            res.status(401).json({error: "Invalid token"});
        }
    }
}

function generateAuthToken (username) {
    return  jwt.sign({
        sub: username
    }, process.env.JWT_SECRET)
}

module.exports = { isAuthenticated, generateAuthToken }