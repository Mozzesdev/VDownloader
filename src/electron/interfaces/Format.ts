type InitRange = {
  start: string;
  end: string;
};

type IndexRange = {
  start: string;
  end: string;
};

export interface Format {
  itag: number;
  mimeType: string;
  bitrate: number;
  initRange: InitRange;
  indexRange: IndexRange;
  lastModified: string;
  contentLength: string;
  quality: string;
  projectionType: string;
  averageBitrate: number;
  approxDurationMs: string;
  signatureCipher: string;
  audioQuality?: string;
  audioSampleRate?: string;
  sabr?: string;
  poToken?: string;
  audioChannels?: number;
  loudnessDb?: number;
  width?: number;
  url?: string;
  height?: number;
  fps?: number;
  qualityLabel?: string;
  colorInfo?: {
    primaries: string;
    transferCharacteristics: string;
    matrixCoefficients: string;
  };
  title?: string;
  path?: string;
  finalUrl?: string;
  filePath?: string;
}
