const mongoose=require('mongoose');
require('dotenv').config();
var database_name=process.env.DATABASE;
var username=process.env.DATABASE_USERNAME;
var password=process.env.DATABASE_PASSWORD;
mongoose.connect(`mongodb+srv://${username}:${password}@cluster0.nfnlcqf.mongodb.net/${database_name}?retryWrites=true&w=majority`)

