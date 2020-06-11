<template>
  <section v-if="logged && !isRoot"> 
    <div class="log-area" ref="logs">
        <template v-for="item in log">
            <span :key="item.name + item.randomKey" v-if="item.uploading" :class='"ftps3-action-log-"+cleanName(item.name)'><span>Uploading </span> {{item.path}}{{item.name}}</span>
            <span :key="item.name + item.randomKey" v-if="item.deleting" class="ftps3-action-log-deleting"><span>Deleting </span> {{item.name}}</span>
            <span :key="item.name + item.randomKey" v-if="item.downloading" :class='"ftps3-action-log-"+cleanName(item.name)'><span>Downloading </span> {{item.name}}</span>
            <span :key="item.name + item.randomKey" v-if="item.creating" :class='"ftps3-action-log-"+cleanName(item.name)'><span>Creating </span> {{item.path}}/{{item.name}}</span>
        </template>
    </div>
  </section>
</template>

<style>
  div.log-area{
    margin-top: 1em;
    text-align: left;
    display: flex;
    flex-direction: column-reverse;
  }

  @media (max-width: 600px) {
    div.log-area{
      margin: 0 .5em;
    }
  }

</style>

<script>
 
  export default {
    name : 'LogComponent',
    props : ['log', 'updates', 'isRoot'],
    data() {
      return {
          logged : false,
          localUpdates : []
      }
    },
    created() {
      this.$root.$on("logged", (name) => {
          if(name){
              this.logged = true;
          }
      });
    },
    watch: { 
        updates: function(item) { // watch it
          let _className, logline, loglines;
          //let item = _array[_array.length-1];
          switch(item.action){
            case "uploaded":{
              _className = ".ftps3-action-log-"+this.cleanName(item.name);
              logline = this.$refs.logs.querySelector(_className);
              logline.firstChild.innerText = "Uploaded";
              logline.classList.remove(_className.slice(1));
              break;
            }
            case "deleted": {
              _className = ".ftps3-action-log-deleting";
              loglines = this.$refs.logs.querySelectorAll(_className);
              [].forEach.call(loglines, function(line) {
                line.firstChild.innerText = 'Deleted';
                line.classList.remove(_className.slice(1));
              });
              break;
            }  
            case "downloaded":{
              _className = ".ftps3-action-log-"+this.cleanName(item.name);
              logline = this.$refs.logs.querySelector(_className);
              logline.firstChild.innerText = "Downloaded";
              logline.classList.remove(_className.slice(1));
              break;
            }
            case "created":{
              _className = ".ftps3-action-log-"+this.cleanName(item.name);
              logline = this.$refs.logs.querySelector(_className);
              logline.firstChild.innerText = "Created";
              logline.classList.remove(_className.slice(1));
              break;
            }
          }
        }
    },
    methods : {
      cleanName(_name) {
        return _name
          .replace(/\./g,"-")
          .replace(/\$/g,"-")
          .replace(/@/g,"-")
          .replace(/~/g,"-")
          .replace(/\s/g,"-")
          .replace(/\//g,"-")
          .replace(/\[|\(|\)|\[|\]/g,"-")
          ;
      }
    }
  }

</script>
