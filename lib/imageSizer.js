const getChannel = require("./rabbiter");
const {GridFSBucket, ObjectId} = require("mongodb");
const sharp = require('sharp')
const {getDB} = require("./mongoConnection");
const mongoConnection = require("./mongoConnection");
const streamifier = require("streamifier");

const queueName = 'images';
const bucketName = "photos";

const listen = async () => {
    const channel = await getChannel(queueName);
    console.log('\t>imageSizer >> Got a channel.');

    channel.consume(queueName, async (msg) => {
        if (msg) {
            const photoId = msg.content.toString();
            console.log(`\t>imageSizer: I'm trying to find the image '${photoId}'...`)
            const bucketName = 'photos';
            const downloadStream = new GridFSBucket(await getDB(), {
                bucketName: bucketName
            }).openDownloadStream(new ObjectId(photoId));

            console.log('\t>imageSizer >> Got a download stream...')

            const imageData = [];
            process.stdout.write('Trying to push in some data..')
            downloadStream.on('data', (data) => {
                process.stdout.write('.')
                imageData.push(data);
            });
            downloadStream.on('end', async () => {
                const buffer = Buffer.concat(imageData);
                process.stdout.write('done!\n')
                console.log('Trying to sharp a thumbnail');
                const thumbnailBuffer = await sharp(buffer)
                    .resize(100, 100)
                    .jpeg()
                    .toBuffer();
                console.log('thumbnailBuffer:', thumbnailBuffer);

                const thumbnail = {
                    buffer: thumbnailBuffer,
                    photoId: new ObjectId(photoId),
                }

                await saveThumbnail(thumbnail);
            });
        }
        channel.ack(msg);
    });
}

function saveThumbnail(thumbnail) {
    return new Promise((resolve, reject) => {
        const thumbnailsBucket = new GridFSBucket(mongoConnection.getDB(), {
            bucketName: 'thumbnails',
        });
        console.log('Got a thumbnail bucket...')

        console.log(`Trying to make an upload stream for ${thumbnail.photoId}`)

        const uploadStream = thumbnailsBucket.openUploadStream(thumbnail.photoId, {
            metadata: {
                photoId: thumbnail.photoId,
                contentType: 'image/jpeg'
            }
        });

        console.log('Got an uploadStream')
        streamifier.createReadStream(thumbnail.buffer).pipe(uploadStream)
            .on('error', (err) => { reject(err) })
            .on('finish', async () => {
                try {
                    console.log('Finished piping stream...');

                    const metadataCollection = await getDB().collection(`${bucketName}.files`);
                    console.log('Got a metadata collection for images...')

                    const result = await metadataCollection.updateOne(
                        { _id: new ObjectId(thumbnail.photoId) },
                        { $set: {
                            'metadata.thumbnailId': uploadStream.id
                        }}
                    )

                    if (result.modifiedCount === 1) {
                        console.log(`Successfully updated metadata for file ID: ${thumbnail.photoId}`);
                    } else {
                        console.log(`No file found with ID: ${thumbnail.photoId}`);
                    }

                }
                catch(err) {
                    reject(err);
                }
                console.log('Finished creating thumbnail with _id: ', uploadStream.id);
                resolve(uploadStream.id)
            });
    })
}

module.exports.listen = listen;