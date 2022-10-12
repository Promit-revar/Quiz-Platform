const express=require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const app=express();
require('dotenv').config();
require("./config/database");
const router=require('./Routes/web');
const passport=require("passport");
const port=process.env.PORT || 8000;
require("./Controllers/AuthController");

app.set('view engine','ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: 'cats', resave: false, saveUninitialized: true,cookie: { secure: false }}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname+'/public'));
app.use(router);


app.listen(port,()=>console.log(`Server Running on Port ${port}`));