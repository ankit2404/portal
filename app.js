if(process.env.NODE_ENV !== 'production'){
  require('dotenv').config()
}
const express = require('express');
const body = require("body-parser");
const mongoose = require("mongoose");
const oathcontroller = require('./controller/oath');
const session = require('express-session');
const User = require('./models/user');
const URL = process.env.dbUrl;
const PORT = process.env.PORT || '5500'; 
const LocalStrategy = require('passport-local');
const passport = require('passport');
const path = require('path');
const fs = require("fs");
const multer = require("multer");
const OAuth2Data = require("./credentials.json");
var name,pic
var mongoid;
const {isLoggedIn , isAdmin} = require('./middleware.js');
const { google } = require("googleapis");
var cookieParser = require('cookie-parser');
var id;
var docname;
var viewLink;
var downloadLink;
const app = express();
const hbs = require('hbs');

app.use(express.static((__dirname,'public')));
mongoose.connect(URL, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false,useCreatedIndex: true }).then(() => { 
}).catch((error) => {
  console.log('Error:', error.message)
})

app.use(cookieParser());

const CLIENT_ID = OAuth2Data.web.client_id;
const CLIENT_SECRET = OAuth2Data.web.client_secret;
const REDIRECT_URL = OAuth2Data.web.redirect_uris[0];

const oAuth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URL
);
const drive = google.drive({ version: "v3",auth:oAuth2Client  });
var authed = false;
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile";

app.use(body.urlencoded({extended:true}));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    cookie:{
     httpOnly:true,
     expires:Date.now()+1000*60*60*24*7,
     maxAge:1000*60*60*24*7
  }}))


app.set('view engine', 'hbs');
app.set('views', path.join(__dirname , 'views'));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


var Storage = multer.diskStorage({
  destination: function (req, file, callback) {
  callback(null, "./images");
  },
  filename: function (req, file, callback) {
  callback(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
  },
});


app.use('/' , oathcontroller);


var upload = multer({
  storage: Storage,
}).single("file"); 

app.get("/", isLoggedIn,(req, res) => {
   if (!authed) {
   var url = oAuth2Client.generateAuthUrl({
   access_type: "offline",
   scope: SCOPES,
    });
    res.render("index", { url: url });
    } else {
    var oauth2 = google.oauth2({
      auth: oAuth2Client,
      version: "v2",
    });
    oauth2.userinfo.get(function (err, response) {
      if (err) {
        console.log(err);
      } else {
        name = response.data.name
        pic = response.data.picture
        res.render("success", {
          name: response.data.name,
          pic: response.data.picture,
          success:false
        });
      }
    });
  }
});


app.post("/upload", (req, res) => {
  upload(req, res, async function (err) {
    if (err) {
      console.log(err);
      return res.end("Something went wrong");
    } else {
      const fileMetadata = {
        name: req.file.filename,
      };
      const media = {
        mimeType: req.file.mimetype,
        body: fs.createReadStream(req.file.path),
      };
    try{
       const ab = await drive.files.create({
          resource: fileMetadata,
          media: media,
        },
       (err, file) => {
          if (err) {
            console.error(err);
          } else {
            fs.unlinkSync(req.file.path)
            res.render("success",{name:name,pic:pic,success:true})
            id = file.data.id;
            var arr = file.data.name.split("_");
            docname = arr[2];
           mongoid = req.cookies.mongoid;
            generatelink(id);
          }});
    }catch(err){
      console.log(err);
    }}
  });
});



const generatelink = async(id) =>{
  try{
      const fileid = id;
       await drive.permissions.create({
           fileId : fileid,
           requestBody : {
              role : 'reader',
              type : 'anyone'
           },
       });

       const result = await drive.files.get({
           fileId : fileid ,
           fields : 'webViewLink , webContentLink',
       });
       viewLink = result.data.webViewLink;
       downloadLink = result.data.webContentLink;
       const data = {
        filename : docname,
        downloadLink : downloadLink,
        viewLink : viewLink
    }
      const user = await User.findById(mongoid);
      user.links.push(data);
      await user.save();

  }catch(err){
      console.log(err.message)
  }
}


app.get('/logout',(req,res) => {
    authed = false
    req.logout();
    res.redirect('/login')
})

app.get("/google/callback", function (req, res) {
  const code = req.query.code;
  if (code) {
    oAuth2Client.getToken(code, function (err, tokens) {
      if (err) {
        console.log("Error authenticating");
        console.log(err);
      } else {
        oAuth2Client.setCredentials(tokens);
        authed = true;
        res.redirect("/");
      }
    });
  }
});

hbs.registerHelper("url", function (index){
  return oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
});


app.get('/users' ,isLoggedIn , isAdmin ,  async function(req,res) {
 const users = await User.find({
   role : 'user',
 })
 var url = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  res.render("admin-page", { users: users , url : url});

})

app.get('/user/info' ,isLoggedIn, (req , res) => {
res.render('user-page',{user : req.user});
 })

 app.get('/user/edit' , isLoggedIn , isAdmin , async(req, res) => {
  mongoid = req.cookies.mongoid;
  const users = await User.find({
      _id : mongoid,
  })
  res.render('edit-user' , {user : users[0]});
})
app.post('/user/edit' , isLoggedIn , isAdmin , async(req,res) =>{
  mongoid = req.cookies.mongoid;
  await User.findByIdAndUpdate(mongoid,req.body);
  res.redirect('/users');
})

app.get('/user/delete' , isLoggedIn , isAdmin , async(req,res) => {
  mongoid = req.cookies.mongoid;
 
await User.findByIdAndDelete(mongoid);
res.redirect('/users');
})

app.get('/document/delete',isLoggedIn , isAdmin , async(req,res) =>{
  mongoid = req.cookies.mongoid;
  const users = await User.find({
    _id : mongoid,
})
res.render('delete-documents' , {user : users[0]});
})

app.get('/delete/:userId/document/:documnentId' , isLoggedIn , isAdmin , async(req,res) => {
 const userId = req.params.userId;
 const documentId = req.params.documnentId;

await User.findByIdAndUpdate(userId,{$pull:{links:{_id:documentId}}});
res.redirect('/document/delete');
})

app.get('/user/front' ,isLoggedIn, (req , res) => {
  res.render('user-front',{user : req.user});
   })

app.get('/user/doc' ,isLoggedIn, (req , res) => {
    res.render('user-doc',{user : req.user});
  })
app.get('/user/editInfo' ,isLoggedIn, (req , res) => {
  res.render('user-edit',{user : req.user});
  })

  app.post('/user/editInfo' , isLoggedIn , async(req,res) =>{
    await User.findByIdAndUpdate(req.user.id,req.body);
    res.redirect('/user/front');
  })

app.get('/user/changePassword' ,isLoggedIn, (req , res) => {
    res.render('user-changepass',{user : req.user});
  })
  app.post('/user/changePassword' , isLoggedIn , async(req,res) =>{
    const {changedPassword,changedRePassword} = req.body;
    if(changedRePassword !== changedPassword){
        res.redirect('/user/changePassword')
    }
    else{
      const user = await User.findById(req.user._id)
      const result = await user.setPassword(req.body.changedPassword)
      await User.findByIdAndUpdate(req.user.id,{hash:result.hash,salt:result.salt});
      req.logout();
      res.redirect('/login');
    }
  })

app.listen(PORT, () => {
  console.log("App is listening on Port 5500");
});


