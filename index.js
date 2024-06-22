const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5002;

// middleware
app.use(cors());
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
    const medicineCollection =client.db('medicineDb').collection('sellermedicine');
    const cartsCollection =client.db('medicineDb').collection('carts');
    const usersCollection =client.db('medicineDb').collection('users');

    app.get('/categories', async(req,res)=>{
        const cursor = categoriesCollection.find();
        result = await cursor.toArray();
        res.send(result)
    })
    app.get('/sellermedicine', async(req,res)=>{
      const email = req.query.email;
      const query = {email: email}
        const cursor = medicineCollection.find(query);
        result = await cursor.toArray();
        res.send(result)
    })

    // carts collection
    app.get('/carts', async(req,res)=>{
      const cursor = cartsCollection.find();
      result = await cursor.toArray();
      res.send(result)
  })
    app.post('/carts', async(req,res) => {
      const cartItem = req.body;
      const result = await cartsCollection.insertOne(cartItem);
      res.send(result)
    })
    app.delete('/carts/:id', async(req,res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await cartsCollection.deleteOne(query);
      res.send(result)
    })
    app.patch('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const { quantity } = req.body;
      const query = { _id: new ObjectId(id) };
      const update = { $set: { quantity: quantity } };
      const result = await cartsCollection.updateOne(query, update);
      res.send(result);
    });
    // users collection
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