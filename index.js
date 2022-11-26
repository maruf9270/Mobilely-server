const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const cors = require('cors')
const app = express()
require("dotenv").config();
const port = process.env.PORT || 5000;
const stripe = require("stripe")(`${process.env.SRTIPE}`)


// Using middleware
app.use(cors());
app.use(express.json())

// testing api
app.get('/', (req,res)=>{
res.send("server is running")})


// Mongodb sercice


const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.acms3da.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const privetKey = process.env.PRIVET_Key
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
    const products = database.collection('products');
    const bookings = database.collection('bookings');
    const payments = database.collection('payments')
    const reports = database.collection('reports')
    try{
        // middleware for varifying jwt
        const variryJwt = (req,res,next)=>{
            const token = req.headers.token;
            console.log(token);
            if(!token){
                return res.send({message: "1Unauthorized Access"})
            }
            else{
                jwt.verify(token,privetKey,function(err,decoded){
                    console.log(err);
                    if(err){
                        return res.send({message: "2Unauthorized Access"})
                    }
                    else{
                        req.decoded = decoded
                        next()
                    }
                })
            }
        }

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
        // Sendign the products data to the user end
        app.get('/brand', async(req,res)=>{
            const query = req.query.name;
            const filter = {brand: query,advertised: true,sold:false}
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

        // !This should be token varified
        // Seving booking information to the server
        app.put('/bookings',variryJwt,async(req,res)=>{
            const email = req.decoded.email
            const query = {email: email}
            const user = await users.findOne(query)
            if(!user){
               return res.send({Message: "Unauthorized Access"})
            }
            
            const data = req.body
            const buyerEmail = data.buyer;
            const ProductId = data.productId
            const bookingQuery = {productId: ProductId,
                                   buyer: buyerEmail}
            const isbooked = await bookings.findOne(bookingQuery)
            console.log(isbooked);
            if(isbooked){
                return res.send({message: "You already have a Meeting Booking for this product"})
            }
            const result = await bookings.insertOne(data)
            res.send(result,)
        })

        // Sending the buyers their order data 
        app.get('/orders/:email',async(req,res)=>{
            const mail = req.params.email;
            const query = {buyer: mail}
            const result = await bookings.find(query).toArray()
            res.send(result);

        })

        // !This is token varified
        // Sending a single product

        app.get('/product/:id', async(req,res)=>{
            const id = req.params.id
            const querry = {_id: ObjectId(id) }
            const result = await products.findOne(querry)
            res.send(result)
        })

        // Providing a single order id 
        app.get('/order/:id', async (req,res)=>{
            const orderId = req.params.id;
            console.log(req);
            const query = {_id: ObjectId(orderId)};
            const result = await bookings.findOne(query);
            res.send(result)

        })




        // !Making api for payment it should be very secure
        app.post("/create-payment-intent",async(req,res)=>{
            const orderID = req.body.oid;
            const productId = req.body.productId;
            const productQuery = {_id: ObjectId(productId)}
            const product = await products.findOne(productQuery);
            const price = parseInt(product.resellPrice)
            const priceIncents = price * 1000
          

            const paymentIntent = await stripe.paymentIntents.create({
                amount: priceIncents,
                currency: "usd",
                automatic_payment_methods: {
                    enabled: true,
                  }
                //   "payment_method_types": [
                //     "card"
                // ]

            });
            res.send({
                clientSecret: paymentIntent.client_secret
            });

        })


        // Setting payment to the db
        app.post('/payments', variryJwt,async(req,res)=>{
            const paymentData = req.body;
            const orderId = paymentData.oid;
            const transactionId = paymentData.transactionId
            const querry = {_id: ObjectId(orderId)};
            const order = await bookings.findOne(querry)
            const mail = order.buyer;
            
            const productId = order.productId; 
            const option = {upsert: true}
            const updateBookingData = {
                $set: {
                    paid: true,
                    tid:transactionId
                }
            }

            const updateBooking = await bookings.updateOne(querry,updateBookingData,option)

            const productQuerry = {_id: ObjectId(productId)}
            const updateProductInfo = {
                $set: {
                    sold: true,
                    mail: mail,
                    tid: transactionId,
                    oid: orderId

                }
            }
            const upadteProduct = await products.updateOne(productQuerry,updateProductInfo,option)

            const updatePayment = await payments.insertOne(paymentData)
            res.send(updateBooking,upadteProduct,updatePayment)
            
        })

        // sending reported item to the db
        app.put('/reports',variryJwt,async(req,res)=>{
            const report = req.body;
            const result = await reports.insertOne(report)
            res.send(result)
        })


        // !sending token to the user end
        app.get('/jwt/:email',(req,res)=>{
            const email = req.params.email;
            const token = jwt.sign({email:email},privetKey)
            res.send({token:token})
            
        })
        


    }
    catch{

    }
}

run().catch(err=>console.log(err))






app.listen(port,()=>{
    console.log("Server is runnig on port",port);
})