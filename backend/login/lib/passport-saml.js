module.exports = function (app, config, passport) {

	const saml = require('passport-saml').Strategy;

	// Passport Setup
	passport.serializeUser(function (user, done){
		done(null, user);
	});

	passport.deserializeUser(function (user, done){
		done(null, user);
	});

	var samlConfig = {
		    'entryPoint': config.saml.entry_point,
		    'issuer': config.saml.issuer,
		    'cert': config.saml.cert,
		    'acceptedClockSkewMs': -1
	}

	if(config.saml.privateCert){
		samlConfig.privateCert = config.saml.privateCert;
	}

	if(config.saml.protocol && config.saml.host && config.saml.path){
		samlConfig.callbackUrl = config.saml.protocol + config.saml.host + config.saml.path;
	}else{ 
		samlConfig.path = config.saml.path;
	}

	passport.use(new saml(samlConfig,
		function (profile, done) {
		  return done(null, {'id': profile.uid,'email': profile.email,'displayName': profile.cn,'firstName': profile.givenName,'lastName': profile.sn,'profile': profile});
		})
	);

	app.use(passport.initialize());
	app.use(passport.session());

}