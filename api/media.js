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
            _id: imageId
        }).toArray();

        const file = files[0];

        if (file && file.length > 0 && file.metadata.contentType.split('/')[1] === req.params.ext) {
            res.type(file.metadata.contentType)
            const gridFSBucketReadStream = gridFSBucket.openDownloadStreamByName(file.filename);
            gridFSBucketReadStream.pipe(res)
        } else {
            res.status(404).json({error: "Photo not phound for download!"});
        }
    } catch (e) {
        next(e);
    }
}

router.get('/photos/:photoid.:ext', async (req, res, next) => {
    if (req.params.ext === 'png' || req.params.ext === 'jpg') {
        const photoid = await new ObjectId(req.params.photoid)
        await sendImageFromBucket(photoid, 'images', req, res, next);
    }
})

router.get('/media/thumbnails/:thumbid.jpg', async (req, res, next) => {
    const thumbId = new ObjectId(req.params.thumbid);
    await sendImageFromBucket(thumbId, 'thumbnails', req, res, next)
});
