const createImage = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', (error) => reject(error));
  image.setAttribute('crossOrigin', 'anonymous');
  image.src = url;
});

const getRadianAngle = (degreeValue) => (degreeValue * Math.PI) / 180;

const rotateSize = (width, height, rotation) => ({
  width: Math.abs(Math.cos(rotation) * width) + Math.abs(Math.sin(rotation) * height),
  height: Math.abs(Math.sin(rotation) * width) + Math.abs(Math.cos(rotation) * height)
});

export const getCroppedImage = async (
  imageSrc,
  pixelCrop,
  rotation = 0,
  options = {}
) => {
  const image = await createImage(imageSrc);
  const rotationRads = getRadianAngle(rotation);
  const {
    brightness = 100,
    contrast = 100,
    saturation = 100,
    flipX = false,
    flipY = false
  } = options;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas is not supported in this browser');
  }

  const rotatedArea = rotateSize(image.width, image.height, rotationRads);

  canvas.width = rotatedArea.width;
  canvas.height = rotatedArea.height;

  context.translate(rotatedArea.width / 2, rotatedArea.height / 2);
  context.rotate(rotationRads);
  context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  context.translate(-image.width / 2, -image.height / 2);
  context.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  context.drawImage(image, 0, 0);
  context.filter = 'none';

  const croppedCanvas = document.createElement('canvas');
  const croppedContext = croppedCanvas.getContext('2d');

  if (!croppedContext) {
    throw new Error('Canvas is not supported in this browser');
  }

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;

  croppedContext.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return croppedCanvas.toDataURL('image/jpeg', 0.92);
};
