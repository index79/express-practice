const GoogleStrategy = require('passport-google-oauth20').Strategy;
const UserService = require('../user');

module.exports = (passport) => {     
   passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_ID, // 구글 로그인에서 발급받은 REST API 키
        clientSecret: process.env.GOOGLE_SECRET,
        callbackURL: '/auth/google/callback', // 구글 로그인 Redirect URI 경로
    }, async (accessToken, refreshToken, profile, done) => {        
        console.log('google profile : ', profile);
        const id = profile.id;
        const email = profile.emails[0].value;
        const firstName = profile.name.givenName;
        const lastName = profile.name.familyName;
        const profilePhoto = profile.photos[0].value;
        const source = "google";

        const currentUser = await UserService.getUserByEmail({ email })

        if (!currentUser) {
            const newUser = await UserService.addGoogleUser({
            id,
            email,
            firstName,
            lastName,
            profilePhoto
            })
            return done(null, newUser);
        }

        if (currentUser.source != "google") {
            //return error
            return done(null, false, { message: `You have previously signed up with a different signin method` });
        }        
        currentUser.lastVisited = new Date();
        return done(null, currentUser);    
    }));
};