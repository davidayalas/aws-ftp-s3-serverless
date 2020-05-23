module.exports = function(){

	if(!process.env.SAML_CERT){
		console.log("SAML cert can't be empty");
		return;
	}

	if(!process.env.JWT_SECRET){
		console.log("JWT_SECRET cert can't be empty");
		return;
	}

	if(!process.env.ALLOWED_DOMAINS && !process.env.ALLOWED_HOSTS_PATTERNS){
		console.log("ALLOWED_DOMAINS or ALLOWED_HOSTS_PATTERNS can't be empty");
		return;
	}

	let domains = process.env.ALLOWED_DOMAINS ? process.env.ALLOWED_DOMAINS.split(",") : [];
	let patterns = process.env.ALLOWED_HOSTS_PATTERNS ? process.env.ALLOWED_HOSTS_PATTERNS.split(",") : [];
	
	patterns = patterns.map(function(val){
		return new RegExp(".*\."+val+"$");
	});

	let jwt_saml_profile = process.env.JWT_SAML_PROFILE || "nameID";
	jwt_saml_profile = jwt_saml_profile.split(",");

	let stage = "";
	if(process.env.STAGE){
		stage = "/"+ process.env.STAGE;
	}
	
	let jwt_ttl=1800;
	if(process.env.JWT_TTL){
		jwt_ttl = process.env.JWT_TTL*1;
	}

	//Private Key
	let pk = process.env.SAML_PRIVATE_CERT;
	if(pk){
		if(pk.indexOf("-----")>-1){
			pk = pk.split("-----");
			pk[2] = pk[2].split(" ").join("\n");
			pk = pk.join("-----");
		}else{
			pk = pk.split(" ").join("\n");
		}
	}

	return {
		'stage' : stage,
		'saml' : {
			'protocol' : "https://", 
			'host' : process.env.SAML_DOMAIN || null, //domain if CDN or api gw is over SAML-JWT
			'idp_host' : process.env.IDP_HOST,
			'entry_point' : process.env.SAML_ENTRY_POINT || 'https://'+(process.env.IDP_HOST || 'localhost')+'/idp/profile/SAML2/Redirect/SSO',
			//'entry_point' : process.env.SAML_ENTRY_POINT || 'https://'+(process.env.IDP_HOST || 'localhost')+'/idp/profile/SAML2/POST/SSO',
			'path' : process.env.SAML_PATH || stage+'/login/callback',
			'cert' : process.env.SAML_CERT || null,
			'privateCert' : pk || null,
			'issuer' : process.env.SAML_ISSUER || 'saml-jwt'
		},
		'port' : process.env.PORT || 3000,
		'cookies_secret' : process.env.COOKIES_SECRET || Math.random().toString(36).substring(2, 15),
		'cookies_ttl' : process.env.COOKIES_TTL || 1800000,
		'jwt_secret' : process.env.JWT_SECRET,
		'jwt_saml_profile' : jwt_saml_profile,
		'jwt_ttl' : jwt_ttl,
		'domains' : domains,
		'patterns' : patterns
	}
};