export default class Gallery {
  static Config = {
    DIAGONAL_COUNT: 2,
    ANIMATION_DURATION: 50,
    MIN_SCALE: 0.25,
    BORDER_RADIUS: 24,
    FIRST_DIAGONAL_OFFSET_Y: 64,
    DEBUG: false,
  };

  constructor(element, imageData) {
    const canvas = document.createElement('canvas');

    element.appendChild(canvas);

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.imageData = imageData;
    this.dpr = window.devicePixelRatio || 1;
    this.images = [];
    this.diagonals = [];
    this.isRunning = false;
    this.lastTimestamp = 0;
  }

  async initialize() {
    this.updateCanvasSize();
    this.bindEvents();
    await this.loadAllImages();
    this.createDiagonals();
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTimestamp = performance.now();
    requestAnimationFrame(this.tick);
  }

  stop() {
    this.isRunning = false;
  }

  // ==================== Анимационный цикл ====================

  tick = (timestamp) => {
    if (!this.isRunning) return;

    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    this.updateAnimation(deltaTime);
    this.render();

    requestAnimationFrame(this.tick);
  };

  updateAnimation(deltaTime) {
    const progressIncrement = deltaTime / Gallery.Config.ANIMATION_DURATION;

    for (const diagonal of this.diagonals) {
      diagonal.offset =
        (diagonal.offset + progressIncrement * diagonal.tapeLength) %
        diagonal.tapeLength;
    }
  }

  // ==================== Рендеринг ====================

  render() {
    this.clearCanvas();

    if (Gallery.Config.DEBUG) {
      this.renderDebugOverlay();
    }

    for (let i = this.diagonals.length - 1; i >= 0; i--) {
      this.renderDiagonal(this.diagonals[i]);
    }
  }

  renderDiagonal(diagonal) {
    for (const item of diagonal.items) {
      const tapePosition =
        (item.tapePosition + diagonal.offset) % diagonal.tapeLength;

      // Проверяем основную позицию
      if (this.isVisibleOnDiagonal(tapePosition, item, diagonal)) {
        this.renderItemAtPosition(tapePosition, item, diagonal);
      }

      // Проверяем "завёрнутую" позицию (для выезда из начальной точки)
      const wrappedPosition = tapePosition - diagonal.tapeLength;
      if (this.isVisibleOnDiagonal(wrappedPosition, item, diagonal)) {
        this.renderItemAtPosition(wrappedPosition, item, diagonal);
      }
    }
  }

  renderItemAtPosition(tapePosition, item, diagonal) {
    const normalizedPosition = tapePosition / diagonal.length;
    const point = this.getPointOnDiagonal(diagonal, normalizedPosition);
    const scale = this.calculateScale(normalizedPosition);

    this.renderItem(item, point, scale, diagonal);
  }

  isVisibleOnDiagonal(tapePosition, item, diagonal) {
    const halfSize = diagonal.maxSize / 2;
    return (
      tapePosition >= -halfSize && tapePosition <= diagonal.length + halfSize
    );
  }

  renderItem(item, point, scale, diagonal) {
    const size = diagonal.maxSize * scale;
    const dimensions = this.calculateItemDimensions(item.aspectRatio, size);
    const position = {
      x: point.x - dimensions.width / 2,
      y: point.y - dimensions.height / 2,
    };
    const radius = diagonal.borderRadius * scale;

    this.drawRoundedImage(item.image, position, dimensions, radius);
  }

