const express=require("express")
const morganMiddleware =require('./morganMiddleware.js')
const urlencoded=express.urlencoded

const app = express();
app.use(express.json())
app.use(morganMiddleware)
app.use(urlencoded({extended:true}))

const accountRoutes =require("./routes/accounts.js")

app.use("/accounts",accountRoutes)


module.exports= app
