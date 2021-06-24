<template>
  <div class="page page_hide">
    <navbar></navbar>
    <Nuxt />
    <modals></modals>
    <foot></foot>
  </div>
<!--  <link rel="preload" media="all" href="css/libs.css" as="style" onload="this.rel='stylesheet'">-->
<!--  <link rel="preload" media="all" href="css/index.css" as="style" onload="this.rel='stylesheet'">-->

<!--  @@if (preloadSlider === true) {-->
<!--  <link rel="preload" as="image" href="img/promo/bg.jpg">-->
<!--  <link rel="preload" as="image" href="img/promo/bg-2.jpg">-->
<!--  }-->
<!--  <script src="js/libs.js" rel="preload" as="script"></script>-->
<!--  @@if (datepicker === true) {-->
  <!--script src="js/libsDatepicker.js" rel="preload" as="script"></script-->
<!--  }-->
<!--  <script src="js/index.js" rel="preload" as="script"></script>-->
</template>

<script>
import Navbar from '@/components/Navbar.vue';
import Modals from '@/components/Modals.vue';
import Foot from '@/components/Foot.vue';

export default {
  components: {Navbar, Modals, Foot},

  mounted() {
    console.log(this.$auth.user);
  }
}
</script>
