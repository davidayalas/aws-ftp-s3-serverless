# PoC FTP Serverless

## Lambda

* Al directori lambda estan les funcions que s'utilitzen per signar formularis i llistar objectes

* Aquest projecte utilitza SAML per a autenticar i genera un token JWT que s'utilitza al Custom Authorizer de AWS API Gateway per a deixar passar o no les crides. Es un muntatge comú per a d'altres proves.

## Interfície web

* La resta (css, fonts, icons, images, index.html) és la web que comunica amb la part servidora a AWS
* Si s'executa 

        $ node uncss.js > css/styles.css

    es genera l'html necessari per al formulari. Implica canviar per a temps de producció les referències als css del <head>

* Per a executar el web el local es pot fer així (http://localhost està habilitat a l'autenticació SAML com a origen vàlid)

        $ sudo ./http-server --dir=.