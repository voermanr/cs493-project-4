const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');
const mongoConnection = require('../lib/mongoConnection')
const {isAuthenticated} = require("../lib/authenicator");
const {isOwner} = require("../lib/authorizer");
const {ObjectId, GridFSBucket} = require("mongodb");
const multer = require('multer');
const crypto = require("crypto");
const streamifier = require('streamifier');

const {getDB} = require("../lib/mongoConnection");
const getChannel = require("../lib/rabbiter");

exports.router = router;

const queueName = 'images'
const bucketName = 'photos'

/* Schema describing required/optional fields of a photo object. */
const photoSchema = {
  file: { required: true },
  userid: { required: true },
  businessid: { required: true },
  caption: { required: false }
};


const imageTypes = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
};


function saveImage(image, metadata) {
  //console.log('image:', image)

  return new Promise((resolve, reject) => {
    const bucket = new GridFSBucket(mongoConnection.getDB(), {
      bucketName: bucketName,
    });

    const uploadStream = bucket.openUploadStream(image.filename, {metadata: metadata});
    streamifier.createReadStream(image.buffer).pipe(uploadStream)
        .on('error', (err) => { reject(err) })
        .on('finish', async () => {
          const channel = await getChannel(queueName);
          channel.sendToQueue('images', Buffer.from(uploadStream.id.toString()));
          //console.log(`\t > sent message to ${channel}.`);
          resolve(uploadStream.id)
        });
  })
}


const upload = multer({
  storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
      cb(null, !!imageTypes[file.mimetype]);
    }
  });


/* Route to fetch info about a specific photo. */
router.get('/:photoid', async (req, res, next) => {
  let photo;

  try {
    const bucket = new GridFSBucket(getDB(), { bucketName: bucketName })
    photo = await bucket.find({
      _id: new ObjectId(req.params.photoid)
    }).toArray()
    //console.log('photo:', photo)
  }
  catch (e) {
    next(e)
  }

  if (photo) {
    // DONE: ROUTE COVERED
    res.status(200).json(photo[0]);
  }
  else {
    // TODO: cover route
    res.status(404).json( {error: "Photo not phound!"});
  }
});


/*
ROUTES BELOW REQUIRE AUTHENTICATION
*/
router.use(isAuthenticated);


/* Route to create a new photo. */
router.post('/', upload.single('image'), async (req, res, next) => {
  if (req.file && req.body) {
    const metadata = extractValidFields(req.body, photoSchema);
    metadata.contentType = req.file.mimetype;
    //console.log('\t> mimetype: ', req.file.mimetype);
    req.file.filename = `${crypto.randomBytes(16).toString('hex')}.${imageTypes[req.file.mimetype]}`;

    try {
      const id = await saveImage(req.file, metadata);
      console.log("id:", id);
      res.status(201).json({
        _id: id,
        links: {
          photo: id,
          business: `/businesses/${req.body.businessid}`
        }
      })
    } catch (e) {
      next(e);
    }
}})

/*
ROUTES BELOW REQUIRE AUTHORIZATION
 */
router.use(isOwner);

/* Route to update a photo. */
/* router.put('/:photoid', async (req, res, next) => {
  let photo;
  const collection = mongoConnection.getDB().collection("photos");
  const photoId = req.params.photoid;

  try {
    photo = await collection
        .findOne({ _id: new ObjectId(photoId)});
  }
  catch (e) { next(e); }

  if (photo) {
    if (validateAgainstSchema(req.body, photoSchema)) {

       //Make sure the updated photo has the same businessid and userid as
       //the existing photo.

      const updatedPhoto = extractValidFields(req.body, photoSchema);
      const existingPhoto = photo;

      if (existingPhoto && updatedPhoto.businessid === existingPhoto.businessid && updatedPhoto.userid === existingPhoto.userid) {
        try {
          await collection.updateOne(
              { _id: photoId },
              { $set: updatedPhoto }
          );
          // DONE: route covered
          res.status(200).json({
            _id: photoId,
            links: {
              photo: `/photos/${photoId}`,
              business: `/businesses/${updatedPhoto.businessid}`
            }
          });
        }
        catch (e) {
          next(e);
        }
      } else {
        // TODO: cover route
        res.status(403).json({
          error: "Updated photo cannot modify businessid or userid"
        });
      }
    } else {
      // TODO: cover route
      res.status(400).json({
        error: "Request body is not a valid photo object"
      });
    }
  } else {
    next();
  }
});
*/

/* Route to delete a photo. */
router.delete('/:photoid', async (req, res, next) => {
  try {
    const result = await mongoConnection.getDB().collection("photos")
        .deleteOne({ _id: new ObjectId(req.params.photoid) });
    if (result.deletedCount === 0) {
      // TODO: cover route
      return res.status(404).json({ error: 'Photo not phound!}' })
    }
    // TODO: cover route
    res.status(200).end();
  }
  catch (e) {
    next(e);
  }
});