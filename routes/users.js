const express = require('express')
const router = express.Router()
const { User } = require('../models/user')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

router.get(`/`, async (req, res) => {
    const userList = await User.find().select('-passwordHash')
    if (!userList) {
        res.status(500).send({ success: false })
    }
    res.send(userList)
})

router.get('/:id', async (req, res) => {
    const user = await User.findById(req.params.id).select('-passwordHash')

    if (!user) {
        res.status(500).json({
            message: 'The user with the given ID was not found.',
        })
    }
    res.status(200).send(user)
})

router.post(`/`, async (req, res) => {
    const {
        name,
        email,
        password,
        phone,
        isAdmin,
        street,
        apartment,
        zip,
        city,
        country,
    } = req.body

    // const salt = await bcrypt.genSalt(10)
    const passwordHash = bcrypt.hashSync(password, 10)

    let user = new User({
        name,
        email,
        passwordHash,
        phone,
        isAdmin,
        street,
        apartment,
        zip,
        city,
        country,
    })
    user = await user.save()

    if (!user) res.status(404).send("The user can't be created")

    res.status(200).json(user)
})

router.post('/login', async (req, res) => {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    const TOKEN_KEY = process.env.TOKEN_KEY
    if (!user) {
        return res.status(400).send('The user is not found')
    }

    if (user) {
        const validPassword = bcrypt.compareSync(password, user.passwordHash)
        if (validPassword) {
            const token = jwt.sign(
                {
                    userId: user.id,
                    isAdmin: user.isAdmin,
                },
                TOKEN_KEY,
                { expiresIn: '1d' }
            )

            res.status(200).send({ user: user.email, token: token })
        } else {
            res.status(400).send('password is wrong!')
        }
    }
})

router.post(`/register`, async (req, res) => {
    const {
        name,
        email,
        password,
        phone,
        isAdmin,
        street,
        apartment,
        zip,
        city,
        country,
    } = req.body

    // const salt = await bcrypt.genSalt(10)
    const passwordHash = bcrypt.hashSync(password, 10)

    let user = new User({
        name,
        email,
        passwordHash,
        phone,
        isAdmin,
        street,
        apartment,
        zip,
        city,
        country,
    })
    user = await user.save()

    if (!user) res.status(404).send("The user can't be created")

    res.status(200).json(user)
})

router.get('/get/count', async (req, res) => {
    const userCount = await User.countDocuments((count) => count)

    if (!userCount) {
        res.status(500).json({
            succes: false,
        })
    }
    res.status(200).send({ userCount })
})

router.delete('/:id', (req, res) => {
    User.findByIdAndRemove(req.params.id)
        .then((user) => {
            if (user) {
                return res.status(200).json({
                    success: true,
                    message: 'the user is deleted!',
                })
            } else {
                return res
                    .status(404)
                    .json({ success: false, message: 'user not found!' })
            }
        })
        .catch((err) => {
            return res.status(500).json({ success: false, error: err })
        })
})

module.exports = router
