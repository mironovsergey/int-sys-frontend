import Modal from 'bootstrap/js/dist/modal';
import Validator from './validator';
import xmark from '../../template/icons/xmark.svg';

export default class Form {
  isSubmitting = false;

  constructor(formElement) {
    this.formElement = formElement;
    this.validator = new Validator(formElement);
    this.initialize();
  }

  initialize() {
    this.setupSubmitHandler();
  }

  setupSubmitHandler() {
    this.formElement.addEventListener('submit', this.handleSubmit);
  }

  handleSubmit = (event) => {
    event.preventDefault();

    if (this.isSubmitting || !this.validator.validate()) {
      return;
    }

    this.isSubmitting = true;

    const formData = new FormData(this.formElement);

    fetch(this.formElement.action, {
      method: this.formElement.method,
      body: formData,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
      .then((response) => response.json())
      .then(({ status, message }) => {
        if (status === 'success') {
          const successEvent = new CustomEvent('formSuccess', { detail: { message } });
          this.formElement.dispatchEvent(successEvent);
        }

        this.showMessage(message);
        this.formElement.reset();
      })
      .catch((error) => {
        this.showMessage('Ошибка при отправке формы');
      })
      .finally(() => {
        this.isSubmitting = false;
      });
  };

  showMessage(message) {
    const modalHTML = `
      <div class="modal fade" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <button type="button" class="btn btn-outline-secondary btn-small" data-bs-dismiss="modal">${xmark}</button>
            <div class="modal-title">${message}</div>
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
      modalInstance.dispose();
      modalElement.remove();
    };

    modalElement.addEventListener('hidden.bs.modal', handleHidden, { once: true });
    modalInstance.show();
  }
}
