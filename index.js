import 'dotenv-flow/config'
import axios from 'axios'
import express from 'express'
import cors from 'cors'
// modules
import productApis from "./apis/productApis.js"
import cartApis from "./apis/cartApis.js"
import prismaErrHandler from './middlewares/prismaErrHandler.js'

export const app = express()

// middlewares
app.use(express.json())
app.use(cors())


// apis or routes
app.use('/', productApis)
app.use('/', cartApis)

// after query errors
// handle prisma errors
app.use(prismaErrHandler)
app.use((err, req, res, next) => res.status(500).json({ message: err?.message }))
app.use((req, res) => res.status(404).json({ message: `No endpoints found at: ${req.originalUrl}` }))



// Getting products on Server start
// For caching and filtering
export const CACHED_PRODUCT_DATA = {}

app.listen(process.env.PORT, async (props) => {
    console.log("Server started and listening to Port: " + process.env.PORT)
    try {
        const response = await axios('https://dummyjson.com/products?limit=0')
        Object.assign(CACHED_PRODUCT_DATA, {
            statusCode: 200,
            products: response.data?.products,
            categories: [...new Set(response.data.products.map(item => item.category))],
            brands: [...new Set(response.data.products.map(item => item.brand))],
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