import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

dotenv.config();
const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(bodyParser.json());
app.use(helmet());

mongoose.connect(process.env.MONGO_URI).then(
  ()=>{
    console.log('Connected to Database');
  }
).catch((err)=>{
  console.log('Error connecting to Database', err);
});



app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);


app.listen(process.env.PORT || 5000, 
() => {
  console.log('Server is running on port ' + (process.env.PORT || 5000));
}
);