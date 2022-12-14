const express=require("express");
const LocalStorage=require("node-localstorage").LocalStorage;
const Attempt=require('../models/Result');
const fs=require("fs");
const {Question,Quiz}=require('../models/Question');
const {BuildLink}=require('../Controllers/CreateQuizLink');
const passport=require('passport');
const path=require("path");
const User=require('../models/User');
const router=express.Router();
var mongoose = require('mongoose');
localStorage = new LocalStorage('./scratch');

router.get('/auth/:role',(req,res,next)=>{
    //console.log(req.params.role);
    localStorage.setItem("role",req.params.role);
    next();
},passport.authenticate('google',{

    scope:["email","profile"]
}));
router.get("/Admin_dashboard",async (req,res)=>{
    ////console.log(JSON.parse(req.sessionStore.sessions[req.sessionID]).passport.user);
    var userData=JSON.parse(req.sessionStore.sessions[req.sessionID]);
    //console.log(userData.passport.user._json);
    if(!userData.passport){
        res.redirect("/");
    }    
    const quizes=await Quiz.find({email:userData.passport.user._json.email});
    
    var quizData=new Array();
    for(var i=0;i<quizes.length;i++){
        var date=quizes[i].Date.getDate().toString()+"/"+quizes[i].Date.getMonth().toString()+"/"+quizes[i].Date.getFullYear().toString();
        var time=quizes[i].Date.getHours().toString()+":"+quizes[i].Date.getMinutes().toString()+":"+quizes[i].Date.getSeconds().toString();
        var attempted=await Attempt.Result.countDocuments({QuizId:quizes[i]._id})
        //console.log(attempted);
        quizData.push({name:quizes[i].name,link:quizes[i].link,date:date,time:time,attempted:attempted,id:quizes[i]._id.toString()});
    }
    //console.log(quizData);
    res.render("Admin_Dashboard",{data:userData.passport.user._json,quizes:quizData});
});
router.get("/createQuiz",(req,res)=>{
    //console.log(JSON.parse(req.sessionStore.sessions[req.sessionID]).passport.user);
    var userData=JSON.parse(req.sessionStore.sessions[req.sessionID]);
    if(!userData.passport){
        res.redirect("/");
    } 
    res.render("Create_quiz",{data:userData.passport.user._json});
})
router.get("/Student_dashboard",(req,res)=>{
    //console.log(JSON.parse(req.sessionStore.sessions[req.sessionID]).passport.user);
    var userData=JSON.parse(req.sessionStore.sessions[req.sessionID]);
    if(!userData.passport){
        res.redirect("/");
    } else{
    res.render("Student_Dashboard",{data:userData.passport.user._json});
    }
});
router.get("/quizDetails/:quizid/:quizname",async (req,res)=>{
    //console.log(JSON.parse(req.sessionStore.sessions[req.sessionID]).passport.user);
    const results=await Attempt.Result.find({QuizId:req.params.quizid});
    const quizes=await Quiz.findOne({_id:mongoose.Types.ObjectId(req.params.quizid)});
    var userData=JSON.parse(req.sessionStore.sessions[req.sessionID]);
    //console.log(userData.passport.user._json);
    if(!userData.passport){
        
        res.redirect("/");
    }else{  
    res.render("QuizDetails",{data:userData.passport.user._json,details:results,quizid:req.params.quizid,quizname:req.params.quizname,quizdata:quizes});
    }
});
router.get('/auth/google/cb',passport.authenticate('google',{failureRedirect: '/',failureMessage:true }),(req,res)=>{
    
    
    var userData=JSON.parse(req.sessionStore.sessions[req.sessionID]);
    //console.log(userData.passport.user._json);
    if(!userData.passport){
        res.redirect("/");
    }
    else{ 
        if(userData.passport.user._json.role=='admin'){
            
            res.redirect("/Admin_dashboard");
        }
        else{
            res.redirect("/Student_dashboard");
        }
    }
});
router.get('/login/:role',(req,res)=>{
    // session.role=req.params.role;
    
    //console.log(session.role);
    //userData.passport.user._json['role']=req.params.role;
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
    ////console.log(JSON.parse(req.sessionStore.sessions[req.sessionID]).passport.user);
    var formData=req.body;
    var userData=JSON.parse(req.sessionStore.sessions[req.sessionID]);
    if(!userData.passport){
        res.redirect("/");
    }
    else{ 
    var questions=new Array();
    for(var i=1;i<1000;i++){
        if(formData['QT'+i.toString()]){
            var qnumber=i;
            var question=formData['Q'+i.toString()];
            var qtype=formData['QT'+i.toString()];
            var charSize={'max':undefined,'min':undefined};
            var options=new Array();
            var correct=undefined;
            var pts=formData['pts'+i.toString()];
            if(qtype=="MCQ"){
                correct=formData["options"+i.toString()];
                var alpha=['a','b','c','d'];
                
                for(var k=0;k<4;k++){
                    if(formData["options"+alpha[k]+i.toString()]){
                        var opt=alpha[k];
                        var item={[opt]:formData["options"+alpha[k]+i.toString()]};
                        options.push(item);
                    }
                }
            }
            else{
                charSize['max']=formData["max"+i.toString()];
                charSize['min']=formData["min"+i.toString()];
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
    //console.log(userData.passport.user._json);
    var ObjectId = mongoose.Types.ObjectId();
    const quiz=await Quiz.create({
        _id: ObjectId,
        name:formData['qname'],
        link:`${process.env.HOST}/attemptquiz/${ObjectId}`,
        data:questions,
        email: userData.passport.user._json.email
        
        
    });

    var code=BuildLink(quiz);
    //console.log(code);
    //console.log()
    fs.writeFileSync(path.join(__dirname,`../views/partials/${ObjectId}.ejs`),code,err=>{
        if(err){
            console.log(err);
        }
    });
    
    res.render("ShareLink",{link:quiz.link,QuizName:quiz.name});
    }
});
router.get("/attemptquiz/:name/:studentemail",async (req,res)=>{
    //console.log(JSON.parse(req.sessionStore.sessions[req.sessionID]).passport.user);
    var userData=JSON.parse(req.sessionStore.sessions[req.sessionID]);
    if(!userData.passport){
        res.redirect('/');
    }
    else{
    
    const attempted=await Attempt.Result.findOne({$and:[{QuizId:req.params.name},{StudentEmail:req.params.studentemail}]});
    if(attempted){
       
        res.status(401).send("<h1>You have already Attempted this quiz!</h1>");
    }
    else{
    
        var email=req.params.studentemail;
        res.render('Quiz_link',{title:req.params.name,profile:userData.passport.user._json});
    }
    }
});
router.post("/submit/:name/:studentemail",async(req,res)=>{
    var userData=JSON.parse(req.sessionStore.sessions[req.sessionID]);
    var answers=new Array();
    //console.log(req.body);
    if(!userData.passport){
        res.redirect('/');
    }else{ 
    //console.log(userData.passport.user._json);
    try{
    
   
    const correctAnswers=await Quiz.findOne({_id:mongoose.Types.ObjectId(req.params.name)});
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
    const Student_details=await User.findOne({email:req.params.studentemail});
    if(req.body.violation){
        
        marks=-1;
    }
    
    const result=await Attempt.Result.create({
        QuizName:correctAnswers.name,
        StudentEmail:req.params.studentemail,
        StudentName: Student_details.name,
        QuizId:req.params.name,
        QuizLink: process.env.HOST+"/"+req.params.name,
        Answers: answers,
        Score:marks,
        Total: total
    });
    result.save();
    
   
    
    res.render("Student_result",{data:userData.passport.user._json,marks:{score:marks,total:total,name:req.params.name}});
    
    }
    
    //res.status(200).send({success:true,message:`Your Response for ${req.params.name} has been submitted successfully`, score:`${result.Score}/${result.Total}`});
    
    catch(err){
        console.log(err);
        res.status(500).sendFile(path.join(__dirname,"../public/Error.html"));
    }
    }
});
router.get("/studentDetails/:studentEmail/:quizname",async (req,res)=>{
    var userData=JSON.parse(req.sessionStore.sessions[req.sessionID]);
    if(!userData.passport){
        res.redirect('/');
    }
    else{ 
    const studentdata=await User.findOne({email:req.params.studentEmail});
    const result=await Attempt.Result.findOne({$and:[{QuizName:req.params.quizname},{StudentEmail:req.params.studentEmail}]});
    const quiz=await Quiz.findOne({name:req.params.quizname});
    //console.log(result,req.params);
    res.render("StudentDetails",{data:userData.passport.user._json,student:studentdata,title:studentdata.name,result:result,quiz:quiz});
    }
})
router.get("/deletequiz/:qid",async (req,res)=>{
    var userData=JSON.parse(req.sessionStore.sessions[req.sessionID]);
    //console.log(req.params.qname,userData.passport.user._json.email);
    if(!userData.passport){
        res.redirect('/');
    }
    else{
    var id = mongoose.Types.ObjectId(req.params.qid); 
    const data=await Quiz.findOne({_id:id});
    //console.log(data);
    const StudentResults= await Attempt.Result.deleteMany({QuizId:req.params.qid});
    const result=await Quiz.deleteOne({_id:id});
    //console.log(result,StudentResults);
    res.redirect("/Admin_dashboard");
    }
});
router.get("/allow/:qid/:email",async(req,res)=>{
    const result=await Attempt.Result.findOneAndDelete({$and:[{QuizId:req.params.qid},{StudentEmail:req.params.email}]});
    res.redirect(`/quizDetails/${req.params.qid}/${result.QuizName}`);

})
router.get("/logout",(req,res)=>{
    req.session.destroy();
    localStorage.clear();
    res.redirect("/");
});
module.exports=router;
