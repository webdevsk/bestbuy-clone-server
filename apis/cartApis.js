import { Router } from "express"
import { CACHED_PRODUCT_DATA } from '../index.js'
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const router = Router()

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
        total: populatedCartProducts.reduce((accumulator, product) => {
            return accumulator += product.price
        }, 0)
    })
})

router.post("/cart", async (req, res) => {
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

router.delete("/cart", async (req, res) => {
    console.log("cart/delete", req.body)
    const { email: userEmail, itemId } = req?.body
    if (!userEmail && !itemId) return res.status(400).json({ message: "Missing parameters" })
    const result = await prisma.cart.delete({
        where: { userEmail }
    })
    res.json(result)
})

export default router