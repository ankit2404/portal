const User = require('../models/user');
const express = require('express');
const router = express.Router();
const path = require('path');
const {isLoggedIn , isAdmin} = require('../middleware.js');
const passport = require('passport');
const nodeMailer = require('nodemailer');
const nodeoutlook = require('nodejs-nodemailer-outlook')
const multer = require('multer');
const {cloudinary,storage} = require('../cloudinary')
const upload = multer({storage});
const moment = require('moment');
router.get('/login',(req,res)=>{
    res.render( 'login');
})
router.get('/signup',(req,res)=>{
    res.render( 'register');
})
router.post('/login',passport.authenticate('local',{failureFlash:false,failureRedirect:'/login'}),(req,res)=>{
  res.redirect('/user/front');
})
router.get('/adminsignup',isLoggedIn , isAdmin ,(req,res)=>{
    res.render( 'admin-register');
})
router.post('/signup',upload.single('Picture'), async(req,res)=>{
   
    const {Fname,Lname,username,Phone,password, Confirmpassword,Gender,dob,Pincode,Address,State,emergencyContactName,emergencyContactNumber,marritualStatus,aniverseryDate,joiningDate,Department,Designation,pv,uan,EmployeId,esi} = req.body ;
    const role = 'user';
   let dob1 = moment(dob).format('DD-MMM-YYYY');
   let aniverseryDate1 = moment(aniverseryDate).format('DD-MMM-YYYY');
   let joiningDate1 = moment(joiningDate).format('DD-MMM-YYYY');
    if(password  !== Confirmpassword ){
    
      return res.redirect('/signup');
    }
    const image = {};
   if(req.file){
       image.path = req.file.path
       image.filename = req.file.filename
   }
    const user = new User({Fname,Lname,username,Phone,Gender,dob : dob1,role,Pincode,Address,State,emergencyContactName,emergencyContactNumber,marritualStatus,aniverseryDate : aniverseryDate1, joiningDate : joiningDate1,Department,Designation,pv,uan,EmployeId,esi});
    user.image = image;
    const newUser = await User.register(user,password);
        res.redirect('/login');
})
router.get('/sendotp',(req,res) => {
    res.render('forget-pass');
})

router.post('/sendotp' , async(req,res) => {
    var femail = req.body.forgetEmail;
    const user = await User.findOne({
        username:femail
    })
    if(!user ){
        return res.redirect('/sendotp');
    }
let transporter = nodeMailer.createTransport({
  host : "smtp-mail.outlook.com",
  port: 587,
  secure: false, 
  auth: {
    user: process.env.emailId,
    pass: process.env.password, 
  },
//   tls:{
//       rejectUnauthorized : false,
//       ciphers:'SSLv3'
//   }

// service : 'gmail',
// auth: {
//         user: 'ankit444444444@gmail.com', 
//         pass: 'Ankit@12345', 
//       }
});

var generateOtp = Math.ceil(Math.random()*(999999-100000+1)+100000);

 await User.updateOne({username : femail},{
  otp : generateOtp
 }
 ) 

let mailOptions = {
  from:'"Ceoitbox.com" <ceoitbox24@outlook.com>', 
  to: femail, 
  subject: "One Time Password", 
  text: "Your one time password is " + generateOtp , 
};

transporter.sendMail(mailOptions , (error,info) =>{
    if(error){
        return console.log(error);
    }
    console.log("Message sent: %s", info.messageId);

    console.log("Preview URL: %s", nodeMailer.getTestMessageUrl(info));
    res.redirect(`/otp/${user._id}`)
})

})

router.get('/otp/:id',(req,res) => {
    res.render('otp' , {id : req.params.id});
})

router.post('/otp/:id' , async(req,res) => {
 const user = await User.findById(req.params.id);
 let enteredOtp = req.body.otp;
 if(enteredOtp == user.otp ){
     user.otp = null;
     await user.save();
    await User.findByIdAndUpdate(req.params.id , {otp : null})
   res.redirect('/changePassword/' + user._id);
 }else{
     res.redirect('/otp/' + user._id);
 }
})

router.get('/changePassword/:id',(req,res) => {
    res.render('set-password' , {id : req.params.id});
})

router.post('/changePassword/:id' ,async(req,res) =>{
    
    const {changedPassword,changedRePassword} = req.body;
    if(changedRePassword !== changedPassword){
        res.redirect('/changePassword')
    }
    else{
        const user = await User.findById(req.params.id)
        const result = await user.setPassword(req.body.changedPassword)
       await User.findByIdAndUpdate(req.params.id,{hash:result.hash,salt:result.salt});
       res.redirect('/login');
    }
})

router.get('/user/info/update',(req,res) =>{
    res.render('changeimage');
})
router.post('/user/info/update',upload.single('picture'), async(req,res) => {
    if(req.file){
        const user = await User.findById(req.user._id);
        cloudinary.uploader.destroy(user.image.filename);
        user.image = {path: req.file.path , filename : req.file.filename};
        await user.save();
        res.redirect('/user/front');
    }
} )

module.exports = router ;

