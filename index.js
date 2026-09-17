import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';

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


app.listen(process.env.PORT || 5000, 
() => {
  console.log('Server is running on port ' + (process.env.PORT || 5000));
}
);