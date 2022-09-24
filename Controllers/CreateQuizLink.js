exports.BuildLink=(data)=>{
    
    var title=data['name'];
    var questions=data['data'];
    var form=`<form method="post" action="/save"><div class="form-group row">
    <div class="col-xs-2 mx-auto">
      
      <p class="form-control" id="ex1" type="text" >${data['name']}</p>
    </div>
    
    </div>`;
    for(var i=0;i<questions.length;i++){
        form+=`
    
    <div class="btn-group pull-right">
        <div class="filter-label">Question Type</div>
        <select class="ml-0 btn btn-default btn-lg btn-course-filter dropdown-toggle p-0" name="QT1" id="QT1"> 
            <option value="${questions[i].qtype}">
                ${questions[i].qtype}
            </option>
            
        </select>
    </div>
            Question ${questions[i].qnumber}: <p type="text" name="Q1" class="form-control mt-3 input-lg">${questions[i].question}</p><br>`;
            if(questions[i].qtype=="short"){
                form+=`<textarea  class="form-control mt-3 input-lg" name="answer${questions[i].qnumber}" placeholder="Write your ans in ${questions[i].charSize.min} to ${questions[i].charSize.max} characters..."></textarea>`
            }
            var arr=['a','b','c','d'];
            for(var k=0;k<questions[i].options.length;k++){
                for(var s=0;s<4;s++){
                    if(questions[i].options[k][arr[s]]){
                        form+=`<div class="input-group-prepend m-3"><input type="radio" name="answer${questions[i].qnumber}"  value="${arr[s]}"><p type="text" name="options${arr[s]+questions[i].qnumber}" class="form-control ml-2">${questions[i].options[k][arr[s]]}</p></div>`
                    }
                }
                //form+=`<div id="a1" class="input-group-prepend m-3"><input type="radio" name="options1"  value="a"><input type="text" name="optionsa1" class="form-control ml-2" required></div>`
            }
                
            
            
        
    
    }
    form+=`<button type="submit" class="btn btn-default btn-success pull-right">Save Quiz</button></form></div></div></div>`
    var body=`<div class="container main">
    <div class="row"> 
    <div class="col-md-12 course-filter p-2" >`
    return body+form;
}