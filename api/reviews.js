const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

const mongoConnection = require("../lib/mongoConnection");
const {isAuthenticated} = require("../lib/authenicator");
const {ObjectId} = require("mongodb");
const {isOwner} = require("../lib/authorizer");

exports.router = router;


/* Schema describing required/optional fields of a review object. */
const reviewSchema = {
  userid: { required: true },
  businessid: { required: true },
  dollars: { required: true },
  stars: { required: true },
  review: { required: false }
};

/* Route to fetch info about a specific review. */
router.get('/:reviewid', async (req, res, next) => {
  let review

  try {
    const reviewID = req.params.reviewid;
    review = await mongoConnection.getDB().collection("reviews").findOne({
      _id: reviewID
    })
  }
  catch (e) {
    res.status(500).json({
      error: `Error getting review.\nError: \t${e}`
    })
  }

  if (review) {
    res.status(200).json(review);
  } else {
    next();
  }
});

router.use(isAuthenticated);

/* Route to create a new review. */
router.post('/', async (req, res, next) => {
  if (validateAgainstSchema(req.body, reviewSchema)) {

    const review = extractValidFields(req.body, reviewSchema);

    /*
     * Make sure the user is not trying to review the same business twice.
     */
    const existingReview = await mongoConnection.getDB().collection("reviews")
        .findOne({
          businessid: new ObjectId(review.businessid),
          userid: review.userid
        })

    if (existingReview) {
      // TODO: cover route
      res.status(403).json({
        error: "User has already posted a review of this business"
      });
    } else {
      // DONE: route covered
      const document = await mongoConnection.getDB().collection("reviews")
          .insertOne(review);
      res.status(201).json({
        _id: document.insertedId,
        links: {
          review: `/reviews/${document.insertedId}`,
          business: `/businesses/${review.businessid}`
        }
      });
    }

  } else {
    res.status(400).json({
      error: "Request body is not a valid review object"
    });
    next();
  }
});

router.use(isOwner);
/* Route to update a review. */
router.put('/:reviewid', async (req, res, next) => {
  const reviewID = req.params.reviewid;
  const collection = await mongoConnection.getDB().collection("reviews");

  let review

  try {
    review = await collection.findOne({ _id: new ObjectId(reviewID) })
  }
  catch (e) {
    next(e);
  }

  if (review) {

    if (validateAgainstSchema(req.body, reviewSchema)) {
      /*
       * Make sure the updated review has the same businessid and userid as
       * the existing review.
       */
      const updatedReview = extractValidFields(req.body, reviewSchema);
      let existingReview = review;

      if (updatedReview.businessid === existingReview.businessid && updatedReview.userid === existingReview.userid) {
        try {
          await collection.updateOne(
              { _id: new ObjectId(reviewID) },
              { $set: updatedReview}
          )
        }
        catch (e) {
          next(e)
        }
        // DONE: route covered
        res.status(200).json({
          _id: reviewID,
          links: {
            review: `/reviews/${reviewID}`,
            business: `/businesses/${updatedReview.businessid}`
          }
        });
      } else {
        // TODO: cover route
        res.status(403).json({
          error: "Updated review cannot modify businessid or userid"
        });
      }
    } else {
      res.status(400).json({
        // TODO: cover route
        error: "Request body is not a valid review object"
      });
    }
  } else {
    next();
  }
});

/* Route to delete a review. */
router.delete('/:reviewid', async (req, res, next) => {
  const reviewID = req.params.reviewid;

  try {
    const result = await mongoConnection.getDB().collection("reviews")
        .deleteOne({ _id: new ObjectId(reviewID) })
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: `Review with _id: ${reviewID} not found!`});
    }
    res.status(200).end()
  }
  catch (e) {
    next(e);
  }
});






