import { createApp } from 'vue'
import VuePlyr from 'vue-plyr'
import 'vue-plyr/dist/vue-plyr.css'
import App from './App.vue'

createApp(App).use(VuePlyr, { plyr: {} }).mount('#app')