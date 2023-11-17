import { Router } from "express"
import { CACHED_PRODUCT_DATA } from '../index.js'
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const router = Router()

const validateBody = async (req, res, next) => {
    const errors = []
    if (!req.body) errors.push("Parameters are missing")
    if (!req.body.email) errors.push("'email' is required field")
    if (!req.body.itemId) errors.push("'itemId' is required field")
    if (req.method !== "POST" && !req.body.quantity) errors.push("'quantity' is required field")
    if (!!errors.length) return res.status(400).json({ message: errors.join("; ") })
    next()
}

router.get("/cart/:email", async (req, res) => {
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
        total: populatedCartProducts.reduce((accumulator, product) => accumulator += product.price, 0)
    })
})

router.post("/cart", validateBody, async (req, res) => {
    console.log("cart/post", req.body)
    const { email: userEmail, itemId, quantity = 1 } = req.body

    const result = await prisma.cart.upsert({
        where: {
            userEmail_itemId: { userEmail, itemId }
        },
        update: {},
        create: { userEmail, itemId, quantity },
    })

    res.json(result)
})

router.patch("/cart", validateBody, async (req, res) => {
    console.log("cart/patch", req.body)
    const { email: userEmail, itemId, quantity } = req.body

    const result = await prisma.cart.upsert({
        where: {
            userEmail_itemId: { userEmail, itemId }
        },
        update: { quantity },
        create: { userEmail, itemId, quantity },
    })

    res.json(result)
})

router.delete("/cart", validateBody, async (req, res) => {
    console.log("cart/delete", req.body)
    const { email: userEmail, itemId } = req.body
    if (!userEmail && !itemId) return res.status(400).json({ message: "Missing parameters" })
    const result = await prisma.cart.delete({
        where: { userEmail }
    })
    res.json(result)
})

export default router