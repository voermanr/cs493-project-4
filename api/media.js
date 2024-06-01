const {GridFSBucket, ObjectId} = require("mongodb");
const {getDB} = require("../lib/mongoConnection");
const router = require('express').Router();

exports.router = router

async function sendImageFromBucket(imageId, bucketName, req, res, next) {
    try {
        const gridFSBucket = new GridFSBucket(getDB(), {
            bucketName: bucketName,
        });

        const files = await gridFSBucket.find({
            _id: new ObjectId(imageId)
        }).toArray();

        const file = files[0];

        if (file && file.length > 0) {
            res.type(file.metadata.contentType)
            //console.log('\t> res.type: ', res.type)
            const gridFSBucketReadStream = gridFSBucket.openDownloadStreamByName(file.filename);
            gridFSBucketReadStream.pipe(res)
        } else {
            res.status(404).json({error: "Photo not phound for download!"});
        }
    } catch (e) {
        next(e);
    }
}

router.get('/:bucketname/:thumbid.:ext', async (req, res, next) => {
    await sendImageFromBucket(req.params.thumbid, req.params.bucketname, req, res, next);
});
