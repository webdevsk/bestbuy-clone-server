import axios from 'axios'
import express from 'express'
import { PrismaClient } from '@prisma/client'
import('dotenv').then(dot => dot.config())
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library.js'


const app = express()
const prisma = new PrismaClient()
app.use(express.json())
app.use(cors())

// Getting products on Server start
// For caching and filtering
export const CACHED_PRODUCT_DATA = {}

app.listen(5000, async () => {
    try {
        const response = await axios('https://dummyjson.com/products?limit=0')
        Object.assign(CACHED_PRODUCT_DATA, {
            statusCode: 200,
            products: response.data?.products,
            categories: [...new Set(response.data.products.map(item => item.category))],
            brands: [...new Map(response.data.products.map(item => [item.brand, item])).keys()],
            // discount more than 10% AND from those categories inside array
            exclusiveProducts: response.data?.products.filter(product =>
                product.discountPercentage >= 10 && ["smartphones", "laptops"].some(cat => product.category === cat)
            ),
            total: response.data?.total
        })
    } catch (error) {
        Object.assign(CACHED_PRODUCT_DATA, {
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
    if (CACHED_PRODUCT_DATA.statusCode === 500) return res.status(500).json("Server error: DummyJson")

    const skip = "skip" in req.query ? parseInt(req.query.skip) : 0
    const limit = "limit" in req.query ? parseInt(req.query.limit) : 30
    const { total, categories, brands, exclusiveProducts } = CACHED_PRODUCT_DATA
    const products = CACHED_PRODUCT_DATA.products.slice(skip, limit)

    res.json({
        products,
        exclusiveProducts,
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
    const result = await prisma.user.upsert({
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
    if (!result.cart.length) return res.json({
        products: [],
        quantity: 0,
        total: 0
    })

    const populatedCartProducts = result.cart.map(({ itemId, quantity }) => ({
        ...CACHED_PRODUCT_DATA.products.find(prod => prod.id === itemId),
        quantity
    }))
    res.json({
        products: populatedCartProducts,
        quantity: populatedCartProducts.length,
        total: populatedCartProducts.reduce((accumulator, product) => {
            return accumulator += product.price
        }, 0)
    })
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

export { app }