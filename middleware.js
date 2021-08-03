module.exports.isLoggedIn = (req,res,next) => {
if(!req.isAuthenticated()){
    return res.redirect('/login');
}
next();
}

module.exports.isAdmin = (req,res,next) =>{
    if(req.user.role === 'user'){
         return res.redirect('/user/front');
    }
    next();
}

