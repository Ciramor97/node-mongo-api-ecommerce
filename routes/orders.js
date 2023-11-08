const express = require('express')
const router = express.Router()
const { Order } = require('../models/order')
const { OrderItem } = require('../models/order-item')

router.get(`/`, async (req, res) => {
    const orderList = await Order.find()
        .populate('user', 'name')
        .sort('-dateOrdered')
    if (!orderList) {
        res.status(500).send({ success: false })
    }
    res.send(orderList)
})

router.get(`/:id`, async (req, res) => {
    const order = await Order.findById(req.params.id)
        .populate('user', 'name')
        .populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category',
            },
        })
    if (!order) {
        res.status(500).json({
            message: 'The order with the given ID was not found.',
        })
    }
    res.send(order)
})

router.post(`/`, async (req, res) => {
    const {
        shippingAddress1,
        shippingAddress2,
        city,
        zip,
        country,
        phone,
        status,
        user,
        orderItems,
    } = req.body

    const orderItemsIds = Promise.all(
        orderItems.map(async (orderItem) => {
            let newOrderItem = new OrderItem({
                quantity: orderItem.quantity,
                product: orderItem.product,
            })

            newOrderItem = await newOrderItem.save()

            return newOrderItem._id
        })
    )
    const orderItemsIdsResolved = await orderItemsIds

    const totalPrices = Promise.all(
        orderItemsIdsResolved.map(async (orderItemId) => {
            const orderItem = await OrderItem.findById(orderItemId).populate(
                'product',
                'price'
            )
            const totalPrice = orderItem.quantity * orderItem.product.price

            return totalPrice
        })
    )
    // console.log('totalPrices', totalPrices)
    const totalPrice = (await totalPrices).reduce((a, b) => a + b, 0)
    console.log('totalPrices', totalPrice)

    let order = new Order({
        orderItems: orderItemsIdsResolved,
        shippingAddress1,
        shippingAddress2,
        city,
        zip,
        country,
        phone,
        status,
        totalPrice: totalPrice,
        user,
    })

    order = await order.save()

    if (!order) res.status(404).send("The order can't be created")

    res.status(200).json(order)
})

router.put('/:id', async (req, res) => {
    const order = await Order.findByIdAndUpdate(
        req.params.id,
        {
            status: req.body.status,
        },
        { new: true } //to return the new insertion instead of previous
    )

    if (!order) return res.status(400).send('the order can not be updated!')

    res.send(order)
})

router.delete('/:id', async (req, res) => {
    // OrderItem.deleteMany({ _id: { $in: orderItemsIds } }, (err, result) => {
    //     if (err) {
    //         console.error('Error deleting order items:', err)
    //     } else {
    //         console.log(`${result.deletedCount} order items deleted.`)
    //     }
    // })

    Order.findByIdAndRemove(req.params.id)
        .then(async (order) => {
            if (order) {
                await order.orderItems.map(async (orderItem) => {
                    await OrderItem.findByIdAndRemove(orderItem)
                })
                return res.status(200).json({
                    success: true,
                    message: 'the order is deleted!',
                })
            } else {
                return res
                    .status(404)
                    .json({ success: false, message: 'order not found!' })
            }
        })
        .catch((err) => {
            return res.status(500).json({ success: false, error: err })
        })
})

router.get(`/get/totalsales`, async (req, res) => {
    const totalSales = await Order.aggregate([
        { $group: { _id: null, totalsales: { $sum: '$totalPrice' } } },
    ])
    if (!totalSales) {
        return res.status(400).send('The order sales cannot be generated')
    }

    res.send({ totalsales: totalSales[0].totalsales })
})

router.get('/get/count', async (req, res) => {
    const orderCount = await Order.countDocuments((count) => count)

    if (!orderCount) {
        res.status(500).json({
            succes: false,
        })
    }
    res.status(200).send({ orderCount })
})

router.get(`/get/userorders/:userId`, async (req, res) => {
    const userOrderList = await Order.find({ user: req.params.userId })
        .populate({
            path: 'orderItems',
            populate: {
                path: 'product',
                populate: 'category',
            },
        })
        .sort({ dateOrdered: -1 })

    if (!userOrderList) {
        res.status(500).json({ success: false })
    }
    res.send(userOrderList)
})
module.exports = router
