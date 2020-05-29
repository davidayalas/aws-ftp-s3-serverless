const jwt = require('jsonwebtoken');

module.exports = function (app, config, passport) {

	//Ensures user auth or redirects to login
	function ensureAuthenticated(req, res, next) {
		if (req.isAuthenticated()){
			return next();
		} 

		res.cookie('url', req.originalUrl, { httpOnly: true, secure: true });
		return res.redirect(config.stage+"/login");
	}

	function checkHost(req, res, next){
		
		if(!req.query.referer || req.query.referer.length===0){
			req.query.referer = [req.cookies.referer]; 
		}

		if(config.domains.includes(req.query.referer) || req.query.referer===config.saml.idp_host){
			return next();
		}

		for(let i=0,z=config.patterns.length;i<z;i++){
			if(config.patterns[i].test(req.query.referer)){
				return next();
			}
		}		

		return res.send("host not allowed");
	}

	//redirects to saved url when IdP call login callback or to cloudfront redirector html page
	app.get('/redirect', function(req, res, next){
		var urlCookie = req.cookies.url;
		var stage = config.stage;

		if(urlCookie && (urlCookie.indexOf("http://")>-1 || urlCookie.indexOf("https://"))>-1){
			stage = "";
		}

		var redirect2url = stage + (urlCookie?urlCookie:"/");
		res.clearCookie("url");
		
		if(redirect2url){
			res.redirect(redirect2url);
		}else{
			res.status(404).send("not found");
		}
	});

	//triggers login
	app.get('/login', passport.authenticate('saml', {failureRedirect: config.stage+'/login'}));

	//callback for login 
	app.post('/login/callback', passport.authenticate('saml', {successRedirect: config.stage+'/redirect', failureRedirect: config.stage+'/'}));

	//profile
	app.get('/profile', ensureAuthenticated, function(req, res){
		if(req.user){
			res.jsonp(req.user.profile);
		}else{
			res.status(403).send("forbidden");
		}
	});
	
	//get JWT token
	app.get("/getJWT*", checkHost, ensureAuthenticated, function(req, res, next){
		var object2Sign = {};

		for(var i=0,z=config.jwt_saml_profile.length;i<z;i++){
			object2Sign[config.jwt_saml_profile[i]] = req.user.profile[config.jwt_saml_profile[i]];
		}
		
		var token = jwt.sign(object2Sign, config.jwt_secret, { expiresIn: config.jwt_ttl });

		const referer = req.query.referer===config.saml.idp_host?req.cookies.referer:req.query.referer;

		const script = `
			<script>
			(function() {
				window.opener.postMessage(
					'${token}',
					'https://${referer}'
				);
			})()
			</script>
		`;
		res.send(script);	
	});

	//sets cookie JWT token
	app.get("/setCookieJWT*", ensureAuthenticated, function(req, res, next){
		var object2Sign = {};

		for(var i=0,z=config.jwt_saml_profile.length;i<z;i++){
			object2Sign[config.jwt_saml_profile[i]] = req.user.profile[config.jwt_saml_profile[i]];
		}
		
		var token = jwt.sign(object2Sign, config.jwt_secret, { expiresIn: config.jwt_ttl });

		const referer = req.cookies.origin;
		
		res.cookie('Authorization', token, { httpOnly: true, secure: true, sameSite: 'strict' });
		res.clearCookie("origin");

		res.redirect(referer);
	});

};