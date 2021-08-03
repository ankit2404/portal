const { models } = require("mongoose");
const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const access = new mongoose.Schema({
   filename : String,
   downloadLink : String,
   viewLink : String
})
const images = new mongoose.Schema({
    path : String,
    filename : String,
})

const profile = new mongoose.Schema({
    Fname: {
        type:String,
        required : true,
    },
    Lname : {
        type :String,
    },
   
    Phone : {
        type : Number,
        required : true,
    }, 
    dob : {
        type : String,
        required : true,
    },
    Gender : {
        type : String,
        required : true,
    },
     role : {
         type : String,
        required : true,
     },
   links : [access],
   otp :{
       type :Number,
       default : null,
   },
   Address : {
       type : String,
       required : true,
   },
   State : {
       type : String,
       required : true,
   },
   Pincode : {
       type : Number,
       required : true,
   },
   image : images,
   emergencyContactName : {
       type : String,
       required : true,
   },
   emergencyContactNumber : {
       type : Number,
       required : true,
   },
   marritualStatus : {
    type : String,
    required : true,
   },
   aniverseryDate : {
       type : String,
   },
   joiningDate : {
       type : String,
   },
   Department : {
       type : String,
   },
   Designation : {
       type : String,
   },
   pv : {
       type : String,
   },
   uan : {
       type : String,
   },
   EmployeId : {
       type : String,
   },
   esi : {
       type : String
   }
   
})

profile.plugin(passportLocalMongoose);


module.exports = mongoose.model("User" ,profile );