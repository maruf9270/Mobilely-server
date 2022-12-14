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
           
            if(!token){
                return res.send({message: "Unauthorized Access"})
            }
            else{
                jwt.verify(token,privetKey,function(err,decoded){
                
                    if(err){
                        return res.send({message: "Unauthorized Access"})
                    }
                    else{
                        req.decoded = decoded
                        next()
                    }
                })
            }
        }


        // Using useAdminHok
        app.get('/admin/:email',variryJwt,async(req,res)=>{
            const email = req.params.email;
            const query = {email: email, admin: true}
            const result = await users.findOne(query)
            if(result){
                return res.send({admin:true})
            }
            else{
                res.send({admin:false})
            }
           
        })
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

        app.post('/product/:email',variryJwt,async(req,res)=>{
            const email = req.params.email
            const query = {email: email,role: "seller"}
            const user = await users.findOne(query)
            if(user){
                const product = req.body
                const result = await products.insertOne(product)
              
                return res.send(result)
            }

            else{
                return ({message: "Unauthorized"})
            }
            
           
        })

        // Sending the data to the users
        app.get('/products/:email',variryJwt, async(req,res)=>{
            const email = req.params.email;
            const query = {"user.email": email}
            const result = await products.find(query).toArray();
            res.send(result);
        })
        
        // Setting data to advertised
        app.put('/advertise',variryJwt,async(req,res)=>{
            const squery = {email: req.decoded.email, role: "seller"}
            const isSeller = await users.findOne(squery)

            const adminQuery = {email: req.decoded.email, admin: true}
            const isAmin = await users.findOne(adminQuery);

            if(isSeller || isAmin){
                const id = req.body.id
              
                const query = {_id: ObjectId(id)}
                const option = { upsert: true}
                const updata = {
                    $set: {
                        advertised: true
                    }
                }
                const result = await products.updateOne(query,updata,option);
                return res.send(result)
            }
            else{
                res.send({message: "Unauthorized"})
            }
            
           
        })

        // deleting product
        app.delete('/product',variryJwt,async(req,res)=>{
            const squery = {email: req.decoded.email, role: "seller"}
            const isSeller = await users.findOne(squery)

            const adminQuery = {email: req.decoded.email, admin: true}
            const isAmin = await users.findOne(adminQuery);
            if(isSeller || isAmin){
                const id = req.body.id
            const query = {_id: ObjectId(id)}
            const result = await products.deleteOne(query);
            return res.send(result)
            }
            else{
                res.send({message: "Unauthorized Access"})
            }

            
        })


        //!This should be admin varified route
        // Sending all the seller data to the user end
        app.get('/sellers',variryJwt,async(req,res)=>{
            const email = req.decoded.email
            const query = {email: email, admin: true }
            const found = await users.findOne(query);
            if(found){
                const querry = {role: "seller"}
                const result = await users.find(querry).project({password:0}).toArray()
                return  res.send(result)
            }
            
            else{
                res.send({Message: "Unauthorized"})
            }
           
        })

         
        // varifying the user
        app.put('/varify', variryJwt,async(req,res)=>{
            const email = req.decoded.email;
            const adminq = {email: email, admin: true}
            const isAdmin = await users.findOne(adminq)
           if(isAdmin){
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
           
           return res.send(result)
           }
           else{
            return res.send({message: "Unauthorized"})
        }

        })
        //!This should be admin varified route
        // Deleting user from the server
        app.delete('/users/:id',variryJwt,async(req,res)=>{
            const email = req.decoded.email;
            const adminq = {email: email, admin: true}
            const isAdmin = await users.findOne(adminq)
            if(isAdmin){
                const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = users.deleteOne(query)
            return res.send(result)
            }
            else{
                return res.send({message: "Unauthorized"})
            }
            
        })

         //!This should be admin varified route
        //  Sending all the buyer to the front side
        app.get('/buyers',variryJwt,async (req,res)=>{
            const email = req.decoded.email;
            const adminq = {email: email, admin: true}
            const isAdmin = await users.findOne(adminq)
            if(isAdmin){
                const filter = {role: "buyer"}
                const result = await users.find(filter).toArray()
                return  res.send(result)
            }
            else{
                return res.send({message: "Unauthorized"})
            }
           
        })

        //!This should be admin varified route
        // Deleting the sellers form the website
        app.delete('/sellers/:id',variryJwt,async(req,res)=>{
            const email = req.decoded.email;
            const adminq = {email: email, admin: true}
            const isAdmin = await users.findOne(adminq)
            if(isAdmin){
                const query = {_id: ObjectId(req.params.id)}
                const result = await users.deleteOne(query)
                return res.send(result);
            }
            else{
                return res.send({message: "Unauthorized"})
            }
            
            
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
         
            if(isbooked){
                return res.send({message: "You already have a Meeting Booking for this product"})
            }
            const result = await bookings.insertOne(data)
            res.send(result,)
        })

        // Sending the buyers their order data 
        app.get('/orders/:email',variryJwt,async(req,res)=>{
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

        // !this should be admin varified
        app.get('/reports',async(req,res)=>{
            const reportQuery = {}
            const result = await reports.find(reportQuery).toArray()
           if(result){
            let rid = []
            result.forEach((r)=>{
                rid.push(ObjectId(r.reportedPID))
                

            })

            const rproducts = await products.find({_id: {$in: rid}}).toArray()
           return res.send(rproducts)
           }
           
           res.send([])
        })


        // Deleting reported item'
        // !This should be admin 
        app.delete('/deletereported/:id',variryJwt,async(req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const result = await products.deleteOne(query);
            res.send(result)
        })

        // !sending token to the user end
        app.get('/jwt/:email',(req,res)=>{
            const email = req.params.email;
            const token = jwt.sign({email:email},privetKey)
            res.send({token:token})
            
        })

        // Verifying seller
        app.get('/sellerverify/:email',variryJwt,async(req,res)=>{
            const email = req.params.email;
            const squery = {email: email, role: "seller"}
            const result = await users.findOne(squery)

            if(result){
                return res.send({seller: true})
            }
            else{
                return res.send({seller: false})
            }
        })

        // Sendign all the product to the frot side
        app.get('/allproducts', async(req,res)=>{
            const query = {sold: false,advertised: true}
            const result = await products.find(query).toArray()
            res.send(result)

        })
        


    }
    catch{

    }
}

run().catch(err=>console.log(err))






app.listen(port,()=>{
    console.log("Server is runnig on port",port);
})