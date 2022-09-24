const mongoose=require('mongoose');
const UserSchema=new mongoose.Schema({
    name: String,    
    email: String,
    role: {
		type: String,
		enum: ["student","admin"],
		default: "admin",
	},
    picture_url: String	
});
module.exports = mongoose.model("User", UserSchema);
/* sub: '105428478451079937598',
    name: 'Promit Revar',
    given_name: 'Promit',
    family_name: 'Revar',
    picture: 'https://lh3.googleusercontent.com/a-/ACNPEu-KT9NlWFczZ1aEA6ET6poRQLQQ8lUsbVPKTeNPRg=s96-c',
    email: 'promit.revar2211@gmail.com',
    email_verified: true,
    locale: 'en' */