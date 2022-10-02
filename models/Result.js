const mongoose=require("mongoose");
const AnswerSchema=mongoose.Schema({
    qnumber:Number,
    qtype:String,
    answer:String,
    correct: Boolean
});
const ResultSchema=mongoose.Schema({
    QuizName:{
        type:String,
        required:true
    },
    StudentEmail:{
        type: String
    },
    QuizLink:String,
    Answers:[AnswerSchema],
    Score: {
        type:Number,
        default:0
    },
    Total:{
        type:Number,
        default:0
    }
});
const Result=mongoose.model("results",ResultSchema);
const Answer=mongoose.model("answers",AnswerSchema);
module.exports={
    Result:Result,
    Answer:Answer
}