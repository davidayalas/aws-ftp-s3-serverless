<template>
    <div id="actions" v-if="isLogged">
        <h2 class="pull-left">Hola {{userName}}</h2>
        <a href="#" v-on:click.prevent="sendAction('create')" v-if="!isRoot && !isRootForUser" class="pull-right"><i class="fa fa-plus fa-2x" aria-hidden="true" title="Add folder"></i></a>
        <a href="#" v-on:click.prevent="sendAction('browse', '')" v-if="!isRoot && !isRootForUser" class="pull-right"><i class="fa fa-sync fa-2x" aria-hidden="true" title="Refresh"></i></a>
        <a href="#" v-on:click.prevent="sendAction('delete')" v-if="!isRoot && !isRootForUser" class="pull-right"><i class="fa fa-trash fa-2x" aria-hidden="true" title="Delete selected"></i></a>
        <a href="#" v-on:click.prevent="sendAction('download')" v-if="!isRoot && !isRootForUser" class="pull-right"><i class="fa fa-download fa-2x" aria-hidden="true" title="Download selected"></i></a>
    </div>
</template>

<style>
  .pull-left{
      float: left;
  }

  .pull-right{
      float: right;
  }

  #actions a{
      margin-right: .5em;
  }

  #actions h2{
      margin-top: 0;
  }

  #actions a:hover:before {
    visibility: hidden;
    transition: none;
  }

  @media (max-width: 600px) {
    #actions a{
        font-size: .7em;
    }
    #actions h2.pull-left, #actions a.pull-right{
        float: none;
        width: 100%;
    }
  }
</style>

<script>

  export default {
    name : 'ControlsComponent',
    props : ['isRoot','isRootForUser', 'userName', 'isLogged'],
    methods: {
        sendAction(action, data){
            this.$emit('action', action, data);
        }
    }
  }
</script>
