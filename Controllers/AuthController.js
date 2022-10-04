const session = require('express-session');
const passport=require('passport');
const User=require('../models/User');
const googleStrategy=require('passport-google-oauth20');
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
