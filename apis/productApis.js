import { Router } from "express"
import { CACHED_PRODUCT_DATA } from "../index.js"
import axios from "axios"

const router = Router()

router.get("/products", async (req, res, next) => {
    if (CACHED_PRODUCT_DATA.statusCode === 500) return res.status(500).json("Server error: DummyJson")
    try {

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
    } catch (error) {
        next(error)
    }
})

router.get("/products/:id", async (req, res, next) => {
    const { id } = req.params
    console.log("cart/get/product", req.params)

    try {
        const result = await axios.get(`https://dummyjson.com/products/${id}`)
        res.json(result.data)
    } catch (error) {
        next(error)
    }
})

export default router