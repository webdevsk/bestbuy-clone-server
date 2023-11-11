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
    try {
        const response = await axios('https://dummyjson.com/products')
        res.json(response.data)
    } catch (error) {
        res.json({ code: error.code, message: error.message }, { status: 500 })
    }
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



app.listen(5000)