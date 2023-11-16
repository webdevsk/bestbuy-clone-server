import { jwt } from 'jsonwebtoken'

export default (req, res, next) => {
    const token = req?.headers?.authorization?.split(" ")[1]
    jwt.verify(token, process.env.JWT_CLIENT_SECRET, { audience: process.env.AUDIENCE, algorithms: ['RS256'] }, (err, decoded) => {
        console.log(err)
        console.log(decoded)
    })
    next()
}