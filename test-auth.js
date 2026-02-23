try {
  const { Strategy: GoogleStrategy } = require('./server/node_modules/passport-google-oauth20');
  console.log('GoogleStrategy loaded successfully');
  new GoogleStrategy({
    clientID: 'test',
    clientSecret: 'test',
    callbackURL: 'http://localhost:5000/callback'
  }, () => {});
  console.log('GoogleStrategy instantiated successfully');
} catch(e) {
  console.error('Error:', e.message);
  console.error('Stack:', e.stack);
}
