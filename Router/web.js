const express=require("express");
const Attempt=require('../models/Result');
const session = require('express-session');
const fs=require("fs");
const {Question,Quiz}=require('../models/Question');
const {BuildLink}=require('../Controllers/CreateQuizLink');
const passport=require('passport');
const path=require("path");
const User=require('../models/User');
const router=express.Router();

router.get('/auth',passport.authenticate('google',{
    
    scope:["email","profile"]
}));
router.get("/Admin_dashboard",(req,res)=>{
    //console.log(profile);
    
    res.render("Admin_Dashboard",{data:session.user});
});
router.get("/Student_dashboard",(req,res)=>{
    res.render("Student_Dashboard",{data:session.user});
});
router.get('/auth/google/cb',passport.authenticate('google',{failureRedirect: '/',failureMessage:true }),(req,res)=>{
    if(session.role=='admin'){
        res.redirect("/Admin_dashboard");
    }
    else{
        res.redirect("/Student_dashboard");
    }
});
router.get('/login/:role',(req,res)=>{
    session.role=req.params.role;
    
    if(req.params.role=="student"){
        res.sendFile(path.join(__dirname,"../public/Studentlogin.html"));
    }
    else if(req.params.role=='admin'){
    res.sendFile( path.join(__dirname,"../public/Admin_login.html"));
    }
});
router.get('/',(req,res)=>{
    
    res.sendFile(path.join(__dirname,"../public/landing_page.html"));
});

router.post('/save',async (req,res)=>{
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
    fs.writeFileSync(path.join(__dirname,`../views/${data['qname']}.ejs`),code,err=>{
        if(err){
            console.log(err);
        }
    });
    
    res.send(`<h1>link: ${quiz.link}</h1>`);

});
router.get("/attemptquiz/:name/:studentemail",async (req,res)=>{
    var email=req.params.studentemail;
    var result=await User.findOne({email:email});
   //console.log(result);

    res.render('Quiz_link',{title:req.params.name,profile:result});
});
router.post("/submit/:name/:studentemail",async(req,res)=>{
    var answers=new Array();
    console.log(session.user);
    try{
    const attempted=await Attempt.Result.findOne({$and:[{QuizName:req.params.name},{StudentEmail:req.params.studentemail}]});
    if(attempted){
        res.status(401).send({success:false,error:"You have already Attempted this quiz!"});
    }
    else{
    const correctAnswers=await Quiz.findOne({name:req.params.name});
    var marks=0,total=0;
    //console.log(correctAnswers);
    var size=1;
    if(Array.isArray(req.body.QT)){
        size=req.body.QT.length;
    }
    for(var i=0;i<size;i++){
        var correct=undefined;
        total+=correctAnswers.data[i]['pts'];
        if(correctAnswers.data[i].qtype=="MCQ")
            var correct=correctAnswers.data[i].correct==req.body["answer"+(i+1).toString()];
        if(correct){
            marks+=correctAnswers.data[i]['pts'];
            
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
    
    res.render("Student_result",{data:session.user,marks:{score:marks,total:total,name:req.params.name}});
    
    }
    
    //res.status(200).send({success:true,message:`Your Response for ${req.params.name} has been submitted successfully`, score:`${result.Score}/${result.Total}`});
    }
    catch(err){
        res.status(500).sendFile("../public/Error.html");
    }
});
module.exports=router;