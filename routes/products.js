const express = require('express')
const router = express.Router()
const { Product } = require('../models/product')
const { Category } = require('../models/category')
const mongoose = require('mongoose')
const multer = require('multer')

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype]
        let uploadError = new Error('invalid image type')

        if (isValid) {
            uploadError = null
        }
        cb(uploadError, 'public/uploads')
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.replace(' ', '-')
        const extension = FILE_TYPE_MAP[file.mimetype]
        cb(null, `${fileName}-${Date.now()}.${extension}`)
    },
})

const uploadOptions = multer({ storage: storage })

router.get(`/`, async (req, res) => {
    let filter
    if (req.query.categories) {
        filter = { category: req.query.categories.split(',') }
    }
    const productList = await Product.find(filter ? filter : {}).populate(
        'category'
    )
    res.send(productList)
})

router.get('/:id', async (req, res) => {
    const product = await Product.findById(req.params.id)
        .select('name price rating category numReviews') //minus is to exclude
        .populate('category')

    if (!product) {
        res.status(500).json({
            message: 'The product with the given ID was not found.',
        })
    }
    res.status(200).send(product)
})

router.post(`/`, uploadOptions.single('image'), async (req, res) => {
    const {
        name,
        description,
        richDescription,
        brand,
        price,
        category,
        countInStock,
        rating,
        numReviews,
        isFeatured,
    } = req.body

    const categorySearched = await Category.findById(category)
    if (!categorySearched) return res.status(400).send('Invalid Category')
    const file = req.file
    if (!file) return res.status(400).send('No image in the request')

    const fileName = req.file.filename
    const baseUrl = `${req.protocol}://${req.get('host')}/public/uploads/`

    let product = new Product({
        name,
        description,
        richDescription,
        image: `${baseUrl}${fileName}`, // "http://localhost:3000/public/upload/image-2323232"
        brand,
        price,
        category,
        countInStock,
        rating,
        numReviews,
        isFeatured,
    })
    product = await product.save()

    if (!product) res.status(500).send("The product can't be created")

    res.status(200).json(product)
})

router.put('/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).send('Invalid Product Id')
    }

    const {
        name,
        description,
        richDescription,
        brand,
        price,
        image,
        category,
        countInStock,
        rating,
        numReviews,
        isFeatured,
    } = req.body

    const categorySearched = await Category.findById(category)
    if (!categorySearched) return res.status(400).send('Invalid Category')

    const product = await Product.findByIdAndUpdate(
        req.params.id,
        {
            name,
            description,
            richDescription,
            brand,
            price,
            image,
            category,
            countInStock,
            rating,
            numReviews,
            isFeatured,
        },
        { new: true } //to return the new insertion instead of previous
    )

    if (!product) return res.status(500).send('the product cannot be updated!')

    res.send(product)
})

router.delete('/:id', (req, res) => {
    Product.findByIdAndRemove(req.params.id)
        .then((product) => {
            if (product) {
                return res.status(200).json({
                    success: true,
                    message: 'the product is deleted!',
                })
            } else {
                return res
                    .status(404)
                    .json({ success: false, message: 'product not found!' })
            }
        })
        .catch((err) => {
            return res.status(500).json({ success: false, error: err })
        })
})

router.get('/get/count', async (req, res) => {
    const productCount = await Product.countDocuments((count) => count)
        .select('name numReviews -_id') //minus is to exclude element(here generated mongo id)
        .populate('category')

    if (!productCount) {
        res.status(500).json({
            succes: false,
        })
    }
    res.status(200).send({ productCount })
})

router.get('/get/featured/:count', async (req, res) => {
    const count = req.params.count || 0
    const products = await Product.find({ isFeatured: true }).limit(+count)
    if (!products) {
        res.status(500).json({
            succes: false,
        })
    }
    res.status(200).send(products)
})

router.put(
    '/gallery-images/:id',
    uploadOptions.array('images', 10),
    async (req, res) => {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).send('Invalid Product Id')
        }
        const files = req.files
        let imagesPaths = []
        const baseUrl = `${req.protocol}://${req.get('host')}/public/uploads/`

        if (files) {
            files.map((file) => {
                imagesPaths.push(`${baseUrl}${file.filename}`)
            })
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            {
                images: imagesPaths,
            },
            { new: true }
        )

        if (!product)
            return res.status(500).send('the gallery cannot be updated!')

        res.send(product)
    }
)

module.exports = router
