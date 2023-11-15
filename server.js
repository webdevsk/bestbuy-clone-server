const { default: axios } = require('axios')
const express = require('express')
const { PrismaClient } = require('@prisma/client')
require('dotenv').config()
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { PrismaClientKnownRequestError } = require('@prisma/client/runtime/library')
const prisma = new PrismaClient()
app.use(express.json())
app.use(cors())

const data = {}

app.listen(5000, async () => {
    try {
        const response = await axios('https://dummyjson.com/products?limit=0')
        Object.assign(data, {
            statusCode: 200,
            products: response.data?.products,
            categories: [...new Map(response.data?.products.map((item) => [item["category"], item])).keys()],
            brands: [...new Map(response.data?.products.map((item) => [item["brand"], item])).keys()],
            total: response.data?.total
        })
    } catch (error) {
        Object.assign(data, {
            statusCode: 500,
            message: error.message
        })
    }
})

const jwtVerify = (req, res, next) => {
    const token = req?.headers?.authorization?.split(" ")[1]
    jwt.verify(token, process.env.JWT_CLIENT_SECRET, { audience: process.env.AUDIENCE, algorithms: ['RS256'] }, (err, decoded) => {
        console.log(err)
        console.log(decoded)
    })
    next()
}

const prismaErrHandler = (err, req, res, next) => {
    if (err instanceof PrismaClientKnownRequestError) {
        // Handle the known error here
        if (err.code === 'P2002') {
            // This is a unique constraint violation error
            res.status(409).send({
                error: 'A user with this email already exists.'
            })
        } else {
            // Other Prisma errors can be handled here
            res.status(500).send({
                error: 'An error occurred while processing your request.'
            })
        }
    } else {
        // If it's not a Prisma error, pass it to the next error handler
        res.status(400).json({
            error: err
        })
        // next(err)
    }
}

app.use(prismaErrHandler)


app.get("/products", async (req, res) => {
    if (data.statusCode === 500) return res.status(500).json("Server error: DummyJson")

    const skip = "skip" in req.query ? parseInt(req.query.skip) : 0
    const limit = "limit" in req.query ? parseInt(req.query.limit) : 30
    const { total, categories, brands } = data
    const products = data.products.slice(skip, limit)

    res.json({
        products,
        skip,
        limit,
        total,
        categories,
        brands
    })
})

app.get("/cart/:email", async (req, res) => {
    console.log("cart/get", req.params)
    const { email } = req.params
    if (!email) return res.status(400).json({ message: "Email not provided" })
    const data = await prisma.user.upsert({
        where: { email },
        select: {
            cart: {
                select: {
                    itemId: true,
                    quantity: true
                }
            }
        },
        update: {},
        create: { email }
    })
    res.json(data.cart ?? [])
})

app.post("/cart", async (req, res) => {
    console.log("cart/post", req.body)
    if (!req.body) return res.status(400).json({ message: "No parameters given" })
    const { email: userEmail, itemId, quantity = 1 } = req.body

    const result = await prisma.cart.upsert({
        where: {
            userEmail_itemId: { userEmail, itemId }
        },
        update: { quantity },
        create: { userEmail, itemId, quantity },
    })

    res.json(result)
})

app.delete("/cart", async (req, res) => {
    console.log("cart/delete", req.body)
    const { email: userEmail, itemId } = req?.body
    if (!userEmail && !itemId) return res.status(400).json({ message: "Missing parameters" })
    const result = await prisma.cart.delete({
        where: { userEmail }
    })
    res.json(result)
})



