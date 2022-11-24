const express = require('express');
const cors = require('cors')
const app = express()
require("dotenv").config();
const port = process.env.PORT || 5000;


// Using middleware
app.use(cors());
app.use(express.json())

// testing api
app.get('/', (req,res)=>{
res.send("server is running")})


// Mongodb sercice

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.acms3da.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// client.connect(err => {
//     if(err){
//         console.log("not");
//     }
//   const collection = client.db("test").collection("devices");
//   // perform actions on the collection object
//   client.close();
// else{
//     console.log('connected');
// }
// });

// Main sectiono oof the server
async function run (){
    const database = client.db('Mobilely')
    const users = database.collection('users')
    try{
        // 1. Handling email and password signups
        app.put('/user',async(req,res)=>{
            const user = req.body
            const result = await users.insertOne(user)
            res.status(200).send(result);
        })

        // 2. Handling google signups
        app.put('/google',async(req,res)=>{
            const data = req.body
            const email = req.body.email
            const filter = {email:email}
            const available = await users.findOne(filter)
            if(available){
                return res.send({message: "alrady availabe"})
            }

            else{
                console.log(data);
                const result = await users.insertOne(data)
                res.end(result)
            }
           
        })


    }
    catch{

    }
}

run().catch(err=>console.log(err))






app.listen(port,()=>{
    console.log("Server is runnig on port",port);
})