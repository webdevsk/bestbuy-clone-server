import { PrismaClientKnownRequestError, PrismaClientUnknownRequestError, PrismaClientValidationError } from "@prisma/client/runtime/library.js"

export default (err, req, res, next) => {
    console.error(err)

    if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            res.status(409).send({
                error: 'A user with this email already exists.'
            })
        } else {
            res.status(500).send({
                error: 'An error occurred while processing your request.'
            })
        }
    } else if (err instanceof PrismaClientValidationError) {
        res.status(400).json({ message: "Data validation error." })
    } else if (err instanceof PrismaClientUnknownRequestError) {
        res.status(400).json({ message: err?.message })
    }
    else {
        // If it's not a Prisma error, pass it to the next error handler
        next(err)
    }

}