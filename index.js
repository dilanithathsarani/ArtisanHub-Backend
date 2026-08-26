import express from 'express';
import mongoose from 'mongoose';
import axios from 'axios';
import bodyParser from 'body-parser';

const app = express();

mongoose.connect("mongodb+srv://dilanithathsarani2003_db_user:LZmJFnbAzoaUucRs@cluster0.qwmf28h.mongodb.net/?appName=Cluster0").then(
  ()=>{
    console.log('Connected to Database');
  }
).catch((err)=>{
  console.log('Error connecting to Database', err);
});

app.use(bodyParser.json());




app.listen(process.env.PORT || 5000, 
() => {
  console.log('Server is running on port ' + (process.env.PORT || 5000));
}
);