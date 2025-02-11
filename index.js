const express = require('express');
const cors = require('cors');
var jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const app = express();
const port = process.env.PORT || 5002;

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://medicine-selling-website.web.app",
      "https://medicine-selling-website.firebaseapp.com",
    ]
  })
);
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.4b5mrxj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    const categoriesCollection =client.db('medicineDb').collection('categories');
    const companiesCollection =client.db('medicineDb').collection('companies');
    const medicineCollection =client.db('medicineDb').collection('sellermedicine');
    const cartsCollection =client.db('medicineDb').collection('carts');
    const usersCollection =client.db('medicineDb').collection('users');
    const paymentCollection =client.db('medicineDb').collection('payments');

// jwt  related api
    app.post('/jwt',async(req,res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACESS_TOKEN_SECRET,
        {expiresIn: '2h'}
      
      )
      res.send({token});
    })
    // middlewares
    const verifyToken = (req,res,next) => {
      console.log('inside verify token', req.headers.authorization)
      if(!req.headers.authorization){
        return res.status(401).send({message: 'forbidden access'});
      }
      const token  = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACESS_TOKEN_SECRET, (err,decoded) =>{
        if(err){
          return res.status(401).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
        next();
      })
   
    }
    const verifyAdmin= async (req,res, next ) => {
      const email = req.decoded.email;
      const query = {email: email};
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
        return res.status(403).send({message : 'forbidden access'})
      };
      next()
     }
    //  const verifySeller= async (req,res, next ) => {
    //   const email = req.decoded.email;
    //   const query = {email: email};
    //   const user = await usersCollection.findOne(query);
    //   const isSeller = user?.role === 'seller';
    //   if(!isSeller){
    //     return res.status(403).send({message : 'forbidden access'})
    //   };
    //   next()
    //  }
    // companies
    app.get('/companies', async(req,res)=>{
      const cursor = companiesCollection.find();
      result = await cursor.toArray();
      res.send(result)
  })
  app.post("/companies", async (req, res) => {
    const newItem = req.body;
    console.log(newItem);
    const result = await companiesCollection.insertOne(newItem)
    res.send(result)
    // Here you can add your logic to save the new food item to the database
  });
    // categories
    app.get('/categories', async(req,res)=>{
        const cursor = categoriesCollection.find();
        result = await cursor.toArray();
        res.send(result)
    })
    app.post("/categories", async (req, res) => {
      const newItem = req.body;
      console.log(newItem);
      const result = await categoriesCollection.insertOne(newItem)
      res.send(result)
      // Here you can add your logic to save the new food item to the database
    });
    app.delete('/categories/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await categoriesCollection.deleteOne(query);
      res.send(result);
  });
  app.put('/categories/:id', async (req, res) => {
    const id = req.params.id;
    const categorieData = req.body;
    const query = { _id: new ObjectId(id) };
    const options = { upsert: true };
    const updateDoc = {
      $set: {
        ...categorieData,
      },
    };
  
    try {
      const result = await categoriesCollection.updateOne(query, updateDoc, options);
      res.send(result);
    } catch (error) {
      console.error('Error updating category:', error);
      res.status(500).send({ error: 'Internal server error' });
    }
  });
  
    app.get('/sellermedicine', async(req,res)=>{
      const email = req.query.email;
      const query = {email: email}
        const cursor = medicineCollection.find(query);
        result = await cursor.toArray();
        res.send(result)
    })
    app.post("/sellermedicine", async (req, res) => {
      const newItem = req.body;
      console.log(newItem);
      const result = await medicineCollection.insertOne(newItem)
      res.send(result)
      // Here you can add your logic to save the new food item to the database
    });
    app.delete('/sellermedicine/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await medicineCollection.deleteOne(query);
      res.send(result);
  });

    // carts collection
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts', async (req, res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result);
    });

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    })

    app.patch('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const { quantity } = req.body;
      const query = { _id: new ObjectId(id) };
      const update = { $set: { quantity: quantity } };
      const result = await cartsCollection.updateOne(query, update);
      res.send(result);
    });
    // payment
    
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = Math.round(price * 100); // Ensure amount is an integer
    
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card'],
        });
        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(400).send({ error: error.message });
      }
    });

    // users collection
    app.get('/users', async(req,res)=>{
      // console.log(req.headers)
      const cursor = usersCollection.find();
      result = await cursor.toArray();
      res.send(result)  
  })
  // admin
  app.get('/users/admin/:email',verifyToken, async(req,res)=>{
    const email = req.params.email;
   if( email !== req.decoded.email){
    return res.status(403).send({message: 'unauthorized access'})
   }
   const query  = {email:email };
   const user = await usersCollection.findOne(query);
   let admin = false;
   if(user){
    admin = user?.role === 'admin';
   }
   res.send({ admin });
})
  // seller
  app.get('/users/seller/:email',verifyToken,async(req,res)=>{
    const email = req.params.email;
   if( email !== req.decoded.email){
    return res.status(403).send({message: 'unauthorized access'})
   }
   const query  = {email:email };
   const user = await usersCollection.findOne(query);
   let seller = false;
   if(user){
    seller = user?.role === 'seller';
   }
   res.send({ seller });
})

// user
  app.get('/users/user/:email',verifyToken, async(req,res)=>{
    const email = req.params.email;
   if( email !== req.decoded.email){
    return res.status(403).send({message: 'unauthorized access'})
   }
   const query  = {email:email };
   const guest = await usersCollection.findOne(query);
   let user = false;
   if(guest){
    user = guest?.role === 'user';
   }
   res.send({ user  });
})
    app.post('/users', async(req,res) => {
      const user = req.body;
      const query = {email: user.email}
      const existingUser = await usersCollection.findOne(query)
      if(existingUser){
        return res.send({message: 'user already exists', insertedId : null})
      }
      const result = await usersCollection.insertOne(user);
      res.send(result)
    })
    app.delete('/users/:id',verifyToken,verifyAdmin, async(req,res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await usersCollection.deleteOne(query);
      res.send(result)
    })
    app.put('/users/:id/role',verifyToken,verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const newRole = req.body.role;
      try {
        const query = { _id: new ObjectId(id) };
        const update = { $set: { role: newRole } };
        const result = await usersCollection.updateOne(query, update);
        if (result.modifiedCount > 0) {
          res.send({ message: 'User role updated successfully.' });
        } else {
          res.send({ message: 'No changes made to the user role.' });
        }
      } catch (error) {
        res.status(500).send({ error: 'An error occurred while updating the user role.' });
      }
    });
    // payment related api
    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })
    app.post('/payments', async(req,res) =>{
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment)
      // delete each item from the cart
      const query = {_id: {
        $in: payment.cartIds.map(id => new ObjectId(id))
      }}
      const  deleteResult = await cartsCollection.deleteMany(query);
      res.send({paymentResult,deleteResult})
    })


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    
  }
}
run().catch(console.dir);



app.get('/', (req,res) => {
    res.send('doctor is running')
})

app.listen(port, () => {
    console.log(`medicine Server is running on port ${port}`)
})