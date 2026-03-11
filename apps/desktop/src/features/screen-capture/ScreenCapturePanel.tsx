import { useEffect, useRef, useState } from "react";
import { createWorker, type Worker } from "tesseract.js";
import { dispatchScreenCaptureQuestionDetected } from "./screenCaptureEvents";
import { getFriendlyScreenCaptureErrorMessage } from "../../shared/errorMessages";

function extractQuestion(text: string) {
  const normalized = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  if (!normalized) {
    return "";
  }

  const lines = normalized.split("\n");
  const explicitQuestion = lines.find((line) => line.endsWith("?") && line.length > 8);
  if (explicitQuestion) {
    return explicitQuestion;
  }

  const interrogativeLine = lines.find((line) => /^(what|why|how|when|where|which|who|tell me|explain)\b/i.test(line));
  if (interrogativeLine) {
    return interrogativeLine;
  }

  return lines.find((line) => line.length > 20) || "";
}

export function ScreenCapturePanel() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const processingRef = useRef(false);
  const lastQuestionRef = useRef("");
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState("Idle");
  const [detectedQuestion, setDetectedQuestion] = useState("");

  async function getWorker() {
    if (workerRef.current) {
      return workerRef.current;
    }

    setOcrStatus("Initializing OCR");
    const worker = await createWorker("eng");
    workerRef.current = worker;
    return worker;
  }

  async function processFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !streamRef.current || processingRef.current) {
      return;
    }

    if (video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    processingRef.current = true;
    setOcrStatus("Scanning screen");

    try {
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Canvas context unavailable");
      }

      const scale = video.videoWidth > 1600 ? 0.6 : 1;
      canvas.width = Math.max(640, Math.floor(video.videoWidth * scale));
      canvas.height = Math.max(360, Math.floor(video.videoHeight * scale));
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const worker = await getWorker();
      const result = await worker.recognize(canvas);
      const rawText = String(result?.data?.text || "").trim();
      const question = extractQuestion(rawText);

      if (question && question !== lastQuestionRef.current) {
        lastQuestionRef.current = question;
        setDetectedQuestion(question);
        setOcrStatus("Question detected");
        dispatchScreenCaptureQuestionDetected({ question, rawText });
      } else if (!question) {
        setOcrStatus("No question detected");
      }
    } catch (err) {
      setError("Unable to read text from the captured screen clearly. Try a larger question area or a clearer screen.");
      setOcrStatus("OCR failed");
    } finally {
      processingRef.current = false;
    }
  }

  function startProcessingLoop() {
    if (frameTimerRef.current !== null) {
      window.clearInterval(frameTimerRef.current);
    }

    frameTimerRef.current = window.setInterval(() => {
      void processFrame();
    }, 2500);
  }

  function stopProcessingLoop() {
    if (frameTimerRef.current !== null) {
      window.clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }
  }

  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, []);

  async function startCapture() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setError("Screen capture is not supported in this desktop runtime.");
      return;
    }

    setError(null);
    setDetectedQuestion("");
    lastQuestionRef.current = "";

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 15
        },
        audio: false
      });

      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          stopCapture();
        };
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCapturing(true);
      setOcrStatus("Capture running");
      startProcessingLoop();
      void processFrame();
    } catch (err) {
      setError(getFriendlyScreenCaptureErrorMessage(err));
      stopCapture();
    }
  }

  function stopCapture() {
    stopProcessingLoop();

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsCapturing(false);
    setOcrStatus("Idle");
  }

  useEffect(() => {
    return () => {
      stopProcessingLoop();
      if (workerRef.current) {
        void workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return (
    <section className="card">
      <header className="header-row">
        <div>
          <h1>Screen Capture Control</h1>
          <p className="muted">Capture the display, run OCR on live frames, detect interview questions, and trigger AI help automatically.</p>
        </div>
      </header>

      <div className="actions-row compact-row">
        <button onClick={startCapture} disabled={isCapturing}>
          Start Screen Capture
        </button>
        <button className="ghost" onClick={stopCapture} disabled={!isCapturing}>
          Stop Screen Capture
        </button>
      </div>

      <section className="coach-panel">
        <h2>Live Screen Preview</h2>
        {error ? <p className="error">{error}</p> : null}
        <p className="muted">OCR Status: {ocrStatus}</p>
        <p className="muted">Detected Question: {detectedQuestion || "No question detected yet."}</p>
        <div className="screen-preview-shell">
          {isCapturing ? null : <p className="muted">No active screen capture.</p>}
          <video ref={videoRef} className="screen-preview" autoPlay playsInline muted />
          <canvas ref={canvasRef} className="screen-capture-canvas" />
        </div>
      </section>
    </section>
  );
}
