import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_ASSET_URL =
  'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';

let detectorPromise: Promise<FaceDetector> | null = null;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getLargestDetection(detections: Awaited<ReturnType<FaceDetector['detectForVideo']>>['detections']) {
  return [...detections].sort((left, right) => {
    const leftBox = left.boundingBox ?? { width: 0, height: 0 };
    const rightBox = right.boundingBox ?? { width: 0, height: 0 };
    return rightBox.width * rightBox.height - leftBox.width * leftBox.height;
  })[0];
}

export async function getFaceDetector() {
  if (!detectorPromise) {
    detectorPromise = FilesetResolver.forVisionTasks(WASM_BASE_URL)
      .then((vision) =>
        FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_URL,
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.5,
          minSuppressionThreshold: 0.3,
        }),
      )
      .catch((error) => {
        detectorPromise = null;
        throw new Error(error instanceof Error ? error.message : 'Face detector yuklanmadi.');
      });
  }

  return detectorPromise;
}

export async function captureAndCropFace(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  if (!video.videoWidth || !video.videoHeight) {
    throw new Error('Kamera hali tayyor emas.');
  }

  const detector = await getFaceDetector();
  const result = detector.detectForVideo(video, performance.now());
  const detection = getLargestDetection(result.detections ?? []);
  const box = detection?.boundingBox;

  if (!box) {
    throw new Error('Yuz topilmadi. Kameraga yaqinroq turib yana urinib ko‘ring.');
  }

  const paddingX = box.width * 0.18;
  const paddingY = box.height * 0.22;

  const sourceX = clamp(box.originX - paddingX, 0, video.videoWidth);
  const sourceY = clamp(box.originY - paddingY, 0, video.videoHeight);
  const sourceWidth = clamp(box.width + paddingX * 2, 1, video.videoWidth - sourceX);
  const sourceHeight = clamp(box.height + paddingY * 2, 1, video.videoHeight - sourceY);

  canvas.width = Math.round(sourceWidth);
  canvas.height = Math.round(sourceHeight);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas ochilmadi.');
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.92);
}
