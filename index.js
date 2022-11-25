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

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
    const brands = database.collection('brands')
    const products = database.collection('products')
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

        // 3. sending the bran name to the user side 
        app.get('/brands',async(req,res)=>{
            const querry = {}
            const result = await brands.find(querry).toArray()
            res.send(result)
            
        })
        //! Getting the request form the user about the product and posting the product in the db this should be buyer protectd route

        app.post('/product/:email',async(req,res)=>{
            const email = req.params.email
            const product = req.body
            const result = await products.insertOne(product)
            console.log(req.headers.token, email);
            res.send(result)
        })

        // Sending the data to the users
        app.get('/products/:email', async(req,res)=>{
            const email = req.params.email;
            const query = {"user.email": email}
            const result = await products.find(query).toArray();
            res.send(result);
        })
        
        // Setting data to advertised
        app.put('/advertise',async(req,res)=>{
    
            const id = req.body.id
            console.log(id);
            const query = {_id: ObjectId(id)}
            const option = { upsert: true}
            const updata = {
                $set: {
                    advertised: true
                }
            }
            const result = await products.updateOne(query,updata,option);
            res.send(result)
        })

        // deleting product
        app.delete('/product',async(req,res)=>{
            const id = req.body.id
            const query = {_id: ObjectId(id)}
            const result = await products.deleteOne(query);
            res.send(result)
        })


        //!This should be admin varified route
        // Sending all the seller data to the user end
        app.get('/sellers',async(req,res)=>{
            const querry = {role: "seller"}
            const result = await users.find(querry).project({password:0}).toArray()
            res.send(result)
        })

         
        //!This should be admin varified route
        // varifying the user
        app.put('/varify', async(req,res)=>{
            const id = req.body.id;
            const query = {_id: ObjectId(id)}
            const option = {
                upsert: true
            }
            const uData = {
                $set: {
                    varified: true
                }
            }
            const result =await users.updateOne(query,uData,option)
           
            res.send(result)

        })
        //!This should be admin varified route
        // Deleting user from the server
        app.delete('/users/:id',async(req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = users.deleteOne(query)
            res.send(result)
        })

         //!This should be admin varified route
        //  Sending all the buyer to the front side
        app.get('/buyers',async (req,res)=>{
            const filter = {role: "buyer"}
            const result = await users.find(filter).toArray()
            res.send(result)
        })

        //!This should be admin varified route
        // Deleting the sellers form the website
        app.delete('/sellers/:id',async(req,res)=>{
            
            const query = {_id: ObjectId(req.params.id)}
            const result = await users.deleteOne(query)
            res.send(result);
        })

        /// This should be privet route
        app.get('/brand', async(req,res)=>{
            const query = req.query.name;
            const filter = {brand: query,advertised: true}
            const result = await products.find(filter).toArray()
            res.send(result)
        }) 

        // Sending seller info for prodct card
        app.get('/product/seller/:mail', async(req,res)=>{
            const email = req.params.mail
            const query = {email:email}
            const result = await users.findOne(query)
            res.send(result);
        })


    }
    catch{

    }
}

run().catch(err=>console.log(err))






app.listen(port,()=>{
    console.log("Server is runnig on port",port);
})