  drawRoundedImage(image, position, dimensions, radius) {
    const { x, y } = position;
    const { width, height } = dimensions;
    const clampedRadius = Math.min(radius, width / 2, height / 2);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, clampedRadius);
    this.ctx.clip();
    this.ctx.drawImage(image, x, y, width, height);
    this.ctx.restore();
  }

  clearCanvas() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // ==================== Геометрия ====================

  getPointOnDiagonal(diagonal, normalizedPosition) {
    const distance = normalizedPosition * diagonal.length;
    return {
      x: diagonal.start.x + diagonal.direction.x * distance,
      y: diagonal.start.y + diagonal.direction.y * distance,
    };
  }

  calculateScale(normalizedPosition) {
    const clampedPosition = Math.max(0, Math.min(1, normalizedPosition));
    const distanceFromCenter = Math.abs(clampedPosition - 0.5) * 2;
    return 1 - distanceFromCenter * (1 - Gallery.Config.MIN_SCALE);
  }

  calculateItemDimensions(aspectRatio, maxSize) {
    if (aspectRatio > 1) {
      return { width: maxSize, height: maxSize / aspectRatio };
    }
    return { width: maxSize * aspectRatio, height: maxSize };
  }

  calculateDiagonalGeometry(index) {
    const startX = this.width * (1 - 1 / Math.pow(2, index));
    const startY = this.height;
    const endX = this.width;
    const endY = this.height * (1 - 1 / Math.pow(2, index + 1));

    return {
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      maxSize: Math.min(Math.abs(endX - startX), Math.abs(endY - startY)),
    };
  }

  // ==================== Инициализация диагоналей ====================

  createDiagonals() {
    this.diagonals = [];

    const config = Gallery.Config;
    const distribution = this.distributeImages(
      this.images.length,
      config.DIAGONAL_COUNT,
    );
    const baseDiagonalSize = this.calculateDiagonalGeometry(0).maxSize;

    let imageIndex = 0;

    for (let i = 0; i < config.DIAGONAL_COUNT; i++) {
      const geometry = this.calculateDiagonalGeometry(i);

      if (i === 0) {
        geometry.start.y -= config.FIRST_DIAGONAL_OFFSET_Y;
        geometry.end.y -= config.FIRST_DIAGONAL_OFFSET_Y;
      }

      const vector = this.calculateDiagonalVector(geometry.start, geometry.end);
      const itemCount = distribution[i];
      const diagonalImages = this.images.slice(
        imageIndex,
        imageIndex + itemCount,
      );
      imageIndex += itemCount;

      const { items, tapeLength } = this.createTape(
        diagonalImages,
        geometry.maxSize,
        vector.length,
      );

      this.diagonals.push({
        ...geometry,
        ...vector,
        borderRadius:
          config.BORDER_RADIUS * (geometry.maxSize / baseDiagonalSize),
        offset: (i / config.DIAGONAL_COUNT) * tapeLength,
        tapeLength,
        items,
      });
    }
  }

  createTape(images, maxSize, diagonalLength) {
    const items = [];
    let currentPosition = 0;

    for (const imageData of images) {
      // Размер изображения при максимальном масштабе (в центре)
      const dimensions = this.calculateItemDimensions(
        imageData.aspectRatio,
        maxSize,
      );
      const itemSize = Math.max(dimensions.width, dimensions.height);

      items.push({ tapePosition: currentPosition, ...imageData });

      // Следующая позиция = текущая + размер изображения
      currentPosition += itemSize;
    }

    // Длина ленты — минимум длина диагонали, чтобы обеспечить бесшовность
    const tapeLength = Math.max(currentPosition, diagonalLength + maxSize);

    return { items, tapeLength };
  }

  calculateDiagonalVector(start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy);

    return {
      direction: { x: dx / length, y: dy / length },
      length,
    };
  }

  distributeImages(totalImages, diagonalCount) {
    const base = Math.floor(totalImages / diagonalCount);
    const remainder = totalImages % diagonalCount;

    return Array.from(
      { length: diagonalCount },
      (_, i) => base + (i < remainder ? 1 : 0),
    );
  }

  // ==================== Загрузка ресурсов ====================

  async loadAllImages() {
    const loadPromises = this.imageData.map((data) =>
      this.loadSingleImage(data.url, data),
    );
    const results = await Promise.all(loadPromises);
    this.images = results.filter(Boolean);
  }

  loadSingleImage(url, metadata) {
    return new Promise((resolve) => {
      const image = new Image();

      image.onload = () =>
        resolve({
          image,
          aspectRatio: image.naturalWidth / image.naturalHeight,
          link: metadata.link,
        });

      image.onerror = () => resolve(null);
      image.src = url;
    });
  }

  // ==================== Canvas ====================

  updateCanvasSize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  bindEvents() {
    window.addEventListener('resize', () => this.handleResize());
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
  }

  handleCanvasMouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = (event.clientX - rect.left) * this.dpr;
    const mouseY = (event.clientY - rect.top) * this.dpr;

    const isOverImage = this.diagonals.some((diagonal) =>
      diagonal.items.some((item) => this.isClickOnItem(mouseX, mouseY, item, diagonal)),
    );

    this.canvas.style.cursor = isOverImage ? 'pointer' : 'default';
  }

  handleResize() {
    this.updateCanvasSize();

    if (this.images.length) {
      this.createDiagonals();
    }
  }

  handleCanvasClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const clickX = (event.clientX - rect.left) * this.dpr;
    const clickY = (event.clientY - rect.top) * this.dpr;

    for (const diagonal of this.diagonals) {
      for (const item of diagonal.items) {
        if (this.isClickOnItem(clickX, clickY, item, diagonal)) {
          this.canvas.dispatchEvent(
            new CustomEvent('gallery:imageClick', {
              detail: { item, diagonal },
            }),
          );

          this.stop();

          return;
        }
      }
    }
  }

  isClickOnItem(clickX, clickY, item, diagonal) {
    const tapePosition =
      (item.tapePosition + diagonal.offset) % diagonal.tapeLength;

    if (!this.isVisibleOnDiagonal(tapePosition, item, diagonal)) {
      return false;
    }

    const normalizedPosition = tapePosition / diagonal.length;
    const point = this.getPointOnDiagonal(diagonal, normalizedPosition);
    const scale = this.calculateScale(normalizedPosition);
    const size = diagonal.maxSize * scale;
    const dimensions = this.calculateItemDimensions(item.aspectRatio, size);

    const x = point.x - dimensions.width / 2;
    const y = point.y - dimensions.height / 2;

    return (
      clickX >= x &&
      clickX <= x + dimensions.width &&
      clickY >= y &&
      clickY <= y + dimensions.height
    );
  }

  // ==================== Отладка ====================

  renderDebugOverlay() {
    const colors = ['#e74c3c', '#2ecc71', '#3498db', '#f39c12', '#9b59b6'];

    this.ctx.save();
    this.ctx.lineWidth = 2;

    this.diagonals.forEach((diagonal, i) => {
      const color = colors[i % colors.length];
      this.drawDebugLine(diagonal, color);
      this.drawDebugPoint(diagonal.start, color);
      this.drawDebugPoint(diagonal.end, color);
    });

    this.ctx.restore();
  }

  drawDebugLine(diagonal, color) {
    this.ctx.strokeStyle = color;
    this.ctx.beginPath();
    this.ctx.moveTo(diagonal.start.x, diagonal.start.y);
    this.ctx.lineTo(diagonal.end.x, diagonal.end.y);
    this.ctx.stroke();
  }

  drawDebugPoint(point, color) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
    this.ctx.fill();
  }
}
