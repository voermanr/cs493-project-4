const {GridFSBucket, ObjectId} = require("mongodb");
const {getDB} = require("../lib/mongoConnection");
const router = require('express').Router();

exports.router = router

router.get('/photos/:photoid.:ext', async (req, res, next) => {
    if (req.params.ext === 'png' || req.params.ext === 'jpg') {
        const photoid = await new ObjectId(req.params.photoid)

        try {
            const gridFSBucket = new GridFSBucket(getDB(), {
                bucketName: 'images',
            });

            const files = await gridFSBucket.find({
                _id: photoid
            }).toArray();

            const file = files[0];
            //console.log('file:', file)
            //console.log('file.metadata:', file.metadata)

            if (file && file.length > 0 && file.metadata.contentType.split('/')[1] === req.params.ext) {
                res.type(file.metadata.contentType)
                const gridFSBucketReadStream = gridFSBucket.openDownloadStreamByName(file.filename);
                //console.log('gridFSBucketReadStream:', gridFSBucketReadStream);
                gridFSBucketReadStream.pipe(res)
            }
            else {
                res.status(404).json( {error: "Photo not phound for download!"});
            }
        }
        catch (e) {
            next(e);
        }
    }
})