const mongoose=require('mongoose');
const QuestionSchema=new mongoose.Schema({
    qnumber: Number,
    question: String,    
    qtype: {
        type: String,
        enum:["MCQ","short"]
    },
    correct: {
		type: String,
		
	},
    options:{
        type:Array,
        default: []
    },
    charSize:{
        min:Number,
        max:Number
    },
    pts:{
        type:Number
    }
    
});
const QuizSchema=new mongoose.Schema({
    name: String,
    link:String,
    data:[QuestionSchema],
    email: String,
    Date: {
        type:Date,
        auto: true,
        default: Date.now
    }
   
});
module.exports = {
    Question:mongoose.model("Question", QuestionSchema),
    Quiz:module.exports = mongoose.model("Quiz", QuizSchema)
};