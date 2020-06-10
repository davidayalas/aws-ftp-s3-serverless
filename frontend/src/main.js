import Vue from 'vue'
import App from './App.vue'
import '@fortawesome/fontawesome-free/css/all.css'
import utilities from './services/utilities'

Vue.use(utilities);

Vue.config.productionTip = false

window.Vue = new Vue({
  render: h => h(App),
}).$mount('#app')
