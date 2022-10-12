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
var mongoose = require('mongoose');


router.get('/auth',passport.authenticate('google',{
    
    scope:["email","profile"]
}));
router.get("/Admin_dashboard",async (req,res)=>{
    //console.log(profile);
    
    const quizes=await Quiz.find({email:session.user.email});
    
    var quizData=new Array();
    for(var i=0;i<quizes.length;i++){
        var date=quizes[i].Date.getDate().toString()+"/"+quizes[i].Date.getMonth().toString()+"/"+quizes[i].Date.getFullYear().toString();
        var time=quizes[i].Date.getHours().toString()+":"+quizes[i].Date.getMinutes().toString()+":"+quizes[i].Date.getSeconds().toString();
        var attempted=await Attempt.Result.countDocuments({QuizName:quizes[i].name})
        // console.log(attempted);
        quizData.push({name:quizes[i].name,link:quizes[i].link,date:date,time:time,attempted:attempted});
    }
    //console.log(quizData);
    res.render("Admin_Dashboard",{data:session.user,quizes:quizData});
});
router.get("/createQuiz",(req,res)=>{
    res.render("Create_quiz",{data:session.user});
})
router.get("/Student_dashboard",(req,res)=>{
    res.render("Student_Dashboard",{data:session.user});
});
router.get("/quizDetails/:quizname",async (req,res)=>{
    const results=await Attempt.Result.find({QuizName:req.params.quizname});
    res.render("QuizDetails",{data:session.user,details:results});
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
    var ObjectId = mongoose.Types.ObjectId();
    const quiz=await Quiz.create({
        _id: ObjectId,
        name:data['qname'],
        link:`${process.env.HOST}/attemptquiz/${ObjectId}`,
        data:questions,
        email: session.user.email
        
        
    });

    var code=BuildLink(quiz);
    //console.log(code);
    //console.log()
    fs.writeFileSync(path.join(__dirname,`../views/partials/${ObjectId}.ejs`),code,err=>{
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
    //console.log(session.user);
    try{
    const attempted=await Attempt.Result.findOne({$and:[{QuizId:req.params.name},{StudentEmail:req.params.studentemail}]});
    if(attempted){
       
        res.status(401).send({success:false,error:"You have already Attempted this quiz!"});
    }
    else{
    const correctAnswers=await Quiz.findOne({_id:mongoose.Types.ObjectId(req.params.name)});
    var marks=0,total=0;
    console.log(correctAnswers);
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
        QuizName:correctAnswers.name,
        StudentEmail:req.params.studentemail,
        QuizId:req.params.name,
        QuizLink: process.env.HOST+"/"+req.params.name,
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
        console.log(err);
        res.status(500).sendFile(path.join(__dirname,"../public/Error.html"));
    }
});
router.get("/studentDetails/:studentEmail/:quizname",async (req,res)=>{
    const studentdata=await User.findOne({email:req.params.studentEmail});
    const result=await Attempt.Result.findOne({$and:[{QuizName:req.params.quizname},{StudentEmail:req.params.studentEmail}]});
    const quiz=await Quiz.findOne({name:req.params.quizname});
    //console.log(result,req.params);
    res.render("StudentDetails",{data:session.user,student:studentdata,title:studentdata.name,result:result,quiz:quiz});
})
router.get("/deletequiz/:qname",async (req,res)=>{
    //console.log(req.params.qname,session.user.email);
    const data=await Quiz.findOne({$and:[{name:req.params.qname},{email:session.user.email}]});
    //console.log(data);
    const StudentResults= await Attempt.Result.deleteMany({QuizId:data._id.toString()})
    const result=await Quiz.deleteOne({$and:[{name:req.params.qname},{email:session.user.email}]});
    //console.log(result,StudentResults);
    res.redirect("/Admin_dashboard");
})
module.exports=router;