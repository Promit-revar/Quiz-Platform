const express=require('express');
const fs = require('fs');
const app=express();
const bodyParser = require('body-parser')
const session = require('express-session');
const passport=require('passport');
const googleStrategy=require('passport-google-oauth20');
require('dotenv').config();
const port=process.env.PORT || 8000;
require("./config/database");
const User=require('./models/User');
const {Question,Quiz}=require('./models/Question');
const {BuildLink}=require('./Controllers/CreateQuizLink');
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({ secret: 'cats', resave: false, saveUninitialized: true,cookie: { secure: false }}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(__dirname+'/public'));
passport.use(new googleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google/cb"

},async (access_token,refresh_token,profile,done)=>{
    data=profile['_json']
    session.user=profile['_json'];
    
    try{
		
		const user =await User.findOneAndUpdate({
			name:data['name'],
            email:data['email'],
            role:session.role,
            picture_url:data['picture']
		});
        //console.log(user);
        
	} catch(err){
		console.log(err);
	}
    return done(null,profile);
}));
passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
passport.deserializeUser(function(user, done) {
    done(null, user);
  });
app.get('/auth',passport.authenticate('google',{
    
    scope:["email","profile"]
}));
app.get("/Admin_dashboard",(req,res)=>{
    //console.log(profile);
    
    res.render("Admin_Dashboard",{data:session.user});
});
app.get("/Student_dashboard",(req,res)=>{
    res.render("Student_Dashboard",{data:session.user});
});
app.get('/auth/google/cb',passport.authenticate('google',{failureRedirect: '/',failureMessage:true }),(req,res)=>{
    if(session.role=='admin'){
        res.redirect("/Admin_dashboard");
    }
    else{
        res.redirect("/Student_dashboard");
    }
});
app.get('/login/:role',(req,res)=>{
    session.role=req.params.role;
    //console.log(session.role);
    if(req.params.role=="student"){
        res.sendFile(__dirname+"/public/Studentlogin.html");
    }
    res.sendFile(__dirname+"/public/Admin_login.html");
    
});
app.get('/',(req,res)=>{
    res.sendFile(__dirname+"/public/landing_page.html");
});

app.post('/save',async (req,res)=>{
    var data=req.body;
    var questions=new Array();
    for(var i=1;i<1000;i++){
        if(data['QT'+i.toString()]){
            var qnumber=i;
            var question=data['Q'+i.toString()];
            var qtype=data['QT'+i.toString()];
            var charSize={'max':undefined,'min':undefined};
            var options=new Array();
            var correct=undefined;
            if(qtype=="MCQ"){
                correct=data["options"+i.toString()];
                var alpha=['a','b','c','d'];
                
                for(var k=0;k<4;k++){
                    if(data["options"+alpha[k]+i.toString()]){
                        var opt=alpha[k];
                        var item={[opt]:data["options"+alpha[k]+i.toString()]};
                        options.push(item);
                    }
                }
            }
            else{
                charSize['max']=data["max"+i.toString()];
                charSize['min']=data["min"+i.toString()];
            }
            const ques=await Question.create({
                qnumber:qnumber,
                question:question,
                qtype:qtype,
                correct:correct,
                options:options,
                charSize:charSize
            });
            questions.push(ques);

        }
        
    }
    //console.log(session.user);
    const quiz=await Quiz.create({
        name:data['qname'],
        link:`${process.env.HOST}/attemptquiz/${data['qname']}`,
        data:questions,
        
    });

    var code=BuildLink(quiz);
    //console.log(code);
    //console.log()
    fs.writeFileSync(__dirname+`/views/partials/${data['qname']}.ejs`,code,err=>{
        if(err){
            console.log(err);
        }
    });
    
    res.send(`<h1>link: ${quiz.link}</h1>`);

});
app.get("/attemptquiz/:name/:studentemail",async (req,res)=>{
    var email=req.params.studentemail;
    var result=await User.findOne({email:email});
    //console.log(result);

    res.render('Quiz_link',{title:req.params.name,profile:result});
});
app.post("/submit/:name/:studentemail",async(req,res)=>{
    res.send("<h1>Your Attempt is saved thank you for taking quiz with us!</h1>");
});

app.listen(port,()=>console.log(`Server Running on Port ${port}`));