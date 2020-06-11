<template>
  <div id="browser" v-if="logged">
    <table id="contents">
      <!-- Breadcrumbs -->
      <tr v-if="currentDir">
        <td colspan='4'>
            <a href='#' v-on:click.prevent="sendBrowse('', 'home')"><i class='fa fa-home'></i></a> <i class='fa fa-angle-right'></i>  
            <span v-for="(item, index) in getBreadcrumbs()" :key="index">
              <template v-if="index < Object.keys(getBreadcrumbs()).length - 1">
                &nbsp; <a href='#' v-on:click.prevent="sendBrowse(item.fullpath, 'default')">{{item.name}}</a> <i class='fa fa-angle-right'></i> 
              </template>
              <template v-else>
                {{item.name}}
              </template>
            </span> 
        </td>
      </tr>
      <!-- Parent -->
      <tr v-if="!isRoot">
        <td colspan='4'>
            <a href="#" v-on:click.prevent="sendBrowse(currentDir, 'parent')"><i class="fas fa-level-up-alt fa-flip-horizontal" aria-hidden="true"></i></a>
        </td>
      </tr>
      <!-- Folders -->
      <tr v-for="(item, x) in s3data.CommonPrefixes" :key="'pref'+x">
        <td class='selector'>
          <input type='checkbox' class='ftps3-action' v-bind:value="currentDir + '/'+cleanKey(item.Prefix, s3data.Prefix)" v-if="!isRoot"/>
        </td>
        <td colspan='3' class="ftps3-item-folder">
          <i class='fa fa-folder' aria-hidden='true'></i> <a href="#" v-on:click.prevent="sendBrowse(cleanKey(item.Prefix, s3data.Prefix))">{{cleanKey(item.Prefix, s3data.Prefix)}}</a>
        </td>
      </tr>
      <!-- Files -->
      <tr v-for="(item, y) in s3data.Contents" :key="'content'+y">
        <template v-if="cleanKey(item.Key, s3data.Prefix)!==''">
          <td v-if="cleanKey(item.Key, s3data.Prefix)!==''" class='selector'>
            <input type='checkbox' class='ftps3-action' v-bind:value="currentDir + '/'+cleanKey(item.Prefix, s3data.Prefix)+cleanKey(item.Key, s3data.Prefix)" />
          </td>
          <td v-if="cleanKey(item.Key, s3data.Prefix)!==''" class="ftps3-item-filename">
            <i class='fa fa-file' aria-hidden='true'></i> {{cleanKey(item.Key, s3data.Prefix)}}
          </td>
          <td class='ftps3-item-filesize'>{{_bytesToSize(item.Size)}}</td>
          <td class='ftps3-item-date'>{{_getDate(item.LastModified)}}</td>      
        </template>
      </tr>
    </table>
  </div>
</template>

<style>
  #browser{
    display: block;
    margin-top: 3em;
  }
  #contents{
    width: 100%;
  }
  #browser, #contents {
    text-align: left;
  }
  .selector{
    width:2%;
  }
  .ftps3-item-filename{
    width: 50%;
  }
  .ftps3-item-date,.ftps3-item-filesize{
    width: 25%;
  }  

  @media (max-width: 600px) {
    #app{
      max-width: 100%;        
    }
    .ftps3-item-date,.ftps3-item-filesize{
      display: none;
    }
    .ftps3-item-folder,.ftps3-item-filename{
      width: 98%;
    }
  }    
</style>

<script>

  export default {
    name : 'BrowserComponent',
    props : ['s3data','currentDir', 'loading', 'isRoot'],
    data() {
      return {
          logged : false,
      }
    },
    created() {
      this.$root.$on("logged", (name) => {
          if(name){
              this.logged = true;
          }
      });
    },
    methods: {
        sendBrowse(path='', route='forward') {
          this.$emit('browse', path, route);
        },
        cleanKey(item, prefix) {
          if(item){
            return this.$trimSlash(item.replace(prefix, ""));
          }
          return "";
        },
        getBreadcrumbs() {
          if(!this.currentDir || !this.currentDir.split){
            return [];
          }
          const bc = this.currentDir.split("/");
          let paths = [];
          for(let i=0,z=bc.length;i<z;i++){
            paths.push({name:bc[i], fullpath:bc.slice(0,i+1).join('/'), link:(i===z-1?false:true)});
          }
        
          return paths;
        },
        _bytesToSize(bytes) {
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            if (bytes == 0){return '0 Byte';}
            const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
            return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
        },
        _getDate(_date) {
            _date = new Date(_date);
            return ('0' + _date.getDate()).slice(-2) + "/" + ('0'+(_date.getMonth()+1)).slice(-2) +  "/" + _date.getFullYear() + " - " + ('0' + _date.getHours()).slice(-2) + ":" + ('0' + _date.getMinutes()).slice(-2);
        }

    }
  }
</script>
