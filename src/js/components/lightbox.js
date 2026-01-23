import { Fancybox } from '@fancyapps/ui';

const lightbox = () => {
  Fancybox.defaults.Image = { zoom: false };

  Fancybox.bind('[data-fancybox]', {
    Images: { zoom: false },
    Toolbar: {
      enabled: true,
      display: { left: [], middle: [], right: ['close'] },
    },
    Carousel: { infinite: false },
    Thumbs: false,
    Hash: false,
  });
};

export default lightbox;
