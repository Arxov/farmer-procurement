import '@testing-library/jest-dom';

if (typeof window !== 'undefined') {
  window.speechSynthesis = {
    speak: jest.fn(),
    cancel: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getVoices: jest.fn().mockReturnValue([]),
  };
  window.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
    text,
    lang: '',
    rate: 1,
  }));
}
