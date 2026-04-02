require('dotenv').config()

const port = process.env.PORT
const apiKey = process.env.API_KEY
const dbUrl = process.env.DATABASE_URL

console.log("Port:", port)
console.log("API Key:", apiKey)
console.log("DB:", dbUrl)
