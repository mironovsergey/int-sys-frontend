import warning from '../../template/icons/warning.svg';

export default class Validator {
  constructor(formElement) {
    this.formElement = formElement;
    this.initialize();
  }

  get inputs() {
    return this.formElement.querySelectorAll(
      'input:not([type="hidden"]), textarea, select',
    );
  }

  initialize() {
    this.inputs.forEach((input) => {
      input.addEventListener('input', () => this.validateField(input));
      input.addEventListener('blur', () => this.validateField(input));
    });
  }

  validate() {
    let isValid = true;

    this.inputs.forEach((input) => {
      if (!this.validateField(input)) {
        isValid = false;
      }
    });

    return isValid;
  }

  validateField(input) {
    if (!input.checkValidity()) {
      this.showError(input, input.validationMessage);
      return false;
    } else {
      this.clearError(input);
      return true;
    }
  }

  showError(input, message) {
    this.clearError(input);

    const error = document.createElement('div');

    error.className = 'error';
    error.innerHTML = `${warning}${message}`;
    input.classList.add('invalid');
    input.insertAdjacentElement('afterend', error);
  }

  clearError(input) {
    const error = input.parentElement.querySelector('.error');

    if (error) {
      input.parentElement.removeChild(error);
    }

    input.classList.remove('invalid');
  }
}
