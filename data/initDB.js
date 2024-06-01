const {MongoClient} = require("mongodb");
const bcrypt = require("bcrypt");

module.exports = async function () {

    let client = null;

    try {
        const mongoURL = `mongodb://${process.env.MONGO_INITDB_ROOT_USERNAME}:${process.env.MONGO_INITDB_ROOT_PASSWORD}` +
            `@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/admin`
        client = await MongoClient.connect(mongoURL,
            { serverSelectionTimeoutMS: 30000 }
        );

        const db = client.db();
        await db.command({
            createUser: "dude",
            pwd: "hunter2",
            roles: [{role: "readWrite", db: process.env.MONGO_DB_NAME}]
        });
    }
    catch (e) {
        console.error("Error creating first user.");
        throw e;
    }

    const db = client.db(process.env.MONGO_DB_NAME);

    try {
        const result = await db.collection("users").insertOne({
            username: "admin",
            password: await bcrypt.hash("admin", 10),
            email: "admin@gmail.com",
            admin: true,
        });

    } catch (e) {
        throw e;
    }

    await client.close();
}
