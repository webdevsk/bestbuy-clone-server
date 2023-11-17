import { Router } from "express"
import { CACHED_PRODUCT_DATA } from '../index.js'
import { PrismaClient } from "@prisma/client"
import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError, PrismaClientValidationError } from "@prisma/client/runtime/library.js"
import prismaErrHandler from "../middlewares/prismaErrHandler.js"

const prisma = new PrismaClient()

const router = Router()

const validateBody = (req, res, next) => {
    const errors = []
    if (!req.body) errors.push("Parameters are missing")
    if (!req.body.email) errors.push("'email' is a required field")
    if (req.method !== "DELETE" && !req.body.itemId) errors.push("'itemId' is a required field")
    if (req.method === "PATCH" && !req.body.quantity) errors.push("'quantity' is a required field")
    if (req.method === "DELETE" && (!req.body.itemIds || !(Array.isArray(req.body.itemIds)))) errors.push("'itemIds' is a required field and should be of type 'Array'")

    if (!!errors.length) return res.status(400).json({ message: errors.join("; ") })
    next()
}

router.get("/cart/:email", async (req, res, next) => {
    console.log("cart/get", req.params)
    const { email } = req.params
    if (!email) return res.status(400).json({ message: "Email not provided" })

    try {
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
            total: populatedCartProducts.reduce((accumulator, product) => accumulator += (product.price * product.quantity), 0)
        })
    }
    catch (error) {
        next(error)
    }
})

router.post("/cart", validateBody, async (req, res, next) => {
    console.log("cart/post", req.body)
    const { email: userEmail, itemId, quantity = 1 } = req.body
    try {
        const result = await prisma.cart.upsert({
            where: {
                userEmail_itemId: { userEmail, itemId }
            },
            update: {},
            create: { userEmail, itemId, quantity },
        })

        res.json(result)
    } catch (error) {
        next(error)
    }
})

router.patch("/cart", validateBody, async (req, res, next) => {
    console.log("cart/patch", req.body)
    const { email: userEmail, itemId, quantity } = req.body
    try {

        const result = await prisma.cart.update({
            where: {
                userEmail_itemId: { userEmail, itemId }
            },
            data: { quantity },
        })

        res.json(result)
    } catch (error) {
        next(error)
    }
})

router.delete("/cart", validateBody, async (req, res, next) => {
    console.log("cart/delete", req.body)
    const { email: userEmail, itemIds, deleteAll = false } = req.body

    const condition = deleteAll ? { userEmail } : { itemId: { in: itemIds } }
    try {
        const result = await prisma.cart.deleteMany({ where: condition })
        res.json(result)
    } catch (error) {
        next(error)
    }
})

export default router