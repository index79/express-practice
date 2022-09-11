const local = require('./localStrategy');
const kakao = require('./kakaoStrategy');
const google = require('./googleStrategy');
const User = require('../user/user.model');

module.exports = (passport) => {
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {    
    const currentUser = await User.findOne({ id });
    done(null, currentUser);
  });

  local(passport);
  kakao(passport);
  google(passport);
};