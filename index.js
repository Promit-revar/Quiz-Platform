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
const Attempt=require('./models/Result');
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
		const checkuser=await User.findOne({email:data['email']});
        if(!checkuser){
		const user =await User.create({
			name:data['name'],
            email:data['email'],
            role:session.role,
            picture_url:data['picture']
		});
        user.save();
        }
        else{
            if(checkuser.role=="student" && checkuser.role!=session.role){
                session.role=checkuser.role;
            }
        }
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
            var pts=data['pts'+i.toString()];
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
                charSize:charSize,
                pts:pts
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
    console.log(result);

    res.render('Quiz_link',{title:req.params.name,profile:result});
});
app.post("/submit/:name/:studentemail",async(req,res)=>{
    var answers=new Array();
    const attempted=await Attempt.Result.findOne({QuizName:req.params.name,StudentEmail:req.params.studentemail});
    if(attempted){
        res.status(401).send({success:false,error:"You have already Attempted this quiz!"});
    }
    else{
    const correctAnswers=await Quiz.findOne({name:req.params.name});
    var marks=0,total=0;
    for(var i=0;i<req.body.QT.length;i++){
        var correct=undefined;
        total+=correctAnswers.data[i].pts;
        if(correctAnswers.data[i].qtype=="MCQ")
            var correct=correctAnswers.data[i].correct==req.body["answer"+(i+1).toString()];
        if(correct){
            marks+=correctAnswers.data[i].pts;
            
        }
        var ans=new Attempt.Answer({
            answer:req.body["answer"+(i+1).toString()],
            qtype:req.body.QT[i],
            qnumber:i+1,
            correct: correct
        });
        
        
        
        answers.push(ans);

    }
    //console.log(answers)
    
    const result=await Attempt.Result.create({
        QuizName:req.params.name,
        StudentEmail:req.params.studentemail,
        QuizLink: process.env.HOST+req.params.name,
        Answers: answers,
        Score:marks,
        Total: total
    });
    result.save();
    res.status(200).send({success:true,message:`Your Response for ${req.params.name} has been submitted successfully`, score:`${result.Score}/${result.Total}`});
    }
});

app.listen(port,()=>console.log(`Server Running on Port ${port}`));