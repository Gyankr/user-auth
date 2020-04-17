const User=require('../models/user');
const bcrypt=require('bcryptjs');
const crypto = require("crypto");
const async = require("async");
const nodemailer=require('../config/nodemailer');

module.exports.signUp=(req, res)=>{
    if(req.isAuthenticated()){
        return res.redirect('/users/dashboard');
    }
    return res.render('user_sign_up', {
        title: "User Auth | Sign Up",
        user: req.user
    });
};

module.exports.signIn=(req, res)=>{
    // console.log(req);
    if(req.isAuthenticated()){
        return res.redirect('/users/dashboard');
    }
    return res.render('user_sign_in', {
        title: "User Auth | Sign In",
        user: req.user,
    });
};

//get the sign up data
module.exports.create=(req, res)=>{
    let errors=[];
    if(req.body.password != req.body.confirm_password){
        errors.push({msg:'Passwords Didn\'t Match'});
    }

    if(req.body.password.length<6){
        errors.push({msg:'Password Should Contain Atleast 6 Characters'});
    }
    if(errors.length>0){
        res.render('user_sign_up',{
            title: "User Auth | Sign Up",
            user: req.user,
            errors,
        });
    }else{
        User.findOne({email: req.body.email}, (err, user)=>{
            if(err)
            {
                console.log("Error",err);
                return;
            }
            if(!user){
                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(req.body.password, salt, (err, hash) => {
                        if (err) throw err;
                        else{
                            User.create({
                                name:req.body.name,
                                email:req.body.email,
                                password:hash
                            }, (err, user)=>{
                                if(err)
                                {
                                    // console.log("error",err);
                                    // return;
                                    errors.push({msg:'Error Creating Account'});
                                    res.render('user_sign_up',{
                                        title: "User Auth | Sign Up",
                                        errors,
                                    });
                                }
                                req.flash(
                                    'success',
                                    'You are now registered and can log in'
                                );
                                return res.redirect('/users/sign-in');
                            });
                        }
                    })
                });
                
            }
            else{
                // return res.redirect('back');
                errors.push({msg:'User Already Exists!'});
                res.render('user_sign_up',{
                    title: "User Auth | Sign Up",
                    errors,
                });
            }
        });
    }
};

//sign in and create a session for user
module.exports.createSession=(req, res)=>{
    //req.flash('success', 'Logged In Sucessfully!');
    return res.redirect('/users/dashboard');

};

module.exports.destroySession=function(req, res){
    req.flash('success', 'Sucessfully Logged Out!');
    req.logout();
    return res.redirect('/users/sign-in');
}

module.exports.dashboard=(req, res)=>{
    //console.log(req.user);

    return res.render('user_dashboard', {
        title: "User Auth | User dashboard",
        user: req.user
    });
    
};

module.exports.forgotPassword=(req, res)=>{
    if(req.isAuthenticated()){
        return res.redirect('/users/dashboard');
    }
    return res.render('user_forgot_password',{
        title: "User Auth | Forgot Password",
        user: req.user
    })
}

module.exports.ForgotPasswordSendEmail=(req,res,next)=> {
    if(req.isAuthenticated()){
        return res.redirect('/users/dashboard');
    }
    async.waterfall([
      function(done) {
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        User.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/users/forgot-password');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {

        var mailOptions = {
          to: user.email,
          subject: 'User Auth | Password Reset Email',
          text: 'Hi, \n\n You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/users/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n\nThank You\nUser Auth Team.'
        };
        //console.log(transporter);
        nodemailer.transporter.sendMail(mailOptions, function(err) {
          console.log('mail sent');
          req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/users/forgot-password');
    });
};
module.exports.ViewResetForm=(req, res)=>{
    if(req.isAuthenticated()){
        return res.redirect('/users/dashboard');
    }
    User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('/forgot');
        }
        res.render('user_password_reset', {
            user: req.user,
            title: "User Auth| Reset Password",
            token: req.params.token,
        });
    });
}
module.exports.ResetUsingToken=(req, res)=>{
    if(req.isAuthenticated()){
        return res.redirect('/users/dashboard');
    }
    async.waterfall([
        function(done) {
          User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
            if (!user) {
              req.flash('error', 'Password reset token is invalid or has expired.');
              return res.redirect('back');
            }
            if(req.body.password === req.body.confirm_password) {


                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(req.body.password, salt, (err, hash) => {
                        if (err) throw err;
                        else{

                            user.password=hash;
                            user.save();
                        }
                    })
                })
                req.flash('success', 'Password Changed Successfully!.');
                res.redirect('/users/sign-in');
            } else {
                req.flash("error", "Passwords do not match.");
                return res.redirect('back');
            }
          });
        }
        ], function(err) {
            res.redirect('/users/forgot-password');
    });
}
