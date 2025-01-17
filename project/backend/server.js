import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import queryRoute from './routes/query.js'

dotenv.config()

/**
 * Initializes an Express application.
 * @type {import('express').Express}
 */
const app = express()

/**
 * Middleware to allow cross-origin requests.
 * This is needed because the frontend and backend run on different servers.
 * @type {import('cors').CorsOptions}
 */
app.use(cors())

/**
 * Middleware to parse incoming requests with JSON payloads.
 * @type {import('express').RequestHandler}
*/
app.use(express.json())


/**
 * The route for handling queries.
 * @type {import('express').Router}
*/ 
app.use('/api/query', queryRoute)

/**
 * The port number on which the server will listen.
 * It is either taken from the environment variable `PORT` or defaults to 3001.
 * @type {number}
 */
const port = process.env.PORT || 3001
app.listen(port, () => {
  console.log(`Backend server is running on port ${port}`)
})
