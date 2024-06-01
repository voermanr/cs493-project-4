const newman = require('newman');

const env = 'jwt.postman_environment.json';
const collections = [
    { collection: 'adminUsers.postman_collection.json', environment: env },
    { collection: 'users.postman_collection.json', environment: env },
    { collection: 'businesses.postman_collection.json', environment: env },
    { collection: 'photos.postman_collection.json', environment: env },
    { collection: 'reviews.postman_collection.json', environment: env },
];

const runCollection = (collection, environment) => {
    return new Promise((resolve, reject) => {
        newman.run({
            collection: require(`./${collection}`),
            environment: require(`./${environment}`),
            reporters: 'cli'
        }, (err, summary) => {
            if (err) { reject(err); }
            else { resolve(summary); }
        });
    });
};

const runAllCollections = async () => {
    for (const { collection, environment } of collections) {
        try {
            console.log(`Running collection: ${collection}`);
            await runCollection(collection, environment);
            console.log(`Finished collection: ${collection}`);
        } catch (err) {
            console.error(`Error running collection: ${collection}`, err);
        }
    }
};


runAllCollections();
