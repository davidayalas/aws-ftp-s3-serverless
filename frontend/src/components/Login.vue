<template>
  <section id="loginContainer" v-if="!logged">  
  <div class="type-1">
      <div>
          <a href="#" id="login" class="btn btn-2" v-on:click.prevent="doLogin()" v-if="!logged">
              <span class="txt">Log in with SAML</span>
              <span class="round"><i class="fa fa-chevron-right"></i></span>
          </a>
      </div>
  </div>
  </section>
</template>

<style>
  #loginContainer .btn-2 {
      background-color: #00AFD1;
  }
  #loginContainer .btn-2 .round {
      background-color: #00c4eb;
  }

  #loginContainer a {
      text-decoration: none;
      -moz-border-radius: 30px;
      -webkit-border-radius: 30px;
      border-radius: 30px;
      padding: 12px 53px 12px 23px;
      color: #fff;
      text-transform: uppercase;
      font-family: sans-serif;
      font-weight: bold;
      position: relative;
      -moz-transition: all 0.3s;
      -o-transition: all 0.3s;
      -webkit-transition: all 0.3s;
      transition: all 0.3s;
      display: inline-block;
  }


  #loginContainer a:hover:before {
    visibility: hidden;
    transition: none;
  }

  #loginContainer a span {
      position: relative;
      z-index: 3;
  }
  #loginContainer a .round {
      -moz-border-radius: 50%;
      -webkit-border-radius: 50%;
      border-radius: 50%;
      width: 38px;
      height: 38px;
      position: absolute;
      right: 3px;
      top: 3px;
      -moz-transition: all 0.3s ease-out;
      -o-transition: all 0.3s ease-out;
      -webkit-transition: all 0.3s ease-out;
      transition: all 0.3s ease-out;
      z-index: 2;
  }
  #loginContainer a .round i {
      position: absolute;
      top: 50%;
      margin-top: -6px;
      left: 50%;
      margin-left: -4px;
      -moz-transition: all 0.3s;
      -o-transition: all 0.3s;
      -webkit-transition: all 0.3s;
      transition: all 0.3s;
  }

  #loginContainer .txt {
      font-size: .9em;
      line-height: 1.45;
  }

  #loginContainer .type-1 a:hover {
      padding-left: 48px;
      padding-right: 28px;
  }
  #loginContainer .type-1 a:hover .round {
      width: calc(100% - 6px);
      -moz-border-radius: 30px;
      -webkit-border-radius: 30px;
      border-radius: 30px;
  }
  #loginContainer .type-1 a:hover .round i {
      left: 12%;
  }

  @media (max-width: 600px) {
    #loginContainer a {
        font-size: .6em;
        line-height: 1.45;
    }
  }

</style>

<script>
  import endpoint from '@/assets/js/endpoint.js'

  const decoder = (base64url) => {
    let json_string;
    try {
      const base64 = base64url.replace('-', '+').replace('_', '/');
      const utf8 = atob(base64);
      const json = JSON.parse(utf8);
      json_string = JSON.stringify(json, null, 4);
    } catch (err) {
      json_string = "Bad Section.\nError: " + err.message;
    }
    return json_string;
  }

  export default {
  name : 'LoginComponent',
  data() {
    return {
        logged : false
    }
  },
  mounted: function () {
    const that = this;
    const token_ttl=window.localStorage.getItem("token_ttl");

    window.addEventListener('message', function(e) {
      if(endpoint.get().indexOf(e.origin)!==0){
        return;
      }
      const message = JSON.parse(decoder(e.data.split(".")[1]));
      window.localStorage.setItem("token_ttl", message.exp);
      window.localStorage.setItem("token", e.data);
      window.localStorage.setItem("token_name", message["urn:oid:2.5.4.42"]);
      window.localStorage.setItem("token_email", message["urn:oid:0.9.2342.19200300.100.1.3"]);
      window.LoginWindow.close();
      //showName();
      that.emitLogged(message["urn:oid:2.5.4.42"]);
    });
    
    if((+new Date()/1000)>token_ttl){
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("token_ttl");
      window.localStorage.removeItem("token_name");
      window.localStorage.removeItem("token_email");
      that.emitLogged(null);
    }else{
      that.emitLogged(window.localStorage.getItem("token_name"));
    }
  },
  methods: {
    doLogin() {
      const w=430, h=430;
      const dualScreenLeft = window.screenLeft != undefined ? window.screenLeft : screen.left;  
      const dualScreenTop = window.screenTop != undefined ? window.screenTop : screen.top;  
      const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;  
      const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;  
      const left = ((width / 2) - (w / 2)) + dualScreenLeft;  
      const top = ((height / 2) - (h / 2)) + dualScreenTop;  
      window.LoginWindow = window.open(endpoint.get()+"/getJWT", "Login", 'scrollbars=yes, width=' + w + ', height=' + h + ', top=' + top + ', left=' + left);  
      if (window.focus) {  
        window.LoginWindow.focus();  
      }  
    },
    emitLogged(name) {
      this.$root.$emit("logged", name);
      this.logged = name!==null ? true : false;
      this.$emit('action', 'browse');
    }
  }
  }
</script>
