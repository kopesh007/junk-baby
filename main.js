const html = document.documentElement;
const canvas = document.getElementById("hero-lightpass");
const context = canvas.getContext("2d");

// Frame settings based on k:\fruit\photos contents
// Images are from 00020.png to 00192.png, so there are 173 images
const frameCount = 173;
const images = [];
const startFrameNumber = 20;

// Need to match exactly what is in /photos
const currentFrame = index => (
  `/photos/${(startFrameNumber + index).toString().padStart(5, '0')}.png`
);

// Preload images into memory
const preloadImages = () => {
  for (let i = 0; i < frameCount; i++) {
    const img = new Image();
    img.src = currentFrame(i);
    images.push(img);
  }
};

const drawImageCover = (img) => {
  const canvasRatio = canvas.width / canvas.height;
  const imgRatio = img.width / img.height;

  let drawWidth = canvas.width;
  let drawHeight = canvas.height;
  let offsetX = 0;
  let offsetY = 0;

  if (canvasRatio > imgRatio) {
    // Canvas is wider than image, clip image top/bottom
    drawHeight = canvas.width / imgRatio;
    offsetY = (canvas.height - drawHeight) / 2;
  } else {
    // Canvas is taller than image, clip image left/right
    drawWidth = canvas.height * imgRatio;
    offsetX = (canvas.width - drawWidth) / 2;
  }

  // Draw background black just in case
  context.fillStyle = "#000000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
};

const setCanvasDimensions = () => {
  // Use devicePixelRatio to ensure maximum quality on retina displays
  const dpr = window.devicePixelRatio || 1;

  // Use document element client sizes to prevent mobile toolbar jump
  const w = html.clientWidth;
  const h = html.clientHeight;

  // Set the "actual" size of the canvas
  canvas.width = w * dpr;
  canvas.height = h * dpr;

  // Set the "drawn" size of the canvas
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  // Normalize coordinate system to use css pixels
  context.scale(1, 1);

  // We will let the continuous render loop handle drawing the image
  // after the canvas has been resized.
};

// Initialize
preloadImages();

// Wait for first image to load before drawing
images[0].onload = () => {
  setCanvasDimensions();
};

window.addEventListener('resize', () => {
  requestAnimationFrame(setCanvasDimensions);
});

let targetFrame = 0;
let currentFrameDisplay = 0;

// Use passive event listener for better scroll performance
window.addEventListener('scroll', () => {
  const scrollTop = html.scrollTop;
  const maxScrollTop = Math.max(1, html.scrollHeight - html.clientHeight);

  const scrollFraction = Math.max(0, Math.min(1, scrollTop / maxScrollTop));
  targetFrame = scrollFraction * frameCount;
}, { passive: true });

const renderLoop = () => {
  // LERP for smooth dampening
  currentFrameDisplay += (targetFrame - currentFrameDisplay) * 0.05;

  const frameIndex = Math.min(
    frameCount - 1,
    Math.max(0, Math.floor(currentFrameDisplay))
  );

  if (images[frameIndex] && images[frameIndex].complete) {
    drawImageCover(images[frameIndex]);
  }

  requestAnimationFrame(renderLoop);
};

// Start the continuous render loop
requestAnimationFrame(renderLoop);

// --- Modal and Order Form Logic ---
const orderBtn = document.getElementById('order-btn');
const orderModal = document.getElementById('order-modal');
const closeModal = document.getElementById('close-modal');
const orderForm = document.getElementById('order-form');
const formMsg = document.getElementById('form-msg');
const submitBtn = document.getElementById('submit-btn');
const navOrderBtn = document.getElementById('nav-order-btn');

orderBtn.addEventListener('click', () => {
  orderModal.classList.add('active');
  formMsg.textContent = ''; // clear messages
});

navOrderBtn.addEventListener('click', () => {
  orderModal.classList.add('active');
  formMsg.textContent = ''; // clear messages
});

closeModal.addEventListener('click', () => {
  orderModal.classList.remove('active');
});

// Close modal when clicking outside content
orderModal.addEventListener('click', (e) => {
  if (e.target === orderModal) {
    orderModal.classList.remove('active');
  }
});

orderForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value;
  const whatsapp = document.getElementById('whatsapp').value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  try {
    const res = await fetch('/api/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, whatsapp })
    });

    if (res.ok) {
      // Construct WhatsApp message URL
      const message = `Hello Junk Baby! I would like to place an order.%0A%0A*Name:* ${name}%0A*Contact:* ${whatsapp}`;
      const waUrl = `https://wa.me/916380804311?text=${message}`;

      // Open WhatsApp in a new tab
      window.open(waUrl, '_blank');

      formMsg.style.color = '#29ffc6';
      formMsg.textContent = 'Awesome! Redirecting you to WhatsApp...';
      orderForm.reset();

      setTimeout(() => {
        orderModal.classList.remove('active');
      }, 3000);
    } else {
      throw new Error('Server error');
    }
  } catch (error) {
    console.error('Error submitting form', error);
    formMsg.style.color = '#ff6b6b';
    formMsg.textContent = 'Oops, something went wrong. Please try again.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Details';
  }
});
