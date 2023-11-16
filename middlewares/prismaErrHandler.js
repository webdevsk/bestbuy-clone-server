import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library.js"

export default (err, req, res, next) => {
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