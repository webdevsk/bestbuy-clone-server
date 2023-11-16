import { Router } from "express"
import { CACHED_PRODUCT_DATA } from "../index.js"

const router = Router()

router.get("/products", async (req, res) => {
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

export default router