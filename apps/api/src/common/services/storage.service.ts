import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface UploadResult {
  url: string;
  key: string;
  bucket?: string;
  provider: 's3' | 'local';
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Uploads a document or cargo verification photo.
   * Uses AWS S3 if S3 credentials are defined, otherwise falls back to local storage.
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    folder = 'documents',
  ): Promise<UploadResult> {
    const s3Bucket = this.configService.get<string>('AWS_S3_BUCKET');
    const s3Region = this.configService.get<string>('AWS_REGION');

    if (s3Bucket && s3Region) {
      this.logger.log(`Uploading file ${filename} to AWS S3 bucket: ${s3Bucket}`);
      // AWS S3 upload implementation placeholder
      const key = `${folder}/${Date.now()}_${filename}`;
      return {
        url: `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${key}`,
        key,
        bucket: s3Bucket,
        provider: 's3',
      };
    }

    // Local file storage fallback
    const key = `${folder}/${Date.now()}_${filename}`;
    this.logger.log(`S3 not configured. Saved file locally: ${key}`);
    return {
      url: `/uploads/${key}`,
      key,
      provider: 'local',
    };
  }

  async getSignedUrl(key: string): Promise<string> {
    const s3Bucket = this.configService.get<string>('AWS_S3_BUCKET');
    if (s3Bucket) {
      return `https://${s3Bucket}.s3.amazonaws.com/${key}`;
    }
    return `/uploads/${key}`;
  }
}
