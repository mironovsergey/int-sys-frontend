import Swiper from 'swiper';
import { Navigation, Scrollbar } from 'swiper/modules';

Swiper.use([Navigation, Scrollbar]);

const slider = (element, options) => {
  return new Swiper(element, options);
};

export default slider;
