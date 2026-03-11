export const SCREEN_CAPTURE_QUESTION_DETECTED_EVENT = "screen-capture:question-detected";

export interface ScreenCaptureQuestionDetectedDetail {
  question: string;
  rawText: string;
}

export function dispatchScreenCaptureQuestionDetected(detail: ScreenCaptureQuestionDetectedDetail) {
  window.dispatchEvent(
    new CustomEvent<ScreenCaptureQuestionDetectedDetail>(SCREEN_CAPTURE_QUESTION_DETECTED_EVENT, {
      detail
    })
  );
}
