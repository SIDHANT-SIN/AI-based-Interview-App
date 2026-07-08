import { FilesetResolver, FaceDetector } from "@mediapipe/tasks-vision";

let detectorPromise: Promise<FaceDetector> | null = null;

export const preloadProctoringModel = (): Promise<FaceDetector> => {
  // If it's already downloading or loaded, don't trigger it again
  if (detectorPromise) {
    return detectorPromise;
  }

  console.log("Proctoring Service: Triggering background model preload...");

  detectorPromise = (async () => {
    try {
      // HACK: Prevent MediaPipe from crashing Monaco Editor by temporarily hiding `define.amd`
      let amdBackup: any = undefined;
      if ((window as any).define && (window as any).define.amd) {
        amdBackup = (window as any).define.amd;
        (window as any).define.amd = undefined;
      }

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      const faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
      });

      // Restore AMD `define.amd` for Monaco Editor AFTER FaceDetector is fully initialized!
      if ((window as any).define && amdBackup !== undefined) {
        (window as any).define.amd = amdBackup;
      }

      console.log("Proctoring Service: Model successfully preloaded and ready!");
      return faceDetector;
    } catch (err) {
      console.error("Proctoring Service: Failed to load FaceDetector:", err);
      // Reset the promise so we can retry on next hook invocation if it failed
      detectorPromise = null;
      throw err;
    }
  })();

  return detectorPromise;
};

export const getProctoringModel = (): Promise<FaceDetector> => {
  // If no one triggered preload, trigger it now
  if (!detectorPromise) {
    return preloadProctoringModel();
  }
  return detectorPromise;
};
