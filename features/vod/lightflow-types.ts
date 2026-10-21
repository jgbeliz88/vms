export type LightflowStream = {
  codec_type: "video" | "audio";
  codec_name: string;
  duration: string;
  bit_rate: string;
  height?: number;
  width?: number;
  coded_height?: number;
  coded_width?: number;
};

export type LightflowRendition = {
  resolution: number;
  quality_score: number;
  bitrate: number;
};

export type LightflowVodContent = {
  _id: string;
  uuid: string;
  status: string;
  stage: string;
  creationDate: string;
  startDate: string;
  endDate: string;
  error?: string | null;
  assetError?: string | null;
  assetInfo: {
    format: {
      duration: string;
      bit_rate: string;
      size?: string;
    };
    streams: LightflowStream[];
  };
  ladderFull?: {
    x264?: LightflowRendition[];
    clientIndustryLadders?: LightflowRendition[];
  };
};
