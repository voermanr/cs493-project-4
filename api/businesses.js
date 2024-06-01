const router = require('express').Router();
const { validateAgainstSchema, extractValidFields } = require('../lib/validation');

const mongoConnection = require("../lib/mongoConnection");
const {isAuthenticated} = require("../lib/authenicator");
const {isOwner} = require("../lib/authorizer");
const ObjectId = require("mongodb").ObjectId;

exports.router = router;

/*
 * Schema describing required/optional fields of a business object.
 */
const businessSchema = {
  name: { required: true },
  address: { required: true },
  city: { required: true },
  state: { required: true },
  zip: { required: true },
  phone: { required: true },
  category: { required: true },
  subcategory: { required: true },
  website: { required: false },
  email: { required: false }
};

async function getBusinessesCount() {
  return await mongoConnection.getDB().collection('businesses').countDocuments();
}
async function getBusinessesPage(page) {
  const count = await getBusinessesCount();

  const pageSize = 10;
  const lastPage = Math.ceil(count / pageSize);
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;

  const results = await mongoConnection.getDB().collection('businesses').aggregate([
      { $sort: { _id: 1} },
      { $skip: offset},
      { $limit: pageSize}])
    .toArray();

  return {
    businesses: results,
    page: page,
    totalPages: lastPage,
    pageSize: pageSize,
    count: count
  }
}

/* Route to return a list of businesses. */
router.get('/', async (req, res) => {
  /*
   * Compute page number based on optional query string parameter `page`.
   * Make sure page is within allowed bounds.
   */

  let page = parseInt(req.query.page) || 1;
  const numPerPage = 10;
  const totalCount = await getBusinessesCount();
  const lastPage = Math.ceil(totalCount / numPerPage);
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;


  let pageBusinesses;
  try {
    pageBusinesses = await getBusinessesPage(page)
  } catch (err) {
    res.status(500).json({
      error: "Error fetching lodgings list. Try again later."
    })
  }

  /*
   * Generate HATEOAS links for surrounding pages.
   */
  const links = {};
  if (page < lastPage) {
    links.nextPage = `/businesses?page=${page + 1}`;
    links.lastPage = `/businesses?page=${lastPage}`;
  }
  if (page > 1) {
    links.prevPage = `/businesses?page=${page - 1}`;
    links.firstPage = '/businesses?page=1';
  }

  /* TODO: cover route */
  res.status(200).json({
    collectionPage: pageBusinesses,
    pageNumber: page,
    totalPages: lastPage,
    pageSize: numPerPage,
    totalCount: totalCount,
    links: links
  });

});

/* Route to fetch info about a specific business. */
router.get('/:businessid', async function (req, res, next) {
  let business;
  try {
    business = await mongoConnection.getDB().collection("businesses")
        .find({
          _id: new ObjectId(req.params.businessid)
        }).toArray();

    if (business) {
      /* DONE: route covered */
      res.status(200).json(business);
    } else {
      next();
    }
  }
  catch (e) { next(e); }
});

/* ROUTES BELOW REQUIRE AUTHENICATION */
router.use(isAuthenticated);

/* Route to create a new business */
router.post('/', async (req, res, next) => {
  if (validateAgainstSchema(req.body, businessSchema)) {
      const business = {"ownerid": req.username,
        ...extractValidFields(req.body, businessSchema),
      };

      const db = mongoConnection.getDB();

      try {
        const document = await db.collection("businesses")
            .insertOne(business);
        /* DONE: route covered */
        res.status(201).json({
          _id: document.insertedId,
          links: {
            business: `/businesses/${document.insertedId}`
          }
        })
      }
      catch (e) {
        next(e);
      }
  } else {
    /* DONE: route covered */
    return res.status(400).json({
      error: "Request body is not a valid business object"
    });
  }
});

/* ROUTES BELOW REQUIRE OWNER OR ADMIN */
router.use(isOwner);

/* Route to replace data for a business. */
router.put('/:businessid', async (req, res, next) => {
  const businessId = req.params.businessid;
  const collection = await mongoConnection.getDB().collection("businesses");

  //console.log("\t>> businessId: ", businessId);

  if (await collection.findOne({_id: new ObjectId(businessId)})) {
    if (validateAgainstSchema(req.body, businessSchema)) {
      try {
        await collection.updateOne(
            {_id: new ObjectId(businessId)},
            { $set: extractValidFields(req.body, businessSchema) },
            )
      } catch (err) { next(err); }

      /* DONE: route covered */
      res.status(200).json({
        _id: businessId,
        links: {
          business: `/businesses/${businessId}`
        }
      });
    } else {
      /* TODO: cover route */
      res.status(400).json({
        error: "Request body is not a valid business object"
      });
    }

  } else {
    next();
  }
});

/* Route to delete a business. */
router.delete('/:businessid', async (req, res, next) => {
  const businessId = req.params.businessid;

  try {
    const result = await mongoConnection.getDB().collection("businesses").deleteOne({_id: new ObjectId(businessId)})

    if (result.deletedCount === 0) {
      /* TODO: cover route */
      return res.status(404).json({ error: `Business with _id: ${businessId} not found!`});
    }

    /* DONE: route covered */
    res.status(200).end();
  }
  catch (e) {
    next(e);
  }
});