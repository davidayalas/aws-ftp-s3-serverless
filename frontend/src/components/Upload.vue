<template>
  <div id="upload-area" v-if="isLogged && !isRoot && !isRootForUser"
    v-on:dragover.stop.prevent="uploadMessage('Upload')"
    v-on:dragleave.stop.prevent="uploadMessage('Drag content or click here')"
    v-on:drop.stop.prevent="drop"
    v-on:click="click"
  >
    <h1 ref="uploadDialog">Drag content or click here</h1>
    <input type="file" name="file" ref="uploadFile" multiple style="display:none" v-on:change="change" />    
    <!--input type="file" name="file" ref="uploadFolder" webkitdirectory multiple style="display:none" v-on:change="change" /--> 
 </div>
</template>

<style>
  #upload-area{
    border: 2px solid #ccc;
    border-radius: 15px;
    margin-top: 1em;
    text-align: center;
    border: 2px dotted #ccc;
  }

  @media (max-width: 600px) {
    h1{
      font-size:1.1em;
    }  
    #upload-area{
      margin: 1em .5em;
      padding: 1em;
    }
  }
</style>

<script>

  export default {
  name : 'ControlsComponent',
  props : ['isRoot','uploadMsg', 'isLogged', 'isRootForUser'],
  watch: { 
    uploadMsg: function(msg) { 
      this.uploadMessage(msg);
    }   
  }, 
  methods: {
    sendAction(action) {
      this.$emit('action', action)        
    },
    uploadMessage(message) {
      this.$refs.uploadDialog.innerText = message;
    },
    click() {
      this.$refs.uploadFile.click();
    },
    change() {
      this.$emit('action', 'uploadFiles', this.$refs.uploadFile.files);
    },
    drop(e) {
      this.uploadMessage('Uploading...');
      this.$emit('action', 'upload', e.dataTransfer);
    }
  }
  }
</script>
