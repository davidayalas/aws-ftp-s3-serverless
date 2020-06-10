<template>
  <div id="app">

    <Messages v-bind:loading="loading"  
              v-bind:message="message" 
    />

    <Login @action="actionControler" />

    <Controls @action="actionControler" />

    <Browser @browse="browseControler" 
             v-bind:s3data="s3data"  
             v-bind:currentDir="currentDir"
             v-bind:loading="loading"   
    />
    <Upload @action="actionControler" 
            v-bind:isRoot="isRoot"
            v-bind:uploadMsg="uploadMsg"
    />

    <Log v-bind:log="log" 
         v-bind:updates="updates" 
         v-bind:isRoot="isRoot"
    />

  </div>
</template>

<style>
  #app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
    margin: 1em auto;
    max-width: 50%;
  }

  div{
      display: block;
      margin: auto;
      padding: 1em;
  }   

  a{
      position: relative;
      text-decoration: none;
      color: blue;
  }

  a:before {
    content: "";
    position: absolute;
    width: 100%;
    height: 2px;
    bottom: 0;
    left: 0;
    background-color: blue;
    visibility: hidden;
    transform: scaleX(0);
    transition: all 0.3s ease-in-out;
  }
  a:hover:before {
    visibility: visible;
    transform: scaleX(1);
  }
  @media (max-width: 600px) {
      #app{
        max-width: 100%;        
      }
  }          
</style>

<script>
  import Login from './components/Login.vue'
  import Controls from './components/Controls.vue'
  import Browser from './components/Browser.vue'
  import Upload from './components/Upload.vue'
  import Messages from './components/Messages.vue'
  import Log from './components/Log.vue'
  import endpoint from '@/assets/js/endpoint.js'

  export default {
    name: 'App',
    data() {
      return { 
        s3data : {},
        currentDir : "",
        loading : false,
        message : "",
        uploadMsg : "",
        isRoot : true,
        log : [],
        updates : {}
      }
    },
    components: {
      Login,
      Controls,
      Browser,
      Upload,
      Messages,
      Log
    },
    methods : {
      checkIfRoot() {
          this.isRoot = this.currentDir==="" ? true : false;
      },
      async actionControler(action, data) {
        this.loading = true;
        //action to do
        switch(action){
          case "browse": {
            this.s3data = this.browseControler(data, 'forward');
            break;
          }
          
          case "create": {
            var folder = prompt("Folder name", "folder");
            if(folder){
              this.log.push({"name": folder, "path": this.currentDir, "creating" : true});
              const signedForm = await this.$getRequest(endpoint.get() + "/getuploadform?path="+this.currentDir+"/");
              const formData = this.$generateFormData(signedForm, new File([""], ""), folder+"/");
              await this.$postRequest(signedForm.endpoint, formData);
              this.updates = {"name": folder, "action" : "created"};
              this.browseControler(this.currentDir, 'default');
            }
            break;
          }

          case "delete": {
            let keys = [];
            let logs = this.log;
            Array.prototype.forEach.call(document.querySelectorAll("input[type=checkbox]:checked"), function (item) {
              keys.push(item.value);
              logs.push({"name": item.value, "deleting" : true});
            });
            if(keys.length>0 && window.confirm("Sure?")){
              const response = await this.$postRequest(endpoint.get() + "/deletekeys", JSON.stringify({"keys" : keys}), true);
              const data = await response.json();
              if(data.message==="done"){
                this.updates = {"action" : "deleted"};
                this.browseControler(this.currentDir, 'default');
              }else{
                alert("not authorized")
              }
            }
            break;
          }

          case "download": {
            let keys = [];
            let logs = this.log;
            Array.prototype.forEach.call(document.querySelectorAll("input[type=checkbox]:checked"), function (item) {
              keys.push(item.value);
            });
            if(keys.length>0){
              const response = await this.$postRequest(endpoint.get() + "/getpresignedurls", JSON.stringify({"keys" : keys}), true);
              const data = await response.json();
              for(let i=0,z=data.urls.length;i<z;i++){
                logs.push({"name": keys[i], "downloading" : true});
                await this.$downloadFile(data.urls[i],keys[i]);
                this.updates = {"name": keys[i], "action" : "downloaded"};
              }
            }
            break;
          }

          case "upload": {
            const files = await this.$traverseFileTree(data.items);
            const signedForm = (await this.$getRequest(endpoint.get() + "/getuploadform?path="+this.currentDir+"/"));
            let formData;
            let path;
            for(let i=0,z=files.length;i<z;i++){
              path = files[i].path.replace(files[i].name,"").slice(1);
              this.log.push({"name": files[i].name, "path": path, "uploading" : true});
              formData = this.$generateFormData(signedForm, files[i].binary, path);
              await this.$postRequest(signedForm.endpoint, formData);
              this.updates = {"name": files[i].name, "action" : "uploaded"};
            }
            this.uploadMsg = "Drag content or click here";
            this.browseControler(this.currentDir, 'default');
            break;
          }

          case "uploadFiles": {
            this.uploadMsg = "Uploading...";
            const signedForm = (await this.$getRequest(endpoint.get() + "/getuploadform?path="+this.currentDir+"/"));
            let formData;
            let path;
            for (var i=0; i<data.length; i++) {
              this.log.push({"name": data[i].name, "path": path, "uploading" : true});
              path = data[i].webkitRelativePath.replace(data[i].name,"");
              formData = this.$generateFormData(signedForm, data[i], path);
              if(!(await this.$postRequest(signedForm.endpoint, formData)).ok){
                alert("not authorized")
                break;
              }
              this.updates = {"name": data[i].name, "action" : "uploaded"};
            }
            this.uploadMsg = "Drag content or click here";
            this.browseControler(this.currentDir, 'default');
            break;
          }

        }
        this.loading = false;
      },
      async browseControler(path='', route='forward') {
        this.loading = true;
        //path management
        switch(route){
          case 'forward':
            this.currentDir = this.currentDir ? this.$trimSlash(this.currentDir + "/" + path) : path;
            break;
          case 'parent': {
            let aux = this.currentDir.split("/");
            aux.pop();
            this.currentDir = aux.join("/");
            break;
          }
          case 'home': {
            this.currentDir = '';
            break;
          }
          default: 
            this.currentDir = path;
        }
        this.checkIfRoot();
        this.s3data = await this.$getRequest(endpoint.get() + "/getfiles?path="+this.$trimSlash(this.currentDir));
        this.loading = false;
      } 
    }
  }
</script>

