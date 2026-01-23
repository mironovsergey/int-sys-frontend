import 'lazysizes';
import Modal from 'bootstrap/js/dist/modal';
import lightbox from './components/lightbox';
import Gallery from './components/gallery';
import Form from './components/form';
import slider from './components/slider';
import xmark from '../template/icons/xmark.svg';

export default class App {
  constructor() {
    this.initLightbox();
    this.initHeader();
    this.initVisibilityObserver();
    this.initOffcanvas();
    this.initHeroGallery();
    this.initForms();
    this.initServicesSlider();
    this.initPartnerCard();
  }

  initLightbox() {
    lightbox();
  }

  initHeader() {
    const header = document.querySelector('.header');

    if (!header) return;

    let scrollTop = 0;
    let scrollDelta = 5;
    let isScrolledUp = false;

    const handleScroll = () => {
      const headerRect = header.getBoundingClientRect();
      const currentTop =
        window.pageYOffset || document.documentElement.scrollTop;
      const isHeaderScrolled = headerRect.top === 0 && currentTop !== 0;

      if (isHeaderScrolled) {
        header.classList.add('is-scrolled');
      } else {
        header.classList.remove('is-scrolled');
      }

      if (!isHeaderScrolled || Math.abs(scrollTop - currentTop) > scrollDelta) {
        isScrolledUp = scrollTop > currentTop && isHeaderScrolled;
        header.classList.toggle('is-scrolled-up', isScrolledUp);
      }

      scrollTop = currentTop;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    handleScroll();
  }

  initVisibilityObserver() {
    const steps = 100;
    const thresholds = Array.from({ length: steps + 1 }, (_, i) => i / steps);
    const cssVar = '--viewport-visibility';

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const ratio = Math.max(0, Math.min(1, entry.intersectionRatio));
          entry.target.style.setProperty(cssVar, String(ratio));
        });
      },
      { threshold: thresholds },
    );

    document.querySelectorAll('.viewport-observer').forEach((element) => {
      element.style.setProperty(cssVar, '0');
      observer.observe(element);
    });
  }

  initOffcanvas() {
    const offcanvas = document.querySelector('.offcanvas');
    const toggleButtons = document.querySelectorAll(
      '[data-toggle="offcanvas"]',
    );

    if (!offcanvas || toggleButtons.length === 0) return;

    const toggleOffcanvas = () => {
      offcanvas.classList.toggle('show');
    };

    toggleButtons.forEach((button) => {
      button.addEventListener('click', toggleOffcanvas);
    });
  }

  initHeroGallery() {
    const heroGallery = document.querySelector('.hero__gallery');

    if (!heroGallery) return;

    const dataSrc = heroGallery.getAttribute('data-src');

    if (!dataSrc) return;

    fetch(dataSrc)
      .then((response) => response.json())
      .then((data) => {
        const pages = data?.page || {};
        const imageData = Object.values(pages)
          .map((page) => ({
            url: page?.extended?.properties?.property?.[0]?.value?.path,
            link: page?.link,
          }))
          .filter((item) => item.url);

        if (imageData.length === 0) return;

        const gallery = new Gallery(heroGallery, imageData);

        gallery.canvas.addEventListener('gallery:imageClick', (event) => {
          const { item } = event.detail;
          this.loadProjectModal(item.link, gallery);
        });

        gallery.initialize().then(() => gallery.start());
      });
  }

  loadProjectModal(link, gallery) {
    fetch(link, {
      method: 'GET',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
      .then((response) => response.text())
      .then((html) => {
        this.showProjectModal(html, gallery);
      })
      .catch(() => {
        this.showProjectModal('Ошибка при загрузке контента', gallery);
      });
  }

  showProjectModal(content, gallery) {
    const modalHTML = `
      <div class="modal fade" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-large">
          <div class="modal-content">
            <button type="button" class="btn btn-outline-secondary btn-small" data-bs-dismiss="modal">${xmark}</button>
            <div class="modal-body">${content}</div>
          </div>
        </div>
      </div>
    `;

    const parser = new DOMParser();
    const doc = parser.parseFromString(modalHTML, 'text/html');
    const modalElement = doc.body.firstChild;

    document.body.appendChild(modalElement);

    const modalInstance = new Modal(modalElement, { focus: false });

    const handleHidden = () => {
      gallery.start();
      modalInstance.dispose();
      modalElement.remove();
    };

    modalElement.addEventListener('hidden.bs.modal', handleHidden, {
      once: true,
    });

    modalInstance.show();
  }

  initForms() {
    document.querySelectorAll('.form').forEach((element) => new Form(element));
  }

  initServicesSlider() {
    document.querySelectorAll('.services-slider').forEach((element) => {
      const scrollbar = element.querySelector('.swiper-scrollbar');
      const prev = element.querySelector('.swiper-button-prev');
      const next = element.querySelector('.swiper-button-next');

      slider(element, {
        slidesPerView: 'auto',
        scrollbar: {
          el: scrollbar,
          draggable: true,
        },
        navigation: {
          prevEl: prev,
          nextEl: next,
        },
      });
    });
  }

  initPartnerCard() {
    document.querySelectorAll('.partner-card').forEach((element) => {
      element.addEventListener('click', (event) => {
        event.currentTarget.classList.toggle('show');
      });
    });
  }
}
